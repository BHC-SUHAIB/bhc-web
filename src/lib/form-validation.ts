// Shared helpers for the lead forms' client-side required-field check.
//
// Background (2026-09-13): a Google Ads visitor on an iPhone tapped "Send me
// my demo" three times and nothing reached the server. The generic error
// banner renders ABOVE the fields, so on a phone it sat off-screen while the
// button appeared to do nothing. These helpers make the message name exactly
// what is missing, and the forms scroll the banner into view + emit a
// dataLayer event so the failure is visible in GA4 next time.

export type MissingField = {
  /** Short machine key for analytics, e.g. "email". */
  key: string
  /** Human phrase completing "Please add ...", e.g. "your email". */
  label: string
}

export function describeMissing(missing: MissingField[]): string {
  const labels = missing.map((m) => m.label)
  if (labels.length === 0) return 'Please check the form and try again.'
  if (labels.length === 1) return `Please add ${labels[0]}.`
  if (labels.length === 2) return `Please add ${labels[0]} and ${labels[1]}.`
  return `Please add ${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}.`
}

export function missingKeys(missing: MissingField[]): string {
  return missing.map((m) => m.key).join(',')
}
