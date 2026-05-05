import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type Stripe from 'stripe'
import { getStripe, isReusablePaymentMethod, isStripeConfigured } from '@/lib/stripe'
import { CARE_PLANS, carePlanByLookupKey, carePlanBySlug } from '@/lib/care-plans'
import { sendBrandedInvoiceEmail, sendBrandedCarePlanSignupEmail, sendPaymentFailedAlertEmail } from '@/lib/billing-emails'

// Stripe webhook signature verification needs the RAW request body — the
// JSON parser would munge it. App Router's req.text() returns the raw
// string, which we feed straight into stripe.webhooks.constructEvent.
export const dynamic = 'force-dynamic'

// We handle these and ignore everything else. Stripe's dashboard lets you
// pick which events to send to a given endpoint; this list is authoritative
// in code so we don't silently drop events when someone enables more in the
// dashboard.
const HANDLED_EVENTS = new Set<string>([
  'checkout.session.completed',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'invoice.finalized',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  // (#16) Refund events — keep Payload mirror in sync when you refund
  // via Stripe Dashboard. charge.refunded fires for direct refunds;
  // credit_note.created fires when you issue a credit note (which
  // optionally refunds the underlying charge).
  'charge.refunded',
  'credit_note.created',
])

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not set on server.' },
      { status: 503 },
    )
  }
  // (#2) On first webhook delivery after a server boot, log the configured
  // secret prefix so a typo or stale value surfaces in logs immediately.
  // This prints once per boot — subsequent calls hit the cache.
  logWebhookSecretPrefixOnce(webhookSecret)

  const stripe = getStripe()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    // Skip silently — Stripe takes a 200 as "received, don't retry."
    return NextResponse.json({ received: true, skipped: true, type: event.type })
  }

  const payload = await getPayload({ config })

  // Idempotency guard. The unique constraint on stripeEventId means we can
  // try to create unconditionally and treat the rejection as "already seen."
  const existing = await payload.find({
    collection: 'webhook-events',
    where: { stripeEventId: { equals: event.id } },
    limit: 1,
  })
  if (existing.totalDocs > 0) {
    const status = (existing.docs[0] as { status?: string }).status
    if (status === 'completed') {
      return NextResponse.json({ received: true, alreadyProcessed: true })
    }
    // (#1) "Processing" rows are at risk of getting stuck forever if a
    // previous handler crashed mid-execution. We treat them two ways:
    //   - Less than 5 minutes old → another handler may still be running
    //     concurrently. Return 425 so Stripe retries with backoff (avoids
    //     concurrent execution races on the same event).
    //   - Older than 5 minutes → assume the previous attempt died; allow
    //     this delivery to retry the work (handlers are idempotent).
    if (status === 'processing') {
      const createdAt = new Date(((existing.docs[0] as { createdAt?: string }).createdAt ?? 0)).getTime()
      const ageMs = Date.now() - createdAt
      const STALE_THRESHOLD_MS = 5 * 60 * 1000
      if (ageMs < STALE_THRESHOLD_MS) {
        return NextResponse.json(
          { received: false, reason: 'in-flight, retry later' },
          { status: 425 },
        )
      }
      payload.logger.warn(
        { eventId: event.id, ageMs },
        '[stripe-webhook] processing row stale, allowing retry',
      )
    }
    // Otherwise fall through and re-attempt (failed/skipped/stale processing).
  } else {
    try {
      await payload.create({
        collection: 'webhook-events',
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          status: 'processing',
          rawPayloadSummary: summarize(event),
        },
      })
    } catch {
      // Race condition: another delivery created the row between our find
      // and create. Treat as "another worker has it" and acknowledge.
      return NextResponse.json({ received: true, raceDeduped: true })
    }
  }

  let handlerError: string | null = null
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(payload, stripe, event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.created':
      case 'customer.updated':
        await syncCustomer(payload, event.data.object as Stripe.Customer)
        break
      case 'customer.deleted':
        await handleCustomerDeleted(payload, event.data.object as Stripe.Customer)
        break
      case 'invoice.finalized':
        await handleInvoiceFinalized(payload, stripe, event.data.object as Stripe.Invoice)
        break
      case 'invoice.paid':
        await handleInvoicePaid(payload, event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(payload, stripe, event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await syncSubscription(payload, event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(payload, event.data.object as Stripe.Subscription)
        break
      case 'charge.refunded':
        await handleChargeRefunded(payload, stripe, event.data.object as Stripe.Charge)
        break
      case 'credit_note.created':
        await handleCreditNoteCreated(payload, event.data.object as Stripe.CreditNote)
        break
    }
  } catch (err) {
    handlerError = err instanceof Error ? err.message : String(err)
    payload.logger.error({ err, eventId: event.id, eventType: event.type }, '[stripe-webhook] handler failed')
  }

  // Mark the event row complete or failed.
  await payload.update({
    collection: 'webhook-events',
    where: { stripeEventId: { equals: event.id } },
    data: handlerError
      ? { status: 'failed', errorMessage: handlerError }
      : { status: 'completed' },
  })

  if (handlerError) {
    // Return 500 so Stripe retries with backoff. Idempotency guards above
    // ensure we don't double-process.
    return NextResponse.json({ error: handlerError }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}

// ───────────────────────── handlers ─────────────────────────

async function handleCheckoutCompleted(
  payload: Awaited<ReturnType<typeof getPayload>>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  // Two flavors of session pass through here:
  //   1. Invoice payment session (mode='payment') — minted by /api/checkout/start
  //   2. Care plan setup session (mode='setup') — minted by /api/care-plan/setup
  //
  // We branch on `mode`. PaymentIntent ID and Setup Intent ID live on
  // different fields, so we have to.

  if (session.mode === 'payment') {
    const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    if (!piId) return
    const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['payment_method', 'customer'] })

    const payloadInvoiceId = pi.metadata?.payload_invoice_id
    const carePlanSlug = pi.metadata?.care_plan_tier
    const customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null

    // 1. Mark Payload invoice paid
    if (payloadInvoiceId) {
      const pmType = ((pi.payment_method as Stripe.PaymentMethod | null)?.type ?? 'other').replace('us_bank_account', 'us_bank_account')
      const allowedPmTypes = ['card', 'us_bank_account', 'klarna', 'affirm', 'link', 'other'] as const
      const paidWith = (allowedPmTypes as readonly string[]).includes(pmType) ? pmType : 'other'
      await payload.update({
        collection: 'invoices',
        id: payloadInvoiceId,
        data: {
          status: 'paid',
          paidAt: new Date().toISOString(),
          paidWith,
        },
      })

      // 1b. If the Payload invoice mirrors an actual Stripe Invoice (i.e.
      //     it was created in the Stripe dashboard, not as a one-off
      //     Checkout cart), mark the Stripe Invoice as paid_out_of_band
      //     so it shows up correctly in the dashboard. The actual money
      //     came in via the Checkout PaymentIntent, but Stripe's invoice
      //     ledger needs to know it's settled.
      try {
        const payloadInv = await payload.findByID({
          collection: 'invoices',
          id: payloadInvoiceId,
        })
        const stripeInvId = (payloadInv as { stripeInvoiceId?: string | null })?.stripeInvoiceId
        if (stripeInvId) {
          // Pull the Stripe Invoice object to find a linked subscription
          // (subscription invoices have invoice.subscription set; one-off
          // invoices don't).
          const stripeInvoice = await stripe.invoices.retrieve(stripeInvId)
          // (#8) If already paid (webhook replay), skip the mark-paid call
          // to avoid Stripe's "invoice already paid" error.
          if (stripeInvoice.status !== 'paid') {
            await stripe.invoices.pay(stripeInvId, { paid_out_of_band: true })
            payload.logger.info({ stripeInvId }, '[webhook] marked Stripe invoice paid_out_of_band')
          } else {
            payload.logger.info({ stripeInvId }, '[webhook] Stripe invoice already paid, skipping mark')
          }

          // 1c. If this invoice was the first bill on a brand-new
          //     subscription (created in Stripe Dashboard with send_invoice
          //     collection mode), pivot the subscription to charge the
          //     saved card automatically going forward. Subsequent monthly
          //     invoices will silently auto-debit, no branded emails.
          const subId =
            typeof stripeInvoice.subscription === 'string'
              ? stripeInvoice.subscription
              : stripeInvoice.subscription?.id
          const pm = pi.payment_method as Stripe.PaymentMethod | null
          if (subId && pm && isReusablePaymentMethod(pm)) {
            try {
              await stripe.subscriptions.update(subId, {
                collection_method: 'charge_automatically',
                default_payment_method: pm.id,
              })
              payload.logger.info(
                { subId, pmId: pm.id },
                '[webhook] pivoted sub to charge_automatically with saved PM',
              )
            } catch (err) {
              payload.logger.warn(
                { err, subId },
                '[webhook] could not pivot subscription collection_method',
              )
            }
          }
        }
      } catch (err) {
        payload.logger.warn({ err, payloadInvoiceId }, '[webhook] could not mark Stripe invoice paid_out_of_band')
      }
    }

    // 2. Care plan branching
    if (carePlanSlug && customerId) {
      const tier = carePlanBySlug(carePlanSlug)
      if (!tier) {
        payload.logger.warn({ carePlanSlug }, '[webhook] unknown care plan slug, skipping sub create')
        return
      }
      const pm = pi.payment_method as Stripe.PaymentMethod | null
      if (isReusablePaymentMethod(pm)) {
        // Card / ACH / Link path — create the subscription server-side now.
        await createCarePlanSubscription({
          stripe,
          payload,
          customerId,
          carePlanLookupKey: tier.lookupKey,
          paymentMethodId: pm!.id,
          sourceInvoicePayloadId: payloadInvoiceId ?? null,
          consent: {
            text: pi.metadata?.consent_text ?? '',
            authorizedAt: pi.metadata?.consent_authorized_at ?? '',
            ip: pi.metadata?.consent_ip ?? '',
            ua: pi.metadata?.consent_ua ?? '',
          },
          idempotencyKey: `careplan-${pi.id}`,
        })
      } else {
        // BNPL path — the PM isn't reusable. Mark the invoice as needing a
        // separate setup step. The thank-you page reads this and redirects
        // the client to /care-plan/setup.
        if (payloadInvoiceId) {
          await payload.update({
            collection: 'invoices',
            id: payloadInvoiceId,
            data: {
              internalNotes:
                '[care-plan] BNPL used for invoice — client needs to complete /care-plan/setup to attach a card.',
            },
          })
        }
        payload.logger.info(
          { piId: pi.id, customerId },
          '[webhook] care plan deferred to /care-plan/setup (BNPL payment)',
        )
      }
    }
    return
  }

  if (session.mode === 'setup') {
    // Care plan card-capture flow. Setup Intent's payment_method is now
    // attached to the Customer; the metadata told us which plan to start.
    const setupIntentId =
      typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id
    if (!setupIntentId) return
    const si = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] })
    const customerId = typeof si.customer === 'string' ? si.customer : si.customer?.id ?? null
    const carePlanSlug = si.metadata?.care_plan_tier
    const sourceInvoicePayloadId = si.metadata?.payload_invoice_id ?? null
    if (!customerId || !carePlanSlug) return
    const tier = carePlanBySlug(carePlanSlug)
    if (!tier) return
    const pm = si.payment_method as Stripe.PaymentMethod | null
    if (!pm) return

    await createCarePlanSubscription({
      stripe,
      payload,
      customerId,
      carePlanLookupKey: tier.lookupKey,
      paymentMethodId: pm.id,
      sourceInvoicePayloadId,
      consent: {
        text: si.metadata?.consent_text ?? '',
        authorizedAt: si.metadata?.consent_authorized_at ?? '',
        ip: si.metadata?.consent_ip ?? '',
        ua: si.metadata?.consent_ua ?? '',
      },
      idempotencyKey: `careplan-${si.id}`,
    })
  }
}

// Mirror a Stripe Customer → Payload Client. Used by both customer.created
// and customer.updated handlers (Stripe-primary workflow: create the
// customer in Stripe Dashboard, BHC mirrors the row automatically).
//
// Idempotent: runs as upsert keyed by stripeCustomerId. Skips if the
// Stripe email isn't set yet (rare but possible for partial creation).
async function syncCustomer(
  payload: Awaited<ReturnType<typeof getPayload>>,
  customer: Stripe.Customer,
): Promise<void> {
  if (!customer.id) return
  if (!customer.email) {
    payload.logger.info(
      { customerId: customer.id },
      '[webhook] customer has no email yet, skipping mirror',
    )
    return
  }

  const displayName = customer.name || customer.email
  // Field shape mirrors what we'd write from the afterChange hook.
  const data: Record<string, unknown> = {
    displayName,
    email: customer.email,
    stripeCustomerId: customer.id,
  }
  if (customer.phone) data.phone = customer.phone
  // Stripe Customer doesn't have a first-class `company` field, but
  // operators often put it in `metadata.company` or in the `name` itself.
  // Pull from metadata if present.
  const meta = customer.metadata ?? {}
  if (typeof meta.company === 'string' && meta.company.length > 0) {
    data.company = meta.company
  }

  // Try to find an existing client by stripeCustomerId first; fall back
  // to email match (handles the case where you created the client in
  // Payload first then later created the Stripe Customer separately).
  const byCustomerId = await payload.find({
    collection: 'clients',
    where: { stripeCustomerId: { equals: customer.id } },
    limit: 1,
  })
  if (byCustomerId.totalDocs > 0) {
    await payload.update({
      collection: 'clients',
      id: byCustomerId.docs[0].id,
      data: data as never,
      context: { skipStripeSync: true } as never,
    })
    return
  }

  const byEmail = await payload.find({
    collection: 'clients',
    where: { email: { equals: customer.email } },
    limit: 1,
  })
  if (byEmail.totalDocs > 0) {
    await payload.update({
      collection: 'clients',
      id: byEmail.docs[0].id,
      data: data as never,
      context: { skipStripeSync: true } as never,
    })
    return
  }

  await payload.create({
    collection: 'clients',
    data: data as never,
    context: { skipStripeSync: true } as never,
  })
  payload.logger.info(
    { customerId: customer.id, email: customer.email },
    '[webhook] mirrored Stripe Customer into Payload',
  )
}

async function handleCustomerDeleted(
  payload: Awaited<ReturnType<typeof getPayload>>,
  customer: Stripe.Customer,
): Promise<void> {
  // Soft-handle: clear the stripeCustomerId on the Payload client but
  // don't delete the Payload row. The client may still have historical
  // invoices / subscriptions linked to them.
  if (!customer.id) return
  const rows = await payload.find({
    collection: 'clients',
    where: { stripeCustomerId: { equals: customer.id } },
    limit: 1,
  })
  if (rows.totalDocs === 0) return
  await payload.update({
    collection: 'clients',
    id: rows.docs[0].id,
    data: { stripeCustomerId: null } as never,
    context: { skipStripeSync: true } as never,
  })
  payload.logger.info({ customerId: customer.id }, '[webhook] cleared stripeCustomerId on deleted customer')
}

async function handleInvoiceFinalized(
  payload: Awaited<ReturnType<typeof getPayload>>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<void> {
  // (#12) Both one-off and subscription invoices flow through here. We mirror
  // them into Payload but DON'T auto-send the branded email — the operator
  // triggers that manually from the Client doc page. See the "Send email"
  // button in ClientRelatedRecordsField.
  if (!invoice.id) return
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  // Find or create the Payload Client mirror.
  let clientId: string | number | null = null
  let clientName = 'Client'
  let clientEmail = invoice.customer_email ?? null

  const clientRows = await payload.find({
    collection: 'clients',
    where: { stripeCustomerId: { equals: customerId } },
    limit: 1,
  })
  if (clientRows.totalDocs > 0) {
    const c = clientRows.docs[0] as { id: string | number; displayName?: string; email?: string }
    clientId = c.id
    clientName = c.displayName ?? clientName
    clientEmail = c.email ?? clientEmail
  } else {
    // Pull customer details from Stripe + create a Payload Client.
    const cus = await stripe.customers.retrieve(customerId)
    if ('deleted' in cus && cus.deleted) {
      payload.logger.warn({ customerId }, '[webhook] cannot mirror invoice for deleted customer')
      return
    }
    const customer = cus as Stripe.Customer
    clientName = customer.name || customer.email || 'Client'
    clientEmail = customer.email ?? clientEmail
    if (!clientEmail) {
      payload.logger.warn({ customerId }, '[webhook] cannot mirror invoice — Stripe customer has no email')
      return
    }
    const newClient = await payload.create({
      collection: 'clients',
      data: {
        displayName: clientName,
        email: clientEmail,
        stripeCustomerId: customerId,
      } as never,
    })
    clientId = newClient.id
  }
  if (!clientEmail) return

  // Find or create the Payload Invoice mirror. We key by stripeInvoiceId.
  const existingInv = await payload.find({
    collection: 'invoices',
    where: { stripeInvoiceId: { equals: invoice.id } },
    limit: 1,
  })

  const lineItems = (invoice.lines.data ?? []).map((li) => ({
    description: li.description ?? 'Item',
    amountCents: li.amount ?? 0,
    quantity: li.quantity ?? 1,
  }))

  const totalCents = invoice.amount_due ?? invoice.total ?? 0

  if (existingInv.totalDocs === 0) {
    // Generate a friendly invoice number from the Stripe number, falling
    // back to a derived one if Stripe didn't assign one yet.
    const invoiceNumber = invoice.number || `STRIPE-${invoice.id.slice(-8).toUpperCase()}`
    const subId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id ?? null
    await payload.create({
      collection: 'invoices',
      data: {
        invoiceNumber,
        client: clientId ?? undefined,
        description: invoice.description ?? undefined,
        lineItems: lineItems.length > 0 ? lineItems : [{ description: 'Stripe invoice', amountCents: totalCents }],
        totalCents,
        status: 'open',
        stripeInvoiceId: invoice.id,
        // (#6) Cache the linked Stripe subscription ID so the /invoice page
        // can decide upsell visibility without a live Stripe API call.
        stripeSubscriptionId: subId,
        stripeHostedUrl: invoice.hosted_invoice_url ?? null,
        issuedAt: new Date(invoice.created * 1000).toISOString(),
        dueAt: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        // Care Plan upsell only makes sense on one-off project invoices,
        // not on invoices that are themselves billing a subscription.
        allowCarePlanUpsell: !invoice.subscription,
      } as never,
    })
    payload.logger.info(
      { stripeInvId: invoice.id, clientId, billingReason: invoice.billing_reason },
      '[webhook] mirrored Stripe invoice into Payload',
    )
  }

  // (#12) The branded email is operator-triggered now (Send button on the
  // Client detail page → /api/invoices/[id]/send-email). The mirror is in
  // place; we just log and exit.
  payload.logger.info(
    { stripeInvId: invoice.id, billingReason: invoice.billing_reason, status: invoice.status },
    '[webhook] mirrored invoice; awaiting manual send-email trigger',
  )
}

async function createCarePlanSubscription(args: {
  stripe: Stripe
  payload: Awaited<ReturnType<typeof getPayload>>
  customerId: string
  carePlanLookupKey: string
  paymentMethodId: string
  sourceInvoicePayloadId: string | null
  consent: { text: string; authorizedAt: string; ip: string; ua: string }
  idempotencyKey: string
}): Promise<void> {
  const { stripe, payload, customerId, carePlanLookupKey, paymentMethodId, sourceInvoicePayloadId, consent, idempotencyKey } = args

  // Resolve the Stripe Price by lookup_key. The setup script seeds these.
  const prices = await stripe.prices.list({ lookup_keys: [carePlanLookupKey], active: true, limit: 1 })
  if (prices.data.length === 0) {
    throw new Error(`Stripe Price with lookup_key=${carePlanLookupKey} not found. Run scripts/stripe-setup.ts.`)
  }
  const price = prices.data[0]

  // First charge anchored to 30 days out so we don't double-bill the client
  // who just paid the invoice today. Adjust to `now` if you want immediate
  // first-month billing instead.
  const billingCycleAnchor = Math.floor(Date.now() / 1000) + 30 * 86_400

  await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: price.id }],
      default_payment_method: paymentMethodId,
      billing_cycle_anchor: billingCycleAnchor,
      proration_behavior: 'none',
      metadata: {
        care_plan_lookup_key: carePlanLookupKey,
        source_invoice_payload_id: sourceInvoicePayloadId ?? '',
        consent_text: consent.text,
        consent_authorized_at: consent.authorizedAt,
        consent_ip: consent.ip,
        consent_ua: consent.ua,
      },
    },
    { idempotencyKey },
  )
  // The subscription.created webhook will fire next and will sync into Payload
  // via syncSubscription(). We don't write to Payload here to avoid duplicate
  // mirror logic across two code paths.
  payload.logger.info({ customerId, lookupKey: carePlanLookupKey }, '[webhook] care plan subscription created')
}

async function handleInvoicePaid(
  payload: Awaited<ReturnType<typeof getPayload>>,
  invoice: Stripe.Invoice,
): Promise<void> {
  // For one-time invoices created via Stripe Invoicing (not Checkout), the
  // webhook lands here. We mirror the paid status into Payload if the
  // invoice has a Payload-side mirror.
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (subscriptionId) {
    // Recurring invoice for an existing subscription — bump currentPeriodEnd.
    const subRows = await payload.find({
      collection: 'subscriptions',
      where: { stripeSubscriptionId: { equals: subscriptionId } },
      limit: 1,
    })
    if (subRows.totalDocs > 0 && invoice.lines.data[0]?.period?.end) {
      await payload.update({
        collection: 'subscriptions',
        id: subRows.docs[0].id,
        data: {
          currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000).toISOString(),
        },
      })
    }
    return
  }

  if (!invoice.id) return
  const rows = await payload.find({
    collection: 'invoices',
    where: { stripeInvoiceId: { equals: invoice.id } },
    limit: 1,
  })
  if (rows.totalDocs === 0) return
  await payload.update({
    collection: 'invoices',
    id: rows.docs[0].id,
    data: {
      status: 'paid',
      paidAt: new Date().toISOString(),
    },
  })
}

async function handleInvoicePaymentFailed(
  payload: Awaited<ReturnType<typeof getPayload>>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

  // Resolve the customer for the alert email.
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  let clientName = 'Unknown client'
  let clientEmail = invoice.customer_email ?? 'unknown@unknown'
  if (customerId) {
    try {
      const c = await stripe.customers.retrieve(customerId)
      if (!('deleted' in c) || !c.deleted) {
        const customer = c as Stripe.Customer
        clientName = customer.name || customer.email || clientName
        clientEmail = customer.email || clientEmail
      }
    } catch {
      // Best-effort lookup; alert still fires with whatever we have.
    }
  }

  if (subscriptionId) {
    const rows = await payload.find({
      collection: 'subscriptions',
      where: { stripeSubscriptionId: { equals: subscriptionId } },
      limit: 1,
    })
    if (rows.totalDocs > 0) {
      await payload.update({
        collection: 'subscriptions',
        id: rows.docs[0].id,
        data: { status: 'past_due' },
      })
    }
  }

  // Always alert the operator. Even non-subscription failures (rare for one-off
  // invoices but possible if Smart Retries are enabled on those too) deserve
  // a heads-up.
  await sendPaymentFailedAlertEmail({
    payload,
    invoice,
    clientName,
    clientEmail,
    subscriptionId: subscriptionId ?? null,
  })
}

async function syncSubscription(
  payload: Awaited<ReturnType<typeof getPayload>>,
  sub: Stripe.Subscription,
): Promise<void> {
  // Resolve which client owns this Stripe Customer.
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (!customerId) return
  const clientRows = await payload.find({
    collection: 'clients',
    where: { stripeCustomerId: { equals: customerId } },
    limit: 1,
  })
  let clientId: string | number | null = null
  if (clientRows.totalDocs > 0) {
    clientId = clientRows.docs[0].id
  }

  const item = sub.items.data[0]
  const priceId = item?.price.id
  const lookupKey = item?.price.lookup_key
  const tier = carePlanByLookupKey(lookupKey ?? null)

  // Resolve a display label. For Care Plans use the catalog name; for unknown
  // products fall back to the price nickname or "Subscription".
  const clientName = clientRows.docs[0] ? (clientRows.docs[0] as { displayName?: string }).displayName ?? 'Client' : 'Client'
  const tierLabel = tier?.name ?? item?.price.nickname ?? 'Subscription'
  const displayLabel = `${clientName} · ${tierLabel}`

  // sourceInvoice is a relationship field; SQLite uses integer IDs,
  // Postgres uses UUIDs/strings. Stripe metadata is always a string —
  // coerce all-digit strings to numbers so the SQLite adapter accepts
  // them, leave alphanumeric IDs (Postgres UUIDs) as strings. If the
  // invoice doesn't exist in Payload (rare — e.g. manual Stripe-side
  // subscription), drop the field entirely so create doesn't fail.
  const sourceInvoiceRaw = sub.metadata?.source_invoice_payload_id
  let sourceInvoiceId: string | number | undefined = undefined
  if (sourceInvoiceRaw) {
    const candidate = /^\d+$/.test(sourceInvoiceRaw) ? Number(sourceInvoiceRaw) : sourceInvoiceRaw
    const invRows = await payload.find({
      collection: 'invoices',
      where: { id: { equals: candidate } },
      limit: 1,
    })
    if (invRows.totalDocs > 0) sourceInvoiceId = candidate
  }

  const data = {
    displayLabel,
    client: clientId ?? undefined,
    tier: tier?.slug ?? 'custom',
    monthlyAmountCents: item?.price.unit_amount ?? 0,
    status: sub.status,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: customerId,
    stripePriceId: priceId ?? '',
    startedAt: new Date(sub.start_date * 1000).toISOString(),
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    consentRecord: {
      consentText: sub.metadata?.consent_text ?? '',
      authorizedAt: sub.metadata?.consent_authorized_at ?? null,
      ipAddress: sub.metadata?.consent_ip ?? '',
      userAgent: sub.metadata?.consent_ua ?? '',
    },
    sourceInvoice: sourceInvoiceId,
  }

  const existing = await payload.find({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: sub.id } },
    limit: 1,
  })
  if (existing.totalDocs === 0) {
    if (!clientId) {
      // We require a client to satisfy the relationship constraint. If we
      // don't have one, log and bail — the next webhook (after a Client
      // gets created elsewhere) will retry the upsert.
      payload.logger.warn(
        { customerId, subId: sub.id },
        '[webhook] subscription synced but no Client matched stripeCustomerId',
      )
      return
    }
    await payload.create({ collection: 'subscriptions', data: data as never })
  } else {
    await payload.update({
      collection: 'subscriptions',
      id: existing.docs[0].id,
      data: data as never,
    })
  }
}

// (#16) When a charge is refunded in Stripe, update the linked Payload
// invoice's refundedCents + status. Stripe fires this for both partial
// and full refunds (charge.amount_refunded == charge.amount → full).
async function handleChargeRefunded(
  payload: Awaited<ReturnType<typeof getPayload>>,
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<void> {
  // Resolve the linked Stripe invoice: charges directly created via Invoice
  // payment have charge.invoice set; charges from our Checkout flow link
  // back via the invoice's metadata.payload_invoice_id (we set it at session
  // creation time).
  const stripeInvoiceId =
    typeof charge.invoice === 'string' ? charge.invoice : charge.invoice?.id ?? null

  // Find the Payload mirror.
  let payloadInvoiceId: string | number | null = null
  if (stripeInvoiceId) {
    const rows = await payload.find({
      collection: 'invoices',
      where: { stripeInvoiceId: { equals: stripeInvoiceId } },
      limit: 1,
    })
    if (rows.totalDocs > 0) payloadInvoiceId = rows.docs[0].id
  }
  if (!payloadInvoiceId && charge.payment_intent) {
    // Fall back to PaymentIntent metadata
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id
    try {
      const pi = await stripe.paymentIntents.retrieve(piId)
      const metaInvId = pi.metadata?.payload_invoice_id
      if (metaInvId) payloadInvoiceId = metaInvId
    } catch {
      // skip
    }
  }
  if (!payloadInvoiceId) {
    payload.logger.info({ chargeId: charge.id }, '[webhook] charge.refunded — no Payload invoice mirror, skipping')
    return
  }

  const refundedCents = charge.amount_refunded ?? 0
  const isFullRefund = refundedCents >= (charge.amount ?? 0)
  await payload.update({
    collection: 'invoices',
    id: payloadInvoiceId,
    data: {
      refundedCents,
      status: isFullRefund ? 'refunded' : 'partially_refunded',
    },
  })
  payload.logger.info(
    { payloadInvoiceId, refundedCents, status: isFullRefund ? 'refunded' : 'partially_refunded' },
    '[webhook] applied refund to invoice',
  )
}

// (#16) Credit notes are Stripe's "official document" version of a refund.
// They can also reduce the amount due on an open invoice without an actual
// charge refund. We mirror the credit-note amount into refundedCents.
async function handleCreditNoteCreated(
  payload: Awaited<ReturnType<typeof getPayload>>,
  creditNote: Stripe.CreditNote,
): Promise<void> {
  const stripeInvoiceId =
    typeof creditNote.invoice === 'string' ? creditNote.invoice : creditNote.invoice?.id ?? null
  if (!stripeInvoiceId) return
  const rows = await payload.find({
    collection: 'invoices',
    where: { stripeInvoiceId: { equals: stripeInvoiceId } },
    limit: 1,
  })
  if (rows.totalDocs === 0) return
  const inv = rows.docs[0] as { id: string | number; refundedCents?: number; totalCents: number }
  const newRefunded = (inv.refundedCents ?? 0) + (creditNote.amount ?? 0)
  const isFullRefund = newRefunded >= inv.totalCents
  await payload.update({
    collection: 'invoices',
    id: inv.id,
    data: {
      refundedCents: newRefunded,
      status: isFullRefund ? 'refunded' : 'partially_refunded',
    },
  })
  payload.logger.info(
    { invoiceId: inv.id, refundedCents: newRefunded, isFullRefund },
    '[webhook] applied credit note to invoice',
  )
}

async function handleSubscriptionDeleted(
  payload: Awaited<ReturnType<typeof getPayload>>,
  sub: Stripe.Subscription,
): Promise<void> {
  await payload.update({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: sub.id } },
    data: {
      status: 'canceled',
      canceledAt: new Date(sub.canceled_at ? sub.canceled_at * 1000 : Date.now()).toISOString(),
    },
  })
}

// (#2) Log once per server boot, not per request, so the prefix is visible
// during normal operation without flooding logs. We attach the cache to a
// module-scoped flag.
let _loggedWebhookPrefix = false
function logWebhookSecretPrefixOnce(secret: string): void {
  if (_loggedWebhookPrefix) return
  _loggedWebhookPrefix = true
  const prefix = secret.slice(0, 12)
  // eslint-disable-next-line no-console
  console.info(`[stripe-webhook] active signing secret prefix: ${prefix}…`)
}

function summarize(event: Stripe.Event): string {
  const obj = event.data.object as unknown as Record<string, unknown>
  const id = (obj.id as string) ?? '(no id)'
  return `${event.type} → ${id}`
}

// Suppress unused warning in pure-types helper file.
void CARE_PLANS
