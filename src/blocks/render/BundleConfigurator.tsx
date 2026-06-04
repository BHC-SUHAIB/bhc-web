'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Container } from '@/components/Container'

// Interactive "build your package" configurator for the Express LP. Toggling
// add-ons recomputes the one-time total, monthly add, and savings live, and the
// current selection is reported up via onSummaryChange so the lead form below
// can submit it (so Suhaib is notified which bundle a visitor chose). The CTA
// scrolls to that form rather than navigating away.
type Opt = {
  id: string
  name: string
  desc: string
  once?: number
  monthly?: number
  save?: number
  cost: string
  required?: boolean
}

const OPTIONS: Opt[] = [
  { id: 'starter', name: 'Starter Site', desc: '5-page site, 14-day delivery. The foundation.', once: 999, cost: '$999', required: true },
  { id: 'care', name: 'Care plan', desc: 'Hosting, backups, monitoring, 1hr/mo edits. Drops to $99/mo for 12 months.', monthly: 99, save: 600, cost: '$99/mo' },
  { id: 'seo', name: 'Local SEO Sprint', desc: 'GBP optimization, 10 citations, schema, 1 cornerstone page.', once: 900, save: 295, cost: '+$900' },
  { id: 'brand', name: 'Brand mini system', desc: "Logo cleanup, color + type system, if you don't have one yet.", once: 300, cost: '+$300' },
]

const money = (n: number) => '$' + n.toLocaleString('en-US')

type Props = {
  onSummaryChange?: (summary: string) => void
  ctaTargetId?: string
}

export function BundleConfigurator({ onSummaryChange, ctaTargetId = 'lp-start' }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({ starter: true, care: true })

  const toggle = (o: Opt) => {
    if (o.required) return
    setSelected((s) => ({ ...s, [o.id]: !s[o.id] }))
  }

  const chosen = OPTIONS.filter((o) => o.required || selected[o.id])
  const oneTime = chosen.reduce((s, o) => s + (o.once ?? 0), 0)
  const monthly = chosen.reduce((s, o) => s + (o.monthly ?? 0), 0)
  const save = chosen.reduce((s, o) => s + (o.save ?? 0), 0)

  const summary = `${chosen.map((o) => o.name).join(' + ')} — ${money(oneTime)}${monthly > 0 ? ` + ${money(monthly)}/mo` : ''}${save > 0 ? ` (save ${money(save)})` : ''}`

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
            Build your package
          </span>
          <h2>Bundle the build with what comes after.</h2>
          <p className="lede">
            Most clients add a Care plan and a Local SEO Sprint within their first 90 days anyway.
            Bundling locks the discount in up front.
          </p>
        </div>

        <div className="bundle-config reveal-up reveal-d1">
          <div className="bundle-grid">
            <div className="bundle-opts">
              {OPTIONS.map((o) => {
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
              <div className="sum-save">{save > 0 ? `You save ${money(save)}` : ''}</div>
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
