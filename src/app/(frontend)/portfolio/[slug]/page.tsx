import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Placeholder } from '@/components/Placeholder'
import { RichTextRenderer } from '@/blocks/render/RichTextRenderer'
import { getCachedProjectBySlug } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { ArrowUpRight } from 'lucide-react'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug: string }> }

const loadProject = (slug: string) => getCachedProjectBySlug(slug)

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const p = await loadProject(slug)
  if (!p) return {}
  const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
  return {
    title: p.title,
    description: p.summary ?? undefined,
    openGraph: hero?.url ? { images: [{ url: hero.url as string }] } : undefined,
    ...canonical(`/portfolio/${slug}`),
  }
}

export default async function ProjectPage({ params }: Args) {
  const { slug } = await params
  const p = await loadProject(slug)
  if (!p) notFound()

  const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
  // Case-study label line: industry + project type, mirroring the eyebrow in
  // bhc-redesign/Case Study.html ("Case study · Professional services").
  const labelBits = [p.industry, p.projectType].filter(Boolean) as string[]

  return (
    <article className="lp-pad-bottom">
      {/* Hero: breadcrumb, eyebrow, title, lede, then the wide cover image. */}
      <section className="section-tight">
        <Container size="lg">
          <p style={{ fontSize: '0.84rem' }}>
            <Link href="/portfolio" style={{ color: 'var(--color-fg-muted)' }}>
              &larr; All projects
            </Link>
          </p>
          <div className="section-head" style={{ maxWidth: '60ch', marginTop: '1rem' }}>
            <span className="eyebrow eyebrow-row">
              <span className="rule" />
              Case study{labelBits.length ? ` · ${labelBits.join(' · ')}` : ''}
            </span>
            <h2 style={{ fontSize: 'var(--step-5)' }}>{p.title}</h2>
            {p.summary ? <p className="lede">{p.summary}</p> : null}
          </div>
        </Container>
      </section>

      {/* Cover image — `.cs-hero-img` (16/8, rounded). */}
      <Container size="lg">
        {hero?.url ? (
          // .cs-hero-img forces width:100% + aspect-ratio 16/8 + radius; the
          // width/height props are just intrinsic-ratio hints for next/image.
          <Image
            src={hero.url as string}
            alt={(hero.alt as string) ?? p.title}
            width={1600}
            height={800}
            className="cs-hero-img"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="cs-hero-img relative overflow-hidden">
            <Placeholder seed={p.slug ?? p.title} label={p.client ?? p.title} sublabel={p.projectType ?? undefined} aspect="hero" />
          </div>
        )}
      </Container>

      {/* Metrics band — `.cs-metrics` of `.stat` cells. CMS metrics carry
          value + label; the reference's optional `.s-desc` is omitted. */}
      {p.metrics && p.metrics.length > 0 ? (
        <section className="section-tight">
          <Container size="lg">
            <div className="cs-metrics">
              {p.metrics.map((m, i) => (
                <div className="stat" key={i}>
                  <div className="s-val">{m.value}</div>
                  <div className="s-label">{m.label}</div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* Body prose — `.cs-body` single editorial column. Challenge, approach
          (with inline `.cs-stack` tech chips), outcome, gallery, pull-quote. */}
      <section className="section-tight">
        <Container size="lg">
          <div className="cs-body">
            {p.challenge ? (
              <>
                <h2>The challenge</h2>
                <div className="prose-content"><RichTextRenderer content={p.challenge} /></div>
              </>
            ) : null}

            {p.approach ? (
              <>
                <h2>What we shipped</h2>
                <div className="prose-content"><RichTextRenderer content={p.approach} /></div>
              </>
            ) : null}

            {p.stack && p.stack.length > 0 ? (
              <div className="cs-stack">
                {p.stack.map((s, i) => (
                  <span className="chip" key={i}>{s.name}</span>
                ))}
              </div>
            ) : null}

            {p.outcome ? (
              <>
                <h2>The result</h2>
                <div className="prose-content"><RichTextRenderer content={p.outcome} /></div>
              </>
            ) : null}

            {p.gallery && p.gallery.length > 0 ? (
              <div className="space-y-6" style={{ marginTop: '2.4rem' }}>
                {p.gallery.map((g, i) => {
                  const img = typeof g.image === 'object' ? (g.image as Media | null) : null
                  return (
                    <figure
                      key={i}
                      className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)]"
                    >
                      <div className="relative aspect-video bg-[var(--color-surface)] overflow-hidden">
                        {img?.url ? (
                          <Image src={img.url as string} alt={(img.alt as string) ?? ''} fill className="object-cover" sizes="100vw" />
                        ) : (
                          <Placeholder seed={`${p.slug ?? p.title}-${i}`} label={`${p.title} — ${i + 1}`} aspect="video" />
                        )}
                      </div>
                      {g.caption ? (
                        <figcaption className="px-5 py-3 text-[13px] text-[var(--color-fg-muted)] border-t border-[var(--color-border)]">{g.caption}</figcaption>
                      ) : null}
                    </figure>
                  )
                })}
              </div>
            ) : null}

            {p.testimonial?.quote ? (
              <blockquote
                style={{
                  borderLeft: '3px solid var(--color-brass)',
                  paddingLeft: '1.4rem',
                  margin: '2rem 0',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.4rem',
                  lineHeight: 1.4,
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{p.testimonial.quote}&rdquo;
                {p.testimonial.author ? (
                  <span style={{ display: 'block', fontStyle: 'normal', fontSize: '0.95rem', marginTop: '0.7rem', color: 'var(--color-fg-muted)' }}>
                    {p.testimonial.author}
                    {p.testimonial.role ? ` · ${p.testimonial.role}` : ''}
                  </span>
                ) : null}
              </blockquote>
            ) : null}

            {/* Engagement facts + live-site link, kept from the CMS record. */}
            {p.client || p.year || p.duration || p.teamSize || p.liveUrl ? (
              <div
                className="hairline-top"
                style={{ marginTop: '2.4rem', paddingTop: '1.4rem', display: 'flex', flexWrap: 'wrap', gap: '1.4rem', alignItems: 'center' }}
              >
                <dl style={{ display: 'flex', flexWrap: 'wrap', gap: '1.4rem 2rem', flex: 1, margin: 0 }}>
                  {p.client ? <Fact label="Client" value={p.client} /> : null}
                  {p.year ? <Fact label="Year" value={String(p.year)} /> : null}
                  {p.duration ? <Fact label="Duration" value={p.duration} /> : null}
                  {p.teamSize ? <Fact label="Team size" value={p.teamSize} /> : null}
                </dl>
                {p.liveUrl ? (
                  <Button href={p.liveUrl} variant="secondary" size="sm" openInNewTab>
                    Visit live site <ArrowUpRight className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      {/* End-of-case CTA — drives conversions on every project page. */}
      <section className="section">
        <Container size="lg">
          <div className="cta-band emph">
            <h2>Your site could be the next one.</h2>
            <p>
              Discounted pricing — 30% off your first build for the next 5 paid clients
              in exchange for a published case study.
            </p>
            <div className="cta-row">
              <Button href="/contact#contact-form" variant="brass" size="lg">Start a project</Button>
              <Button href="/services#website-packages" variant="onPhotoGhost" size="lg">See all pricing</Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Prose styling for RichTextRenderer output (bare p/h3/ul/ol/li/a/blockquote
          with no classes). `.cs-body p` / `.cs-body h2` already style paragraphs
          and top-level headings; these rules fill the gaps for nested elements. */}
      <style>{`
        .cs-body .prose-content h3 { font-family: var(--font-serif); font-weight: 600; font-size: var(--step-1); margin-top: 1.8rem; margin-bottom: 0.4rem; letter-spacing: -0.01em; }
        .cs-body .prose-content ul, .cs-body .prose-content ol { margin-top: 1rem; padding-left: 1.4em; color: var(--color-fg-muted); }
        .cs-body .prose-content li { margin: 0.4em 0; line-height: 1.7; }
        .cs-body .prose-content blockquote { border-left: 3px solid var(--color-brass); padding-left: 1.2rem; margin: 1.6rem 0; font-style: italic; color: var(--color-fg); }
        .cs-body .prose-content a { color: var(--color-link); text-decoration: underline; text-underline-offset: 3px; }
        .cs-body .prose-content a:hover { color: var(--color-highlight); }
      `}</style>
    </article>
  )
}

// Small mono label/value pair for the engagement facts row.
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] tracking-[0.16em] uppercase text-[var(--color-fg-muted)]">{label}</dt>
      <dd className="text-[0.95rem] mt-1">{value}</dd>
    </div>
  )
}
