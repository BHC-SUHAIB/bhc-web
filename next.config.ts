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
  // Payload's pushDevSchema dynamically requires drizzle-kit at runtime.
  // Turbopack's static analysis doesn't see this require, so drizzle-kit
  // (and its peer deps) aren't traced into the standalone output. Force
  // them to be included so first-boot schema push works in production.
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/drizzle-kit/**/*',
      './node_modules/drizzle-orm/**/*',
      './node_modules/@drizzle-team/**/*',
      './node_modules/esbuild/**/*',
      './node_modules/@esbuild/**/*',
      './node_modules/@payloadcms/drizzle/**/*',
      './node_modules/@payloadcms/db-postgres/**/*',
      './node_modules/@payloadcms/db-sqlite/**/*',
    ],
  },
  serverExternalPackages: [
    'drizzle-kit',
    'drizzle-orm',
    '@payloadcms/drizzle',
    '@payloadcms/db-postgres',
    '@payloadcms/db-sqlite',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
