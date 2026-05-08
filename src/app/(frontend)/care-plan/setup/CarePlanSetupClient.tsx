'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { CARE_PLANS, type CarePlanSlug, formatUSD } from '@/lib/care-plans'

type Props = {
  initialTier: CarePlanSlug
  /** Set by the page server when the URL carries a valid signed customer
   *  token (admin-sent branded email). Skips the email lookup step. */
  prefilledCustomerId?: string | null
  /** Custom tier display name. When non-null, renders a single-tier
   *  custom flow (no 3-tier picker, no email lookup — admin-sent only). */
  customLabel?: string | null
  /** Custom tier monthly amount in cents. Required when customLabel is set. */
  customAmountCents?: number | null
}

// This page is reachable four ways:
//   1. Standard tier admin email (URL has ?customer=cus_…&tier=care|growth|scale&token=…) —
//      no email lookup needed; tier is locked to what the admin sent.
//   2. Custom tier admin email (URL has ?customer=…&tier=custom&label=…&amount=…&token=…) —
//      hosting-friend / negotiated price flow. Single locked tier card,
//      no 3-tier picker.
//   3. Direct link from /invoice/[id]/thank-you when BNPL was used —
//      client enters their email so we can resolve their Stripe Customer.
//   4. Self-service / public exposure — same email-lookup flow.

export function CarePlanSetupClient({
  initialTier,
  prefilledCustomerId = null,
  customLabel = null,
  customAmountCents = null,
}: Props) {
  const isPrefilled = Boolean(prefilledCustomerId)
  const isCustom = Boolean(customLabel && customAmountCents)
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState<CarePlanSlug>(initialTier)
  const [authorized, setAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tierObj = CARE_PLANS.find((p) => p.slug === tier) ?? CARE_PLANS[0]
  const displayLabel = isCustom ? customLabel! : `${tierObj.name} Care Plan`
  const displayAmountCents = isCustom ? customAmountCents! : tierObj.monthlyAmountCents

  const consentText =
    `I authorize Black Hart Consulting LLC to charge ${formatUSD(displayAmountCents)} per month ` +
    `to my saved payment method for the ${displayLabel}, until I cancel.`

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
          carePlan: isCustom ? 'custom' : tier,
          customLabel: isCustom ? customLabel : undefined,
          customAmountCents: isCustom ? customAmountCents : undefined,
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

      {isCustom ? (
        // Custom tier — no picker. The plan was already shown in the
        // page-level summary card above; this is just a visual confirmation
        // strip inside the form so the consent line below has clear context.
        <div className="rounded-lg border border-[var(--color-brass)] bg-[var(--color-surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-[15px]">{displayLabel}</span>
            <span className="font-mono text-[14px] tabular-nums">
              {formatUSD(displayAmountCents)}/mo
            </span>
          </div>
        </div>
      ) : (
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
      )}

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
