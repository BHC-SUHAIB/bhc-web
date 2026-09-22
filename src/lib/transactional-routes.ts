// Routes where a visitor is paying, managing billing, or has just converted.
// Marketing interruptions (the exit-intent lead modal) must stay off these:
// a lead-capture popup over an order summary or a Pay button costs trust and
// blocks the primary action, and a thank-you page visitor is already a lead.
//
// Prefixes match the segment itself and everything under it, so '/invoice'
// covers /invoice/<id> and /invoice/<id>/thank-you but not /invoices-guide.
const TRANSACTIONAL_PREFIXES = [
  '/invoice',
  '/care-plan',
  '/portal',
  '/misbah/tip',
]

// Post-conversion confirmation pages, wherever they live in the tree
// (/booked, /lp/express-website/booked, /care-plan/thank-you, ...).
const CONFIRMATION_SEGMENTS = new Set(['thank-you', 'booked'])

export function isTransactionalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const path = pathname.toLowerCase().replace(/\/+$/, '')
  if (TRANSACTIONAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return true
  return path.split('/').some((segment) => CONFIRMATION_SEGMENTS.has(segment))
}
