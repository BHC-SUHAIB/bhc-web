import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingBlock } from '@/payload-types'

/* Map an eyebrow label like "Care plans" → "care-plans" so footer/nav anchors
   (e.g. /services#care) can deep-link straight into a pricing section. */
function anchorFromEyebrow(eyebrow?: string | null): string | undefined {
  if (!eyebrow) return undefined
  const slug = eyebrow.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!slug) return undefined
  // Drop trailing "-plans" / "-retainers" so the anchor is short and stable
  return slug.replace(/-(plans|retainers)$/, '')
}

export function Pricing(b: PricingBlock) {
  const tiers = b.tiers ?? []
  const hasAnyHighlighted = tiers.some((t) => t.highlighted)
  const anchor = anchorFromEyebrow(b.eyebrow)
  return (
    <section id={anchor} className="py-12 sm:py-16 scroll-mt-24">
      <Container size="xl">
        <div className="max-w-2xl mb-10">
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
              {b.eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">{b.description}</p>
          ) : null}
        </div>

        <div
          className={cn(
            'grid gap-5 md:grid-cols-2 items-stretch',
            tiers.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
          )}
        >
          {tiers.map((t, i) => (
            <div
              key={i}
              className={cn(
                'group relative p-7 rounded-[var(--radius-lg)] border flex flex-col h-full',
                'transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out',
                'hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]',
                t.highlighted
                  ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] hover:border-[var(--color-brass-dark)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brass)] hover:bg-[var(--color-surface-raised)]',
              )}
            >
              {hasAnyHighlighted ? (
                <div className="h-7 mb-4 flex items-center">
                  {t.highlighted ? (
                    <span className="inline-flex font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)]">
                      Most popular
                    </span>
                  ) : null}
                </div>
              ) : null}
              <h3 className="font-serif font-semibold text-[22px] mb-2">{t.name}</h3>
              <div className="mb-3 min-h-[52px] flex items-baseline flex-wrap">
                <span className="font-serif font-semibold text-[40px] tracking-[-0.025em] leading-none">{t.price}</span>
                {t.priceNote ? (
                  <span className="ml-2 text-[14px] text-[var(--color-fg-muted)]">{t.priceNote}</span>
                ) : null}
              </div>
              {t.description ? (
                <p className="text-[14px] leading-[1.5] text-[var(--color-fg-muted)] mb-6 min-h-[63px]">{t.description}</p>
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
