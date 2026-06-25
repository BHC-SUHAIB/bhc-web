import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCachedPageBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'

// Apex-domain canonical for the home page. Together with the Caddy www->apex
// 308 redirect, this gives Google exactly one URL to index per Search Console
// 2026-05-05 audit.
export const metadata: Metadata = canonical('/')

// Routes stay dynamic so the Docker build doesn't try to prerender
// Payload-backed pages (PAYLOAD_SECRET / DATABASE_URI are runtime-only).
// The heavy DB reads themselves are cached via unstable_cache in
// src/lib/payload-cache.ts so repeat requests within 60s skip Payload.
//
// The LocalBusiness JSON-LD that used to live here is now injected sitewide
// from the frontend layout (built in src/lib/schema.ts), with areaServed set
// to the Houston metro instead of the old "Worldwide".
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const page = await getCachedPageBySlug('home')
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout ?? []} pageSlug="home" />
}
