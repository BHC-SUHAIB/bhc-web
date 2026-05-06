import { NextResponse, type NextRequest } from 'next/server'
import { devAuthCookieName, isDevAuthEnabled } from '@/lib/dev-auth'

// Clears the dev-auth cookie and bounces the visitor back to /dev-login.
// Bound to POST so a stray GET (link prefetch, crawler) can't sign someone
// out. Disabled when DEV_AUTH_ENABLED is unset.

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<Response> {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const dest = req.nextUrl.clone()
  dest.pathname = '/dev-login'
  dest.search = ''

  const response = NextResponse.redirect(dest, 303)
  response.cookies.delete(devAuthCookieName())
  return response
}
