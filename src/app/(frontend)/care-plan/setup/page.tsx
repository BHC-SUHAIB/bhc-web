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
  searchParams: Promise<{
    tier?: string
    cancelled?: string
    customer?: string
    token?: string
    /** Custom tier display name. Only honored when tier === 'custom' AND token is valid. */
    label?: string
    /** Custom tier monthly amount in cents. Only honored when tier === 'custom' AND token is valid. */
    amount?: string
  }>
}

export default async function CarePlanSetupPage({ searchParams }: RouteProps) {
  const sp = await searchParams
  const wasCancelled = sp.cancelled === '1'

  // Branded-email path: when admin sends a setup email, the URL carries a
  // signed token + customer ID, so the client doesn't have to re-enter
  // their email. Verify the token here and pass the pre-resolved customer
  // ID through to the client component.
  let prefilledCustomerId: string | null = null
  if (sp.customer && sp.token) {
    const verified = verifyInvoiceToken(sp.token, sp.customer)
    if (verified.ok) prefilledCustomerId = sp.customer
  }

  // Custom-tier path: signed admin URL passes a label + amount. They're
  // display-only — the actual subscription price is set by the operator
  // in Stripe Dashboard, so a tampered URL can't change what's charged.
  // We still gate the custom rendering on a valid token so a random
  // visitor can't construct a fake "Custom Plan — $0/mo" page.
  let customLabel: string | null = null
  let customAmountCents: number | null = null
  if (sp.tier === 'custom' && prefilledCustomerId && sp.label && sp.amount) {
    const parsedAmount = Number(sp.amount)
    if (Number.isInteger(parsedAmount) && parsedAmount >= 100) {
      customLabel = sp.label.slice(0, 80)
      customAmountCents = parsedAmount
    }
  }
  const isCustomFlow = customLabel !== null && customAmountCents !== null

  const initialTier = !isCustomFlow && sp.tier && CARE_PLANS.find((p) => p.slug === sp.tier)
    ? (sp.tier as 'care' | 'growth' | 'scale')
    : 'care'

  const heading = isCustomFlow ? `Activate your ${customLabel}` : 'Activate your Care Plan'
  const intro = isCustomFlow
    ? `Add a card or U.S. bank account to start your ${customLabel} subscription. You can cancel any time from the Stripe customer portal or by emailing us.`
    : 'Add a card or U.S. bank account to start a recurring Care Plan subscription. You can cancel any time from the Stripe customer portal or by emailing us.'

  return (
    <Container size="md" className="py-20 sm:py-28">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
        Black Hart Consulting
      </p>
      <h1 className="font-serif font-semibold text-[clamp(2rem,4.5vw,3.25rem)] tracking-[-0.02em] leading-[1.05] mt-3">
        {heading}
      </h1>
      <p className="mt-4 text-[16px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
        {intro}
      </p>

      {wasCancelled ? (
        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px]">
          Setup was cancelled. No charges were attempted. Use the link in your email to try again.
        </div>
      ) : null}

      {isCustomFlow ? (
        <div className="mt-10 rounded-2xl border border-[var(--color-brass)] bg-[var(--color-surface)] p-7 sm:p-9">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
            Your plan
          </p>
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-serif text-[22px] font-semibold tracking-[-0.01em]">{customLabel}</p>
            <p className="font-mono text-[16px] tabular-nums">{formatUSD(customAmountCents!)}/mo</p>
          </div>
          <p className="mt-3 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">
            This price was agreed to by you and Black Hart Consulting. Activate below to save your
            payment method — your first charge runs after we confirm everything is set up on our end.
          </p>
        </div>
      ) : (
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
      )}

      <CarePlanSetupClient
        initialTier={initialTier}
        prefilledCustomerId={prefilledCustomerId}
        customLabel={customLabel}
        customAmountCents={customAmountCents}
      />
    </Container>
  )
}
