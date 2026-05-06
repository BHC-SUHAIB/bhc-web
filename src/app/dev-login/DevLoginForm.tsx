'use client'

import { useEffect, useRef, useState } from 'react'

// Client-side wrapper around the dev-login form so we can:
//   - autofocus the password input on mount (better UX than a vanilla form)
//   - show a transient error message above the field after a failed POST
//   - disable the submit button briefly to avoid double-submit double-redirects
//
// The form submits as a regular `<form action="/api/dev-auth/login" method="post">`
// — no fetch — so the route handler can do the cookie-set + redirect server-side.

type Props = {
  next?: string
  initialError: string | null
}

export function DevLoginForm({ next, initialError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form
      action="/api/dev-auth/login"
      method="post"
      onSubmit={() => setSubmitting(true)}
      className="flex flex-col gap-4"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <label className="block">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--color-fg-muted)] mb-2 block">
          Access password
        </span>
        <input
          ref={inputRef}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={initialError ? true : undefined}
          aria-describedby={initialError ? 'dev-login-error' : undefined}
          className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:border-[var(--color-brass)] transition-colors"
        />
      </label>

      {initialError ? (
        <p
          id="dev-login-error"
          role="alert"
          className="text-[13px] text-[#a8351c] dark:text-[#e07a5f] -mt-1"
        >
          {initialError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-fg)] text-[var(--color-bg)] px-6 py-3 font-medium text-[15px] tracking-[0.01em] transition-[background-color,color,transform] duration-150 ease-out hover:bg-[var(--color-brass)] hover:text-[var(--color-ink)] active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
