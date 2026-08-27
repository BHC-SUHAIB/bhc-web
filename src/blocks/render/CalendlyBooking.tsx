'use client'

import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { Container } from '@/components/Container'
import { pushEvent, pushEventThenNavigate } from '@/lib/analytics'
import { mailtoHref } from '@/lib/contact'
import type { CalendlyBookingBlock } from '@/payload-types'

// Compact "Book a 30-min discovery call" band (2026-06 revision).
//
// Replaces the oversized empty scheduler shell with a single tidy card: icon +
// copy on the left, the brass booking CTA on the right (stacks on mobile).
// Clicking navigates same-tab to Calendly so the redirect-back conversion loop
// (/lp/.../booked → booking_completed) still works; we fire booking_click first.
export function CalendlyBooking(b: CalendlyBookingBlock) {
  const url = b.calendlyUrl
  const buttonLabel = (b.popupButtonLabel ?? 'Book a 30-min discovery call').replace(/\s*[→➝➜⇒]\s*$/, '')

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    pushEventThenNavigate(
      'booking_click',
      url,
      { source_page: typeof window !== 'undefined' ? window.location.pathname : '', location: 'calendly_cta_link' },
      e,
    )
  }

  return (
    <section className="section-tight scroll-mt-[73px]" id="book">
      <Container size="lg">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 sm:px-9 sm:py-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden sm:grid place-items-center size-12 rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--color-accent)] shrink-0">
              <Calendar className="size-6" aria-hidden />
            </div>
            <div>
              {b.eyebrow ? <span className="eyebrow">{b.eyebrow}</span> : null}
              <h2 className="font-serif font-semibold text-[clamp(1.3rem,2.2vw,1.75rem)] leading-[1.15] tracking-[-0.015em] mt-1">
                {b.headline ?? 'Rather talk it through? Book 30 minutes.'}
              </h2>
              {b.description ? (
                <p className="mt-1.5 text-[14px] leading-[1.5] text-[var(--color-fg-muted)] max-w-prose">{b.description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex flex-wrap gap-3">
              <Link href={url} onClick={handleClick} className="btn btn-brass btn-md">
                {buttonLabel}
                <span aria-hidden>→</span>
              </Link>
              {b.showEmailFallback ? (
                <a
                  href={mailtoHref('hello@blackhartconsulting.com') ?? '#'}
                  onClick={() =>
                    pushEvent('email_click', {
                      source_page: typeof window !== 'undefined' ? window.location.pathname : '',
                      location: 'calendly_email_fallback',
                    })
                  }
                  className="btn btn-outline btn-md"
                >
                  {b.emailLabel ?? 'Email us instead'}
                </a>
              ) : null}
            </div>
            <span className="placeholder-note text-[11px]">Opens Calendly in this tab — you&apos;ll come right back.</span>
          </div>
        </div>
      </Container>
    </section>
  )
}
