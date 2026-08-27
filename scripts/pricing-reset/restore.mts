/* eslint-disable @typescript-eslint/no-explicit-any */
/* Rollback: restore CMS content from a backups/pricing-reset/<timestamp>/
 * export made by export-backup.mts. Upserts by slug (create if missing,
 * full-replace update otherwise); globals are replaced wholesale. Does not
 * delete documents that did not exist in the backup.
 *
 * Usage:
 *   npx tsx scripts/pricing-reset/restore.mts backups/pricing-reset/<timestamp>
 */

process.env.SEED_ON_BOOT = 'false'

import fs from 'node:fs'
import path from 'node:path'
import nextEnv from '@next/env'
const envMod = (nextEnv as { loadEnvConfig?: (d: string) => void }).loadEnvConfig
  ? (nextEnv as { loadEnvConfig: (d: string) => void })
  : (nextEnv as unknown as { default: { loadEnvConfig: (d: string) => void } }).default
envMod.loadEnvConfig(process.cwd())

const backupDir = process.argv[2]
if (!backupDir || !fs.existsSync(backupDir)) {
  console.error('Usage: npx tsx scripts/pricing-reset/restore.mts backups/pricing-reset/<timestamp>')
  process.exit(1)
}

const dbUri = process.env.DATABASE_URI || 'file:./payload.db'
if (/^postgres(ql)?:\/\//.test(dbUri) && !process.argv.includes('--allow-non-local')) {
  console.error('Refusing to run against a postgres DATABASE_URI without --allow-non-local.')
  process.exit(1)
}

// Collections restored by slug; testimonials have no slug and are skipped
// unless matched by id.
const BY_SLUG = ['pages', 'landingPages', 'projects', 'faqs'] as const
const GLOBALS = ['header', 'footer', 'siteSettings'] as const

const readJson = (name: string): any[] | any | null => {
  const p = path.join(backupDir, `${name}.json`)
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
}

// Strip server-managed fields so update() re-validates cleanly.
const strip = (doc: any) => {
  const { id, createdAt, updatedAt, ...rest } = doc
  return rest
}

async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })

  for (const collection of BY_SLUG) {
    const docs = readJson(collection) as any[] | null
    if (!docs) continue
    for (const doc of docs) {
      const where = doc.slug
        ? { slug: { equals: doc.slug } }
        : { question: { equals: doc.question } } // faqs have no slug
      const existing = await payload.find({ collection, where: where as any, limit: 1 })
      if (existing.totalDocs === 0) {
        await payload.create({ collection, data: strip(doc) })
        console.log(`${collection}/${doc.slug ?? doc.question}: created`)
      } else {
        await payload.update({ collection, id: existing.docs[0].id, data: strip(doc) })
        console.log(`${collection}/${doc.slug ?? doc.question}: restored`)
      }
    }
  }

  for (const slug of GLOBALS) {
    const doc = readJson(slug)
    if (!doc) continue
    await payload.updateGlobal({ slug, data: strip(doc) })
    console.log(`global ${slug}: restored`)
  }

  console.log('Restore complete. Restart the server (or wait for cache revalidation) to see it.')
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
