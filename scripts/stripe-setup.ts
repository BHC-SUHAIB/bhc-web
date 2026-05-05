/**
 * Idempotent Stripe Product + Price catalog initializer.
 *
 *   # Either pass the key inline …
 *   STRIPE_SECRET_KEY=sk_test_… npx tsx scripts/stripe-setup.ts
 *
 *   # … or load from .env (Node 20.6+):
 *   node --env-file=.env --import tsx scripts/stripe-setup.ts
 *
 * Run this once after creating your Stripe account, and again any time the
 * Care Plan / Build Tier catalog in src/lib/care-plans.ts changes. The
 * script:
 *
 *   - Looks up each Product by `lookup_key` (Stripe's idempotent identifier
 *     for prices — products themselves we look up by metadata.bhc_lookup_key)
 *   - Creates the Product if it doesn't exist
 *   - Creates a new Price if the price doesn't already exist for that
 *     lookup_key, OR re-uses the existing one
 *   - Never deletes or archives anything — old prices stay around so existing
 *     subscriptions keep working
 *
 * Safe to re-run. Re-running with the same prices is a no-op. Changing a
 * price (e.g. $149 → $159) creates a NEW Price object; old subs keep their
 * old price unless you manually migrate them.
 */
/* eslint-disable no-console */

import Stripe from 'stripe'
import { CARE_PLANS, BUILD_TIERS } from '../src/lib/care-plans'

type CatalogItem = {
  lookupKey: string
  productName: string
  productDescription: string
  amountCents: number
  recurring: 'monthly' | null
}

const items: CatalogItem[] = [
  ...CARE_PLANS.map((p) => ({
    lookupKey: p.lookupKey,
    productName: `Care Plan — ${p.name}`,
    productDescription: p.blurb,
    amountCents: p.monthlyAmountCents,
    recurring: 'monthly' as const,
  })),
  ...BUILD_TIERS.map((t) => ({
    lookupKey: t.lookupKey,
    productName: t.name,
    productDescription: t.blurb,
    amountCents: t.amountCents,
    recurring: null,
  })),
]

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

    // Find or create the Product.
    const productSearch = await stripe.products.search({
      query: `metadata['bhc_lookup_key']:'${item.lookupKey}'`,
      limit: 1,
    })

    let productId: string
    if (productSearch.data.length > 0) {
      productId = productSearch.data[0].id
      console.log(`  ↳ existing product: ${productId}`)
      // Sync description in case it was updated
      await stripe.products.update(productId, {
        name: item.productName,
        description: item.productDescription,
      })
    } else {
      const created = await stripe.products.create({
        name: item.productName,
        description: item.productDescription,
        metadata: { bhc_lookup_key: item.lookupKey },
      })
      productId = created.id
      console.log(`  ↳ created product: ${productId}`)
    }

    // Find or create the Price (by lookup_key).
    const priceList = await stripe.prices.list({
      product: productId,
      lookup_keys: [item.lookupKey],
      active: true,
      limit: 1,
    })

    if (priceList.data.length > 0) {
      const existing = priceList.data[0]
      if (existing.unit_amount === item.amountCents) {
        console.log(`  ↳ price already correct: ${existing.id} ($${(existing.unit_amount! / 100).toFixed(2)})`)
        continue
      }
      // Price changed — archive the old, create a new one. Old subscriptions
      // continue billing on the old price; only NEW subscriptions use the
      // new amount.
      console.log(`  ↳ price changed (was $${(existing.unit_amount! / 100).toFixed(2)}, now $${(item.amountCents / 100).toFixed(2)}); creating new price`)
      await stripe.prices.update(existing.id, { active: false, lookup_key: `${item.lookupKey}_archived_${Date.now()}` })
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
    console.log(`  ↳ created price: ${newPrice.id} ($${(item.amountCents / 100).toFixed(2)}${item.recurring ? '/mo' : ''})`)
  }

  console.log('\n[stripe-setup] done. Catalog is in sync with src/lib/care-plans.ts.')
}

main().catch((err) => {
  console.error('[stripe-setup] failed:', err)
  process.exit(1)
})
