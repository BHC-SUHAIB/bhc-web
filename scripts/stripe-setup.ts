/**
 * Idempotent Stripe Product + Price catalog initializer.
 *
 *   # Either pass the key inline …
 *   STRIPE_SECRET_KEY=sk_test_… npx tsx scripts/stripe-setup.ts
 *
 *   # … or load from .env (Node 20.6+):
 *   node --env-file=.env --import tsx scripts/stripe-setup.ts
 *
 * ── Invoice number scheme (set this in the Stripe Dashboard) ──────────
 *
 * Stripe auto-generates invoice numbers using the pattern:
 *   <prefix>-<sequential>     e.g.  ABCD12345-0001, ABCD12345-0002
 *
 * The prefix is account-wide and configurable in:
 *   Stripe Dashboard → Settings → Billing → Invoice template → Invoice prefix
 *
 * Recommended: set the prefix to "BHC" so invoices read like:
 *   BHC-0001, BHC-0002, …, BHC-0042
 *
 * For year-scoped numbering ("BHC-2026-0042"), Stripe doesn't support that
 * natively — you'd override invoice.number programmatically when calling
 * stripe.invoices.create({ ..., number: 'BHC-2026-0042' }). For now the
 * default scheme is fine; we display the Stripe-assigned number on the
 * branded /invoice/[id] page exactly as Stripe issued it.
 *
 * Run this once after creating your Stripe account, and again any time the
 * catalog in src/lib/care-plans.ts changes. The script:
 *
 *   - Looks up each Price by Stripe `lookup_key` (account-wide, so it finds
 *     prices created by scripts/pricing-reset/stripe-catalog.mts too)
 *   - If a Price already exists for that lookup_key, leaves it and its
 *     Product alone, even if the amount differs (it warns instead). The
 *     pricing-reset script owns the live hosting tiers (host_59m, care_129m,
 *     growth_395m); this script must never rename, re-price, or archive them.
 *   - Otherwise finds the Product by metadata.bhc_lookup_key or metadata.sku,
 *     creates it if missing, and creates the Price
 *   - Never deletes or archives anything, so existing subscriptions keep working
 *
 * Safe to re-run. Re-running with the same prices is a no-op.
 */
/* eslint-disable no-console */

import Stripe from 'stripe'
import { CARE_PLANS, BUILD_TIERS, ADDONS, SEO_RETAINERS } from '../src/lib/care-plans'

type CatalogItem = {
  lookupKey: string
  productName: string
  productDescription: string
  amountCents: number
  recurring: 'monthly' | null
  /** metadata.sku used by scripts/pricing-reset/stripe-catalog.mts for the same Product. */
  productSku?: string
}

const items: CatalogItem[] = [
  // Hosting tiers. Product names and SKUs match the pricing-reset catalog so
  // a fresh account ends up with the same objects either script would build.
  ...CARE_PLANS.map((p) => ({
    lookupKey: p.lookupKey,
    productName: p.name,
    productDescription: p.blurb,
    amountCents: p.monthlyAmountCents,
    recurring: 'monthly' as const,
    productSku: p.slug,
  })),
  ...BUILD_TIERS.map((t) => ({
    lookupKey: t.lookupKey,
    productName: t.name,
    productDescription: t.blurb,
    amountCents: t.amountCents,
    recurring: null,
  })),
  // Quick-win add-ons / productized fixes (one-time)
  ...ADDONS.map((a) => ({
    lookupKey: a.lookupKey,
    productName: a.name,
    productDescription: a.blurb,
    amountCents: a.amountCents,
    recurring: null,
  })),
  // SEO retainers (recurring monthly)
  ...SEO_RETAINERS.map((r) => ({
    lookupKey: r.lookupKey,
    productName: r.name,
    productDescription: r.blurb,
    amountCents: r.monthlyAmountCents,
    recurring: 'monthly' as const,
  })),
]

async function findProductId(stripe: Stripe, item: CatalogItem): Promise<string | null> {
  const byLookupKey = await stripe.products.search({
    query: `metadata['bhc_lookup_key']:'${item.lookupKey}'`,
    limit: 1,
  })
  if (byLookupKey.data.length > 0) return byLookupKey.data[0].id
  if (item.productSku) {
    const bySku = await stripe.products.search({
      query: `metadata['sku']:'${item.productSku}'`,
      limit: 1,
    })
    if (bySku.data.length > 0) return bySku.data[0].id
  }
  return null
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error('STRIPE_SECRET_KEY not set. Add it to .env or pass it inline.')
    process.exit(1)
  }
  const stripe = new Stripe(key, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  })

  console.log(`[stripe-setup] using ${key.startsWith('sk_live_') ? 'LIVE' : 'TEST'} mode`)

  for (const item of items) {
    console.log(`\n[stripe-setup] ${item.productName} (${item.lookupKey})`)

    // Lookup keys are unique per Stripe account, so check for the Price
    // first. If it exists (created here or by the pricing-reset script),
    // leave it and its Product untouched.
    const existingPrices = await stripe.prices.list({
      lookup_keys: [item.lookupKey],
      active: true,
      limit: 1,
    })
    if (existingPrices.data.length > 0) {
      const existing = existingPrices.data[0]
      const productId = typeof existing.product === 'string' ? existing.product : existing.product.id
      if (existing.unit_amount === item.amountCents) {
        console.log(`  price already in catalog: ${existing.id} on ${productId} ($${(existing.unit_amount! / 100).toFixed(2)})`)
      } else {
        console.warn(
          `  WARNING: ${item.lookupKey} exists at $${((existing.unit_amount ?? 0) / 100).toFixed(2)} but src/lib/care-plans.ts says $${(item.amountCents / 100).toFixed(2)}. ` +
            'Not touching it. Fix the catalog file or re-run scripts/pricing-reset/stripe-catalog.mts.',
        )
      }
      continue
    }

    // No Price yet: find or create the Product, then create the Price.
    let productId = await findProductId(stripe, item)
    if (productId) {
      console.log(`  existing product: ${productId}`)
    } else {
      const created = await stripe.products.create({
        name: item.productName,
        description: item.productDescription,
        metadata: {
          bhc_lookup_key: item.lookupKey,
          ...(item.productSku ? { sku: item.productSku } : {}),
        },
      })
      productId = created.id
      console.log(`  created product: ${productId}`)
    }

    const newPrice = await stripe.prices.create({
      product: productId,
      currency: 'usd',
      unit_amount: item.amountCents,
      lookup_key: item.lookupKey,
      ...(item.recurring === 'monthly'
        ? { recurring: { interval: 'month' } }
        : {}),
      metadata: { bhc_lookup_key: item.lookupKey },
    })
    console.log(`  created price: ${newPrice.id} ($${(item.amountCents / 100).toFixed(2)}${item.recurring ? '/mo' : ''})`)
  }

  console.log('\n[stripe-setup] done. Catalog is in sync with src/lib/care-plans.ts.')
}

main().catch((err) => {
  console.error('[stripe-setup] failed:', err)
  process.exit(1)
})
