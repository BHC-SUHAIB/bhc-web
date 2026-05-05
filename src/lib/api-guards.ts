// Shared guards for API routes — origin/referer checks for CSRF defense
// and a tiny in-memory rate limiter for pre-auth endpoints.
//
// CSRF defense via origin/referer is a pragmatic mitigation: the Payload
// session cookie is HttpOnly, so a cross-origin attacker can't read it,
// but they could still trigger requests from a malicious page they control
// IF the user is logged in. Origin/referer header check rejects those
// requests by ensuring the request came from your own domain.

const ALLOWED_ORIGINS_DEFAULT = ['http://localhost:3000', 'http://192.168.154.213:3000']

export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  return [
    ...(fromEnv ? [fromEnv] : []),
    'https://blackhartconsulting.com',
    'https://www.blackhartconsulting.com',
    'https://dev.blackhartconsulting.com',
    ...ALLOWED_ORIGINS_DEFAULT,
  ]
}

// Returns null if the request passes the origin check; returns a Response
// to send back if it fails. Same-origin requests + browsers that omit
// referer entirely (some privacy modes) are allowed; the goal is to block
// known cross-origin posts, not to be a strict allowlist.
export function denyIfCrossOrigin(req: Request): Response | null {
  // Not enforced for safe methods.
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')

  // No origin AND no referer → likely a non-browser tool (curl, server
  // job, the Stripe CLI). Allow — the underlying auth check is the real
  // gate for those.
  if (!origin && !referer) return null

  const allowed = getAllowedOrigins()
  const matches = (value: string | null): boolean => {
    if (!value) return false
    try {
      const u = new URL(value)
      return allowed.some((a) => {
        try {
          const ua = new URL(a)
          return ua.host === u.host && ua.protocol === u.protocol
        } catch {
          return false
        }
      })
    } catch {
      return false
    }
  }

  if (matches(origin) || matches(referer)) return null

  return new Response(JSON.stringify({ error: 'Cross-origin request blocked.' }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  })
}

// Tiny in-memory token-bucket rate limiter. Production-grade rate limiting
// belongs at the CDN edge, but for our single-instance droplet this is
// good enough and adds zero deps.
//
// Buckets are per-key, with `limit` requests allowed per `windowMs`.

type Bucket = { count: number; resetAt: number }
const _buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const b = _buckets.get(key)
  if (!b || b.resetAt < now) {
    _buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count += 1
  return true
}

// Convenience wrapper for the common "5 per hour" / "12 per minute" cases.
export const rateLimitFivePerHour = (key: string) => rateLimit(key, 5, 60 * 60 * 1000)
export const rateLimitTwelvePerMinute = (key: string) => rateLimit(key, 12, 60 * 1000)
