// Builds the operator notification email for a new contact / demo-request
// submission. Lives outside the collection so /dev-email-preview can render
// it from a fixture without touching the database or the email adapter.

export type ContactNotificationDoc = {
  name?: string | null
  email?: string | null
  company?: string | null
  listingUrl?: string | null
  projectType?: string | null
  budgetRange?: string | null
  message?: string | null
  formType?: string | null
  sourcePage?: string | null
  timeToSubmitSec?: number | null
  spamSignals?: string | null
  suspectedSpam?: boolean | null
  attribution?: {
    gclid?: string | null
    gbraid?: string | null
    wbraid?: string | null
    msclkid?: string | null
    fbclid?: string | null
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    utmTerm?: string | null
    utmContent?: string | null
    referrer?: string | null
    landingPath?: string | null
    firstTouchAt?: string | null
  } | null
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * One-line, human-readable origin for the lead. Examples:
 *   google / cpc / lp_express_website · keyword "custom website design" · gclid
 *   referral from www.yelp.com
 *   direct / unknown
 */
export function describeSource(a: ContactNotificationDoc['attribution']): string {
  if (!a) return 'direct / unknown (no attribution captured)'
  const parts: string[] = []
  const utm = [a.utmSource, a.utmMedium, a.utmCampaign].filter(Boolean).join(' / ')
  if (utm) parts.push(utm)
  if (a.utmTerm) parts.push(`keyword "${a.utmTerm}"`)
  if (a.utmContent) parts.push(`content "${a.utmContent}"`)
  const clickIds = [
    a.gclid ? 'gclid' : null,
    a.gbraid ? 'gbraid' : null,
    a.wbraid ? 'wbraid' : null,
    a.msclkid ? 'msclkid' : null,
    a.fbclid ? 'fbclid' : null,
  ].filter(Boolean)
  if (clickIds.length) {
    // A Google click id without utm tags still means "paid Google click".
    if (!utm && (a.gclid || a.gbraid || a.wbraid)) parts.unshift('google ads (click id, no utm tags)')
    parts.push(clickIds.join(' + '))
  }
  if (!parts.length && a.referrer) {
    let host = a.referrer
    try { host = new URL(a.referrer).host } catch { /* keep raw */ }
    parts.push(`referral from ${host}`)
  }
  return parts.length ? parts.join(' · ') : 'direct / unknown'
}

function formatCentral(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(d) + ' CT'
  } catch {
    return d.toISOString()
  }
}

export function buildContactNotificationEmail(doc: ContactNotificationDoc): { subject: string; html: string } {
  const subject = doc.formType === 'demo-request'
    ? `Demo site request from ${doc.name}`
    : `New inquiry from ${doc.name}`

  const a = doc.attribution
  const meta = 'color:#888;font-size:12px;margin:4px 0;'
  const firstTouch = formatCentral(a?.firstTouchAt)
  const metaLines = [
    doc.sourcePage ? `<p style="${meta}margin-top:24px;">Submitted from ${escapeHtml(doc.sourcePage)}</p>` : '',
    `<p style="${meta}"><strong>Source:</strong> ${escapeHtml(describeSource(a))}</p>`,
    a?.landingPath
      ? `<p style="${meta}">Landed on ${escapeHtml(a.landingPath)}${firstTouch ? ` (${escapeHtml(firstTouch)})` : ''}</p>`
      : '',
    a?.referrer ? `<p style="${meta}">Referrer: ${escapeHtml(a.referrer)}</p>` : '',
    a?.gclid ? `<p style="${meta}">gclid: <code>${escapeHtml(a.gclid)}</code></p>` : '',
    typeof doc.timeToSubmitSec === 'number'
      ? `<p style="${meta}">Time to submit: ${escapeHtml(doc.timeToSubmitSec)}s${doc.spamSignals ? ` · signals: ${escapeHtml(doc.spamSignals)}` : ''}</p>`
      : (doc.spamSignals ? `<p style="${meta}">Signals: ${escapeHtml(doc.spamSignals)}</p>` : ''),
  ]

  const html = [
    doc.suspectedSpam
      ? `<p style="background:#fff3cd;border:1px solid #ffe08a;padding:8px 12px;font-family:Arial,sans-serif;font-size:13px;">Flagged as suspected spam (honeypot filled). Saved, not auto-notified.</p>`
      : '',
    `<h2 style="font-family:Georgia,serif;">${doc.formType === 'demo-request' ? 'New demo site request' : 'New contact inquiry'}</h2>`,
    `<p><strong>Name:</strong> ${escapeHtml(doc.name)}</p>`,
    `<p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(doc.email ?? '')}">${escapeHtml(doc.email)}</a></p>`,
    doc.company ? `<p><strong>Company:</strong> ${escapeHtml(doc.company)}</p>` : '',
    doc.listingUrl ? `<p><strong>Listing / site:</strong> ${escapeHtml(doc.listingUrl)}</p>` : '',
    doc.projectType ? `<p><strong>Project type:</strong> ${escapeHtml(doc.projectType)}</p>` : '',
    doc.budgetRange ? `<p><strong>Budget:</strong> ${escapeHtml(doc.budgetRange)}</p>` : '',
    `<hr style="border:none;border-top:1px solid #ccc;margin:16px 0;">`,
    `<p style="white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(doc.message)}</p>`,
    ...metaLines,
  ].filter(Boolean).join('')

  return { subject, html }
}
