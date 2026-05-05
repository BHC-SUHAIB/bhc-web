import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// GET /api/admin/recent-activity?limit=8
//
// Returns the most recent N audit events for the dashboard activity feed.

type Row = {
  id: string | number
  action: string
  actor: string
  summary: string
  subjectType?: string | null
  subjectId?: string | null
  createdAt: string
}

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 8), 1), 25)

  const events = await payload.find({
    collection: 'audit-events',
    sort: '-createdAt',
    limit,
    depth: 0,
  })

  const rows: Row[] = (events.docs as unknown as Row[]).map((d) => ({
    id: d.id,
    action: d.action,
    actor: d.actor,
    summary: d.summary,
    subjectType: d.subjectType ?? null,
    subjectId: d.subjectId ?? null,
    createdAt: d.createdAt,
  }))

  return NextResponse.json({ rows })
}
