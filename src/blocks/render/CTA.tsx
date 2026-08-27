import { Container } from '@/components/Container'
import { ParallaxBackground } from './ParallaxBackground'
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
      <Container size="lg">
        <div
          className={cn(
            'cta-band',
            // `.emph` paints the dark ink band (var(--band-bg) / --band-fg).
            emphasized && 'emph',
            // When a faint section photo is set, let it bleed through the band
            // edges instead of fully covering it.
            hasBg && 'backdrop-blur-sm',
          )}
          style={hasBg && !emphasized
            ? { background: 'color-mix(in srgb, var(--color-bg) 82%, transparent)' }
            : undefined}
        >
          <h2>{b.headline}</h2>
          {b.description ? <p>{b.description}</p> : null}
          <div className="cta-row">
            {b.primaryCta?.label && b.primaryCta?.href ? (
              <Button href={b.primaryCta.href} variant="brass" size="lg">
                {b.primaryCta.label}
              </Button>
            ) : null}
            {b.secondaryCta?.label && b.secondaryCta?.href ? (
              <Button
                href={b.secondaryCta.href}
                // On the dark/emphasized band (or over a photo) a plain ghost
                // button has too little contrast — use the on-photo treatment so
                // it stays legible against the ink fill. Light surface keeps ghost.
                variant={emphasized || hasBg ? 'onPhotoGhost' : 'ghost'}
                size="lg"
              >
                {b.secondaryCta.label}
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  )
}
