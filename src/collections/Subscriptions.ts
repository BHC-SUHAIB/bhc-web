import type { CollectionConfig } from 'payload'

// Mirrors Stripe Subscription objects. Created by the Stripe webhook
// handler when:
//   - A client opts into a Care Plan during invoice checkout, OR
//   - A client subscribes via the standalone /care-plan/setup flow, OR
//   - You manually start a subscription in Stripe (e.g. Philip's hosting)
//
// Don't edit these records directly — Stripe is the source of truth.
// All non-status fields update via webhook.

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  labels: { singular: 'Subscription', plural: 'Subscriptions' },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: '❖ Billing',
    useAsTitle: 'displayLabel',
    defaultColumns: ['displayLabel', 'client', 'tier', 'monthlyAmountCents', 'status', 'currentPeriodEnd'],
    description: 'Recurring subscriptions (Care Plans + Philip-style hosting). Stripe is source of truth.',
  },
  fields: [
    {
      name: 'displayLabel',
      type: 'text',
      required: true,
      admin: { description: 'Auto-set, e.g. "Joe\'s Coffee · Growth Care Plan".' },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      hasMany: false,
    },
    {
      name: 'tier',
      type: 'select',
      required: true,
      options: [
        { label: 'Care', value: 'care' },
        { label: 'Growth', value: 'growth' },
        { label: 'Scale', value: 'scale' },
        { label: 'Hosting (friend rate)', value: 'hosting-friend' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      name: 'monthlyAmountCents',
      type: 'number',
      label: 'Monthly amount',
      required: true,
      min: 0,
      admin: {
        description: 'Monthly amount in dollars. Mirrored from Stripe price; do not edit manually.',
        readOnly: true,
        components: {
          Field: '/components/admin/CentsAsDollarsField#default',
          Cell: '/components/admin/CentsAsDollarsCell#default',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Past due', value: 'past_due' },
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Canceled', value: 'canceled' },
        { label: 'Incomplete', value: 'incomplete' },
        { label: 'Trialing', value: 'trialing' },
        { label: 'Paused', value: 'paused' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'stripeSubscriptionId',
      type: 'text',
      required: true,
      unique: true,
      admin: { position: 'sidebar', readOnly: true, description: 'sub_… ID' },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      required: true,
      admin: { position: 'sidebar', readOnly: true, description: 'cus_… ID' },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      required: true,
      admin: { position: 'sidebar', readOnly: true, description: 'price_… ID' },
    },
    {
      name: 'sourceInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      hasMany: false,
      admin: {
        description: 'The invoice this Care Plan was upsold from (if any). Useful for attribution.',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'currentPeriodEnd',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Next charge date. Updated by invoice.paid webhooks.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'canceledAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'consentRecord',
      type: 'group',
      admin: {
        description:
          'MIT consent snapshot. Required for chargeback defense on recurring charges. Captured at signup.',
      },
      fields: [
        { name: 'consentText', type: 'textarea', admin: { readOnly: true } },
        { name: 'authorizedAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'ipAddress', type: 'text', admin: { readOnly: true } },
        { name: 'userAgent', type: 'text', admin: { readOnly: true } },
      ],
    },
    {
      name: 'internalNotes',
      type: 'textarea',
    },
    {
      // (Phase E #29) Tier upgrade/downgrade UI. POSTs to
      // /api/subscriptions/[id]/change-tier with selected tier + proration
      // behavior. Stripe handles the math; webhook syncs Payload mirror.
      name: 'changeTier',
      type: 'ui',
      label: 'Change tier',
      admin: {
        components: {
          Field: '/components/admin/ChangeTierField#default',
        },
      },
    },
    {
      // Activity timeline — audit + webhook events scoped to this sub.
      name: 'activity',
      type: 'ui',
      label: 'Activity',
      admin: {
        components: {
          Field: {
            path: '/components/admin/DocActivityField#default',
            clientProps: { subjectType: 'subscription' },
          },
        },
      },
    },
  ],
  timestamps: true,
}
