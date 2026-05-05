// Single source of truth for the Care Plan catalog. The names + prices here
// are mirrored in three places:
//   1. The /pricing page rendering (kept in sync via Payload seed data)
//   2. Stripe Products/Prices (created by scripts/stripe-setup.ts using the
//      `lookupKey` field as Stripe's idempotent identifier)
//   3. Webhook + checkout code that resolves a tier slug to its Stripe Price
//
// To add or rename a tier: update this file, re-run the setup script, redeploy.
// Existing subscriptions on retired tiers keep working — Stripe never deletes
// archived prices, it just stops accepting new subscriptions on them.

export type CarePlanSlug = 'care' | 'growth' | 'scale'

export type CarePlanTier = {
  slug: CarePlanSlug
  name: string
  /** Stripe Product `lookup_key` — what we query by when minting subscriptions. */
  lookupKey: string
  /** Monthly price in cents (USD). */
  monthlyAmountCents: number
  /** Short marketing description rendered on /invoice/[id] toggle. */
  blurb: string
  /** Bullet-list of what's included, rendered on the upsell card. */
  inclusions: string[]
}

export const CARE_PLANS: readonly CarePlanTier[] = [
  {
    slug: 'care',
    name: 'Care',
    lookupKey: 'bhc_care_monthly',
    monthlyAmountCents: 14_900,
    blurb: 'Managed hosting + monitoring + backups, plus an hour a month for small edits.',
    inclusions: [
      'Managed hosting + monitoring + backups',
      'SSL, CDN, uptime monitoring',
      '1 hr/mo for small edits',
      'Monthly performance + uptime report',
      'Email support',
    ],
  },
  {
    slug: 'growth',
    name: 'Growth',
    lookupKey: 'bhc_growth_monthly',
    monthlyAmountCents: 49_500,
    blurb: 'Care, plus 4 hours a month of dev/SEO work and same-week change turnaround.',
    inclusions: [
      'Everything in Care',
      '4 hrs/mo of dev or SEO work',
      'Monthly strategy email',
      'Same-week turnaround on changes',
      'Slack / SMS channel',
    ],
  },
  {
    slug: 'scale',
    name: 'Scale',
    lookupKey: 'bhc_scale_monthly',
    monthlyAmountCents: 129_500,
    blurb: 'Growth, expanded to 10 hours a month with same-day SLA and quarterly architecture reviews.',
    inclusions: [
      'Everything in Growth',
      '10 hrs/mo of dev or SEO work',
      'Same-day SLA on small changes',
      'Quarterly architecture review',
    ],
  },
] as const

export function carePlanBySlug(slug: string | null | undefined): CarePlanTier | null {
  if (!slug) return null
  return CARE_PLANS.find((p) => p.slug === slug) ?? null
}

export function carePlanByLookupKey(key: string | null | undefined): CarePlanTier | null {
  if (!key) return null
  return CARE_PLANS.find((p) => p.lookupKey === key) ?? null
}

// One-time build tiers — kept here so Payment Links + the /pay routes can
// resolve a slug to a Stripe price the same way Care Plans do.
export type BuildTierSlug = 'single-page' | 'starter-site' | 'pro-site'

export type BuildTier = {
  slug: BuildTierSlug
  name: string
  lookupKey: string
  amountCents: number
  blurb: string
}

export const BUILD_TIERS: readonly BuildTier[] = [
  {
    slug: 'single-page',
    name: 'Single Page',
    lookupKey: 'bhc_single_page',
    amountCents: 79_500,
    blurb: 'One conversion-focused page, 5-day build.',
  },
  {
    slug: 'starter-site',
    name: 'Starter Site',
    lookupKey: 'bhc_starter_site',
    amountCents: 149_500,
    blurb: 'Up to 5 bespoke pages, 14-day build.',
  },
  {
    slug: 'pro-site',
    name: 'The Pro Site',
    lookupKey: 'bhc_pro_site',
    amountCents: 350_000,
    blurb: 'Up to 12 bespoke pages, 21-day build.',
  },
] as const

export function buildTierBySlug(slug: string | null | undefined): BuildTier | null {
  if (!slug) return null
  return BUILD_TIERS.find((t) => t.slug === slug) ?? null
}

// Productized fixes / quick-win add-ons. One-time fixed-price packages
// shown on /services. Kept separate from BUILD_TIERS so the
// CarePlan-vs-BuildTier vs add-on distinction stays clean in flows
// that only operate on the primary tiers.
export type AddonSlug =
  | 'gbp-setup'
  | 'site-speed-sprint'
  | 'schema-pack'
  | 'ga4-setup'
  | 'seo-refresh-5-page'
  | 'mobile-audit'
  | 'local-seo-sprint'

export type Addon = {
  slug: AddonSlug
  name: string
  lookupKey: string
  amountCents: number
  blurb: string
}

export const ADDONS: readonly Addon[] = [
  {
    slug: 'gbp-setup',
    name: 'Google Business Profile Setup',
    lookupKey: 'bhc_addon_gbp_setup',
    amountCents: 29_500,
    blurb: 'Complete GBP setup or audit + repair. 3-day delivery.',
  },
  {
    slug: 'site-speed-sprint',
    name: 'Site Speed Sprint',
    lookupKey: 'bhc_addon_site_speed_sprint',
    amountCents: 69_500,
    blurb: 'Lighthouse + Core Web Vitals optimization. 5-day delivery.',
  },
  {
    slug: 'schema-pack',
    name: 'Schema Markup Pack',
    lookupKey: 'bhc_addon_schema_pack',
    amountCents: 39_500,
    blurb: 'LocalBusiness, Service, FAQ, Breadcrumb schema. 3-day delivery.',
  },
  {
    slug: 'ga4-setup',
    name: 'GA4 + Conversion Tracking Setup',
    lookupKey: 'bhc_addon_ga4_setup',
    amountCents: 39_500,
    blurb: 'GA4 + GTM + Google Ads conversions wired end-to-end. 3-day delivery.',
  },
  {
    slug: 'seo-refresh-5-page',
    name: '5-Page SEO Refresh',
    lookupKey: 'bhc_addon_seo_refresh_5_page',
    amountCents: 69_500,
    blurb: 'Targeted SEO updates to 5 priority pages. 7-day delivery.',
  },
  {
    slug: 'mobile-audit',
    name: 'Mobile Audit + Fix',
    lookupKey: 'bhc_addon_mobile_audit',
    amountCents: 59_500,
    blurb: 'Real-device mobile audit + on-the-spot fixes. 5-day delivery.',
  },
  {
    slug: 'local-seo-sprint',
    name: 'Local SEO Sprint',
    lookupKey: 'bhc_addon_local_seo_sprint',
    amountCents: 119_500,
    blurb: 'Full local SEO setup as a one-time engagement. 2-week delivery.',
  },
] as const

export function addonBySlug(slug: string | null | undefined): Addon | null {
  if (!slug) return null
  return ADDONS.find((a) => a.slug === slug) ?? null
}

// Recurring SEO retainers — separate from CARE_PLANS so the Care Plan
// signup flow doesn't accidentally surface them as Care tiers, and so
// webhook handlers can label them correctly on the Subscription mirror.
export type SeoRetainerSlug = 'local-seo-monthly' | 'seo-growth'

export type SeoRetainer = {
  slug: SeoRetainerSlug
  name: string
  lookupKey: string
  monthlyAmountCents: number
  blurb: string
}

export const SEO_RETAINERS: readonly SeoRetainer[] = [
  {
    slug: 'local-seo-monthly',
    name: 'Local SEO Monthly',
    lookupKey: 'bhc_seo_local_monthly',
    monthlyAmountCents: 39_500,
    blurb: 'Single-location service businesses competing locally.',
  },
  {
    slug: 'seo-growth',
    name: 'SEO Growth',
    lookupKey: 'bhc_seo_growth_monthly',
    monthlyAmountCents: 89_500,
    blurb: 'Full-stack SEO: monthly content, internal linking, AI-search optimization.',
  },
] as const

export function seoRetainerBySlug(slug: string | null | undefined): SeoRetainer | null {
  if (!slug) return null
  return SEO_RETAINERS.find((r) => r.slug === slug) ?? null
}

export function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
