import { notFound } from 'next/navigation'
import { getCachedPageBySlug } from '@/lib/payload-cache'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'

// Routes stay dynamic so the Docker build doesn't try to prerender
// Payload-backed pages (PAYLOAD_SECRET / DATABASE_URI are runtime-only).
// The heavy DB reads themselves are cached via unstable_cache in
// src/lib/payload-cache.ts — repeat requests within 60s skip Payload.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const page = await getCachedPageBySlug('home')
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout ?? []} />
}
