// Render-time content transforms for the Warm Mono revision (2026-06).
//
// The dev DB is overwritten from prod every 15 minutes by the content sync, so
// edits made to dev content don't persist. These helpers apply the requested
// copy/link changes at RENDER time instead. They live in code, so they're
// durable on dev AND take effect on prod the moment the branch ships — without
// editing the CMS. (When ready, the same wording can be moved into the CMS and
// these become no-ops.)

export const CONTACT_FORM_ANCHOR = '/contact#contact-form'

/** Route any CTA already aimed at /contact to the on-page contact-form anchor.
 *  Leaves every other href (/, /services, /portfolio, calendly, #audit) alone. */
export function toContactAnchor(href?: string | null): string {
  if (!href) return '#'
  return /^\/contact(\?|#|$)/i.test(href) ? CONTACT_FORM_ANCHOR : href
}

/** "Founding" → "Discounted" (case-preserving) for the discount-pricing label.
 *  Whole-word token only, so "Founded" / "founder" are untouched. */
export function relabelDiscount<T extends string | null | undefined>(text: T): T {
  if (typeof text !== 'string') return text
  return text.replace(/Founding/g, 'Discounted').replace(/founding/g, 'discounted') as T
}
