import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Placeholder } from '@/components/Placeholder'
import { getCachedProjectsList } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbJsonLd } from '@/lib/schema'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Selected case studies from Black Hart Consulting.',
  ...canonical('/portfolio'),
}

// Up-and-to-the-right result glyph used on each card's result line. Matches the
// inline SVG in the Warm Mono reference markup (bhc-redesign/Portfolio.html).
function ResultArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  )
}

export default async function PortfolioPage() {
  const projects = await getCachedProjectsList()

  return (
    <div className="lp-pad-bottom">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Portfolio', path: '/portfolio' },
        ])}
      />
      {/* Full-bleed photo hero — Warm Mono `.hero-photo` treatment. The dark
          gradient that keeps the headline legible is baked into the CSS
          (`.hero-photo .hp-bg::after`), so no inline overlay is needed. */}
      <section className="hero-photo" aria-label="Portfolio intro">
        <div className="hp-bg">
          <Image
            src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            fetchPriority="high"
          />
        </div>
        <Container size="xl" className="hp-inner">
          <span className="eyebrow eyebrow-row">
            <span className="rule" />
            Portfolio
          </span>
          <h1>
            The work speaks <em>before we do.</em>
          </h1>
          <p className="lede">
            A look at recent projects — the problem each client brought us, what we
            built, the stack we chose, and what actually changed for them.
          </p>
          <div className="cta-row">
            <Button href="/express-website" variant="brass" size="lg">
              Run my free audit
            </Button>
            <Button href="/services#website-packages" variant="onPhotoGhost" size="lg">
              Get discounted pricing
            </Button>
          </div>
        </Container>
      </section>

      <section className="section-tight">
        <Container size="xl">
          {projects.length === 0 ? (
            <p className="text-[var(--color-fg-muted)]">No projects published yet.</p>
          ) : (
            <div className="work-grid">
              {projects.map((p, idx) => {
                const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
                // Surface the first metric (if any) as the card's result line.
                const result = p.metrics && p.metrics.length > 0 ? p.metrics[0] : null
                return (
                  <Link key={p.id} href={`/portfolio/${p.slug}`} className="work">
                    <div className="shot relative">
                      {hero?.url ? (
                        <Image
                          src={hero.url as string}
                          alt={(hero.alt as string) ?? p.title}
                          fill
                          sizes="(min-width:768px) 50vw, 100vw"
                          // First card is the mobile LCP candidate — without
                          // priority it loaded after JS, pushing LCP to 9.5s.
                          // Lighthouse audit 2026-05-05.
                          priority={idx === 0}
                          fetchPriority={idx === 0 ? 'high' : 'auto'}
                        />
                      ) : (
                        <Placeholder seed={p.slug ?? p.title} label={p.client ?? p.title} sublabel={p.projectType ?? undefined} aspect="wide" />
                      )}
                    </div>
                    <div className="meta">
                      {p.projectType || p.industry ? (
                        <div className="tags">
                          {p.projectType ? <span className="chip">{p.projectType}</span> : null}
                          {p.industry ? <span className="chip">{p.industry}</span> : null}
                        </div>
                      ) : null}
                      <h3>{p.title}</h3>
                      {p.summary ? <p>{p.summary}</p> : null}
                      {result ? (
                        <span className="result">
                          <ResultArrow />
                          {result.label ? `${result.value} ${result.label}` : result.value}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Container>
      </section>

      {/* End-of-index CTA band — drives the same conversion as the rest of the
          redesign. `.cta-band.emph` is the ink-on-band variant. */}
      <section className="section">
        <Container size="xl">
          <div className="cta-band emph">
            <span className="eyebrow" style={{ color: 'var(--color-brass)' }}>Your project next</span>
            <h2>Want results like these?</h2>
            <p>
              Start with a free audit of your current site, or kick off your project
              whenever you&apos;re ready.
            </p>
            <div className="cta-row">
              <Button href="/express-website" variant="brass" size="lg">Run my free audit</Button>
              <Button href="/contact#contact-form" variant="onPhotoGhost" size="lg">Start your project</Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}
