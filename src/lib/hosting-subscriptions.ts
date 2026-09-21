import type { Payload } from 'payload'
import { LIVE_SUBSCRIPTION_STATUSES } from '@/lib/invoice-hosting'

// Server-only: "is this client already paying us monthly?"
//
// The Subscriptions collection is the Payload mirror of Stripe Subscription
// objects (the webhook is the only writer), so a single query against it
// answers the question without a Stripe API round trip on every invoice
// render. Rows carry `client` (relationship) + `status`; `stripeSubscriptionId`
// is the Stripe id and is not needed here.
//
// Used by:
//   - the Invoices create hook (default hosting mode)
//   - /invoice/[id] (suppress the hosting section entirely)
//   - /api/checkout/start (refuse to start a second plan)

export async function clientHasLiveSubscription(
  payload: Payload,
  clientId: string | number | null | undefined,
): Promise<boolean> {
  if (clientId === null || clientId === undefined || clientId === '') return false
  try {
    const rows = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [
          { client: { equals: clientId } },
          { status: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
        ],
      },
      limit: 1,
      depth: 0,
    })
    return rows.totalDocs > 0
  } catch (err) {
    // Never let a mirror lookup break invoice rendering or checkout. Failing
    // open keeps today's behaviour (hosting still offered); the operator-set
    // mode remains in charge.
    payload.logger.warn(
      { err: err instanceof Error ? err.message : err, clientId },
      '[hosting] active-subscription lookup failed (treated as none)',
    )
    return false
  }
}
