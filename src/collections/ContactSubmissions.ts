import { APIError, type CollectionConfig } from 'payload'
import { denyIfCrossOrigin, rateLimitFivePerHour } from '@/lib/api-guards'
import { buildContactNotificationEmail } from '@/lib/contact-notification-email'

// Attribution keys the public form may send (see src/lib/attribution.ts).
// Anything else in the object is dropped; strings are length-capped so a
// hostile client can't stuff megabytes into the row.
const ATTRIBUTION_KEYS: Array<[key: string, max: number]> = [
  ['gclid', 200], ['gbraid', 200], ['wbraid', 200], ['msclkid', 200], ['fbclid', 200],
  ['utmSource', 200], ['utmMedium', 200], ['utmCampaign', 200], ['utmTerm', 200], ['utmContent', 200],
  ['referrer', 500], ['landingPath', 500],
]

function sanitizeAttribution(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== 'object') return undefined
  const src = input as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [key, max] of ATTRIBUTION_KEYS) {
    const v = src[key]
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, max)
  }
  if (typeof src.firstTouchAt === 'string') {
    const d = new Date(src.firstTouchAt)
    if (!Number.isNaN(d.getTime())) out.firstTouchAt = d.toISOString()
  }
  return Object.keys(out).length ? out : undefined
}

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  labels: {
    singular: 'Contact submission',
    plural: 'Contact submissions',
  },
  access: {
    // Anyone can POST (public form). Reads/updates/deletes admin-only.
    create: () => true,
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: 'Leads',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'company', 'projectType', 'status', 'suspectedSpam', 'createdAt'],
    description: 'Inquiries submitted through the /contact form, the free-demo form, the audit tool and the exit-intent popup.',
  },
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (!data) return data
        const ipKey = (req.headers?.get?.('x-forwarded-for')?.split(',')[0] ?? '').trim() || 'unknown'

        // Spam hardening for the PUBLIC create path only. Admin-created or
        // server-side records carry an authenticated user (or no HTTP method),
        // so they skip the origin + rate-limit checks.
        const isPublicHttpPost =
          !req.user && typeof req.method === 'string' && req.method.toUpperCase() === 'POST'
        if (operation === 'create' && isPublicHttpPost) {
          // CSRF / cross-origin: reject POSTs whose Origin/Referer is not our
          // own domain. Same-origin form posts and non-browser tools pass.
          if (denyIfCrossOrigin(req as unknown as Request)) {
            req.payload.logger.warn({ ip: ipKey }, '[contact] cross-origin POST blocked')
            throw new APIError('Invalid submission', 403)
          }
          // Rate limit: 5 submissions per hour per IP. Blunts bulk bot spam
          // with no third-party dependency or CAPTCHA.
          if (!rateLimitFivePerHour(`contact:${ipKey}`)) {
            req.payload.logger.warn({ ip: ipKey }, '[contact] rate limit exceeded')
            throw new APIError('Too many submissions. Please wait a bit and try again.', 429)
          }
        }

        if (operation === 'create') {
          // Spam SIGNALS, not spam rejects. Until 2026-09-13 a filled honeypot
          // threw and the record was never written. That is one autofill away
          // from silently dropping a real person (iOS ignores autocomplete=off
          // and happily fills an off-screen field labelled "Website"). Now we
          // always save the record; a tripped honeypot only flags it and
          // skips the notification email, so a false positive is still
          // sitting in Admin > Leads instead of lost.
          const signals: string[] = []
          if (typeof data.honeypot === 'string' && data.honeypot.trim().length > 0) {
            signals.push('honeypot')
            data.suspectedSpam = true
            req.payload.logger.warn(
              { ip: ipKey, email: data.email },
              '[contact] honeypot filled; saved as suspected spam, notification skipped',
            )
          } else {
            data.suspectedSpam = false
          }

          // Time-to-submit: the form sends the epoch-ms timestamp of when it
          // became interactive. Recorded for every lead; a sub-3-second submit
          // is noted as a SOFT signal only (bots race, humans don't, but so do
          // people re-submitting after a validation error).
          const startedAt = Number(data.formStartedAt)
          delete data.formStartedAt
          data.timeToSubmitSec = undefined
          if (Number.isFinite(startedAt) && startedAt > 0) {
            const ms = Date.now() - startedAt
            if (ms >= 0 && ms < 7 * 24 * 60 * 60 * 1000) {
              data.timeToSubmitSec = Math.round(ms / 1000)
              if (ms < 3000) signals.push(`fast-submit:${(ms / 1000).toFixed(1)}s`)
            }
          }
          data.spamSignals = signals.length ? signals.join('; ') : undefined

          // First-touch attribution from the client (localStorage). Whitelisted
          // + length-capped; never trusted for anything but reporting.
          data.attribution = sanitizeAttribution(data.attribution)
        }

        // Capture the source IP so we can rate-limit / block later.
        if (!data.ipAddress) {
          data.ipAddress = ipKey === 'unknown' ? undefined : ipKey
        }
        return data
      },
    ],
    afterChange: [
      // When the submitter ticks the SMS consent box AND provides a phone,
      // mirror that into the SmsConsents collection so the opt-in is
      // auditable alongside standalone /sms submissions. Snapshot the
      // exact disclaimer text they saw at submit time.
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        if (!doc.smsConsent || !doc.phone) return
        // Don't manufacture consent records from suspected bots.
        if (doc.suspectedSpam) return
        try {
          await req.payload.create({
            collection: 'sms-consents',
            data: {
              name: doc.name,
              phone: String(doc.phone).trim(),
              email: doc.email,
              source: 'contact-form',
              status: 'active',
              disclaimerText: doc.smsConsentDisclaimerText || '(not recorded)',
              sourcePage: doc.sourcePage,
              ipAddress: doc.ipAddress,
            } as any,
          })
          req.payload.logger.info(`[sms-consent] mirrored from contact-form for ${doc.phone}`)
        } catch (err) {
          req.payload.logger.warn({ err }, '[sms-consent] failed to mirror contact-form opt-in')
        }
      },
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        if (doc.suspectedSpam) {
          req.payload.logger.info(
            `[contact] suspected spam (${doc.spamSignals ?? 'flagged'}) saved as #${doc.id}; notification skipped`,
          )
          return
        }
        const notifyTo = process.env.CONTACT_NOTIFY_EMAIL || 'hello@blackhartconsulting.com'
        const from = process.env.EMAIL_FROM || 'noreply@blackhartconsulting.com'
        try {
          const { subject, html } = buildContactNotificationEmail(doc)
          await req.payload.sendEmail({
            to: notifyTo,
            from,
            // Reply-To points at the submitter so hitting "Reply" in your
            // inbox opens a draft to them, not to the no-reply sender.
            replyTo: doc.email,
            subject,
            html,
          })
          req.payload.logger.info(`[contact] notification emailed to ${notifyTo}`)
        } catch (err) {
          // No email adapter yet — Payload logs the email to console instead.
          // Wire @payloadcms/email-resend (or nodemailer) to deliver for real.
          req.payload.logger.warn({ err }, '[contact] email send failed (submission still saved)')
        }
      },
    ],
    afterError: [
      // One grep finds every rejected public submission. Until 2026-09-13 the
      // honeypot / cross-origin / rate-limit paths each logged a different
      // string and Payload validation failures (bad email, short message)
      // logged nothing, so a lead that got a 400 looked identical to a lead
      // that never reached the server. grep "\[contact\] rejected" now covers all.
      ({ error, req }) => {
        const isPublicHttpPost =
          !req.user && typeof req.method === 'string' && req.method.toUpperCase() === 'POST'
        if (!isPublicHttpPost) return
        const ipKey = (req.headers?.get?.('x-forwarded-for')?.split(',')[0] ?? '').trim() || 'unknown'
        const err = error as Error & { status?: number; data?: { errors?: Array<{ path?: string; message?: string }> } }
        const status = typeof err.status === 'number' ? err.status : 500
        const fields = err.data?.errors?.map((e) => `${e.path ?? '?'}: ${e.message ?? ''}`).join(' | ') || undefined
        const body = (req.data ?? {}) as Record<string, unknown>
        const email = typeof body.email === 'string' ? body.email.slice(0, 200) : undefined
        const sourcePage = typeof body.sourcePage === 'string' ? body.sourcePage.slice(0, 200) : undefined
        req.payload.logger.warn(
          { ip: ipKey, email, sourcePage, status, fields },
          `[contact] rejected reason=${JSON.stringify(err.message)} status=${status}`,
        )
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'formType', type: 'select', defaultValue: 'contact',
      admin: { description: 'Which form produced this lead.' },
      options: [
        { label: 'Contact form', value: 'contact' },
        { label: 'Demo site request', value: 'demo-request' },
      ],
    },
    {
      name: 'listingUrl', type: 'text',
      admin: { description: 'Demo requests: the Google Business Profile link or current website.' },
    },
    { name: 'phone', type: 'text', admin: { description: 'Optional. Only present if the submitter wanted SMS follow-up.' } },
    {
      name: 'smsConsent', type: 'checkbox', defaultValue: false,
      admin: { description: 'Set by the contact form when the submitter checks the SMS opt-in box.' },
    },
    {
      name: 'smsConsentDisclaimerText', type: 'textarea',
      admin: {
        description: 'Snapshot of the exact disclaimer the submitter saw at opt-in. Do not edit.',
        readOnly: true,
      },
    },
    {
      type: 'row',
      fields: [
        { name: 'company', type: 'text', admin: { width: '50%' } },
        {
          name: 'projectType', type: 'select', admin: { width: '50%' },
          options: [
            // Current catalog
            { label: 'Website', value: 'website' },
            { label: 'AI Front Desk', value: 'ai-front-desk' },
            { label: 'Automation', value: 'automation' },
            { label: 'Internal tool', value: 'internal-tool' },
            { label: 'Local SEO + AI Search', value: 'seo' },
            { label: 'Fix-it', value: 'fix-it' },
            { label: 'Something else', value: 'other' },
            // Legacy values kept so older submissions still display
            { label: 'Web app (legacy)', value: 'webapp' },
            { label: 'Mobile app (legacy)', value: 'mobile' },
            { label: 'Hosting (legacy)', value: 'hosting' },
            { label: 'Brand (legacy)', value: 'brand' },
            { label: 'Not sure yet (legacy)', value: 'unsure' },
          ],
        },
      ],
    },
    {
      name: 'budgetRange', type: 'select',
      options: [
        // Current ranges
        { label: 'Under $500', value: 'under-500' },
        { label: '$500 to $1,000', value: '500-1k' },
        { label: '$1,000 to $2,500', value: '1k-2500' },
        { label: '$2,500 to $5,000', value: '2500-5k' },
        { label: '$5,000+', value: '5k-plus' },
        // Legacy values kept so older submissions still display
        { label: 'Under $5k (legacy)', value: 'under-5k' },
        { label: '$5k to $10k (legacy)', value: '5-10k' },
        { label: '$10k to $25k (legacy)', value: '10-25k' },
        { label: '$25k to $50k (legacy)', value: '25-50k' },
        { label: '$50k+ (legacy)', value: '50k-plus' },
        { label: 'Not sure yet (legacy)', value: 'unsure' },
      ],
    },
    { name: 'message', type: 'textarea', required: true, minLength: 10, maxLength: 5000 },
    {
      name: 'attribution', type: 'group',
      admin: {
        description:
          'First-touch source captured in the visitor’s browser on their first page view (gclid / utm tags / referrer / landing page) and sent with the form. Read-only; blank for direct visits or when storage was blocked.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'utmSource', type: 'text', label: 'utm_source', admin: { readOnly: true, width: '33%' } },
            { name: 'utmMedium', type: 'text', label: 'utm_medium', admin: { readOnly: true, width: '33%' } },
            { name: 'utmCampaign', type: 'text', label: 'utm_campaign', admin: { readOnly: true, width: '33%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'utmTerm', type: 'text', label: 'utm_term (keyword)', admin: { readOnly: true, width: '50%' } },
            { name: 'utmContent', type: 'text', label: 'utm_content', admin: { readOnly: true, width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'gclid', type: 'text', admin: { readOnly: true, width: '20%', description: 'Google Ads click id' } },
            { name: 'gbraid', type: 'text', admin: { readOnly: true, width: '20%' } },
            { name: 'wbraid', type: 'text', admin: { readOnly: true, width: '20%' } },
            { name: 'msclkid', type: 'text', admin: { readOnly: true, width: '20%', description: 'Microsoft Ads' } },
            { name: 'fbclid', type: 'text', admin: { readOnly: true, width: '20%', description: 'Meta' } },
          ],
        },
        { name: 'referrer', type: 'text', admin: { readOnly: true, description: 'External referrer on first touch, if any.' } },
        { name: 'landingPath', type: 'text', admin: { readOnly: true, description: 'First page viewed, including query string.' } },
        { name: 'firstTouchAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      ],
    },
    {
      name: 'status', type: 'select', defaultValue: 'new',
      admin: { position: 'sidebar', description: 'Your workflow state — not shown to the sender.' },
      options: [
        { label: 'New', value: 'new' },
        { label: 'Replying', value: 'replying' },
        { label: 'Replied', value: 'replied' },
        { label: 'Not a fit', value: 'declined' },
        { label: 'Spam', value: 'spam' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'suspectedSpam', type: 'checkbox', defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Set automatically when the hidden honeypot field was filled. The record is kept but no notification email is sent. Real person? Uncheck and reply as normal.',
      },
    },
    {
      name: 'spamSignals', type: 'text',
      admin: {
        position: 'sidebar', readOnly: true,
        description: 'Soft signals recorded at submit time (honeypot, fast-submit). Informational only.',
      },
    },
    {
      name: 'timeToSubmitSec', type: 'number',
      admin: {
        position: 'sidebar', readOnly: true,
        description: 'Seconds between the form becoming interactive and the submit click.',
      },
    },
    {
      name: 'notes', type: 'textarea',
      admin: { position: 'sidebar', description: 'Private follow-up notes. Never sent to the submitter.' },
    },
    {
      name: 'sourcePage', type: 'text',
      admin: { position: 'sidebar', readOnly: true, description: 'Page the form was submitted from.' },
    },
    {
      name: 'ipAddress', type: 'text',
      admin: { position: 'sidebar', readOnly: true },
    },
    // Hidden from the admin UI; only bots (or an over-eager autofill) set it.
    // The submitted value is kept so a flagged record can be inspected.
    {
      name: 'honeypot', type: 'text',
      admin: { hidden: true, readOnly: true },
    },
  ],
  timestamps: true,
}
