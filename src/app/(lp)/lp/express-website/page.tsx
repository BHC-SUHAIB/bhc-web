import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Clock, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Container } from '@/components/Container'
import { TrackedLink } from '@/components/TrackedLink'
import { LpForm } from './LpForm'

export const metadata: Metadata = {
  title: 'Custom website in 5 days — $1,495 + managed hosting | Black Hart Consulting',
  description:
    'A custom-designed business website in 5 days for $1,495, plus $295/mo to host, monitor, and improve it. No hourly bills, no surprise invoices. Houston-based, US-wide.',
  // LP-only: paid traffic destination, kept out of organic index.
  robots: { index: false, follow: true },
}

// Phone display — stays in sync with siteSettings.contactPhone but hardcoded
// here so the LP doesn't take a Payload dependency. If the number changes,
// update both this file and the Payload SiteSettings global.
const PHONE_DISPLAY = '(866) 434-9777'
const PHONE_HREF = 'tel:+18664349777'
const EMAIL_DISPLAY = 'hello@blackhartconsulting.com'
const EMAIL_HREF = 'mailto:hello@blackhartconsulting.com'

// Live Calendly booking page. Confirmation redirects to
// /lp/express-website/booked, which fires booking_completed.
const CALENDLY_URL = 'https://calendly.com/suhaib-blackhartconsulting/discovery-call'

const includedExpress = [
  'One conversion-focused page, fully custom-styled to your brand',
  'Mobile-first, ships under 200KB of JavaScript',
  'Contact form + Google Analytics wired up',
  'Live in 5–7 business days from kickoff',
  'You own the code — no proprietary lock-in',
]

const includedCare = [
  'Managed hosting on enterprise-grade infrastructure',
  'SSL, CDN, and 24/7 uptime monitoring',
  'Daily encrypted backups',
  '2 hours per month for content edits + tweaks',
  'Monthly performance + uptime report',
]

const trustPillars = [
  {
    icon: Clock,
    title: '5-day delivery',
    body: 'Most agencies take 6–8 weeks. We use modern AI tooling, reviewed by senior engineers, to ship in days.',
  },
  {
    icon: ShieldCheck,
    title: 'Fixed price, locked in',
    body: 'No hourly bills, no scope creep. The number you see at signup is the number you pay at launch.',
  },
  {
    icon: Sparkles,
    title: 'Senior-reviewed work',
    body: 'A senior engineer signs off on every line of code, every word of copy, every design decision.',
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Tell us about your business',
    body: 'A 5-minute form or a 15-minute discovery call — whichever you prefer.',
  },
  {
    step: '2',
    title: 'Fixed-price proposal in 24 hours',
    body: 'You see the exact deliverable, exact price, and exact timeline before you commit a dollar.',
  },
  {
    step: '3',
    title: 'Build week',
    body: 'Design Monday, build Tuesday–Wednesday, your review Thursday, launch Friday.',
  },
  {
    step: '4',
    title: 'Care plan kicks in',
    body: 'We host, monitor, and maintain the site month over month. You focus on running your business.',
  },
]

const faqs = [
  {
    q: 'What if I need more than one page?',
    a: 'The Express bundle covers a single conversion-focused landing page. If you need a multi-page marketing site, we can scope a Starter Site ($4,500) or Marketing Site ($8,500) — same fixed-price model, longer build window.',
  },
  {
    q: 'Can I cancel the Care plan?',
    a: 'Yes — Care plans bill monthly with a 90-day initial term. After that, cancel anytime with 30 days notice. The site stays yours; we just hand over hosting.',
  },
  {
    q: 'Do you write the copy?',
    a: 'Yes — we write a first draft from a 30-minute discovery conversation. You revise, we ship. If you already have copy, we use what you have.',
  },
  {
    q: 'Do I need to provide my own domain?',
    a: 'If you have one, we connect it. If not, we register one for you at cost (~$15/year, billed separately).',
  },
  {
    q: 'What happens after the 5-day build?',
    a: 'Care kicks in immediately. Hosting, monitoring, backups, SSL, and 2 hrs/month of edits are included for $295/mo. Most clients spend that monthly allowance on copy tweaks and seasonal updates.',
  },
  {
    q: 'Where are you based?',
    a: "Houston, TX. We work remotely with clients across the US — most of our day is spent in Slack, email, and brief video calls.",
  },
]

export default function ExpressWebsiteLp() {
  return (
    <>
      {/* Minimal LP header: logo only, no nav. Single phone CTA on desktop. */}
      <header className="border-b border-[var(--color-border)]">
        <Container size="xl" className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Black Hart Consulting home">
            <Logo variant="primary" height={32} className="text-[var(--color-fg)]" />
            <span className="font-serif text-[16px] font-semibold tracking-[-0.015em]">
              Black Hart Consulting
            </span>
          </Link>
          <TrackedLink
            href={PHONE_HREF}
            trackEvent="phone_click"
            trackLocation="lp_header"
            className="hidden sm:inline-flex items-center gap-2 font-mono text-[13px] tracking-[0.02em] text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors"
          >
            {PHONE_DISPLAY}
          </TrackedLink>
        </Container>
      </header>

      {/* HERO — match-headline + price anchor. The price in the headline
          itself is the single most important conversion lever on this page. */}
      <section className="py-16 sm:py-24 md:py-28 border-b border-[var(--color-border)]">
        <Container size="xl">
          <div className="max-w-4xl">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-brass)] mb-5">
              Express website + Care plan
            </p>
            <h1 className="font-serif font-semibold text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.02] tracking-[-0.03em]">
              A custom website in 5 days. <span className="text-[var(--color-brass)]">$1,495.</span>
            </h1>
            <p className="mt-6 text-[clamp(1.1rem,1.5vw,1.35rem)] leading-[1.5] text-[var(--color-fg-muted)] max-w-3xl">
              Plus <strong className="text-[var(--color-fg)] font-semibold">$295/mo</strong> to host, monitor,
              and keep it improving. No hourly bills. No surprise invoices. No agency markup.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <TrackedLink
                href={CALENDLY_URL}
                trackEvent="booking_click"
                trackLocation="lp_hero"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-[56px] px-7 text-[16px] font-medium rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)] transition-colors active:translate-y-[1px]"
              >
                Book a 15-min call
              </TrackedLink>
              <a
                href="#lp-form"
                className="inline-flex items-center justify-center gap-2 h-[56px] px-7 text-[16px] font-medium rounded-full bg-transparent text-[var(--color-fg)] border border-[var(--color-border-strong)] hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] transition-colors active:translate-y-[1px]"
              >
                Get a quote in 24 hrs
              </a>
            </div>

            {/* Trust strip directly under CTAs — every paid-traffic visitor
                sees these three signals before any scroll. */}
            <ul className="mt-12 grid gap-6 sm:grid-cols-3 text-[14px]">
              <li className="flex items-start gap-3">
                <Check className="size-5 mt-0.5 text-[var(--color-brass)] shrink-0" aria-hidden />
                <span><strong className="font-semibold text-[var(--color-fg)]">5-day delivery</strong> from kickoff.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="size-5 mt-0.5 text-[var(--color-brass)] shrink-0" aria-hidden />
                <span><strong className="font-semibold text-[var(--color-fg)]">Fixed price.</strong> No hourly bills, ever.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="size-5 mt-0.5 text-[var(--color-brass)] shrink-0" aria-hidden />
                <span><strong className="font-semibold text-[var(--color-fg)]">Senior-reviewed.</strong> Every line of code.</span>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {/* WHAT'S INCLUDED — two columns, transparent line items. */}
      <section className="py-16 sm:py-20">
        <Container size="xl">
          <div className="max-w-2xl mb-12">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
              What you get
            </p>
            <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
              The website on day 5. A partner from then on.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-brass)] mb-3">
                Express build · $1,495 one-time
              </p>
              <h3 className="font-serif font-semibold text-[24px] mb-5">Custom website, live in 5 days</h3>
              <ul className="space-y-3 text-[14px]">
                {includedExpress.map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] p-7">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-brass)] mb-3">
                Care plan · $295/mo
              </p>
              <h3 className="font-serif font-semibold text-[24px] mb-5">Hosting + ongoing care</h3>
              <ul className="space-y-3 text-[14px]">
                {includedCare.map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* WHY US — three trust pillars with icons. */}
      <section className="py-16 sm:py-20 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <Container size="xl">
          <div className="max-w-2xl mb-12">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
              Why this works
            </p>
            <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
              Modern tooling, senior accountability.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {trustPillars.map((p) => (
              <div key={p.title} className="rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)] p-6">
                <p.icon className="size-6 text-[var(--color-brass)] mb-4" aria-hidden />
                <h3 className="font-serif font-semibold text-[20px] mb-2">{p.title}</h3>
                <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS — four-step process, visible timeline. */}
      <section className="py-16 sm:py-20">
        <Container size="xl">
          <div className="max-w-2xl mb-12">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
              How it works
            </p>
            <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
              From inquiry to launch in seven days.
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((s) => (
              <li key={s.step} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
                <span className="inline-flex items-center justify-center size-9 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] font-serif font-semibold text-[16px] mb-4">
                  {s.step}
                </span>
                <h3 className="font-serif font-semibold text-[20px] mb-2">{s.title}</h3>
                <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* PRICING SUMMARY — single, transparent breakdown. */}
      <section className="py-16 sm:py-20 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <Container size="md">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-brass)] bg-[var(--color-bg)] p-8 sm:p-10">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-brass)] mb-3 text-center">
              The whole bundle
            </p>
            <h2 className="font-serif font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em] text-center">
              One website. One care plan. One bill.
            </h2>
            <div className="mt-8 grid gap-3 max-w-md mx-auto">
              <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-3">
                <span className="text-[15px]">Express website build</span>
                <span className="font-serif text-[20px] font-semibold">$1,495</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-3">
                <span className="text-[15px]">Care plan (hosting + 2 hrs/mo)</span>
                <span className="font-serif text-[20px] font-semibold">$295<span className="text-[14px] font-normal text-[var(--color-fg-muted)]">/mo</span></span>
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-[15px] font-semibold">First-year all-in</span>
                <span className="font-serif text-[24px] font-semibold text-[var(--color-brass)]">$5,035</span>
              </div>
            </div>
            <p className="mt-6 text-[12.5px] text-[var(--color-fg-muted)] text-center max-w-md mx-auto">
              50% deposit ($747.50) due at signup. Balance on launch. Care plan starts on launch day,
              billed monthly, cancel after 90 days with 30 days notice.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="#lp-form"
                className="inline-flex items-center justify-center gap-2 h-[52px] px-7 text-[15.5px] font-medium rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)] transition-colors active:translate-y-[1px]"
              >
                Get a fixed-price proposal
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* FORM — primary capture point on the page. */}
      <section id="lp-form" className="py-16 sm:py-20 scroll-mt-20">
        <Container size="md">
          <div className="grid gap-10 md:grid-cols-2 items-start">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
                Tell us about your project
              </p>
              <h2 className="font-serif font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em]">
                Three fields. One business day. A real proposal.
              </h2>
              <p className="mt-5 text-[15px] leading-[1.6] text-[var(--color-fg-muted)]">
                We&apos;ll reply within one business day with a fixed-price proposal. No call required —
                though if you&apos;d rather talk it through, our calendar is{' '}
                <TrackedLink
                  href={CALENDLY_URL}
                  trackEvent="booking_click"
                  trackLocation="lp_form_intro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)] transition-colors"
                >
                  open here
                </TrackedLink>
                .
              </p>
              <ul className="mt-8 space-y-3 text-[14px]">
                <li className="flex gap-3 items-start">
                  <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" aria-hidden />
                  <span>Reply within one business day</span>
                </li>
                <li className="flex gap-3 items-start">
                  <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" aria-hidden />
                  <span>Fixed-price proposal — no hourly billing</span>
                </li>
                <li className="flex gap-3 items-start">
                  <Check className="size-4 mt-[3px] text-[var(--color-brass)] shrink-0" aria-hidden />
                  <span>No commitment until you sign</span>
                </li>
              </ul>
            </div>
            <LpForm />
          </div>
        </Container>
      </section>

      {/* FAQ — addresses the most common pre-purchase questions. */}
      <section className="py-16 sm:py-20 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <Container size="md">
          <div className="max-w-2xl mb-10">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
              Common questions
            </p>
            <h2 className="font-serif font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em]">
              Before you write us.
            </h2>
          </div>
          <ul className="grid gap-4">
            {faqs.map((f) => (
              <li
                key={f.q}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-6"
              >
                <h3 className="font-serif font-semibold text-[18px] mb-2">{f.q}</h3>
                <p className="text-[14.5px] leading-[1.6] text-[var(--color-fg-muted)]">{f.a}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* FINAL CTA — last chance for visitors who scrolled past the form. */}
      <section className="py-16 sm:py-20 border-t border-[var(--color-border)]">
        <Container size="md" className="text-center">
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.1] tracking-[-0.02em]">
            Ready to launch a website that actually represents your business?
          </h2>
          <p className="mt-5 text-[16px] leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            Five days to a custom site. Fixed price, fully transparent.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <TrackedLink
              href={CALENDLY_URL}
              trackEvent="booking_click"
              trackLocation="lp_final_cta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-[52px] px-7 text-[15.5px] font-medium rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)] transition-colors active:translate-y-[1px]"
            >
              Book a 15-min call
            </TrackedLink>
            <a
              href="#lp-form"
              className="inline-flex items-center justify-center gap-2 h-[52px] px-7 text-[15.5px] font-medium rounded-full bg-transparent text-[var(--color-fg)] border border-[var(--color-border-strong)] hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] transition-colors active:translate-y-[1px]"
            >
              Or send a message
            </a>
          </div>
        </Container>
      </section>

      {/* Minimal LP footer — single legal/contact row. No nav columns. */}
      <footer className="border-t border-[var(--color-border)] py-8 text-[13px] text-[var(--color-fg-muted)]">
        <Container size="xl" className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Black Hart Consulting LLC · Houston, TX</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <TrackedLink
              href={EMAIL_HREF}
              trackEvent="email_click"
              trackLocation="lp_footer"
              className="hover:text-[var(--color-brass)] transition-colors"
            >
              {EMAIL_DISPLAY}
            </TrackedLink>
            <TrackedLink
              href={PHONE_HREF}
              trackEvent="phone_click"
              trackLocation="lp_footer"
              className="font-mono tracking-[0.02em] hover:text-[var(--color-brass)] transition-colors"
            >
              {PHONE_DISPLAY}
            </TrackedLink>
            <Link href="/privacy" className="hover:text-[var(--color-brass)] transition-colors">
              Privacy
            </Link>
          </div>
        </Container>
      </footer>
    </>
  )
}
