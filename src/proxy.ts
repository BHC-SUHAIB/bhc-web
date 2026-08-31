// Two access gates layered into a single proxy:
//
//   1. Per-prospect preview gate (always on, only fires for /p/<slug>/<tier> paths)
//   2. Dev-environment gate      (only when DEV_AUTH_ENABLED=true)
//
// They run in that order so a prospect URL hit on the dev droplet first
// trips the prospect gate (per-URL, per-prospect) and then, if the visitor
// is already past it, falls into the dev-auth gate (site-wide staging
// password). On prod the dev gate is dormant; only the prospect gate runs.
//
// Routing (always open, never gated):
//   - /dev-login                    (dev-auth form)
//   - /api/dev-auth/{login,logout}  (dev-auth POST handlers)
//   - /api/stripe/webhook           (Stripe deliveries must reach the app)
//   - /p/<slug>                     (prospect gate form itself)
//   - /api/prospects/<slug>/login   (prospect form POST handler)
//
// File is named `proxy.ts` per Next 16 — `middleware.ts` is the deprecated
// name (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).

import { NextResponse, type NextRequest } from 'next/server'
import { devAuthCookieName, isDevAuthEnabled, verifyDevAuthCookie } from '@/lib/dev-auth'
import { prospectCookieName, verifyProspectCookie } from '@/lib/prospects'

const DEV_AUTH_OPEN_PATHS = new Set([
  '/dev-login',
  '/api/dev-auth/login',
  '/api/dev-auth/logout',
  '/api/stripe/webhook',
])

// Matches /p/<slug>/<rest...> — the rest is what we want to gate. The bare
// /p/<slug> URL (no trailing segment) is the gate page itself, so it's
// excluded by the trailing-required group.
const PROSPECT_GATED_RE = /^\/p\/([a-z0-9-]+)\/(.+)$/i

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname

  // ─── 1. Prospect preview gate ────────────────────────────────────────
  // Always on. Runs first so a prospect URL never leaks even when the
  // site-wide dev gate is off (i.e. on prod).
  const prospectGate = await runProspectGate(req, path)
  if (prospectGate) return prospectGate

  // ─── 2. Dev-environment gate ─────────────────────────────────────────
  if (!isDevAuthEnabled()) return NextResponse.next()

  if (DEV_AUTH_OPEN_PATHS.has(path)) return NextResponse.next()
  // Defense-in-depth: subroutes of webhook (e.g., versioned variants) and
  // anything explicitly tagged via search param shouldn't be gated.
  if (path.startsWith('/api/stripe/webhook/')) return NextResponse.next()
  // Prospect form + API stay open even with dev-auth on, otherwise the
  // visitor would need both passwords for a single mockup.
  if (path.startsWith('/p/')) return NextResponse.next()
  if (path.startsWith('/api/prospects/')) return NextResponse.next()

  const cookie = req.cookies.get(devAuthCookieName())
  if (await verifyDevAuthCookie(cookie?.value)) return NextResponse.next()

  // Preserve the URL the visitor was trying to reach so we can bounce them
  // back after a successful login. Build the redirect against
  // NEXT_PUBLIC_SITE_URL when available rather than `req.nextUrl` —
  // running behind Caddy + docker-compose, the inner request's Host header
  // is the container's short ID, not the public hostname.
  const target = req.nextUrl.pathname + req.nextUrl.search
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  const loginUrl = new URL('/dev-login', baseUrl)
  if (target && target !== '/') loginUrl.searchParams.set('next', target)
  return NextResponse.redirect(loginUrl)
}

async function runProspectGate(req: NextRequest, path: string): Promise<NextResponse | null> {
  const match = path.match(PROSPECT_GATED_RE)
  if (!match) return null
  const slug = match[1]

  const cookie = req.cookies.get(prospectCookieName(slug))
  if (await verifyProspectCookie(slug, cookie?.value)) return null

  // Not authed for this slug — bounce to the prospect's own gate page,
  // carrying the intended destination so we can return them after login.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  const gateUrl = new URL(`/p/${slug}`, baseUrl)
  gateUrl.searchParams.set('next', path)
  return NextResponse.redirect(gateUrl, 307)
}

export const config = {
  // Match every route EXCEPT static assets that don't reach app code anyway.
  // Listing them here saves the proxy-overhead per asset request.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand/|robots.txt|sitemap.xml|llms.txt).*)',
  ],
}
