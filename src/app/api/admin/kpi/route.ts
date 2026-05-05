import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// GET /api/admin/kpi
//
// Three-tile KPI strip on the admin dashboard:
//   - MTD net revenue (paid invoices, current calendar month, in operator TZ)
//   - MRR (sum of monthlyAmountCents on active subscriptions)
//   - At-risk clients (Clients.isDelinquent === true)

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))

  const [paidThisMonth, paidLastMonth, activeSubs, delinquentClients] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: {
        and: [
          { status: { in: ['paid', 'partially_refunded'] } },
          { paidAt: { greater_than_equal: startOfMonth.toISOString() } },
        ],
      },
      limit: 1000,
      depth: 0,
    }),
    payload.find({
      collection: 'invoices',
      where: {
        and: [
          { status: { in: ['paid', 'partially_refunded'] } },
          { paidAt: { greater_than_equal: startOfLastMonth.toISOString() } },
          { paidAt: { less_than: startOfMonth.toISOString() } },
        ],
      },
      limit: 1000,
      depth: 0,
    }),
    payload.find({
      collection: 'subscriptions',
      where: { status: { equals: 'active' } },
      limit: 200,
      depth: 0,
    }),
    payload.find({
      collection: 'clients',
      where: { isDelinquent: { equals: true } },
      limit: 200,
      depth: 0,
    }),
  ])

  const sumNet = (rows: { totalCents?: number; refundedCents?: number }[]) =>
    rows.reduce((s, r) => s + (r.totalCents ?? 0) - (r.refundedCents ?? 0), 0)

  const mtdNetCents = sumNet(paidThisMonth.docs as { totalCents?: number; refundedCents?: number }[])
  const lastMonthNetCents = sumNet(paidLastMonth.docs as { totalCents?: number; refundedCents?: number }[])

  const mrrCents = (activeSubs.docs as { monthlyAmountCents?: number }[])
    .reduce((s, r) => s + (r.monthlyAmountCents ?? 0), 0)

  const deltaPct = lastMonthNetCents > 0
    ? Math.round(((mtdNetCents - lastMonthNetCents) / lastMonthNetCents) * 100)
    : null

  return NextResponse.json({
    mtdNetCents,
    lastMonthNetCents,
    deltaPct,
    mrrCents,
    activeSubCount: activeSubs.totalDocs,
    atRiskCount: delinquentClients.totalDocs,
  })
}
