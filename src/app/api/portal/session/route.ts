import { NextResponse } from 'next/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { verifyInvoiceToken } from '@/lib/invoice-token'
import { denyIfCrossOrigin, rateLimit } from '@/lib/api-guards'

export const dynamic = 'force-dynamic'

// POST /api/portal/session
//
// Mints a Stripe Customer Portal session and returns its URL. Clients hit
// this from links in our branded emails and from the /portal/[customer]
// page; we never embed the Stripe URL directly because portal session
// URLs are single-use and expire ~5 min after creation.
//
// Auth model: signed customer token (issued by signInvoiceToken with the
// Stripe Customer ID as the subject). Same machinery as invoice tokens.
//
// Body:
//   { customer: 'cus_…', token: '…', returnUrl?: '…' }

type Body = { customer?: string; token?: string; returnUrl?: string }

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

  if (!body.customer || !body.token) {
    return NextResponse.json({ error: 'Missing customer or token.' }, { status: 400 })
  }

  const verified = verifyInvoiceToken(body.token, body.customer)
  if (!verified.ok) {
    return NextResponse.json({ error: `Token ${verified.reason}.` }, { status: 401 })
  }

  // Rate-limit: 10 portal sessions per (customer, IP) per hour. Portal links
  // get reused within emails so a higher limit than checkout/start.
  const ipForRl = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0]?.trim() || 'local'
  if (!rateLimit(`portal:${body.customer}:${ipForRl}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many portal session requests.' }, { status: 429 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const returnUrl = body.returnUrl ?? `${siteUrl}/`

  const stripe = getStripe()
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: body.customer,
      return_url: returnUrl,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create portal session'
    // Common cause: Stripe Customer Portal hasn't been configured in the
    // Stripe Dashboard. Help the operator self-diagnose.
    return NextResponse.json(
      { error: msg.includes('default configuration') ? 'Stripe Customer Portal is not configured. Visit Stripe Dashboard → Settings → Billing → Customer portal → Activate.' : msg },
      { status: 502 },
    )
  }
}
