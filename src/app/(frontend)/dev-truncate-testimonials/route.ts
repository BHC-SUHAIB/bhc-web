import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

// One-shot dev helper — replaces any existing testimonial whose quote is over
// the 400-char cap with a hand-crafted excerpt that fits inside the carousel's
// fixed h-[420px] slot. Idempotent: safe to re-run, leaves any quote already
// at-or-under the cap untouched.
//
// EDIT in-place when you add/edit testimonials — list the canonical short
// version below and the route will overwrite the long-form copy.
const SHORT_FORMS: Record<string, string> = {
  'Philip Parmar':
    'Black Hart Consulting completely transformed my website from the ground up. They rebuilt everything from scratch, adding the pages and features I needed to actually present my business well. Since launch, parents engage with a much better understanding of what we offer -- which has directly helped with conversions. They build platforms that grow your business, not just sites that look good.',
}

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied
  const payload = await getPayload({ config })
  const out: Array<{ author: string; from: number; to: number; updated: boolean }> = []
  for (const [author, shortQuote] of Object.entries(SHORT_FORMS)) {
    const existing = await payload.find({
      collection: 'testimonials',
      where: { author: { equals: author } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      out.push({ author, from: 0, to: shortQuote.length, updated: false })
      continue
    }
    const doc = existing.docs[0]
    const fromLen = (doc.quote ?? '').length
    if (fromLen <= 400 && doc.quote === shortQuote) {
      out.push({ author, from: fromLen, to: fromLen, updated: false })
      continue
    }
    await payload.update({
      collection: 'testimonials',
      id: doc.id,
      data: { quote: shortQuote } as any,
    })
    out.push({ author, from: fromLen, to: shortQuote.length, updated: true })
  }
  revalidateTag('testimonials')
  return NextResponse.json({ ok: true, results: out })
}
