/* Phase 3: set projects.group (client/concept/product). Idempotent. */
process.env.SEED_ON_BOOT = 'false'
import nextEnv from '@next/env'
const env = (nextEnv as any).loadEnvConfig ? (nextEnv as any) : (nextEnv as any).default
env.loadEnvConfig(process.cwd())

const CLIENT_SLUGS = new Set(['prometheus-minds', 'waygft'])

async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  const res = await payload.find({ collection: 'projects', limit: 200, draft: true })
  for (const doc of res.docs as any[]) {
    const group = CLIENT_SLUGS.has(doc.slug) ? 'client' : 'product'
    if (doc.group !== group) {
      await payload.update({ collection: 'projects', id: doc.id, data: { group } as any })
      console.log(`${doc.slug}: group -> ${group}`)
    } else {
      console.log(`${doc.slug}: already ${group}`)
    }
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
