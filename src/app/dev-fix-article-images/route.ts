/**
 * One-shot content fix: three of the seven live articles on
 * blackhartconsulting.com/articles had no `heroImage` set, so the frontend
 * fell back to <Placeholder> — which, until this same change, rendered a
 * random Picsum stock photo (see src/components/Placeholder.tsx). That's the
 * "random Unsplash" imagery the owner reported: not photos deliberately
 * chosen for the article, just whatever a seeded random-photo API returned.
 *
 * This route fetches a hand-picked, subject-relevant photo for each affected
 * slug, uploads it to the `media` collection, and sets it as the article's
 * heroImage. The other four articles (why-nextjs-over-wordpress,
 * realistic-seo-playbook, managed-hosting-boring-superpower,
 * core-web-vitals-playbook) already have curated hero images from
 * src/seed/onInit.ts and are left untouched.
 *
 *   curl -X POST http://localhost:3000/dev-fix-article-images            (local)
 *   curl -X POST https://blackhartconsulting.com/dev-fix-article-images  (prod: needs ALLOW_DEV_SEED)
 *
 * Idempotent: media is matched by alt text (skips re-fetch/re-upload if
 * present), and the article update is matched by slug. Returns 403 in
 * production unless ALLOW_DEV_SEED=one-time-yes is set — see
 * src/lib/dev-route-guard.ts.
 *
 * Publish semantics: `payload.update()` is called with no `draft` argument.
 * Per Payload's update operation, omitting `draft` (or passing false) skips
 * the drafts path entirely and writes straight to the document's current
 * row — which is exactly what onInit.ts's FORCE_ARTICLES_UPSERT branch does
 * for the same collection. That means: if an article is already published,
 * this updates the live, published doc in place (the site changes
 * immediately, no separate "publish" step needed). If an article is still
 * unpublished (_status: 'draft'), this updates that draft in place without
 * accidentally publishing it. Either way the heroImage takes effect exactly
 * where the doc currently lives.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

export const dynamic = 'force-dynamic'

// Curated, subject-verified images for the three articles that were missing
// a heroImage. Each was visually checked (downloaded + viewed) before
// picking — see the session notes / PR description for the "why this photo"
// reasoning. All are free-tier Unsplash photos (not Unsplash+/premium).
const CURATED_IMAGES: Array<{ slug: string; url: string; alt: string }> = [
  {
    slug: 'ai-receptionist-cost-houston-contractor',
    // Photo by BaljkanN 4 (@baljkann4) on Unsplash.
    url: 'https://images.unsplash.com/photo-1766066014237-00645c74e9c6?w=1600&q=80',
    alt: 'A customer support operator wearing a headset at her desk — What an AI receptionist actually costs a Houston contractor',
  },
  {
    slug: 'show-up-in-chatgpt-google-local-search',
    // Photo by Zulfugar Karimov (@zulfugarkarimov) on Unsplash.
    url: 'https://images.unsplash.com/photo-1762330465857-07e4c81c0dfa?w=1600&q=80',
    alt: "A hand holding a smartphone showing an AI assistant's chat prompt — How to show up when someone asks ChatGPT or Google for a plumber",
  },
  {
    slug: 'how-much-does-a-website-cost-in-houston',
    // Photo by Ali A (@_v_ilv) on Unsplash.
    url: 'https://images.unsplash.com/photo-1729007624137-3e3ba872f880?w=1600&q=80',
    alt: 'The downtown Houston skyline at dusk — How much does a website actually cost in Houston',
  },
]

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })

  const ensureMediaFromUrl = async (alt: string, url: string) => {
    const existing = await payload.find({ collection: 'media', where: { alt: { equals: alt } }, limit: 1 })
    if (existing.totalDocs > 0) return existing.docs[0]

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error(`image fetch failed: ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const name = `${url.split('/').pop()?.split('?')[0] || 'article-image'}.jpg`

      return await payload.create({
        collection: 'media',
        data: { alt } as never,
        file: {
          data: Buffer.from(arrayBuffer),
          mimetype: contentType,
          name,
          size: arrayBuffer.byteLength,
        },
      })
    } catch (err) {
      payload.logger.warn({ err, url }, '[dev-fix-article-images] image fetch/upload failed (continuing without image)')
      return null
    }
  }

  const results: Array<{ slug: string; status: string; mediaId?: number | string }> = []

  for (const entry of CURATED_IMAGES) {
    const found = await payload.find({ collection: 'articles', where: { slug: { equals: entry.slug } }, limit: 1 })
    if (found.totalDocs === 0) {
      results.push({ slug: entry.slug, status: 'article not found, skipped' })
      continue
    }

    const media = await ensureMediaFromUrl(entry.alt, entry.url)
    if (!media) {
      results.push({ slug: entry.slug, status: 'image upload failed, article left unchanged' })
      continue
    }

    const article = found.docs[0]
    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { heroImage: media.id } as never,
    })
    results.push({ slug: entry.slug, status: 'heroImage set', mediaId: media.id })
  }

  return NextResponse.json({ ok: true, results })
}
