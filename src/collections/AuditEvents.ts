import type { CollectionConfig } from 'payload'

// Append-only operator action log. Every meaningful admin-triggered or
// webhook-triggered billing action writes a row here so you can answer
// questions like "who clicked Send Email?", "when did this refund get
// issued?", "did the tier upgrade come from the customer portal or from
// us?" without grepping server logs.
//
// Read-only from the admin UI — the underlying events are immutable for
// audit-trail integrity. Hard-delete is allowed only for super-admin
// cleanup of test data.

export const AuditEvents: CollectionConfig = {
  slug: 'audit-events',
  labels: { singular: 'Audit event', plural: 'Audit events' },
  access: {
    create: () => true, // server-side helper writes these
    read: ({ req: { user } }) => Boolean(user),
    update: () => false, // immutable
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['action', 'actor', 'summary', 'createdAt'],
    description: 'Append-only audit trail of operator + webhook-driven billing actions.',
    listSearchableFields: ['summary', 'actor', 'action', 'subjectId'],
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        // Operator actions
        { label: 'Send invoice email', value: 'invoice.email_sent' },
        { label: 'Refund issued', value: 'invoice.refund_issued' },
        { label: 'Care plan signup email sent', value: 'care_plan.signup_sent' },
        { label: 'Client created', value: 'client.created' },
        { label: 'Client updated', value: 'client.updated' },
        // Webhook-driven (server-of-record)
        { label: 'Payment received', value: 'invoice.paid' },
        { label: 'Payment failed', value: 'invoice.payment_failed' },
        { label: 'Refund completed', value: 'invoice.refund_completed' },
        { label: 'Subscription created', value: 'subscription.created' },
        { label: 'Subscription canceled', value: 'subscription.canceled' },
        { label: 'Subscription updated', value: 'subscription.updated' },
      ],
    },
    {
      name: 'actor',
      type: 'text',
      required: true,
      admin: {
        description: 'Who triggered this. Email of admin user for operator actions; "stripe-webhook" for system events.',
      },
    },
    {
      name: 'summary',
      type: 'text',
      required: true,
      admin: { description: 'One-line human-readable summary, e.g. "Sent invoice INV-0042 to joe@coffee.com"' },
    },
    {
      name: 'subjectType',
      type: 'select',
      options: [
        { label: 'Invoice', value: 'invoice' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'Client', value: 'client' },
        { label: 'Other', value: 'other' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'subjectId',
      type: 'text',
      admin: { position: 'sidebar', description: 'Payload ID of the affected record.' },
    },
    {
      name: 'stripeId',
      type: 'text',
      admin: { position: 'sidebar', description: 'Linked Stripe ID (in_…, sub_…, etc.) when relevant.' },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: { description: 'Optional structured detail (amount, tier change, etc.).' },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true, description: 'Source IP for operator actions.' },
    },
  ],
  timestamps: true,
}
