'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { Mail, Phone, MapPin, Clock, Check, Calendar } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { phoneHref, mailtoHref, BOOKING_URL } from '@/lib/contact'
import { SMS_DISCLAIMER_TEXT, SMS_CHECKBOX_LABEL } from '@/lib/sms-disclaimer'
import { pushEvent } from '@/lib/analytics'
import { getTier, type TierInfo } from '@/lib/tiers'
import type { ContactFormBlockBlock } from '@/payload-types'

type State = 'idle' | 'submitting' | 'success' | 'error'

type ContactFormProps = ContactFormBlockBlock & {
  contactEmail?: string | null
  contactPhone?: string | null
  /** Force the section anchor id (e.g. "contact-form") regardless of eyebrow. */
  anchorId?: string
  /** When set (Express LP bundle), shows a read-only "selected package" panel
   *  and appends the selection to the submitted message so Suhaib is notified. */
  bundleSummary?: string | null
}

// Derive a section id from the eyebrow so heroes can deep-link to a specific
// contact form on the same page (e.g. an audit form vs a generic inquiry form).
// Mirrors anchorFromEyebrow in Pricing.tsx so both blocks share the convention.
function anchorFromEyebrow(eyebrow?: string | null): string | undefined {
  if (!eyebrow) return undefined
  const slug = eyebrow.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!slug) return undefined
  return slug
}

export function ContactForm(b: ContactFormProps) {
  // ?tier= is read client-side (no Suspense/useSearchParams: the boundary can
  // wedge in dev, and the pre-selection is progressive enhancement anyway).
  const [tier, setTier] = useState<TierInfo | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTier(getTier(params.get('tier')))
  }, [])
  const contactEmail = b.contactEmail ?? ''
  const contactPhone = b.contactPhone ?? ''
  const emailHref = mailtoHref(contactEmail)
  const phoneHrefVal = phoneHref(contactPhone)
  const [state, setState] = useState<State>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [phoneValue, setPhoneValue] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setErrorMessage(null)

    const form = ev.currentTarget
    const data = new FormData(form)
    const payload: Record<string, string> = {
      name:      String(data.get('name') ?? '').trim(),
      email:     String(data.get('email') ?? '').trim(),
      message:   String(data.get('message') ?? '').trim(),
      honeypot:  String(data.get('website') ?? ''), // bot trap
      sourcePage: typeof window !== 'undefined' ? window.location.pathname : '',
    }
    // Carry the Express-LP bundle selection into the message so it lands in the
    // submission + Slack alert (no schema change needed).
    if (b.bundleSummary) {
      payload.message = `${payload.message}\n\nSelected package: ${b.bundleSummary}`.trim()
    }
    if (tier) {
      payload.message = `${payload.message}\n\nPicked from pricing: ${tier.label} (${tier.slug})`.trim()
    }
    const company = String(data.get('company') ?? '').trim()
    if (company) payload.company = company
    const projectType = String(data.get('projectType') ?? '').trim()
    if (projectType) payload.projectType = projectType
    const budgetRange = String(data.get('budgetRange') ?? '').trim()
    if (budgetRange) payload.budgetRange = budgetRange
    const phone = String(data.get('phone') ?? '').trim()
    if (phone) payload.phone = phone
    // Only record SMS consent if the submitter actually provided a phone
    // number AND ticked the box. Snapshot the exact disclaimer text they
    // saw so the audit record matches what was on-screen.
    if (phone && smsConsent) {
      payload.smsConsent = 'true'
      payload.smsConsentDisclaimerText = SMS_DISCLAIMER_TEXT
    }

    if (!payload.name || !payload.email || payload.message.length < 10) {
      setState('error')
      setErrorMessage('Please fill in your name, email, and at least a sentence.')
      return
    }
    if (smsConsent && !phone) {
      setState('error')
      setErrorMessage('Please add your phone number above, or uncheck the SMS opt-in.')
      return
    }

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
      // Primary Google Ads conversion. Uses GA4's recommended event name so
      // GTM can route it without a custom mapping. Project type / budget
      // are sent as event params so audience segmentation works downstream.
      pushEvent('generate_lead', {
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        project_type: payload.projectType || 'unspecified',
        budget_range: payload.budgetRange || 'unspecified',
        currency: 'USD',
      })
      form.reset()
      setPhoneValue('')
      setSmsConsent(false)
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const anchor = b.anchorId ?? anchorFromEyebrow(b.eyebrow)

  return (
    <section id={anchor} className="py-12 sm:py-16 scroll-mt-[73px]">
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

        <div className="form-grid">
          <div>
        {state === 'success' ? (
          <div className="form-success">
            <div className="check-ring">
              <Check aria-hidden strokeWidth={3} />
            </div>
            <p className="font-serif text-[22px] leading-[1.3] tracking-[-0.015em]">
              {b.successMessage ?? 'Thanks. We\u2019ll reply within one business day.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-fields" noValidate>
            {tier ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] px-4 py-3 text-[14px] text-[var(--color-fg)]">
                You picked {tier.label}. {tier.summary}
              </div>
            ) : null}
            {b.noCallNeeded ? (
              <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">
                No call needed. Write what you need and you will have a reply within one business day, usually within an hour.
              </p>
            ) : null}
            {b.bundleSummary ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] px-4 py-3">
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--color-brass-text)]">Your selected package</span>
                <div className="mt-1 text-[14px] text-[var(--color-fg)]">{b.bundleSummary}</div>
              </div>
            ) : null}
            {errorMessage ? (
              <div role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="frow two">
              <div>
                <label htmlFor="cf-name" className="flabel">Name *</label>
                <input id="cf-name" name="name" type="text" required autoComplete="name" className="field" placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="cf-email" className="flabel">Email *</label>
                <input id="cf-email" name="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" />
              </div>
            </div>

            {b.showCompanyField || b.showProjectTypeField ? (
              <div className="frow two">
                {b.showCompanyField ? (
                  <div>
                    <label htmlFor="cf-company" className="flabel">Company</label>
                    <input id="cf-company" name="company" type="text" autoComplete="organization" className="field" placeholder="Optional" />
                  </div>
                ) : null}
                {b.showProjectTypeField ? (
                  <div>
                    <label htmlFor="cf-type" className="flabel">Project type</label>
                    <select id="cf-type" name="projectType" key={tier?.projectType ?? 'none'} defaultValue={tier?.projectType ?? ''} className="field">
                      <option value="">Not sure yet</option>
                      <option value="website">Website</option>
                      <option value="ai-front-desk">AI Front Desk</option>
                      <option value="automation">Automation</option>
                      <option value="internal-tool">Internal tool</option>
                      <option value="seo">Local SEO + AI Search</option>
                      <option value="fix-it">Fix-it</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}

            {b.showBudgetField ? (
              <div className="frow">
                <div>
                  <label htmlFor="cf-budget" className="flabel">Budget range</label>
                  <select id="cf-budget" name="budgetRange" defaultValue="" className="field">
                    <option value="">Prefer not to say</option>
                    <option value="under-500">Under $500</option>
                    <option value="500-1k">$500 to $1,000</option>
                    <option value="1k-2500">$1,000 to $2,500</option>
                    <option value="2500-5k">$2,500 to $5,000</option>
                    <option value="5k-plus">$5,000+</option>
                  </select>
                </div>
              </div>
            ) : null}

            <div className="frow">
              <div>
                <label htmlFor="cf-phone" className="flabel">Phone (optional)</label>
                <input
                  id="cf-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  className="field"
                  placeholder="+1 (555) 123-4567 · international welcome"
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                />
                {/* International note. We accept any format the user types
                    (E.164 like +44 20 1234 5678, US like (555) 123-4567,
                    raw digits, etc.). Stripe normalizes on its side; for
                    SMS replies we honor 10DLC restrictions which means
                    US-only outbound texts. International clients still get
                    email replies. */}
                <p className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
                  Include country code for non-US numbers (e.g. +44, +61, +1). SMS replies are US-only; international clients get email replies.
                </p>
              </div>
            </div>

            <div className="frow">
              <div>
                <label htmlFor="cf-message" className="flabel">What are you working on? *</label>
                <textarea id="cf-message" name="message" required minLength={10} maxLength={5000} rows={6} className="field" placeholder="A sentence or two about what you're building, plus any rough timeline or budget." />
              </div>
            </div>

            {phoneValue.trim() ? (
              <label className="flex gap-3 items-start rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 cursor-pointer">
                <input
                  type="checkbox"
                  name="smsConsentUi"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-brass)]"
                />
                <span className="text-[14px] leading-[1.5]">
                  <span className="font-medium text-[var(--color-fg)]">{SMS_CHECKBOX_LABEL}</span>
                  <span className="block mt-1.5 text-[12.5px] leading-[1.5] text-[var(--color-fg-muted)]">
                    {SMS_DISCLAIMER_TEXT.replace('See our Privacy Policy.', '')}
                    <Link href="/privacy" className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)]">
                      See our Privacy Policy
                    </Link>
                    .
                  </span>
                </span>
              </label>
            ) : null}

            {/* Honeypot: invisible to humans, filled by bots. Label targets bots with a common field name. */}
            <div aria-hidden className="hidden" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label htmlFor="cf-website">Website</label>
              <input id="cf-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2">
              <Button type="submit" variant="brass" size="lg" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Sending\u2026' : (b.submitLabel ?? 'Send inquiry')}
              </Button>
              <p className="text-[12px] text-[var(--color-fg-muted)]">We reply within one business day.</p>
            </div>
          </form>
        )}
          </div>

          <div className="contact-aside">
            {/* Co-primary booking path (Model A hybrid): high-intent visitors
                can grab a time without typing. Sits right beside the form. */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5">
              <div className="flex items-center gap-2">
                <Calendar aria-hidden className="size-4 text-[var(--color-brass)]" />
                <b className="font-medium text-[var(--color-fg)]">Prefer to talk first?</b>
              </div>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--color-fg-muted)]">
                Grab a 30-minute intro call. We cover what you need, what it costs, and whether it is a fit. No hard sell.
              </p>
              <Button
                href={BOOKING_URL}
                variant="brass"
                size="sm"
                className="mt-3 w-full sm:w-auto"
                onClick={() =>
                  pushEvent('booking_click', {
                    source_page: typeof window !== 'undefined' ? window.location.pathname : '',
                    location: 'contact_form_aside',
                  })
                }
              >
                Book a 30-min call
              </Button>
            </div>
            {contactEmail && emailHref ? (
              <a
                href={emailHref}
                onClick={() => pushEvent('email_click', { source_page: typeof window !== 'undefined' ? window.location.pathname : '', location: 'contact_form' })}
                className="ci [&_b]:transition-colors hover:[&_b]:text-[var(--color-brass)]"
              >
                <Mail aria-hidden />
                <div>
                  <b>Email</b>
                  <span>{contactEmail}</span>
                </div>
              </a>
            ) : null}
            {contactPhone && phoneHrefVal ? (
              <a
                href={phoneHrefVal}
                onClick={() => pushEvent('phone_click', { source_page: typeof window !== 'undefined' ? window.location.pathname : '', location: 'contact_form' })}
                className="ci [&_b]:transition-colors hover:[&_b]:text-[var(--color-brass)]"
              >
                <Phone aria-hidden />
                <div>
                  <b>Phone / text</b>
                  <span className="font-mono tracking-[0.02em]">{contactPhone}</span>
                </div>
              </a>
            ) : null}
            <div className="ci">
              <MapPin aria-hidden />
              <div>
                <b>Where</b>
                <span>Houston Heights, TX \u00b7 remote welcome</span>
              </div>
            </div>
            <div className="ci">
              <Clock aria-hidden />
              <div>
                <b>Response time</b>
                <span>Within one business day, usually within an hour</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
