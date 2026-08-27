import { Container } from '@/components/Container'
import { ParallaxBackground } from './ParallaxBackground'
import { Check, Phone, Globe, MapPin, Zap } from 'lucide-react'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import { cn } from '@/lib/utils'
import { PricingCta } from './PricingCta'
import { BundleBuyButton } from './BundleBuyButton'
import type { BundleOfferBlock } from '@/payload-types'

// Alternative layouts for the bundleOffer block, selectable via a
// `layoutVariant` field. The default ("configurator") stays in
// BundleOffer.tsx; these are the candidates for the bundled-pricing display.

type Bundle = NonNullable<BundleOfferBlock['bundles']>[number]

function BundleCtaSlot({ bundle, eyebrow, full }: { bundle: Bundle; eyebrow: string; full?: boolean }) {
  if (bundle.checkoutHref) {
    return <BundleBuyButton href={bundle.checkoutHref} name={bundle.name ?? ''} />
  }
  if (bundle.cta?.label && bundle.cta?.href) {
    return (
      <PricingCta
        href={bundle.cta.href}
        label={bundle.cta.label}
        tierName={bundle.name ?? ''}
        blockEyebrow={eyebrow}
        highlighted={!!bundle.highlighted}
        className={full ? 'w-full' : ''}
      />
    )
  }
  return null
}

function SectionShell({ b, children }: { b: BundleOfferBlock; children: React.ReactNode }) {
  const hasBg = !!b.backgroundImageUrl
  return (
    <section className="section relative isolate overflow-hidden scroll-mt-[73px]" id="bundles">
      {hasBg ? (
        <>
          <ParallaxBackground
            src={stripUnsplashFixedWidth(b.backgroundImageUrl as string)}
            imgClassName="opacity-30"
            priority={false}
          />
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
      {children}
    </section>
  )
}

function Head(b: BundleOfferBlock) {
  return (
    <div className="section-head">
      {b.eyebrow ? (
        <span className="eyebrow eyebrow-row">
          <span className="rule" />
          {b.eyebrow}
        </span>
      ) : null}
      <h2>{b.headline}</h2>
      {b.description ? <p className="lede">{b.description}</p> : null}
    </div>
  )
}

// ── Variant B: tier cards (matches the pricing grid language) ──────────────

export function BundleCards(b: BundleOfferBlock) {
  const bundles = b.bundles ?? []
  return (
    <SectionShell b={b}>
      <Container size="xl">
        <Head {...b} />
        <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto items-stretch">
          {bundles.map((bundle, i) => (
            <div
              key={i}
              className={cn(
                'relative p-8 rounded-[var(--radius-lg)] border flex flex-col h-full',
                'transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5',
                bundle.highlighted
                  ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brass)]',
              )}
            >
              {bundle.highlighted ? (
                <span className="absolute top-4 right-4 inline-flex font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] font-semibold">
                  Best value
                </span>
              ) : null}
              <h3 className="font-serif font-semibold text-[24px] mb-1">{bundle.name}</h3>
              {bundle.tagline ? (
                <p className="text-[14px] text-[var(--color-fg-muted)] mb-4">{bundle.tagline}</p>
              ) : null}
              <div className="mb-5">
                <span className={cn('font-serif font-semibold text-[42px] tracking-[-0.025em] leading-none', bundle.highlighted && 'text-[var(--color-brass)]')}>
                  {bundle.price}
                </span>
                {bundle.monthly ? (
                  <span className="ml-2 text-[16px] text-[var(--color-fg-muted)]">{bundle.monthly}</span>
                ) : null}
              </div>
              <ul className="space-y-3 text-[14.5px] mb-5">
                {bundle.includes?.map((f, j) => (
                  <li key={j} className="flex gap-3 items-start">
                    <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" />
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
              {bundle.note ? (
                <p className="text-[12.5px] text-[var(--color-fg-muted)] mb-5">{bundle.note}</p>
              ) : null}
              <div className="mt-auto">
                <BundleCtaSlot bundle={bundle} eyebrow={b.eyebrow ?? 'bundle'} full />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </SectionShell>
  )
}

// ── Variant C: itemized receipt ────────────────────────────────────────────

export function BundleReceipt(b: BundleOfferBlock) {
  const bundles = b.bundles ?? []
  return (
    <SectionShell b={b}>
      <Container size="xl">
        <Head {...b} />
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto items-stretch">
          {bundles.map((bundle, i) => (
            <div
              key={i}
              className={cn(
                'rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-7 py-8 flex flex-col h-full',
                'shadow-[0_18px_40px_-28px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]',
                // Same hover grammar as the tier/outcome/work cards sitewide.
                'transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-brass)]',
                bundle.highlighted ? 'border-[var(--color-brass)]' : 'border-[var(--color-border-strong)]',
              )}
            >
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-fg-muted)] text-center">
                Bundle no. {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="font-serif font-semibold text-[26px] text-center mt-1">{bundle.name}</h3>
              {bundle.tagline ? (
                <p className="text-[13.5px] text-[var(--color-fg-muted)] text-center mt-1">{bundle.tagline}</p>
              ) : null}
              <div className="border-t border-dashed border-[var(--color-border-strong)] my-5" />
              <ul className="space-y-2.5 flex-1">
                {bundle.includes?.map((f, j) => (
                  <li key={j} className="flex items-baseline justify-between gap-4 text-[14px]">
                    <span>{f.label}</span>
                    <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--color-brass-text)] shrink-0">
                      Included
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-dashed border-[var(--color-border-strong)] my-5" />
              {bundle.note ? (
                <p className="text-[12.5px] text-[var(--color-fg-muted)]">{bundle.note}</p>
              ) : null}
              <p className="flex items-baseline justify-between mt-2">
                <span className="font-mono text-[11px] tracking-[0.16em] uppercase">Bundle price</span>
                <span className="text-right">
                  <span className={cn('font-serif font-semibold text-[30px] leading-none', bundle.highlighted && 'text-[var(--color-brass)]')}>
                    {bundle.price}
                  </span>
                  {bundle.monthly ? (
                    <span className="block text-[13px] text-[var(--color-fg-muted)]">{bundle.monthly}</span>
                  ) : null}
                </span>
              </p>
              <div className="mt-6">
                <BundleCtaSlot bundle={bundle} eyebrow={b.eyebrow ?? 'bundle'} full />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </SectionShell>
  )
}

// ── Variant D: stacked feature banners ─────────────────────────────────────

const BANNER_ICONS = [Globe, MapPin, Phone, Zap]

export function BundleBanners(b: BundleOfferBlock) {
  const bundles = b.bundles ?? []
  return (
    <SectionShell b={b}>
      <Container size="xl">
        <Head {...b} />
        <div className="space-y-6 max-w-5xl mx-auto">
          {bundles.map((bundle, i) => (
            <div
              key={i}
              className={cn(
                'rounded-[var(--radius-xl)] border overflow-hidden grid md:grid-cols-[1.1fr_1fr]',
                bundle.highlighted
                  ? 'border-[var(--color-brass)]'
                  : 'border-[var(--color-border-strong)]',
              )}
            >
              <div className={cn('p-8 sm:p-10', bundle.highlighted && 'bg-[color-mix(in_srgb,var(--color-brass)_7%,var(--color-bg))]')}>
                {bundle.highlighted ? (
                  <span className="inline-flex font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] font-semibold mb-3">
                    Best value
                  </span>
                ) : null}
                <h3 className="font-serif font-semibold text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.1]">{bundle.name}</h3>
                {bundle.tagline ? (
                  <p className="mt-2 text-[15px] text-[var(--color-fg-muted)]">{bundle.tagline}</p>
                ) : null}
                <div className="mt-5 flex items-baseline gap-3 flex-wrap">
                  <span className={cn('font-serif font-semibold text-[44px] tracking-[-0.025em] leading-none', bundle.highlighted && 'text-[var(--color-brass)]')}>
                    {bundle.price}
                  </span>
                  {bundle.monthly ? (
                    <span className="text-[17px] text-[var(--color-fg-muted)]">{bundle.monthly}</span>
                  ) : null}
                </div>
                {bundle.note ? (
                  <p className="mt-2 text-[12.5px] text-[var(--color-fg-muted)]">{bundle.note}</p>
                ) : null}
                <div className="mt-6 max-w-xs">
                  <BundleCtaSlot bundle={bundle} eyebrow={b.eyebrow ?? 'bundle'} full />
                </div>
              </div>
              <div className="p-8 sm:p-10 bg-[var(--color-surface)] border-t md:border-t-0 md:border-l border-[var(--color-border)]">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">
                  What is inside
                </p>
                <ul className="space-y-3.5 text-[14.5px]">
                  {bundle.includes?.map((f, j) => {
                    const Icon = BANNER_ICONS[j % BANNER_ICONS.length]
                    return (
                      <li key={j} className="flex gap-3 items-start">
                        <span className="inline-flex items-center justify-center size-7 rounded-full bg-[color-mix(in_srgb,var(--color-brass)_15%,var(--color-bg))] shrink-0">
                          <Icon className="size-3.5 text-[var(--color-brass)]" aria-hidden />
                        </span>
                        <span className="pt-1">{f.label}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </SectionShell>
  )
}
