import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import type { CTABlock } from '@/payload-types'

export function CTA(b: CTABlock) {
  const emphasized = b.variant === 'emphasized'
  return (
    <section className="py-10 sm:py-14">
      <Container size="lg">
        <div className={cn(
          'rounded-[var(--radius-xl)] border p-8 sm:p-12 text-center',
          emphasized
            ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_12%,var(--color-bg))]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)]',
        )}>
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] tracking-[-0.02em] max-w-2xl mx-auto">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
              {b.description}
            </p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            {b.primaryCta?.label && b.primaryCta?.href ? (
              <Button href={b.primaryCta.href} variant={emphasized ? 'brass' : 'primary'} size="lg">
                {b.primaryCta.label}
              </Button>
            ) : null}
            {b.secondaryCta?.label && b.secondaryCta?.href ? (
              <Button href={b.secondaryCta.href} variant="ghost" size="lg">
                {b.secondaryCta.label}
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  )
}
