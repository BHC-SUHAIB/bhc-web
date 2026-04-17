import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import type { Page } from '@/payload-types'

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
