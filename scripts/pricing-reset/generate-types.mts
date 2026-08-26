// Workaround for `payload generate:types` failing under Node 24 (extensionless
// TS imports in payload.config). Runs the same generateTypes through tsx.
import nextEnv from '@next/env'
const env = (nextEnv as { loadEnvConfig?: (d: string) => void }).loadEnvConfig
  ? (nextEnv as { loadEnvConfig: (d: string) => void })
  : (nextEnv as unknown as { default: { loadEnvConfig: (d: string) => void } }).default
env.loadEnvConfig(process.cwd())

async function main() {
  const { generateTypes } = await import('payload/node')
  const { default: config } = await import('../../src/payload.config')
  await generateTypes(await config)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
