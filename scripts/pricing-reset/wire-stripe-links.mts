/* eslint-disable @typescript-eslint/no-explicit-any */
/* Phase 5b wiring: read docs/pricing-reset/stripe-catalog.<mode>.json and
 * write each payment-link URL into the matching pricing tier's checkoutHref /
 * subscribeHref and each bundle's checkoutHref, across all pages and landing
 * pages. Idempotent; leaves tiers without a catalog entry untouched (they
 * keep falling back to the contact link).
 *
 *   npx tsx scripts/pricing-reset/wire-stripe-links.mts          # test json -> local DB
 *   npx tsx scripts/pricing-reset/wire-stripe-links.mts --live   # live json (for the prod run)
 */

process.env.SEED_ON_BOOT = 'false'

import fs from 'node:fs'
import path from 'node:path'
import nextEnv from '@next/env'
const envMod = (nextEnv as { loadEnvConfig?: (d: string) => void }).loadEnvConfig
  ? (nextEnv as { loadEnvConfig: (d: string) => void })
  : (nextEnv as unknown as { default: { loadEnvConfig: (d: string) => void } }).default
envMod.loadEnvConfig(process.cwd())

const MODE = process.argv.includes('--live') ? 'live' : 'test'
const catalogPath = path.join(process.cwd(), 'docs', 'pricing-reset', `stripe-catalog.${MODE}.json`)
if (!fs.existsSync(catalogPath)) {
  console.error(`Missing ${catalogPath}. Run stripe-catalog.mts first.`)
  process.exit(1)
}
const catalog: Record<string, { url?: string }> = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

const dbUri = process.env.DATABASE_URI || 'file:./payload.db'
if (/^postgres(ql)?:\/\//.test(dbUri) && !process.argv.includes('--allow-non-local')) {
  console.error('Refusing to run against a postgres DATABASE_URI without --allow-non-local.')
  process.exit(1)
}
if (MODE === 'test' && /^postgres(ql)?:\/\//.test(dbUri)) {
  console.error('Test-mode URLs must not be written to a postgres (prod) database.')
  process.exit(1)
}

const kebab = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const tierSlug = (t: any) => t?.cta?.href?.match(/[?&]tier=([a-z0-9-]+)/i)?.[1] ?? kebab(t?.name ?? '')

async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  let wired = 0

  const wireLayout = (layout: any[]): { layout: any[]; changed: boolean } => {
    let changed = false
    const next = layout.map((b: any) => {
      if (b.blockType === 'pricing' && Array.isArray(b.tiers)) {
        const tiers = b.tiers.map((t: any) => {
          const slug = tierSlug(t)
          const buy = catalog[slug]?.url
          const sub = t.subscribePrice ? catalog[`${slug}-subscribe`]?.url : undefined
          if ((buy && t.checkoutHref !== buy) || (sub && t.subscribeHref !== sub)) {
            changed = true
            wired++
            return { ...t, ...(buy ? { checkoutHref: buy } : {}), ...(sub ? { subscribeHref: sub } : {}) }
          }
          return t
        })
        return { ...b, tiers }
      }
      if (b.blockType === 'bundleOffer' && Array.isArray(b.bundles)) {
        const bundles = b.bundles.map((bundle: any) => {
          const url = catalog[`bundle-${kebab(bundle.name ?? '')}`]?.url
          if (url && bundle.checkoutHref !== url) { changed = true; wired++; return { ...bundle, checkoutHref: url } }
          return bundle
        })
        return { ...b, bundles }
      }
      return b
    })
    return { layout: next, changed }
  }

  for (const collection of ['pages', 'landingPages'] as const) {
    const res = await payload.find({ collection, limit: 200, draft: true })
    for (const doc of res.docs as any[]) {
      const { layout, changed } = wireLayout(doc.layout ?? [])
      if (changed) {
        await payload.update({ collection, id: doc.id, data: { layout } as any })
        console.log(`${collection}/${doc.slug}: wired`)
      }
    }
  }

  console.log(`done: ${wired} hrefs written from stripe-catalog.${MODE}.json`)
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
