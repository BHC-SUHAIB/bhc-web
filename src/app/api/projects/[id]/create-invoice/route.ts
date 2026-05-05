import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { denyIfCrossOrigin } from '@/lib/api-guards'
import { recordAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// POST /api/projects/[id]/create-invoice
//
// Creates a Stripe invoice for a Project record in one call. Useful when
// you're looking at a project in the admin and decide to bill it without
// switching to the Stripe Dashboard.
//
// Body:
//   {
//     clientId: string           // Payload Client ID to bill
//     lineItems: Array<{
//       description: string
//       amountCents: number
//       quantity?: number
//     }>
//     description?: string       // Optional invoice header description
//   }
//
// Workflow: creates a draft Stripe Invoice → adds invoice items → finalizes.
// The webhook then mirrors it into Payload Invoices automatically (same
// path as Stripe-Dashboard-created invoices).

type RouteContext = { params: Promise<{ id: string }> }
type Body = {
  clientId?: string | number
  lineItems?: Array<{ description: string; amountCents: number; quantity?: number }>
  description?: string
}

export async function POST(req: Request, ctx: RouteContext) {
  const csrfDeny = denyIfCrossOrigin(req)
  if (csrfDeny) return csrfDeny

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 })
  }

  const { id: projectId } = await ctx.params
  const payload = await getPayload({ config })

  const auth = await payload.auth({ headers: req.headers })
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body.clientId) {
    return NextResponse.json({ error: 'Missing clientId.' }, { status: 400 })
  }
  if (!body.lineItems || body.lineItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required.' }, { status: 400 })
  }

  const project = await payload.findByID({ collection: 'projects', id: projectId }).catch(() => null)
  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  }
  const projectTitle = (project as { title?: string }).title ?? `Project ${projectId}`

  const client = await payload.findByID({ collection: 'clients', id: body.clientId }).catch(() => null)
  if (!client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }
  const c = client as { id: string | number; stripeCustomerId?: string | null; displayName?: string }
  if (!c.stripeCustomerId) {
    return NextResponse.json({ error: 'Client has no Stripe customer linked.' }, { status: 400 })
  }

  const stripe = getStripe()

  // Create draft Stripe Invoice with auto_advance:false so finalize is explicit.
  const draft = await stripe.invoices.create({
    customer: c.stripeCustomerId,
    collection_method: 'send_invoice',
    days_until_due: 14,
    auto_advance: false,
    description: body.description ?? `Work for: ${projectTitle}`,
    metadata: {
      payload_project_id: String(projectId),
      payload_client_id: String(c.id),
      created_via: 'project-quick-create',
      created_by: auth.user.email ?? 'admin',
    },
  })

  // Add line items
  for (const li of body.lineItems) {
    await stripe.invoiceItems.create({
      customer: c.stripeCustomerId,
      invoice: draft.id,
      amount: li.amountCents * (li.quantity ?? 1),
      currency: 'usd',
      description: li.description,
    })
  }

  // Finalize (this fires the invoice.finalized webhook → mirrors into Payload)
  const finalized = await stripe.invoices.finalizeInvoice(draft.id!)

  await recordAudit(payload, {
    action: 'invoice.email_sent', // closest existing — invoice was created not yet emailed
    actor: auth.user.email ?? 'admin',
    summary: `Quick-created invoice ${finalized.number ?? finalized.id} for ${c.displayName ?? 'Client'} from project "${projectTitle}"`,
    subjectType: 'invoice',
    stripeId: finalized.id,
    metadata: {
      projectId,
      clientId: c.id,
      lineItemCount: body.lineItems.length,
      totalCents: finalized.amount_due,
    },
    ipAddress: (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null,
  })

  return NextResponse.json({
    ok: true,
    stripeInvoiceId: finalized.id,
    invoiceNumber: finalized.number,
    totalCents: finalized.amount_due,
    note: 'Invoice finalized in Stripe. The webhook will mirror it into Payload within ~3 seconds. Use the Send Email button on the Client page to deliver it.',
  })
}
