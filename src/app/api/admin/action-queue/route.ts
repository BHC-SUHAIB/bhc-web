import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// GET /api/admin/action-queue
//
// Powers the "Today's actions" panel on the operator home. Three sections:
//   - drafts: invoices in status=draft, oldest first (push to send)
//   - atRisk: clients flagged isDelinquent=true with their open subscription
//   - leads: contact-submissions in status=new (default), newest first

type DraftRow = {
  id: string | number
  invoiceNumber: string
  totalCents: number
  clientName: string
  createdAt: string
}

type AtRiskRow = {
  id: string | number
  clientName: string
  delinquentAt?: string | null
}

type LeadRow = {
  id: string | number
  name: string
  email: string
  source?: string | null
  message?: string | null
  createdAt: string
}

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const [drafts, delinquent, leads] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: { status: { equals: 'draft' } },
      sort: 'createdAt',
      limit: 8,
      depth: 1,
    }),
    payload.find({
      collection: 'clients',
      where: { isDelinquent: { equals: true } },
      sort: '-delinquentAt',
      limit: 8,
      depth: 0,
    }),
    payload.find({
      collection: 'contact-submissions',
      where: { status: { equals: 'new' } },
      sort: '-createdAt',
      limit: 8,
      depth: 0,
    }),
  ])

  const draftRows: DraftRow[] = (drafts.docs as unknown as Array<{
    id: string | number
    invoiceNumber: string
    totalCents: number
    client?: { displayName?: string; company?: string } | null
    createdAt: string
  }>).map((d) => ({
    id: d.id,
    invoiceNumber: d.invoiceNumber,
    totalCents: d.totalCents,
    clientName: d.client?.displayName || d.client?.company || '(no client)',
    createdAt: d.createdAt,
  }))

  const atRiskRows: AtRiskRow[] = (delinquent.docs as unknown as Array<{
    id: string | number
    displayName?: string
    company?: string
    delinquentAt?: string | null
  }>).map((c) => ({
    id: c.id,
    clientName: c.displayName || c.company || '(unnamed)',
    delinquentAt: c.delinquentAt ?? null,
  }))

  const leadRows: LeadRow[] = (leads.docs as unknown as Array<{
    id: string | number
    name: string
    email: string
    sourcePage?: string | null
    message?: string | null
    createdAt: string
  }>).map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    source: l.sourcePage ?? null,
    message: l.message ?? null,
    createdAt: l.createdAt,
  }))

  return NextResponse.json({
    drafts: draftRows,
    atRisk: atRiskRows,
    leads: leadRows,
  })
}
