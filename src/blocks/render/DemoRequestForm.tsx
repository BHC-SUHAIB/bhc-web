'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { pushEvent } from '@/lib/analytics'
import { getAttribution } from '@/lib/attribution'
import { describeMissing, missingKeys, type MissingField } from '@/lib/form-validation'
import { pushLeadEvent, readJsonSafe } from '@/lib/lead-event'

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

  // When the form became interactive. Sent with the submission so the server
  // can record time-to-submit as a soft spam signal (never a hard reject).
  const startedAtRef = useRef(0)
  useEffect(() => { startedAtRef.current = Date.now() }, [])

  // The error banner renders above the fields. On a phone that is off-screen
  // from the submit button, so a validation error looked like a dead button
  // (the 2026-09-13 lost lead tapped "Send" three times). Scroll it into view.
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!errorMessage) return
    alertRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [errorMessage])

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
    const sourcePage = typeof window !== 'undefined' ? window.location.pathname : ''

    const missing: MissingField[] = []
    if (!businessName) missing.push({ key: 'businessName', label: 'your business name' })
    if (!email) missing.push({ key: 'email', label: 'your email' })
    if (missing.length) {
      setState('error')
      setErrorMessage(describeMissing(missing))
      pushEvent('form_validation_error', { form: 'demo_request', missing: missingKeys(missing), source_page: sourcePage })
      return
    }

    const payload: Record<string, unknown> = {
      formType: 'demo-request',
      name: businessName,
      company: businessName,
      email,
      listingUrl: listingUrl || undefined,
      projectType: 'website',
      // The listing link is optional (2026-09-13: requiring it is the likeliest
      // reason a paid visitor with no website yet gave up). A blank one is
      // called out in the message so the follow-up email asks for it.
      message: [
        `Demo site request for ${businessName}.`,
        listingUrl ? `Listing: ${listingUrl}` : 'Listing: none provided (no website or GBP link yet; ask in the reply).',
        oneLiner,
      ]
        .filter(Boolean)
        .join('\n'),
      // Bot trap. The hidden input below has a non-semantic name so browser
      // autofill never targets it; the server only FLAGS a filled value.
      honeypot: String(data.get('bhc_confirm_field') ?? ''),
      formStartedAt: startedAtRef.current,
      attribution: getAttribution(),
      sourcePage,
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
      const saved = await readJsonSafe(res)
      setState('success')
      // Conversion only for a clean submission; see lib/lead-event.ts.
      pushLeadEvent(saved, {
        source_page: sourcePage,
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
    <section id="demo-request" className="py-12 sm:py-16 scroll-mt-[73px]">
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
              <div ref={alertRef} role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
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
                <label htmlFor="drf-listing" className="flabel">Google Business Profile link or current website (optional, but it makes the demo better)</label>
                <input id="drf-listing" name="listingUrl" type="url" inputMode="url" className="field" placeholder="https://... or leave blank if you have neither yet" />
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

            {/* Honeypot. Invisible to people, filled by naive bots. Deliberately
                NOT named/labelled website/url/email/phone: iOS Safari ignores
                autocomplete="off" and will fill a field it recognises even when
                it is off-screen, which turns a real lead into "spam". A
                nonsense name plus autocomplete="one-time-code" (only ever
                filled from an SMS prompt the user taps) keeps autofill away. */}
            <div aria-hidden className="hidden" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              <input
                id="drf-bhc-confirm"
                name="bhc_confirm_field"
                type="text"
                tabIndex={-1}
                autoComplete="one-time-code"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
              />
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
