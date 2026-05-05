import type { CollectionConfig } from 'payload'

/**
 * SMS opt-in audit log. Every record is a single, timestamped act of
 * consent: who, from which phone, from which entry point, and the EXACT
 * disclaimer text they saw at the moment they checked the box. The
 * disclaimerText snapshot matters — if we change wording later, existing
 * consent records still reflect what the user actually agreed to.
 *
 * Status flips to 'revoked' when the contact texts STOP or asks to be
 * removed. Keep revoked records; don't delete — they're the proof that
 * the opt-out was honored.
 */
export const SmsConsents: CollectionConfig = {
  slug: 'sms-consents',
  labels: { singular: 'SMS consent', plural: 'SMS consents' },
  access: {
    // Public POST (opt-in form). Reads/updates/deletes admin-only.
    create: () => true,
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: '✉ Leads',
    useAsTitle: 'phone',
    defaultColumns: ['phone', 'name', 'source', 'status', 'createdAt'],
    description: 'Audit trail of SMS opt-ins from the website. Keep for A2P 10DLC compliance.',
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (!data) return data
        // Honeypot
        if (typeof data.honeypot === 'string' && data.honeypot.trim().length > 0) {
          req.payload.logger.warn({ phone: data.phone }, '[sms-consent] spam dropped (honeypot)')
          throw new Error('Invalid submission')
        }
        if (!data.ipAddress) {
          const fwd = req.headers?.get?.('x-forwarded-for')
          data.ipAddress = (fwd?.split(',')[0] ?? '').trim() || undefined
        }
        if (!data.userAgent) {
          data.userAgent = req.headers?.get?.('user-agent') || undefined
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text', required: true, admin: { description: 'Digits only; formatted for display in reports.' } },
    { name: 'email', type: 'email' },
    {
      name: 'source', type: 'select', required: true, defaultValue: 'sms-page',
      options: [
        { label: 'Standalone /sms page', value: 'sms-page' },
        { label: 'Contact form (checkbox)', value: 'contact-form' },
        { label: 'Verbal (recorded manually)', value: 'verbal' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'status', type: 'select', defaultValue: 'active',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Revoked (replied STOP)', value: 'revoked' },
      ],
    },
    {
      name: 'disclaimerText', type: 'textarea', required: true,
      admin: { description: 'Exact disclaimer shown to the user at opt-in time. Snapshot for audit \u2014 do not edit after the fact.' },
    },
    { name: 'sourcePage', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    { name: 'ipAddress', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    { name: 'userAgent', type: 'textarea', admin: { position: 'sidebar', readOnly: true } },
    { name: 'revokedAt', type: 'date', admin: { position: 'sidebar', description: 'When the contact opted out.' } },
    { name: 'notes', type: 'textarea', admin: { position: 'sidebar', description: 'Internal notes.' } },
    // Hidden honeypot
    { name: 'honeypot', type: 'text', admin: { hidden: true, readOnly: true } },
  ],
  timestamps: true,
}
