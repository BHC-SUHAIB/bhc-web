import Image from 'next/image'
import { Container } from '@/components/Container'
import { Check } from 'lucide-react'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import { cn } from '@/lib/utils'
import { PricingCta } from './PricingCta'
import type { BundleOfferBlock } from '@/payload-types'

// Bundles combine a website build with care or SEO at a discount vs buying the
// products separately. Each bundle is a complete, pre-priced package authored
// in the CMS (name + tagline + price + savings + an includes list). The Warm
// Mono design renders each bundle as a "package configurator" card: the
// includes show as locked option rows on the left, with a dark sticky summary
// band on the right carrying the price, savings, and CTA.

export function BundleOffer(b: BundleOfferBlock) {
  const bundles = b.bundles ?? []
  const hasBg = !!b.backgroundImageUrl
  return (
    <section className="section relative isolate overflow-hidden scroll-mt-24" id="bundles">
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

        <div
          className={cn(
            'grid gap-5 items-start',
            bundles.length >= 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
          )}
        >
          {bundles.map((bundle, i) => (
            <div key={i} className="bundle-config">
              <div className="bundle-grid">
                <div className="bundle-opts">
                  {bundle.includes?.map((f, j) => (
                    <div key={j} className="opt required">
                      <span className="check">
                        <Check />
                      </span>
                      <span className="o-body">
                        <b>{f.label}</b>
                      </span>
                      <span className="o-incl">Included</span>
                    </div>
                  ))}
                </div>

                <div className="bundle-summary">
                  <h3>{bundle.name}</h3>
                  {bundle.tagline ? <div className="sum-line">{bundle.tagline}</div> : null}
                  <div className="sum-total">
                    <span className="lbl">Bundle price</span>
                    <b>{bundle.price}</b>
                  </div>
                  {bundle.savings ? <div className="sum-save">{bundle.savings}</div> : null}
                  {bundle.cta?.label && bundle.cta?.href ? (
                    <div className="mt-5">
                      <PricingCta
                        href={bundle.cta.href}
                        label={bundle.cta.label}
                        tierName={bundle.name ?? ''}
                        blockEyebrow={b.eyebrow ?? 'bundle'}
                        highlighted={!!bundle.highlighted}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
