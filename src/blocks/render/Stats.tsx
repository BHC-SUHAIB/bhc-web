import { Container } from '@/components/Container'
import { ParallaxBackground } from './ParallaxBackground'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import { IconClock, IconGauge, IconWrench } from '@/components/BrandIcons'
import { CountUpStat } from '@/components/CountUpStat'
import type { StatsBlock } from '@/payload-types'

/* Values are CMS strings ("7 days", "90+", "Same-week"). When one leads with
   a number, split it so the number counts up on reveal and the remainder
   renders as a plain suffix. Pure-text values render unchanged. */
function StatValue({ value }: { value?: string | null }) {
  const m = (value ?? '').trim().match(/^(\d[\d,]*)(.*)$/)
  if (!m) return <>{value}</>
  const num = parseInt(m[1].replace(/,/g, ''), 10)
  if (Number.isNaN(num)) return <>{value}</>
  return <CountUpStat value={num} suffix={m[2]} />
}

// Custom brass icons for the homepage promises band ("Three things we
// promise": launch date / Lighthouse score / edit turnaround). Sentinel on
// the headline so other Stats instances render unchanged.
const PROMISE_ICONS = [IconClock, IconGauge, IconWrench]

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
          <ParallaxBackground
            src={stripUnsplashFixedWidth(b.backgroundImageUrl as string)}
            imgClassName="opacity-30"
            priority={false}
          />
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

        <div className="stats-grid" data-reveal-stagger>
          {b.items?.map((s, i) => {
            const Icon = /promise/i.test(b.headline ?? '') ? PROMISE_ICONS[i] : undefined
            return (
              <div key={i} className="stat">
                {Icon ? <Icon className="mb-4" /> : null}
                <div className="s-val"><StatValue value={s.value} /></div>
                <div className="s-label">{s.label}</div>
                {s.description ? <div className="s-desc">{s.description}</div> : null}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
