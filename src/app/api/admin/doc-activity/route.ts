import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// GET /api/admin/doc-activity?subjectType=client&subjectId=42
//
// Powers the embedded Activity field on Client / Invoice / Subscription docs.
// Pulls audit + webhook events scoped to the current document so the operator
// sees the full timeline without leaving the doc.

type Row = {
  id: string | number
  kind: 'audit' | 'webhook'
  action: string
  actor: string
  summary: string
  stripeId?: string | null
  createdAt: string
}

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const subjectType = url.searchParams.get('subjectType')
  const subjectId = url.searchParams.get('subjectId')
  if (!subjectType || !subjectId) {
    return NextResponse.json({ error: 'subjectType and subjectId required.' }, { status: 400 })
  }

  const audits = await payload.find({
    collection: 'audit-events',
    where: {
      and: [
        { subjectType: { equals: subjectType } },
        { subjectId: { equals: String(subjectId) } },
      ],
    },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
  })

  const rows: Row[] = (audits.docs as unknown as Array<{
    id: string | number
    action: string
    actor: string
    summary: string
    stripeId?: string | null
    createdAt: string
  }>).map((d) => ({
    id: d.id,
    kind: d.actor === 'stripe-webhook' ? 'webhook' : 'audit',
    action: d.action,
    actor: d.actor,
    summary: d.summary,
    stripeId: d.stripeId ?? null,
    createdAt: d.createdAt,
  }))

  return NextResponse.json({ rows })
}
