'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Mail, Phone } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import { phoneHref, mailtoHref } from '@/lib/contact'
import { SMS_DISCLAIMER_TEXT, SMS_CHECKBOX_LABEL } from '@/lib/sms-disclaimer'
import { pushEvent } from '@/lib/analytics'
import type { ContactFormBlockBlock } from '@/payload-types'

type State = 'idle' | 'submitting' | 'success' | 'error'

type ContactFormProps = ContactFormBlockBlock & {
  contactEmail?: string | null
  contactPhone?: string | null
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

  const inputCls = 'w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-brass)] focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-0 transition-colors text-[15px]'
  const labelCls = 'block text-[12px] font-mono tracking-[0.12em] uppercase text-[var(--color-fg-muted)] mb-2'

  const anchor = anchorFromEyebrow(b.eyebrow)

  return (
    <section id={anchor} className="py-12 sm:py-16 scroll-mt-24">
      <Container size="md">
        <div className="mb-8 max-w-2xl">
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">{b.eyebrow}</p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">{b.description}</p>
          ) : null}
          {(contactEmail && emailHref) || (contactPhone && phoneHrefVal) ? (
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              {contactEmail && emailHref ? (
                <a
                  href={emailHref}
                  onClick={() => pushEvent('email_click', { source_page: typeof window !== 'undefined' ? window.location.pathname : '', location: 'contact_form' })}
                  className="inline-flex items-center gap-2.5 text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors"
                >
                  <Mail className="size-4" aria-hidden />
                  <span>{contactEmail}</span>
                </a>
              ) : null}
              {contactPhone && phoneHrefVal ? (
                <a
                  href={phoneHrefVal}
                  onClick={() => pushEvent('phone_click', { source_page: typeof window !== 'undefined' ? window.location.pathname : '', location: 'contact_form' })}
                  className="inline-flex items-center gap-2.5 font-mono tracking-[0.02em] text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors"
                >
                  <Phone className="size-4" aria-hidden />
                  <span>{contactPhone}</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {state === 'success' ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_10%,var(--color-bg))] p-10 text-center">
            <svg aria-hidden viewBox="0 0 24 24" className="size-8 mx-auto mb-4 text-[var(--color-brass)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <p className="font-serif text-[22px] leading-[1.3] tracking-[-0.015em]">
              {b.successMessage ?? 'Thanks. We\u2019ll reply within one business day.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
            {errorMessage ? (
              <div role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="cf-name" className={labelCls}>Name *</label>
                <input id="cf-name" name="name" type="text" required autoComplete="name" className={inputCls} placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="cf-email" className={labelCls}>Email *</label>
                <input id="cf-email" name="email" type="email" required autoComplete="email" className={inputCls} placeholder="you@example.com" />
              </div>
            </div>

            {b.showCompanyField || b.showProjectTypeField ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {b.showCompanyField ? (
                  <div>
                    <label htmlFor="cf-company" className={labelCls}>Company</label>
                    <input id="cf-company" name="company" type="text" autoComplete="organization" className={inputCls} placeholder="Optional" />
                  </div>
                ) : null}
                {b.showProjectTypeField ? (
                  <div>
                    <label htmlFor="cf-type" className={labelCls}>Project type</label>
                    <select id="cf-type" name="projectType" defaultValue="" className={cn(inputCls, 'appearance-none pr-10 bg-no-repeat bg-[right_1rem_center] bg-[length:14px_14px]')} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")" }}>
                      <option value="">Not sure yet</option>
                      <option value="website">Website</option>
                      <option value="webapp">Web app</option>
                      <option value="mobile">Mobile app</option>
                      <option value="seo">SEO engagement</option>
                      <option value="hosting">Hosting / infrastructure</option>
                      <option value="brand">Brand / design</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}

            {b.showBudgetField ? (
              <div>
                <label htmlFor="cf-budget" className={labelCls}>Budget range</label>
                <select id="cf-budget" name="budgetRange" defaultValue="" className={cn(inputCls, 'appearance-none pr-10 bg-no-repeat bg-[right_1rem_center] bg-[length:14px_14px]')} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")" }}>
                  <option value="">Prefer not to say</option>
                  <option value="under-5k">Under $5k</option>
                  <option value="5-10k">$5k – $10k</option>
                  <option value="10-25k">$10k – $25k</option>
                  <option value="25-50k">$25k – $50k</option>
                  <option value="50k-plus">$50k+</option>
                  <option value="unsure">Not sure yet</option>
                </select>
              </div>
            ) : null}

            <div>
              <label htmlFor="cf-phone" className={labelCls}>Phone (optional)</label>
              <input
                id="cf-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                className={inputCls}
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

            <div>
              <label htmlFor="cf-message" className={labelCls}>What are you working on? *</label>
              <textarea id="cf-message" name="message" required minLength={10} maxLength={5000} rows={6} className={cn(inputCls, 'resize-y')} placeholder="A sentence or two about what you're building, plus any rough timeline or budget." />
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
              <Button type="submit" variant="primary" size="lg" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Sending\u2026' : (b.submitLabel ?? 'Send inquiry')}
              </Button>
              <p className="text-[12px] text-[var(--color-fg-muted)]">We reply within one business day.</p>
            </div>
          </form>
        )}
      </Container>
    </section>
  )
}
