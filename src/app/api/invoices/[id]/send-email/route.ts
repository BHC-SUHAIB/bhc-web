import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { sendBrandedInvoiceEmail } from '@/lib/billing-emails'
import { denyIfCrossOrigin } from '@/lib/api-guards'
import { notifySlack } from '@/lib/slack'

export const dynamic = 'force-dynamic'

// POST /api/invoices/[id]/send-email
//
// Operator-triggered: sends the branded BHC invoice email for the given
// Payload invoice. The `id` is the Payload invoice ID. We pull the
// matching Stripe Invoice for the latest line items / status and pass
// that into the email template.
//
// Admin-only — gated by Payload session cookie.

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: RouteContext) {
  const csrfDeny = denyIfCrossOrigin(req)
  if (csrfDeny) return csrfDeny

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  }
  const { id } = await ctx.params
  const payload = await getPayload({ config })

  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const invRows = await payload.find({
    collection: 'invoices',
    where: { id: { equals: id } },
    limit: 1,
    depth: 1,
  })
  if (invRows.totalDocs === 0) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
  }
  const inv = invRows.docs[0] as {
    id: string | number
    status: string
    stripeInvoiceId?: string | null
    client?: { displayName?: string; email?: string }
  }

  if (!inv.stripeInvoiceId) {
    return NextResponse.json(
      { error: 'Invoice has no Stripe ID — finalize it in Stripe first.' },
      { status: 400 },
    )
  }
  // Allow resending the email for paid invoices too — the operator might
  // need to send a receipt copy. Only block voided ones.
  if (inv.status === 'void') {
    return NextResponse.json({ error: 'Invoice is voided.' }, { status: 409 })
  }
  if (!inv.client?.email) {
    return NextResponse.json({ error: 'Client has no email on file.' }, { status: 400 })
  }

  const stripe = getStripe()
  const stripeInvoice = await stripe.invoices.retrieve(inv.stripeInvoiceId)

  await sendBrandedInvoiceEmail({
    payload,
    to: inv.client.email,
    clientName: inv.client.displayName ?? 'Client',
    invoice: stripeInvoice,
  })

  // Slack: log the operator action so you have a paper trail of what
  // got sent + when. Only surfaces in the channel; doesn't block.
  await notifySlack({
    kind: 'invoice_email_sent',
    clientName: inv.client.displayName ?? 'Client',
    clientEmail: inv.client.email,
    invoiceNumber: stripeInvoice.number ?? stripeInvoice.id ?? '?',
    amountCents: stripeInvoice.amount_due ?? stripeInvoice.total ?? 0,
  }, payload.logger)

  return NextResponse.json({ ok: true, sentTo: inv.client.email })
}
