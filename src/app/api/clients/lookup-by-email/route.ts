import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// POST /api/clients/lookup-by-email
//
// Returns the stripeCustomerId for a Client matching the given email.
// Used by the standalone /care-plan/setup flow when the user has no
// invoice token (e.g. arriving via a manual link from us). Always returns
// 404 on miss — we don't want to enumerate which emails exist.
//
// In-memory rate limit lives at the route layer to keep the lookups cheap.
// Production-grade rate limiting belongs in Caddy / a CDN edge — this is
// just a sanity guard against accidental loops.

const MAX_PER_MIN = 12
const buckets = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000

function rateLimit(key: string): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (bucket.count >= MAX_PER_MIN) return false
  bucket.count += 1
  return true
}

type Body = { email?: string }

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email.' }, { status: 400 })
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const payload = await getPayload({ config })
  const rows = await payload.find({
    collection: 'clients',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (rows.totalDocs === 0) {
    return NextResponse.json({ error: 'No matching customer.' }, { status: 404 })
  }
  const c = rows.docs[0] as { stripeCustomerId?: string | null }
  if (!c.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer linked.' }, { status: 404 })
  }
  return NextResponse.json({ stripeCustomerId: c.stripeCustomerId })
}
