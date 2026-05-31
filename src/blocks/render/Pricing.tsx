import { Container } from '@/components/Container'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PricingCta } from './PricingCta'
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
  const hasEnterprise = tiers.some((t) => t.enterpriseBadge)
  const anchor = anchorFromEyebrow(b.eyebrow)
  const isCenteredSingle = b.layoutVariant === 'centered-single' && tiers.length === 1
  return (
    <section
      id={anchor}
      className={cn(
        'py-12 sm:py-16 scroll-mt-24',
        // When this section contains an enterprise-tagged tier, wrap the
        // whole band in a brass-tinted background so it visually breaks from
        // the regular tier rows above. Subtle — just enough to read as
        // a distinct option, not a 4th column.
        hasEnterprise && 'relative bg-[color-mix(in_srgb,var(--color-brass)_5%,transparent)]',
      )}
    >
      <Container size="xl">
        <div className={cn('mb-10', isCenteredSingle ? 'max-w-3xl mx-auto text-center' : 'max-w-2xl')}>
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
              {b.eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className={cn('mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]', isCenteredSingle && 'mx-auto max-w-2xl')}>
              {b.description}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            'items-stretch',
            isCenteredSingle
              ? 'flex justify-center'
              : cn(
                  'grid gap-5 md:grid-cols-2',
                  // 2 tiers → 2 cols at lg, max-width capped so the pair
                  // reads as a deliberate choice (added 2026-05-26 for the
                  // Sprint + Starter pair on the LP).
                  // 3 tiers → 3 cols (clean single row).
                  // 4 tiers → 4 cols (no widow).
                  // 5-6 tiers → 3 cols (clean 2-row grid, no orphans).
                  // 7+ tiers → 4 cols (compact 2-row+).
                  tiers.length === 2
                    ? 'lg:grid-cols-2 max-w-5xl mx-auto'
                    : tiers.length === 4
                      ? 'lg:grid-cols-4'
                      : tiers.length >= 7
                        ? 'lg:grid-cols-4'
                        : 'lg:grid-cols-3',
                ),
          )}
        >
          {tiers.map((t, i) => (
            <div
              key={i}
              className={cn(
                'group relative p-7 rounded-[var(--radius-lg)] border flex flex-col h-full',
                isCenteredSingle && 'w-full max-w-2xl p-9 sm:p-11 shadow-[0_24px_60px_-30px_color-mix(in_srgb,var(--color-ink)_55%,transparent)]',
                'transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out',
                'hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]',
                t.enterpriseBadge
                  ? 'border-2 border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_10%,var(--color-bg))] hover:border-[var(--color-brass-dark)]'
                  : t.highlighted
                    ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] hover:border-[var(--color-brass-dark)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brass)] hover:bg-[var(--color-surface-raised)]',
              )}
            >
              {/* Enterprise corner badge — pinned to top-right of the card so it
                  reads as a tag, not a competing column heading. */}
              {t.enterpriseBadge ? (
                <span className="absolute top-4 right-4 inline-flex items-center font-mono text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-ink)] text-[var(--color-ivory)] font-semibold">
                  Enterprise
                </span>
              ) : null}
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
              <div className="mb-4">
                <div className="flex items-baseline flex-wrap gap-x-3">
                  {/* Brass-colored price on the highlighted tier so the LP's
                      headline number (e.g. $999 on express-website, $2,495
                      on houston-midmarket) pops visually against the other
                      tier in the pair. Added 2026-05-27 per dev review. */}
                  <span
                    className={cn(
                      'font-serif font-semibold text-[40px] tracking-[-0.025em] leading-none',
                      t.highlighted && 'text-[var(--color-brass)]',
                    )}
                  >
                    {t.price}
                  </span>
                  {/* Discount display: original price renders strikethrough next
                      to the current price when set. Replaces the older "was $X"
                      pattern that lived inside priceNote. */}
                  {t.originalPrice ? (
                    <span className="font-serif text-[24px] tracking-[-0.02em] leading-none text-[var(--color-fg-muted)] line-through decoration-[1.5px]">
                      {t.originalPrice}
                    </span>
                  ) : null}
                </div>
                {/* priceNote always renders on its own line below the price so
                    every tier in a row aligns visually, even when only some
                    tiers carry a strikethrough originalPrice (which would
                    otherwise wrap the note inconsistently across cards). */}
                {t.priceNote ? (
                  <p className="mt-1.5 text-[14px] text-[var(--color-fg-muted)]">{t.priceNote}</p>
                ) : null}
              </div>
              {/* Description renders at natural height — no min-height. With
                  `mt-auto` on the CTA below, any extra vertical space (from
                  cards in the same row stretching to equal height) lands
                  between features and CTA, not as dead whitespace under
                  short descriptions. */}
              {t.description ? (
                <p className="text-[14px] leading-[1.5] text-[var(--color-fg-muted)] mb-5">{t.description}</p>
              ) : null}
              <ul className="space-y-3 text-[14px] mb-6">
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
                <div className="mt-auto">
                  <PricingCta
                    href={t.cta.href}
                    label={t.cta.label}
                    tierName={t.name ?? ''}
                    blockEyebrow={b.eyebrow ?? ''}
                    highlighted={!!t.highlighted}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
