// Per-prospect preview gate. Multi-tenant cousin of dev-auth.
//
// Each prospect lives in data/prospects.json as
// `<slug>: { password, label, tiers[], defaultTier, created? }`.
//
// Auth state is a per-prospect HMAC-signed cookie (one cookie per slug, so
// access to one prospect doesn't leak to another). Cookies have the slug
// baked into the signed payload, so even an unsigned-coincidence cookie
// from prospect A cannot pass verification for prospect B.
//
// HMAC + verification use Web Crypto rather than node:crypto so this module
// loads in the Edge Runtime where proxy.ts runs.
//
// The manifest is statically imported from data/prospects.json so it
// bundles into the edge runtime — that means adding a prospect requires
// a redeploy (which is the workflow anyway: edit JSON → commit → deploy).

import prospectsManifest from '../../data/prospects.json'

export type ProspectRecord = {
  password: string
  label: string
  tiers: string[]
  defaultTier: string
  created?: string
}

const MANIFEST = prospectsManifest as Record<string, ProspectRecord>

const COOKIE_PREFIX = 'bhc_p_'
const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const enc = new TextEncoder()

// ─── Manifest lookup ──────────────────────────────────────────────────

export function getProspect(slug: string): ProspectRecord | null {
  if (!Object.prototype.hasOwnProperty.call(MANIFEST, slug)) return null
  return MANIFEST[slug]
}

export function knownSlugs(): string[] {
  return Object.keys(MANIFEST)
}

// ─── Cookie naming ────────────────────────────────────────────────────

export function prospectCookieName(slug: string): string {
  return `${COOKIE_PREFIX}${slug}`
}

export function prospectCookieMaxAge(): number {
  return TTL_SECONDS
}

// ─── HMAC primitives ──────────────────────────────────────────────────

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
  // Reuse DEV_AUTH_SECRET so prospect gating piggybacks on existing
  // infrastructure rather than adding a parallel secret. Cookies are not
  // interchangeable with dev-auth cookies because the signed payload
  // carries `scope: 'prospect'` and a slug — verifyProspectCookie rejects
  // any payload that doesn't match both.
  const s = process.env.DEV_AUTH_SECRET
  if (!s || s.length < 16) {
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

// ─── Sign / verify ────────────────────────────────────────────────────

export async function signProspectCookie(slug: string): Promise<string> {
  const payload = {
    scope: 'prospect' as const,
    slug,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  }
  const payloadB64 = b64urlEncodeBytes(enc.encode(JSON.stringify(payload)))
  const key = await importKey(getSecret())
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64)))
  return `${payloadB64}.${b64urlEncodeBytes(sig)}`
}

export async function verifyProspectCookie(slug: string, cookie: string | undefined): Promise<boolean> {
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

  let payload: { scope?: string; slug?: string; exp?: number }
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecodeBytes(payloadB64)))
  } catch {
    return false
  }
  if (payload.scope !== 'prospect') return false
  if (payload.slug !== slug) return false
  if (typeof payload.exp !== 'number') return false
  if (payload.exp < Math.floor(Date.now() / 1000)) return false

  return true
}

// ─── Plain-text password check (used by API route only, not edge proxy) ──

export function checkProspectPassword(slug: string, submitted: string): boolean {
  const prospect = getProspect(slug)
  if (!prospect) return false
  if (typeof submitted !== 'string' || submitted.length === 0) return false
  // Constant-time string compare to discourage timing attacks. Lengths
  // differ on most mismatches, so this is mostly belt-and-braces.
  const a = enc.encode(prospect.password)
  const b = enc.encode(submitted)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
