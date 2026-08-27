// tsx CJS-interop fix: @next/env ships CJS with an __esModule marker and no
// default export, which breaks payload's `import nextEnvImport from '@next/env'`
// when tsx transforms it. Preload with NODE_OPTIONS="--require ./scripts/pricing-reset/nextenv-shim.cjs".
const path = require('path')
const candidates = []
try { candidates.push(require.resolve('@next/env', { paths: [process.cwd()] })) } catch {}
try { candidates.push(require.resolve('@next/env', { paths: [path.join(process.cwd(), 'node_modules', 'payload')] })) } catch {}
for (const target of [...new Set(candidates)]) {
  try { const m = require(target); if (!m.default) m.default = m } catch {}
}
