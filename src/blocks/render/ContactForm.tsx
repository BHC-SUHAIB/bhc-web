'use client'

import { useState, type FormEvent } from 'react'
import { Mail, Phone } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import { phoneHref, mailtoHref } from '@/lib/contact'
import type { ContactFormBlockBlock } from '@/payload-types'

type State = 'idle' | 'submitting' | 'success' | 'error'

type ContactFormProps = ContactFormBlockBlock & {
  contactEmail?: string | null
  contactPhone?: string | null
}

export function ContactForm(b: ContactFormProps) {
  const contactEmail = b.contactEmail ?? ''
  const contactPhone = b.contactPhone ?? ''
  const emailHref = mailtoHref(contactEmail)
  const phoneHrefVal = phoneHref(contactPhone)
  const [state, setState] = useState<State>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

    if (!payload.name || !payload.email || payload.message.length < 10) {
      setState('error')
      setErrorMessage('Please fill in your name, email, and at least a sentence.')
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
      form.reset()
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-brass)] focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-0 transition-colors text-[15px]'
  const labelCls = 'block text-[12px] font-mono tracking-[0.12em] uppercase text-[var(--color-fg-muted)] mb-2'

  return (
    <section className="py-20 sm:py-24">
      <Container size="md">
        <div className="mb-12 max-w-2xl">
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">{b.eyebrow}</p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-5 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">{b.description}</p>
          ) : null}
          {(contactEmail && emailHref) || (contactPhone && phoneHrefVal) ? (
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              {contactEmail && emailHref ? (
                <a href={emailHref} className="inline-flex items-center gap-2.5 text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors">
                  <Mail className="size-4" aria-hidden />
                  <span>{contactEmail}</span>
                </a>
              ) : null}
              {contactPhone && phoneHrefVal ? (
                <a href={phoneHrefVal} className="inline-flex items-center gap-2.5 font-mono tracking-[0.02em] text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors">
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
              {b.successMessage ?? 'Thanks \u2014 we\u2019ll reply within one business day.'}
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
              <label htmlFor="cf-message" className={labelCls}>What are you working on? *</label>
              <textarea id="cf-message" name="message" required minLength={10} maxLength={5000} rows={6} className={cn(inputCls, 'resize-y')} placeholder="A sentence or two about what you're building, plus any rough timeline or budget." />
            </div>

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
