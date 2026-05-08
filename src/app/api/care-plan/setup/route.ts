import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { carePlanBySlug } from '@/lib/care-plans'
import { verifyInvoiceToken } from '@/lib/invoice-token'
import { denyIfCrossOrigin } from '@/lib/api-guards'

export const dynamic = 'force-dynamic'

// POST /api/care-plan/setup
//
// Mints a Stripe Checkout Session in `mode: 'setup'` for capturing a card
// to bind to a future Care Plan / custom subscription. Used in three flows:
//
//   1. BNPL fallback: client paid the invoice with Klarna/Affirm, so no
//      reusable PM was saved. The thank-you page redirects them here.
//   2. Standalone signup (standard tier): client wants a Care/Growth/Scale
//      Care Plan; admin sends the branded email link.
//   3. Standalone signup (custom): hosting-friend / negotiated price.
//      Admin sends the branded email link with carePlan='custom' plus
//      customLabel + customAmountCents. The card-capture flow is
//      identical; the actual subscription is created in Stripe Dashboard
//      afterwards with the agreed-upon price.
//
// Body:
//   {
//     carePlan: 'care' | 'growth' | 'scale' | 'custom'
//     customLabel?: string           // required when carePlan === 'custom'
//     customAmountCents?: number     // required when carePlan === 'custom'
//     stripeCustomerId?: string      // for standalone (no invoice token)
//     invoiceToken?: string          // signed token from /invoice/[id] flow
//     payloadInvoiceId?: string      // mirror invoice ID for source attribution
//     consentText?: string
//   }

type Body = {
  carePlan?: string
  customLabel?: string
  customAmountCents?: number
  stripeCustomerId?: string
  invoiceToken?: string
  payloadInvoiceId?: string
  consentText?: string
}

export async function POST(req: Request) {
  const csrfDeny = denyIfCrossOrigin(req)
  if (csrfDeny) return csrfDeny

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body.carePlan) {
    return NextResponse.json({ error: 'Missing carePlan slug.' }, { status: 400 })
  }

  // Resolve tier into a uniform shape regardless of standard vs custom.
  // For custom tiers, the lookupKey is empty — Stripe Checkout in setup
  // mode doesn't bind a price (we're only capturing a card). The actual
  // price is set by the operator when creating the Stripe Subscription
  // afterwards.
  type ResolvedTier = { slug: string; name: string; lookupKey: string; monthlyAmountCents: number }
  let resolvedTier: ResolvedTier
  if (body.carePlan === 'custom') {
    const label = (body.customLabel ?? '').trim()
    const amount = body.customAmountCents
    if (!label) {
      return NextResponse.json({ error: 'Custom care plan requires customLabel.' }, { status: 400 })
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 100) {
      return NextResponse.json({ error: 'Custom care plan requires customAmountCents (>=100).' }, { status: 400 })
    }
    resolvedTier = { slug: 'custom', name: label.slice(0, 80), lookupKey: '', monthlyAmountCents: Math.round(amount) }
  } else {
    const t = carePlanBySlug(body.carePlan)
    if (!t) {
      return NextResponse.json({ error: 'Unknown care plan.' }, { status: 400 })
    }
    resolvedTier = { slug: t.slug, name: t.name, lookupKey: t.lookupKey, monthlyAmountCents: t.monthlyAmountCents }
  }

  const stripe = getStripe()
  const payload = await getPayload({ config })

  // Resolve customer. Two paths:
  //   - If we have an invoice token, we trust it and look up the Customer
  //     via the invoice's Client record.
  //   - If not, the caller must pass stripeCustomerId directly (admin/internal).
  let stripeCustomerId = body.stripeCustomerId ?? null

  if (!stripeCustomerId && body.invoiceToken && body.payloadInvoiceId) {
    const invRows = await payload.find({
      collection: 'invoices',
      where: { id: { equals: body.payloadInvoiceId } },
      limit: 1,
      depth: 1,
    })
    if (invRows.totalDocs === 0) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    }
    const inv = invRows.docs[0] as {
      stripeInvoiceId?: string
      id: string | number
      client?: { stripeCustomerId?: string }
    }
    const subject = inv.stripeInvoiceId || String(inv.id)
    const verified = verifyInvoiceToken(body.invoiceToken, subject)
    if (!verified.ok) {
      return NextResponse.json({ error: `Token ${verified.reason}.` }, { status: 401 })
    }
    stripeCustomerId = inv.client?.stripeCustomerId ?? null
  }

  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'Could not resolve Stripe customer.' }, { status: 400 })
  }

  const ipAddress = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: stripeCustomerId,
    payment_method_types: ['card', 'us_bank_account', 'link'],
    setup_intent_data: {
      metadata: {
        care_plan_tier: resolvedTier.slug,
        care_plan_lookup_key: resolvedTier.lookupKey,
        // For custom tiers, also stamp the agreed-upon label + price so
        // the operator has it on the SetupIntent record when creating the
        // matching subscription afterwards.
        care_plan_custom_label: resolvedTier.slug === 'custom' ? resolvedTier.name : '',
        care_plan_custom_amount_cents: resolvedTier.slug === 'custom' ? String(resolvedTier.monthlyAmountCents) : '',
        payload_invoice_id: body.payloadInvoiceId ?? '',
        consent_text: body.consentText?.slice(0, 500) ?? '',
        consent_authorized_at: new Date().toISOString(),
        consent_ip: ipAddress,
        consent_ua: userAgent.slice(0, 200),
      },
    },
    success_url: `${siteUrl}/care-plan/thank-you?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/care-plan/setup?cancelled=1`,
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
