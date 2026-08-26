import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Placeholder } from '@/components/Placeholder'
import { TrendingUp } from 'lucide-react'
import { getCachedFeaturedProjects } from '@/lib/payload-cache'
import type { FeaturedProjectsBlock, Project, Media } from '@/payload-types'

// Humanize the `projectType` select value for the .chip tags.
const PROJECT_TYPE_LABELS: Record<string, string> = {
  website: 'Website',
  webapp: 'Web app',
  mobile: 'Mobile app',
  seo: 'SEO',
  brand: 'Brand / design',
  infra: 'Hosting',
  other: 'Project',
}

export async function FeaturedProjects(b: FeaturedProjectsBlock) {
  let projects: Project[] = []
  if (b.mode === 'manual' && Array.isArray(b.projects)) {
    projects = b.projects
      .map((p) => (typeof p === 'object' ? (p as Project) : null))
      .filter(Boolean) as Project[]
  } else {
    projects = await getCachedFeaturedProjects(b.limit ?? 3)
    // Client work leads (1c): stable-sort `group: client` entries first so the
    // home block shows paid client sites before products/concepts.
    projects = [...projects].sort((a, b2) => {
      const rank = (p: Project) => (((p.group as string | null) ?? 'product') === 'client' ? 0 : 1)
      return rank(a) - rank(b2)
    })
  }

  // LP-friendly variant: no link wrappers, no summary text, no client label,
  // no view-all button. Just screenshots + project names centered. Used on
  // landing pages where we want to show proof without giving visitors a
  // navigation exit out of the conversion funnel.
  const linked = b.linked !== false
  const compact = !!b.compact

  if (compact) {
    return (
      <section className="py-12 sm:py-16">
        <Container size="xl">
          {b.eyebrow || b.headline ? (
            <div className="max-w-2xl mx-auto mb-10 text-center">
              {b.eyebrow ? (
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
                  {b.eyebrow}
                </p>
              ) : null}
              {b.headline ? (
                <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
                  {b.headline}
                </h2>
              ) : null}
              {b.description ? (
                <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
                  {b.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="work-grid max-w-5xl mx-auto">
            {projects.slice(0, 3).map((p) => {
              const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
              return (
                // Non-link card (no funnel exit on LPs). `.work` supplies the
                // framed shot + hover lift; the title sits in `.meta`, centered.
                <div key={p.id} className="work">
                  <div className="shot">
                    {hero?.url ? (
                      <Image
                        src={hero.url as string}
                        alt={(hero.alt as string) ?? p.title}
                        fill
                        className="object-cover"
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      />
                    ) : (
                      <Placeholder seed={p.slug ?? p.title} label={p.client ?? p.title} sublabel={p.projectType ?? undefined} aspect="video" />
                    )}
                  </div>
                  <div className="meta" style={{ textAlign: 'center' }}>
                    <h3>{p.title}</h3>
                  </div>
                </div>
              )
            })}
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="py-12 sm:py-16">
      <Container size="xl">
        <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
          <div className="max-w-2xl">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
                {b.eyebrow}
              </p>
            ) : null}
            <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
              {b.headline}
            </h2>
            {b.description ? (
              <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
                {b.description}
              </p>
            ) : null}
          </div>
          {b.viewAllLabel && b.viewAllHref && linked ? (
            <Button href={b.viewAllHref} variant="ghost" size="md" className="shrink-0">
              {b.viewAllLabel} &rarr;
            </Button>
          ) : null}
        </div>

        <div className="work-grid">
          {projects.map((p, idx) => {
            const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
            // .tags map from the project's industry + humanized projectType.
            const chips = [p.industry, p.projectType ? (PROJECT_TYPE_LABELS[p.projectType] ?? p.projectType) : null]
              .filter(Boolean) as string[]
            // .result maps from the first highlighted metric (value + label).
            const metric = Array.isArray(p.metrics)
              ? p.metrics.find((m) => m && (m.value || m.label))
              : null
            const result = metric
              ? [metric.value, metric.label].filter(Boolean).join(' ')
              : null
            const Inner = (
              <>
                <div className="shot">
                  {hero?.url ? (
                    <Image
                      src={hero.url as string}
                      alt={(hero.alt as string) ?? p.title}
                      fill
                      className="object-cover"
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      // First card on the home/landing FeaturedProjects grid
                      // is a likely mobile LCP candidate (largest visible
                      // image after hero scroll). Lighthouse audit 2026-05-05.
                      priority={idx === 0}
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                    />
                  ) : (
                    <Placeholder seed={p.slug ?? p.title} label={p.client ?? p.title} sublabel={p.projectType ?? undefined} aspect="video" />
                  )}
                </div>
                <div className="meta">
                  {chips.length ? (
                    <div className="tags">
                      {chips.map((c) => (
                        <span key={c} className="chip">{c}</span>
                      ))}
                    </div>
                  ) : null}
                  <h3>{p.title}</h3>
                  {p.summary ? <p>{p.summary}</p> : null}
                  {result ? (
                    <span className="result">
                      <TrendingUp width={14} height={14} aria-hidden />
                      {result}
                    </span>
                  ) : null}
                </div>
              </>
            )
            return linked ? (
              <Link key={p.id} href={`/portfolio/${p.slug}`} className="work">
                {Inner}
              </Link>
            ) : (
              <div key={p.id} className="work">
                {Inner}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
