import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCachedPageBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbJsonLd } from '@/lib/schema'
import type { Page, Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

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
  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.title, path: `/${slug}` },
        ])}
      />
      <RenderBlocks blocks={page.layout ?? []} pageSlug={slug} />
    </>
  )
}
