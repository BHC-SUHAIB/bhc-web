// Tiny dataLayer helper. Every component that wants to fire an analytics
// event (form submit, phone click, pricing CTA click, etc.) calls
// `pushEvent(...)` and lets GTM route it to GA4 + Google Ads.
//
// Why dataLayer instead of gtag(): GTM is the single source of truth for
// tags on this site (see layout.tsx). Pushing to dataLayer keeps the
// callsites tag-agnostic — if we swap GA4 for something else later, only
// the GTM container changes, not the code.
//
// Safe to import in both client and server components — the `typeof window`
// guard makes the function a no-op during SSR.

type EventName =
  | 'generate_lead'              // Contact form submit success — primary Google Ads conversion
  | 'phone_click'                // tel: link clicked
  | 'email_click'                // mailto: link clicked
  | 'pricing_cta_click'          // Click on a pricing tier CTA
  | 'hero_cta_click'             // Click on a hero CTA
  | 'booking_click'              // Click on Cal.com / Calendly link (intent signal)
  | 'booking_completed'          // Calendly redirect-back fired this — they actually booked
  | 'pdf_download'               // Click on a one-pager / lead-magnet download button
  | 'pagespeed_audit_started'    // Visitor submitted a URL to the PSI audit tool
  | 'pagespeed_audit_completed'  // PSI returned scores; engagement signal
  | 'cta_click'                  // Generic CTA click (e.g. sticky mobile bar primary action)
  | 'exit_intent_shown'          // Exit-intent / deep-scroll lead modal was displayed
  | 'checkout_click'             // Buy now / Subscribe button on a pricing tier or bundle
  | 'purchase'                   // /thanks?sku= landed after a Stripe Payment Link checkout

type EventParams = {
  /** Page or section the event fired from. */
  source_page?: string
  /** Specific element label, e.g. "Start a Marketing Site". */
  cta_label?: string
  /** Pricing tier name when relevant. */
  tier_name?: string
  /** Estimated value for value-based bidding. USD. */
  value?: number
  /** Currency for value. Always 'USD' here. */
  currency?: 'USD'
  /** Free-form extras. */
  [key: string]: unknown
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
  }
}

export function pushEvent(event: EventName, params: EventParams = {}): void {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}

type NavigationEvent = {
  preventDefault: () => void
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  button?: number
}

// Synchronous dataLayer pushes land in window.dataLayer immediately, but
// GTM dispatches GA4's outbound HTTP request asynchronously — so when the
// click also navigates the page, the browser cancels GA4's beacon
// mid-flight and the event never lands. Pattern: push event → cancel
// default nav → wait 200ms (below perception) → trigger nav manually.
//
// Skip the defer for tel:/mailto: (OS handlers, page doesn't navigate) and
// modifier-clicks (open in new tab, original page stays alive).
export function pushEventThenNavigate(
  event: EventName,
  href: string,
  params: EventParams = {},
  e: NavigationEvent,
): void {
  pushEvent(event, params)
  if (typeof window === 'undefined') return
  if (e.metaKey || e.ctrlKey || e.shiftKey || (e.button !== undefined && e.button !== 0)) return
  if (/^(tel|mailto):/i.test(href)) return
  e.preventDefault()
  window.setTimeout(() => {
    window.location.href = href
  }, 200)
}
