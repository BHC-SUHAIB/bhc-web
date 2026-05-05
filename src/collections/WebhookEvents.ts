import type { CollectionConfig } from 'payload'

// Idempotency log for Stripe webhooks. Every incoming event gets a row
// keyed by its Stripe event ID — first-write-wins. If Stripe retries the
// same event (which it WILL, up to 17 times across 3 days on any non-2xx),
// the second write is rejected by the unique constraint and we skip
// reprocessing.
//
// Status field exists so we can debug stuck events: an event in 'processing'
// for >5 min is a crashed handler; an event in 'failed' needs manual review.

export const WebhookEvents: CollectionConfig = {
  slug: 'webhook-events',
  labels: { singular: 'Webhook event', plural: 'Webhook events' },
  access: {
    // Webhook handler creates these as the system; admin reads them.
    create: () => true,
    read: ({ req: { user } }) => Boolean(user),
    update: () => true, // handler updates status as it progresses
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: 'System',
    useAsTitle: 'stripeEventId',
    defaultColumns: ['stripeEventId', 'eventType', 'status', 'createdAt'],
    description: 'Idempotency log for Stripe webhook deliveries. Read-only debug view.',
  },
  fields: [
    {
      name: 'stripeEventId',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'evt_… ID from Stripe. Unique key prevents duplicate processing.' },
    },
    {
      name: 'eventType',
      type: 'text',
      required: true,
      admin: { description: 'e.g. checkout.session.completed' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'processing',
      options: [
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Skipped (no handler)', value: 'skipped' },
      ],
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      admin: { description: 'Populated only if status=failed.' },
    },
    {
      name: 'rawPayloadSummary',
      type: 'textarea',
      admin: { description: 'Truncated event summary for debugging. Full payload lives in Stripe dashboard.' },
    },
  ],
  timestamps: true,
}
