import type { NextConfig } from 'next'
import { withPayload } from '@payloadcms/next/withPayload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  turbopack: {
    root: dirname,
  },
  // Payload generates src/payload-types.ts via its CLI, which is gitignored
  // and not part of the Docker build context. All our imports from
  // '@/payload-types' are `import type` and erased at runtime; only the
  // build-time type check fails. Skip that check here. Type errors still
  // surface in the IDE and `npm run dev`.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
