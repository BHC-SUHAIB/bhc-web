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
      // Stock imagery used as backgroundImageUrl on landing-page Hero blocks.
      // Editors can paste an Unsplash URL into the field without uploading;
      // these patterns let next/image serve them. Hero render uses
      // unoptimized for safety, but allow-listing here lets us toggle that
      // off later for better Core Web Vitals.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
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
  // Override the framework's default `Cache-Control: no-store` on dynamic
  // routes so browsers can use bf-cache for instant back/forward navigation
  // (Lighthouse audit 2026-05-05). The page is still revalidated on each
  // request via Next's data cache (unstable_cache in src/lib/payload-cache.ts);
  // we're only telling the BROWSER it can restore the page from its memory
  // cache during a back-nav — not telling the CDN to serve a stale copy.
  //
  // `must-revalidate` keeps freshness guarantees on actual reloads. Scoped to
  // public marketing pages only; admin/portal/invoice/etc. keep no-store.
  // Serve password-gated prospect concept previews under clean URLs
  // (/p/<slug>/<tier>) without an .html suffix. The auth gate is enforced
  // upstream by proxy.ts; this rewrite just maps the clean URL to the
  // static file Next.js serves out of public/p/<slug>/<tier>.html.
  //
  // The :tier matcher is intentionally loose (no enum) so adding a new
  // prospect with custom tier names doesn't require editing this file —
  // just edit data/prospects.json and drop the HTML into public/p/<slug>/.
  // Requests for tier names that don't have a matching HTML file fall
  // through to Next.js's normal 404.
  async rewrites() {
    return [
      { source: '/p/:slug/:tier', destination: '/p/:slug/:tier.html' },
    ]
  },

  // Migrate the old /spotless/* URLs (shipped before the /p/<slug>/<tier>
  // system existed) to the new layout. Any links Suhaib already shared with
  // Spotless Car Spa keep working via the 308.
  async redirects() {
    return [
      { source: '/spotless',                                                         destination: '/p/spotlesscarspa/signature', permanent: true },
      { source: '/spotless/:tier(essentials|studio|signature)',                      destination: '/p/spotlesscarspa/:tier',     permanent: true },
      { source: '/spotless/:tier(essentials|studio|signature)/preview',              destination: '/p/spotlesscarspa/:tier',     permanent: true },
      { source: '/spotless/:tier(essentials|studio|signature)/index.html',           destination: '/p/spotlesscarspa/:tier',     permanent: true },
      { source: '/spotless/:tier(essentials|studio|signature)/preview.html',         destination: '/p/spotlesscarspa/:tier',     permanent: true },
    ]
  },
  async headers() {
    const bfCacheHeaders = [
      { key: 'Cache-Control', value: 'private, max-age=0, must-revalidate' },
    ]
    return [
      { source: '/', headers: bfCacheHeaders },
      { source: '/lp/:slug*', headers: bfCacheHeaders },
      { source: '/services', headers: bfCacheHeaders },
      { source: '/about', headers: bfCacheHeaders },
      { source: '/contact', headers: bfCacheHeaders },
      { source: '/portfolio', headers: bfCacheHeaders },
      { source: '/portfolio/:slug*', headers: bfCacheHeaders },
      { source: '/articles', headers: bfCacheHeaders },
      { source: '/articles/:slug*', headers: bfCacheHeaders },
      { source: '/privacy', headers: bfCacheHeaders },
      { source: '/sms', headers: bfCacheHeaders },
      { source: '/sms-terms', headers: bfCacheHeaders },
      { source: '/terms', headers: bfCacheHeaders },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
