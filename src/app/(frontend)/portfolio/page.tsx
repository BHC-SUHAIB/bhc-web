import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Placeholder } from '@/components/Placeholder'
import { getCachedProjectsList } from '@/lib/payload-cache'
import { canonical } from '@/lib/seo'
import { ArrowUpRight } from 'lucide-react'
import type { Project, Media } from '@/payload-types'

// HTML cached; revalidated by Projects afterChange hook on edit.
export const revalidate = 600

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Selected case studies from Black Hart Consulting.',
  ...canonical('/portfolio'),
}

export default async function PortfolioPage() {
  const projects = await getCachedProjectsList()

  return (
    <div className="pb-20">
      {/* Faint hero background — matches the pattern used on About / Services /
          Contact / LP heroes. Workspace photo with a heavy gradient overlay so
          the headline stays legible. */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20">
          {/* Strip Unsplash's hardcoded `w=1920` and let next/image generate
              responsive sizes. `unoptimized` removed 2026-05-05 rerun. */}
          <Image
            src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80"
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1920px"
            className="object-cover"
            priority
            fetchPriority="high"
          />
        </div>
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.55)_40%,rgba(0,0,0,0.92)_100%)]"
          aria-hidden
        />
        <Container size="xl">
          <div className="py-24 sm:py-32 md:py-40 max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/85 mb-5 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
              Portfolio
            </p>
            <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]">
              Selected work.
            </h1>
            <p className="mt-6 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.55] text-white max-w-2xl [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
              A look at recent projects — the problem each client brought us, what we
              built, the stack we chose, and what actually changed for them.
            </p>
          </div>
        </Container>
      </section>

      <Container size="xl" className="py-12 sm:py-16">
        {projects.length === 0 ? (
          <p className="text-[var(--color-fg-muted)]">No projects published yet.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {projects.map((p, idx) => {
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
                          // First card is the mobile LCP candidate — without
                          // priority it loaded after JS, pushing LCP to 9.5s.
                          // Lighthouse audit 2026-05-05.
                          priority={idx === 0}
                          fetchPriority={idx === 0 ? 'high' : 'auto'}
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
