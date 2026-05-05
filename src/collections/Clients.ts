import type { CollectionConfig } from 'payload'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

// One Client = one human/business we bill. Mirrors a Stripe Customer 1:1
// after their first invoice. We dedupe by email so a returning client on
// project #2 reuses the same Stripe Customer (cleaner LTV math, fewer
// duplicate billing records).
//
// Created either:
//   - Manually in the admin → afterChange hook auto-creates the Stripe
//     Customer + writes cus_… back to this record (so you can immediately
//     open Stripe and start invoicing them)
//   - Auto-created by the webhook handler if a payment lands without a
//     pre-existing Client record (rare, only for direct Payment Link buys)

export const Clients: CollectionConfig = {
  slug: 'clients',
  labels: { singular: 'Client', plural: 'Clients' },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: 'Billing',
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'email', 'isDelinquent', 'company', 'stripeCustomerId', 'createdAt'],
    description: 'Clients you bill. Saving a new client auto-creates the matching Stripe Customer.',
  },
  hooks: {
    beforeChange: [
      // Auto-fill sourceLp from the most recent ContactSubmission with a
      // matching email, when creating a new Client without one explicitly
      // set. Lets the operator convert a lead → client without manually
      // copying the LP source.
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        if (!data) return data
        if (data.sourceLp) return data
        if (!data.email) return data
        try {
          const matches = await req.payload.find({
            collection: 'contact-submissions',
            where: { email: { equals: data.email } },
            sort: '-createdAt',
            limit: 1,
            depth: 0,
          })
          if (matches.totalDocs > 0) {
            const cs = matches.docs[0] as { sourcePage?: string | null }
            if (cs.sourcePage) {
              data.sourceLp = cs.sourcePage
            }
          }
        } catch (err) {
          req.payload.logger.warn(
            { err: err instanceof Error ? err.message : err, email: data.email },
            '[clients] sourceLp auto-fill lookup failed (non-fatal)',
          )
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req, context }) => {
        // Webhook-driven updates set context.skipStripeSync to prevent
        // infinite loops (Stripe → Payload → Stripe → …).
        if (context?.skipStripeSync) return doc
        if (!isStripeConfigured()) return doc

        // CREATE: push new Customer to Stripe, dedup by email.
        if (operation === 'create') {
          if (doc.stripeCustomerId) return doc
          if (!doc.email) return doc

          try {
            const stripe = getStripe()
            const existing = await stripe.customers.list({ email: doc.email, limit: 1 })
            let stripeCustomerId: string
            if (existing.data.length > 0) {
              stripeCustomerId = existing.data[0].id
              req.payload.logger.info(
                { clientId: doc.id, stripeCustomerId, email: doc.email },
                '[clients] linked existing Stripe Customer by email',
              )
            } else {
              const created = await stripe.customers.create({
                email: doc.email,
                name: doc.displayName,
                phone: doc.phone || undefined,
                metadata: {
                  payload_client_id: String(doc.id),
                  ...(doc.company ? { company: doc.company } : {}),
                  ...(doc.firstName ? { first_name: doc.firstName } : {}),
                  ...(doc.lastName ? { last_name: doc.lastName } : {}),
                  ...(doc.sourceLp ? { source_lp: doc.sourceLp } : {}),
                },
              })
              stripeCustomerId = created.id
              req.payload.logger.info(
                { clientId: doc.id, stripeCustomerId },
                '[clients] created Stripe Customer',
              )
            }

            await req.payload.update({
              collection: 'clients',
              id: doc.id,
              data: { stripeCustomerId },
              context: { skipStripeSync: true } as never,
            })
            return { ...doc, stripeCustomerId }
          } catch (err) {
            req.payload.logger.error(
              { err, clientId: doc.id, email: doc.email },
              '[clients] Stripe Customer create failed (non-fatal)',
            )
          }
          return doc
        }

        // UPDATE: sync edits back to Stripe so the dashboards stay in
        // lockstep. We only push the fields Stripe Customer supports
        // (name, email, phone, metadata).
        if (operation === 'update') {
          if (!doc.stripeCustomerId) return doc
          try {
            const stripe = getStripe()
            await stripe.customers.update(doc.stripeCustomerId, {
              name: doc.displayName ?? undefined,
              email: doc.email ?? undefined,
              phone: doc.phone || undefined,
              metadata: {
                payload_client_id: String(doc.id),
                ...(doc.company ? { company: doc.company } : { company: '' }),
                ...(doc.firstName ? { first_name: doc.firstName } : { first_name: '' }),
                ...(doc.lastName ? { last_name: doc.lastName } : { last_name: '' }),
                ...(doc.sourceLp ? { source_lp: doc.sourceLp } : { source_lp: '' }),
              },
            })
            req.payload.logger.info(
              { clientId: doc.id, stripeCustomerId: doc.stripeCustomerId },
              '[clients] synced edits to Stripe Customer',
            )
          } catch (err) {
            req.payload.logger.error(
              { err, clientId: doc.id },
              '[clients] Stripe Customer update failed (non-fatal)',
            )
          }
          return doc
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', admin: { width: '50%' } },
        { name: 'lastName', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      admin: {
        description:
          'How this client appears in invoices and lists. Auto-fills from Company (or First + Last if no Company) — override only if you want something different.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (value && String(value).trim()) return value
            const company = (data?.company as string | undefined)?.trim()
            if (company) return company
            const first = (data?.firstName as string | undefined)?.trim()
            const last = (data?.lastName as string | undefined)?.trim()
            const full = [first, last].filter(Boolean).join(' ')
            if (full) return full
            return value
          },
        ],
      },
    },
    {
      // (#9) Email is NOT marked unique. Stripe Customers don't enforce
      // email uniqueness either (you can have two customers with the same
      // email — different companies, etc.). We dedup by stripeCustomerId,
      // not email. Letting two clients share an email is occasionally
      // legitimate.
      name: 'email',
      type: 'email',
      required: true,
    },
    { name: 'phone', type: 'text' },
    { name: 'company', type: 'text' },
    {
      name: 'stripeCustomerId',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'cus_… ID. Set automatically by the first checkout/webhook; do not edit.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Private notes — never visible to the client.' },
    },
    {
      name: 'tags',
      type: 'array',
      labels: { singular: 'Tag', plural: 'Tags' },
      fields: [{ name: 'value', type: 'text' }],
      admin: { description: 'Free-form tags for filtering (e.g. "heights", "founding-client", "referral").' },
    },
    {
      // Attribution: which LP / page produced this client. Auto-fills from
      // the most recent ContactSubmission with a matching email when the
      // Client is first created. Pushed to the Stripe Customer's
      // metadata.source_lp so reporting in Stripe Dashboard can also
      // segment by LP.
      name: 'sourceLp',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'LP / page that produced this client (e.g. "/lp/heights-dental"). Auto-filled from contact form on create. Editable.',
      },
    },
    {
      // (Phase E #31) "At risk" flag — set by the bulk-ops cron when a
      // client has 2+ failed payments on any of their subs in the last
      // 90 days. Resets to false when subs return to active status.
      name: 'isDelinquent',
      type: 'checkbox',
      label: 'Status',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Auto-flagged when 2+ payments fail in 90d. Reach out manually before churn.',
        components: {
          Cell: '/components/admin/DelinquentBadgeCell#default',
        },
      },
    },
    {
      name: 'delinquentAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'When the at-risk flag was first raised. Cleared when sub recovers.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      // UI-only field: renders a tier picker + "Send Care Plan signup email"
      // button. No DB column. Posts to /api/clients/[id]/send-care-plan-signup.
      name: 'sendCarePlanSignup',
      type: 'ui',
      label: 'Care Plan signup email',
      admin: {
        components: {
          Field: '/components/admin/SendCarePlanSignupField#default',
        },
      },
    },
    {
      // UI-only field: renders all invoices + subscriptions for this client
      // with inline "Send invoice email" buttons. Posts to
      // /api/clients/[id]/related (read) and /api/invoices/[id]/send-email.
      name: 'relatedRecords',
      type: 'ui',
      label: 'Invoices & subscriptions',
      admin: {
        components: {
          Field: '/components/admin/ClientRelatedRecordsField#default',
        },
      },
    },
    {
      // Activity timeline — audit + Stripe webhook events scoped to this
      // client. Replaces flipping between AuditEvents/WebhookEvents in
      // the sidebar.
      name: 'activity',
      type: 'ui',
      label: 'Activity',
      admin: {
        components: {
          Field: {
            path: '/components/admin/DocActivityField#default',
            clientProps: { subjectType: 'client' },
          },
        },
      },
    },
  ],
  timestamps: true,
}
