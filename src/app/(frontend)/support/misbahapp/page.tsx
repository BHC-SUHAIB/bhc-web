import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import { mailtoHref } from '@/lib/contact'

export const dynamic = 'force-dynamic'

// Support page for the Misbah iOS app (a Black Hart Consulting product). This
// is the URL given to App Store Connect as the Support URL, so it must stay
// publicly reachable, but it is intentionally kept OUT of search engines:
// `robots: noindex` below, a `Disallow: /support/misbahapp` in
// src/app/robots.ts, deliberate ABSENCE from src/app/sitemap.ts, and it is not
// linked from any nav/footer. Mirrors /privacy/misbahapp.
export const metadata: Metadata = {
  title: 'Misbah Support',
  description: 'Get help with the Misbah app.',
  robots: { index: false, follow: false },
}

export default async function MisbahSupportPage() {
  const siteSettings = await getCachedSiteSettings()
  const email = siteSettings?.contactEmail ?? 'hello@blackhartconsulting.com'
  const emailHrefVal = mailtoHref(email)

  return (
    <div className="pb-20">
      <Container size="md" className="py-20 sm:py-28">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
          Misbah · Support
        </p>
        <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] tracking-[-0.03em]">
          Misbah Support
        </h1>
        <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
          Misbah is a privacy-first Muslim companion: accurate prayer times,
          Qibla, the full Quran offline, duas, tasbih, and a prayer and Qada
          tracker. No ads, no account, and nothing leaves your device.
        </p>

        <div className="prose mt-12 text-[16px] leading-[1.7]">
          <Section title="Get support">
            <p>
              Have a question, found a bug, or want to suggest a feature? Email{' '}
              {emailHrefVal ? <a href={emailHrefVal} className={linkCls}>{email}</a> : email}{' '}
              and we will get back to you. Including your iPhone model and iOS
              version helps us help you faster.
            </p>
          </Section>

          <Section title="How do I restore my Misbah Plus purchase?">
            <p>
              Open the paywall from the More tab, then tap{' '}
              <strong>Unlock Misbah Plus</strong>, and tap{' '}
              <strong>Restore purchases</strong>. As long as you are signed in
              with the same Apple ID you bought it on, your Plus features come
              right back. Restoring is free and does not charge you again.
            </p>
          </Section>

          <Section title="My adhan or notifications stopped. What do I check?">
            <ul>
              <li>
                Make sure notifications are allowed for Misbah in iOS Settings,
                under Notifications, then Misbah.
              </li>
              <li>
                Open the app once so it can rebuild its reminder schedule. iOS
                limits how many notifications an app can queue, so Misbah
                refreshes them whenever you open it.
              </li>
              <li>
                Check that your prayer-time reminders and adhan sound are still
                turned on in the app under Settings.
              </li>
              <li>
                Confirm Focus or Do Not Disturb is not silencing them, and that
                your ringer is not muted if you expect a sound.
              </li>
            </ul>
          </Section>

          <Section title="How do I change the calculation method or Asr (Hanafi or Shafi'i)?">
            <p>
              Go to <strong>Settings</strong>, then{' '}
              <strong>Calculation</strong>. There you can pick your prayer-time
              calculation method and choose the Asr juristic method (Hanafi or
              Shafi&rsquo;i). Prayer times update right away.
            </p>
          </Section>

          <Section title="Privacy">
            <p>
              Misbah keeps your data on your device. Read the full{' '}
              <a href="/privacy/misbahapp" className={linkCls}>privacy policy</a>.
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
