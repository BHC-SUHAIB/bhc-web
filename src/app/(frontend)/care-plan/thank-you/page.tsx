import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { carePlanByLookupKey, formatUSD } from '@/lib/care-plans'
import { signInvoiceToken } from '@/lib/invoice-token'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Care Plan activated',
  description: 'Your Care Plan is set up.',
  robots: { index: false, follow: false },
}

type RouteProps = { searchParams: Promise<{ session?: string }> }

export default async function CarePlanThankYouPage({ searchParams }: RouteProps) {
  const { session } = await searchParams

  let tierName: string | null = null
  let monthlyCents: number | null = null
  let portalUrl: string | null = null

  if (session && isStripeConfigured()) {
    try {
      const stripe = getStripe()
      const cs = await stripe.checkout.sessions.retrieve(session, {
        expand: ['setup_intent'],
      })
      if (cs.setup_intent && typeof cs.setup_intent !== 'string') {
        const lookupKey = cs.setup_intent.metadata?.care_plan_lookup_key
        const tier = carePlanByLookupKey(lookupKey ?? null)
        if (tier) {
          tierName = tier.name
          monthlyCents = tier.monthlyAmountCents
        }
      }
      // (Phase D / #21) Build a customer-portal link so the client can
      // self-serve manage payment methods, cancel, view invoices.
      const customerId = typeof cs.customer === 'string' ? cs.customer : cs.customer?.id ?? null
      if (customerId) {
        const token = signInvoiceToken(customerId)
        portalUrl = `/portal/${encodeURIComponent(customerId)}?token=${encodeURIComponent(token)}`
      }
    } catch {
      // Soft-fail. Page still renders the generic confirmation copy.
    }
  }

  return (
    <Container size="md" className="py-20 sm:py-28">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
        Black Hart Consulting
      </p>
      <h1 className="font-serif font-semibold text-[clamp(2rem,4.5vw,3.25rem)] tracking-[-0.02em] leading-[1.05] mt-3">
        {tierName ? `${tierName} Care Plan — activated.` : 'Care Plan activated.'}
      </h1>
      <p className="mt-4 text-[16px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
        {monthlyCents
          ? `${formatUSD(monthlyCents)} was charged today. The next ${formatUSD(monthlyCents)} charge runs in 30 days, and the same amount every 30 days after. Cancel anytime from your customer portal or by emailing us.`
          : 'Your subscription is active. Cancel anytime by emailing us.'}
      </p>
      <div className="mt-12 flex flex-wrap gap-3">
        {portalUrl ? (
          <Button href={portalUrl} variant="primary">Manage payment method</Button>
        ) : null}
        <Button href="/" variant="ghost">Back to site</Button>
        <Button href="/contact" variant="secondary">Get in touch</Button>
      </div>
    </Container>
  )
}
