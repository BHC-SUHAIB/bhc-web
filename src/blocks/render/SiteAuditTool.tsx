'use client'

import { useState, type FormEvent } from 'react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import { pushEvent } from '@/lib/analytics'

// Instant PageSpeed Insights audit, on-LP. Visitor pastes their URL, hits run,
// and gets back the four Lighthouse scores (Performance / Accessibility / Best
// Practices / SEO) plus core web vitals. Designed as the new top-of-LP CTA
// replacing the prior email-back audit form: instant gratification + score
// transparency, then the natural upsell is "want me to fix these for $297?".
//
// Sentinel rendering: instantiated by RenderBlocks when a contactForm block's
// eyebrow exactly equals "PageSpeed audit" (avoids adding a new Payload block
// type + schema migration just for this experiment).

type Strategy = 'mobile' | 'desktop'
type State = 'idle' | 'running' | 'success' | 'error'
type Scores = { performance: number; accessibility: number; bestPractices: number; seo: number }
type Vitals = { lcp: string | null; cls: string | null; speedIndex: string | null }

const SCORE_LABELS: Array<{ key: keyof Scores; label: string }> = [
  { key: 'performance', label: 'Performance' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'bestPractices', label: 'Best practices' },
  { key: 'seo', label: 'SEO' },
]

// Warm Mono score colours: green >=90, brass 50-89, red <50.
// `.s-*` colour the numeric label (text), `.s-*-stroke` colour the SVG gauge.
function scoreClass(score: number): string {
  if (score >= 90) return 's-good'
  if (score >= 50) return 's-mid'
  return 's-bad'
}

function strokeClass(score: number): string {
  if (score >= 90) return 's-good-stroke'
  if (score >= 50) return 's-mid-stroke'
  return 's-bad-stroke'
}

// Ring gauge geometry. The .ring box is 96x96; the SVG is rotated -90deg in
// CSS so the arc starts at 12 o'clock. r=42 leaves room for the 8px stroke.
// dasharray = visible arc (score%) + the full remainder, so the stroke fills
// proportionally to the numeric score.
const RING_R = 42
const RING_C = 2 * Math.PI * RING_R

type Props = {
  eyebrow?: string | null
  headline?: string | null
  description?: string | null
}

// Stable id so hero CTAs (#audit) and tier-card CTAs continue to deep-link
// to this section across the site. The eyebrow text is display-only.
const SECTION_ID = 'audit'

export function SiteAuditTool({ eyebrow, headline, description }: Props) {
  const [state, setState] = useState<State>('idle')
  const [url, setUrl] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('mobile')
  const [scores, setScores] = useState<Scores | null>(null)
  const [vitals, setVitals] = useState<Vitals | null>(null)
  const [auditedUrl, setAuditedUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (state === 'running') return
    setState('running')
    setErrorMessage(null)
    setScores(null)
    setVitals(null)
    pushEvent('pagespeed_audit_started', {
      source_page: typeof window !== 'undefined' ? window.location.pathname : '',
      strategy,
    })

    try {
      const res = await fetch('/api/pagespeed-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, strategy }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok) {
        throw new Error(body?.message ?? `Audit failed (${res.status})`)
      }
      setScores(body.scores)
      setVitals(body.vitals)
      setAuditedUrl(body.url)
      setState('success')
      pushEvent('pagespeed_audit_completed', {
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        url: body.url,
        strategy: body.strategy,
        performance: body.scores.performance,
        accessibility: body.scores.accessibility,
        best_practices: body.scores.bestPractices,
        seo: body.scores.seo,
      })
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  function reset() {
    setState('idle')
    setScores(null)
    setVitals(null)
    setAuditedUrl(null)
    setErrorMessage(null)
  }

  return (
    <section id={SECTION_ID} className="py-12 sm:py-16 scroll-mt-24">
      <Container size="md">
        <div className="section-head mb-8 max-w-2xl">
          {eyebrow ? (
            <span className="eyebrow eyebrow-row mb-3"><span className="rule" />{eyebrow}</span>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {headline ?? 'Run a free PageSpeed audit.'}
          </h2>
          {description ? (
            <p className="lede mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">{description}</p>
          ) : null}
        </div>

        {state === 'success' && scores ? (
          <div className="audit">
            <p className="eyebrow font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-1.5">
              {strategy} · {auditedUrl}
            </p>
            <h3 className="font-serif text-[1.4rem]">Your scores</h3>
            <div className="score-grid">
              {SCORE_LABELS.map(({ key, label }) => {
                const value = scores[key]
                return (
                  <div key={key} className="score">
                    <div className="ring">
                      <svg viewBox="0 0 96 96" aria-hidden>
                        <circle
                          cx="48"
                          cy="48"
                          r={RING_R}
                          fill="none"
                          stroke="var(--color-border)"
                          strokeWidth="8"
                        />
                        <circle
                          className={strokeClass(value)}
                          cx="48"
                          cy="48"
                          r={RING_R}
                          fill="none"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(value / 100) * RING_C} ${RING_C}`}
                        />
                      </svg>
                      <span className={cn('num', scoreClass(value))}>{value}</span>
                    </div>
                    <div className="s-k">{label}</div>
                  </div>
                )
              })}
            </div>
            {vitals && (vitals.lcp || vitals.cls || vitals.speedIndex) ? (
              <div className="border-t border-[var(--color-border)] pt-5 mb-2">
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">Core Web Vitals</p>
                <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
                  {vitals.lcp ? (<><dt className="text-[var(--color-fg-muted)]">LCP:</dt><dd className="font-mono">{vitals.lcp}</dd></>) : null}
                  {vitals.cls ? (<><dt className="text-[var(--color-fg-muted)]">CLS:</dt><dd className="font-mono">{vitals.cls}</dd></>) : null}
                  {vitals.speedIndex ? (<><dt className="text-[var(--color-fg-muted)]">Speed Index:</dt><dd className="font-mono">{vitals.speedIndex}</dd></>) : null}
                </dl>
              </div>
            ) : null}
            <div className="audit-upsell">
              <p>
                Want me to fix the weak ones? The $297 Site Health Sprint covers three specific fixes shipped in five days, with a before-and-after report.
              </p>
              <div className="cta-row mt-0">
                <Button href="#book" variant="brass" size="md">
                  Start a $297 Sprint
                </Button>
                <Button type="button" variant="secondary" size="md" onClick={reset}>
                  Run another audit
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="audit">
            <form onSubmit={handleSubmit} className="audit-form">
              {errorMessage ? (
                <div role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                  {errorMessage}
                </div>
              ) : null}
              <div className="audit-input-row">
                {/* type="text" (not "url") so visitors can type a bare domain
                    like "godaddy.com" without the browser blocking submit with
                    a protocol-validation error. The API route normalises the
                    raw value (prepends https:// when no scheme is present)
                    before calling PSI, so the server is the single source of
                    truth for URL shape. */}
                <input
                  type="text"
                  required
                  inputMode="url"
                  autoComplete="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="yoursite.com"
                  aria-label="Your website URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={state === 'running'}
                  className="field"
                />
                <Button type="submit" variant="brass" size="lg" disabled={state === 'running' || !url.trim()}>
                  {state === 'running' ? (
                    <>
                      <span className="audit-spinner" aria-hidden />
                      Auditing…
                    </>
                  ) : (
                    'Run audit'
                  )}
                </Button>
              </div>
              <div className="strategy-row">
                <span>Strategy:</span>
                <span className="seg">
                  {(['mobile', 'desktop'] as Strategy[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStrategy(s)}
                      disabled={state === 'running'}
                      aria-pressed={strategy === s}
                    >
                      {s}
                    </button>
                  ))}
                </span>
              </div>
              {state === 'running' ? (
                <p className="audit-note italic">
                  Auditing… this can take 20-60 seconds. Google PageSpeed is loading your site, taking screenshots, and running the same Lighthouse checks I use on every project.
                </p>
              ) : (
                <p className="audit-note">
                  Free. No email required. Powered by Google PageSpeed Insights. About 30 seconds.
                </p>
              )}
            </form>
          </div>
        )}
      </Container>
    </section>
  )
}
