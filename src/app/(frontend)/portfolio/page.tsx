import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Placeholder } from '@/components/Placeholder'
import { getCachedProjectsList } from '@/lib/payload-cache'
import { ArrowUpRight } from 'lucide-react'
import type { Project, Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Selected case studies from Black Hart Consulting.',
}

export default async function PortfolioPage() {
  const projects = await getCachedProjectsList()

  return (
    <div className="pb-20">
      <Container size="xl" className="py-20 sm:py-28">
        <div className="max-w-3xl mb-16">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
            Portfolio
          </p>
          <h1 className="font-serif font-semibold text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em]">
            Selected work.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
            A look at recent projects — the problem each client brought us, what we
            built, the stack we chose, and what actually changed for them.
          </p>
        </div>

        {projects.length === 0 ? (
          <p className="text-[var(--color-fg-muted)]">No projects published yet.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {projects.map((p) => {
              const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
              return (
                <li key={p.id}>
                  <Link
                    href={`/portfolio/${p.slug}`}
                    className="group block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-fg-muted)] transition-colors h-full"
                  >
                    <div className="relative aspect-[16/10] bg-[var(--color-bg)] overflow-hidden">
                      {hero?.url ? (
                        <Image
                          src={hero.url as string}
                          alt={(hero.alt as string) ?? p.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          sizes="(min-width:768px) 50vw, 100vw"
                        />
                      ) : (
                        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.02]">
                          <Placeholder seed={p.slug ?? p.title} label={p.client ?? p.title} sublabel={p.projectType ?? undefined} aspect="wide" />
                        </div>
                      )}
                    </div>
                    <div className="p-7">
                      <div className="flex items-center gap-3 mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-fg-muted)]">
                        {p.client ? <span>{p.client}</span> : null}
                        {p.year ? <span>&middot;</span> : null}
                        {p.year ? <span>{p.year}</span> : null}
                      </div>
                      <h2 className="font-serif font-semibold text-[22px] leading-[1.2] mb-2 group-hover:text-[var(--color-brass)] transition-colors flex items-start justify-between gap-4">
                        <span>{p.title}</span>
                        <ArrowUpRight className="size-4 shrink-0 mt-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </h2>
                      {p.summary ? (
                        <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{p.summary}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </div>
  )
}
