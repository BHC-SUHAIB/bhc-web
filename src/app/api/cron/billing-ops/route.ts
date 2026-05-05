import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// POST /api/cron/billing-ops
//
// Bulk operations triggered by an external cron (e.g. on the dev/prod
// droplet's crontab, or a managed scheduler).
//
//   curl -X POST -H "x-cron-key: $CRON_SECRET" \
//     https://blackhartconsulting.com/api/cron/billing-ops
//
// Auth: shared secret in CRON_SECRET env var, passed via x-cron-key header.
// (Cron jobs can't easily authenticate as a Payload admin user.)
//
// Tasks performed each run:
// 1. Refresh "isDelinquent" flag on Clients — set true if they have 2+
//    audit events of action=invoice.payment_failed in the last 90 days,
//    or any subscription stuck in past_due/unpaid for >7 days. Cleared
//    when no recent failures exist.

const NINETY_DAYS_MS = 90 * 86_400_000
const SEVEN_DAYS_MS = 7 * 86_400_000

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not set on server.' }, { status: 503 })
  }
  const provided = req.headers.get('x-cron-key')
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const startedAt = Date.now()
  const flagsRaised: string[] = []
  const flagsCleared: string[] = []

  // Step 1: find candidate clients via past_due/unpaid subscriptions
  // older than 7 days OR via 2+ payment_failed audit events in 90d.
  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString()
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()

  // a) Clients with stuck-in-past_due subs
  const stuckSubs = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { status: { in: ['past_due', 'unpaid'] } },
        { updatedAt: { less_than_equal: sevenDaysAgo } },
      ],
    },
    limit: 500,
    depth: 0,
  })
  const stuckClientIds = new Set<string | number>()
  for (const sub of stuckSubs.docs) {
    const s = sub as { client?: string | number }
    if (s.client) stuckClientIds.add(s.client)
  }

  // b) Clients with 2+ payment_failed audits in 90d
  const failureRows = await payload.find({
    collection: 'audit-events',
    where: {
      and: [
        { action: { equals: 'invoice.payment_failed' } },
        { createdAt: { greater_than_equal: ninetyDaysAgo } },
      ],
    },
    limit: 1000,
  })
  const failureCountByClientId: Record<string, number> = {}
  for (const ev of failureRows.docs) {
    // Audit's subjectId points at subscription/invoice — we need to
    // resolve to the client. Skip unresolvable rows.
    const e = ev as { subjectType?: string; subjectId?: string }
    if (!e.subjectId) continue
    if (e.subjectType === 'subscription') {
      const sub = await payload.find({
        collection: 'subscriptions',
        where: { stripeSubscriptionId: { equals: e.subjectId } },
        limit: 1,
      })
      if (sub.totalDocs > 0) {
        const c = (sub.docs[0] as { client?: string | number }).client
        if (c) failureCountByClientId[String(c)] = (failureCountByClientId[String(c)] ?? 0) + 1
      }
    }
  }
  for (const [clientId, count] of Object.entries(failureCountByClientId)) {
    if (count >= 2) stuckClientIds.add(clientId)
  }

  // Step 2: flag candidates that aren't already flagged
  for (const clientId of stuckClientIds) {
    const c = await payload.findByID({ collection: 'clients', id: clientId })
    if (!(c as { isDelinquent?: boolean }).isDelinquent) {
      await payload.update({
        collection: 'clients',
        id: clientId,
        data: { isDelinquent: true, delinquentAt: new Date().toISOString() } as never,
        context: { skipStripeSync: true } as never,
      })
      flagsRaised.push(String(clientId))
    }
  }

  // Step 3: clear flag on previously-flagged clients who recovered
  // (no stuck subs, no recent failures)
  const flaggedClients = await payload.find({
    collection: 'clients',
    where: { isDelinquent: { equals: true } },
    limit: 500,
  })
  for (const client of flaggedClients.docs) {
    const c = client as { id: string | number }
    if (!stuckClientIds.has(c.id)) {
      await payload.update({
        collection: 'clients',
        id: c.id,
        data: { isDelinquent: false, delinquentAt: null } as never,
        context: { skipStripeSync: true } as never,
      })
      flagsCleared.push(String(c.id))
    }
  }

  const result = {
    ok: true,
    durationMs: Date.now() - startedAt,
    delinquencyCheck: {
      candidatesFound: stuckClientIds.size,
      flagsRaised: flagsRaised.length,
      flagsCleared: flagsCleared.length,
      flagsRaisedIds: flagsRaised,
      flagsClearedIds: flagsCleared,
    },
  }
  payload.logger.info(result, '[cron] billing-ops complete')
  return NextResponse.json(result)
}
