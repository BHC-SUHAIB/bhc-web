import type { CollectionConfig } from 'payload'

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
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'company', 'projectType', 'status', 'createdAt'],
    description: 'Inquiries submitted through the /contact form.',
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (!data) return data
        // Honeypot: real humans never see this field, so any non-empty value
        // flags a bot and we reject it without creating a record.
        if (typeof data.honeypot === 'string' && data.honeypot.trim().length > 0) {
          req.payload.logger.warn({ ip: req.headers?.get?.('x-forwarded-for'), email: data.email }, '[contact] spam dropped (honeypot)')
          throw new Error('Invalid submission')
        }
        // Capture the source IP so we can rate-limit / block later.
        if (!data.ipAddress) {
          const fwd = req.headers?.get?.('x-forwarded-for')
          data.ipAddress = (fwd?.split(',')[0] ?? '').trim() || undefined
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        const notifyTo = process.env.CONTACT_NOTIFY_EMAIL || 'hello@blackhartconsulting.com'
        const from = process.env.EMAIL_FROM || 'noreply@blackhartconsulting.com'
        try {
          await req.payload.sendEmail({
            to: notifyTo,
            from,
            // Reply-To points at the submitter so hitting "Reply" in your
            // inbox opens a draft to them, not to the no-reply sender.
            replyTo: doc.email,
            subject: `New inquiry from ${doc.name}`,
            html: [
              `<h2 style="font-family:Georgia,serif;">New contact inquiry</h2>`,
              `<p><strong>Name:</strong> ${escapeHtml(doc.name)}</p>`,
              `<p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(doc.email)}">${escapeHtml(doc.email)}</a></p>`,
              doc.company ? `<p><strong>Company:</strong> ${escapeHtml(doc.company)}</p>` : '',
              doc.projectType ? `<p><strong>Project type:</strong> ${escapeHtml(doc.projectType)}</p>` : '',
              doc.budgetRange ? `<p><strong>Budget:</strong> ${escapeHtml(doc.budgetRange)}</p>` : '',
              `<hr style="border:none;border-top:1px solid #ccc;margin:16px 0;">`,
              `<p style="white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(doc.message)}</p>`,
              doc.sourcePage ? `<p style="color:#888;font-size:12px;margin-top:24px;">Submitted from ${escapeHtml(doc.sourcePage)}</p>` : '',
            ].filter(Boolean).join(''),
          })
          req.payload.logger.info(`[contact] notification emailed to ${notifyTo}`)
        } catch (err) {
          // No email adapter yet \u2014 Payload logs the email to console instead.
          // Wire @payloadcms/email-resend (or nodemailer) to deliver for real.
          req.payload.logger.warn({ err }, '[contact] email send failed (submission still saved)')
        }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      type: 'row',
      fields: [
        { name: 'company', type: 'text', admin: { width: '50%' } },
        {
          name: 'projectType', type: 'select', admin: { width: '50%' },
          options: [
            { label: 'Website', value: 'website' },
            { label: 'Web app', value: 'webapp' },
            { label: 'Mobile app', value: 'mobile' },
            { label: 'SEO engagement', value: 'seo' },
            { label: 'Hosting / infrastructure', value: 'hosting' },
            { label: 'Brand / design', value: 'brand' },
            { label: 'Not sure yet', value: 'unsure' },
            { label: 'Other', value: 'other' },
          ],
        },
      ],
    },
    {
      name: 'budgetRange', type: 'select',
      options: [
        { label: 'Under $5k', value: 'under-5k' },
        { label: '$5k \u2013 $10k', value: '5-10k' },
        { label: '$10k \u2013 $25k', value: '10-25k' },
        { label: '$25k \u2013 $50k', value: '25-50k' },
        { label: '$50k+', value: '50k-plus' },
        { label: 'Not sure yet', value: 'unsure' },
      ],
    },
    { name: 'message', type: 'textarea', required: true, minLength: 10, maxLength: 5000 },
    {
      name: 'status', type: 'select', defaultValue: 'new',
      admin: { position: 'sidebar', description: 'Your workflow state \u2014 not shown to the sender.' },
      options: [
        { label: 'New', value: 'new' },
        { label: 'Replying', value: 'replying' },
        { label: 'Replied', value: 'replied' },
        { label: 'Not a fit', value: 'declined' },
        { label: 'Archived', value: 'archived' },
      ],
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
    // Hidden from the admin UI; only set by bots.
    {
      name: 'honeypot', type: 'text',
      admin: { hidden: true, readOnly: true },
    },
  ],
  timestamps: true,
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
