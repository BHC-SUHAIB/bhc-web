import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Placeholder } from '@/components/Placeholder'
import { ArrowUpRight } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload'
import type { FeaturedProjectsBlock, Project, Media } from '@/payload-types'

export async function FeaturedProjects(b: FeaturedProjectsBlock) {
  const payload = await getPayloadClient()

  let projects: Project[] = []
  if (b.mode === 'manual' && Array.isArray(b.projects)) {
    projects = b.projects
      .map((p) => (typeof p === 'object' ? (p as Project) : null))
      .filter(Boolean) as Project[]
  } else {
    const res = await payload.find({
      collection: 'projects',
      where: { featured: { equals: true } },
      limit: b.limit ?? 3,
      sort: '-publishedAt',
    })
    projects = res.docs as Project[]
  }

  return (
    <section className="py-20 sm:py-24">
      <Container size="xl">
        <div className="flex items-end justify-between gap-6 mb-12 flex-wrap">
          <div className="max-w-2xl">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">
                {b.eyebrow}
              </p>
            ) : null}
            <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
              {b.headline}
            </h2>
            {b.description ? (
              <p className="mt-5 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
                {b.description}
              </p>
            ) : null}
          </div>
          {b.viewAllLabel && b.viewAllHref ? (
            <Button href={b.viewAllHref} variant="ghost" size="md" className="shrink-0">
              {b.viewAllLabel} &rarr;
            </Button>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
            return (
              <Link
                key={p.id}
                href={`/portfolio/${p.slug}`}
                className="group block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-fg-muted)] transition-colors"
              >
                <div className="relative aspect-[4/3] bg-[var(--color-bg)] overflow-hidden">
                  {hero?.url ? (
                    <Image
                      src={hero.url as string}
                      alt={(hero.alt as string) ?? p.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
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
                    <ArrowUpRight className="size-4 shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  {p.summary ? (
                    <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{p.summary}</p>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
