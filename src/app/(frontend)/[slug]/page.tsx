import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCachedPageBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import type { Page, Media } from '@/payload-types'

// Replaces the previous `export const dynamic = 'force-dynamic'`.
//
// Why this works: with `dynamicParams = true` (the default) and an empty
// `generateStaticParams()`, Next 16 doesn't try to prerender any specific
// slug at build time — so the build never has to call Payload, and the
// "DATABASE_URI/PAYLOAD_SECRET are runtime-only" constraint is satisfied.
// At runtime, the first request for /<slug> renders the page once and
// caches the HTML for `revalidate` seconds. Edits to a Page record fire
// the afterChange hook in src/collections/Pages.ts which calls
// revalidatePath(`/${slug}`) — fresh HTML is served immediately on the
// next request without waiting for the time-based revalidation window.
export const revalidate = 600
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Args = { params: Promise<{ slug: string }> }

async function loadPage(slug: string): Promise<Page | null> {
  if (slug === 'home') return null
  return getCachedPageBySlug(slug)
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const page = await loadPage(slug)
  if (!page) return {}
  const seo = page.seo
  const og = typeof seo?.ogImage === 'object' ? (seo.ogImage as Media | null) : null
  return {
    title: seo?.metaTitle || page.title,
    description: seo?.metaDescription ?? undefined,
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
    openGraph: og?.url ? { images: [{ url: og.url as string }] } : undefined,
    ...canonical(`/${slug}`),
  }
}

export default async function DynamicPage({ params }: Args) {
  const { slug } = await params
  const page = await loadPage(slug)
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout ?? []} />
}
