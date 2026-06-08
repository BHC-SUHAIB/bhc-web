import { Container } from '@/components/Container'
import { CountUpStat } from '@/components/CountUpStat'

// Stats grid whose numbers count up when scrolled into view. Renders the exact
// .stats-grid markup from app/components.css, now CMS-driven. Each item carries
// a numeric value plus optional prefix/suffix/decimals so "$0", "0.9s",
// "14 days", "140%" all animate correctly.

export type AnimatedStatsProps = {
  eyebrow?: string | null
  headline?: string | null
  items?: Array<{
    value?: number | null
    decimals?: number | null
    prefix?: string | null
    suffix?: string | null
    label?: string | null
    description?: string | null
    note?: string | null
  }> | null
}

export function AnimatedStats(b: AnimatedStatsProps) {
  const items = (b.items ?? []).filter((s) => s?.label)
  if (items.length === 0) return null

  return (
    <section className="section">
      <Container size="xl">
        {b.eyebrow || b.headline ? (
          <div className="section-head reveal-up">
            {b.eyebrow ? (
              <span className="eyebrow eyebrow-row">
                <span className="rule" />
                {b.eyebrow}
              </span>
            ) : null}
            {b.headline ? <h2>{b.headline}</h2> : null}
          </div>
        ) : null}
        <div className="stats-grid reveal-up reveal-d1">
          {items.map((s, i) => (
            <div key={i} className="stat">
              <div className="s-val">
                <CountUpStat
                  value={s.value ?? 0}
                  decimals={s.decimals ?? 0}
                  prefix={s.prefix ?? ''}
                  suffix={s.suffix ?? ''}
                />
              </div>
              <div className="s-label">{s.label}</div>
              {s.description || s.note ? (
                <div className="s-desc">
                  {s.description}
                  {s.note ? (
                    <>
                      {s.description ? ' ' : null}
                      <span className="placeholder-note">{s.note}</span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
