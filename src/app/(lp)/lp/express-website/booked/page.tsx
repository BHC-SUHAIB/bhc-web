import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, Mail, MessageSquare } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Container } from '@/components/Container'
import { TrackedLink } from '@/components/TrackedLink'
import { BookedTracker } from './BookedTracker'

export const metadata: Metadata = {
  title: "You're booked — see you on the call | Black Hart Consulting",
  description:
    'Your discovery call is on the calendar. Here\'s what to expect, and how to reach us before the call if you need to.',
  // Thank-you pages should never be indexed — they should only ever be
  // reached via Calendly redirect, never via organic search.
  robots: { index: false, follow: false },
}

const PHONE_DISPLAY = '(866) 434-9777'
const PHONE_HREF = 'tel:+18664349777'
const EMAIL_DISPLAY = 'hello@blackhartconsulting.com'
const EMAIL_HREF = 'mailto:hello@blackhartconsulting.com'

export default function BookedPage() {
  return (
    <>
      <BookedTracker />

      <header className="border-b border-[var(--color-border)]">
        <Container size="xl" className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Black Hart Consulting home">
            <Logo variant="primary" height={32} className="text-[var(--color-fg)]" />
            <span className="font-serif text-[16px] font-semibold tracking-[-0.015em]">
              Black Hart Consulting
            </span>
          </Link>
        </Container>
      </header>

      <section className="py-20 sm:py-28">
        <Container size="md" className="text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-[color-mix(in_srgb,var(--color-brass)_18%,var(--color-bg))] mb-8">
            <Calendar className="size-8 text-[var(--color-brass)]" aria-hidden />
          </div>

          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-brass)] mb-4">
            You&apos;re on the calendar
          </p>
          <h1 className="font-serif font-semibold text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-[-0.025em]">
            See you on the call.
          </h1>
          <p className="mt-6 text-[clamp(1rem,1.3vw,1.15rem)] leading-[1.6] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            We&apos;ll send a calendar invite with the video link to your inbox in the next minute.
            Add it to your calendar so you don&apos;t miss it.
          </p>
        </Container>
      </section>

      <section className="pb-16 sm:pb-20">
        <Container size="md">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9">
            <h2 className="font-serif font-semibold text-[24px] leading-[1.2] tracking-[-0.015em] mb-5">
              What to expect on the call
            </h2>
            <ul className="space-y-4 text-[15px] leading-[1.55]">
              <li className="flex gap-4 items-start">
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] font-mono text-[12px] font-semibold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong className="font-semibold text-[var(--color-fg)]">5 minutes</strong> — what your business does and who you&apos;re trying to reach.
                </span>
              </li>
              <li className="flex gap-4 items-start">
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] font-mono text-[12px] font-semibold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong className="font-semibold text-[var(--color-fg)]">5 minutes</strong> — what you have today (existing site, brand, copy) and what&apos;s missing.
                </span>
              </li>
              <li className="flex gap-4 items-start">
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] font-mono text-[12px] font-semibold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong className="font-semibold text-[var(--color-fg)]">5 minutes</strong> — rough timeline + budget so we can scope a fixed-price proposal.
                </span>
              </li>
            </ul>
            <p className="mt-6 text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">
              If we&apos;re a fit, you&apos;ll have a written proposal in your inbox within one business day after the call.
              If we&apos;re not, we&apos;ll tell you on the call and point you to someone who is — no pressure, no hard sell.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-20 sm:pb-28">
        <Container size="md">
          <h2 className="font-serif font-semibold text-[20px] mb-5 text-center">
            Need to reach us before the call?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TrackedLink
              href={EMAIL_HREF}
              trackEvent="email_click"
              trackLocation="booked_thanks"
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 flex items-center gap-3 hover:border-[var(--color-brass)] transition-colors"
            >
              <Mail className="size-5 text-[var(--color-brass)] shrink-0" aria-hidden />
              <span>
                <span className="block text-[12px] font-mono tracking-[0.12em] uppercase text-[var(--color-fg-muted)]">
                  Email
                </span>
                <span className="block text-[14px]">{EMAIL_DISPLAY}</span>
              </span>
            </TrackedLink>
            <TrackedLink
              href={PHONE_HREF}
              trackEvent="phone_click"
              trackLocation="booked_thanks"
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 flex items-center gap-3 hover:border-[var(--color-brass)] transition-colors"
            >
              <MessageSquare className="size-5 text-[var(--color-brass)] shrink-0" aria-hidden />
              <span>
                <span className="block text-[12px] font-mono tracking-[0.12em] uppercase text-[var(--color-fg-muted)]">
                  Phone
                </span>
                <span className="block text-[14px] font-mono tracking-[0.02em]">{PHONE_DISPLAY}</span>
              </span>
            </TrackedLink>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 text-[14px] text-[var(--color-fg-muted)] hover:text-[var(--color-brass)] transition-colors"
            >
              While you wait, see some of our recent work →
            </Link>
          </div>
        </Container>
      </section>

      <footer className="border-t border-[var(--color-border)] py-8 text-[13px] text-[var(--color-fg-muted)]">
        <Container size="xl" className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Black Hart Consulting LLC · Houston, TX</span>
          <Link href="/privacy" className="hover:text-[var(--color-brass)] transition-colors">
            Privacy
          </Link>
        </Container>
      </footer>
    </>
  )
}
