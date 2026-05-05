// Slack incoming-webhook helper — sends operator notifications to your
// configured channel (#bhc-billing or wherever the SLACK_BILLING_WEBHOOK_URL
// points). Uses Slack Block Kit for richer formatting than plain text.
//
// All sends are best-effort: a Slack outage should NEVER block a Stripe
// webhook from succeeding. We catch + log errors but don't re-throw.
//
// Set SLACK_BILLING_WEBHOOK_URL=https://hooks.slack.com/services/T../B../...
// in your env. If unset, every helper here is a no-op.

import type { Payload } from 'payload'

type SlackBlock = Record<string, unknown>
type SlackPayload = {
  text: string
  blocks?: SlackBlock[]
  username?: string
  icon_emoji?: string
}

const TIMEOUT_MS = 5000

function getWebhookUrl(): string | null {
  const url = process.env.SLACK_BILLING_WEBHOOK_URL
  if (!url || !url.startsWith('https://hooks.slack.com/')) return null
  return url
}

async function postToSlack(payload: SlackPayload, logger?: Payload['logger']): Promise<boolean> {
  const url = getWebhookUrl()
  if (!url) return false

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    if (!r.ok) {
      logger?.warn({ status: r.status }, '[slack] webhook returned non-2xx')
      return false
    }
    return true
  } catch (err) {
    logger?.warn({ err: err instanceof Error ? err.message : err }, '[slack] post failed')
    return false
  } finally {
    clearTimeout(timer)
  }
}

const fmt$ = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// ──────────────── public helpers ────────────────

export type SlackEvent =
  | {
      kind: 'payment_received'
      clientName: string
      clientEmail: string
      amountCents: number
      invoiceNumber: string
      paymentMethod: string
    }
  | {
      kind: 'payment_failed'
      clientName: string
      clientEmail: string
      amountCents: number
      invoiceNumber: string
      subscriptionId: string | null
    }
  | {
      kind: 'new_client'
      clientName: string
      clientEmail: string
      stripeCustomerId: string
    }
  | {
      kind: 'new_subscription'
      clientName: string
      tierLabel: string
      monthlyAmountCents: number
    }
  | {
      kind: 'subscription_canceled'
      clientName: string
      tierLabel: string
      monthlyAmountCents: number
      reason?: string | null
    }
  | {
      kind: 'invoice_email_sent'
      clientName: string
      clientEmail: string
      invoiceNumber: string
      amountCents: number
    }
  | {
      kind: 'webhook_error'
      eventType: string
      eventId: string
      errorMessage: string
    }
  | {
      kind: 'refund'
      clientName: string
      invoiceNumber: string
      refundedCents: number
      isFullRefund: boolean
    }

export async function notifySlack(event: SlackEvent, logger?: Payload['logger']): Promise<void> {
  const payload = renderEvent(event)
  await postToSlack(payload, logger)
}

function renderEvent(event: SlackEvent): SlackPayload {
  switch (event.kind) {
    case 'payment_received':
      return {
        text: `💰 Payment received: ${fmt$(event.amountCents)} from ${event.clientName}`,
        blocks: [
          header(`💰 ${fmt$(event.amountCents)} received`),
          fields([
            ['Client', `${event.clientName} · ${event.clientEmail}`],
            ['Invoice', event.invoiceNumber],
            ['Payment method', event.paymentMethod],
          ]),
        ],
      }

    case 'payment_failed':
      return {
        text: `🚨 Payment failed: ${event.clientName} (${fmt$(event.amountCents)})`,
        blocks: [
          header(`🚨 Payment failed`),
          fields([
            ['Client', `${event.clientName} · ${event.clientEmail}`],
            ['Invoice', event.invoiceNumber],
            ['Amount', fmt$(event.amountCents)],
            ['Subscription', event.subscriptionId ? '`' + event.subscriptionId + '`' : '—'],
          ]),
          context(
            'Stripe will auto-retry per Smart Retry settings. The Payload sub is now `past_due`. Reach out to the client for a card update if needed.',
          ),
        ],
      }

    case 'new_client':
      return {
        text: `📝 New client: ${event.clientName}`,
        blocks: [
          header(`📝 New client created`),
          fields([
            ['Name', event.clientName],
            ['Email', event.clientEmail],
            ['Stripe customer', '`' + event.stripeCustomerId + '`'],
          ]),
        ],
      }

    case 'new_subscription':
      return {
        text: `🆕 ${event.clientName} subscribed to ${event.tierLabel}`,
        blocks: [
          header(`🆕 New subscription`),
          fields([
            ['Client', event.clientName],
            ['Plan', event.tierLabel],
            ['Monthly', `${fmt$(event.monthlyAmountCents)}/mo`],
          ]),
        ],
      }

    case 'subscription_canceled':
      return {
        text: `🛑 ${event.clientName} canceled ${event.tierLabel}`,
        blocks: [
          header(`🛑 Subscription canceled`),
          fields([
            ['Client', event.clientName],
            ['Plan', event.tierLabel],
            ['MRR lost', `${fmt$(event.monthlyAmountCents)}/mo`],
            ['Reason', event.reason ?? 'not provided'],
          ]),
        ],
      }

    case 'invoice_email_sent':
      return {
        text: `📊 Invoice email sent to ${event.clientName}`,
        blocks: [
          header(`📊 Invoice email sent`),
          fields([
            ['Client', `${event.clientName} · ${event.clientEmail}`],
            ['Invoice', event.invoiceNumber],
            ['Amount', fmt$(event.amountCents)],
          ]),
        ],
      }

    case 'refund':
      return {
        text: `↩️ Refund ${event.isFullRefund ? '(full)' : '(partial)'}: ${fmt$(event.refundedCents)} on ${event.invoiceNumber}`,
        blocks: [
          header(`↩️ Refund ${event.isFullRefund ? '(full)' : '(partial)'}`),
          fields([
            ['Client', event.clientName],
            ['Invoice', event.invoiceNumber],
            ['Refunded', fmt$(event.refundedCents)],
          ]),
        ],
      }

    case 'webhook_error':
      return {
        text: `🔥 Webhook handler error: ${event.eventType}`,
        blocks: [
          header(`🔥 Webhook handler error`),
          fields([
            ['Event', event.eventType],
            ['Event ID', '`' + event.eventId + '`'],
            ['Error', event.errorMessage.slice(0, 500)],
          ]),
          context('Check the dev server logs and Stripe will auto-retry.'),
        ],
      }
  }
}

// ──────────────── Block Kit primitives ────────────────

function header(text: string): SlackBlock {
  return {
    type: 'header',
    text: { type: 'plain_text', text, emoji: true },
  }
}

function fields(pairs: Array<[string, string]>): SlackBlock {
  return {
    type: 'section',
    fields: pairs.map(([label, value]) => ({
      type: 'mrkdwn',
      text: `*${label}*\n${value}`,
    })),
  }
}

function context(text: string): SlackBlock {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text }],
  }
}
