import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { verifyInvoiceToken } from '@/lib/invoice-token'
import { carePlanBySlug } from '@/lib/care-plans'
import { denyIfCrossOrigin, rateLimitFivePerHour } from '@/lib/api-guards'

export const dynamic = 'force-dynamic'

// POST /api/checkout/start
//
// Mints a Stripe Checkout Session for a Payload Invoice and (optionally)
// records intent to start a Care Plan after payment. The care plan is NOT
// added as a recurring line item — that would force Stripe to filter
// Klarna/Affirm out of the cart. Instead, we set metadata on the
// PaymentIntent that the webhook reads after the invoice payment lands;
// the webhook then either creates the subscription using the saved card
// (card/ACH path) or emails the client a setup link (BNPL path).
//
// Body shape:
//   {
//     invoiceId: string         // Payload invoice ID OR Stripe invoice ID
//     token: string             // signed access token (verifyInvoiceToken)
//     addCarePlan?: 'care' | 'growth' | 'scale' | null
//     consentText?: string      // verbatim text shown for MIT auth
//     consentTimestamp?: string // client-side timestamp at consent moment
//   }

type Body = {
  invoiceId?: string
  token?: string
  addCarePlan?: string | null
  consentText?: string
  consentTimestamp?: string
}

export async function POST(req: Request) {
  // (#4) CSRF defense — block requests originating from foreign origins.
  // Same-origin and non-browser callers (server-to-server) are allowed.
  const csrfDeny = denyIfCrossOrigin(req)
  if (csrfDeny) return csrfDeny

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured on this server.' },
      { status: 503 },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body.invoiceId || !body.token) {
    return NextResponse.json({ error: 'Missing invoiceId or token.' }, { status: 400 })
  }

  // (#3) Rate-limit per (token, IP) — 5 Checkout Sessions per hour. Stops
  // a leaked invoice URL from being used to mint unlimited Stripe sessions
  // (which we'd pay API call costs on, and which could mask abuse patterns).
  const ipForRl = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0]?.trim() || 'local'
  const rlKey = `checkout:${body.token.slice(-16)}:${ipForRl}`
  if (!rateLimitFivePerHour(rlKey)) {
    return NextResponse.json(
      { error: 'Too many checkout sessions for this invoice. Try again later.' },
      { status: 429 },
    )
  }

  const stripe = getStripe()
  const payload = await getPayload({ config })

  // Resolve the Payload invoice by either Stripe ID or Payload doc ID.
  const found = await payload.find({
    collection: 'invoices',
    where: {
      or: [
        { stripeInvoiceId: { equals: body.invoiceId } },
        { id: { equals: body.invoiceId } },
      ],
    },
    limit: 1,
    depth: 1,
  })
  if (found.totalDocs === 0) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
  }
  const invoice = found.docs[0] as Record<string, unknown> & {
    id: string | number
    stripeInvoiceId?: string | null
    invoiceNumber: string
    totalCents: number
    status: string
    lineItems?: Array<{ description: string; amountCents: number; quantity?: number }>
    client?: { id: string | number; email?: string; displayName?: string; stripeCustomerId?: string | null }
    allowCarePlanUpsell?: boolean
  }

  // Token must be tied to this invoice's Stripe ID (or fall back to Payload ID
  // if the invoice hasn't been pushed to Stripe yet — same signature, just
  // different `iid` payload).
  const tokenSubject = invoice.stripeInvoiceId || String(invoice.id)
  const verified = verifyInvoiceToken(body.token, tokenSubject)
  if (!verified.ok) {
    return NextResponse.json({ error: `Token ${verified.reason}.` }, { status: 401 })
  }

  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid.' }, { status: 409 })
  }
  if (invoice.status === 'void') {
    return NextResponse.json({ error: 'Invoice is voided.' }, { status: 409 })
  }

  // (#5) Pre-checkout status check against Stripe. If the invoice was
  // already paid via the Stripe-hosted URL (or any other channel) but our
  // webhook hasn't landed yet, refuse to mint a new Checkout Session.
  // Prevents the "double-pay race" where a client pays via two paths
  // simultaneously.
  if (invoice.stripeInvoiceId) {
    try {
      const stripe = getStripe()
      const liveStripeInv = await stripe.invoices.retrieve(invoice.stripeInvoiceId)
      if (liveStripeInv.status === 'paid' || liveStripeInv.status === 'void') {
        return NextResponse.json(
          { error: `Invoice is already ${liveStripeInv.status} in Stripe.` },
          { status: 409 },
        )
      }
    } catch {
      // Stripe API hiccup — fall through; the resulting Checkout Session
      // would just refund/void on its own if the invoice has been paid.
    }
  }

  // Resolve / create the Stripe Customer. Dedupe by email.
  const clientEmail = invoice.client?.email
  if (!clientEmail) {
    return NextResponse.json(
      { error: 'Invoice client has no email — fix the Client record before sending the link.' },
      { status: 400 },
    )
  }

  let stripeCustomerId = invoice.client?.stripeCustomerId ?? null
  if (!stripeCustomerId) {
    const existing = await stripe.customers.list({ email: clientEmail, limit: 1 })
    if (existing.data.length > 0) {
      stripeCustomerId = existing.data[0].id
    } else {
      const created = await stripe.customers.create({
        email: clientEmail,
        name: invoice.client?.displayName,
        metadata: { payload_client_id: String(invoice.client?.id ?? '') },
      })
      stripeCustomerId = created.id
    }
    if (invoice.client?.id) {
      await payload.update({
        collection: 'clients',
        id: invoice.client.id,
        data: { stripeCustomerId },
      })
    }
  }

  // Validate care plan opt-in. We accept the slug now but defer the actual
  // subscription creation to the webhook — that's where we know which
  // payment method the client used and whether it's reusable.
  const carePlan = body.addCarePlan ? carePlanBySlug(body.addCarePlan) : null
  if (body.addCarePlan && !carePlan) {
    return NextResponse.json({ error: 'Unknown care plan.' }, { status: 400 })
  }
  if (carePlan && invoice.allowCarePlanUpsell === false) {
    return NextResponse.json({ error: 'Care plan upsell disabled for this invoice.' }, { status: 400 })
  }

  // Build the line items from the Payload invoice. We mint these inline as
  // price_data rather than referencing pre-built Stripe prices — invoice
  // line items are bespoke per project, so static prices don't fit.
  const lineItems = (invoice.lineItems ?? []).map((li) => ({
    quantity: li.quantity ?? 1,
    price_data: {
      currency: 'usd' as const,
      unit_amount: li.amountCents,
      product_data: {
        name: li.description,
      },
    },
  }))
  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'Invoice has no line items.' }, { status: 400 })
  }

  // Site URL for redirects. Falls back to localhost for dev.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Capture the source IP + user agent for the consent record. We embed in
  // PaymentIntent metadata so the webhook has it without extra DB lookups.
  const ipAddress = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  const userAgent = req.headers.get('user-agent') ?? 'unknown'

  // Payment method types are gated by what's enabled in your Stripe account.
  // Listing a method that isn't approved/enabled causes Checkout to error,
  // so we drive this from STRIPE_PAYMENT_METHOD_TYPES (comma-separated env
  // var) with sensible defaults that match a freshly-onboarded BHC account.
  // To turn on Affirm later (after re-categorising the business), append
  // `,affirm` to that env var — no code change needed.
  const pmTypesEnv = process.env.STRIPE_PAYMENT_METHOD_TYPES
  const paymentMethodTypes = (pmTypesEnv && pmTypesEnv.trim().length > 0
    ? pmTypesEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : ['card', 'us_bank_account', 'klarna', 'link', 'cashapp']) as Array<
    'card' | 'us_bank_account' | 'klarna' | 'affirm' | 'link' | 'cashapp' | 'amazon_pay'
  >

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: lineItems,
    // BNPL stays available because the cart contains only the one-time amount.
    payment_method_types: paymentMethodTypes,

    // Per-method setup_future_usage: only set on PMs that support being
    // saved + charged off-session. Setting it on payment_intent_data
    // applies globally, which Stripe rejects when the PM list includes
    // a non-saveable method (klarna, affirm). Per-method config is
    // cleanly ignored on BNPL methods, so the cart still accepts them
    // and the webhook handles the fallback if a BNPL method actually
    // gets used.
    payment_method_options: {
      card: { setup_future_usage: 'off_session' },
      us_bank_account: { setup_future_usage: 'off_session' },
      link: { setup_future_usage: 'off_session' },
      cashapp: { setup_future_usage: 'off_session' },
    },

    payment_intent_data: {
      metadata: {
        invoice_id: tokenSubject,
        payload_invoice_id: String(invoice.id),
        invoice_number: invoice.invoiceNumber,
        care_plan_tier: carePlan?.slug ?? '',
        care_plan_lookup_key: carePlan?.lookupKey ?? '',
        care_plan_amount_cents: String(carePlan?.monthlyAmountCents ?? 0),
        consent_text: body.consentText?.slice(0, 500) ?? '',
        consent_authorized_at: body.consentTimestamp ?? new Date().toISOString(),
        consent_ip: ipAddress,
        consent_ua: userAgent.slice(0, 200),
      },
    },

    // Surface the saved-card prompt at the bottom of the form so the
    // client knows their card will be retained for the recurring charge.
    saved_payment_method_options: {
      payment_method_save: carePlan ? 'enabled' : 'disabled',
    },

    success_url: `${siteUrl}/invoice/${tokenSubject}/thank-you?session={CHECKOUT_SESSION_ID}&token=${encodeURIComponent(body.token)}`,
    cancel_url: `${siteUrl}/invoice/${tokenSubject}?token=${encodeURIComponent(body.token)}`,
    metadata: {
      payload_invoice_id: String(invoice.id),
      care_plan_tier: carePlan?.slug ?? '',
    },
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
