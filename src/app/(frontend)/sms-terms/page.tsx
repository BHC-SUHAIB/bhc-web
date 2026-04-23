import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import { phoneHref, mailtoHref } from '@/lib/contact'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SMS Terms and Conditions',
  description:
    'Terms governing Black Hart Consulting customer-care SMS program — sender, purpose, frequency, fees, opt-out, and supported carriers.',
  robots: { index: true, follow: true },
}

const LAST_UPDATED = 'April 23, 2026'

export default async function SmsTermsPage() {
  const siteSettings = await getCachedSiteSettings()
  const email = siteSettings?.contactEmail ?? 'hello@blackhartconsulting.com'
  const phone = siteSettings?.contactPhone ?? '(866) 434-9777'
  const phoneHrefVal = phoneHref(phone)
  const emailHrefVal = mailtoHref(email)

  return (
    <div className="pb-20">
      <Container size="md" className="py-20 sm:py-28">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
          Legal
        </p>
        <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] tracking-[-0.03em]">
          SMS Terms and Conditions
        </h1>
        <p className="mt-6 font-mono text-[12px] tracking-[0.1em] text-[var(--color-fg-muted)]">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
          These terms govern the Black Hart Consulting SMS program. By opting
          in on our website or contact form, you agree to receive the
          customer-care text messages described below.
        </p>

        <div className="prose mt-12 text-[16px] leading-[1.7]">
          <Section title="Program sender">
            <p>
              Text messages are sent by Black Hart Consulting LLC, a
              Texas-registered consulting firm (the &ldquo;Program&rdquo;).
              Messages originate from our registered toll-free number and are
              delivered through our carrier, Quo (OpenPhone).
            </p>
          </Section>

          <Section title="Program purpose and message content">
            <p>
              This is a <strong>customer-care-only</strong> program. Every
              message is a one-to-one, manually sent reply tied to an active
              inquiry you initiated. You will receive only:
            </p>
            <ul>
              <li>Replies to questions you submitted through our contact form at <Link href="/" className={linkCls}>blackhartconsulting.com</Link>.</li>
              <li>Confirmations and scheduling follow-ups for consulting calls you requested.</li>
            </ul>
            <p>
              We do <strong>not</strong> send marketing, promotional, sales,
              advertising, or bulk messages through this program. We do not
              enroll you in any automated campaigns.
            </p>
          </Section>

          <Section title="How to opt in">
            <p>
              Opt-in requires your affirmative action on one of the following:
            </p>
            <ul>
              <li>The SMS opt-in form at <Link href="/sms" className={linkCls}>blackhartconsulting.com/sms</Link>, where you enter your name and phone number and check the consent box.</li>
              <li>The SMS checkbox on our contact form at <Link href="/contact" className={linkCls}>blackhartconsulting.com/contact</Link>, which is not pre-selected and is independent of the form submission itself.</li>
            </ul>
            <p>
              We log the disclaimer text you agreed to, your IP address,
              user-agent, and timestamp as proof of consent. Consent is not a
              condition of purchase or of any other service we provide.
            </p>
          </Section>

          <Section title="Message frequency">
            <p>
              Up to 10 messages per month. Actual volume is typically lower
              because each message is a one-to-one reply to an active
              inquiry.
            </p>
          </Section>

          <Section title="Fees and carrier charges">
            <p>
              Black Hart Consulting does not charge you for SMS. However,
              message and data rates may apply depending on your wireless
              plan. Contact your mobile carrier for plan details.
            </p>
          </Section>

          <Section title="How to opt out">
            <ul>
              <li>Reply <span className="font-mono">STOP</span> to any message. You will be removed from the Program within minutes and will receive one final confirmation message.</li>
              <li>Reply <span className="font-mono">HELP</span> for help, or to receive our contact information.</li>
              <li>
                You can also opt out by emailing{' '}
                {emailHrefVal ? <a href={emailHrefVal} className={linkCls}>{email}</a> : email}
                {' '}or calling{' '}
                {phoneHrefVal ? <a href={phoneHrefVal} className={cn(linkCls, 'font-mono tracking-[0.02em]')}>{phone}</a> : phone}.
              </li>
            </ul>
            <p>
              After opting out you will not receive further Program messages
              unless you opt in again.
            </p>
          </Section>

          <Section title="Supported carriers">
            <p>
              The Program is supported by all major U.S. wireless carriers,
              including AT&amp;T, T-Mobile, Verizon Wireless, Sprint, Boost,
              U.S. Cellular, MetroPCS, Cricket, and Virgin Mobile. Carriers
              are not liable for delayed or undelivered messages.
            </p>
          </Section>

          <Section title="Eligibility">
            <p>
              You must be at least 18 years old and the authorized subscriber
              or user of the phone number you provide. By opting in you
              confirm that the number belongs to you.
            </p>
          </Section>

          <Section title="Privacy">
            <p>
              Information we collect to run the Program is described in our{' '}
              <Link href="/privacy" className={linkCls}>Privacy Policy</Link>.
              We do not sell or share your phone number with third parties
              for marketing.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              If we materially change these terms, we will update the
              &ldquo;Last updated&rdquo; date above. If the change affects
              the Program&rsquo;s purpose or frequency, we will notify opted-in
              users before the change takes effect.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about the Program? Email{' '}
              {emailHrefVal ? <a href={emailHrefVal} className={linkCls}>{email}</a> : email}
              {' '}or call{' '}
              {phoneHrefVal ? <a href={phoneHrefVal} className={cn(linkCls, 'font-mono tracking-[0.02em]')}>{phone}</a> : phone}.
            </p>
          </Section>
        </div>
      </Container>

      <style>{`
        .prose > * + * { margin-top: 1.25em; }
        .prose h2 { font-family: var(--font-serif); font-weight: 600; font-size: 1.45em; line-height: 1.25; letter-spacing: -0.015em; margin: 2em 0 0.5em; }
        .prose p { margin: 0 0 0.75em; }
        .prose ul { margin: 0 0 1em; padding-left: 1.3em; }
        .prose li { margin: 0.3em 0; }
        .prose li::marker { color: var(--color-fg-muted); }
        .prose strong { color: var(--color-fg); font-weight: 600; }
      `}</style>
    </div>
  )
}

const linkCls = 'underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)]'

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
