import { NextResponse, type NextRequest } from 'next/server'
import {
  checkProspectPassword,
  getProspect,
  prospectCookieMaxAge,
  prospectCookieName,
  signProspectCookie,
} from '@/lib/prospects'

// POST handler for a prospect-preview login form.
//
// Validates the password against data/prospects.json[slug].password,
// sets the per-prospect HMAC-signed cookie on success, and 303-redirects
// either to ?next=/p/<slug>/<tier> (preserved by the proxy) or to the
// prospect's defaultTier preview.
//
// Mirrors the dev-auth login route — same redirect / cookie semantics,
// but per-prospect rather than site-wide.

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

function isSafeRedirectTarget(slug: string, path: unknown): path is string {
  if (typeof path !== 'string') return false
  // Must be a relative path on this origin under this prospect's namespace.
  // Anything else risks open-redirect or cross-prospect leak.
  if (!path.startsWith(`/p/${slug}/`)) return false
  if (path.startsWith('//')) return false
  return true
}

export async function POST(req: NextRequest, { params }: { params: Params }): Promise<Response> {
  const { slug } = await params

  // Unknown slug — 404 so probing the endpoint doesn't reveal which slugs exist.
  const prospect = getProspect(slug)
  if (!prospect) {
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
  // `req.nextUrl` — same reasoning as the dev-auth route (running behind
  // Caddy + docker-compose, the inner request's Host header is the
  // container's short ID, not the public hostname).
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin

  if (!checkProspectPassword(slug, submitted)) {
    const redirectUrl = new URL(`/p/${slug}`, baseUrl)
    redirectUrl.searchParams.set('error', 'invalid')
    if (isSafeRedirectTarget(slug, next)) {
      redirectUrl.searchParams.set('next', next)
    }
    return NextResponse.redirect(redirectUrl, 303)
  }

  // Success — sign the cookie and redirect to ?next= or the default tier.
  const fallback = `/p/${slug}/${prospect.defaultTier}`
  const target = isSafeRedirectTarget(slug, next) ? next : fallback
  const dest = new URL(target, baseUrl)

  const response = NextResponse.redirect(dest, 303)
  response.cookies.set(prospectCookieName(slug), await signProspectCookie(slug), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/p/${slug}`,
    maxAge: prospectCookieMaxAge(),
  })
  return response
}
