import Link from 'next/link'
import { Container } from '@/components/Container'
import type { FoundingClientBlock } from '@/payload-types'

// Founding-client banner: a temporary, time-bound discount mechanism that
// trades price for testimonials and case studies.
//
// The spot counter (e.g. "3 of 5 spots remaining") was previously rendered
// here and read from SiteSettings.foundingSpotsRemaining. It was removed
// 2026-05-22: a stale counter that doesn't decrement in real time signals
// "nobody's biting" more strongly than it conveys scarcity. The underlying
// SiteSettings fields are kept for now in case we re-introduce the counter
// later with a real-time data source.

export async function FoundingClient(b: FoundingClientBlock) {
  const offers = b.offers ?? []

  // An offer's priceFounding is "monetary" when it starts with "$". For
  // non-monetary lead prices like "Free", the side-by-side strikethrough
  // retail price reads as "Free is the new price" — misleading. Drop the
  // strikethrough in that case and let the savings line carry the offer.
  const isMonetary = (price: string | null | undefined) =>
    typeof price === 'string' && price.trim().startsWith('$')

  return (
    <section className="py-14 sm:py-18 bg-[var(--color-ink)] text-[var(--color-ivory)] relative overflow-hidden">
      {/* Subtle radial gradient accent for warmth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 80% 50%, color-mix(in srgb, var(--color-brass) 35%, transparent), transparent)',
        }}
      />
      <Container size="xl">
        <div className="relative max-w-2xl">
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-brass)] mb-4 font-semibold">
              {b.eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.85rem,3.4vw,2.85rem)] leading-[1.05] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-4 text-[16px] leading-[1.55] text-[color-mix(in_srgb,var(--color-ivory)_75%,transparent)] max-w-xl">
              {b.description}
            </p>
          ) : null}
        </div>

        {offers.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((o, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-ivory)_18%,transparent)] bg-[color-mix(in_srgb,var(--color-ivory)_6%,transparent)] p-6 backdrop-blur-sm"
              >
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-[color-mix(in_srgb,var(--color-ivory)_60%,transparent)] mb-3 font-semibold">
                  {o.name}
                </p>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serif text-[40px] font-semibold tracking-[-0.025em] leading-none text-[var(--color-brass)]">
                    {o.priceFounding}
                  </span>
                  {o.priceRetail && isMonetary(o.priceFounding) ? (
                    <span className="text-[14px] line-through text-[color-mix(in_srgb,var(--color-ivory)_45%,transparent)]">
                      {o.priceRetail}
                    </span>
                  ) : o.priceRetail ? (
                    <span className="text-[14px] text-[color-mix(in_srgb,var(--color-ivory)_60%,transparent)]">
                      then {o.priceRetail}
                    </span>
                  ) : null}
                </div>
                {o.savings ? (
                  <p className="mt-2 font-mono text-[11px] tracking-[0.12em] uppercase text-[color-mix(in_srgb,var(--color-ivory)_70%,transparent)] font-semibold">
                    {o.savings}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {b.cta?.label && b.cta?.href ? (
          <div className="mt-10 flex justify-center md:justify-start">
            <Link
              href={b.cta.href}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] px-7 py-3.5 font-semibold text-[15px] hover:bg-[var(--color-brass-dark)] transition-colors"
            >
              {b.cta.label}
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}
      </Container>
    </section>
  )
}
