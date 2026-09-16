// Server-rendered chart primitives for the research report pages.
// Single-hue marks (brass) with direct value labels: the report compares
// magnitudes within one series, so no categorical palette is needed and the
// values stay readable regardless of color vision or print.

type BarRow = { label: string; value: number; n?: number; note?: string }

const fmtPct = (v: number) => `${v.toFixed(v % 1 === 0 ? 0 : 1)}%`

export function BarList({
  rows,
  max = 100,
  unit = '%',
  caption,
}: {
  rows: BarRow[]
  max?: number
  unit?: '%' | ''
  caption?: string
}) {
  return (
    <figure className="report-figure">
      <ol className="report-bars" role="list">
        {rows.map((r) => {
          const w = Math.max(1.5, Math.min(100, (r.value / max) * 100))
          const shown = unit === '%' ? fmtPct(r.value) : String(r.value)
          const title = `${r.label}: ${shown}${r.n ? ` (n=${r.n})` : ''}`
          return (
            <li key={r.label} className="report-bar-row" title={title}>
              <span className="report-bar-label">
                {r.label}
                {r.n ? <span className="report-bar-n"> n={r.n}</span> : null}
              </span>
              <span className="report-bar-track" aria-hidden>
                <span className="report-bar-fill" style={{ width: `${w}%` }} />
              </span>
              <span className="report-bar-value">{shown}</span>
            </li>
          )
        })}
      </ol>
      {caption ? <figcaption className="report-caption">{caption}</figcaption> : null}
    </figure>
  )
}

/** Part-to-whole: one filled brass segment, the remainder outlined. */
export function ShareBar({
  value,
  label,
  rest,
  caption,
}: {
  value: number
  label: string
  rest: string
  caption?: string
}) {
  const w = Math.max(1.5, Math.min(100, value))
  return (
    <figure className="report-figure">
      <div className="report-share" role="img" aria-label={`${label}: ${fmtPct(value)}. ${rest}: ${fmtPct(100 - value)}.`}>
        <span className="report-share-fill" style={{ width: `${w}%` }}>
          <span className="report-share-text">{fmtPct(value)} {label}</span>
        </span>
        <span className="report-share-rest">
          <span className="report-share-text muted">{fmtPct(100 - value)} {rest}</span>
        </span>
      </div>
      {caption ? <figcaption className="report-caption">{caption}</figcaption> : null}
    </figure>
  )
}

/** Column histogram for score buckets. */
export function Histogram({
  bins,
  total,
  caption,
  threshold,
}: {
  bins: Array<{ label: string; count: number }>
  total: number
  caption?: string
  /** Index at which the "good" region starts (bins to the left are shaded as poor). */
  threshold?: number
}) {
  const max = Math.max(...bins.map((b) => b.count))
  return (
    <figure className="report-figure">
      <div className="report-hist" role="list">
        {bins.map((b, i) => {
          const h = Math.max(2, (b.count / max) * 100)
          const pct = (b.count / total) * 100
          const poor = threshold !== undefined && i < threshold
          return (
            <div key={b.label} className="report-hist-col" role="listitem" title={`${b.label}: ${b.count} sites (${fmtPct(pct)})`}>
              <span className="report-hist-count">{b.count}</span>
              <span className={`report-hist-bar${poor ? ' poor' : ''}`} style={{ height: `${h}%` }} aria-hidden />
              <span className="report-hist-label">{b.label}</span>
            </div>
          )
        })}
      </div>
      {caption ? <figcaption className="report-caption">{caption}</figcaption> : null}
    </figure>
  )
}

export function StatTile({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="report-stat">
      <span className="report-stat-value">{value}</span>
      <span className="report-stat-label">{label}</span>
      {sub ? <span className="report-stat-sub">{sub}</span> : null}
    </div>
  )
}
