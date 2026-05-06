import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCachedLandingPageBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import type { LandingPage, Media } from '@/payload-types'

// Dynamic landing-page route under (lp)/lp/[slug].
//
// HTML cached for 10 minutes. Empty generateStaticParams skips per-slug
// prerender at build time (LPs come and go often; render on demand at
// runtime is the right model). Edits in admin call revalidatePath via
// the LandingPages afterChange hook so changes propagate within ms.
export const revalidate = 600
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

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
  return <RenderBlocks blocks={lp.layout ?? []} />
}
