import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Placeholder } from '@/components/Placeholder'
import { ArrowUpRight } from 'lucide-react'
import { getCachedFeaturedProjects } from '@/lib/payload-cache'
import type { FeaturedProjectsBlock, Project, Media } from '@/payload-types'

export async function FeaturedProjects(b: FeaturedProjectsBlock) {
  let projects: Project[] = []
  if (b.mode === 'manual' && Array.isArray(b.projects)) {
    projects = b.projects
      .map((p) => (typeof p === 'object' ? (p as Project) : null))
      .filter(Boolean) as Project[]
  } else {
    projects = await getCachedFeaturedProjects(b.limit ?? 3)
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

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {projects.slice(0, 3).map((p) => {
              const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
              return (
                <div key={p.id} className="text-center">
                  <div className="relative aspect-[4/3] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden mb-4">
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
                  <h3 className="font-serif font-semibold text-[18px] leading-[1.2] text-[var(--color-fg)]">
                    {p.title}
                  </h3>
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, idx) => {
            const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
            const Inner = (
              <>
                <div className="relative aspect-[4/3] bg-[var(--color-bg)] overflow-hidden">
                  {hero?.url ? (
                    <Image
                      src={hero.url as string}
                      alt={(hero.alt as string) ?? p.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      // First card on the home/landing FeaturedProjects grid
                      // is a likely mobile LCP candidate (largest visible
                      // image after hero scroll). Lighthouse audit 2026-05-05.
                      priority={idx === 0}
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                    />
                  ) : (
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
                      <Placeholder seed={p.slug ?? p.title} label={p.client ?? p.title} sublabel={p.projectType ?? undefined} aspect="video" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {p.client ? (
                      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-fg-muted)]">
                        {p.client}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-serif font-semibold text-[20px] leading-[1.2] mb-2 group-hover:text-[var(--color-brass)] transition-colors flex items-start justify-between gap-3">
                    <span>{p.title}</span>
                    {linked ? <ArrowUpRight className="size-4 shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" /> : null}
                  </h3>
                  {p.summary ? (
                    <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{p.summary}</p>
                  ) : null}
                </div>
              </>
            )
            return linked ? (
              <Link
                key={p.id}
                href={`/portfolio/${p.slug}`}
                className="group block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-brass)] hover:shadow-[0_14px_30px_-18px_color-mix(in_srgb,var(--color-ink)_35%,transparent)]"
              >
                {Inner}
              </Link>
            ) : (
              <div key={p.id} className="group block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                {Inner}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
