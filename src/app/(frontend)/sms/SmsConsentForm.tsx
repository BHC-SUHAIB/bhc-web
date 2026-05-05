'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import { SMS_DISCLAIMER_TEXT, SMS_CHECKBOX_LABEL } from '@/lib/sms-disclaimer'

type State = 'idle' | 'submitting' | 'success' | 'error'

const inputCls = 'w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-brass)] focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-0 transition-colors text-[15px]'
const labelCls = 'block text-[12px] font-mono tracking-[0.12em] uppercase text-[var(--color-fg-muted)] mb-2'

export function SmsConsentForm() {
  const [state, setState] = useState<State>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (state === 'submitting') return
    if (!agree) {
      setState('error')
      setErrorMessage('You must check the consent box to opt in.')
      return
    }
    setState('submitting')
    setErrorMessage(null)

    const form = ev.currentTarget
    const data = new FormData(form)
    const payload: Record<string, string> = {
      name: String(data.get('name') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      honeypot: String(data.get('website') ?? ''),
      source: 'sms-page',
      status: 'active',
      disclaimerText: SMS_DISCLAIMER_TEXT,
      sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/sms',
    }
    const email = String(data.get('email') ?? '').trim()
    if (email) payload.email = email

    if (!payload.name || !payload.phone) {
      setState('error')
      setErrorMessage('Please provide your name and phone number.')
      return
    }

    try {
      const res = await fetch('/api/sms-consents', {
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
      setAgree(false)
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_10%,var(--color-bg))] p-10 text-center">
        <svg aria-hidden viewBox="0 0 24 24" className="size-8 mx-auto mb-4 text-[var(--color-brass)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <p className="font-serif text-[22px] leading-[1.3] tracking-[-0.015em]">
          You&rsquo;re opted in.
        </p>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)]">
          We&rsquo;ll reach out only when we have something useful to say.
          Reply STOP at any time to opt out.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      {errorMessage ? (
        <div role="alert" className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="sms-name" className={labelCls}>Name *</label>
          <input id="sms-name" name="name" type="text" required autoComplete="name" className={inputCls} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="sms-phone" className={labelCls}>Phone *</label>
          <input id="sms-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" className={inputCls} placeholder="(555) 123-4567 — US numbers only" />
        </div>
      </div>

      <div>
        <label htmlFor="sms-email" className={labelCls}>Email (optional)</label>
        <input id="sms-email" name="email" type="email" autoComplete="email" className={inputCls} placeholder="you@example.com" />
      </div>

      <label className="flex gap-3 items-start rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 cursor-pointer">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          required
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

      {/* Honeypot */}
      <div aria-hidden className="hidden" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label htmlFor="sms-website">Website</label>
        <input id="sms-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-2">
        <Button type="submit" variant="primary" size="lg" disabled={state === 'submitting' || !agree} className={cn(!agree && 'opacity-50')}>
          {state === 'submitting' ? 'Submitting\u2026' : 'Opt in to text messages'}
        </Button>
        <p className="text-[12px] text-[var(--color-fg-muted)]">
          You&rsquo;ll get a confirmation text; reply STOP any time to opt out.
        </p>
      </div>
    </form>
  )
}

export function SmsConsentFormShell({ children }: { children: React.ReactNode }) {
  return (
    <Container size="md" className="py-20 sm:py-28">
      {children}
    </Container>
  )
}
