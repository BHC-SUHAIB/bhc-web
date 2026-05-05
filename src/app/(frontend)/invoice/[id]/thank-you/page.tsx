import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { getStripe, isStripeConfigured, isReusablePaymentMethod } from '@/lib/stripe'
import { verifyInvoiceToken } from '@/lib/invoice-token'
import { carePlanBySlug, formatUSD } from '@/lib/care-plans'
import { CarePlanFallbackButton } from './CarePlanFallbackButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Thanks',
  description: 'Payment received.',
  robots: { index: false, follow: false },
}

type RouteProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session?: string; token?: string }>
}

export default async function InvoiceThankYouPage({ params, searchParams }: RouteProps) {
  const { id } = await params
  const { session: sessionId, token } = await searchParams

  if (!token || !sessionId) notFound()

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
    invoiceNumber: string
    totalCents: number
    status: string
    client?: { stripeCustomerId?: string | null; email?: string }
  }

  const tokenSubject = invoice.stripeInvoiceId || String(invoice.id)
  const verified = verifyInvoiceToken(token, tokenSubject)
  if (!verified.ok) notFound()

  // Pull session + payment method type from Stripe so we can show the
  // right message: paid + care plan active vs paid + needs setup.
  let paidWithBnpl = false
  let carePlanSlug: string | null = null

  if (isStripeConfigured()) {
    try {
      const stripe = getStripe()
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'payment_intent.payment_method'],
      })
      const pi = checkoutSession.payment_intent
      if (pi && typeof pi !== 'string') {
        const pm = pi.payment_method
        if (pm && typeof pm !== 'string') {
          paidWithBnpl = !isReusablePaymentMethod(pm)
        }
        carePlanSlug = pi.metadata?.care_plan_tier || null
      }
    } catch {
      // Ignore — the page is still useful without the live Stripe lookup
      // (e.g. if the session expired or test/live mode mismatch).
    }
  }

  const tier = carePlanSlug ? carePlanBySlug(carePlanSlug) : null
  const needsCarePlanSetup = paidWithBnpl && Boolean(tier)

  return (
    <Container size="md" className="py-20 sm:py-28">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
        Black Hart Consulting
      </p>
      <h1 className="font-serif font-semibold text-[clamp(2rem,4.5vw,3.25rem)] tracking-[-0.02em] leading-[1.05] mt-3">
        Thanks — payment received.
      </h1>
      <p className="mt-4 text-[16px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
        We&rsquo;ve received your payment of {formatUSD(invoice.totalCents)} for invoice {invoice.invoiceNumber}.
        A receipt has been emailed{invoice.client?.email ? ` to ${invoice.client.email}` : ''}.
      </p>

      {needsCarePlanSetup && tier ? (
        <div className="mt-10 rounded-2xl border border-[var(--color-brass)] bg-[var(--color-surface-raised)] p-7 sm:p-9">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
            One more step
          </p>
          <h2 className="font-serif font-semibold text-2xl mt-2">Activate your {tier.name} Care Plan</h2>
          <p className="mt-3 text-[15px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
            Klarna and Affirm cover the project payment but can&rsquo;t handle recurring charges. Add a card now
            to start your {tier.name} Care Plan ({formatUSD(tier.monthlyAmountCents)}/mo, first charge in 30 days).
          </p>
          <CarePlanFallbackButton
            carePlanSlug={tier.slug}
            invoiceToken={token}
            payloadInvoiceId={String(invoice.id)}
            consentText={`I authorize Black Hart Consulting LLC to charge ${formatUSD(tier.monthlyAmountCents)} per month to my saved card for the ${tier.name} Care Plan, until I cancel.`}
          />
          <p className="mt-3 text-[12px] text-[var(--color-fg-muted)]">
            Skip for now? Reach out anytime at hello@blackhartconsulting.com.
          </p>
        </div>
      ) : tier ? (
        <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
            Care Plan
          </p>
          <h2 className="font-serif font-semibold text-2xl mt-2">{tier.name} Care Plan — active</h2>
          <p className="mt-3 text-[15px] leading-[1.55] text-[var(--color-fg-muted)]">
            Your {tier.name} Care Plan is set up. First charge of {formatUSD(tier.monthlyAmountCents)} runs in 30 days
            on the saved payment method. You can cancel from your Stripe customer portal or by emailing us.
          </p>
        </div>
      ) : null}

      <div className="mt-12 flex flex-wrap gap-3">
        <Button href="/" variant="ghost">Back to site</Button>
        <Button href="/contact" variant="secondary">Get in touch</Button>
      </div>
    </Container>
  )
}
