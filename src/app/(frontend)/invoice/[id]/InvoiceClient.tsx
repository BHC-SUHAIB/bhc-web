'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { CARE_PLANS, CARE_PLAN_TRIAL_DAYS, type CarePlanSlug, formatUSD } from '@/lib/care-plans'
import { carePlanConsentText, invoicePayState, type HostingMode } from '@/lib/invoice-hosting'
import { bnplPaymentMethods, formatPaymentMethodList } from '@/lib/payment-methods'

type LineItem = { description: string; amountCents: number; quantity?: number | null }

export type InvoiceClientProps = {
  invoiceId: string
  invoiceNumber: string
  totalCents: number
  description?: string | null
  lineItems: LineItem[]
  clientName: string
  /**
   * How hosting is presented. Resolved server-side by effectiveHostingMode()
   * so an existing subscription or a legacy `allowCarePlanUpsell=false`
   * invoice arrives here as 'hidden'.
   */
  hostingMode: HostingMode
  suggestedCarePlan: CarePlanSlug
  /** Pre-formatted first-charge date (server-rendered to avoid hydration drift). */
  firstChargeLabel: string
  // Resolved server-side from STRIPE_PAYMENT_METHOD_TYPES; same list the
  // checkout route sends to Stripe.
  paymentMethodTypes: string[]
  token: string
}

// Renders the interactive portion of the /invoice page — line items
// (read-only), the hosting section for the invoice's mode, the explicit MIT
// authorization checkbox, and the Pay button that posts to /api/checkout/start.
//
// Three modes (src/lib/invoice-hosting.ts):
//   included — hosting is part of the order. Order summary + ONE unticked
//              authorization box + "Pay $X and start hosting". Never
//              pre-ticked: express consent is required for recurring charges.
//              A text link reveals a plain pay button so the client is never
//              trapped into hosting to settle the invoice.
//   offer    — optional "Add a hosting plan" tick box, then the authorization.
//   hidden   — no hosting UI at all.

export function InvoiceClient(props: InvoiceClientProps) {
  const {
    invoiceId,
    invoiceNumber,
    totalCents,
    description,
    lineItems,
    clientName,
    hostingMode,
    suggestedCarePlan,
    firstChargeLabel,
    paymentMethodTypes,
    token,
  } = props

  // `offer` mode only: the opt-in tick box. Starts false, as it always has.
  const [addCarePlan, setAddCarePlan] = useState<boolean>(false)
  // `included` mode only: the escape hatch behind the "Pay the invoice
  // without hosting" link.
  const [optedOutOfHosting, setOptedOutOfHosting] = useState<boolean>(false)
  // In `included` mode the plan is fixed to the invoice's suggested plan and
  // this never changes; in `offer` mode the client can switch tiers.
  const [carePlanSlug, setCarePlanSlug] = useState<CarePlanSlug>(suggestedCarePlan)
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [isSubmitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const tier = useMemo(
    () => CARE_PLANS.find((p) => p.slug === (hostingMode === 'included' ? suggestedCarePlan : carePlanSlug)) ?? CARE_PLANS[0],
    [carePlanSlug, hostingMode, suggestedCarePlan],
  )

  const { includesHosting, canPay } = invoicePayState({
    mode: hostingMode,
    addCarePlanChecked: addCarePlan,
    authorized,
    optedOutOfHosting,
  })

  // Recorded verbatim alongside the consent timestamp — identical text in
  // both `included` and `offer` mode.
  const consentText = useMemo(() => carePlanConsentText(tier), [tier])

  const supportedMethods = useMemo(() => formatPaymentMethodList(paymentMethodTypes), [paymentMethodTypes])
  const bnplMethods = useMemo(
    () => formatPaymentMethodList(bnplPaymentMethods(paymentMethodTypes), 'or'),
    [paymentMethodTypes],
  )

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
          addCarePlan: includesHosting ? tier.slug : null,
          consentText: includesHosting ? consentText : undefined,
          consentTimestamp: includesHosting ? new Date().toISOString() : undefined,
        }),
      })
      // The server normally answers JSON, but a proxy or runtime error can
      // return HTML; parse defensively so the client sees a sentence, not a
      // browser parse error ("The string did not match the expected pattern").
      let json: { url?: string; error?: string } = {}
      try {
        json = (await res.json()) as { url?: string; error?: string }
      } catch {
        json = {}
      }
      if (!res.ok || !json.url) {
        throw new Error(
          json.error ??
            `We could not start the secure checkout (error ${res.status}). Please try again, or reply to the invoice email and we will send a direct payment link.`,
        )
      }
      window.location.href = json.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const authorizationBox = (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={authorized}
        onChange={(e) => setAuthorized(e.target.checked)}
        className="mt-1 h-5 w-5 accent-[var(--color-brass)] cursor-pointer"
      />
      <span className="text-[13px] leading-[1.55] text-[var(--color-fg-muted)]">{consentText}</span>
    </label>
  )

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

      {/* RIGHT: hosting + pay */}
      {hostingMode === 'included' ? (
        <section className="space-y-7">
          <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-7 sm:p-9">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
              Your order
            </p>

            <div className="mt-4 divide-y divide-[var(--color-border)]">
              <div className="flex items-baseline justify-between gap-4 pb-3">
                <span className="text-[15px]">Due today</span>
                <span className="font-serif text-2xl tabular-nums">{formatUSD(totalCents)}</span>
              </div>
              {includesHosting ? (
                <div className="pt-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[15px]">{tier.name} hosting</span>
                    <span className="font-mono text-[15px] tabular-nums shrink-0">
                      {formatUSD(tier.monthlyAmountCents)}/month
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">
                    First month free, first charge on {firstChargeLabel}. Cancel any time.
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">
                    {tier.inclusions.map((inc) => (
                      <li key={inc}>{inc}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="pt-3">
                  <p className="text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">
                    Hosting removed — you&rsquo;re paying this invoice on its own.{' '}
                    <button
                      type="button"
                      onClick={() => setOptedOutOfHosting(false)}
                      className="underline underline-offset-2 hover:text-[var(--color-fg)]"
                    >
                      Put {tier.name} hosting back on the order
                    </button>
                  </p>
                </div>
              )}
            </div>

            {includesHosting ? <div className="mt-6">{authorizationBox}</div> : null}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handlePay}
              disabled={!canPay || isSubmitting}
            >
              {isSubmitting
                ? 'Loading checkout…'
                : includesHosting
                  ? `Pay ${formatUSD(totalCents)} and start hosting`
                  : `Pay ${formatUSD(totalCents)}`}
            </Button>

            {includesHosting ? (
              <p className="mt-4 text-[12px] text-[var(--color-fg-muted)] leading-[1.5]">
                Prefer to settle the invoice first?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setOptedOutOfHosting(true)
                    setAuthorized(false)
                  }}
                  className="underline underline-offset-2 hover:text-[var(--color-fg)]"
                >
                  Pay the invoice without hosting
                </button>
              </p>
            ) : null}

            <p className="mt-4 text-[12px] text-[var(--color-fg-muted)] leading-[1.5]">
              You&rsquo;ll continue to a secure Stripe checkout page.
              {supportedMethods ? <> {supportedMethods} supported.</> : null}
              {includesHosting && bnplMethods ? (
                <>
                  {' '}
                  If you pay this invoice with {bnplMethods}, we&rsquo;ll ask you to enter a card on the next
                  step so we can run the monthly hosting plan charges.
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
      ) : (
        <section className="space-y-7">
          {hostingMode === 'offer' ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addCarePlan}
                  onChange={(e) => setAddCarePlan(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-[var(--color-brass)] cursor-pointer"
                />
                <div>
                  <p className="font-medium text-[15px]">Add a hosting plan</p>
                  <p className="mt-1 text-[14px] text-[var(--color-fg-muted)] leading-[1.5]">
                    Hosting, monitoring, backups, and ongoing edits, billed monthly. First month free: the
                    first charge runs {CARE_PLAN_TRIAL_DAYS} days after you pay this invoice. Cancel any time.
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
                        {carePlanSlug === p.slug ? (
                          <ul className="mt-2 ml-7 space-y-0.5 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">
                            {p.inclusions.map((inc) => (
                              <li key={inc}>{inc}</li>
                            ))}
                          </ul>
                        ) : null}
                      </label>
                    ))}
                  </fieldset>

                  <div className="mt-5">{authorizationBox}</div>
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
            {includesHosting ? (
              <div className="mt-2 flex items-baseline justify-between text-[var(--color-fg-muted)]">
                <span className="text-[13px]">Starting in {CARE_PLAN_TRIAL_DAYS} days</span>
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
              You&rsquo;ll continue to a secure Stripe checkout page.
              {supportedMethods ? <> {supportedMethods} supported.</> : null}
              {includesHosting && bnplMethods ? (
                <>
                  {' '}
                  If you pay this invoice with {bnplMethods}, we&rsquo;ll ask you to enter a card on the next
                  step so we can run the monthly hosting plan charges.
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
      )}
    </div>
  )
}
