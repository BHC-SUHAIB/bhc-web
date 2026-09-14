/**
 * One-shot content update: full-replace the /free-demo-site page from the
 * canonical `freeDemoSitePage()` definition in src/seed/reset-content.ts.
 *
 * Narrower than scripts/pricing-reset/apply.mts (which rewrites every page,
 * the FAQ collection, and the header/footer globals): this touches ONE page
 * so a copy change on the ad landing page never re-applies content that has
 * since drifted elsewhere in the CMS.
 *
 *   curl -X POST http://localhost:3001/dev-update-free-demo            (local)
 *   curl -X POST https://blackhartconsulting.com/dev-update-free-demo  (prod: needs ALLOW_DEV_SEED)
 *
 * Idempotent: upserts by slug. Returns 403 in production unless
 * ALLOW_DEV_SEED=one-time-yes is set on the container (see dev-route-guard).
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'
import { freeDemoSitePage } from '@/seed/reset-content'

export const dynamic = 'force-dynamic'

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...freeDemoSitePage(), publishedAt: new Date().toISOString() }

  // The seed tiers carry no Stripe links; on prod those live on the
  // /services page's pricing tiers (written by the Stripe link pass). Copy
  // checkoutHref/subscribeHref across by tier name so the new block shows the
  // same "Buy now" / "Subscribe" buttons as /services instead of ask-only CTAs.
  const services = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'services' } },
    limit: 1,
    depth: 0,
  })
  type Tier = { name?: string | null; checkoutHref?: string | null; subscribeHref?: string | null }
  const linkByName = new Map<string, { checkoutHref?: string | null; subscribeHref?: string | null }>()
  for (const block of ((services.docs[0] as { layout?: Array<{ blockType: string; tiers?: Tier[] }> } | undefined)?.layout ?? [])) {
    if (block.blockType !== 'pricing') continue
    for (const t of block.tiers ?? []) {
      if (t.name && (t.checkoutHref || t.subscribeHref) && !linkByName.has(t.name)) {
        linkByName.set(t.name, { checkoutHref: t.checkoutHref, subscribeHref: t.subscribeHref })
      }
    }
  }
  let linked = 0
  for (const block of data.layout as Array<{ blockType: string; tiers?: Tier[] }>) {
    if (block.blockType !== 'pricing') continue
    for (const t of block.tiers ?? []) {
      const links = t.name ? linkByName.get(t.name) : undefined
      if (links) {
        if (links.checkoutHref) t.checkoutHref = links.checkoutHref
        if (links.subscribeHref) t.subscribeHref = links.subscribeHref
        linked++
      }
    }
  }

  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: data.slug } },
    limit: 1,
    depth: 0,
  })

  const doc = existing.docs[0] as { id: string | number } | undefined
  let action: 'created' | 'updated'
  let id: string | number
  if (doc) {
    await payload.update({ collection: 'pages', id: doc.id, data })
    action = 'updated'
    id = doc.id
  } else {
    const created = await payload.create({ collection: 'pages', data })
    action = 'created'
    id = created.id
  }
  revalidateContent({ tag: 'pages', slug: data.slug, slugPathPrefix: '' })

  const blocks = (data.layout as Array<{ blockType: string }>).map((b) => b.blockType)
  return NextResponse.json({ ok: true, slug: data.slug, action, id, blocks, tiersWithStripeLinks: linked })
}
