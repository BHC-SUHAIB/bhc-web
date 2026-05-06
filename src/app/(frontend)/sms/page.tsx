import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { SmsConsentForm } from './SmsConsentForm'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import { phoneHref, mailtoHref } from '@/lib/contact'
import { canonical } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SMS consent',
  description:
    'Opt in to receive customer-care text messages from Black Hart Consulting — replies to your contact-form inquiry and confirmations of consulting calls you request.',
  robots: { index: true, follow: true },
  ...canonical('/sms'),
}

export default async function SmsConsentPage() {
  const siteSettings = await getCachedSiteSettings()
  const email = siteSettings?.contactEmail ?? 'hello@blackhartconsulting.com'
  const phone = siteSettings?.contactPhone ?? '(866) 434-9777'
  const phoneHrefVal = phoneHref(phone)
  const emailHrefVal = mailtoHref(email)

  return (
    <div className="pb-20">
      <Container size="md" className="py-20 sm:py-28">
        <div className="max-w-2xl mb-12">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
            SMS consent
          </p>
          <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] tracking-[-0.03em]">
            Opt in to text messages.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
            We send a small number of one-to-one texts tied to your active
            inquiry — replies to your contact-form submission and confirmations
            of consulting calls you request. No marketing, no promotions, no
            shared lists. You can opt out any time by replying STOP.
          </p>
        </div>

        <SmsConsentForm />

        <div className="mt-16 pt-10 border-t border-[var(--color-border)] grid gap-8 sm:grid-cols-2 text-[14px] leading-[1.6] text-[var(--color-fg-muted)]">
          <div>
            <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg)] mb-3">
              What you&rsquo;ll receive
            </h2>
            <ul className="space-y-1.5">
              <li>&middot; One-to-one replies to your contact-form inquiry</li>
              <li>&middot; Confirmations of consulting calls you request</li>
              <li>&middot; No marketing, promotional, or bulk messages</li>
            </ul>
            <p className="mt-3">Up to 10 messages per month. Message &amp; data rates may apply.</p>
          </div>

          <div>
            <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg)] mb-3">
              How to opt out
            </h2>
            <ul className="space-y-1.5">
              <li>Reply <span className="font-mono text-[var(--color-fg)]">STOP</span> to any message &mdash; you&rsquo;ll be removed within minutes.</li>
              <li>Reply <span className="font-mono text-[var(--color-fg)]">HELP</span> for help.</li>
              <li>
                Or email us at{' '}
                {emailHrefVal ? (
                  <a href={emailHrefVal} className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)]">
                    {email}
                  </a>
                ) : email}
                {' '}or call{' '}
                {phoneHrefVal ? (
                  <a href={phoneHrefVal} className="font-mono tracking-[0.02em] underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)]">
                    {phone}
                  </a>
                ) : phone}.
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 text-[13px] text-[var(--color-fg-muted)]">
          By opting in you agree to our{' '}
          <Link href="/sms-terms" className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)]">
            SMS Terms
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)]">
            Privacy Policy
          </Link>
          . Consent is not a condition of purchase.
        </p>
      </Container>
    </div>
  )
}
