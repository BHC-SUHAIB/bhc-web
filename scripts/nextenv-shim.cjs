// Node 24 + Payload CLI fix, used by the generate:types, generate:importmap,
// and payload npm scripts.
//
// Payload's CLI loads payload.config.ts with Node's native TypeScript
// loader, which cannot resolve the extensionless and "@/" imports this
// project uses, so the scripts preload tsx with NODE_OPTIONS="--import tsx".
// Under tsx, @next/env (CJS with an __esModule marker and no default export)
// breaks Payload's `import nextEnvImport from '@next/env'`. This shim adds
// the missing default. Preload it with --require alongside --import tsx.
const path = require('path')
const candidates = []
try { candidates.push(require.resolve('@next/env', { paths: [process.cwd()] })) } catch {}
try { candidates.push(require.resolve('@next/env', { paths: [path.join(process.cwd(), 'node_modules', 'payload')] })) } catch {}
for (const target of [...new Set(candidates)]) {
  try { const m = require(target); if (!m.default) m.default = m } catch {}
}
