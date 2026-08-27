import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCachedLandingPageBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
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
// in blocks → publish. Data is cached at the data layer via
// getCachedLandingPageBySlug (unstable_cache in src/lib/payload-cache.ts), so
// we don't need force-dynamic here. Removing it lets Next emit a normal
// Cache-Control header instead of `no-store`, re-enabling bf-cache for
// instant back-nav — Lighthouse audit 2026-05-05 flagged this site-wide.
// `revalidate=60` is NOT used: it triggers prerender at build time, which
// requires Payload + DATABASE_URI in the build env (per project notes).

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
    // Canonical even though noindex is the default — Search Console still
    // surfaces these in "Discovered" reports, and the canonical helps
    // disambiguate against any www variant before the Caddy redirect lands.
    ...canonical(`/lp/${slug}`),
  }
}

export default async function LandingPageRoute({ params }: Args) {
  const { slug } = await params
  const lp = await loadLandingPage(slug)
  if (!lp) notFound()
  const layout = lp.layout ?? []

  // LPs display the site phone from SiteSettings.contactPhone (no override:
  // the old 346 tracking number is retired, 866 is the only business number).
  if (slug === 'express-website') {
    return (
      <div className="lp-pad-bottom">
        <RenderBlocks blocks={layout} />
      </div>
    )
  }

  return <RenderBlocks blocks={layout} />
}
