// Stripe Payment Link registry, one URL per SKU slug. Values stay empty until
// the Phase 5b catalog script writes the live links (they are also written into
// the CMS pricing tiers' checkoutHref/subscribeHref, which is what the site
// renders). Renderers fall back to the contact link whenever a URL is empty,
// so the site works before any Stripe link exists.
//
// Env override: STRIPE_LINK_<SLUG_IN_SCREAMING_SNAKE> replaces the entry at
// runtime, e.g. STRIPE_LINK_STARTER_SITE=https://buy.stripe.com/...

export const STRIPE_LINK_SKUS = [
  'launch-page',
  'starter-site',
  'starter-site-subscribe',
  'pro-site',
  'pro-site-subscribe',
  'host',
  'care',
  'growth',
  'seo-sprint',
  'seo-monthly',
  'front-desk-setup',
  'front-desk-basic',
  'front-desk-plus',
  'front-desk-pro',
  'automation-sprint',
  'automation-run',
  'internal-tool-hosting',
  'bundle-open-for-business',
  'bundle-booked-solid',
  'site-health-sprint',
  'gbp-setup',
  'schema-pack',
  'ga4-setup',
  'speed-sprint',
  'mobile-fix',
  'seo-refresh',
] as const

export type StripeLinkSku = (typeof STRIPE_LINK_SKUS)[number]

const EMPTY_LINKS: Record<StripeLinkSku, string> = Object.fromEntries(
  STRIPE_LINK_SKUS.map((sku) => [sku, '']),
) as Record<StripeLinkSku, string>

export function stripeLink(sku: StripeLinkSku): string {
  const envKey = `STRIPE_LINK_${sku.toUpperCase().replace(/-/g, '_')}`
  return process.env[envKey] || EMPTY_LINKS[sku] || ''
}
