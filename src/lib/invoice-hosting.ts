import {
  CARE_PLANS,
  CARE_PLAN_TRIAL_DAYS,
  carePlanBySlug,
  formatUSD,
  type CarePlanSlug,
  type CarePlanTier,
} from '@/lib/care-plans'

// Hosting presentation on a single invoice.
//
// Before this module, one boolean (`allowCarePlanUpsell`) decided whether the
// /invoice page showed an optional "Add a hosting plan" tick box. That only
// models one of the two real sales situations:
//
//   - The client has NOT agreed to hosting → offer it (the old behaviour).
//   - The client ALREADY agreed to hosting in the proposal → hosting is part
//     of the order, and the invoice page should say so instead of dangling it
//     as an optional extra the client can quietly skip.
//
// So invoices now carry a three-way `hostingMode`:
//
//   included — hosting is part of this order. The page shows an order summary
//              (due today + monthly hosting) with the plan fixed to the
//              invoice's suggestedCarePlan, ONE unticked authorization box
//              carrying the verbatim consent sentence, and a single
//              "Pay $X and start hosting" button that stays disabled until
//              the box is ticked. Express written consent is a legal
//              requirement for recurring charges (Reg E / card-network MIT
//              rules), so the box is NEVER pre-ticked and there is no path to
//              hosting that skips it. A small text link lets the client pay
//              the invoice without hosting so nobody is ever trapped.
//   offer    — today's behaviour: optional tick box, then the authorization.
//   hidden   — no hosting section at all.
//
// `allowCarePlanUpsell` is kept (deprecated) and stays in sync so any code or
// report still reading it keeps working. When `hostingMode` is empty — every
// invoice that existed before this change — the mode is derived from
// `allowCarePlanUpsell`, so old invoices render exactly as they did.

export type HostingMode = 'included' | 'offer' | 'hidden'

export const HOSTING_MODES: readonly HostingMode[] = ['included', 'offer', 'hidden'] as const

export const HOSTING_MODE_OPTIONS = [
  { label: 'Included: client already agreed to hosting', value: 'included' },
  { label: 'Offer: show an optional hosting add-on', value: 'offer' },
  { label: 'Hidden: no hosting section', value: 'hidden' },
] as const

/** Client-level "Hosting agreed" values. `none` = nothing agreed yet. */
export type HostingAgreed = 'none' | CarePlanSlug

export const HOSTING_AGREED_OPTIONS = [
  { label: 'None', value: 'none' },
  ...CARE_PLANS.map((p) => ({
    label: `${p.name} · ${formatUSD(p.monthlyAmountCents)}/mo`,
    value: p.slug as string,
  })),
] as const

export function isHostingMode(value: unknown): value is HostingMode {
  return typeof value === 'string' && (HOSTING_MODES as readonly string[]).includes(value)
}

/** Subscription statuses that mean "this client is already paying us monthly". */
export const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const

export function isLiveSubscriptionStatus(status: unknown): boolean {
  return typeof status === 'string' && (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
}

/**
 * The invoice's own stored mode, with back-compat for every invoice written
 * before `hostingMode` existed.
 *
 * Back-compat table (hostingMode empty):
 *   allowCarePlanUpsell === false          → hidden
 *   allowCarePlanUpsell === true / missing → offer   (the old page used
 *                                            `!== false`, so a missing value
 *                                            has always meant "show it")
 */
export function deriveHostingMode(invoice: {
  hostingMode?: string | null
  allowCarePlanUpsell?: boolean | null
}): HostingMode {
  if (isHostingMode(invoice.hostingMode)) return invoice.hostingMode
  return invoice.allowCarePlanUpsell === false ? 'hidden' : 'offer'
}

/**
 * What the /invoice page (and the checkout route) should actually do, after
 * the two hard suppressions:
 *
 *   - the invoice itself bills a subscription (stripeSubscriptionId set), or
 *   - the client already has an active/trialing subscription.
 *
 * Both collapse to `hidden`: never sell a second hosting plan to someone who
 * is already on one.
 */
export function effectiveHostingMode(input: {
  hostingMode?: string | null
  allowCarePlanUpsell?: boolean | null
  isSubscriptionInvoice?: boolean
  clientHasLiveSubscription?: boolean
}): HostingMode {
  if (input.isSubscriptionInvoice || input.clientHasLiveSubscription) return 'hidden'
  return deriveHostingMode(input)
}

/**
 * Defaults applied on invoice CREATE only. The operator can override the
 * select afterwards; nothing here ever re-runs on update.
 *
 *   client already has an active/trialing subscription → hidden
 *   else client's "Hosting agreed" is set              → included + that plan
 *   else                                                → hidden
 */
export function defaultHostingForNewInvoice(input: {
  clientHasLiveSubscription?: boolean
  hostingAgreed?: string | null
}): { hostingMode: HostingMode; suggestedCarePlan?: CarePlanSlug } {
  if (input.clientHasLiveSubscription) return { hostingMode: 'hidden' }
  const agreed = carePlanBySlug(input.hostingAgreed)
  if (agreed) return { hostingMode: 'included', suggestedCarePlan: agreed.slug }
  return { hostingMode: 'hidden' }
}

/** `allowCarePlanUpsell` mirror kept for the deprecated field + old readers. */
export function allowCarePlanUpsellFor(mode: HostingMode): boolean {
  return mode !== 'hidden'
}

/**
 * The exact consent sentence recorded against a recurring authorization.
 * Extracted verbatim from InvoiceClient so the `included` and `offer` modes
 * record byte-identical text, and so a test can pin it — this string is the
 * chargeback defense.
 */
export function carePlanConsentText(tier: CarePlanTier): string {
  return (
    `I authorize Black Hart Consulting LLC to charge ${formatUSD(tier.monthlyAmountCents)} per month ` +
    `to my saved payment method for the ${tier.name} plan, until I cancel. The first ${CARE_PLAN_TRIAL_DAYS} days are free: ` +
    `the first charge runs ${CARE_PLAN_TRIAL_DAYS} days after this invoice is paid, and the same amount is charged every month after that. ` +
    `Cancellation is one-click via the Stripe customer portal or by emailing hello@blackhartconsulting.com.`
  )
}

/** The date of the first hosting charge if the invoice is paid on `from`. */
export function firstHostingChargeDate(from: Date = new Date()): Date {
  const d = new Date(from.getTime())
  d.setUTCDate(d.getUTCDate() + CARE_PLAN_TRIAL_DAYS)
  return d
}

export function formatHostingChargeDate(date: Date, timeZone = 'America/Chicago'): string {
  return date.toLocaleDateString('en-US', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Pure UI state for the pay button, shared by all three modes. Kept out of
 * the component so every branch is unit-testable without a DOM.
 *
 *   hidden   — nothing to authorize, pay is always available.
 *   offer    — hosting only rides along if the client ticks the add box, and
 *              then the authorization box gates the button.
 *   included — hosting rides along unless the client explicitly opts out via
 *              the "Pay the invoice without hosting" link, and the
 *              authorization box gates the button until they do.
 */
export function invoicePayState(input: {
  mode: HostingMode
  /** `offer` mode: the "Add a hosting plan" tick box. */
  addCarePlanChecked?: boolean
  /** Either mode: the authorization tick box. */
  authorized?: boolean
  /** `included` mode: the client took the "pay without hosting" escape hatch. */
  optedOutOfHosting?: boolean
}): { includesHosting: boolean; canPay: boolean; requiresAuthorization: boolean } {
  const authorized = Boolean(input.authorized)
  if (input.mode === 'hidden') {
    return { includesHosting: false, canPay: true, requiresAuthorization: false }
  }
  if (input.mode === 'offer') {
    const includesHosting = Boolean(input.addCarePlanChecked)
    return {
      includesHosting,
      canPay: !includesHosting || authorized,
      requiresAuthorization: includesHosting,
    }
  }
  const includesHosting = !input.optedOutOfHosting
  return {
    includesHosting,
    canPay: !includesHosting || authorized,
    requiresAuthorization: includesHosting,
  }
}

/**
 * Server-side guard for POST /api/checkout/start. Refuses to start a hosting
 * plan when one is already running, or when the invoice's mode says hosting
 * is not on offer — regardless of what the browser posted.
 *
 * Returns `null` when the request is fine, otherwise the HTTP status + the
 * message the client sees.
 */
export function hostingPlanRefusal(input: {
  /** The plan slug the browser asked for, or null when paying plain. */
  requestedPlan?: string | null
  mode: HostingMode
  clientHasLiveSubscription?: boolean
}): { status: number; error: string } | null {
  if (!input.requestedPlan) return null
  if (input.clientHasLiveSubscription) {
    return {
      status: 409,
      error:
        'You are already on a hosting plan with us, so we did not start a second one. ' +
        'Refresh this page to pay the invoice on its own, or reply to the invoice email if you want to change tiers.',
    }
  }
  if (input.mode === 'hidden') {
    return { status: 400, error: 'Hosting is not available on this invoice.' }
  }
  return null
}

/** One-line description of a mode, for admin confirmation dialogs + docs. */
export function hostingModeInPlainWords(mode: HostingMode, planName?: string | null): string {
  switch (mode) {
    case 'included':
      return `Hosting is included — ${planName ?? 'the selected plan'} starts when the client pays, and they authorize the monthly charge on the invoice page.`
    case 'offer':
      return 'Hosting is offered — the client can add a plan at checkout if they want one.'
    case 'hidden':
      return 'No hosting section — this invoice is a one-time charge only.'
  }
}
