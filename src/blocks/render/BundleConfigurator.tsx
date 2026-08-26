'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Container } from '@/components/Container'

// Interactive "build your package" configurator for the Express LP. Toggling
// add-ons recomputes the one-time total, monthly add, and savings live, and the
// current selection is reported up via onSummaryChange so the lead form below
// can submit it (so Suhaib is notified which bundle a visitor chose). The CTA
// scrolls to that form rather than navigating away.
//
// Options + copy are now CMS-driven (passed in from the bundleConfigurator
// block). The defaults below preserve the original hardcoded package so the
// code-composed fallback page keeps working unchanged.
export type Opt = {
  id: string
  name: string
  desc: string
  once?: number
  monthly?: number
  save?: number
  cost: string
  required?: boolean
  defaultOn?: boolean
}

export const DEFAULT_BUNDLE_OPTIONS: Opt[] = [
  { id: 'starter', name: 'Starter Site', desc: '5-page site, 7-day delivery. The foundation.', once: 699, cost: '$699', required: true },
  { id: 'host', name: 'Host plan', desc: 'Hosting, backups, monitoring, 30 min of edits a month. First month free.', monthly: 59, cost: '$59/mo', defaultOn: true },
  { id: 'seo', name: 'Local SEO + AI Search Sprint', desc: 'GBP setup, 10 citations, schema, FAQ page, llms.txt.', once: 449, cost: '+$449' },
  { id: 'front-desk', name: 'AI Front Desk setup', desc: 'Answers every call and books jobs. Plan from $149/mo billed separately.', once: 299, cost: '+$299' },
]

const money = (n: number) => '$' + n.toLocaleString('en-US')

type Props = {
  onSummaryChange?: (summary: string) => void
  ctaTargetId?: string
  options?: Opt[]
  eyebrow?: string
  headline?: string
  description?: string
}

export function BundleConfigurator({
  onSummaryChange,
  ctaTargetId = 'lp-start',
  options,
  eyebrow = 'Build your package',
  headline = 'Bundle the build with what comes after.',
  description = 'Most clients add a Care plan and a Local SEO Sprint within their first 90 days anyway. Bundling locks the discount in up front.',
}: Props) {
  const opts = useMemo<Opt[]>(
    () => (options && options.length > 0 ? options : DEFAULT_BUNDLE_OPTIONS),
    [options],
  )

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const o of opts) if (o.required || o.defaultOn) init[o.id] = true
    return init
  })

  const toggle = (o: Opt) => {
    if (o.required) return
    setSelected((s) => ({ ...s, [o.id]: !s[o.id] }))
  }

  const chosen = opts.filter((o) => o.required || selected[o.id])
  const oneTime = chosen.reduce((s, o) => s + (o.once ?? 0), 0)
  const monthly = chosen.reduce((s, o) => s + (o.monthly ?? 0), 0)
  const save = chosen.reduce((s, o) => s + (o.save ?? 0), 0)

  const summary = `${chosen.map((o) => o.name).join(' + ')} — ${money(oneTime)}${monthly > 0 ? ` + ${money(monthly)}/mo` : ''}`

  useEffect(() => {
    onSummaryChange?.(summary)
  }, [summary, onSummaryChange])

  const scrollToForm = () => {
    document.getElementById(ctaTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="section">
      <Container size="xl">
        <div className="section-head reveal-up">
          <span className="eyebrow eyebrow-row">
            <span className="rule" />
            {eyebrow}
          </span>
          <h2>{headline}</h2>
          {description ? <p className="lede">{description}</p> : null}
        </div>

        <div className="bundle-config reveal-up reveal-d1">
          <div className="bundle-grid">
            <div className="bundle-opts">
              {opts.map((o) => {
                const isSel = o.required || !!selected[o.id]
                const cls = ['opt', o.required ? 'required' : isSel ? 'sel' : ''].filter(Boolean).join(' ')
                return (
                  <div
                    key={o.id}
                    className={cls}
                    role={o.required ? undefined : 'button'}
                    tabIndex={o.required ? undefined : 0}
                    aria-pressed={o.required ? undefined : isSel}
                    onClick={() => toggle(o)}
                    onKeyDown={(e) => {
                      if (!o.required && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        toggle(o)
                      }
                    }}
                  >
                    <span className="check">
                      <Check aria-hidden />
                    </span>
                    <span className="o-body">
                      <b>{o.name}</b>
                      <p>{o.desc}</p>
                    </span>
                    {o.required ? <span className="o-incl">Included</span> : <span className="o-cost">{o.cost}</span>}
                  </div>
                )
              })}
            </div>

            <div className="bundle-summary">
              <h3>Your package</h3>
              <div>
                {chosen.map((o) => (
                  <div key={o.id} className="sum-line">
                    <span>{o.name}</span>
                    <span>{o.cost}</span>
                  </div>
                ))}
              </div>
              <div className="sum-total">
                <span className="lbl">Total today</span>
                <b>
                  {money(oneTime)}
                  {monthly > 0 ? <small> + {money(monthly)}/mo</small> : null}
                </b>
              </div>
              <button type="button" className="btn btn-brass btn-md" onClick={scrollToForm}>
                Continue with this package
                <span aria-hidden>↓</span>
              </button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
