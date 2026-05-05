import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { carePlanBySlug } from '@/lib/care-plans'
import { sendBrandedCarePlanSignupEmail } from '@/lib/billing-emails'
import { denyIfCrossOrigin } from '@/lib/api-guards'
import { recordAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// POST /api/clients/[id]/send-care-plan-signup
//
// Body: { tier: 'care' | 'growth' | 'scale' }
//
// Sends the Client a branded BHC email with a one-click link to the
// Care Plan setup page (signed token, pre-resolves their Stripe customer
// + tier so they don't have to enter anything except a card).
//
// Admin-only: gated by the Payload session cookie. Triggered from the
// "Send Care Plan signup email" button on the Client document, or
// callable directly via curl during ops work.

type RouteContext = { params: Promise<{ id: string }> }
type Body = { tier?: string }

export async function POST(req: Request, ctx: RouteContext) {
  const csrfDeny = denyIfCrossOrigin(req)
  if (csrfDeny) return csrfDeny

  const { id } = await ctx.params
  const payload = await getPayload({ config })

  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    body = {}
  }

  const tier = carePlanBySlug(body.tier ?? 'care')
  if (!tier) {
    return NextResponse.json({ error: 'Unknown care plan tier.' }, { status: 400 })
  }

  const client = await payload.findByID({ collection: 'clients', id })
  if (!client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }
  const c = client as {
    id: string | number
    displayName: string
    email?: string
    stripeCustomerId?: string | null
  }
  if (!c.email) {
    return NextResponse.json({ error: 'Client has no email.' }, { status: 400 })
  }
  if (!c.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          'Client has no Stripe Customer ID — re-save the client record so the auto-create hook runs, then retry.',
      },
      { status: 400 },
    )
  }

  await sendBrandedCarePlanSignupEmail({
    payload,
    to: c.email,
    clientName: c.displayName,
    stripeCustomerId: c.stripeCustomerId,
    tier: tier.slug,
    monthlyAmountCents: tier.monthlyAmountCents,
  })

  await recordAudit(payload, {
    action: 'care_plan.signup_sent',
    actor: auth.user.email ?? 'admin',
    summary: `Sent ${tier.name} Care Plan signup email to ${c.email}`,
    subjectType: 'client',
    subjectId: id,
    stripeId: c.stripeCustomerId,
    metadata: { tier: tier.slug, monthlyAmountCents: tier.monthlyAmountCents },
    ipAddress: (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null,
  })

  return NextResponse.json({ ok: true, sentTo: c.email, tier: tier.slug })
}
