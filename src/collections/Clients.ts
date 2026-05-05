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
    useAsTitle: 'displayName',
    // (Phase E #31) `isDelinquent` shown prominently in the list so at-risk
    // clients surface at-a-glance.
    defaultColumns: ['displayName', 'email', 'isDelinquent', 'company', 'stripeCustomerId', 'createdAt'],
    description: 'Clients you bill. Saving a new client auto-creates the matching Stripe Customer.',
  },
  hooks: {
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
      name: 'displayName',
      type: 'text',
      required: true,
      admin: { description: 'How this client appears in invoices and lists. Usually their name or company.' },
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
  ],
  timestamps: true,
}
