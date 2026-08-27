/* eslint-disable @typescript-eslint/no-explicit-any */
/* Phase 5b: build the Stripe catalog (products, prices, payment links) with
 * the key the Stripe CLI exposes after `stripe login`. Test mode by default;
 * pass --live only after the test-mode checklist passes and Suhaib says go.
 *
 *   npx tsx scripts/pricing-reset/stripe-catalog.mts          # test mode
 *   npx tsx scripts/pricing-reset/stripe-catalog.mts --live   # live mode
 *
 * Safety contract (ground rule 11):
 * - Idempotent: products looked up by metadata.sku, prices by lookup_key,
 *   payment links by metadata.sku; only missing objects are created.
 * - NOTHING without metadata.sku is ever created, updated, archived, or
 *   deleted. Pre-existing objects are read-only.
 * - Before the first write, every customer/subscription/product/price is
 *   snapshotted to docs/pricing-reset/stripe-before.<mode>.json; after the
 *   run, to stripe-after.<mode>.json, and the pre-existing objects are
 *   diffed. The diff must be empty and is printed.
 * - Output: docs/pricing-reset/stripe-catalog.<mode>.json keyed by SKU slug
 *   with product, price, and payment-link IDs and URLs.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Stripe from 'stripe'

const LIVE = process.argv.includes('--live')
const MODE = LIVE ? 'live' : 'test'
const SITE = 'https://blackhartconsulting.com'

// ── Key from the Stripe CLI (never asked for, never printed) ────────────────
// The CLI config can hold several profiles; use the [default] section, which
// `stripe login` writes (Black Hart Consulting LLC).
function cliKey(): string {
  const out = execFileSync('stripe', ['config', '--list'], { encoding: 'utf8' })
  const section = out.split(/^\[/m).find((s) => s.startsWith('default]'))
  if (!section) {
    console.error('No [default] profile in `stripe config --list`. Run `stripe login` first.')
    process.exit(1)
  }
  const re = LIVE ? /live_mode_api_key\s*=\s*'?([^'\n]+?)'?\s*$/m : /test_mode_api_key\s*=\s*'?([^'\n]+?)'?\s*$/m
  const m = section.match(re)
  if (!m) {
    console.error(`No ${MODE}-mode key in the default profile. Run \`stripe login\` first.`)
    process.exit(1)
  }
  const acct = section.match(/account_id\s*=\s*'?(acct_\w+)/)?.[1]
  console.log(`Using CLI default profile (account ${acct ?? 'unknown'})`)
  return m[1].trim()
}

const stripe = new Stripe(cliKey(), { apiVersion: '2024-12-18.acacia' as any })

// ── Catalog definition (facts table, amounts in cents) ─────────────────────

type PriceDef = {
  lookupKey: string
  sku: string            // slug used in metadata.sku + /thanks?sku=
  productSku: string     // products are shared between buy + subscribe paths
  productName: string
  line: 'websites' | 'hosting' | 'seo' | 'front-desk' | 'automation' | 'fix-it' | 'bundle'
  description: string
  amount: number
  interval?: 'month' | 'year'
  subDescription?: string
}

const MONTH_TO_MONTH = 'Month to month after the first 30 days.'
const SITE_SUB = '12-month term. You own the site at month 12, then hosting continues at $59 a month.'
const ANNUAL = 'Annual prepay: two months free.'

const P: PriceDef[] = [
  // One-time
  { lookupKey: 'launch_page_399', sku: 'launch-page', productSku: 'launch-page', productName: 'Launch Page', line: 'websites', description: 'One conversion-focused page, live in 3 days.', amount: 39900 },
  { lookupKey: 'starter_site_699', sku: 'starter-site', productSku: 'starter-site', productName: 'Starter Site', line: 'websites', description: 'Up to 5 pages on a block-based CMS, live in 7 days.', amount: 69900 },
  { lookupKey: 'pro_site_1795', sku: 'pro-site', productSku: 'pro-site', productName: 'Pro Site', line: 'websites', description: 'Up to 12 pages with full CMS, blog, and 30 days of SEO content, live in 14 days.', amount: 179500 },
  { lookupKey: 'seo_sprint_449', sku: 'seo-sprint', productSku: 'seo-sprint', productName: 'Local SEO + AI Search Sprint', line: 'seo', description: 'Audit, Google Business Profile setup, citations, schema, FAQ page, and llms.txt in 10 days.', amount: 44900 },
  { lookupKey: 'front_desk_setup_299', sku: 'front-desk-setup', productSku: 'front-desk-setup', productName: 'AI Front Desk Setup', line: 'front-desk', description: 'Script, voice, calendar booking, and missed-call text-back, live in 5 days.', amount: 29900 },
  { lookupKey: 'automation_sprint_799', sku: 'automation-sprint', productSku: 'automation-sprint', productName: 'Automation Sprint', line: 'automation', description: 'One workflow specced, built, and tested in 7 days.', amount: 79900 },
  { lookupKey: 'site_health_sprint_249', sku: 'site-health-sprint', productSku: 'site-health-sprint', productName: 'Site Health Sprint', line: 'fix-it', description: 'Three fixes from the menu in 5 days with a before-and-after report.', amount: 24900 },
  { lookupKey: 'gbp_setup_195', sku: 'gbp-setup', productSku: 'gbp-setup', productName: 'Google Business Profile Setup', line: 'fix-it', description: 'Profile audit, complete setup, and a 30-directory NAP check in 3 days.', amount: 19500 },
  { lookupKey: 'schema_pack_195', sku: 'schema-pack', productSku: 'schema-pack', productName: 'Schema Markup Pack', line: 'fix-it', description: 'LocalBusiness, Service, FAQ, Article, and Breadcrumb schema, validated, in 3 days.', amount: 19500 },
  { lookupKey: 'ga4_setup_195', sku: 'ga4-setup', productSku: 'ga4-setup', productName: 'GA4 + Conversion Tracking', line: 'fix-it', description: 'GA4, GTM events, and Google Ads conversion link with proof of firing, in 3 days.', amount: 19500 },
  { lookupKey: 'speed_sprint_395', sku: 'speed-sprint', productSku: 'speed-sprint', productName: 'Site Speed Sprint', line: 'fix-it', description: 'Core Web Vitals audit and fixes with a before-and-after report, in 5 days.', amount: 39500 },
  { lookupKey: 'mobile_fix_395', sku: 'mobile-fix', productSku: 'mobile-fix', productName: 'Mobile Audit + Fix', line: 'fix-it', description: 'Real-device mobile testing and fixes with a before-and-after report, in 5 days.', amount: 39500 },
  { lookupKey: 'seo_refresh_395', sku: 'seo-refresh', productSku: 'seo-refresh', productName: '5-Page SEO Refresh', line: 'fix-it', description: 'Titles, metas, schema, and internal links rewritten across 5 pages in 7 days.', amount: 39500 },
  { lookupKey: 'bundle_open_for_business_999', sku: 'bundle-open-for-business', productSku: 'bundle-open-for-business', productName: 'Open for Business Bundle', line: 'bundle', description: 'Starter Site, Google Business Profile setup, and AI Front Desk setup.', amount: 99900 },
  { lookupKey: 'bundle_booked_solid_1395', sku: 'bundle-booked-solid', productSku: 'bundle-booked-solid', productName: 'Booked Solid Bundle', line: 'bundle', description: 'Everything in Open for Business plus the SEO Sprint and one Automation Sprint.', amount: 139500 },

  // Monthly recurring
  { lookupKey: 'starter_site_sub_119m', sku: 'starter-site-subscribe', productSku: 'starter-site', productName: 'Starter Site', line: 'websites', description: 'Up to 5 pages on a block-based CMS, live in 7 days.', amount: 11900, interval: 'month', subDescription: SITE_SUB },
  { lookupKey: 'pro_site_sub_249m', sku: 'pro-site-subscribe', productSku: 'pro-site', productName: 'Pro Site', line: 'websites', description: 'Up to 12 pages with full CMS, blog, and 30 days of SEO content, live in 14 days.', amount: 24900, interval: 'month', subDescription: SITE_SUB },
  { lookupKey: 'host_59m', sku: 'host', productSku: 'host', productName: 'Host', line: 'hosting', description: 'Managed hosting, backups, monitoring, and 30 minutes of edits a month.', amount: 5900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'care_129m', sku: 'care', productSku: 'care', productName: 'Care', line: 'hosting', description: 'Hosting plus 2 hours of edits and a monthly traffic and calls report.', amount: 12900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'growth_395m', sku: 'growth', productSku: 'growth', productName: 'Growth', line: 'hosting', description: 'Hosting plus 6 hours of development or SEO a month.', amount: 39500, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'seo_monthly_295m', sku: 'seo-monthly', productSku: 'seo-monthly', productName: 'Local SEO + AI Search Monthly', line: 'seo', description: 'Weekly Google Business Profile posts, citations, one article, and a ranking report.', amount: 29500, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'front_desk_basic_149m', sku: 'front-desk-basic', productSku: 'front-desk-basic', productName: 'Front Desk Basic', line: 'front-desk', description: '300 minutes a month of 24/7 answering and booking.', amount: 14900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'front_desk_plus_249m', sku: 'front-desk-plus', productSku: 'front-desk-plus', productName: 'Front Desk Plus', line: 'front-desk', description: '750 minutes a month with calendar and CRM sync.', amount: 24900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'front_desk_pro_399m', sku: 'front-desk-pro', productSku: 'front-desk-pro', productName: 'Front Desk Pro', line: 'front-desk', description: '1,500 minutes a month, multi-line, priority changes.', amount: 39900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'front_desk_premium_voice_49m', sku: 'front-desk-premium-voice', productSku: 'front-desk-premium-voice', productName: 'Front Desk Premium Voice', line: 'front-desk', description: 'Premium voice add-on for the AI Front Desk.', amount: 4900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'automation_run_79m', sku: 'automation-run', productSku: 'automation-run', productName: 'Automation Run', line: 'automation', description: 'Hosting, monitoring, and small fixes for all your workflows.', amount: 7900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'internal_tool_hosting_99m', sku: 'internal-tool-hosting', productSku: 'internal-tool-hosting', productName: 'Internal Tool Hosting', line: 'automation', description: 'Hosting, backups, and 1 hour of changes a month for your internal tool.', amount: 9900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'bundle_open_for_business_149m', sku: 'bundle-open-for-business-monthly', productSku: 'bundle-open-for-business', productName: 'Open for Business Bundle', line: 'bundle', description: 'Hosting and Front Desk Basic for the Open for Business bundle.', amount: 14900, interval: 'month', subDescription: MONTH_TO_MONTH },
  { lookupKey: 'bundle_booked_solid_149m', sku: 'bundle-booked-solid-monthly', productSku: 'bundle-booked-solid', productName: 'Booked Solid Bundle', line: 'bundle', description: 'Hosting and Front Desk Basic for the Booked Solid bundle.', amount: 14900, interval: 'month', subDescription: MONTH_TO_MONTH },

  // Yearly recurring (two months free)
  { lookupKey: 'host_590y', sku: 'host-annual', productSku: 'host', productName: 'Host', line: 'hosting', description: 'Managed hosting, backups, monitoring, and 30 minutes of edits a month.', amount: 59000, interval: 'year', subDescription: ANNUAL },
  { lookupKey: 'care_1290y', sku: 'care-annual', productSku: 'care', productName: 'Care', line: 'hosting', description: 'Hosting plus 2 hours of edits and a monthly traffic and calls report.', amount: 129000, interval: 'year', subDescription: ANNUAL },
  { lookupKey: 'seo_monthly_2950y', sku: 'seo-monthly-annual', productSku: 'seo-monthly', productName: 'Local SEO + AI Search Monthly', line: 'seo', description: 'Weekly Google Business Profile posts, citations, one article, and a ranking report.', amount: 295000, interval: 'year', subDescription: ANNUAL },
  { lookupKey: 'front_desk_basic_1490y', sku: 'front-desk-basic-annual', productSku: 'front-desk-basic', productName: 'Front Desk Basic', line: 'front-desk', description: '300 minutes a month of 24/7 answering and booking.', amount: 149000, interval: 'year', subDescription: ANNUAL },
  { lookupKey: 'front_desk_plus_2490y', sku: 'front-desk-plus-annual', productSku: 'front-desk-plus', productName: 'Front Desk Plus', line: 'front-desk', description: '750 minutes a month with calendar and CRM sync.', amount: 249000, interval: 'year', subDescription: ANNUAL },
  { lookupKey: 'front_desk_pro_3990y', sku: 'front-desk-pro-annual', productSku: 'front-desk-pro', productName: 'Front Desk Pro', line: 'front-desk', description: '1,500 minutes a month, multi-line, priority changes.', amount: 399000, interval: 'year', subDescription: ANNUAL },
]

// ── Helpers ────────────────────────────────────────────────────────────────

const outDir = path.join(process.cwd(), 'docs', 'pricing-reset')
const write = (name: string, data: unknown) =>
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2))

async function listAll<T>(fn: (params: any) => Stripe.ApiListPromise<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of fn({ limit: 100 })) items.push(item as T)
  return items
}

async function snapshot() {
  const [customers, subscriptions, products, prices] = await Promise.all([
    listAll<Stripe.Customer>((p) => stripe.customers.list(p)),
    listAll<Stripe.Subscription>((p) => stripe.subscriptions.list({ ...p, status: 'all' })),
    listAll<Stripe.Product>((p) => stripe.products.list(p)),
    listAll<Stripe.Price>((p) => stripe.prices.list(p)),
  ])
  return { customers, subscriptions, products, prices }
}

// Compare the pre-existing objects between two snapshots; new objects created
// by this run (metadata.sku present, id not in the before set) are excluded.
function diffPreExisting(before: any, after: any): string[] {
  const problems: string[] = []
  for (const kind of ['customers', 'subscriptions', 'products', 'prices'] as const) {
    const beforeById = new Map(before[kind].map((o: any) => [o.id, o]))
    for (const [id, prev] of beforeById) {
      const now = after[kind].find((o: any) => o.id === id)
      if (!now) { problems.push(`${kind}/${id}: MISSING after run`); continue }
      const a = JSON.stringify(prev)
      const b = JSON.stringify(now)
      if (a !== b) problems.push(`${kind}/${id}: CHANGED`)
    }
  }
  return problems
}

async function main() {
  console.log(`Mode: ${MODE}`)

  // Snapshot before any write.
  const before = await snapshot()
  write(`stripe-before.${MODE}.json`, before)
  console.log(`before: ${before.customers.length} customers, ${before.subscriptions.length} subscriptions, ${before.products.length} products, ${before.prices.length} prices`)
  const pm = before.subscriptions.find((s: any) => JSON.stringify(s).toLowerCase().includes('prometheus'))
  console.log(pm ? `Prometheus Minds subscription present: ${pm.id} (${pm.status})` : 'note: no subscription matching "prometheus" found in this mode')

  // Terms-of-service consent only if a terms URL is set in public details.
  let requireTos = false
  try {
    const acct = await stripe.accounts.retrieve()
    requireTos = !!(acct.settings?.card_payments || true) && !!(acct as any).business_profile?.url && !!(acct.settings as any)?.terms_of_service?.url
  } catch { /* restricted key may not read the account; skip */ }
  if (!requireTos) console.log('consent_collection.terms_of_service skipped (no terms URL confirmed); see CHECKLIST')

  // Existing lookups
  const productsBySku = new Map<string, Stripe.Product>()
  for (const p of before.products) if ((p as any).metadata?.sku) productsBySku.set((p as any).metadata.sku, p as any)
  const pricesByLookup = new Map<string, Stripe.Price>()
  for (const pr of before.prices) if (pr.lookup_key) pricesByLookup.set(pr.lookup_key, pr)
  const links = await listAll<Stripe.PaymentLink>((p) => stripe.paymentLinks.list(p))
  const linksBySku = new Map<string, Stripe.PaymentLink>()
  for (const l of links) if ((l as any).metadata?.sku) linksBySku.set((l as any).metadata.sku, l)

  const catalog: Record<string, { productId: string; priceId: string; paymentLinkId?: string; url?: string; lookupKey: string }> = {}

  for (const def of P) {
    // Product (shared across buy/subscribe paths)
    let product = productsBySku.get(def.productSku)
    if (!product) {
      product = await stripe.products.create({
        name: def.productName,
        description: def.description,
        statement_descriptor: 'BLACK HART',
        metadata: { sku: def.productSku, line: def.line },
      })
      productsBySku.set(def.productSku, product)
      console.log(`product created: ${def.productSku} (${product.id})`)
    }

    // Price
    let price = pricesByLookup.get(def.lookupKey)
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: def.amount,
        lookup_key: def.lookupKey,
        ...(def.interval ? { recurring: { interval: def.interval } } : {}),
        metadata: { sku: def.sku },
      })
      pricesByLookup.set(def.lookupKey, price)
      console.log(`price created: ${def.lookupKey} (${price.id})`)
    }

    // Payment link (one per price)
    let link = linksBySku.get(def.sku)
    if (!link) {
      link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        after_completion: { type: 'redirect', redirect: { url: `${SITE}/thanks?sku=${def.sku}` } },
        phone_number_collection: { enabled: true },
        billing_address_collection: 'auto',
        allow_promotion_codes: false,
        metadata: { sku: def.sku },
        ...(def.interval && def.subDescription ? { subscription_data: { description: def.subDescription } } : {}),
        ...(requireTos ? { consent_collection: { terms_of_service: 'required' } } : {}),
        custom_text: { submit: { message: 'You will get the intake form by email within one business day.' } },
      })
      linksBySku.set(def.sku, link)
      console.log(`payment link created: ${def.sku}`)
    }

    catalog[def.sku] = { productId: product.id, priceId: price.id, paymentLinkId: link.id, url: link.url, lookupKey: def.lookupKey }
  }

  write(`stripe-catalog.${MODE}.json`, catalog)
  console.log(`catalog written: docs/pricing-reset/stripe-catalog.${MODE}.json (${Object.keys(catalog).length} SKUs)`)

  // Snapshot after + diff of pre-existing objects (must be empty).
  const after = await snapshot()
  write(`stripe-after.${MODE}.json`, after)
  const problems = diffPreExisting(before, after)
  if (problems.length) {
    console.error('PRE-EXISTING OBJECT DIFF IS NOT EMPTY:')
    for (const p of problems) console.error('  ' + p)
    process.exit(1)
  }
  console.log('pre-existing object diff: EMPTY (nothing modified)')
  if (pm) {
    const pmAfter = after.subscriptions.find((s: any) => s.id === (pm as any).id)
    console.log(pmAfter && JSON.stringify(pmAfter) === JSON.stringify(pm)
      ? 'Prometheus Minds subscription: unchanged'
      : 'WARNING: Prometheus Minds subscription differs; inspect stripe-after JSON')
  }
  console.log(`counts after: ${after.products.length} products, ${after.prices.length} prices (expected +${P.length} prices on a fresh run)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
