// Temporary phone-number override displayed on landing pages only.
// Homepage and main marketing site continue to use SiteSettings.contactPhone.
// Revert by deleting these constants and the imports in (lp)/layout.tsx,
// blocks/render/RenderBlocks.tsx, and (lp)/lp/express-website/booked/page.tsx.
export const LP_PHONE_DISPLAY = '(346) 560-5430'
export const LP_PHONE_HREF = 'tel:+13465605430'

// Confirmed Calendly booking link (discovery call). Single source of truth for
// the "book a call" CTA shown alongside the contact form. Button.tsx forces
// same-tab navigation for Calendly URLs so the redirect-back flow still works.
export const BOOKING_URL = 'https://calendly.com/suhaib-blackhartconsulting/discovery-call'

// Turn a display phone number like "(866) 434-9777" into a tel: href.
// Keeps a leading + if present; strips everything else non-digit.
export function phoneHref(display: string | null | undefined): string | null {
  if (!display) return null
  const trimmed = display.trim()
  if (!trimmed) return null
  const leading = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return null
  // Assume US country code if 10 digits and no leading +.
  if (!leading && digits.length === 10) return `tel:+1${digits}`
  return `tel:${leading}${digits}`
}

export function mailtoHref(email: string | null | undefined): string | null {
  if (!email) return null
  const e = email.trim()
  return e ? `mailto:${e}` : null
}
