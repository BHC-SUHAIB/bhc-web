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
 * Types: invoice | care-plan | payment-failed | contact | demo-request
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
import { buildContactNotificationEmail, type ContactNotificationDoc } from '@/lib/contact-notification-email'

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
  description: 'Starter Site rebuild + 30-day SEO content kickoff.',
  lines: {
    data: [
      { description: 'Starter Site (5-page custom build, 14-day delivery)', amount: 149_500 },
      { description: 'Launch discount applied', amount: 0 },
    ],
  },
} as unknown as Stripe.Invoice

// Lead-notification fixtures. Mirrors what the public forms send after the
// 2026-09 attribution + soft-spam changes, so the "Source:" block renders.
const FIXTURE_CONTACT: ContactNotificationDoc = {
  name: 'Maria Lopez',
  email: 'maria@heightsdental.com',
  company: 'Heights Family Dental',
  projectType: 'website',
  budgetRange: '1k-2500',
  message: 'Our site is from 2016 and does not work on phones. Looking for a rebuild plus help showing up on Google for "dentist heights houston".',
  formType: 'contact',
  sourcePage: '/contact',
  timeToSubmitSec: 84,
  attribution: {
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'lp_express_website',
    utmTerm: 'custom website design',
    gclid: 'Cj0KCQjw_PREVIEW_gclid_1234567890',
    referrer: 'https://www.google.com/',
    landingPath: '/free-demo-site?utm_source=google&utm_medium=cpc&utm_campaign=lp_express_website&utm_term=custom%20website%20design',
    firstTouchAt: new Date(Date.now() - 6 * 60_000).toISOString(),
  },
}
const FIXTURE_DEMO: ContactNotificationDoc = {
  ...FIXTURE_CONTACT,
  name: 'Heights Family Dental',
  formType: 'demo-request',
  listingUrl: 'https://maps.app.goo.gl/preview123',
  message: 'Demo site request for Heights Family Dental.\nListing: https://maps.app.goo.gl/preview123\nFamily dentistry in the Houston Heights.',
  sourcePage: '/free-demo-site',
  timeToSubmitSec: 41,
}

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
      // Optional custom-tier preview: ?type=care-plan&customLabel=...&customAmount=...
      // Lets you eyeball the email layout for hosting-friend / negotiated
      // price plans before sending the real one to a real client.
      const customLabel = url.searchParams.get('customLabel')
      const customAmountStr = url.searchParams.get('customAmount')
      const customAmount = customAmountStr ? Number(customAmountStr) : null
      const useCustom = customLabel && Number.isInteger(customAmount) && (customAmount as number) >= 100
      await sendBrandedCarePlanSignupEmail({
        payload,
        to: recipient,
        clientName: "Joe's Coffee",
        stripeCustomerId: 'cus_PREVIEW1234567890',
        tier: useCustom ? 'custom' : 'growth',
        monthlyAmountCents: useCustom ? (customAmount as number) : 49500,
        customLabel: useCustom ? (customLabel as string) : undefined,
      })
    } else if (type === 'payment-failed') {
      await sendPaymentFailedAlertEmail({
        payload,
        invoice: { ...FIXTURE_INVOICE, id: 'in_PREVIEW_FAIL', number: 'INV-FAIL-0042' } as Stripe.Invoice,
        clientName: "Joe's Coffee",
        clientEmail: 'joe@joescoffee.com',
        subscriptionId: 'sub_PREVIEW1234567890',
      })
    } else if (type === 'contact' || type === 'demo-request') {
      // Pure template render: no DB row, no adapter. ?send=1 still forwards
      // the built HTML to Resend so the real inbox rendering can be checked.
      const built = buildContactNotificationEmail(type === 'demo-request' ? FIXTURE_DEMO : FIXTURE_CONTACT)
      capturedSubject = built.subject
      capturedHtml = built.html
      if (shouldSend) await realSendEmail({ to: recipient, subject: built.subject, html: built.html })
    } else {
      return NextResponse.json(
        { error: 'Unknown type. Use ?type=invoice | care-plan | payment-failed | contact | demo-request' },
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
    <a href="?type=contact">contact</a>
    <a href="?type=demo-request">demo-request</a>
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
