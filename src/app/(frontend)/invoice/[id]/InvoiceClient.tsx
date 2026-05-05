'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { CARE_PLANS, type CarePlanSlug, formatUSD } from '@/lib/care-plans'

type LineItem = { description: string; amountCents: number; quantity?: number | null }

export type InvoiceClientProps = {
  invoiceId: string
  invoiceNumber: string
  totalCents: number
  description?: string | null
  lineItems: LineItem[]
  clientName: string
  allowCarePlanUpsell: boolean
  suggestedCarePlan: CarePlanSlug
  token: string
}

// Renders the interactive portion of the /invoice page — line items
// (read-only), the Care Plan toggle + tier picker, the explicit MIT
// authorization checkbox, and the Pay button that posts to /api/checkout/start.

export function InvoiceClient(props: InvoiceClientProps) {
  const {
    invoiceId,
    invoiceNumber,
    totalCents,
    description,
    lineItems,
    clientName,
    allowCarePlanUpsell,
    suggestedCarePlan,
    token,
  } = props

  const [addCarePlan, setAddCarePlan] = useState<boolean>(false)
  const [carePlanSlug, setCarePlanSlug] = useState<CarePlanSlug>(suggestedCarePlan)
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [isSubmitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const tier = useMemo(() => CARE_PLANS.find((p) => p.slug === carePlanSlug) ?? CARE_PLANS[0], [carePlanSlug])

  const consentText = useMemo(() => {
    if (!addCarePlan) return ''
    return (
      `I authorize Black Hart Consulting LLC to charge ${formatUSD(tier.monthlyAmountCents)} per month ` +
      `to my saved payment method for the ${tier.name} Care Plan, starting 30 days after this invoice is paid, ` +
      `until I cancel. Cancellation is one-click via the Stripe customer portal or by emailing hello@blackhartconsulting.com.`
    )
  }, [addCarePlan, tier])

  const canPay = !addCarePlan || authorized

  async function handlePay() {
    if (isSubmitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          token,
          addCarePlan: addCarePlan ? carePlanSlug : null,
          consentText: addCarePlan ? consentText : undefined,
          consentTimestamp: addCarePlan ? new Date().toISOString() : undefined,
        }),
      })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? `Checkout failed (${res.status}).`)
      }
      window.location.href = json.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-start">
      {/* LEFT: invoice summary */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
          Invoice
        </p>
        <h2 className="font-serif font-semibold text-3xl mt-2 tracking-[-0.02em]">{invoiceNumber}</h2>
        <p className="mt-2 text-[15px] text-[var(--color-fg-muted)]">For {clientName}</p>

        {description ? (
          <p className="mt-5 text-[15px] leading-[1.55] text-[var(--color-fg-muted)] whitespace-pre-wrap">
            {description}
          </p>
        ) : null}

        <ul className="mt-7 divide-y divide-[var(--color-border)]">
          {lineItems.map((li, i) => {
            const qty = li.quantity ?? 1
            const sub = li.amountCents * qty
            return (
              <li key={i} className="flex items-baseline justify-between gap-4 py-3">
                <span className="text-[15px]">
                  {li.description}
                  {qty > 1 ? <span className="text-[var(--color-fg-muted)]"> × {qty}</span> : null}
                </span>
                <span className="font-mono text-[14px] tabular-nums shrink-0">{formatUSD(sub)}</span>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 flex items-baseline justify-between border-t border-[var(--color-border-strong)] pt-5">
          <span className="font-mono text-[12px] tracking-[0.15em] uppercase text-[var(--color-fg-muted)]">
            Total due
          </span>
          <span className="font-serif text-3xl tracking-[-0.02em] tabular-nums">{formatUSD(totalCents)}</span>
        </div>
      </section>

      {/* RIGHT: care plan upsell + pay */}
      <section className="space-y-7">
        {allowCarePlanUpsell ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addCarePlan}
                onChange={(e) => setAddCarePlan(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--color-brass)] cursor-pointer"
              />
              <div>
                <p className="font-medium text-[15px]">Add a Care Plan</p>
                <p className="mt-1 text-[14px] text-[var(--color-fg-muted)] leading-[1.5]">
                  Hosting, monitoring, backups, and ongoing edits — billed monthly. First charge starts
                  30 days after today; cancel any time.
                </p>
              </div>
            </label>

            {addCarePlan ? (
              <div className="mt-6 space-y-4">
                <fieldset className="space-y-2">
                  <legend className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-2">
                    Choose tier
                  </legend>
                  {CARE_PLANS.map((p) => (
                    <label
                      key={p.slug}
                      className={`block rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                        carePlanSlug === p.slug
                          ? 'border-[var(--color-brass)] bg-[var(--color-surface-raised)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="care-plan-tier"
                            value={p.slug}
                            checked={carePlanSlug === p.slug}
                            onChange={() => setCarePlanSlug(p.slug)}
                            className="accent-[var(--color-brass)]"
                          />
                          <span className="font-medium text-[15px]">{p.name}</span>
                        </div>
                        <span className="font-mono text-[14px] tabular-nums">
                          {formatUSD(p.monthlyAmountCents)}/mo
                        </span>
                      </div>
                      <p className="mt-1.5 ml-7 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">{p.blurb}</p>
                    </label>
                  ))}
                </fieldset>

                <label className="flex items-start gap-3 mt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    className="mt-1 h-5 w-5 accent-[var(--color-brass)] cursor-pointer"
                  />
                  <span className="text-[13px] leading-[1.55] text-[var(--color-fg-muted)]">{consentText}</span>
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-7 sm:p-9">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
            Pay now
          </p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[15px]">Total today</span>
            <span className="font-serif text-2xl tabular-nums">{formatUSD(totalCents)}</span>
          </div>
          {addCarePlan ? (
            <div className="mt-2 flex items-baseline justify-between text-[var(--color-fg-muted)]">
              <span className="text-[13px]">Then monthly</span>
              <span className="font-mono text-[13px] tabular-nums">{formatUSD(tier.monthlyAmountCents)}/mo</span>
            </div>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            className="w-full mt-6"
            onClick={handlePay}
            disabled={!canPay || isSubmitting}
          >
            {isSubmitting ? 'Loading checkout…' : `Pay ${formatUSD(totalCents)}`}
          </Button>

          <p className="mt-4 text-[12px] text-[var(--color-fg-muted)] leading-[1.5]">
            You&rsquo;ll continue to a secure Stripe checkout page. Card, ACH, Klarna, Affirm, and Link supported.
            {addCarePlan ? (
              <>
                {' '}
                If you pay this invoice with Klarna or Affirm, we&rsquo;ll ask you to enter a card on the next
                step so we can run the monthly Care Plan charges.
              </>
            ) : null}
          </p>

          {error ? (
            <p className="mt-4 text-[13px] text-red-600 leading-[1.5]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
