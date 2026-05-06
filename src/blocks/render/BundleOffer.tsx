import Image from 'next/image'
import { Container } from '@/components/Container'
import { Check } from 'lucide-react'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import { cn } from '@/lib/utils'
import { PricingCta } from './PricingCta'
import type { BundleOfferBlock } from '@/payload-types'

// Bundles combine a website build with care or SEO at a discount vs buying
// the products separately. Typical pattern: 2-3 bundles, with the middle one
// "highlighted" as the recommended choice — same psychology as the Pricing
// block but explicitly framed as a bundled deal so the buyer doesn't have to
// piece together the discount math themselves.

export function BundleOffer(b: BundleOfferBlock) {
  const bundles = b.bundles ?? []
  const hasBg = !!b.backgroundImageUrl
  return (
    <section className="relative isolate overflow-hidden py-14 sm:py-18 scroll-mt-24" id="bundles">
      {hasBg ? (
        <>
          {/* CSS background-image → next/image so the editor-pasted Unsplash
              source gets responsive sizing. Lighthouse audit 2026-05-05. */}
          <div aria-hidden className="absolute inset-0 -z-20">
            <Image
              src={stripUnsplashFixedWidth(b.backgroundImageUrl as string)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1920px"
              className="object-cover opacity-30"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-bg) 55%, transparent) 0%, color-mix(in srgb, var(--color-bg) 70%, transparent) 100%)',
            }}
          />
        </>
      ) : null}
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
            bundles.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
          )}
        >
          {bundles.map((bundle, i) => (
            <div
              key={i}
              className={cn(
                'group relative p-7 rounded-[var(--radius-lg)] border flex flex-col h-full transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]',
                // Translucent backgrounds when the section has a faint image
                // behind it, so the photo shows through the negative space
                // around (and faintly through) the cards.
                bundle.highlighted
                  ? hasBg
                    ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_10%,color-mix(in_srgb,var(--color-bg)_82%,transparent))] backdrop-blur-sm hover:border-[var(--color-brass-dark)]'
                    : 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] hover:border-[var(--color-brass-dark)]'
                  : hasBg
                    ? 'border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] backdrop-blur-sm hover:border-[var(--color-brass)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brass)] hover:bg-[var(--color-surface-raised)]',
              )}
            >
              {bundle.highlighted ? (
                <div className="h-7 mb-4 flex items-center">
                  <span className="inline-flex font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)]">
                    Recommended bundle
                  </span>
                </div>
              ) : (
                <div className="h-7 mb-4" aria-hidden />
              )}
              <h3 className="font-serif font-semibold text-[22px] mb-2">{bundle.name}</h3>
              {bundle.tagline ? (
                <p className="text-[14px] leading-[1.5] text-[var(--color-fg-muted)] mb-5 min-h-[42px]">{bundle.tagline}</p>
              ) : null}
              <div className="mb-3">
                <span className="font-serif font-semibold text-[32px] tracking-[-0.025em] leading-none">{bundle.price}</span>
              </div>
              {bundle.savings ? (
                <p className="text-[13px] font-mono uppercase tracking-[0.12em] text-[var(--color-brass)] font-semibold mb-6">
                  {bundle.savings}
                </p>
              ) : (
                <div className="mb-6" />
              )}
              <ul className="space-y-3 text-[14px] mb-8 flex-1">
                {bundle.includes?.map((f, j) => (
                  <li key={j} className="flex gap-3 items-start">
                    <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" />
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
              {bundle.cta?.label && bundle.cta?.href ? (
                <PricingCta
                  href={bundle.cta.href}
                  label={bundle.cta.label}
                  tierName={bundle.name ?? ''}
                  blockEyebrow={b.eyebrow ?? 'bundle'}
                  highlighted={!!bundle.highlighted}
                />
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
