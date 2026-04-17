import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import type { Page, Media } from '@/payload-types'

export const revalidate = 60

type Args = { params: Promise<{ slug: string }> }

async function loadPage(slug: string): Promise<Page | null> {
  if (slug === 'home') return null
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return (res.docs[0] as Page | undefined) ?? null
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
  }
}

export default async function DynamicPage({ params }: Args) {
  const { slug } = await params
  const page = await loadPage(slug)
  if (!page) notFound()
  return <RenderBlocks blocks={page.layout ?? []} />
}
