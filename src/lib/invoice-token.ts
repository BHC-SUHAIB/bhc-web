import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

// Signed access tokens for /invoice/[id] pages. The link in the client's
// email looks like /invoice/<id>?token=<signed>, where <signed> is a
// base64url-encoded payload + HMAC. Anyone who can guess the invoice ID
// without a valid token gets a 404 — invoice line items leak business
// pricing, so this matters even though invoice IDs aren't strictly secret.
//
// Why HMAC instead of JWT: avoids a runtime dep, payloads are tiny, and we
// don't need cross-issuer verification. PAYLOAD_SECRET is already loaded
// in every server context, so reusing it as the HMAC key keeps env config
// surface area unchanged.
//
// Tokens are single-purpose (gating one specific invoice) and embed an
// expiry. Rotating PAYLOAD_SECRET invalidates every outstanding token —
// acceptable trade-off for the simplicity.

type TokenPayload = {
  /** Stripe Invoice ID this token grants access to. */
  iid: string
  /** Issued-at, unix seconds. */
  iat: number
  /** Expires-at, unix seconds. */
  exp: number
  /** Random nonce — prevents identical tokens for identical inputs. */
  n: string
}

const DEFAULT_TTL_DAYS = 60

function getSecret(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      '[invoice-token] PAYLOAD_SECRET is missing or too short. Set a 32+ char value in .env.',
    )
  }
  return secret
}

function b64urlEncode(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8')
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function sign(payload: string): string {
  return b64urlEncode(createHmac('sha256', getSecret()).update(payload).digest())
}

export function signInvoiceToken(stripeInvoiceId: string, ttlDays: number = DEFAULT_TTL_DAYS): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = {
    iid: stripeInvoiceId,
    iat: now,
    exp: now + ttlDays * 86_400,
    n: randomBytes(8).toString('hex'),
  }
  const encoded = b64urlEncode(JSON.stringify(payload))
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

export type TokenVerifyResult =
  | { ok: true; invoiceId: string; payload: TokenPayload }
  | { ok: false; reason: 'malformed' | 'invalid-signature' | 'expired' }

export function verifyInvoiceToken(token: string | null | undefined, expectedInvoiceId?: string): TokenVerifyResult {
  if (!token || !token.includes('.')) return { ok: false, reason: 'malformed' }
  const [encoded, signature] = token.split('.', 2)
  if (!encoded || !signature) return { ok: false, reason: 'malformed' }

  // Constant-time comparison — protects against timing oracles.
  const expected = sign(encoded)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: 'invalid-signature' }
  }

  let payload: TokenPayload
  try {
    payload = JSON.parse(b64urlDecode(encoded).toString('utf8')) as TokenPayload
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    return { ok: false, reason: 'expired' }
  }

  if (expectedInvoiceId && payload.iid !== expectedInvoiceId) {
    return { ok: false, reason: 'invalid-signature' }
  }

  return { ok: true, invoiceId: payload.iid, payload }
}
