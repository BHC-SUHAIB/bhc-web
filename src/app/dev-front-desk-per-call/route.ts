/**
 * One-shot content update: AI Front Desk plans move from minutes to calls.
 *
 * Quo's Sona agent bills per answered call (not per minute), so the plans now
 * do too: Basic 100 calls, Plus 250, Pro 500, overage $1 per call. Prices are
 * unchanged. This walks every published page, landing page, article, and FAQ
 * and swaps the exact old strings for the new ones, so nothing else in the
 * CMS is touched (content that drifted since the pricing reset stays put).
 *
 *   curl -X POST http://localhost:3001/dev-front-desk-per-call            (local)
 *   curl -X POST https://blackhartconsulting.com/dev-front-desk-per-call  (prod: needs ALLOW_DEV_SEED)
 *
 * Idempotent: a second run finds no old strings and reports zero changes.
 * Delete this route once it has run on prod.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'

export const dynamic = 'force-dynamic'

const REPLACEMENTS: Array<[string, string]> = [
  ['Overage $0.35 per minute. Premium voice add-on $49 per month.', 'Overage $1 per call. Premium voice add-on $49 per month.'],
  ['1,500 minutes a month', '500 calls a month'],
  ['750 minutes a month', '250 calls a month'],
  ['300 minutes a month', '100 calls a month'],
  ['AI Front Desk setup and Basic plan (300 minutes)', 'AI Front Desk setup and Basic plan (100 calls a month)'],
  ['What counts as a minute and what happens if I go over?', 'What counts as a call and what happens if I go over?'],
  [
    'Talk time on answered calls counts; ring time does not. Overage is $0.35 per minute, billed monthly. Plans include 300, 750, or 1,500 minutes.',
    'Each call the AI answers counts once, however long it runs. Calls under 15 seconds and calls your team picks up do not count. Plans include 100, 250, or 500 calls a month, and overage is $1 per call, billed monthly.',
  ],
  [
    'Plans are $149 a month for 300 minutes, $249 for 750, and $399 for 1,500, month to month after the first 30 days, with overage at $0.35 a minute.',
    'Plans are $149 a month for 100 calls, $249 for 250, and $399 for 500, month to month after the first 30 days, with overage at $1 a call.',
  ],
  ['with per-minute overages measured in cents rather than dollars', 'with overages billed by the minute or by the call'],
]

type Collection = 'pages' | 'landingPages' | 'articles' | 'faqs'
const COLLECTIONS: Array<{ slug: Collection; drafts: boolean; prefix: string }> = [
  { slug: 'pages', drafts: true, prefix: '' },
  { slug: 'landingPages', drafts: true, prefix: '/lp' },
  { slug: 'articles', drafts: true, prefix: '/articles' },
  { slug: 'faqs', drafts: false, prefix: '' },
]

function swap(value: unknown, hits: string[]): unknown {
  if (typeof value === 'string') {
    let out = value
    for (const [from, to] of REPLACEMENTS) {
      if (out.includes(from)) {
        out = out.split(from).join(to)
        hits.push(from.slice(0, 50))
      }
    }
    return out
  }
  if (Array.isArray(value)) return value.map((v) => swap(v, hits))
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) next[k] = swap(v, hits)
    return next
  }
  return value
}

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  try {
    const payload = await getPayload({ config })
    const changes: Array<{ collection: string; slug: string; fields: string[]; hits: string[] }> = []
    const failed: Array<{ collection: string; id: string | number; error: string }> = []

    for (const col of COLLECTIONS) {
      const res = await payload.find({ collection: col.slug, limit: 1000, depth: 0, draft: false, pagination: false })
      for (const doc of res.docs as unknown as Array<Record<string, unknown> & { id: string | number }>) {
        const data: Record<string, unknown> = {}
        const hits: string[] = []
        for (const [key, value] of Object.entries(doc)) {
          if (['id', 'createdAt', 'updatedAt', '_status'].includes(key)) continue
          const before = hits.length
          const next = swap(value, hits)
          if (hits.length > before) data[key] = next
        }
        if (!hits.length) continue
        try {
          if (col.drafts) data._status = 'published'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await payload.update({ collection: col.slug, id: doc.id, data: data as any, depth: 0 })
          const slug = String(doc.slug ?? doc.question ?? doc.id)
          changes.push({ collection: col.slug, slug, fields: Object.keys(data).filter((k) => k !== '_status'), hits })
          if (col.slug !== 'faqs') revalidateContent({ tag: col.slug, slug: doc.slug as string, slugPathPrefix: col.prefix })
        } catch (e) {
          failed.push({ collection: col.slug, id: doc.id, error: e instanceof Error ? e.message : String(e) })
        }
      }
    }
    revalidateContent({ tag: 'faqs' })

    return NextResponse.json({ ok: failed.length === 0, marker: 'front-desk-per-call-v1', changes, failed })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
