'use client'

import { useState, type FormEvent } from 'react'
import { pushEvent } from '@/lib/analytics'

// LP-specific contact form. Three required fields only — every extra field
// on a paid-traffic page costs 5-10% conversion rate. Sends to the same
// /api/contact-submissions endpoint as the main contact form, with a
// pre-filled `projectType=website` and a `sourcePage` so we can segment
// LP submissions in Payload.

type State = 'idle' | 'submitting' | 'success' | 'error'

const inputCls =
  'w-full px-4 py-3.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-brass)] focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-0 transition-colors text-[15px]'
const labelCls =
  'block text-[12px] font-mono tracking-[0.12em] uppercase text-[var(--color-fg-muted)] mb-2'

export function LpForm() {
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
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
      projectType: 'website',
      honeypot: String(data.get('website') ?? ''),
      sourcePage: typeof window !== 'undefined' ? window.location.pathname : '',
    }

    if (!payload.name || !payload.email || payload.message.length < 5) {
      setState('error')
      setErrorMessage('Please fill in your name, email, and a sentence about your project.')
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
        } catch {
          /* noop */
        }
        throw new Error(msg)
      }
      setState('success')
      pushEvent('generate_lead', {
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        project_type: 'website',
        budget_range: 'lp_express_website',
        currency: 'USD',
      })
      form.reset()
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (state === 'success') {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_10%,var(--color-bg))] p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-8 mx-auto mb-3 text-[var(--color-brass)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <p className="font-serif text-[20px] leading-[1.3] tracking-[-0.015em]">
          Got it — we&apos;ll reply within one business day with a fixed-price proposal.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/5 px-4 py-3 text-[14px] text-red-700 dark:text-red-300"
        >
          {errorMessage}
        </div>
      ) : null}

      <div>
        <label htmlFor="lp-name" className={labelCls}>
          Name
        </label>
        <input
          id="lp-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className={inputCls}
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="lp-email" className={labelCls}>
          Email
        </label>
        <input
          id="lp-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="lp-message" className={labelCls}>
          What are you building?
        </label>
        <textarea
          id="lp-message"
          name="message"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          className={inputCls + ' resize-y'}
          placeholder="A sentence about your business and what you need."
        />
      </div>

      {/* Honeypot — hidden from humans, filled by bots. */}
      <div
        aria-hidden
        className="hidden"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        <label htmlFor="lp-website">Website</label>
        <input id="lp-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mt-2 inline-flex items-center justify-center gap-2 h-[56px] px-7 text-[16px] font-medium tracking-[0.01em] rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)] transition-colors active:translate-y-[1px] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        {state === 'submitting' ? 'Sending…' : 'Get my fixed-price proposal'}
      </button>
      <p className="text-[12px] text-[var(--color-fg-muted)] text-center">
        Reply within one business day. No call required.
      </p>
    </form>
  )
}
