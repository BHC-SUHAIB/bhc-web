import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import type { Page } from '@/payload-types'

// ISR: cache the rendered home page for 60s, then revalidate in the
// background on the next request. Admin edits propagate within 60s —
// acceptable for a marketing site, and ~100x cheaper per request than
// force-dynamic (which re-queries Payload on every visit).
export const revalidate = 60

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
