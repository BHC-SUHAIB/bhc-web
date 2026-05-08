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
// Body shapes:
//   Standard tier:  { tier: 'care' | 'growth' | 'scale' }
//   Custom tier:    { tier: 'custom', label: string, monthlyAmountCents: number }
//
// Sends the Client a branded BHC email with a one-click link to the
// setup page (signed token pre-resolves their Stripe customer so they
// only enter a card). The custom tier is for hosting-friend rates,
// FXI-Group-style negotiated plans, and any other one-off subscription
// price — the price displayed in the email is informational only; the
// actual subscription is created in Stripe Dashboard with whatever
// price you set.
//
// Admin-only: gated by the Payload session cookie.

type RouteContext = { params: Promise<{ id: string }> }
type Body = {
  tier?: string
  /** Required when tier === 'custom'. 1-80 chars. */
  label?: string
  /** Required when tier === 'custom'. Positive integer. */
  monthlyAmountCents?: number
}

const MAX_LABEL_LEN = 80
const MIN_AMOUNT_CENTS = 100 // $1 floor — anything less is a typo
const MAX_AMOUNT_CENTS = 10_000_00 // $10k/mo ceiling — sanity

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

  const tierSlug = body.tier ?? 'care'
  const isCustom = tierSlug === 'custom'

  // Resolve display name + price. Standard tiers come from the catalog;
  // custom tiers come from the request body with strict validation.
  let resolvedName: string
  let resolvedAmountCents: number
  let resolvedSlug: 'care' | 'growth' | 'scale' | 'custom'

  if (isCustom) {
    const label = (body.label ?? '').trim()
    if (!label) {
      return NextResponse.json({ error: 'Custom tier requires a label.' }, { status: 400 })
    }
    if (label.length > MAX_LABEL_LEN) {
      return NextResponse.json({ error: `Label is too long (max ${MAX_LABEL_LEN} chars).` }, { status: 400 })
    }
    const amount = body.monthlyAmountCents
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < MIN_AMOUNT_CENTS || amount > MAX_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: `Custom tier requires monthlyAmountCents between ${MIN_AMOUNT_CENTS} and ${MAX_AMOUNT_CENTS}.` },
        { status: 400 },
      )
    }
    resolvedName = label
    resolvedAmountCents = amount
    resolvedSlug = 'custom'
  } else {
    const tier = carePlanBySlug(tierSlug)
    if (!tier) {
      return NextResponse.json({ error: 'Unknown care plan tier.' }, { status: 400 })
    }
    resolvedName = tier.name
    resolvedAmountCents = tier.monthlyAmountCents
    resolvedSlug = tier.slug
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
    tier: resolvedSlug,
    monthlyAmountCents: resolvedAmountCents,
    customLabel: isCustom ? resolvedName : undefined,
  })

  await recordAudit(payload, {
    action: 'care_plan.signup_sent',
    actor: auth.user.email ?? 'admin',
    summary: `Sent ${resolvedName}${isCustom ? '' : ' Care Plan'} signup email to ${c.email}`,
    subjectType: 'client',
    subjectId: id,
    stripeId: c.stripeCustomerId,
    metadata: { tier: resolvedSlug, monthlyAmountCents: resolvedAmountCents, customLabel: isCustom ? resolvedName : undefined },
    ipAddress: (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null,
  })

  return NextResponse.json({ ok: true, sentTo: c.email, tier: resolvedSlug })
}
