'use client'

import Link from 'next/link'
import { Container } from '@/components/Container'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PricingCta } from './PricingCta'
import { pushEvent } from '@/lib/analytics'
import { tierSlugFromName } from '@/lib/tiers'
import { IconPage, IconStack, IconPen, IconCompass } from '@/components/BrandIcons'
import type { PricingBlock } from '@/payload-types'

// Custom brass icons for the four website tiers (theme enrichment 2026-08).
// Name-keyed so the many other Pricing instances (care plans, sprints,
// retainers) render unchanged until given art of their own.
const TIER_ICONS: Array<{ match: RegExp; Icon: typeof IconPage }> = [
  { match: /launch page/i, Icon: IconPage },
  { match: /starter site/i, Icon: IconStack },
  { match: /pro site/i, Icon: IconPen },
  { match: /custom build/i, Icon: IconCompass },
]

function anchorFromEyebrow(eyebrow?: string | null): string | undefined {
  if (!eyebrow) return undefined
  const slug = eyebrow.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!slug) return undefined
  return slug.replace(/-(plans|retainers)$/, '')
}

/** Prefer the tier param already carried by the CTA href; else kebab the name. */
function resolveTierSlug(name?: string | null, ctaHref?: string | null): string {
  const fromHref = ctaHref?.match(/[?&]tier=([a-z0-9-]+)/i)?.[1]
  return fromHref ?? tierSlugFromName(name)
}

// `seeAll*` is an optional footer link (used to fold the standalone
// "full pricing menu" CTA into the home pricing section → /services anchor).
export function Pricing(b: PricingBlock & { seeAllHref?: string; seeAllLabel?: string }) {
  const tiers = b.tiers ?? []
  const hasEnterprise = tiers.some((t) => t.enterpriseBadge)
  // An explicit anchorId (e.g. "offer") wins over the eyebrow-derived slug so
  // hero/CTA links like "#offer" land on this section.
  const anchor = (b as { anchorId?: string | null }).anchorId || anchorFromEyebrow(b.eyebrow)
  const isCenteredSingle = b.layoutVariant === 'centered-single' && tiers.length === 1

  return (
    <section
      id={anchor}
      className={cn(
        'py-12 sm:py-16 scroll-mt-[73px]',
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
            const tierSlug = resolveTierSlug(t.name, t.cta?.href)
            const askHref = `/contact?tier=${tierSlug}#contact-form`
            const subscribeHref = t.subscribeHref || t.cta?.href || askHref
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
              {t.badge ? (
                <span className="absolute top-4 right-4 inline-flex items-center font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] font-semibold">
                  {t.badge}
                </span>
              ) : t.enterpriseBadge ? (
                <span className="absolute top-4 right-4 inline-flex items-center font-mono text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-ink)] text-[var(--color-ivory)] font-semibold">
                  Custom scope
                </span>
              ) : null}
              {(() => {
                const Icon = TIER_ICONS.find((x) => x.match.test(t.name ?? ''))?.Icon
                return Icon ? <Icon className="mb-3 size-6" /> : null
              })()}
              <h3 className="font-serif font-semibold text-[22px] mb-2">{t.name}</h3>
              <div className="mb-4">
                <span
                  className={cn(
                    'font-serif font-semibold text-[40px] tracking-[-0.025em] leading-none',
                    t.highlighted && 'text-[var(--color-brass)]',
                  )}
                >
                  {t.price}
                </span>
                {t.priceNote ? (
                  <p className="mt-1.5 text-[14px] text-[var(--color-fg-muted)]">{t.priceNote}</p>
                ) : null}
                {t.subscribePrice ? (
                  <p className="mt-2 text-[16px] text-[var(--color-fg)]">
                    or <span className="font-semibold">{t.subscribePrice}</span>
                    {t.subscribeNote ? (
                      <span className="block text-[12.5px] text-[var(--color-fg-muted)] mt-0.5">{t.subscribeNote}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {t.description ? (
                <p className="text-[14px] leading-[1.5] text-[var(--color-fg-muted)] mb-5">{t.description}</p>
              ) : null}
              <ul className="space-y-3 text-[14px] mb-4">
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
              {t.footnote ? (
                <p className="text-[12.5px] leading-[1.5] text-[var(--color-fg-muted)] mb-4">{t.footnote}</p>
              ) : null}
              <div className="mt-auto flex flex-col gap-2.5">
                {t.checkoutHref ? (
                  <a
                    href={t.checkoutHref}
                    onClick={() => pushEvent('checkout_click', { sku: tierSlug, path: 'buy' })}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 font-semibold no-underline w-full',
                      'tracking-[0.01em] rounded-full select-none whitespace-nowrap',
                      'transition-[background-color,color,border-color,transform] duration-200 ease-out',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                      'active:translate-y-[1px] h-[52px] px-7 text-[15.5px]',
                      'bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)]',
                    )}
                  >
                    Buy now
                  </a>
                ) : t.cta?.label && t.cta?.href ? (
                  <PricingCta
                    href={t.cta.href}
                    label={t.cta.label}
                    tierName={t.name ?? ''}
                    blockEyebrow={b.eyebrow ?? ''}
                    highlighted={!!t.highlighted}
                  />
                ) : null}
                {t.subscribePrice ? (
                  <a
                    href={subscribeHref}
                    onClick={() => pushEvent('checkout_click', { sku: tierSlug, path: 'subscribe' })}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 font-semibold no-underline w-full',
                      'tracking-[0.01em] rounded-full select-none whitespace-nowrap',
                      'transition-[background-color,color,border-color,transform] duration-200 ease-out',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                      'active:translate-y-[1px] h-[46px] px-7 text-[14.5px]',
                      'bg-transparent text-[var(--color-fg)] border border-[var(--color-border-strong)] hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] hover:border-[var(--color-fg)]',
                    )}
                  >
                    Subscribe
                  </a>
                ) : null}
                <Link
                  href={askHref}
                  className="self-center text-[13px] text-[var(--color-fg-muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-brass)] transition-colors"
                >
                  Ask a question
                </Link>
              </div>
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
