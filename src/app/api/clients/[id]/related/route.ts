import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// GET /api/clients/[id]/related
//
// Returns the invoices + subscriptions belonging to a Client. Used by the
// Clients admin UI to render an at-a-glance billing dashboard with action
// buttons (send-invoice-email, send-care-plan-signup) per row.
//
// Also returns the latest unpaid invoice for each subscription (so the
// admin can resend the branded email for that specific invoice).
//
// Admin-only.

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const payload = await getPayload({ config })

  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const [invoiceRows, subRows] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: { client: { equals: id } },
      sort: '-issuedAt',
      limit: 100,
    }),
    payload.find({
      collection: 'subscriptions',
      where: { client: { equals: id } },
      sort: '-startedAt',
      limit: 100,
    }),
  ])

  // For each subscription, find the latest unpaid invoice (if any) so the
  // operator can manually resend the branded email for it.
  let stripe: ReturnType<typeof getStripe> | null = null
  if (isStripeConfigured()) {
    try {
      stripe = getStripe()
    } catch {
      // Best-effort — degrade gracefully if Stripe isn't reachable.
    }
  }

  const subscriptionsWithInvoices = await Promise.all(
    subRows.docs.map(async (sub) => {
      const s = sub as {
        id: string | number
        stripeSubscriptionId: string
        status: string
        tier: string
        monthlyAmountCents: number
        displayLabel: string
      }
      let latestUnpaidInvoice: {
        id: string | number
        invoiceNumber: string
        totalCents: number
        stripeInvoiceId?: string | null
      } | null = null
      if (stripe) {
        try {
          const stripeInvs = await stripe.invoices.list({
            subscription: s.stripeSubscriptionId,
            status: 'open',
            limit: 1,
          })
          const stripeInv = stripeInvs.data[0]
          if (stripeInv) {
            const mirror = await payload.find({
              collection: 'invoices',
              where: { stripeInvoiceId: { equals: stripeInv.id } },
              limit: 1,
            })
            if (mirror.totalDocs > 0) {
              const m = mirror.docs[0] as {
                id: string | number
                invoiceNumber: string
                totalCents: number
                stripeInvoiceId?: string | null
              }
              latestUnpaidInvoice = {
                id: m.id,
                invoiceNumber: m.invoiceNumber,
                totalCents: m.totalCents,
                stripeInvoiceId: m.stripeInvoiceId,
              }
            }
          }
        } catch {
          // Skip — surfaces as null in the response.
        }
      }
      return {
        id: s.id,
        stripeSubscriptionId: s.stripeSubscriptionId,
        displayLabel: s.displayLabel,
        tier: s.tier,
        status: s.status,
        monthlyAmountCents: s.monthlyAmountCents,
        latestUnpaidInvoice,
      }
    }),
  )

  return NextResponse.json({
    invoices: invoiceRows.docs.map((d) => {
      const i = d as {
        id: string | number
        invoiceNumber: string
        totalCents: number
        status: string
        paidAt?: string | null
        issuedAt?: string | null
        stripeInvoiceId?: string | null
      }
      return {
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        totalCents: i.totalCents,
        status: i.status,
        paidAt: i.paidAt,
        issuedAt: i.issuedAt,
        stripeInvoiceId: i.stripeInvoiceId,
      }
    }),
    subscriptions: subscriptionsWithInvoices,
  })
}
