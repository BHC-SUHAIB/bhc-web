import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { carePlanBySlug } from '@/lib/care-plans'
import { denyIfCrossOrigin } from '@/lib/api-guards'
import { recordAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// POST /api/subscriptions/[id]/change-tier
//
// Operator-triggered: changes a subscription's tier (Care ↔ Growth ↔ Scale).
// Stripe handles the proration: by default the client is credited for the
// unused portion of their current tier and immediately billed the prorated
// difference on the new tier.
//
// Body:
//   { tier: 'care' | 'growth' | 'scale' }
//
// `id` is the Payload subscription ID.

type RouteContext = { params: Promise<{ id: string }> }
type Body = { tier?: string; prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice' }

export async function POST(req: Request, ctx: RouteContext) {
  const csrfDeny = denyIfCrossOrigin(req)
  if (csrfDeny) return csrfDeny

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  }

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
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const newTier = carePlanBySlug(body.tier ?? '')
  if (!newTier) {
    return NextResponse.json({ error: 'Unknown care plan tier.' }, { status: 400 })
  }

  const subRows = await payload.find({
    collection: 'subscriptions',
    where: { id: { equals: id } },
    limit: 1,
    depth: 1,
  })
  if (subRows.totalDocs === 0) {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
  }
  const sub = subRows.docs[0] as {
    id: string | number
    stripeSubscriptionId: string
    tier: string
    monthlyAmountCents: number
    displayLabel: string
    client?: { displayName?: string }
  }

  if (sub.tier === newTier.slug) {
    return NextResponse.json({ error: `Already on the ${newTier.name} tier.` }, { status: 409 })
  }

  const stripe = getStripe()

  // Resolve the new tier's Stripe Price ID.
  const prices = await stripe.prices.list({ lookup_keys: [newTier.lookupKey], active: true, limit: 1 })
  if (prices.data.length === 0) {
    return NextResponse.json(
      { error: `Stripe price for ${newTier.lookupKey} not found. Run scripts/stripe-setup.ts.` },
      { status: 502 },
    )
  }
  const newPriceId = prices.data[0].id

  // Pull the existing Stripe subscription to find the item we need to swap.
  const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
  const itemId = stripeSub.items.data[0]?.id
  if (!itemId) {
    return NextResponse.json({ error: 'Stripe subscription has no items.' }, { status: 502 })
  }

  try {
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: itemId, price: newPriceId }],
      // 'create_prorations' = credit unused time on old tier, charge prorated
      // difference now on next invoice. 'always_invoice' = generate a new
      // invoice immediately (charges/credits client right now). 'none' = no
      // proration (effective at next billing cycle).
      proration_behavior: body.prorationBehavior ?? 'create_prorations',
      metadata: {
        ...stripeSub.metadata,
        last_tier_change: `${sub.tier} → ${newTier.slug}`,
        last_tier_change_at: new Date().toISOString(),
        last_tier_change_by: auth.user.email ?? 'admin',
      },
    })

    payload.logger.info(
      { subId: sub.stripeSubscriptionId, fromTier: sub.tier, toTier: newTier.slug },
      '[tier-change] applied',
    )

    await recordAudit(payload, {
      action: 'subscription.updated',
      actor: auth.user.email ?? 'admin',
      summary: `Changed ${sub.client?.displayName ?? 'Client'} subscription: ${sub.tier} → ${newTier.slug}`,
      subjectType: 'subscription',
      subjectId: sub.id,
      stripeId: sub.stripeSubscriptionId,
      metadata: {
        fromTier: sub.tier,
        toTier: newTier.slug,
        oldMonthlyCents: sub.monthlyAmountCents,
        newMonthlyCents: newTier.monthlyAmountCents,
        prorationBehavior: body.prorationBehavior ?? 'create_prorations',
      },
      ipAddress: (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null,
    })

    // The customer.subscription.updated webhook will fire next and sync
    // the Payload mirror — we don't update Payload here to avoid two
    // sources of truth racing.
    return NextResponse.json({
      ok: true,
      stripeSubscriptionId: updated.id,
      newTier: newTier.slug,
      newMonthlyAmountCents: newTier.monthlyAmountCents,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Tier change failed'
    payload.logger.error({ err, subId: sub.stripeSubscriptionId }, '[tier-change] failed')
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
