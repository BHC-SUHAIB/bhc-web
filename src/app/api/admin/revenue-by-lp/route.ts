import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// GET /api/admin/revenue-by-lp
//
// Aggregates paid + partially-refunded invoice revenue grouped by the
// originating LP source. Used by the BeforeDashboard widget on the admin
// home + accessible directly for ad-hoc reporting / piping into Notion etc.
//
// Returns: [{ sourceLp, label, clientCount, paidCents, refundedCents, netCents }, …]

type Row = {
  sourceLp: string
  label: string
  clientCount: number
  paidCents: number
  refundedCents: number
  netCents: number
}

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // Pull every paid + partially_refunded invoice, depth=1 to get the
  // joined Client (with sourceLp). Limit 1000 invoices for now —
  // pagination can come later when there's a real volume problem.
  const invoiceRows = await payload.find({
    collection: 'invoices',
    where: { status: { in: ['paid', 'partially_refunded'] } },
    limit: 1000,
    depth: 1,
  })

  const buckets = new Map<string, Row>()
  const clientsByBucket = new Map<string, Set<string | number>>()
  const UNATTRIBUTED = '(no source)'

  for (const inv of invoiceRows.docs) {
    const i = inv as unknown as {
      totalCents: number
      refundedCents?: number
      client?: { id: string | number; sourceLp?: string | null } | string | number | null
    }
    const client = typeof i.client === 'object' && i.client ? i.client : null
    const key = (client?.sourceLp && client.sourceLp.trim()) || UNATTRIBUTED
    const label = friendlyLabel(key)
    const refunded = i.refundedCents ?? 0
    const paid = i.totalCents

    if (!buckets.has(key)) {
      buckets.set(key, {
        sourceLp: key,
        label,
        clientCount: 0,
        paidCents: 0,
        refundedCents: 0,
        netCents: 0,
      })
      clientsByBucket.set(key, new Set())
    }
    const row = buckets.get(key)!
    row.paidCents += paid
    row.refundedCents += refunded
    row.netCents += paid - refunded
    if (client?.id != null) clientsByBucket.get(key)!.add(client.id)
  }

  for (const [key, set] of clientsByBucket) {
    const row = buckets.get(key)
    if (row) row.clientCount = set.size
  }

  const rows = [...buckets.values()].sort((a, b) => b.netCents - a.netCents)

  return NextResponse.json({
    rows,
    totals: {
      paidCents: rows.reduce((s, r) => s + r.paidCents, 0),
      refundedCents: rows.reduce((s, r) => s + r.refundedCents, 0),
      netCents: rows.reduce((s, r) => s + r.netCents, 0),
      uniqueClients: rows.reduce((s, r) => s + r.clientCount, 0),
    },
  })
}

// Map raw sourcePage paths to friendlier labels, falling back to the
// raw value when nothing matches.
function friendlyLabel(raw: string): string {
  if (raw === '(no source)') return 'Direct / unattributed'
  const map: Record<string, string> = {
    '/lp/express-website': 'Express Website (US-wide)',
    '/lp/heights-dental': 'Heights Dental',
    '/lp/heights-med-spa': 'Heights Med Spa',
    '/lp/heights-restaurant': 'Heights Restaurant',
    '/lp/heights-real-estate': 'Heights Real Estate',
    '/': 'Homepage',
    '/contact': 'Contact page',
    '/services': 'Services page',
  }
  return map[raw] ?? raw
}
