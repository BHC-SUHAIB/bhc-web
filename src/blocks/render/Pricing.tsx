import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingBlock } from '@/payload-types'

export function Pricing(b: PricingBlock) {
  return (
    <section className="py-20 sm:py-24">
      <Container size="xl">
        <div className="max-w-2xl mb-14">
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">
              {b.eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-5 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">{b.description}</p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {b.tiers?.map((t, i) => (
            <div
              key={i}
              className={cn(
                'p-8 rounded-[var(--radius-lg)] border flex flex-col',
                t.highlighted
                  ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]',
              )}
            >
              {t.highlighted ? (
                <span className="inline-flex self-start font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] mb-5">
                  Most popular
                </span>
              ) : null}
              <h3 className="font-serif font-semibold text-[22px] mb-2">{t.name}</h3>
              <div className="mb-3">
                <span className="font-serif font-semibold text-[40px] tracking-[-0.025em]">{t.price}</span>
                {t.priceNote ? (
                  <span className="ml-2 text-[14px] text-[var(--color-fg-muted)]">{t.priceNote}</span>
                ) : null}
              </div>
              {t.description ? (
                <p className="text-[14px] leading-[1.5] text-[var(--color-fg-muted)] mb-6">{t.description}</p>
              ) : null}
              <ul className="space-y-3 text-[14px] mb-8 flex-1">
                {t.features?.map((f, j) => (
                  <li key={j} className={cn('flex gap-3 items-start', !f.included && 'opacity-50')}>
                    {f.included ? (
                      <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" />
                    ) : (
                      <X className="size-4 mt-[3px] shrink-0 text-[var(--color-fg-muted)]" />
                    )}
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
              {t.cta?.label && t.cta?.href ? (
                <Button href={t.cta.href} variant={t.highlighted ? 'brass' : 'secondary'} className="w-full" size="lg">
                  {t.cta.label}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
