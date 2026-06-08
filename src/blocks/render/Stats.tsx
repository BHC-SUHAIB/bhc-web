import Image from 'next/image'
import { Container } from '@/components/Container'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import type { StatsBlock } from '@/payload-types'

export function Stats(b: StatsBlock) {
  // Faint background — image at 30% opacity over a translucent bg-color tint
  // (50% top → 65% bottom) so the photograph is visibly present but never
  // competes with the foreground stats. The overlay is a vertical gradient
  // so the top of the section gets a hint of texture and the bottom blends
  // into the next section.
  const hasBg = !!b.backgroundImageUrl
  return (
    <section className="section relative isolate overflow-hidden">
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
          <div className="section-head">
            {b.eyebrow ? (
              <span className="eyebrow eyebrow-row">
                <span className="rule" />
                {b.eyebrow}
              </span>
            ) : null}
            {b.headline ? <h2>{b.headline}</h2> : null}
          </div>
        ) : null}

        <div className="stats-grid">
          {b.items?.map((s, i) => (
            <div key={i} className="stat">
              <div className="s-val">{s.value}</div>
              <div className="s-label">{s.label}</div>
              {s.description ? <div className="s-desc">{s.description}</div> : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
