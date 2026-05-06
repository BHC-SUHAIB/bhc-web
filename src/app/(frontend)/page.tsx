import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCachedPageBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'

// Apex-domain canonical for the home page. Together with the Caddy www→apex
// 308 redirect, this gives Google exactly one URL to index per Search Console
// 2026-05-05 audit.
export const metadata: Metadata = canonical('/')

// Routes stay dynamic so the Docker build doesn't try to prerender
// Payload-backed pages (PAYLOAD_SECRET / DATABASE_URI are runtime-only).
// The heavy DB reads themselves are cached via unstable_cache in
// src/lib/payload-cache.ts — repeat requests within 60s skip Payload.
export const dynamic = 'force-dynamic'

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Black Hart Consulting',
  description: 'Custom websites, SEO, and managed hosting from a Houston-based digital studio.',
  url: 'https://blackhartconsulting.com',
  telephone: '+1-866-434-9777',
  email: 'hello@blackhartconsulting.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Houston',
    addressRegion: 'TX',
    addressCountry: 'US',
  },
  areaServed: 'Worldwide',
  priceRange: '$$',
}

export default async function HomePage() {
  const page = await getCachedPageBySlug('home')
  if (!page) notFound()
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <RenderBlocks blocks={page.layout ?? []} />
    </>
  )
}
