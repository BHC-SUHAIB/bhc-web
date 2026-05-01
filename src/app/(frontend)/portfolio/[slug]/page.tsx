import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Placeholder } from '@/components/Placeholder'
import { RichTextRenderer } from '@/blocks/render/RichTextRenderer'
import { getCachedProjectBySlug } from '@/lib/payload-cache'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { Project, Media } from '@/payload-types'

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
  }
}

export default async function ProjectPage({ params }: Args) {
  const { slug } = await params
  const p = await loadProject(slug)
  if (!p) notFound()

  const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null

  return (
    <article className="pb-24">
      {/* Back link */}
      <Container size="xl" className="pt-10">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--color-fg-muted)] hover:text-[var(--color-brass)] transition-colors"
        >
          <ArrowLeft className="size-3.5" /> All projects
        </Link>
      </Container>

      {/* Title section */}
      <Container size="lg" className="mt-10">
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
            {p.client ? <span>{p.client}</span> : null}
            {p.industry ? <span>{p.industry}</span> : null}
            {p.year ? <span>{p.year}</span> : null}
            {p.projectType ? <span>{p.projectType}</span> : null}
          </div>
          <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em]">
            {p.title}
          </h1>
          {p.summary ? (
            <p className="mt-6 text-[clamp(1.1rem,1.4vw,1.35rem)] leading-[1.5] text-[var(--color-fg-muted)] max-w-2xl">
              {p.summary}
            </p>
          ) : null}
        </div>
      </Container>

      {/* Hero image */}
      <Container size="xl">
        <div className="relative aspect-[16/9] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] my-4">
          {hero?.url ? (
            <Image
              src={hero.url as string}
              alt={(hero.alt as string) ?? p.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <Placeholder seed={p.slug ?? p.title} label={p.client ?? p.title} sublabel={p.projectType ?? undefined} aspect="hero" />
          )}
        </div>
      </Container>

      {/* Meta sidebar + content */}
      <Container size="xl" className="mt-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_2.5fr]">
          {/* Sidebar */}
          <aside className="space-y-8 lg:sticky lg:top-24 self-start">
            {p.duration || p.teamSize ? (
              <div>
                <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">Engagement</h3>
                <dl className="space-y-1.5 text-[14px]">
                  {p.duration ? (<div className="flex justify-between gap-3"><dt className="text-[var(--color-fg-muted)]">Duration</dt><dd>{p.duration}</dd></div>) : null}
                  {p.teamSize ? (<div className="flex justify-between gap-3"><dt className="text-[var(--color-fg-muted)]">Team size</dt><dd>{p.teamSize}</dd></div>) : null}
                </dl>
              </div>
            ) : null}

            {p.stack && p.stack.length > 0 ? (
              <div>
                <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">Stack</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {p.stack.map((s, i) => (
                    <li key={i} className="px-2.5 py-1 text-[12px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                      {s.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {p.liveUrl ? (
              <Button href={p.liveUrl} variant="secondary" size="sm" openInNewTab>
                Visit live site <ArrowUpRight className="size-3.5" />
              </Button>
            ) : null}
          </aside>

          {/* Main content */}
          <div className="space-y-14 text-[17px] leading-[1.65]">
            {/* Metrics */}
            {p.metrics && p.metrics.length > 0 ? (
              <div className="grid gap-px bg-[var(--color-brass)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-brass)] grid-cols-2 md:grid-cols-4 shadow-[0_18px_40px_-22px_color-mix(in_srgb,var(--color-ink)_40%,transparent)]">
                {p.metrics.map((m, i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-bg)] p-6 transition-colors duration-150 ease-out hover:bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))]"
                  >
                    <div className="font-serif font-semibold text-[clamp(2rem,3.4vw,2.5rem)] tracking-[-0.025em] leading-none text-[var(--color-fg)]">{m.value}</div>
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)] leading-[1.4]">{m.label}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {p.challenge ? (
              <div>
                <h2 className="font-serif text-[26px] font-semibold tracking-[-0.02em] mb-4">The challenge</h2>
                <div className="prose-content"><RichTextRenderer content={p.challenge} /></div>
              </div>
            ) : null}

            {p.approach ? (
              <div>
                <h2 className="font-serif text-[26px] font-semibold tracking-[-0.02em] mb-4">Our approach</h2>
                <div className="prose-content"><RichTextRenderer content={p.approach} /></div>
              </div>
            ) : null}

            {p.outcome ? (
              <div>
                <h2 className="font-serif text-[26px] font-semibold tracking-[-0.02em] mb-4">Outcome</h2>
                <div className="prose-content"><RichTextRenderer content={p.outcome} /></div>
              </div>
            ) : null}

            {p.gallery && p.gallery.length > 0 ? (
              <div className="space-y-6">
                {p.gallery.map((g, i) => {
                  const img = typeof g.image === 'object' ? (g.image as Media | null) : null
                  return (
                    <figure
                      key={i}
                      className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-brass)] hover:shadow-[0_18px_40px_-22px_color-mix(in_srgb,var(--color-ink)_40%,transparent)]"
                    >
                      <div className="relative aspect-video bg-[var(--color-surface)] overflow-hidden">
                        {img?.url ? (
                          <Image src={img.url as string} alt={(img.alt as string) ?? ''} fill className="object-cover transition-transform duration-500 hover:scale-[1.02]" sizes="100vw" />
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
              <figure className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] p-8 sm:p-10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-7 text-[var(--color-brass)] mb-5" aria-hidden>
                  <path d="M7.2 18.7H3l4.2-9h2.4v9H7.2Zm9 0h-4.2l4.2-9h2.4v9h-2.4Z" />
                </svg>
                <blockquote className="font-serif text-[clamp(1.4rem,2.2vw,1.75rem)] italic leading-[1.4] text-[var(--color-fg)]">
                  &ldquo;{p.testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 pt-5 border-t border-[color-mix(in_srgb,var(--color-brass)_30%,transparent)] text-[14px] text-[var(--color-fg)]">
                  <div className="font-semibold">{p.testimonial.author}</div>
                  {p.testimonial.role ? (
                    <div className="text-[var(--color-fg-muted)]">{p.testimonial.role}</div>
                  ) : null}
                </figcaption>
              </figure>
            ) : null}
          </div>
        </div>
      </Container>

      {/* End-of-case CTA — drives conversions on every project page */}
      <Container size="lg" className="mt-16">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_12%,var(--color-bg))] p-8 sm:p-12 text-center">
          <h2 className="font-serif font-semibold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.15] tracking-[-0.02em] max-w-2xl mx-auto">
            Want a build like this for your business?
          </h2>
          <p className="mt-4 text-[16px] leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            Founding-client pricing — 30% off your first build for the next 5 paid clients in exchange for a published case study.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button href="/contact" variant="brass" size="lg">Start a project</Button>
            <Button href="/services" variant="ghost" size="lg">See all pricing</Button>
          </div>
        </div>
      </Container>

      <style>{`
        .prose-content p { margin: 0 0 1em; }
        .prose-content h3 { font-family: var(--font-serif); font-weight: 600; font-size: 1.2em; margin: 1.6em 0 0.4em; }
        .prose-content ul, .prose-content ol { margin: 0 0 1em; padding-left: 1.4em; }
        .prose-content li { margin: 0.3em 0; }
        .prose-content a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
    </article>
  )
}
