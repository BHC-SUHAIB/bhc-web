'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PricingCta } from './PricingCta'
import { relabelDiscount } from '@/lib/redesign'
import type { PricingBlock } from '@/payload-types'

function anchorFromEyebrow(eyebrow?: string | null): string | undefined {
  if (!eyebrow) return undefined
  const slug = eyebrow.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!slug) return undefined
  return slug.replace(/-(plans|retainers)$/, '')
}

// `seeAll*` is an optional footer link (used to fold the standalone
// "full pricing menu" CTA into the home pricing section → /services anchor).
export function Pricing(b: PricingBlock & { seeAllHref?: string; seeAllLabel?: string }) {
  const tiers = b.tiers ?? []
  const hasAnyHighlighted = tiers.some((t) => t.highlighted)
  const hasEnterprise = tiers.some((t) => t.enterpriseBadge)
  const anchor = anchorFromEyebrow(b.eyebrow)
  const isCenteredSingle = b.layoutVariant === 'centered-single' && tiers.length === 1

  // Discounted/retail toggle — only when a tier carries both a discounted price
  // and an originalPrice retail anchor. Flips the displayed number; pure
  // presentation off existing CMS fields (no schema change).
  const hasFoundingDiscount = tiers.some((t) => t.price && t.originalPrice)
  const [mode, setMode] = useState<'founding' | 'retail'>('founding')

  return (
    <section
      id={anchor}
      className={cn(
        'py-12 sm:py-16 scroll-mt-24',
        hasEnterprise && 'relative bg-[color-mix(in_srgb,var(--color-brass)_5%,transparent)]',
      )}
    >
      <Container size="xl">
        <div className={cn('mb-10', isCenteredSingle ? 'max-w-3xl mx-auto text-center' : 'max-w-2xl')}>
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-brass-text)] mb-3">
              {b.eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {relabelDiscount(b.headline)}
          </h2>
          {b.description ? (
            <p className={cn('mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]', isCenteredSingle && 'mx-auto max-w-2xl')}>
              {relabelDiscount(b.description)}
            </p>
          ) : null}
        </div>

        {hasFoundingDiscount ? (
          <div className={cn('flex', isCenteredSingle ? 'justify-center' : 'justify-start')}>
            <div className="price-toggle" role="group" aria-label="Pricing mode">
              <button type="button" aria-pressed={mode === 'founding'} onClick={() => setMode('founding')}>
                Discounted<span className="save-tag">limited</span>
              </button>
              <button type="button" aria-pressed={mode === 'retail'} onClick={() => setMode('retail')}>
                Retail
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'items-stretch',
            isCenteredSingle
              ? 'flex justify-center'
              : cn(
                  'grid gap-5 md:grid-cols-2',
                  tiers.length === 2
                    ? 'lg:grid-cols-2 max-w-5xl mx-auto'
                    : tiers.length === 4
                      ? 'lg:grid-cols-4'
                      : tiers.length >= 7
                        ? 'lg:grid-cols-4'
                        : 'lg:grid-cols-3',
                ),
          )}
          data-reveal-stagger
        >
          {tiers.map((t, i) => {
            const foundingMode = mode === 'founding'
            const bigPrice = foundingMode ? t.price : (t.originalPrice ?? t.price)
            const struck = foundingMode && t.originalPrice ? t.originalPrice : null
            return (
            <div
              key={i}
              className={cn(
                'group relative p-7 rounded-[var(--radius-lg)] border flex flex-col h-full',
                isCenteredSingle && 'w-full max-w-2xl p-9 sm:p-11',
                'transition-[transform,border-color,background-color] duration-200 ease-out',
                'hover:-translate-y-0.5',
                t.enterpriseBadge
                  ? 'border-2 border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_10%,var(--color-bg))]'
                  : t.highlighted
                    ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brass)]',
              )}
            >
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
                  <span
                    className={cn(
                      'font-serif font-semibold text-[40px] tracking-[-0.025em] leading-none',
                      t.highlighted && 'text-[var(--color-brass)]',
                    )}
                  >
                    {bigPrice}
                  </span>
                  {struck ? (
                    <span className="font-serif text-[24px] tracking-[-0.02em] leading-none text-[var(--color-fg-muted)] line-through decoration-[1.5px]">
                      {struck}
                    </span>
                  ) : null}
                </div>
                {t.priceNote ? (
                  <p className="mt-1.5 text-[14px] text-[var(--color-fg-muted)]">{relabelDiscount(t.priceNote)}</p>
                ) : null}
              </div>
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
          )})}
        </div>

        {b.seeAllHref ? (
          <div className="mt-10 text-center">
            <Link
              href={b.seeAllHref}
              className="inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.12em] uppercase text-[var(--color-brass-text)] hover:text-[var(--color-brass)] transition-colors"
            >
              {b.seeAllLabel ?? 'See all packages & pricing'}
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}
      </Container>
    </section>
  )
}
