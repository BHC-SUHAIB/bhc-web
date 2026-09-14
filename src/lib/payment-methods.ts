// Payment method types offered on Stripe Checkout.
//
// Driven by the STRIPE_PAYMENT_METHOD_TYPES env var (comma-separated) so the
// checkout route and the invoice page copy always agree on what is on offer.
// Listing a method that is not enabled on the Stripe account makes Checkout
// error, so the defaults match a freshly onboarded BHC account. To turn on
// Affirm later, append `,affirm` to the env var. No code change needed.

export type PaymentMethodType =
  | 'card'
  | 'us_bank_account'
  | 'klarna'
  | 'affirm'
  | 'link'
  | 'cashapp'
  | 'amazon_pay'

export const DEFAULT_PAYMENT_METHOD_TYPES: readonly PaymentMethodType[] = [
  'card',
  'us_bank_account',
  'klarna',
  'link',
  'cashapp',
]

// Server-only in practice: reads process.env. Client components should
// receive the resolved list as a prop and use the pure formatters below.
export function getPaymentMethodTypes(
  raw: string | undefined = process.env.STRIPE_PAYMENT_METHOD_TYPES,
): PaymentMethodType[] {
  const trimmed = raw?.trim()
  if (!trimmed) return [...DEFAULT_PAYMENT_METHOD_TYPES]
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as PaymentMethodType[]
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  card: 'Card',
  us_bank_account: 'ACH',
  klarna: 'Klarna',
  affirm: 'Affirm',
  link: 'Link',
  cashapp: 'Cash App Pay',
  amazon_pay: 'Amazon Pay',
}

export function paymentMethodLabel(type: string): string {
  return PAYMENT_METHOD_LABELS[type as PaymentMethodType] ?? type
}

// "Card, ACH, Klarna, and Link" (Oxford comma, configurable conjunction).
export function formatPaymentMethodList(
  types: readonly string[],
  conjunction: 'and' | 'or' = 'and',
): string {
  const labels = types.map(paymentMethodLabel)
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} ${conjunction} ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, ${conjunction} ${labels[labels.length - 1]}`
}

// Buy-now-pay-later methods cannot be saved for off-session charges, which
// is why the Care Plan flow needs a secondary card-capture step after them.
const BNPL_PAYMENT_METHOD_TYPES: ReadonlySet<string> = new Set(['klarna', 'affirm'])

export function bnplPaymentMethods(types: readonly string[]): string[] {
  return types.filter((t) => BNPL_PAYMENT_METHOD_TYPES.has(t))
}
