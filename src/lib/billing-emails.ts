import type { Payload } from 'payload'
import type Stripe from 'stripe'
import { signInvoiceToken } from '@/lib/invoice-token'
import { formatUSD, type CarePlanSlug } from '@/lib/care-plans'

// Branded transactional emails for the Stripe→BHC integration. All three
// templates (invoice, care-plan signup, payment-failed alert) share a
// single layout function so the styling stays in lockstep — change the
// shell once and all emails update together.
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

function billingFromAddress(): string {
  return (
    process.env.EMAIL_FROM_BILLING ||
    process.env.EMAIL_FROM ||
    'invoicing@blackhartconsulting.com'
  )
}

function unsubscribeHeaders(): { 'List-Unsubscribe': string; 'List-Unsubscribe-Post': string } {
  const from = billingFromAddress()
  return {
    'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

// ────────────────── shared layout ──────────────────

type EmailLayoutOptions = {
  /** <title>; also surfaces in some clients' preview pane. */
  pageTitle: string
  /** Pre-header text shown in inbox preview (hidden in body). */
  preheader?: string
  /** Top eyebrow above the headline (always "Black Hart Consulting"). */
  eyebrow?: string
  /** H1. */
  title: string
  /** Body paragraphs (HTML allowed; caller must escape user input). */
  bodyHtml: string
  /** Optional table of label/value rows rendered as line items. */
  rows?: Array<{ label: string; value: string; isTotal?: boolean }>
  /** Primary call-to-action — black button. */
  cta?: { label: string; href: string }
  /** Optional fineprint after the CTA. */
  fineprintHtml?: string
}

const COLOR_BG = '#F4EFE6'        // cream/sand outer
const COLOR_CARD = '#FAF7F2'      // ivory card
const COLOR_FG = '#1a1a1a'        // body fg
const COLOR_FG_MUTED = '#666'     // captions, eyebrows
const COLOR_FG_BODY = '#444'      // body paragraph
const COLOR_BORDER = '#e5e5e5'    // hairlines
const COLOR_FAINT = '#999'        // fallback URL

const SERIF = `Georgia,'Times New Roman',serif`
const SANS = `'Manrope',sans-serif`

function renderEmailLayout(opts: EmailLayoutOptions): string {
  const eyebrow = opts.eyebrow ?? 'Black Hart Consulting'
  const preheader = opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;mso-hide:all;">${escapeHtml(opts.preheader)}</div>` : ''

  const tableRowsHtml =
    opts.rows && opts.rows.length > 0
      ? `<table role="presentation" style="width:100%;border-collapse:collapse;font-family:${SANS};font-size:14px;color:#333;margin:0 0 24px;">
${opts.rows
  .map((r) => {
    if (r.isTotal) {
      return `<tr><td style="padding:12px 0 0;font-weight:600;color:${COLOR_FG};">${escapeHtml(r.label)}</td><td style="padding:12px 0 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;color:${COLOR_FG};">${escapeHtml(r.value)}</td></tr>`
    }
    return `<tr><td style="padding:8px 0;border-bottom:1px solid ${COLOR_BORDER};">${escapeHtml(r.label)}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid ${COLOR_BORDER};font-variant-numeric:tabular-nums;">${escapeHtml(r.value)}</td></tr>`
  })
  .join('\n')}
</table>`
      : ''

  const ctaHtml = opts.cta
    ? `<a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;background:${COLOR_FG};color:${COLOR_CARD};padding:14px 24px;border-radius:999px;text-decoration:none;font-family:${SANS};font-size:15px;font-weight:500;letter-spacing:0.01em;">${escapeHtml(opts.cta.label)}</a>`
    : ''

  const fineprintHtml = opts.fineprintHtml
    ? `<p style="font-family:${SANS};font-size:13px;line-height:1.5;color:${COLOR_FG_MUTED};margin:24px 0 0;">${opts.fineprintHtml}</p>`
    : ''

  const fallbackUrlHtml = opts.cta
    ? `<p style="font-family:${SANS};font-size:11px;color:${COLOR_FAINT};margin:24px 0 0;">If the button does not work, copy and paste this URL into your browser:<br><span style="word-break:break-all;">${escapeHtml(opts.cta.href)}</span></p>`
    : ''

  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(opts.pageTitle)}</title>
</head><body style="font-family:${SERIF};background:${COLOR_BG};margin:0;padding:32px 16px;color:${COLOR_FG};">
${preheader}
  <table role="presentation" style="max-width:560px;margin:0 auto;background:${COLOR_CARD};border-radius:14px;padding:32px;">
    <tr><td>
      <p style="font-family:${SANS};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${COLOR_FG_MUTED};margin:0 0 16px;">${escapeHtml(eyebrow)}</p>
      <h1 style="font-size:28px;line-height:1.1;margin:0 0 16px;letter-spacing:-0.02em;color:${COLOR_FG};">${escapeHtml(opts.title)}</h1>
      <div style="font-size:16px;line-height:1.5;color:${COLOR_FG_BODY};margin:0 0 24px;">${opts.bodyHtml}</div>
      ${tableRowsHtml}
      ${ctaHtml}
      ${fineprintHtml}
      ${fallbackUrlHtml}
    </td></tr>
  </table>
</body></html>`
}

// ────────────────── public senders ──────────────────

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

  const rows: NonNullable<EmailLayoutOptions['rows']> = (invoice.lines.data ?? []).map((li) => ({
    label: li.description || (li.price?.product as Stripe.Product | string)?.toString() || 'Item',
    value: formatUSD(li.amount ?? 0),
  }))
  rows.push({ label: 'Total due', value: total, isTotal: true })

  const html = renderEmailLayout({
    pageTitle: `Invoice ${number}`,
    preheader: `Invoice ${number} for ${total} from Black Hart Consulting`,
    title: 'Your invoice is ready',
    bodyHtml: `Hi ${escapeHtml(clientName)}, your invoice <strong>${escapeHtml(number)}</strong> for <strong>${total}</strong> is ready to pay. ${escapeHtml(dueLine)}`,
    rows,
    cta: { label: 'Review & pay invoice', href: url },
    fineprintHtml: 'Card, ACH, Klarna, Affirm, and Cash App accepted. Receipt emailed once paid. Questions? Reply to this email.',
  })

  try {
    await payload.sendEmail({
      to,
      from: billingFromAddress(),
      headers: unsubscribeHeaders(),
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
  const token = signInvoiceToken(stripeCustomerId)
  const url = `${siteUrl()}/care-plan/setup?customer=${encodeURIComponent(stripeCustomerId)}&tier=${tier}&token=${encodeURIComponent(token)}`
  const monthly = formatUSD(monthlyAmountCents)
  const tierName = tier[0].toUpperCase() + tier.slice(1)

  // (Phase D / #21) Stripe Customer Portal link — clients can manage
  // their payment method + cancel from there once the sub is active. URL
  // points at our /portal/[customer] redirector since the actual Stripe
  // portal session URL expires after ~5 min.
  const portalUrl = `${siteUrl()}/portal/${encodeURIComponent(stripeCustomerId)}?token=${encodeURIComponent(token)}`

  const html = renderEmailLayout({
    pageTitle: 'Activate your Care Plan',
    preheader: `Activate your ${tierName} Care Plan with Black Hart Consulting`,
    title: 'Activate your Care Plan',
    bodyHtml: `Hi ${escapeHtml(clientName)}, your <strong>${escapeHtml(tierName)} Care Plan</strong> is ready to start. Add a card or U.S. bank account to begin — first charge of <strong>${monthly}</strong> runs in 30 days, and you can cancel anytime.`,
    rows: [
      { label: `${tierName} Care Plan`, value: `${monthly} / month` },
      { label: 'First charge', value: 'In 30 days' },
      { label: 'Cancellation', value: 'Anytime, no fees' },
    ],
    cta: { label: 'Add a payment method', href: url },
    fineprintHtml: `Secure checkout via Stripe. We never see or store your card details. Once your plan is active, you can <a href="${portalUrl}" style="color:${COLOR_FG};">manage payment method or cancel</a> anytime.`,
  })

  try {
    await payload.sendEmail({
      to,
      from: billingFromAddress(),
      headers: unsubscribeHeaders(),
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
// inbox — NOT to the client.

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
  const number = invoice.number || invoice.id || '?'
  const stripeUrl = `https://dashboard.stripe.com/customers/search?query=${encodeURIComponent(clientEmail)}`

  const rows: NonNullable<EmailLayoutOptions['rows']> = [
    { label: 'Client', value: `${clientName} · ${clientEmail}` },
    { label: 'Invoice', value: number },
    { label: 'Amount', value: amount },
  ]
  if (subscriptionId) rows.push({ label: 'Subscription', value: subscriptionId })

  const html = renderEmailLayout({
    pageTitle: 'Payment failed',
    preheader: `Action needed: payment failed for ${clientName} (${amount})`,
    eyebrow: 'Action needed · Payment failed',
    title: 'A subscription payment was declined',
    bodyHtml: `The Payload <strong>Subscriptions</strong> record has been flagged as <code style="background:#f0e9dc;padding:2px 6px;border-radius:4px;">past_due</code>. Stripe will automatically retry the charge per its Smart Retry settings. If retries fail, the subscription will move to <code style="background:#f0e9dc;padding:2px 6px;border-radius:4px;">unpaid</code> or <code style="background:#f0e9dc;padding:2px 6px;border-radius:4px;">canceled</code>.<br><br>Reach out to the client if you want to handle this manually — typically a card update fixes it.`,
    rows,
    cta: { label: 'Open in Stripe Dashboard', href: stripeUrl },
    fineprintHtml: `This alert is sent to ${escapeHtml(adminEmail)}. The client receives Stripe's standard dunning emails separately (configurable in Stripe Settings → Email).`,
  })

  try {
    await payload.sendEmail({
      to: adminEmail,
      from: billingFromAddress(),
      replyTo: clientEmail,
      headers: unsubscribeHeaders(),
      subject: `[BHC Billing] Payment failed for ${clientName} (${amount})`,
      html,
    })
    payload.logger.info({ adminEmail, invoiceId: invoice.id }, '[email] sent payment-failed alert')
  } catch (err) {
    payload.logger.error({ err, invoiceId: invoice.id }, '[email] failed to send payment-failed alert')
  }
}
