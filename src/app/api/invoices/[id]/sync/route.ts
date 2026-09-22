import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { signInvoiceToken } from '@/lib/invoice-token'
import {
  collectAppInvoicePrefixes,
  createStripeCustomerWithPrefix,
  resolveInvoicePrefix,
} from '@/lib/invoice-prefix'

export const dynamic = 'force-dynamic'

// POST /api/invoices/[id]/sync
//
// Pushes a Payload Invoice (status='draft') up to Stripe as a real Stripe
// Invoice and finalizes it. Returns the hosted URL + the signed access
// token you paste into the email you send the client.
//
// Admin-only — gated by checking the Payload session cookie. The
// /api/[...slug] passthrough already enforces auth on Payload's REST API,
// but this is a custom route so we re-check explicitly.

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: RouteContext) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  }
  const { id } = await ctx.params

  const stripe = getStripe()
  const payload = await getPayload({ config })

  // Auth gate: Payload's auth() resolves the user from cookies/auth header.
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
  const invoice = invRows.docs[0] as {
    id: string | number
    invoiceNumber: string
    description?: string | null
    lineItems?: Array<{ description: string; amountCents: number; quantity?: number }>
    stripeInvoiceId?: string | null
    client?: {
      id: string | number
      email?: string
      displayName?: string
      company?: string | null
      firstName?: string | null
      lastName?: string | null
      stripeCustomerId?: string | null
      stripeInvoicePrefix?: string | null
    }
    dueAt?: string | null
  }

  if (!invoice.client?.email) {
    return NextResponse.json({ error: 'Invoice client missing email.' }, { status: 400 })
  }
  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    return NextResponse.json({ error: 'Invoice has no line items.' }, { status: 400 })
  }

  // Resolve / create Stripe Customer
  let stripeCustomerId = invoice.client.stripeCustomerId ?? null
  if (!stripeCustomerId) {
    // New customers get a branded `BHC…` invoice_prefix so Stripe numbers
    // their invoices BHCXXX-0001 instead of using a random prefix. An
    // existing customer's prefix is read, never rewritten.
    let stripeInvoicePrefix: string | null = null
    const existing = await stripe.customers.list({ email: invoice.client.email, limit: 1 })
    if (existing.data[0]) {
      stripeCustomerId = existing.data[0].id
      stripeInvoicePrefix = existing.data[0].invoice_prefix ?? null
    } else {
      const invoicePrefix = await resolveInvoicePrefix(stripe, invoice.client, {
        knownPrefixes: await collectAppInvoicePrefixes(payload),
        logger: payload.logger,
      })
      const { customer: created, invoicePrefix: appliedPrefix } = await createStripeCustomerWithPrefix(
        stripe,
        {
          email: invoice.client.email,
          name: invoice.client.displayName,
          metadata: { payload_client_id: String(invoice.client.id) },
        },
        { invoicePrefix, logger: payload.logger },
      )
      stripeCustomerId = created.id
      stripeInvoicePrefix = appliedPrefix ?? created.invoice_prefix ?? null
    }
    await payload.update({
      collection: 'clients',
      id: invoice.client.id,
      data: { stripeCustomerId, ...(stripeInvoicePrefix ? { stripeInvoicePrefix } : {}) },
    })
  }

  let stripeInvoiceId = invoice.stripeInvoiceId ?? null

  if (!stripeInvoiceId) {
    // Create draft invoice + line items + finalize
    const draft = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 14,
      description: invoice.description ?? undefined,
      metadata: {
        payload_invoice_id: String(invoice.id),
        invoice_number: invoice.invoiceNumber,
      },
    })

    for (const li of invoice.lineItems) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: draft.id,
        amount: li.amountCents * (li.quantity ?? 1),
        currency: 'usd',
        description: li.description,
      })
    }

    const finalized = await stripe.invoices.finalizeInvoice(draft.id!)
    stripeInvoiceId = finalized.id ?? null
    await payload.update({
      collection: 'invoices',
      id: invoice.id,
      data: {
        stripeInvoiceId,
        stripeHostedUrl: finalized.hosted_invoice_url ?? null,
        status: 'open',
        issuedAt: new Date().toISOString(),
        dueAt: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
      },
    })
  }

  // Mint a signed token for the branded /invoice page
  const token = signInvoiceToken(stripeInvoiceId ?? String(invoice.id))
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const brandedUrl = `${siteUrl}/invoice/${stripeInvoiceId ?? invoice.id}?token=${encodeURIComponent(token)}`

  return NextResponse.json({
    ok: true,
    stripeInvoiceId,
    brandedUrl,
    token,
  })
}
