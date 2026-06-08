'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Logo } from './Logo'
import { pushEvent } from '@/lib/analytics'

// Exit-intent / deep-scroll lead modal.
//
// ────────────────────────────────────────────────────────────────────────────
// KILL-SWITCH: this whole feature is disabled by setting the env var
//   NEXT_PUBLIC_EXIT_INTENT_ENABLED="false"
// (any other value, or unset, = enabled). Flip it + redeploy to turn the modal
// off entirely with zero code changes. Suhaib: leave it on while you test how
// intrusive it feels, then set it to "false" if you decide to drop it.
// ────────────────────────────────────────────────────────────────────────────
//
// Behavior: arms 4s after load, then opens ONCE PER SESSION on either a desktop
// pointer-exit at the top of the window OR scrolling past 55% of the page.
// Stored in sessionStorage so it never nags a visitor twice in one visit.

const ENABLED = process.env.NEXT_PUBLIC_EXIT_INTENT_ENABLED !== 'false'
const SESSION_KEY = 'bhc_exit_modal_seen'

export function ExitIntentModal() {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const armed = useRef(false)
  const shown = useRef(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!ENABLED) return
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return
    } catch {
      /* private mode — just proceed in-memory */
    }

    const armTimer = window.setTimeout(() => {
      armed.current = true
    }, 4000)

    const trigger = () => {
      if (!armed.current || shown.current) return
      shown.current = true
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* ignore */
      }
      setOpen(true)
      pushEvent('exit_intent_shown', {})
    }

    const onMouseOut = (e: MouseEvent) => {
      // Pointer left through the top edge of the document (classic exit intent).
      if (!e.relatedTarget && e.clientY <= 0) trigger()
    }
    const onScroll = () => {
      const depth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight
      if (depth >= 0.55) trigger()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mouseout', onMouseOut)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener('mouseout', onMouseOut)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting) return
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    if (!email) return
    setSubmitting(true)
    setError(null)
    const sourcePage = typeof window !== 'undefined' ? window.location.pathname : ''
    // Persist a REAL lead first (so it lands in the inbox + Slack and the
    // "we'll send your audit" promise is keepable), THEN fire the conversion.
    // Firing generate_lead without a saved lead would pollute Google Ads with
    // phantom conversions, so the event is gated on a successful create.
    try {
      const res = await fetch('/api/contact-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Website audit request (exit-intent)',
          email,
          message: `Requested a free website audit via the exit-intent popup${sourcePage ? ` on ${sourcePage}` : ''}. Please send the audit to ${email}.`,
          sourcePage,
        }),
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
      // Real lead captured — this is now a genuine primary conversion.
      pushEvent('generate_lead', { source: 'exit_intent', method: 'email', source_page: sourcePage })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!ENABLED) return null

  return (
    <div
      className={`modal-scrim${open ? ' open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      aria-hidden={!open}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Free website audit offer">
        <button type="button" className="x" onClick={close} aria-label="Close">
          <X className="size-4" aria-hidden />
        </button>
        <div className="m-mark">
          <Logo variant="primary" height={31} className="text-[var(--logo)]" />
        </div>
        {done ? (
          <>
            <h3>You&rsquo;re all set.</h3>
            <p>Thanks. We&rsquo;ll send your free website audit shortly. Keep an eye on your inbox.</p>
          </>
        ) : (
          <>
            <h3>Before you go, grab a free audit.</h3>
            <p>
              We&rsquo;ll show you exactly what&rsquo;s costing you customers: speed, search ranking, and the
              leaks in your funnel. Five minutes, no call required.
            </p>
            {error ? (
              <p role="alert" className="text-[13px] text-red-700 dark:text-red-300 mb-2">{error}</p>
            ) : null}
            <form className="modal-form" onSubmit={onSubmit}>
              <input
                className="field"
                type="email"
                name="email"
                required
                disabled={submitting}
                placeholder="you@yourbusiness.com"
                aria-label="Email address"
              />
              <button type="submit" className="btn btn-brass btn-md" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send it'}
              </button>
            </form>
            <p className="fineprint">No spam. One audit, then it&rsquo;s up to you.</p>
          </>
        )}
      </div>
    </div>
  )
}
