'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CountUpStat } from '@/components/CountUpStat'
import { AM_LOOP_CSS, AM_LOOP_HTML } from '@/components/antlerLoopMarkup'
import { cn } from '@/lib/utils'
import { pushEvent } from '@/lib/analytics'

// Instant PageSpeed Insights audit, on-LP. Visitor pastes their URL, hits run,
// and gets back the four Lighthouse scores plus core web vitals.
//
// Theme-enrichment rework (2026-08): the result area starts collapsed and
// unfolds when the audit starts. While Google runs (10-60s) a browser-style
// frame shows the visitor's URL over a skeleton page with a looping brass
// scanline. When the response lands, the skeleton crossfades into the REAL
// screenshot of their site (returned by the PSI API) with one closing sweep,
// and the scores print line-by-line onto a dark mono "audit receipt".
//
// Sentinel rendering: instantiated by RenderBlocks when a contactForm block's
// eyebrow exactly equals "PageSpeed audit" (avoids adding a new Payload block
// type + schema migration just for this experiment).

type Strategy = 'mobile' | 'desktop'
type State = 'idle' | 'running' | 'success' | 'error'
type LeadState = 'idle' | 'sending' | 'sent' | 'error'
type Scores = { performance: number; accessibility: number; bestPractices: number; seo: number }
type Vitals = { lcp: string | null; cls: string | null; speedIndex: string | null }

// Score colour tiers (Google's own bands): green >=90, brass 50-89, red <50.
// `rs-*` are the receipt (dark band) variants defined in components.css.
function receiptClass(score: number): string {
  if (score >= 90) return 'rs-good'
  if (score >= 50) return 'rs-mid'
  return 'rs-bad'
}

type Props = {
  eyebrow?: string | null
  headline?: string | null
  description?: string | null
}

// Stable id so hero CTAs (#audit) and tier-card CTAs continue to deep-link
// to this section across the site. The eyebrow text is display-only.
const SECTION_ID = 'audit'

// Bare-domain display form for the browser-frame URL bar + receipt header.
function displayUrl(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
}

export function SiteAuditTool({ eyebrow, headline, description }: Props) {
  const [state, setState] = useState<State>('idle')
  const [url, setUrl] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('mobile')
  const [scores, setScores] = useState<Scores | null>(null)
  const [vitals, setVitals] = useState<Vitals | null>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [auditedUrl, setAuditedUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [leadState, setLeadState] = useState<LeadState>('idle')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadError, setLeadError] = useState<string | null>(null)
  // The URL as typed when the run started, so edits to the input while the
  // audit is in flight don't rewrite the frame's address bar.
  const runningUrl = useRef('')

  // Elapsed-seconds ticker for the scanning status chip.
  useEffect(() => {
    if (state !== 'running') return
    setElapsed(0)
    const int = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(int)
  }, [state])

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (state === 'running') return
    runningUrl.current = displayUrl(url)
    setState('running')
    setErrorMessage(null)
    setScores(null)
    setVitals(null)
    setScreenshot(null)
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
      setScreenshot(typeof body.screenshot === 'string' ? body.screenshot : null)
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

  // Optional lead capture shown WITH the scores: turns an anonymous audit run
  // into a real lead. Persists to the contact API first (so it reaches the
  // inbox + Slack and we can actually send the report), then fires the genuine
  // generate_lead conversion. The audited URL + scores ride along in the message
  // so the follow-up has full context.
  async function handleLead(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (leadState === 'sending') return
    const email = leadEmail.trim()
    if (!email) return
    setLeadState('sending')
    setLeadError(null)
    const sourcePage = typeof window !== 'undefined' ? window.location.pathname : ''
    const scoreLine = scores
      ? `Performance ${scores.performance}, Accessibility ${scores.accessibility}, Best Practices ${scores.bestPractices}, SEO ${scores.seo}`
      : 'scores unavailable'
    try {
      const res = await fetch('/api/contact-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Audit report request',
          email,
          message: `Requested the full PageSpeed report + fix list for ${auditedUrl ?? 'their site'} (${strategy} run). Lighthouse scores — ${scoreLine}.`,
          sourcePage,
        }),
      })
      if (!res.ok) {
        let msg = `Submission failed (${res.status})`
        try {
          const body = await res.json()
          if (body?.errors?.[0]?.message) msg = body.errors[0].message
        } catch {
          /* noop */
        }
        throw new Error(msg)
      }
      pushEvent('generate_lead', { source_page: sourcePage, source: 'audit_report', audited_url: auditedUrl ?? undefined })
      setLeadState('sent')
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setLeadState('error')
    }
  }

  function reset() {
    setState('idle')
    setScores(null)
    setVitals(null)
    setScreenshot(null)
    setAuditedUrl(null)
    setErrorMessage(null)
    setLeadState('idle')
    setLeadEmail('')
    setLeadError(null)
  }

  const frameUrl = state === 'success' && auditedUrl ? displayUrl(auditedUrl) : runningUrl.current
  const open = state === 'running' || state === 'success'

  return (
    <section id={SECTION_ID} className="py-12 sm:py-16 scroll-mt-[73px]">
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
            <p className="audit-note">
              Free. No email required. Powered by Google PageSpeed Insights. About 30 seconds.
            </p>
          </form>

          {/* Result area: collapsed until a run starts, then unfolds open.
              Left = browser frame (skeleton while scanning, then the real PSI
              screenshot). Right = the audit receipt. */}
          <div className={cn('audit-reveal', open && 'open')} aria-live="polite">
            <div className="audit-reveal-clip">
              <div className="audit-result-grid">
                <div className={cn('audit-frame', state === 'running' && 'scanning', state === 'success' && 'landed')}>
                  <div className="af-bar">
                    <span className="af-dots" aria-hidden><span /><span /><span /></span>
                    <span className="af-url">{frameUrl || 'yoursite.com'}</span>
                  </div>
                  <div className="af-view">
                    {/* Skeleton sits under the screenshot; the screenshot
                        fades in over it when the audit lands. */}
                    {state !== 'success' || !screenshot ? (
                      <div className="af-skel" aria-hidden>
                        <span className="s1" /><span className="s2" /><span className="s3" /><span className="s4" /><span className="s5" />
                      </div>
                    ) : null}
                    {screenshot ? (
                      /* PSI returns the screenshot as a base64 data URI, so a
                         plain <img> is correct here (next/image can't optimise
                         data: sources, and the bytes are already local). */
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={screenshot} alt={`Screenshot of ${frameUrl}`} className={cn(state === 'success' && 'show')} />
                    ) : null}
                    <span className="af-beam" aria-hidden />
                    {state === 'running' ? (
                      <span className="af-status">
                        RUNNING AUDIT<span className="t"> {elapsed}S</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {state === 'success' && scores ? (
                  <div className="rcpt print" key={auditedUrl ?? 'rcpt'}>
                    <p className="r-head">Lighthouse audit · {strategy}</p>
                    <p className="r-site">{frameUrl}</p>
                    <div className="r-line">
                      <span className="k">Accessibility</span>
                      <span className="leader" />
                      <span className={cn('v', receiptClass(scores.accessibility))}>
                        <CountUpStat value={scores.accessibility} durationMs={900} />
                      </span>
                    </div>
                    <div className="r-line">
                      <span className="k">Best Practices</span>
                      <span className="leader" />
                      <span className={cn('v', receiptClass(scores.bestPractices))}>
                        <CountUpStat value={scores.bestPractices} durationMs={900} />
                      </span>
                    </div>
                    <div className="r-line">
                      <span className="k">SEO</span>
                      <span className="leader" />
                      <span className={cn('v', receiptClass(scores.seo))}>
                        <CountUpStat value={scores.seo} durationMs={900} />
                      </span>
                    </div>
                    {vitals?.lcp ? (
                      <div className="r-line">
                        <span className="k">Largest paint</span>
                        <span className="leader" />
                        <span className="v">{vitals.lcp}</span>
                      </div>
                    ) : null}
                    <div className="r-total">
                      <span className="k">{strategy} performance</span>
                      <span className={cn('v', receiptClass(scores.performance))}>
                        <CountUpStat value={scores.performance} durationMs={1100} />
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rcpt">
                    <p className="r-head">Lighthouse audit · {strategy}</p>
                    <div className="r-wait">
                      {/* The antler mark breathing (Claude Design quiet-loop
                          variant): the brand's loading state. Static under
                          reduced motion. */}
                      <div className="am-wait" aria-hidden>
                        <style dangerouslySetInnerHTML={{ __html: AM_LOOP_CSS }} />
                        <div dangerouslySetInnerHTML={{ __html: AM_LOOP_HTML }} />
                      </div>
                      SCANNING {frameUrl ? frameUrl.toUpperCase() : ''}…
                      <br />
                      <span className="opacity-60">USUALLY 10 TO 30 SECONDS</span>
                    </div>
                  </div>
                )}
              </div>

              {state === 'success' && scores ? (
                <>
                  {vitals && (vitals.cls || vitals.speedIndex) ? (
                    <div className="border-t border-[var(--color-border)] pt-5 mt-6 mb-2">
                      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">Core Web Vitals</p>
                      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
                        {vitals.lcp ? (<><dt className="text-[var(--color-fg-muted)]">LCP:</dt><dd className="font-mono">{vitals.lcp}</dd></>) : null}
                        {vitals.cls ? (<><dt className="text-[var(--color-fg-muted)]">CLS:</dt><dd className="font-mono">{vitals.cls}</dd></>) : null}
                        {vitals.speedIndex ? (<><dt className="text-[var(--color-fg-muted)]">Speed Index:</dt><dd className="font-mono">{vitals.speedIndex}</dd></>) : null}
                      </dl>
                    </div>
                  ) : null}
                  <div className="audit-upsell">
                    {leadState === 'sent' ? (
                      <p>
                        <strong>Done.</strong> Check your inbox — we&rsquo;ll send the full report with a prioritized, plain-English fix list within one business day.
                      </p>
                    ) : (
                      <>
                        <p>Want the full breakdown? Get a prioritized fix list for your site emailed to you. Free, no obligation.</p>
                        {leadError ? (
                          <p role="alert" className="text-[13px] text-red-700 dark:text-red-300 mb-3">{leadError}</p>
                        ) : null}
                        <form onSubmit={handleLead} className="audit-input-row">
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            inputMode="email"
                            placeholder="you@yourbusiness.com"
                            aria-label="Your email"
                            value={leadEmail}
                            onChange={(e) => setLeadEmail(e.target.value)}
                            disabled={leadState === 'sending'}
                            className="field"
                          />
                          <Button type="submit" variant="brass" size="md" disabled={leadState === 'sending' || !leadEmail.trim()}>
                            {leadState === 'sending' ? 'Sending…' : 'Email me the report'}
                          </Button>
                        </form>
                      </>
                    )}
                  </div>

                  <div className="audit-upsell">
                    <p>
                      Want to see what a better site looks like? Send your business name and Google listing, and within 48 hours you get a working mockup built from your real services and reviews. Free, no obligation. Or pick three fixes from the menu: the $249 Site Health Sprint ships them in five days with a before-and-after report.
                    </p>
                    <div className="cta-row mt-0">
                      <Button href="/free-demo-site" variant="brass" size="md">
                        See your site first
                      </Button>
                      <Button href="/contact?tier=site-health-sprint#contact-form" variant="secondary" size="md">
                        Start a $249 Sprint
                      </Button>
                      <Button type="button" variant="ghost" size="md" onClick={reset}>
                        Run another audit
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
