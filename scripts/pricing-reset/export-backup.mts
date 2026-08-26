/* Read-only content backup for the pricing-reset work (ground rule 2).
 * Exports pages, landingPages, projects, testimonials, faqs and the
 * header/footer/siteSettings globals to backups/pricing-reset/<timestamp>/.
 *
 * Run locally: npx tsx scripts/pricing-reset/export-backup.mts
 * (Loads .env.local itself via @next/env, same as Next does.)
 */

import fs from 'node:fs'
import path from 'node:path'
import nextEnv from '@next/env'

const { loadEnvConfig } = (nextEnv as { loadEnvConfig?: typeof import('@next/env').loadEnvConfig }).loadEnvConfig
  ? (nextEnv as typeof import('@next/env'))
  : (nextEnv as unknown as { default: typeof import('@next/env') }).default
loadEnvConfig(process.cwd())

const COLLECTIONS = ['pages', 'landingPages', 'projects', 'testimonials', 'faqs'] as const
const GLOBALS = ['header', 'footer', 'siteSettings'] as const

async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.join(process.cwd(), 'backups', 'pricing-reset', stamp)
  fs.mkdirSync(outDir, { recursive: true })

  for (const slug of COLLECTIONS) {
    const result = await payload.find({
      collection: slug,
      limit: 1000,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(result.docs, null, 2))
    console.log(`${slug}: ${result.docs.length} docs`)
  }

  for (const slug of GLOBALS) {
    const doc = await payload.findGlobal({ slug, depth: 0, overrideAccess: true })
    fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(doc, null, 2))
    console.log(`global ${slug}: exported`)
  }

  console.log(`Backup written to ${outDir}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
