// Authentication for the cockpit.
//
// Two independent auth systems that never overlap:
//   1. Human session  — a stateless HMAC-signed cookie issued after a
//      constant-time password check against APP_PASSWORD. Protects the app
//      shell, all human API routes, and file downloads.
//   2. Machine ingest — an "Authorization: Bearer <INGEST_TOKEN>" header,
//      constant-time compared. Grants ONLY the ingest write routes. The token
//      never unlocks human routes; the session never unlocks ingest routes.
import crypto from 'node:crypto';

const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';
const COOKIE_NAME = 'jh_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

if (!APP_PASSWORD) console.warn('[auth] APP_PASSWORD is not set — login will reject everything.');
if (!SESSION_SECRET) console.warn('[auth] SESSION_SECRET is not set — sessions are insecure.');
if (!INGEST_TOKEN) console.warn('[auth] INGEST_TOKEN is not set — ingest routes will reject everything.');

// Constant-time string compare that does not leak length via early return.
function safeEqual(a, b) {
  const ab = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  const len = Math.max(ab.length, bb.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ab.copy(pa); bb.copy(pb);
  const eq = crypto.timingSafeEqual(pa, pb);
  return eq && ab.length === bb.length;
}

export function checkPassword(candidate) {
  if (!APP_PASSWORD) return false;
  return safeEqual(candidate || '', APP_PASSWORD);
}

// ---- Stateless signed session token: base64url(payload).hmac ----
function sign(payloadB64) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
}
export function issueSessionToken() {
  const payload = { iat: Date.now(), exp: Date.now() + SESSION_TTL_MS };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${b64}.${sign(b64)}`;
}
function verifySessionToken(token) {
  if (!token || !SESSION_SECRET) return false;
  const [b64, mac] = String(token).split('.');
  if (!b64 || !mac) return false;
  if (!safeEqual(mac, sign(b64))) return false;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    return payload && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function hasValidSession(req) {
  return verifySessionToken(req.cookies?.[COOKIE_NAME]);
}

// Middleware: require a valid human session, else 401.
export function requireSession(req, res, next) {
  if (hasValidSession(req)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Middleware: require a valid ingest bearer token, else 401.
export function requireIngestToken(req, res, next) {
  const header = req.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (INGEST_TOKEN && m && safeEqual(m[1].trim(), INGEST_TOKEN)) return next();
  return res.status(401).json({ error: 'Invalid or missing ingest token' });
}

// Middleware: allow EITHER a human session OR the ingest token. Used for file
// downloads so the daily agent can verify its own uploads.
export function requireSessionOrIngest(req, res, next) {
  if (hasValidSession(req)) return next();
  const header = req.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (INGEST_TOKEN && m && safeEqual(m[1].trim(), INGEST_TOKEN)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
