import type { CollectionConfig } from 'payload'
import { clientHasLiveSubscription } from '@/lib/hosting-subscriptions'
import {
  allowCarePlanUpsellFor,
  defaultHostingForNewInvoice,
  HOSTING_MODE_OPTIONS,
  isHostingMode,
} from '@/lib/invoice-hosting'

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
//
// `hostingMode` (see src/lib/invoice-hosting.ts) decides how the /invoice
// page presents hosting: included in the order, offered as an add-on, or not
// shown. It is defaulted on CREATE from the client's "Hosting agreed" field
// and whether they already have a live subscription; the operator can change
// it freely afterwards. The legacy `allowCarePlanUpsell` checkbox is kept in
// sync from it and is deprecated.

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
      async ({ data, req, operation, originalDoc }) => {
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
        let client: { displayName?: string; priceMode?: string; hostingAgreed?: string | null } | null =
          null
        if (data.client) {
          try {
            client = (await req.payload.findByID({
              collection: 'clients',
              id: data.client as string | number,
              depth: 0,
            })) as { displayName?: string; priceMode?: string; hostingAgreed?: string | null } | null
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
          data.hostingMode = 'hidden'
        }

        // Hosting mode defaults — CREATE only, and only when the operator
        // hasn't already picked one on the form. Never re-runs on update, so
        // an operator override is permanent.
        if (operation === 'create' && !data.hostingMode) {
          let hasLiveSub = false
          if (data.client) {
            hasLiveSub = await clientHasLiveSubscription(
              req.payload,
              data.client as string | number,
            )
          }
          const defaults = defaultHostingForNewInvoice({
            clientHasLiveSubscription: hasLiveSub,
            hostingAgreed: client?.hostingAgreed ?? null,
          })
          data.hostingMode = defaults.hostingMode
          if (defaults.suggestedCarePlan) data.suggestedCarePlan = defaults.suggestedCarePlan
        }

        // Keep the deprecated `allowCarePlanUpsell` mirror truthful whenever a
        // mode exists, so anything still reading the boolean (reports, older
        // code paths) agrees with the mode.
        //
        // Deliberately does nothing for an invoice that has no mode stored:
        // those are the pre-existing rows whose boolean is still the source of
        // truth via deriveHostingMode(), and a partial update (e.g. the webhook
        // patching only `status`) must not flip it.
        const incomingMode = 'hostingMode' in data ? data.hostingMode : originalDoc?.hostingMode
        if (isHostingMode(incomingMode)) {
          data.allowCarePlanUpsell = allowCarePlanUpsellFor(incomingMode)
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
      // Three-way replacement for `allowCarePlanUpsell`. Left with no
      // defaultValue on purpose: an empty value means "this invoice predates
      // the field", and deriveHostingMode() falls back to the old boolean so
      // existing invoices render exactly as before. New invoices always get a
      // value from the create hook above.
      name: 'hostingMode',
      label: 'Hosting on this invoice',
      type: 'select',
      options: [...HOSTING_MODE_OPTIONS],
      admin: {
        position: 'sidebar',
        description:
          'Included = the client already agreed to hosting, so the invoice presents it as part of the order (with a one-tick authorization they must give before paying). Offer = optional add-on. Hidden = no hosting section. Defaulted on create from the client’s "Hosting agreed" field; change it freely.',
      },
    },
    {
      // Deprecated: superseded by `hostingMode`. Kept so the prod column
      // isn't dropped and so anything still reading the boolean keeps
      // working — the create/update hook mirrors the mode into it. Read-only
      // in the admin so it can't contradict the mode.
      name: 'allowCarePlanUpsell',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Deprecated — use "Hosting on this invoice" above. Auto-mirrored from it (checked for Included/Offer, unchecked for Hidden). Invoices created before the mode existed still use this value.',
      },
    },
    {
      name: 'suggestedCarePlan',
      type: 'select',
      options: [
        { label: 'Host · $59/mo', value: 'host' },
        { label: 'Care · $129/mo', value: 'care' },
        { label: 'Growth · $395/mo', value: 'growth' },
      ],
      defaultValue: 'care',
      admin: {
        position: 'sidebar',
        description:
          'Offer mode: pre-selected tier on the upsell card, client can switch. Included mode: the plan on the order — fixed, the client cannot change it.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: 'Draft (not sent to Stripe)', value: 'draft' },
        { label: 'Open (finalized, awaiting payment)', value: 'open' },
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
      label: 'Refunded',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
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
      // UI-only field: "Push to Stripe" + "Finalize and send" buttons. No DB
      // column. Posts to /api/invoices/[id]/sync and
      // /api/invoices/[id]/send-email.
      name: 'invoiceWorkflow',
      type: 'ui',
      label: 'Send this invoice',
      admin: {
        components: {
          Field: '/components/admin/InvoiceWorkflowField#default',
        },
      },
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
