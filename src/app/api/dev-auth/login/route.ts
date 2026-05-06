import { NextResponse, type NextRequest } from 'next/server'
import { devAuthCookieMaxAge, devAuthCookieName, expectedPassword, isDevAuthEnabled, signDevAuthCookie } from '@/lib/dev-auth'

// POST handler for the dev-login form. Validates the submitted password
// against DEV_AUTH_PASSWORD, sets the signed cookie on success, and
// redirects either to ?next=<path> (preserved by middleware) or to the
// home page.

export const dynamic = 'force-dynamic'

function isSafeRedirectTarget(path: unknown): path is string {
  if (typeof path !== 'string') return false
  // Must be a relative path on this origin. Reject protocol-relative or
  // off-host URLs to avoid open-redirect.
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  return true
}

export async function POST(req: NextRequest): Promise<Response> {
  // If the gate isn't enabled, treat this endpoint as a 404 so it doesn't
  // hand out cookies in environments that don't expect them.
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const submitted = (formData.get('password') ?? '').toString()
  const next = formData.get('next')

  // Build redirects against NEXT_PUBLIC_SITE_URL when available rather than
  // `req.nextUrl` — running behind Caddy + docker-compose, the inner
  // request's Host header is the container's short ID (e.g. `0fa0b729bf2c`)
  // not the public hostname, despite Caddy's `header_up Host {host}`
  // directive. Falling back to req.nextUrl.origin keeps local-dev working.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin

  if (submitted.length === 0 || submitted !== expectedPassword()) {
    // Loop back to /dev-login with ?error=invalid (and preserve `next` if any)
    // so the visitor lands on the same page they were headed to after a fix.
    const redirectUrl = new URL('/dev-login', baseUrl)
    redirectUrl.searchParams.set('error', 'invalid')
    if (isSafeRedirectTarget(next)) {
      redirectUrl.searchParams.set('next', next)
    }
    // 303 forces a GET on the redirect target — required to clear the POST
    // body so the visitor doesn't accidentally re-submit the bad password.
    return NextResponse.redirect(redirectUrl, 303)
  }

  // Success — issue the cookie and redirect.
  const target = isSafeRedirectTarget(next) ? next : '/'
  const dest = new URL(target, baseUrl)

  const response = NextResponse.redirect(dest, 303)
  response.cookies.set(devAuthCookieName(), await signDevAuthCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: devAuthCookieMaxAge(),
  })
  return response
}
