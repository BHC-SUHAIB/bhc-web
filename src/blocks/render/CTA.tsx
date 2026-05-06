import Image from 'next/image'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import { cn } from '@/lib/utils'
import type { CTABlock } from '@/payload-types'

export function CTA(b: CTABlock) {
  const emphasized = b.variant === 'emphasized'
  const hasBg = !!b.backgroundImageUrl
  return (
    <section className="relative isolate overflow-hidden py-10 sm:py-14">
      {hasBg ? (
        <>
          {/* Was a CSS `background-image` — bypassed next/image, shipped raw
              1920px Unsplash source on every viewport (~984KB on /home).
              Routed through next/image so mobile gets a 750w variant.
              Lighthouse audit 2026-05-05. */}
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
      <Container size="lg">
        <div className={cn(
          'rounded-[var(--radius-xl)] border p-8 sm:p-12 text-center',
          // Translucent backgrounds when a faint section image is set, so
          // the photo bleeds through the card edges/shadow zone.
          emphasized
            ? hasBg
              ? 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_15%,color-mix(in_srgb,var(--color-bg)_80%,transparent))] backdrop-blur-sm'
              : 'border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_12%,var(--color-bg))]'
            : hasBg
              ? 'border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] backdrop-blur-sm'
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
