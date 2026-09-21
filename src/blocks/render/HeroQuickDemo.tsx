'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { getAttribution } from '@/lib/attribution'
import { pushEvent } from '@/lib/analytics'
import { describeMissing, missingKeys, type MissingField } from '@/lib/form-validation'
import { pushLeadEvent, readJsonSafe } from '@/lib/lead-event'

// Two-field demo request that sits INSIDE the free-demo-site hero.
//
// Why (2026-09-21 weekly review, Clarity): 13 paid visitors landed on
// /free-demo-site in a week and none touched the form. Five left in under ten
// seconds and two phone visitors sat for minutes without a tap. The full form
// is one screen down behind an in-page jump, so the page's first screen asked
// for nothing. This puts the smallest possible ask (business name + email)
// where the ad click lands. The full form below stays for people who want to
// add a listing link, phone, or a note.
//
// Same collection, same payload shape, same spam handling as DemoRequestForm;
// `source: 'demo_request_hero'` on the event tells the two apart in GA4.

type State = 'idle' | 'submitting' | 'success' | 'error'

export function HeroQuickDemo() {
  const [state, setState] = useState<State>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedAtRef = useRef(0)
  useEffect(() => { startedAtRef.current = Date.now() }, [])

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (state === 'submitting') return
    setErrorMessage(null)

    const form = ev.currentTarget
    const data = new FormData(form)
    const businessName = String(data.get('businessName') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const sourcePage = typeof window !== 'undefined' ? window.location.pathname : ''

    const missing: MissingField[] = []
    if (!businessName) missing.push({ key: 'businessName', label: 'your business name' })
    if (!email) missing.push({ key: 'email', label: 'your email' })
    if (missing.length > 0) {
      setState('error')
      setErrorMessage(describeMissing(missing))
      pushEvent('form_validation_error', { form: 'demo_request_hero', missing: missingKeys(missing), source_page: sourcePage })
      return
    }

    setState('submitting')
    try {
      const res = await fetch('/api/contact-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'demo-request',
          name: businessName,
          company: businessName,
          email,
          projectType: 'website',
          message: `Demo site request for ${businessName} (quick form in the page hero; no listing link given).`,
          honeypot: String(data.get('bhc_confirm_field') ?? ''),
          formStartedAt: startedAtRef.current,
          attribution: getAttribution(),
          sourcePage,
        }),
      })
      if (!res.ok) {
        let msg = `Submission failed (${res.status})`
        const body = (await readJsonSafe(res)) as { errors?: Array<{ message?: string }> } | null
        if (body?.errors?.[0]?.message) msg = body.errors[0].message
        throw new Error(msg)
      }
      const body = await readJsonSafe(res)
      setState('success')
      pushLeadEvent(body, { source_page: sourcePage, project_type: 'website', source: 'demo_request_hero', currency: 'USD' })
      form.reset()
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (state === 'success') {
    return (
      <div className="mt-6 sm:mt-8 max-w-xl rounded-[var(--radius-md)] bg-white/10 backdrop-blur-sm border border-white/25 px-5 py-4 text-white" role="status">
        <p className="flex items-center gap-2 font-semibold">
          <Check className="size-5 shrink-0" aria-hidden /> Request received.
        </p>
        <p className="mt-1 text-[15px] text-white/90">Your demo link lands in your inbox within 48 hours. No call, no obligation.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 sm:mt-8 max-w-xl" aria-label="Request a free demo site">
      {errorMessage ? (
        <p role="alert" className="mb-2 rounded-[var(--radius-sm)] bg-[#7a1f1f]/90 px-3 py-2 text-[14px] text-white">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="hero-demo-business">Business name</label>
        <input
          id="hero-demo-business"
          name="businessName"
          type="text"
          autoComplete="organization"
          placeholder="Business name"
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-white/30 bg-white/95 px-4 py-3 text-[16px] text-[#1A1713] placeholder:text-[#5A5349] focus:outline-2 focus:outline-[var(--color-brass)]"
        />
        <label className="sr-only" htmlFor="hero-demo-email">Email</label>
        <input
          id="hero-demo-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Email for the demo link"
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-white/30 bg-white/95 px-4 py-3 text-[16px] text-[#1A1713] placeholder:text-[#5A5349] focus:outline-2 focus:outline-[var(--color-brass)]"
        />
      </div>
      {/* Honeypot: same name and hardening as the full form so password
          managers and iOS autofill leave it alone. */}
      <input
        type="text"
        name="bhc_confirm_field"
        tabIndex={-1}
        autoComplete="one-time-code"
        data-lpignore="true"
        data-1p-ignore="true"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="btn btn-brass btn-md mt-2 w-full sm:w-auto"
      >
        {state === 'submitting' ? 'Sending...' : 'Send me my demo'}
      </button>
      <p className="mt-2 text-[13px] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
        Free. No call. Built from your public Google listing.
      </p>
    </form>
  )
}
