process.env.SEED_ON_BOOT = 'false'
import nextEnv from '@next/env'
const env = (nextEnv as any).loadEnvConfig ? (nextEnv as any) : (nextEnv as any).default
env.loadEnvConfig(process.cwd())
const RX = /founding|spots remaining|\$1,950|\$4,500|\$1,495|Save \$|retail|346[ .-]?560[ .-]?5430/i
function walk(obj: any, path: string, hits: string[]) {
  if (typeof obj === 'string') { if (RX.test(obj)) hits.push(`${path}: ${obj.slice(0, 160)}`); return }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walk(v, `${path}[${i}]`, hits)); return }
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`, hits)
}
async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  for (const c of ['pages', 'landingPages', 'faqs'] as const) {
    const res = await payload.find({ collection: c, limit: 200, draft: true })
    for (const doc of res.docs as any[]) {
      const hits: string[] = []
      walk(doc, `${c}/${doc.slug ?? doc.id}`, hits)
      hits.forEach((h) => console.log(h))
    }
  }
  process.exit(0)
}
main()
