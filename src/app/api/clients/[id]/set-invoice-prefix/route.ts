import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { denyIfCrossOrigin } from '@/lib/api-guards'
import { recordAudit } from '@/lib/audit'
import {
  collectAppInvoicePrefixes,
  ensureUniqueInvoicePrefix,
  isInvoicePrefixError,
  isValidInvoicePrefix,
  resolveInvoicePrefix,
} from '@/lib/invoice-prefix'

export const dynamic = 'force-dynamic'

// POST /api/clients/[id]/set-invoice-prefix
//
// Manual operator action for clients whose Stripe Customer already exists
// (created before branded prefixes, or with a random Stripe-assigned one).
//
// Two modes:
//   { mode: 'preview' }            -> { current, suggested } for the confirm dialog
//   { mode: 'apply', prefix?: … }  -> stripe.customers.update({ invoice_prefix })
//
// We never touch `next_invoice_sequence`, so numbering continues from wherever
// the customer already is (Stripe applies the new prefix to FUTURE invoices
// only — past invoices keep the number they were issued with). Nothing here
// runs automatically: changing a prefix is always an explicit click.

type RouteContext = { params: Promise<{ id: string }> }
type Body = { mode?: 'preview' | 'apply'; prefix?: string }

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
  const mode = body.mode === 'apply' ? 'apply' : 'preview'

  const client = await payload.findByID({ collection: 'clients', id })
  if (!client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }
  const c = client as {
    id: string | number
    displayName?: string | null
    company?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    stripeCustomerId?: string | null
    stripeInvoicePrefix?: string | null
  }
  if (!c.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          'Client has no Stripe Customer ID — re-save the client record so the auto-create hook runs, then retry.',
      },
      { status: 400 },
    )
  }

  const stripe = getStripe()

  // What Stripe currently has. Shown in the confirm dialog so the operator
  // can see they're replacing e.g. XRUMZVGS (random) vs BHCGWR (deliberate).
  let current: string | null = null
  let nextInvoiceSequence: number | null = null
  try {
    const customer = await stripe.customers.retrieve(c.stripeCustomerId)
    if (!('deleted' in customer) || !customer.deleted) {
      current = (customer as { invoice_prefix?: string | null }).invoice_prefix ?? null
      nextInvoiceSequence =
        (customer as { next_invoice_sequence?: number | null }).next_invoice_sequence ?? null
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not read the Stripe Customer: ${err instanceof Error ? err.message : 'unknown error'}`,
      },
      { status: 502 },
    )
  }

  const knownPrefixes = await collectAppInvoicePrefixes(payload)

  // An explicit prefix from the operator wins; otherwise derive from the
  // client's company/name.
  let suggested: string | null
  if (body.prefix) {
    const requested = body.prefix.trim().toUpperCase()
    if (!isValidInvoicePrefix(requested)) {
      return NextResponse.json(
        { error: 'Prefix must be 3-12 uppercase letters/digits (no hyphens or spaces).' },
        { status: 400 },
      )
    }
    suggested =
      requested === current
        ? requested
        : await ensureUniqueInvoicePrefix(stripe, requested, {
            excludeCustomerId: c.stripeCustomerId,
            knownPrefixes,
            logger: payload.logger,
          })
  } else {
    suggested = await resolveInvoicePrefix(stripe, c, {
      excludeCustomerId: c.stripeCustomerId,
      knownPrefixes,
      logger: payload.logger,
    })
  }

  if (mode === 'preview') {
    return NextResponse.json({
      ok: true,
      current,
      suggested,
      nextInvoiceSequence,
      unchanged: Boolean(suggested) && suggested === current,
      stripeCustomerId: c.stripeCustomerId,
    })
  }

  if (!suggested) {
    return NextResponse.json(
      {
        error:
          'Could not derive a unique prefix from this client — add a company name, or type a prefix manually.',
      },
      { status: 422 },
    )
  }

  if (suggested === current) {
    // Nothing to do in Stripe; just make sure our mirror column agrees.
    if (c.stripeInvoicePrefix !== current) {
      await payload.update({
        collection: 'clients',
        id,
        data: { stripeInvoicePrefix: current } as never,
        context: { skipStripeSync: true } as never,
      })
    }
    return NextResponse.json({ ok: true, unchanged: true, current, prefix: current })
  }

  try {
    // invoice_prefix ONLY — next_invoice_sequence is deliberately untouched.
    const updated = await stripe.customers.update(c.stripeCustomerId, { invoice_prefix: suggested })
    const applied = (updated as { invoice_prefix?: string | null }).invoice_prefix ?? suggested

    await payload.update({
      collection: 'clients',
      id,
      data: { stripeInvoicePrefix: applied } as never,
      context: { skipStripeSync: true } as never,
    })

    await recordAudit(payload, {
      action: 'client.invoice_prefix_set',
      actor: auth.user.email ?? 'admin',
      summary: `Set Stripe invoice prefix for ${c.displayName ?? c.email ?? `client ${id}`} to ${applied}${
        current ? ` (was ${current})` : ''
      }`,
      subjectType: 'client',
      subjectId: id,
      stripeId: c.stripeCustomerId,
      metadata: { previousPrefix: current, prefix: applied, nextInvoiceSequence },
      ipAddress: (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null,
    })

    payload.logger.info(
      { clientId: id, stripeCustomerId: c.stripeCustomerId, previous: current, prefix: applied },
      '[clients] invoice prefix updated in Stripe',
    )

    return NextResponse.json({ ok: true, prefix: applied, previous: current })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe rejected the update.'
    return NextResponse.json(
      {
        error: isInvoicePrefixError(err)
          ? `Stripe rejected "${suggested}": ${message}`
          : `Stripe update failed: ${message}`,
      },
      { status: 400 },
    )
  }
}
