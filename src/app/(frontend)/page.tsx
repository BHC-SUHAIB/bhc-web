import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCachedPageBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'

// Apex-domain canonical for the home page. Together with the Caddy www→apex
// 308 redirect, this gives Google exactly one URL to index per Search Console
// 2026-05-05 audit.
export const metadata: Metadata = canonical('/')

// HTML response cached for 10 minutes; Payload afterChange hooks fire
// revalidatePath('/') the moment a Page record changes (see
// src/collections/Pages.ts), so admin edits propagate to the public
// home page within milliseconds. The Docker build now provides
// DATABASE_URI / PAYLOAD_SECRET as build args + uses host network to
// reach Postgres (see docker-compose.yml's web.build config), letting
// this route prerender at build time.
export const revalidate = 600

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
