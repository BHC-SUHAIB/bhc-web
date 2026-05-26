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

function scoreClass(score: number): string {
  if (score >= 90) return 'text-emerald-500'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}

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

  const inputCls = 'w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-brass)] focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-0 transition-colors text-[15px]'

  return (
    <section id={SECTION_ID} className="py-12 sm:py-16 scroll-mt-24">
      <Container size="md">
        <div className="mb-8 max-w-2xl">
          {eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">{eyebrow}</p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {headline ?? 'Run a free PageSpeed audit.'}
          </h2>
          {description ? (
            <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">{description}</p>
          ) : null}
        </div>

        {state === 'success' && scores ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] p-6 sm:p-8">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-2">
              {strategy} · {auditedUrl}
            </p>
            <h3 className="font-serif font-semibold text-[24px] mb-6">Your scores</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {SCORE_LABELS.map(({ key, label }) => (
                <div key={key} className="text-center">
                  <div className={cn('font-serif font-semibold text-[clamp(2.75rem,6vw,3.5rem)] leading-none', scoreClass(scores[key]))}>
                    {scores[key]}
                  </div>
                  <div className="mt-2 font-mono text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-[var(--color-fg-muted)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            {vitals && (vitals.lcp || vitals.cls || vitals.speedIndex) ? (
              <div className="border-t border-[var(--color-border)] pt-5 mb-6">
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">Core Web Vitals</p>
                <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
                  {vitals.lcp ? (<><dt className="text-[var(--color-fg-muted)]">LCP:</dt><dd className="font-mono">{vitals.lcp}</dd></>) : null}
                  {vitals.cls ? (<><dt className="text-[var(--color-fg-muted)]">CLS:</dt><dd className="font-mono">{vitals.cls}</dd></>) : null}
                  {vitals.speedIndex ? (<><dt className="text-[var(--color-fg-muted)]">Speed Index:</dt><dd className="font-mono">{vitals.speedIndex}</dd></>) : null}
                </dl>
              </div>
            ) : null}
            <div className="border-t border-[var(--color-border)] pt-5">
              <p className="text-[15px] leading-[1.5] mb-4">
                Want me to fix the weak ones? The $297 Site Health Sprint covers three specific fixes shipped in five days, with a before-and-after report.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button href="#book" variant="primary" size="lg">
                  Start a $297 Sprint
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={reset}>
                  Run another audit
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            {errorMessage ? (
              <div role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="url"
                required
                placeholder="yoursite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={state === 'running'}
                className={inputCls}
              />
              <Button type="submit" variant="primary" size="lg" disabled={state === 'running' || !url.trim()}>
                {state === 'running' ? 'Auditing…' : 'Run audit'}
              </Button>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-[var(--color-fg-muted)]">
              <span>Strategy:</span>
              {(['mobile', 'desktop'] as Strategy[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrategy(s)}
                  disabled={state === 'running'}
                  className={cn(
                    'px-3 py-1 rounded-full border transition-colors capitalize',
                    strategy === s
                      ? 'border-[var(--color-brass)] text-[var(--color-fg)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))]'
                      : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)]',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            {state === 'running' ? (
              <p className="text-[13px] text-[var(--color-fg-muted)] italic">
                Auditing… this can take 20-60 seconds. Google PageSpeed is loading your site, taking screenshots, and running the same Lighthouse checks I use on every project.
              </p>
            ) : (
              <p className="text-[13px] text-[var(--color-fg-muted)]">
                Free. No email required. Powered by Google PageSpeed Insights. About 30 seconds.
              </p>
            )}
          </form>
        )}
      </Container>
    </section>
  )
}
