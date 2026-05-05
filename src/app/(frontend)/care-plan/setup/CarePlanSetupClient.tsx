'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { CARE_PLANS, type CarePlanSlug, formatUSD } from '@/lib/care-plans'

type Props = {
  initialTier: CarePlanSlug
  /** Set by the page server when the URL carries a valid signed customer
   *  token (admin-sent branded email). Skips the email lookup step. */
  prefilledCustomerId?: string | null
}

// This page is reachable three ways:
//   1. Branded email from admin (URL has ?customer=cus_…&tier=…&token=…) —
//      no email lookup needed; tier is locked to what the admin sent.
//   2. Direct link from /invoice/[id]/thank-you when BNPL was used —
//      client enters their email so we can resolve their Stripe Customer.
//   3. Self-service / public exposure — same email-lookup flow.

export function CarePlanSetupClient({ initialTier, prefilledCustomerId = null }: Props) {
  const isPrefilled = Boolean(prefilledCustomerId)
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState<CarePlanSlug>(initialTier)
  const [authorized, setAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tierObj = CARE_PLANS.find((p) => p.slug === tier) ?? CARE_PLANS[0]

  const consentText =
    `I authorize Black Hart Consulting LLC to charge ${formatUSD(tierObj.monthlyAmountCents)} per month ` +
    `to my saved payment method for the ${tierObj.name} Care Plan, until I cancel.`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!authorized) return
    if (!isPrefilled && !email.trim()) return
    setError(null)
    setSubmitting(true)
    try {
      let stripeCustomerId = prefilledCustomerId
      if (!stripeCustomerId) {
        // Email-lookup path. The API returns 404 with an unhelpful body if
        // the email doesn't match a known client — surface a clearer hint.
        const lookupRes = await fetch('/api/clients/lookup-by-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        })
        const lookup = (await lookupRes.json()) as { stripeCustomerId?: string; error?: string }
        if (!lookupRes.ok || !lookup.stripeCustomerId) {
          throw new Error(
            lookup.error ?? 'We could not find your Stripe customer record. Email hello@blackhartconsulting.com.',
          )
        }
        stripeCustomerId = lookup.stripeCustomerId
      }

      const setupRes = await fetch('/api/care-plan/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          carePlan: tier,
          stripeCustomerId,
          consentText,
        }),
      })
      const setup = (await setupRes.json()) as { url?: string; error?: string }
      if (!setupRes.ok || !setup.url) {
        throw new Error(setup.error ?? `Setup failed (${setupRes.status}).`)
      }
      window.location.href = setup.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-7 sm:p-9 space-y-5"
    >
      {isPrefilled ? null : (
        <div>
          <label className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
            Your email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[15px]"
          />
          <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
            We use this to find your Stripe customer record. Must match the email on a previous invoice.
          </p>
        </div>
      )}

      <fieldset>
        <legend className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-2">
          Pick your tier
        </legend>
        <div className="space-y-2">
          {CARE_PLANS.map((p) => (
            <label
              key={p.slug}
              className={`block rounded-lg border px-4 py-3 cursor-pointer ${
                tier === p.slug
                  ? 'border-[var(--color-brass)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="tier"
                    value={p.slug}
                    checked={tier === p.slug}
                    onChange={() => setTier(p.slug)}
                    className="accent-[var(--color-brass)]"
                  />
                  <span className="font-medium text-[15px]">{p.name}</span>
                </div>
                <span className="font-mono text-[14px] tabular-nums">{formatUSD(p.monthlyAmountCents)}/mo</span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(e) => setAuthorized(e.target.checked)}
          className="mt-1 h-5 w-5 accent-[var(--color-brass)] cursor-pointer"
        />
        <span className="text-[13px] leading-[1.55] text-[var(--color-fg-muted)]">{consentText}</span>
      </label>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={(!isPrefilled && !email) || !authorized || submitting}
      >
        {submitting ? 'Loading checkout…' : 'Continue to Stripe'}
      </Button>

      {error ? (
        <p className="text-[13px] text-red-600 leading-[1.5]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
