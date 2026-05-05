// Centralized date formatting helpers for invoices, subscriptions, emails.
// All dates in storage are UTC ISO strings; presentation respects the
// SiteSettings.displayTimezone (default: America/Chicago).
//
// Pass a timezone explicitly when you have it (e.g. resolved from
// SiteSettings on the server). When unavailable (client component without
// a server roundtrip), falls back to America/Chicago.

const DEFAULT_TZ = 'America/Chicago'

export function formatInvoiceDate(
  iso: string | null | undefined,
  options: { timezone?: string; includeTime?: boolean } = {},
): string {
  if (!iso) return '—'
  const tz = options.timezone || DEFAULT_TZ
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'

  if (options.includeTime) {
    return d.toLocaleString('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    })
  }
  return d.toLocaleDateString('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const ageMs = Date.now() - d.getTime()
  const days = Math.floor(ageMs / 86_400_000)
  if (days < 1) {
    const hours = Math.floor(ageMs / 3_600_000)
    if (hours < 1) return 'just now'
    return `${hours}h ago`
  }
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
