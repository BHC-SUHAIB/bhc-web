// Minimal HMAC-signed-cookie auth for the dev-only access gate.
//
// Why custom and not Payload's auth: the dev gate is a single shared
// password (replaces Caddy's HTTP Basic Auth popup with a branded login
// page). It's not a per-user system, doesn't need a User collection, and
// has nothing to do with the admin login. Keeping it standalone means the
// dev gate can't accidentally break the real admin auth, and disabling
// it is a single env-var flip.
//
// Cookie format: `<base64url(payload)>.<base64url(hmac)>` where payload is
// `{ exp: <unix seconds> }` JSON-encoded. HMAC is SHA-256 of the payload
// using DEV_AUTH_SECRET. Verification = recompute HMAC, constant-time
// compare, and check the expiration.
//
// Web Crypto rather than node:crypto so this module loads in the Edge
// Runtime (Next.js proxy/middleware). All sign/verify functions are async.

const COOKIE_NAME = 'bhc_dev_auth'
const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const enc = new TextEncoder()

function b64urlEncodeBytes(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecodeBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function getSecret(): string {
  const s = process.env.DEV_AUTH_SECRET
  if (!s || s.length < 16) {
    // Fail loudly rather than ship a weak gate. The dev gate is non-essential
    // (the actual product runs without it on prod), so refusing to issue
    // tokens when the secret isn't set is the safer default.
    throw new Error('DEV_AUTH_SECRET must be set to a value of at least 16 characters')
  }
  return s
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export function isDevAuthEnabled(): boolean {
  return process.env.DEV_AUTH_ENABLED === 'true'
}

export function expectedPassword(): string {
  return process.env.DEV_AUTH_PASSWORD ?? ''
}

export function devAuthCookieName(): string {
  return COOKIE_NAME
}

export function devAuthCookieMaxAge(): number {
  return TTL_SECONDS
}

export async function signDevAuthCookie(): Promise<string> {
  const payload = { exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }
  const payloadB64 = b64urlEncodeBytes(enc.encode(JSON.stringify(payload)))
  const key = await importKey(getSecret())
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64)))
  return `${payloadB64}.${b64urlEncodeBytes(sig)}`
}

export async function verifyDevAuthCookie(cookie: string | undefined): Promise<boolean> {
  if (!cookie || typeof cookie !== 'string') return false
  const parts = cookie.split('.')
  if (parts.length !== 2) return false
  const [payloadB64, hmacB64] = parts

  let secret: string
  try {
    secret = getSecret()
  } catch {
    return false
  }

  const key = await importKey(secret)
  const expectedSig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64)))

  let providedSig: Uint8Array
  try {
    providedSig = b64urlDecodeBytes(hmacB64)
  } catch {
    return false
  }
  if (!timingSafeEqual(providedSig, expectedSig)) return false

  let payload: { exp?: number }
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecodeBytes(payloadB64)))
  } catch {
    return false
  }
  if (typeof payload.exp !== 'number') return false
  if (payload.exp < Math.floor(Date.now() / 1000)) return false

  return true
}
