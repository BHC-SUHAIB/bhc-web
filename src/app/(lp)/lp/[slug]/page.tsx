import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCachedLandingPageBySlug } from '@/lib/payload-cache'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import type { LandingPage, Media } from '@/payload-types'

// Dynamic landing-page route under (lp)/lp/[slug].
//
// Why a separate route from (frontend)/[slug]:
// - (lp)/layout.tsx omits SiteHeader/SiteFooter — paid traffic shouldn't have
//   a nav exit. (frontend)/layout.tsx includes them.
// - LP records default to noindex so they don't compete with /services in
//   organic search.
// - Both route groups inject GTM identically, so analytics works on both.
//
// Editors create new LPs via Payload admin → Landing pages → Add new → drop
// in blocks → publish. The new slug becomes /lp/{slug} immediately after
// the next ISR revalidation (60s default) — no code changes needed.

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug: string }> }

async function loadLandingPage(slug: string): Promise<LandingPage | null> {
  return getCachedLandingPageBySlug(slug)
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const lp = await loadLandingPage(slug)
  if (!lp) return {}
  const seo = lp.seo
  const og = typeof seo?.ogImage === 'object' ? (seo.ogImage as Media | null) : null
  // Default noIndex=true on LandingPages collection — but always honor the
  // explicit field value so editors can opt a particular LP into indexing.
  const noIndex = seo?.noIndex !== false
  return {
    title: seo?.metaTitle || lp.title,
    description: seo?.metaDescription ?? undefined,
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: og?.url ? { images: [{ url: og.url as string }] } : undefined,
  }
}

export default async function LandingPageRoute({ params }: Args) {
  const { slug } = await params
  const lp = await loadLandingPage(slug)
  if (!lp) notFound()
  return <RenderBlocks blocks={lp.layout ?? []} />
}
