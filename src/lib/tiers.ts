// Single source of truth for the SKU catalog surfaced through `?tier=` links.
// The contact form reads the param, pre-selects the matching project type, and
// shows the one-line summary. The /thanks page uses `value` for the purchase
// dataLayer event. Prices here are display context only; the canonical price
// lives in the CMS pricing blocks and in Stripe.

export type TierProjectType =
  | 'website'
  | 'ai-front-desk'
  | 'automation'
  | 'internal-tool'
  | 'seo'
  | 'fix-it'
  | 'other'

export type TierInfo = {
  slug: string
  label: string
  projectType: TierProjectType
  summary: string
  /** USD value pushed with the purchase event on /thanks. */
  value: number
}

export const TIERS: Record<string, TierInfo> = {
  'launch-page': {
    slug: 'launch-page',
    label: 'Launch Page',
    projectType: 'website',
    summary: 'One conversion-focused page, live in 3 days, $399.',
    value: 399,
  },
  'starter-site': {
    slug: 'starter-site',
    label: 'Starter Site',
    projectType: 'website',
    summary: 'Up to 5 pages on an editable CMS, live in 7 days, $699 or $119 a month.',
    value: 699,
  },
  'pro-site': {
    slug: 'pro-site',
    label: 'Pro Site',
    projectType: 'website',
    summary: 'Up to 12 pages with blog and case studies, live in 14 days, $1,795 or $249 a month.',
    value: 1795,
  },
  'custom-build': {
    slug: 'custom-build',
    label: 'Custom Build',
    projectType: 'website',
    summary: 'Written scope first, fixed proposal in 48 hours, from $5,000.',
    value: 5000,
  },
  host: {
    slug: 'host',
    label: 'Host',
    projectType: 'website',
    summary: 'Managed hosting with backups, monitoring, and 30 minutes of edits, $59 a month.',
    value: 59,
  },
  care: {
    slug: 'care',
    label: 'Care',
    projectType: 'website',
    summary: 'Hosting plus 2 hours of edits and a monthly report, $129 a month.',
    value: 129,
  },
  growth: {
    slug: 'growth',
    label: 'Growth',
    projectType: 'website',
    summary: 'Hosting plus 6 hours of development or SEO a month, $395 a month.',
    value: 395,
  },
  'seo-sprint': {
    slug: 'seo-sprint',
    label: 'Local SEO + AI Search Sprint',
    projectType: 'seo',
    summary: 'Audit, Google Business Profile, citations, schema, and llms.txt in 10 days, $449 one-time.',
    value: 449,
  },
  'seo-monthly': {
    slug: 'seo-monthly',
    label: 'Local SEO + AI Search Monthly',
    projectType: 'seo',
    summary: 'Weekly GBP posts, citations, one article, and a ranking report, $295 a month.',
    value: 295,
  },
  'front-desk-setup': {
    slug: 'front-desk-setup',
    label: 'AI Front Desk Setup',
    projectType: 'ai-front-desk',
    summary: 'Script, voice, booking, and missed-call text-back, live in 5 days, $299 one-time.',
    value: 299,
  },
  'front-desk-basic': {
    slug: 'front-desk-basic',
    label: 'Front Desk Basic',
    projectType: 'ai-front-desk',
    summary: '300 minutes of 24/7 answering and booking, $149 a month.',
    value: 149,
  },
  'front-desk-plus': {
    slug: 'front-desk-plus',
    label: 'Front Desk Plus',
    projectType: 'ai-front-desk',
    summary: '750 minutes with calendar and CRM sync, $249 a month.',
    value: 249,
  },
  'front-desk-pro': {
    slug: 'front-desk-pro',
    label: 'Front Desk Pro',
    projectType: 'ai-front-desk',
    summary: '1,500 minutes, multi-line, priority changes, $399 a month.',
    value: 399,
  },
  'automation-sprint': {
    slug: 'automation-sprint',
    label: 'Automation Sprint',
    projectType: 'automation',
    summary: 'One workflow specced, built, and tested in 7 days, $799.',
    value: 799,
  },
  'automation-run': {
    slug: 'automation-run',
    label: 'Automation Run',
    projectType: 'automation',
    summary: 'Hosting, monitoring, and small fixes for all your workflows, $79 a month.',
    value: 79,
  },
  'internal-tool': {
    slug: 'internal-tool',
    label: 'Internal Tool',
    projectType: 'internal-tool',
    summary: 'A scoped internal tool in 2 to 3 weeks, from $2,500 plus $99 a month hosting.',
    value: 2500,
  },
  'fix-it': {
    slug: 'fix-it',
    label: 'Fix-it menu',
    projectType: 'fix-it',
    summary: 'One problem, one price, done this week. Tell us which fix you need.',
    value: 249,
  },
  'site-health-sprint': {
    slug: 'site-health-sprint',
    label: 'Site Health Sprint',
    projectType: 'fix-it',
    summary: 'Free audit, then 3 fixes from the menu in 5 days, $249.',
    value: 249,
  },
  'gbp-setup': {
    slug: 'gbp-setup',
    label: 'Google Business Profile Setup',
    projectType: 'fix-it',
    summary: 'Profile audit, complete setup, and a 30-directory NAP check in 3 days, $195.',
    value: 195,
  },
  'schema-pack': {
    slug: 'schema-pack',
    label: 'Schema Markup Pack',
    projectType: 'fix-it',
    summary: 'LocalBusiness, Service, FAQ, and Article schema, validated, in 3 days, $195.',
    value: 195,
  },
  'ga4-setup': {
    slug: 'ga4-setup',
    label: 'GA4 + Conversion Tracking',
    projectType: 'fix-it',
    summary: 'GA4, GTM events, and Google Ads conversion link with proof of firing, 3 days, $195.',
    value: 195,
  },
  'speed-sprint': {
    slug: 'speed-sprint',
    label: 'Site Speed Sprint',
    projectType: 'fix-it',
    summary: 'Core Web Vitals audit and fixes with a before-and-after report, 5 days, $395.',
    value: 395,
  },
  'mobile-fix': {
    slug: 'mobile-fix',
    label: 'Mobile Audit + Fix',
    projectType: 'fix-it',
    summary: 'Real-device testing and mobile fixes with a before-and-after report, 5 days, $395.',
    value: 395,
  },
  'seo-refresh': {
    slug: 'seo-refresh',
    label: '5-Page SEO Refresh',
    projectType: 'fix-it',
    summary: 'Titles, metas, schema, and internal links rewritten across 5 pages, 7 days, $395.',
    value: 395,
  },
  'bundle-open-for-business': {
    slug: 'bundle-open-for-business',
    label: 'Open for Business bundle',
    projectType: 'website',
    summary: 'Starter Site, Google Business Profile, and the AI Front Desk, $999 plus $149 a month.',
    value: 999,
  },
  'bundle-booked-solid': {
    slug: 'bundle-booked-solid',
    label: 'Booked Solid bundle',
    projectType: 'website',
    summary: 'Everything in Open for Business plus the SEO Sprint and one automation, $1,395 plus $149 a month.',
    value: 1395,
  },
}

export function getTier(slug?: string | null): TierInfo | null {
  if (!slug) return null
  return TIERS[slug] ?? null
}

/** Kebab-case a tier display name for `?tier=` links, e.g. "Launch Page" → "launch-page". */
export function tierSlugFromName(name?: string | null): string {
  return (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
