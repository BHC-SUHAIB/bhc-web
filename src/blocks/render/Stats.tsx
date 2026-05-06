import Image from 'next/image'
import { Container } from '@/components/Container'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import { cn } from '@/lib/utils'
import type { StatsBlock } from '@/payload-types'

export function Stats(b: StatsBlock) {
  const count = b.items?.length ?? 0
  const gridCols =
    count <= 1 ? 'grid-cols-1' :
    count === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    count === 3 ? 'grid-cols-1 sm:grid-cols-3' :
    'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
  // Faint background — image at 30% opacity over a translucent bg-color tint
  // (50% top → 65% bottom) so the photograph is visibly present but never
  // competes with the foreground stats. The overlay is a vertical gradient
  // so the top of the section gets a hint of texture and the bottom blends
  // into the next section.
  const hasBg = !!b.backgroundImageUrl
  return (
    <section className="relative isolate overflow-hidden py-10 sm:py-14">
      {hasBg ? (
        <>
          {/* Was a CSS `background-image` — bypassed next/image, shipped the
              raw 1920px Unsplash source on every viewport (~280KB on /about).
              Routed through next/image so mobile gets a 750w variant
              (~40KB). Lighthouse audit 2026-05-05. */}
          <div aria-hidden className="absolute inset-0 -z-20">
            <Image
              src={stripUnsplashFixedWidth(b.backgroundImageUrl as string)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1920px"
              className="object-cover opacity-30"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-bg) 50%, transparent) 0%, color-mix(in srgb, var(--color-bg) 65%, transparent) 100%)',
            }}
          />
        </>
      ) : null}
      <Container size="xl">
        {b.eyebrow || b.headline ? (
          <div className="max-w-2xl mb-10">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
                {b.eyebrow}
              </p>
            ) : null}
            {b.headline ? (
              <h2 className="font-serif font-semibold text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.15] tracking-[-0.015em]">
                {b.headline}
              </h2>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            'grid gap-px rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)]',
            // When the section has a faint background image we let it bleed
            // through the grid by making the cell separators transparent and
            // the cells themselves a translucent bg-color tint. Without bg,
            // we keep solid borders + cells for the original chunky look.
            hasBg
              ? 'gap-px bg-transparent'
              : 'gap-px bg-[var(--color-border)]',
            gridCols,
          )}
        >
          {b.items?.map((s, i) => (
            <div key={i} className={cn('p-7', hasBg ? 'bg-[color-mix(in_srgb,var(--color-bg)_75%,transparent)] backdrop-blur-sm border-r border-b border-[color-mix(in_srgb,var(--color-border)_50%,transparent)]' : 'bg-[var(--color-bg)]')}>
              <div className="font-serif font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.025em] leading-none">
                {s.value}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
                {s.label}
              </div>
              {s.description ? (
                <p className="mt-3 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">{s.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
