'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { Container } from '@/components/Container'
import { pushEvent, pushEventThenNavigate } from '@/lib/analytics'
import { mailtoHref } from '@/lib/contact'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import type { CalendlyBookingBlock } from '@/payload-types'

// Calendly booking section, rendered as a CTA-style block. Clicking the
// primary button performs a same-tab navigation to the configured Calendly
// URL — Calendly handles the booking UI on their domain, then redirects the
// visitor back to /lp/express-website/booked (configured in the Calendly
// event settings) where BookedTracker fires `booking_completed` for analytics.
//
// Why same-tab and not target=_blank: the redirect-back flow only works if
// Calendly controls the navigation, which means the booking must happen in
// the original tab. New-tab navigation breaks the conversion-tracking loop.
//
// Why CTA instead of inline iframe: removes ~250KB of Calendly JS weight per
// page, and the CTA pattern lets us track a `booking_click` event before
// navigating away (Smart Bidding signal even when the visitor abandons before
// completing booking).
//
// Warm Mono markup: the CTA lives inside a `.calendly-shell` that mirrors the
// redesign's inline-scheduler frame, with a `.calendly-placeholder` (centered
// `.cal-ic` Calendar glyph + headline + copy + brass CTA) standing in for the
// scheduler surface.

export function CalendlyBooking(b: CalendlyBookingBlock) {
  const url = b.calendlyUrl
  const buttonLabel = b.popupButtonLabel ?? 'Book a 30-min discovery call'
  const hasBg = !!b.backgroundImageUrl

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    pushEventThenNavigate(
      'booking_click',
      url,
      {
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        location: 'calendly_cta_link',
      },
      e,
    )
  }

  return (
    <section className="section relative isolate overflow-hidden scroll-mt-24" id="book">
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

      <Container size="md">
        {b.eyebrow || b.headline || b.description ? (
          <div className="section-head center">
            {b.eyebrow ? (
              <span className="eyebrow eyebrow-row">
                <span className="rule" />
                {b.eyebrow}
              </span>
            ) : null}
            {b.headline ? <h2>{b.headline}</h2> : null}
            {b.description ? <p className="lede">{b.description}</p> : null}
          </div>
        ) : null}

        <div className="calendly-shell">
          <div className="calendly-placeholder">
            <div>
              <div className="cal-ic">
                <Calendar />
              </div>
              <div className="mt-2 flex flex-col gap-3 justify-center items-center">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <Link
                    href={url}
                    onClick={handleClick}
                    className="btn btn-brass btn-md"
                  >
                    {/* Strip a trailing arrow if the editor put one in the label so
                        we never end up with two arrows side-by-side. */}
                    {buttonLabel.replace(/\s*[→➝➜⇒]\s*$/, '')}
                    <span aria-hidden>→</span>
                  </Link>
                  {/* Optional secondary "Email us instead" CTA — useful on pages
                      without a visible contact form (e.g. the homepage Calendly
                      section). Hardcoded to hello@blackhartconsulting.com which
                      matches SiteSettings.contactEmail. */}
                  {b.showEmailFallback ? (
                    <a
                      href={mailtoHref('hello@blackhartconsulting.com') ?? '#'}
                      onClick={() => pushEvent('email_click', {
                        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
                        location: 'calendly_email_fallback',
                      })}
                      className="btn btn-outline btn-md"
                    >
                      {b.emailLabel ?? 'Email us instead'}
                    </a>
                  ) : null}
                </div>
                <span className="placeholder-note">
                  Opens Calendly in this tab. You&apos;ll come back here when you&apos;re done.
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
