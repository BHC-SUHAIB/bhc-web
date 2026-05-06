// Dev-environment access gate — replaces Caddy's basicauth (which produced
// a browser-popup credential prompt) with a branded login page.
//
// Active ONLY when DEV_AUTH_ENABLED=true (set on the dev droplet's .env).
// On prod the env var is unset so this file is a near-no-op.
//
// Routing:
//   - /dev-login            (the form itself — never gated)
//   - /api/dev-auth/login   (form POST handler — never gated)
//   - /api/dev-auth/logout  (clears the cookie — never gated)
//   - /api/stripe/webhook   (Stripe deliveries must reach the app — never gated)
//   - everything else       (gated when enabled; redirect to /dev-login if no cookie)
//
// File is named `proxy.ts` per Next 16 — `middleware.ts` is the deprecated
// name (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).

import { NextResponse, type NextRequest } from 'next/server'
import { devAuthCookieName, isDevAuthEnabled, verifyDevAuthCookie } from '@/lib/dev-auth'

const ALWAYS_OPEN_PATHS = new Set([
  '/dev-login',
  '/api/dev-auth/login',
  '/api/dev-auth/logout',
  '/api/stripe/webhook',
])

export async function proxy(req: NextRequest): Promise<NextResponse> {
  if (!isDevAuthEnabled()) return NextResponse.next()

  const path = req.nextUrl.pathname

  if (ALWAYS_OPEN_PATHS.has(path)) return NextResponse.next()

  // Defense-in-depth: subroutes of webhook (e.g., versioned variants) and
  // anything explicitly tagged via search param shouldn't be gated. Keep the
  // exact-match list above as the primary gate.
  if (path.startsWith('/api/stripe/webhook/')) return NextResponse.next()

  const cookie = req.cookies.get(devAuthCookieName())
  if (await verifyDevAuthCookie(cookie?.value)) return NextResponse.next()

  // Preserve the URL the visitor was trying to reach so we can bounce them
  // back after a successful login. Encoded into `?next=` on /dev-login.
  const target = req.nextUrl.pathname + req.nextUrl.search
  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/dev-login'
  loginUrl.search = ''
  if (target && target !== '/') loginUrl.searchParams.set('next', target)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Match every route EXCEPT static assets that don't reach app code anyway.
  // Listing them here saves the proxy-overhead per asset request.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand/|robots.txt|sitemap.xml).*)',
  ],
}
