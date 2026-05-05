import type { Payload } from 'payload'

// Thin helper around payload.create({ collection: 'audit-events' }).
// All billing-action sites call this so the audit trail is consistent.
//
// Best-effort: we never block the underlying operation if the audit write
// fails (e.g. DB hiccup). Errors get logged but the email/refund/whatever
// still completes.

export type AuditAction =
  | 'invoice.email_sent'
  | 'invoice.refund_issued'
  | 'care_plan.signup_sent'
  | 'client.created'
  | 'client.updated'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.refund_completed'
  | 'subscription.created'
  | 'subscription.canceled'
  | 'subscription.updated'

export type AuditSubjectType = 'invoice' | 'subscription' | 'client' | 'other'

export type AuditEvent = {
  action: AuditAction
  actor: string
  summary: string
  subjectType?: AuditSubjectType
  subjectId?: string | number | null
  stripeId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}

export async function recordAudit(payload: Payload, event: AuditEvent): Promise<void> {
  try {
    await payload.create({
      collection: 'audit-events',
      data: {
        action: event.action,
        actor: event.actor,
        summary: event.summary,
        subjectType: event.subjectType,
        subjectId: event.subjectId != null ? String(event.subjectId) : undefined,
        stripeId: event.stripeId ?? undefined,
        metadata: event.metadata ?? undefined,
        ipAddress: event.ipAddress ?? undefined,
      } as never,
    })
  } catch (err) {
    payload.logger.warn(
      { err: err instanceof Error ? err.message : err, action: event.action },
      '[audit] write failed (operation continues)',
    )
  }
}
