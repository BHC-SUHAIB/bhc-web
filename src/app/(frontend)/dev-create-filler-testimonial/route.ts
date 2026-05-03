import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

// Dev-only — creates a 400-character filler testimonial so the carousel's
// fixed-height layout can be visually verified at the maxLength boundary.
// Idempotent: looks for an existing "Quote Length Test" doc and updates it
// instead of creating duplicates. Disabled in production.
export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  // Exactly 400 characters — the cap defined on Testimonial.quote.
  const filler =
    'Black Hart Consulting completely rebuilt our web presence in two weeks. The new site loads in under a second on mobile, our Google Business Profile is finally set up correctly, and the contact form fires conversion events straight into our analytics dashboard. Revenue from organic search has tripled since launch. Worth every dollar for any small business burned by an agency in the past.'

  const payload = await getPayload({ config })
  const data = {
    author: 'Quote Length Test',
    role: 'QA Tester',
    company: 'Filler Co.',
    quote: filler,
    rating: '5' as const,
    featured: true,
    sortOrder: 99,
  }

  const existing = await payload.find({
    collection: 'testimonials',
    where: { author: { equals: data.author } },
    limit: 1,
  })

  let result
  if (existing.totalDocs === 0) {
    result = await payload.create({ collection: 'testimonials', data: data as any })
  } else {
    result = await payload.update({ collection: 'testimonials', id: existing.docs[0].id, data: data as any })
  }

  revalidateTag('testimonials')
  return NextResponse.json({ ok: true, length: filler.length, id: result.id, action: existing.totalDocs === 0 ? 'created' : 'updated' })
}
