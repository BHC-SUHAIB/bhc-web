import Link from 'next/link'
import { ParallaxBackground } from '@/blocks/render/ParallaxBackground'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbJsonLd } from '@/lib/schema'
import { canonical } from '@/lib/seo'
import { localPageSlug, NEIGHBORHOODS, VERTICALS } from '@/lib/local-pages'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Houston Small Business Websites by Neighborhood | Black Hart Consulting' },
  description:
    'Websites for plumbers, HVAC, electricians, roofers, dentists, med spas, and auto repair shops across Houston: the Heights, Montrose, Garden Oaks, Spring Branch, Katy, and Cypress.',
  ...canonical('/houston'),
}

export default function HoustonHubPage() {
  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Houston', path: '/houston' },
        ])}
      />
      <section className="py-14 sm:py-20 relative isolate overflow-hidden">
        {/* Faded Buffalo Bayou + skyline backdrop; the next section carries no
            image so backgrounds alternate. */}
        <ParallaxBackground
          src="https://images.unsplash.com/photo-1625109998123-40f1cc978735?q=80"
          sizes="100vw"
          imgClassName="opacity-25"
          priority
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-bg) 55%, transparent) 0%, color-mix(in srgb, var(--color-bg) 92%, transparent) 100%)',
          }}
        />
        <Container size="xl">
          <span className="eyebrow eyebrow-row mb-4"><span className="rule" />Houston, by neighborhood</span>
          <h1 className="font-serif font-semibold text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.025em] max-w-3xl">
            Websites for the businesses that run Houston.
          </h1>
          <p className="mt-5 text-[17px] leading-[1.6] text-[var(--color-fg-muted)] max-w-2xl">
            Fixed-price sites built in days, a front desk that answers every call, and local search
            structure tuned to the neighborhood you actually serve. Pick your trade and your part of town.
          </p>
        </Container>
      </section>

      {VERTICALS.map((v) => (
        <section key={v.slug} className="py-8 border-t border-[var(--color-border)]">
          <Container size="xl">
            <h2 className="font-serif font-semibold text-[22px] mb-4">{v.plural}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-[14.5px]">
              {NEIGHBORHOODS.map((n) => (
                <li key={n.slug}>
                  <Link
                    href={`/houston/${localPageSlug(v, n)}`}
                    className="text-[var(--color-fg-muted)] hover:text-[var(--color-brass)] transition-colors"
                  >
                    {v.label} websites in {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ))}

      <section className="py-12 sm:py-16">
        <Container size="xl">
          <div className="cta-band emph">
            <h2>Not in one of these neighborhoods?</h2>
            <p>We build for service businesses across the Houston metro, and remote clients are welcome.</p>
            <div className="cta-row">
              <Link href="/free-demo-site" className="btn btn-brass btn-lg">See your site first</Link>
              <Link href="/services" className="btn btn-onphoto btn-lg">See services and pricing</Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
