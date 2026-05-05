import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Container } from '@/components/Container'
import { verifyInvoiceToken } from '@/lib/invoice-token'
import type { CarePlanSlug } from '@/lib/care-plans'
import { InvoiceClient } from './InvoiceClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Invoice',
  description: 'Pay your Black Hart Consulting invoice.',
  robots: { index: false, follow: false },
}

type RouteProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function InvoicePage({ params, searchParams }: RouteProps) {
  const { id } = await params
  const { token } = await searchParams

  if (!token) notFound()

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'invoices',
    where: {
      or: [
        { stripeInvoiceId: { equals: id } },
        { id: { equals: id } },
      ],
    },
    limit: 1,
    depth: 1,
  })
  if (found.totalDocs === 0) notFound()
  const invoice = found.docs[0] as {
    id: string | number
    stripeInvoiceId?: string | null
    stripeSubscriptionId?: string | null
    invoiceNumber: string
    description?: string | null
    totalCents: number
    status: string
    lineItems?: Array<{ description: string; amountCents: number; quantity?: number | null }>
    client?: { displayName?: string }
    allowCarePlanUpsell?: boolean
    suggestedCarePlan?: CarePlanSlug | null
  }

  // Token is bound to the Stripe invoice ID when present, or the Payload ID
  // for invoices that haven't been pushed to Stripe yet (drafts shared
  // pre-finalize during a sales call, e.g.).
  const tokenSubject = invoice.stripeInvoiceId || String(invoice.id)
  const verified = verifyInvoiceToken(token, tokenSubject)
  if (!verified.ok) notFound()

  const isPaid = invoice.status === 'paid'
  const isVoid = invoice.status === 'void'

  // (#6) Use the cached stripeSubscriptionId mirrored on the invoice.
  // Avoids a per-render Stripe API call. Falls through to false for
  // pre-cache invoices.
  const isSubscriptionInvoice = Boolean(invoice.stripeSubscriptionId)
  const showCarePlanUpsell = invoice.allowCarePlanUpsell !== false && !isSubscriptionInvoice

  return (
    <Container size="lg" className="py-14 sm:py-20">
      <header className="mb-10 sm:mb-14">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
          Black Hart Consulting
        </p>
        <h1 className="font-serif font-semibold text-[clamp(2rem,4.5vw,3.25rem)] tracking-[-0.02em] leading-[1.05] mt-3">
          {isPaid ? 'Paid' : isVoid ? 'Voided' : 'Pay your invoice'}
        </h1>
        <p className="mt-3 text-[15px] text-[var(--color-fg-muted)] max-w-prose">
          {isPaid
            ? 'Thanks — this invoice has been paid in full. A receipt was emailed to you.'
            : isVoid
              ? 'This invoice was voided and is no longer payable. Reach out to hello@blackhartconsulting.com if you think this is a mistake.'
              : 'Review the line items, optionally add a Care Plan, and continue to a secure Stripe checkout.'}
        </p>
      </header>

      {!isPaid && !isVoid ? (
        <InvoiceClient
          invoiceId={tokenSubject}
          invoiceNumber={invoice.invoiceNumber}
          totalCents={invoice.totalCents}
          description={invoice.description}
          lineItems={invoice.lineItems ?? []}
          clientName={invoice.client?.displayName ?? 'Client'}
          allowCarePlanUpsell={showCarePlanUpsell}
          suggestedCarePlan={(invoice.suggestedCarePlan ?? 'care') as CarePlanSlug}
          token={token}
        />
      ) : null}
    </Container>
  )
}
