import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { denyIfCrossOrigin } from '@/lib/api-guards'
import { notifySlack } from '@/lib/slack'
import { recordAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// POST /api/invoices/[id]/refund
//
// Admin-only. Issues a refund on the linked Stripe PaymentIntent / charge.
// Stripe's `charge.refunded` webhook then mirrors the refund into Payload
// (refundedCents + status flip). We don't write to Payload directly here —
// the webhook is the single source of truth.
//
// Body:
//   { amountCents?: number, reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent' }
//
// `amountCents` omitted → full refund. Provided → partial refund.

type RouteContext = { params: Promise<{ id: string }> }
type Body = { amountCents?: number; reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent' }

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

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    body = {}
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
    invoiceNumber: string
    status: string
    totalCents: number
    refundedCents?: number
    stripeInvoiceId?: string | null
    client?: { displayName?: string }
  }

  if (inv.status !== 'paid' && inv.status !== 'partially_refunded') {
    return NextResponse.json(
      { error: `Cannot refund an invoice with status="${inv.status}". Only paid invoices can be refunded.` },
      { status: 409 },
    )
  }
  if (!inv.stripeInvoiceId) {
    return NextResponse.json({ error: 'Invoice has no Stripe ID.' }, { status: 400 })
  }

  const stripe = getStripe()

  // Pull the Stripe Invoice → linked PaymentIntent → charge to refund.
  // For invoices marked paid_out_of_band (paid via our Checkout flow), the
  // charge lives on the Checkout's PaymentIntent, NOT the Stripe Invoice's
  // own (none). We try Stripe Invoice's payment_intent first, then fall
  // back to the PaymentIntent ID stored in the original invoice's metadata.
  const stripeInvoice = await stripe.invoices.retrieve(inv.stripeInvoiceId, {
    expand: ['payment_intent', 'charge'],
  })

  let paymentIntentId: string | null = null
  if (stripeInvoice.payment_intent) {
    paymentIntentId = typeof stripeInvoice.payment_intent === 'string' ? stripeInvoice.payment_intent : stripeInvoice.payment_intent.id
  }
  // Fallback: paid_out_of_band invoices won't have payment_intent on the Stripe
  // Invoice. The originating Checkout PaymentIntent has metadata.payload_invoice_id
  // matching this invoice — search by that.
  if (!paymentIntentId) {
    const pis = await stripe.paymentIntents.search({
      query: `metadata['payload_invoice_id']:'${inv.id}'`,
      limit: 1,
    })
    paymentIntentId = pis.data[0]?.id ?? null
  }

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: 'Could not locate the original PaymentIntent to refund. Refund manually in the Stripe Dashboard.' },
      { status: 502 },
    )
  }

  // Validate amount: if provided, must not exceed remaining unrefunded balance.
  const refundedSoFar = inv.refundedCents ?? 0
  const maxRefundable = inv.totalCents - refundedSoFar
  const requestedCents = body.amountCents ?? maxRefundable
  if (requestedCents <= 0) {
    return NextResponse.json({ error: 'Nothing left to refund.' }, { status: 409 })
  }
  if (requestedCents > maxRefundable) {
    return NextResponse.json(
      { error: `Refund amount exceeds remaining balance (${maxRefundable} cents).` },
      { status: 400 },
    )
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: requestedCents,
      reason: body.reason ?? undefined,
      metadata: {
        payload_invoice_id: String(inv.id),
        triggered_by: auth.user.email ?? 'admin',
      },
    })
    payload.logger.info(
      { invoiceId: inv.id, refundId: refund.id, amount: requestedCents },
      '[refund] issued via admin',
    )

    // Optional ops Slack ping (charge.refunded webhook will fire too —
    // we're double-notifying here intentionally so the operator sees
    // immediate confirmation of THEIR action).
    await notifySlack({
      kind: 'refund',
      clientName: inv.client?.displayName ?? 'Client',
      invoiceNumber: inv.invoiceNumber,
      refundedCents: requestedCents,
      isFullRefund: requestedCents === maxRefundable && refundedSoFar === 0,
    }, payload.logger)

    await recordAudit(payload, {
      action: 'invoice.refund_issued',
      actor: auth.user.email ?? 'admin',
      summary: `Refunded ${(requestedCents / 100).toFixed(2)} on ${inv.invoiceNumber} (${body.reason ?? 'no reason given'})`,
      subjectType: 'invoice',
      subjectId: id,
      stripeId: refund.id,
      metadata: { refundedCents: requestedCents, reason: body.reason ?? null, isPartial: requestedCents !== maxRefundable },
      ipAddress: (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null,
    })

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      amountRefunded: requestedCents,
      // The webhook will update Payload status to refunded/partially_refunded
      // within seconds. Tell the UI to refresh after a short delay.
      payloadUpdatePending: true,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Refund failed'
    payload.logger.error({ err, invoiceId: inv.id }, '[refund] Stripe API error')
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
