import Stripe from 'stripe'

// Single Stripe client used everywhere on the server. We pin a specific API
// version so behaviour doesn't change when Stripe ships breaking updates —
// upgrades become an explicit decision, never an accidental dependency drift.
//
// Bumping: when you upgrade, also test all webhook handlers, since payload
// shapes for `checkout.session.completed`, `invoice.paid`, and the
// `customer.subscription.*` family are all version-pinned by Stripe.

const STRIPE_API_VERSION = '2024-12-18.acacia' as const

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      '[stripe] STRIPE_SECRET_KEY is not set. Add it to your .env (sk_test_… for test mode, sk_live_… in prod).',
    )
  }
  cached = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    // Tag outgoing requests so they show up under "Black Hart Consulting"
    // in Stripe's logs/insights instead of "Custom Integration".
    appInfo: {
      name: 'Black Hart Consulting',
      url: 'https://blackhartconsulting.com',
    },
    // Auto-retry idempotent requests on 5xx — Stripe's network blips
    // shouldn't surface as user-visible errors.
    maxNetworkRetries: 2,
    timeout: 30_000,
  })
  return cached
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

// Reusable payment method types — these can be saved to a Customer and
// charged off-session for recurring billing. BNPL methods (klarna, affirm,
// afterpay_clearpay) cannot be saved, which is why we need the secondary
// card-capture flow when a client picks one for the invoice payment.
export const REUSABLE_PM_TYPES = new Set([
  'card',
  'us_bank_account',
  'sepa_debit',
  'link',
])

export function isReusablePaymentMethod(pm: Stripe.PaymentMethod | null | undefined): boolean {
  if (!pm) return false
  return REUSABLE_PM_TYPES.has(pm.type)
}
