import Image from 'next/image'
import { Container } from '@/components/Container'
import { Placeholder } from '@/components/Placeholder'
import { HeroCta } from './HeroCta'
import { HeroPhoneCta } from './HeroPhoneCta'
import { ParallaxBackground } from './ParallaxBackground'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import { phoneHref } from '@/lib/contact'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import type { HeroBlock, Media } from '@/payload-types'
import { cn } from '@/lib/utils'

// Hero supports three rendering modes:
//
// 1. backgroundImageUrl set (e.g. an Unsplash URL on a niche LP) → full-bleed
//    background image with darkening overlay; headline overlays the photo.
// 2. image upload set → side-by-side layout with image on the right.
// 3. neither → text-only hero, can be left or center aligned.
//
// The overlay strength is editor-controllable so dark photos and bright photos
// both keep the headline readable.

export async function Hero(b: HeroBlock & { phoneOverride?: string }) {
  const align = b.align ?? 'left'
  const img = typeof b.image === 'object' ? (b.image as Media | null) : null
  const hasUpload = !!img?.url
  const hasBackgroundUrl = !!b.backgroundImageUrl
  const overlayStrength = b.overlayStrength ?? 'medium'
  // Phone CTA: read SiteSettings.contactPhone (cached) and render an
  // "Or call: <number>" line directly under the CTAs when showPhoneCta is on.
  // Wrapped in a small client component so the click fires the
  // `phone_click` dataLayer event for ad-attribution. When called from the LP
  // route group, phoneOverride is set so the LP shows its own number rather
  // than the main-site contactPhone from SiteSettings.
  const settingsPhone = b.showPhoneCta ? (await getCachedSiteSettings())?.contactPhone ?? '' : ''
  const phoneRaw = b.showPhoneCta ? (b.phoneOverride ?? settingsPhone) : ''
  const phoneHrefVal = phoneRaw ? phoneHref(phoneRaw) : null

  if (hasBackgroundUrl) {
    // Stronger gradients across the board for legibility on busy/bright photos.
    // The "heavy" preset is now the new default in the schema; it darkens the
    // top (under the nav) and bottom (under the headline) significantly while
    // keeping the middle band of the photo visible.
    const overlayClass =
      overlayStrength === 'light'
        ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.2)_40%,rgba(0,0,0,0.65)_100%)]'
        : overlayStrength === 'heavy'
          ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.55)_40%,rgba(0,0,0,0.92)_100%)]'
          : overlayStrength === 'extra-heavy'
            ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.7)_40%,rgba(0,0,0,0.95)_100%)]'
            : 'bg-[linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.35)_40%,rgba(0,0,0,0.78)_100%)]'

    // Strip Unsplash's hardcoded `w=1920` so next/image can pick a size for
    // the viewport. See src/lib/unsplash.ts for the full reasoning.
    const bgUrl = stripUnsplashFixedWidth(b.backgroundImageUrl as string)
    return (
      <section className="relative isolate overflow-hidden">
        {/* ParallaxBackground is a client leaf that translates the hero photo
            on scroll. Mobile + reduced-motion fall back to a static image so
            the perf budget (sub-200KB JS, sub-1s LCP) is preserved. */}
        <ParallaxBackground
          src={bgUrl}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1920px"
        />
        <div className={cn('absolute inset-0 -z-10', overlayClass)} aria-hidden />
        <Container size="xl">
          <div
            className={cn(
              // Tighter mobile padding (was py-24 = 192px total) so the
              // primary CTA lands above the fold on a 667px-tall phone.
              // pt-20 on mobile ensures the eyebrow clears the absolutely-
              // positioned LP logo (40px tall + 24px top inset = 64px occupied).
              'pt-20 pb-14 sm:py-28 md:py-40 max-w-3xl',
              align === 'center' && 'mx-auto text-center',
            )}
          >
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/85 mb-3 sm:mb-5 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                {b.eyebrow}
              </p>
            ) : null}
            {/* Single, subtle drop-shadow on hero text — reads as legible-on-photo
                without the layered "premium-studio designer" look. The heavy
                gradient overlay does the heavy lifting for legibility. */}
            <h1 className="font-serif font-semibold text-[clamp(2rem,5vw,4.5rem)] leading-[1.05] sm:leading-[1.02] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]">
              {b.headline}
            </h1>
            {b.subheadline ? (
              <p className="mt-4 sm:mt-6 text-[clamp(1rem,1.4vw,1.25rem)] leading-[1.5] sm:leading-[1.55] text-white max-w-2xl [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
                {b.subheadline}
              </p>
            ) : null}
            {(b.ctas && b.ctas.length > 0) || (phoneRaw && phoneHrefVal) ? (
              <div
                className={cn(
                  // Mobile: stack CTAs full-width so the primary action is
                  // unmissable. Desktop: revert to inline row.
                  'mt-6 sm:mt-10 flex flex-col sm:flex-row sm:flex-wrap gap-3 [&>a]:w-full sm:[&>a]:w-auto',
                  align === 'center' && 'sm:justify-center',
                )}
              >
                {b.ctas?.map((c, i) => (
                  <HeroCta key={i} href={c.href} label={c.label} variant={c.variant ?? null} position={i + 1} onPhoto />
                ))}
                {/* Phone button sits in the same row as the configured CTAs so
                    they all align as one inline group instead of the phone
                    being a stranded affordance below. Renders only when
                    showPhoneCta is enabled on the Hero block + a contactPhone
                    is set in SiteSettings. `onPhoto` swaps to white-on-photo
                    styling so the button reads against the dark overlay. */}
                {phoneRaw && phoneHrefVal ? (
                  <HeroPhoneCta phone={phoneRaw} href={phoneHrefVal} onPhoto />
                ) : null}
              </div>
            ) : null}
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="relative py-14 sm:py-20 md:py-24">
      <Container size="xl">
        <div className={cn(
          'grid gap-12 items-center',
          hasUpload ? 'md:grid-cols-[1.1fr_0.9fr]' : 'md:grid-cols-1',
          align === 'center' && !hasUpload && 'text-center',
        )}>
          <div className={cn('max-w-3xl', align === 'center' && !hasUpload && 'mx-auto')}>
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
                {b.eyebrow}
              </p>
            ) : null}
            <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em]">
              {b.headline}
            </h1>
            {b.subheadline ? (
              <p className="mt-6 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                {b.subheadline}
              </p>
            ) : null}
            {(b.ctas && b.ctas.length > 0) || (phoneRaw && phoneHrefVal) ? (
              <div className={cn(
                'mt-10 flex flex-wrap gap-3',
                align === 'center' && !hasUpload && 'justify-center',
              )}>
                {b.ctas?.map((c, i) => (
                  <HeroCta key={i} href={c.href} label={c.label} variant={c.variant ?? null} position={i + 1} />
                ))}
                {phoneRaw && phoneHrefVal ? (
                  <HeroPhoneCta phone={phoneRaw} href={phoneHrefVal} />
                ) : null}
              </div>
            ) : null}
          </div>

          {hasUpload ? (
            <div className="relative aspect-[4/5] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)]">
              <Image
                src={img!.url as string}
                alt={(img!.alt as string) ?? ''}
                fill
                className="object-cover"
                sizes="(min-width:768px) 45vw, 100vw"
                priority
              />
            </div>
          ) : img === null && b.image ? (
            <div className="relative aspect-[4/5] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)]">
              <Placeholder seed={b.headline} label={b.eyebrow ?? 'Hero'} aspect="tall" />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
