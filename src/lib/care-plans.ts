// Single source of truth for the Care Plan (hosting tier) catalog. The
// names + prices here mirror the live Stripe catalog built by
// scripts/pricing-reset/stripe-catalog.mts (see
// docs/pricing-reset/stripe-catalog.live.json) and are used in:
//   1. The /invoice/[id] upsell card and the /care-plan/setup picker
//   2. Webhook + checkout code that resolves a tier slug to its Stripe Price
//      via `lookupKey` (prices.list({ lookup_keys }))
//   3. Admin UI tier pickers (SendCarePlanSignupField, ChangeTierField)
//
// The pricing-reset script owns the Stripe objects for these lookup keys.
// scripts/stripe-setup.ts only fills in prices that are missing and never
// renames, archives, or re-prices a key that already exists.
//
// Existing subscriptions on retired tiers keep working: Stripe never
// deletes archived prices, it just stops accepting new subscriptions on
// them. `legacyLookupKeys` lets the webhook keep labelling those rows.

export type CarePlanSlug = 'host' | 'care' | 'growth'

/**
 * Every hosting tier starts with a free month: the subscription is created
 * with a 30-day trial, so the first charge runs 30 days after activation
 * and the same amount recurs every 30 days after that. Matches the public
 * "first month free" promise on /services and the bundle configurator.
 */
export const CARE_PLAN_TRIAL_DAYS = 30

export type CarePlanTier = {
  slug: CarePlanSlug
  name: string
  /** Stripe Price `lookup_key` (pricing-reset naming, e.g. host_59m). */
  lookupKey: string
  /** Retired lookup keys that should still resolve to this tier for existing subscriptions. */
  legacyLookupKeys: readonly string[]
  /** Monthly price in cents (USD). */
  monthlyAmountCents: number
  /** Short marketing description rendered on /invoice/[id] toggle. */
  blurb: string
  /** Bullet-list of what's included, rendered on the upsell card. */
  inclusions: string[]
}

export const CARE_PLANS: readonly CarePlanTier[] = [
  {
    slug: 'host',
    name: 'Host',
    lookupKey: 'host_59m',
    legacyLookupKeys: [],
    monthlyAmountCents: 5_900,
    blurb: 'Managed hosting, backups, monitoring, and 30 minutes of edits a month.',
    inclusions: [
      'Managed hosting',
      'Backups and monitoring',
      '30 minutes of edits a month',
    ],
  },
  {
    slug: 'care',
    name: 'Care',
    lookupKey: 'care_129m',
    legacyLookupKeys: ['bhc_care_monthly'],
    monthlyAmountCents: 12_900,
    blurb: 'Hosting plus 2 hours of edits and a monthly traffic and calls report.',
    inclusions: [
      'Everything in Host',
      '2 hours of edits a month',
      'Monthly traffic and calls report',
    ],
  },
  {
    slug: 'growth',
    name: 'Growth',
    lookupKey: 'growth_395m',
    legacyLookupKeys: ['bhc_growth_monthly'],
    monthlyAmountCents: 39_500,
    blurb: 'Hosting plus 6 hours of development or SEO a month.',
    inclusions: [
      'Everything in Care',
      '6 hours of development or SEO a month',
    ],
  },
] as const

export function carePlanBySlug(slug: string | null | undefined): CarePlanTier | null {
  if (!slug) return null
  return CARE_PLANS.find((p) => p.slug === slug) ?? null
}

export function carePlanByLookupKey(key: string | null | undefined): CarePlanTier | null {
  if (!key) return null
  return (
    CARE_PLANS.find((p) => p.lookupKey === key) ??
    CARE_PLANS.find((p) => p.legacyLookupKeys.includes(key)) ??
    null
  )
}

// One-time website builds. Slugs match src/lib/tiers.ts and the
// pricing-reset metadata.sku; lookup keys match the live Stripe prices in
// docs/pricing-reset/stripe-catalog.live.json.
export type BuildTierSlug = 'launch-page' | 'starter-site' | 'pro-site'

export type BuildTier = {
  slug: BuildTierSlug
  name: string
  lookupKey: string
  amountCents: number
  blurb: string
}

export const BUILD_TIERS: readonly BuildTier[] = [
  {
    slug: 'launch-page',
    name: 'Launch Page',
    lookupKey: 'launch_page_399',
    amountCents: 39_900,
    blurb: 'One conversion-focused page, live in 3 days.',
  },
  {
    slug: 'starter-site',
    name: 'Starter Site',
    lookupKey: 'starter_site_699',
    amountCents: 69_900,
    blurb: 'Up to 5 pages on a block-based CMS, live in 7 days.',
  },
  {
    slug: 'pro-site',
    name: 'Pro Site',
    lookupKey: 'pro_site_1795',
    amountCents: 179_500,
    blurb: 'Up to 12 pages with full CMS, blog, and 30 days of SEO content, live in 14 days.',
  },
] as const

export function buildTierBySlug(slug: string | null | undefined): BuildTier | null {
  if (!slug) return null
  return BUILD_TIERS.find((t) => t.slug === slug) ?? null
}

// Productized fixes / quick-win add-ons. One-time fixed-price packages
// shown on /services (the fix-it menu plus the Local SEO sprint). Kept
// separate from BUILD_TIERS so the CarePlan-vs-BuildTier vs add-on
// distinction stays clean in flows that only operate on the primary tiers.
export type AddonSlug =
  | 'site-health-sprint'
  | 'gbp-setup'
  | 'schema-pack'
  | 'ga4-setup'
  | 'speed-sprint'
  | 'mobile-fix'
  | 'seo-refresh'
  | 'seo-sprint'

export type Addon = {
  slug: AddonSlug
  name: string
  lookupKey: string
  amountCents: number
  blurb: string
}

export const ADDONS: readonly Addon[] = [
  {
    slug: 'site-health-sprint',
    name: 'Site Health Sprint',
    lookupKey: 'site_health_sprint_249',
    amountCents: 24_900,
    blurb: 'Three fixes from the menu in 5 days with a before-and-after report.',
  },
  {
    slug: 'gbp-setup',
    name: 'Google Business Profile Setup',
    lookupKey: 'gbp_setup_195',
    amountCents: 19_500,
    blurb: 'Profile audit, complete setup, and a 30-directory NAP check in 3 days.',
  },
  {
    slug: 'schema-pack',
    name: 'Schema Markup Pack',
    lookupKey: 'schema_pack_195',
    amountCents: 19_500,
    blurb: 'LocalBusiness, Service, FAQ, Article, and Breadcrumb schema, validated, in 3 days.',
  },
  {
    slug: 'ga4-setup',
    name: 'GA4 + Conversion Tracking',
    lookupKey: 'ga4_setup_195',
    amountCents: 19_500,
    blurb: 'GA4, GTM events, and Google Ads conversion link with proof of firing, in 3 days.',
  },
  {
    slug: 'speed-sprint',
    name: 'Site Speed Sprint',
    lookupKey: 'speed_sprint_395',
    amountCents: 39_500,
    blurb: 'Core Web Vitals audit and fixes with a before-and-after report, in 5 days.',
  },
  {
    slug: 'mobile-fix',
    name: 'Mobile Audit + Fix',
    lookupKey: 'mobile_fix_395',
    amountCents: 39_500,
    blurb: 'Real-device mobile testing and fixes with a before-and-after report, in 5 days.',
  },
  {
    slug: 'seo-refresh',
    name: '5-Page SEO Refresh',
    lookupKey: 'seo_refresh_395',
    amountCents: 39_500,
    blurb: 'Titles, metas, schema, and internal links rewritten across 5 pages in 7 days.',
  },
  {
    slug: 'seo-sprint',
    name: 'Local SEO + AI Search Sprint',
    lookupKey: 'seo_sprint_449',
    amountCents: 44_900,
    blurb: 'Audit, Google Business Profile setup, citations, schema, FAQ page, and llms.txt in 10 days.',
  },
] as const

export function addonBySlug(slug: string | null | undefined): Addon | null {
  if (!slug) return null
  return ADDONS.find((a) => a.slug === slug) ?? null
}

// Recurring SEO retainers. Separate from CARE_PLANS so the Care Plan
// signup flow doesn't accidentally surface them as hosting tiers, and so
// webhook handlers can label them correctly on the Subscription mirror.
// The live catalog has one SEO retainer; the old SEO Growth retainer was
// retired in the pricing reset.
export type SeoRetainerSlug = 'seo-monthly'

export type SeoRetainer = {
  slug: SeoRetainerSlug
  name: string
  lookupKey: string
  monthlyAmountCents: number
  blurb: string
}

export const SEO_RETAINERS: readonly SeoRetainer[] = [
  {
    slug: 'seo-monthly',
    name: 'Local SEO + AI Search Monthly',
    lookupKey: 'seo_monthly_295m',
    monthlyAmountCents: 29_500,
    blurb: 'Weekly Google Business Profile posts, citations, one article, and a ranking report.',
  },
] as const

export function seoRetainerBySlug(slug: string | null | undefined): SeoRetainer | null {
  if (!slug) return null
  return SEO_RETAINERS.find((r) => r.slug === slug) ?? null
}

export function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
