import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { CARE_PLANS, formatUSD } from '@/lib/care-plans'
import { verifyInvoiceToken } from '@/lib/invoice-token'
import { CarePlanSetupClient } from './CarePlanSetupClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activate your Care Plan',
  description: 'Add a card to start your Care Plan subscription.',
  robots: { index: false, follow: false },
}

type RouteProps = {
  searchParams: Promise<{ tier?: string; cancelled?: string; customer?: string; token?: string }>
}

export default async function CarePlanSetupPage({ searchParams }: RouteProps) {
  const sp = await searchParams
  const initialTier = sp.tier && CARE_PLANS.find((p) => p.slug === sp.tier) ? (sp.tier as 'care' | 'growth' | 'scale') : 'care'
  const wasCancelled = sp.cancelled === '1'

  // Branded-email path: when admin sends a "Set up your Care Plan" email,
  // the URL carries a signed token + customer ID, so the client doesn't
  // have to re-enter their email. Verify the token here and pass the
  // pre-resolved customer ID through to the client component.
  let prefilledCustomerId: string | null = null
  if (sp.customer && sp.token) {
    const verified = verifyInvoiceToken(sp.token, sp.customer)
    if (verified.ok) prefilledCustomerId = sp.customer
  }

  return (
    <Container size="md" className="py-20 sm:py-28">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
        Black Hart Consulting
      </p>
      <h1 className="font-serif font-semibold text-[clamp(2rem,4.5vw,3.25rem)] tracking-[-0.02em] leading-[1.05] mt-3">
        Activate your Care Plan
      </h1>
      <p className="mt-4 text-[16px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
        Add a card or U.S. bank account to start a recurring Care Plan subscription. You can cancel
        any time from the Stripe customer portal or by emailing us.
      </p>

      {wasCancelled ? (
        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px]">
          Setup was cancelled. No charges were attempted. Choose a tier below to try again.
        </div>
      ) : null}

      <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
          Pricing reference
        </p>
        <ul className="grid sm:grid-cols-3 gap-4">
          {CARE_PLANS.map((p) => (
            <li key={p.slug} className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="font-medium text-[15px]">{p.name}</p>
              <p className="mt-1 font-mono text-[14px] tabular-nums">{formatUSD(p.monthlyAmountCents)}/mo</p>
              <p className="mt-2 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">{p.blurb}</p>
            </li>
          ))}
        </ul>
      </div>

      <CarePlanSetupClient initialTier={initialTier} prefilledCustomerId={prefilledCustomerId} />
    </Container>
  )
}
