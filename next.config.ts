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
  // next/image requires allow-listed remote hosts. Payload returns absolute
  // URLs for Media records based on the serverURL config, so we whitelist
  // every origin the site may serve media from: local dev, the droplet IP,
  // both production domains, and DigitalOcean Spaces + CDN endpoints.
  //
  // `unoptimized` is flipped on in development because Next.js's image
  // optimizer refuses to fetch through private IPs (::1, 127.0.0.1) as SSRF
  // protection. In production the Payload serverURL resolves to a public
  // host (or the CDN), so the optimizer works normally.
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: '104.131.82.31' },
      { protocol: 'https', hostname: 'blackhartconsulting.com' },
      { protocol: 'https', hostname: 'www.blackhartconsulting.com' },
      { protocol: 'https', hostname: '**.digitaloceanspaces.com' },
      { protocol: 'https', hostname: '**.cdn.digitaloceanspaces.com' },
    ],
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
