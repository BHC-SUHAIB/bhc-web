import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import type { Page } from '@/payload-types'

// Dynamic rendering. ISR (revalidate = N) is tempting, but Next tries to
// prerender at build time — which fails inside Docker since PAYLOAD_SECRET
// and DATABASE_URI are runtime-only. For a Payload-backed marketing site,
// staying dynamic is the pragmatic choice; Payload responses are fast
// enough (<300ms) and Caddy + Next's own fetch cache absorb repeat load.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
  })
  const page = res.docs[0] as Page | undefined
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout ?? []} />
}
