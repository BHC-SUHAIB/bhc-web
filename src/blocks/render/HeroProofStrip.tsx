import Link from 'next/link'
import Image from 'next/image'
import { getCachedFeaturedProjects } from '@/lib/payload-cache'
import type { Media, Project } from '@/payload-types'

// Three case-study thumbnails inside the /free-demo-site hero.
//
// Why (2026-10-01, Clarity Sep 21-27): 8 desktop ad landings, 11 clicks, zero
// on the hero form. 6 of the 11 were the "Work" nav link, and the one
// high-intent visitor spent three minutes on About + three case studies.
// Visitors want proof before they hand over an email, and the proof sat four
// sections down, so they left the page to find it. This puts it on the
// first screen, under the ask, linking straight to each case study.

export async function HeroProofStrip() {
  const pool = await getCachedFeaturedProjects(12)
  // Same ordering as FeaturedProjects: client work first, then concepts.
  const rank = (p: Project) => {
    const g = (p.group as string | null) ?? 'product'
    return g === 'client' ? 0 : g === 'concept' ? 1 : 2
  }
  const projects = [...pool]
    .filter((p) => p.slug)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 3)
  if (projects.length === 0) return null

  // Phones/tablets: a 3-up thumbnail row under the form. Large screens: a
  // stacked column to the right of the headline (Hero.tsx sets the grid).
  return (
    <div className="mt-8 sm:mt-10 max-w-xl lg:mt-0 lg:max-w-none">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/85 mb-3 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
        Sites we have shipped
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
        {projects.map((p) => {
          const hero = typeof p.heroImage === 'object' ? (p.heroImage as Media | null) : null
          return (
            <li key={p.id}>
              <Link
                href={`/portfolio/${p.slug}`}
                className="group block lg:flex lg:items-center rounded-[var(--radius-sm)] overflow-hidden border border-white/25 bg-black/40 backdrop-blur-sm transition-colors hover:border-[var(--color-brass)] focus-visible:outline-2 focus-visible:outline-[var(--color-brass)]"
              >
                <span className="relative block aspect-[16/10] lg:w-[120px] lg:shrink-0 bg-white/10">
                  {hero?.url ? (
                    <Image
                      src={hero.url as string}
                      alt=""
                      fill
                      className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                      sizes="(min-width:1024px) 120px, 33vw"
                    />
                  ) : null}
                </span>
                <span className="block min-w-0 px-2 py-1.5 lg:px-4 lg:py-2">
                  <span className="block text-[12px] sm:text-[13px] lg:text-[15px] leading-tight text-white truncate">
                    {p.title}
                  </span>
                  <span className="hidden lg:block mt-1 text-[12px] text-white/70 group-hover:text-[var(--color-brass)]">
                    See the case study &rarr;
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
