import type { Payload } from 'payload'
import type Stripe from 'stripe'
import { signInvoiceToken } from '@/lib/invoice-token'
import { formatUSD, type CarePlanSlug } from '@/lib/care-plans'

// Branded transactional emails for the Stripe→BHC integration. These
// replace what Stripe's default invoice/subscription emails would send,
// so the client sees the BHC branding throughout the payment flow.
//
// Sent via Payload's configured email adapter (Resend in production,
// console-log in dev when RESEND_API_KEY is unset).

const escapeHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com'
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || 'hello@blackhartconsulting.com'
}

// (#17) Billing-specific from-address for invoice / care-plan / payment-failed
// emails. Falls back to EMAIL_FROM if unset, then to a sensible default.
// Set EMAIL_FROM_BILLING=invoicing@blackhartconsulting.com in .env once the
// Google Workspace alias is created.
function billingFromAddress(): string {
  return (
    process.env.EMAIL_FROM_BILLING ||
    process.env.EMAIL_FROM ||
    'invoicing@blackhartconsulting.com'
  )
}

export async function sendBrandedInvoiceEmail(args: {
  payload: Payload
  to: string
  clientName: string
  invoice: Stripe.Invoice
}): Promise<void> {
  const { payload, to, clientName, invoice } = args
  if (!invoice.id) return
  const token = signInvoiceToken(invoice.id)
  const url = `${siteUrl()}/invoice/${invoice.id}?token=${encodeURIComponent(token)}`

  const number = invoice.number || invoice.id
  const total = formatUSD(invoice.amount_due ?? invoice.total ?? 0)
  const dueDate = invoice.due_date ? new Date(invoice.due_date * 1000) : null
  const dueLine = dueDate
    ? `Due by ${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
    : ''

  const lineItemsHtml = (invoice.lines.data ?? [])
    .map((li) => {
      const desc = li.description || (li.price?.product as Stripe.Product | string)?.toString() || 'Item'
      const amount = formatUSD(li.amount ?? 0)
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e5e5;">${escapeHtml(desc)}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #e5e5e5;font-variant-numeric:tabular-nums;">${amount}</td></tr>`
    })
    .join('')

  const html = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Invoice ${escapeHtml(number)}</title>
</head><body style="font-family:Georgia,'Times New Roman',serif;background:#F4EFE6;margin:0;padding:32px 16px;color:#1a1a1a;">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#FAF7F2;border-radius:14px;padding:32px;">
    <tr><td>
      <p style="font-family:'Manrope',sans-serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#666;margin:0 0 16px;">Black Hart Consulting</p>
      <h1 style="font-size:28px;line-height:1.1;margin:0 0 16px;letter-spacing:-0.02em;color:#1a1a1a;">Your invoice is ready</h1>
      <p style="font-size:16px;line-height:1.5;color:#444;margin:0 0 24px;">Hi ${escapeHtml(clientName)}, your invoice <strong>${escapeHtml(number)}</strong> for <strong>${total}</strong> is ready to pay. ${escapeHtml(dueLine)}</p>

      <table role="presentation" style="width:100%;border-collapse:collapse;font-family:'Manrope',sans-serif;font-size:14px;color:#333;margin:0 0 24px;">
        ${lineItemsHtml}
        <tr><td style="padding:12px 0 0;font-weight:600;">Total due</td><td style="padding:12px 0 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${total}</td></tr>
      </table>

      <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#FAF7F2;padding:14px 24px;border-radius:999px;text-decoration:none;font-family:'Manrope',sans-serif;font-size:15px;font-weight:500;letter-spacing:0.01em;">Review &amp; pay invoice</a>

      <p style="font-family:'Manrope',sans-serif;font-size:13px;line-height:1.5;color:#666;margin:24px 0 0;">Card, ACH, Klarna, Affirm, and Cash App accepted. Receipt emailed once paid. Questions? Reply to this email.</p>
      <p style="font-family:'Manrope',sans-serif;font-size:11px;color:#999;margin:24px 0 0;">If the button does not work, copy and paste this URL into your browser:<br><span style="word-break:break-all;">${url}</span></p>
    </td></tr>
  </table>
</body></html>`

  try {
    await payload.sendEmail({
      to,
      from: billingFromAddress(),
      subject: `Invoice ${number} from Black Hart Consulting · ${total}`,
      html,
    })
    payload.logger.info({ to, invoiceId: invoice.id }, '[email] sent branded invoice email')
  } catch (err) {
    payload.logger.error({ err, to, invoiceId: invoice.id }, '[email] failed to send branded invoice email')
  }
}

export async function sendBrandedCarePlanSignupEmail(args: {
  payload: Payload
  to: string
  clientName: string
  stripeCustomerId: string
  tier: CarePlanSlug
  monthlyAmountCents: number
}): Promise<void> {
  const { payload, to, clientName, stripeCustomerId, tier, monthlyAmountCents } = args
  // For the care plan signup, the URL is bound to the Stripe Customer ID
  // (signed via the same invoice-token machinery — the token's `iid` field
  // doubles as the Customer ID here since it's a stable, sub-secret key).
  const token = signInvoiceToken(stripeCustomerId)
  const url = `${siteUrl()}/care-plan/setup?customer=${encodeURIComponent(stripeCustomerId)}&tier=${tier}&token=${encodeURIComponent(token)}`
  const monthly = formatUSD(monthlyAmountCents)

  const html = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head><body style="font-family:Georgia,'Times New Roman',serif;background:#F4EFE6;margin:0;padding:32px 16px;color:#1a1a1a;">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#FAF7F2;border-radius:14px;padding:32px;">
    <tr><td>
      <p style="font-family:'Manrope',sans-serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#666;margin:0 0 16px;">Black Hart Consulting</p>
      <h1 style="font-size:28px;line-height:1.1;margin:0 0 16px;letter-spacing:-0.02em;">Activate your Care Plan</h1>
      <p style="font-size:16px;line-height:1.5;color:#444;margin:0 0 24px;">Hi ${escapeHtml(clientName)}, your <strong>${escapeHtml(tier[0].toUpperCase() + tier.slice(1))} Care Plan</strong> is ready to start. Add a card or U.S. bank account to begin — first charge of <strong>${monthly}</strong> runs in 30 days, and you can cancel anytime.</p>

      <a href="${url}" style="display:inline-block;background:#B08D57;color:#1a1a1a;padding:14px 24px;border-radius:999px;text-decoration:none;font-family:'Manrope',sans-serif;font-size:15px;font-weight:500;letter-spacing:0.01em;">Add a payment method</a>

      <p style="font-family:'Manrope',sans-serif;font-size:13px;line-height:1.5;color:#666;margin:24px 0 0;">Secure checkout via Stripe. We never see or store your card details. Cancel anytime by replying to this email or from your customer portal.</p>
      <p style="font-family:'Manrope',sans-serif;font-size:11px;color:#999;margin:24px 0 0;">If the button does not work, copy and paste this URL into your browser:<br><span style="word-break:break-all;">${url}</span></p>
    </td></tr>
  </table>
</body></html>`

  try {
    await payload.sendEmail({
      to,
      from: billingFromAddress(),
      subject: `Activate your Care Plan with Black Hart Consulting`,
      html,
    })
    payload.logger.info({ to, stripeCustomerId, tier }, '[email] sent branded care plan signup email')
  } catch (err) {
    payload.logger.error({ err, to, stripeCustomerId }, '[email] failed to send care plan signup email')
  }
}

// Admin-only alert sent when a Stripe invoice payment fails (e.g. card
// expired, insufficient funds, hard decline). Goes to your CONTACT_NOTIFY_EMAIL
// inbox — NOT to the client. The client gets Stripe's automatic dunning
// emails (configurable in Stripe Settings → Email).

export async function sendPaymentFailedAlertEmail(args: {
  payload: Payload
  invoice: Stripe.Invoice
  clientName: string
  clientEmail: string
  subscriptionId?: string | null
}): Promise<void> {
  const { payload, invoice, clientName, clientEmail, subscriptionId } = args
  const adminEmail = process.env.CONTACT_NOTIFY_EMAIL || process.env.EMAIL_FROM || 'hello@blackhartconsulting.com'
  const amount = formatUSD(invoice.amount_due ?? invoice.total ?? 0)
  const number = invoice.number || invoice.id

  const html = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Payment failed alert</title>
</head><body style="font-family:Georgia,'Times New Roman',serif;background:#FAF7F2;margin:0;padding:32px 16px;color:#1a1a1a;">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e5e5e5;">
    <tr><td>
      <p style="font-family:'Manrope',sans-serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c0392b;margin:0 0 16px;">Action needed · Payment failed</p>
      <h1 style="font-size:24px;line-height:1.2;margin:0 0 16px;">A subscription payment was declined</h1>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-family:'Manrope',sans-serif;font-size:14px;color:#333;margin:0 0 24px;">
        <tr><td style="padding:6px 0;color:#666;">Client</td><td style="padding:6px 0;text-align:right;">${escapeHtml(clientName)} · ${escapeHtml(clientEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Invoice</td><td style="padding:6px 0;text-align:right;">${escapeHtml(number)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Amount</td><td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums;">${amount}</td></tr>
        ${subscriptionId ? `<tr><td style="padding:6px 0;color:#666;">Subscription</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px;">${escapeHtml(subscriptionId)}</td></tr>` : ''}
      </table>
      <p style="font-size:14px;line-height:1.5;color:#444;margin:0 0 16px;">The Payload <strong>Subscriptions</strong> record has been flagged as <code>past_due</code>. Stripe will automatically retry the charge per its Smart Retry settings. If retries fail, the subscription will move to <code>unpaid</code> or <code>canceled</code>.</p>
      <p style="font-size:14px;line-height:1.5;color:#444;margin:0 0 16px;">Reach out to the client if you want to handle this manually — typically a card update fixes it.</p>
      <p style="font-family:'Manrope',sans-serif;font-size:13px;color:#666;margin:24px 0 0;">View in Stripe Dashboard → Customers → ${escapeHtml(clientEmail)}.</p>
    </td></tr>
  </table>
</body></html>`

  try {
    await payload.sendEmail({
      to: adminEmail,
      from: billingFromAddress(),
      replyTo: clientEmail,
      subject: `[BHC Billing] Payment failed for ${clientName} (${amount})`,
      html,
    })
    payload.logger.info({ adminEmail, invoiceId: invoice.id }, '[email] sent payment-failed alert')
  } catch (err) {
    payload.logger.error({ err, invoiceId: invoice.id }, '[email] failed to send payment-failed alert')
  }
}
