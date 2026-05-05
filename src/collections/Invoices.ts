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
    group: 'Billing',
    useAsTitle: 'invoiceNumber',
    defaultColumns: ['invoiceNumber', 'client', 'totalCents', 'status', 'issuedAt', 'paidAt'],
    description: 'Project invoices. Create here, push to Stripe, share /invoice/[id]?token= link.',
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
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

        // Resolve the client once, lazily — used for invoice numbering AND
        // friend-mode defaults below.
        let client: { displayName?: string; priceMode?: string } | null = null
        if (data.client) {
          try {
            client = (await req.payload.findByID({
              collection: 'clients',
              id: data.client as string | number,
              depth: 0,
            })) as { displayName?: string; priceMode?: string } | null
          } catch {
            client = null
          }
        }

        // Auto-generate invoiceNumber when left blank.
        // Format: INV-<DISPLAYNAME>-NNN, where DISPLAYNAME is the client's
        // displayName uppercased and stripped to A-Z/0-9, and NNN is the
        // next sequential number across that client's invoices.
        const blank = !data.invoiceNumber || !String(data.invoiceNumber).trim()
        if (blank && client) {
          try {
            const display = (client.displayName || '').toString()
            const slug = display.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 40) || 'CLIENT'
            const prefix = `INV-${slug}-`

            const existing = await req.payload.find({
              collection: 'invoices',
              where: { invoiceNumber: { like: prefix } },
              limit: 1000,
              depth: 0,
            })
            const tail = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`)
            let maxN = 0
            for (const inv of existing.docs) {
              const num = (inv as { invoiceNumber?: string }).invoiceNumber || ''
              const m = num.match(tail)
              if (m) {
                const n = parseInt(m[1], 10)
                if (n > maxN) maxN = n
              }
            }
            const padded = String(maxN + 1).padStart(3, '0')
            data.invoiceNumber = `${prefix}${padded}`
          } catch (err) {
            req.payload.logger.warn(
              { err: err instanceof Error ? err.message : err, clientId: data.client },
              '[invoices] auto-generate invoice number failed (non-fatal)',
            )
          }
        }

        // Friend-mode defaults: when creating an invoice for a friend &
        // family client, default to off-platform (skipStripePush=true) and
        // hide the Care Plan upsell. Operator can still un-check skipStripePush
        // or re-enable the upsell after save by editing the invoice.
        if (operation === 'create' && client?.priceMode === 'friend_and_family') {
          data.skipStripePush = true
          data.allowCarePlanUpsell = false
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'invoiceNumber',
      type: 'text',
      unique: true,
      admin: {
        description:
          'Leave blank to auto-generate (INV-<CLIENT>-001, incremented per-client). Override only if you need a custom number.',
      },
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
      name: 'skipStripePush',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Off-platform invoice (Zelle / check / cash). When checked, this invoice stays Payload-only — never finalized in Stripe. Set Status to Paid and Paid With for the receipt to count toward MTD revenue.',
      },
    },
    {
      // Deprecated. Superseded by `paidWith` to avoid two redundant fields.
      // Kept here so an existing column in prod doesn't get dropped (and
      // doesn't trigger a destructive schema-push prompt). Don't write to
      // it from new code; remove in a follow-up after data is migrated.
      name: 'paymentChannel',
      type: 'select',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'Zelle', value: 'zelle' },
        { label: 'Check', value: 'check' },
        { label: 'Cash', value: 'cash' },
        { label: 'Wire transfer', value: 'wire' },
        { label: 'Other', value: 'other' },
      ],
      admin: { hidden: true },
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
        description:
          'When payment confirmed. Auto-set by Stripe webhook for Stripe invoices; editable for Payload-only (Zelle/check/cash) invoices.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'paidWith',
      type: 'select',
      admin: {
        position: 'sidebar',
        description:
          'Payment method used. Auto-set by Stripe webhook; editable for Payload-only invoices.',
      },
      options: [
        { label: 'Card', value: 'card' },
        { label: 'ACH (US bank)', value: 'us_bank_account' },
        { label: 'Klarna', value: 'klarna' },
        { label: 'Affirm', value: 'affirm' },
        { label: 'Link', value: 'link' },
        { label: 'Zelle', value: 'zelle' },
        { label: 'Check', value: 'check' },
        { label: 'Cash', value: 'cash' },
        { label: 'Wire transfer', value: 'wire' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: { description: 'Private notes — never visible to the client.' },
    },
    {
      // Activity timeline — audit + webhook events scoped to this invoice.
      name: 'activity',
      type: 'ui',
      label: 'Activity',
      admin: {
        components: {
          Field: {
            path: '/components/admin/DocActivityField#default',
            clientProps: { subjectType: 'invoice' },
          },
        },
      },
    },
  ],
  timestamps: true,
}
