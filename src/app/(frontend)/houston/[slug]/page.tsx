import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { RenderBlocks } from '@/blocks/render/RenderBlocks'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbJsonLd } from '@/lib/schema'
import { canonical } from '@/lib/seo'
import {
  findLocalPage,
  localPageLayout,
  localPageMeta,
  localPageSchema,
  localPageSlug,
  localPageTitle,
  NEIGHBORHOODS,
  VERTICALS,
} from '@/lib/local-pages'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com'

type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const page = findLocalPage(slug)
  if (!page) return {}
  return {
    title: { absolute: localPageTitle(page) },
    description: localPageMeta(page),
    ...canonical(`/houston/${slug}`),
  }
}

export default async function LocalVerticalPage({ params }: Args) {
  const { slug } = await params
  const page = findLocalPage(slug)
  if (!page) notFound()
  const { vertical, neighborhood } = page

  const verticalSiblings = NEIGHBORHOODS.filter((n) => n.slug !== neighborhood.slug).map((n) => ({
    label: `${vertical.label} websites in ${n.title}`,
    href: `/houston/${localPageSlug(vertical, n)}`,
  }))
  const neighborhoodSiblings = VERTICALS.filter((v) => v.slug !== vertical.slug).map((v) => ({
    label: `${v.label} websites in ${neighborhood.title}`,
    href: `/houston/${localPageSlug(v, neighborhood)}`,
  }))

  return (
    <>
      <JsonLd data={localPageSchema(page, SITE_URL)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Houston', path: '/houston' },
          { name: `${vertical.label} websites in ${neighborhood.title}`, path: `/houston/${slug}` },
        ])}
      />
      <RenderBlocks blocks={localPageLayout(page)} pageSlug={`houston-${slug}`} />

      {/* Sibling links: same vertical across neighborhoods, and every other
          vertical in this neighborhood. Keeps the 42 pages one hop apart. */}
      <section className="py-12 sm:py-16 border-t border-[var(--color-border)]">
        <Container size="xl">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-serif font-semibold text-[20px] mb-4">
                {vertical.label} websites around Houston
              </h2>
              <ul className="space-y-2 text-[14.5px]">
                {verticalSiblings.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[var(--color-fg-muted)] hover:text-[var(--color-brass)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-serif font-semibold text-[20px] mb-4">
                More for {neighborhood.title} businesses
              </h2>
              <ul className="space-y-2 text-[14.5px]">
                {neighborhoodSiblings.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[var(--color-fg-muted)] hover:text-[var(--color-brass)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[14.5px]">
                <Link href="/houston" className="text-[var(--color-brass-text)] hover:text-[var(--color-brass)] transition-colors">
                  All Houston pages →
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
