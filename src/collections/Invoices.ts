import type { CollectionConfig } from 'payload'

// Invoices mirror Stripe Invoice objects 1:1 after sync. The flow:
//   1. You create an Invoice in Payload admin with line items
//   2. You click "Push to Stripe" (separate API route) to finalise it
//   3. Stripe returns the in_… ID + hosted URL; we save them here
//   4. Client visits /invoice/<stripeInvoiceId>?token=<signed>
//   5. Webhook flips status='paid' when the payment lands
//
// The accessToken lives only on the issued URL (signed via PAYLOAD_SECRET).
// We don't store it server-side — anyone with the link has access for the
// configured TTL.

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  labels: { singular: 'Invoice', plural: 'Invoices' },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'invoiceNumber',
    defaultColumns: ['invoiceNumber', 'client', 'totalCents', 'status', 'issuedAt', 'paidAt'],
    description: 'Project invoices. Create here, push to Stripe, share /invoice/[id]?token= link.',
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Auto-compute totalCents from lineItems on every save so the admin
        // never needs to keep them in sync manually.
        if (Array.isArray(data.lineItems)) {
          let sum = 0
          for (const li of data.lineItems) {
            const amt = Number(li?.amountCents) || 0
            const qty = Number(li?.quantity) || 1
            sum += amt * qty
          }
          data.totalCents = sum
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'invoiceNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Human-friendly invoice number (e.g. INV-0042). Shown on the invoice page.' },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      hasMany: false,
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: false,
      admin: { description: 'Optional. Links the invoice to a published case study / project.' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional summary shown above line items on the invoice page.' },
    },
    {
      name: 'lineItems',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Line item', plural: 'Line items' },
      fields: [
        { name: 'description', type: 'text', required: true },
        {
          name: 'amountCents',
          type: 'number',
          label: 'Amount',
          required: true,
          min: 0,
          admin: {
            description: 'Per-unit amount in dollars (e.g. 1500 or 1500.00).',
            components: {
              Field: '/components/admin/CentsAsDollarsField#default',
              Cell: '/components/admin/CentsAsDollarsCell#default',
            },
          },
        },
        { name: 'quantity', type: 'number', defaultValue: 1, min: 1 },
      ],
    },
    {
      name: 'totalCents',
      type: 'number',
      label: 'Total',
      required: true,
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Auto-computed from line items × quantity.',
        components: {
          Field: '/components/admin/CentsAsDollarsField#default',
          Cell: '/components/admin/CentsAsDollarsCell#default',
        },
      },
    },
    {
      name: 'allowCarePlanUpsell',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'When checked, the /invoice page shows a Care Plan toggle alongside the Pay button.',
      },
    },
    {
      name: 'suggestedCarePlan',
      type: 'select',
      options: [
        { label: 'Care — $149/mo', value: 'care' },
        { label: 'Growth — $495/mo', value: 'growth' },
        { label: 'Scale — $1,295/mo', value: 'scale' },
      ],
      defaultValue: 'care',
      admin: {
        position: 'sidebar',
        description: 'Pre-selected tier on the upsell card. Client can switch.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: 'Draft (not sent to Stripe)', value: 'draft' },
        { label: 'Open (sent, awaiting payment)', value: 'open' },
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded (full)', value: 'refunded' },
        { label: 'Partially refunded', value: 'partially_refunded' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Void', value: 'void' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      // (#16) Total amount refunded across one or more refunds. Cached
      // from `charge.refunded` and `credit_note.created` webhooks.
      name: 'refundedCents',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        label: 'Refunded',
        description: 'Total refunded amount. Updated by Stripe webhooks.',
        components: {
          Field: '/components/admin/CentsAsDollarsField#default',
          Cell: '/components/admin/CentsAsDollarsCell#default',
        },
      },
    },
    {
      name: 'stripeInvoiceId',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'in_… ID. Set when pushed to Stripe.',
      },
    },
    {
      // Cached from the Stripe Invoice's `subscription` field on mirror.
      // Lets the /invoice/[id] page suppress the Care Plan upsell without
      // making a live Stripe API call on every render.
      name: 'stripeSubscriptionId',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'sub_… ID if this invoice bills a subscription. Set by webhook.',
      },
    },
    {
      name: 'stripeHostedUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stripe-hosted invoice URL. Backup channel if the branded /invoice page is down.',
      },
    },
    {
      name: 'issuedAt',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'dueAt',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'paidAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Set automatically by the Stripe webhook when payment confirms.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'paidWith',
      type: 'select',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Payment method used. Set by webhook.',
      },
      options: [
        { label: 'Card', value: 'card' },
        { label: 'ACH (US bank)', value: 'us_bank_account' },
        { label: 'Klarna', value: 'klarna' },
        { label: 'Affirm', value: 'affirm' },
        { label: 'Link', value: 'link' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: { description: 'Private notes — never visible to the client.' },
    },
  ],
  timestamps: true,
}
