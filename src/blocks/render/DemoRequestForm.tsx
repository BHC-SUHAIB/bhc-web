'use client'

import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { pushEvent } from '@/lib/analytics'

// Free-demo-site request form. Submissions land in the same collection and
// email pipeline as the contact form, tagged formType: 'demo-request'.

export type DemoRequestFormProps = {
  eyebrow?: string | null
  headline?: string | null
  description?: string | null
  submitLabel?: string | null
  fineprint?: string | null
  successMessage?: string | null
}

type State = 'idle' | 'submitting' | 'success' | 'error'

export function DemoRequestForm(b: DemoRequestFormProps) {
  const [state, setState] = useState<State>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setErrorMessage(null)

    const form = ev.currentTarget
    const data = new FormData(form)
    const businessName = String(data.get('businessName') ?? '').trim()
    const listingUrl = String(data.get('listingUrl') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const phone = String(data.get('phone') ?? '').trim()
    const oneLiner = String(data.get('oneLiner') ?? '').trim()

    if (!businessName || !listingUrl || !email) {
      setState('error')
      setErrorMessage('Please fill in your business name, your listing or website link, and your email.')
      return
    }

    const payload: Record<string, string> = {
      formType: 'demo-request',
      name: businessName,
      company: businessName,
      email,
      listingUrl,
      projectType: 'website',
      message: [`Demo site request for ${businessName}.`, `Listing: ${listingUrl}`, oneLiner]
        .filter(Boolean)
        .join('\n'),
      honeypot: String(data.get('website') ?? ''),
      sourcePage: typeof window !== 'undefined' ? window.location.pathname : '',
    }
    if (phone) payload.phone = phone

    try {
      const res = await fetch('/api/contact-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let msg = `Submission failed (${res.status})`
        try {
          const body = await res.json()
          if (body?.errors?.[0]?.message) msg = body.errors[0].message
        } catch { /* noop */ }
        throw new Error(msg)
      }
      setState('success')
      pushEvent('generate_lead', {
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        project_type: 'website',
        source: 'demo_request',
        currency: 'USD',
      })
      form.reset()
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <section id="demo-request" className="py-12 sm:py-16 scroll-mt-24">
      <Container size="md">
        <div className="section-head mb-8 max-w-2xl">
          {b.eyebrow ? (
            <span className="eyebrow eyebrow-row mb-3"><span className="rule" />{b.eyebrow}</span>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="lede mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">{b.description}</p>
          ) : null}
        </div>

        {state === 'success' ? (
          <div className="form-success">
            <div className="check-ring">
              <Check aria-hidden strokeWidth={3} />
            </div>
            <p className="font-serif text-[22px] leading-[1.3] tracking-[-0.015em]">
              {b.successMessage ?? 'Request received. Your demo link lands in your inbox within 48 hours.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-fields" noValidate>
            {errorMessage ? (
              <div role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="frow two">
              <div>
                <label htmlFor="drf-business" className="flabel">Business name *</label>
                <input id="drf-business" name="businessName" type="text" required autoComplete="organization" className="field" placeholder="Your business" />
              </div>
              <div>
                <label htmlFor="drf-email" className="flabel">Email *</label>
                <input id="drf-email" name="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" />
              </div>
            </div>

            <div className="frow">
              <div>
                <label htmlFor="drf-listing" className="flabel">Google Business Profile link or current website *</label>
                <input id="drf-listing" name="listingUrl" type="url" required inputMode="url" className="field" placeholder="https://..." />
              </div>
            </div>

            <div className="frow two">
              <div>
                <label htmlFor="drf-phone" className="flabel">Phone (optional)</label>
                <input id="drf-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" className="field" placeholder="(555) 123-4567" />
              </div>
              <div>
                <label htmlFor="drf-oneliner" className="flabel">What do you do, in one sentence (optional)</label>
                <input id="drf-oneliner" name="oneLiner" type="text" maxLength={200} className="field" placeholder="e.g. Residential HVAC repair in the Heights" />
              </div>
            </div>

            {/* Honeypot: invisible to humans, filled by bots. */}
            <div aria-hidden className="hidden" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label htmlFor="drf-website">Website</label>
              <input id="drf-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2">
              <Button type="submit" variant="brass" size="lg" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Sending…' : (b.submitLabel ?? 'Send me my demo')}
              </Button>
              {b.fineprint ? (
                <p className="text-[12px] text-[var(--color-fg-muted)]">{b.fineprint}</p>
              ) : null}
            </div>
          </form>
        )}
      </Container>
    </section>
  )
}
