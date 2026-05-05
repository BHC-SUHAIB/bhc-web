/**
 * Dev-only email preview + send-to-self.
 *
 * GET /dev-email-preview?type=invoice          → renders the HTML inline so
 *                                                 you can see the template in
 *                                                 your browser. Toggle dark
 *                                                 mode via DevTools rendering
 *                                                 emulation.
 *
 * GET /dev-email-preview?type=invoice&send=1   → ALSO sends a real email via
 *                                                 Resend to suhaib@blackhart…
 *                                                 (requires RESEND_API_KEY).
 *
 * Types: invoice | care-plan | payment-failed
 *
 * Locked behind denyIfProductionLocked (returns 403 in prod). Delete this
 * route before final prod deploy if you want.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import {
  sendBrandedInvoiceEmail,
  sendBrandedCarePlanSignupEmail,
  sendPaymentFailedAlertEmail,
} from '@/lib/billing-emails'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Fixture data — same shape Stripe sends us, but plausible-looking sample
// values so the preview tells the truth about how a real invoice/sub
// notification would look.
const FIXTURE_INVOICE: Stripe.Invoice = {
  id: 'in_PREVIEW1234567890',
  number: 'INV-PREVIEW-0042',
  amount_due: 149_500,
  total: 149_500,
  customer_email: 'joe@joescoffee.com',
  due_date: Math.floor(Date.now() / 1000) + 14 * 86_400,
  hosted_invoice_url: 'https://invoice.stripe.com/sample',
  description: 'Heights Starter site rebuild + 30-day SEO content kickoff.',
  lines: {
    data: [
      { description: 'Heights Starter Site (5-page custom build, 14-day delivery)', amount: 149_500 },
      { description: 'Founding-client discount applied', amount: 0 },
    ],
  },
} as unknown as Stripe.Invoice

export async function GET(req: Request) {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? 'invoice'
  const shouldSend = url.searchParams.get('send') === '1'
  const recipient = url.searchParams.get('to') || 'suhaib@blackhartconsulting.com'

  const payload = await getPayload({ config })

  // Capture HTML by intercepting payload.sendEmail. We replace it with a
  // shim that records the html, optionally forwards to Resend if the user
  // set ?send=1.
  let capturedHtml = ''
  let capturedSubject = ''
  const realSendEmail = payload.sendEmail.bind(payload)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(payload as any).sendEmail = async (opts: any) => {
    capturedHtml = String(opts.html ?? '')
    capturedSubject = String(opts.subject ?? '')
    if (shouldSend) {
      // Override `to` with the chosen recipient, leave the rest of the
      // template's metadata intact.
      return realSendEmail({ ...opts, to: recipient })
    }
    return undefined
  }

  try {
    if (type === 'invoice') {
      await sendBrandedInvoiceEmail({
        payload,
        to: recipient,
        clientName: "Joe's Coffee",
        invoice: FIXTURE_INVOICE,
      })
    } else if (type === 'care-plan') {
      await sendBrandedCarePlanSignupEmail({
        payload,
        to: recipient,
        clientName: "Joe's Coffee",
        stripeCustomerId: 'cus_PREVIEW1234567890',
        tier: 'growth',
        monthlyAmountCents: 49500,
      })
    } else if (type === 'payment-failed') {
      await sendPaymentFailedAlertEmail({
        payload,
        invoice: { ...FIXTURE_INVOICE, id: 'in_PREVIEW_FAIL', number: 'INV-FAIL-0042' } as Stripe.Invoice,
        clientName: "Joe's Coffee",
        clientEmail: 'joe@joescoffee.com',
        subscriptionId: 'sub_PREVIEW1234567890',
      })
    } else {
      return NextResponse.json(
        { error: 'Unknown type. Use ?type=invoice | care-plan | payment-failed' },
        { status: 400 },
      )
    }
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(payload as any).sendEmail = realSendEmail
  }

  if (!capturedHtml) {
    return NextResponse.json({ error: 'No HTML captured.' }, { status: 500 })
  }

  // Wrap the captured email HTML with a small "browser frame" header so
  // the operator knows what they're looking at and can toggle dark mode.
  const fullHtml = `<!doctype html>
<html><head><title>Email preview · ${type}</title>
<style>body{margin:0;font-family:-apple-system,sans-serif;}
.bar{padding:12px 20px;background:#222;color:#eee;font-size:13px;display:flex;justify-content:space-between;align-items:center;}
.bar a{color:#9cf;text-decoration:none;margin-left:12px;}
.frame{padding:24px;}
@media (prefers-color-scheme: dark){.frame{background:#1a1a1a;}}
</style></head>
<body>
<div class="bar">
  <span><strong>Email preview</strong> · type=<code>${type}</code> · to=<code>${recipient}</code> · ${shouldSend ? '✉️ SENT via Resend' : 'preview only'}</span>
  <span>
    <a href="?type=invoice">invoice</a>
    <a href="?type=care-plan">care-plan</a>
    <a href="?type=payment-failed">payment-failed</a>
    <a href="?type=${type}&send=1&to=${encodeURIComponent(recipient)}">${shouldSend ? '↻ Resend' : '✉️ Send to ' + recipient}</a>
  </span>
</div>
<div class="frame">
  <p style="font-size:12px;opacity:0.6;font-family:-apple-system;">
    Subject: <strong>${capturedSubject}</strong> &nbsp;·&nbsp; Tip: open DevTools → ⋮ → More tools → Rendering → Emulate CSS prefers-color-scheme to test dark mode.
  </p>
  ${capturedHtml}
</div>
</body></html>`

  return new NextResponse(fullHtml, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
