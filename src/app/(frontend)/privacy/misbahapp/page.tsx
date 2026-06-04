import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import { mailtoHref } from '@/lib/contact'

export const dynamic = 'force-dynamic'

// Privacy policy for the Misbah iOS app (a Black Hart Consulting product). This
// is the URL given to App Store Connect, so it must stay publicly reachable —
// but it is intentionally kept OUT of search engines: `robots: noindex` below,
// a `Disallow: /privacy/misbahapp` in src/app/robots.ts, deliberate ABSENCE
// from src/app/sitemap.ts, and it is not linked from any nav/footer.
export const metadata: Metadata = {
  title: 'Misbah — Privacy Policy',
  description: 'How the Misbah app handles your information.',
  robots: { index: false, follow: false },
}

// If this policy materially changes, bump LAST_UPDATED and re-deploy.
const LAST_UPDATED = 'June 4, 2026'

export default async function MisbahPrivacyPolicyPage() {
  const siteSettings = await getCachedSiteSettings()
  const email = siteSettings?.contactEmail ?? 'hello@blackhartconsulting.com'
  const emailHrefVal = mailtoHref(email)

  return (
    <div className="pb-20">
      <Container size="md" className="py-20 sm:py-28">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
          Misbah · Legal
        </p>
        <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] tracking-[-0.03em]">
          Misbah Privacy Policy
        </h1>
        <p className="mt-6 font-mono text-[12px] tracking-[0.1em] text-[var(--color-fg-muted)]">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
          Misbah is a prayer-times, Qibla, and Quran companion app published by
          Black Hart Consulting LLC (&ldquo;Black Hart,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;). It was built privacy-first: no accounts, no ads, no
          analytics, no tracking, and nothing about you is sold or shared.
        </p>

        <div className="prose mt-12 text-[16px] leading-[1.7]">
          <Section title="The short version">
            <ul>
              <li>We do <strong>not</strong> collect, sell, or share your personal data.</li>
              <li>Misbah has <strong>no user accounts</strong> and <strong>no analytics or tracking</strong>.</li>
              <li>Your settings, location, bookmarks, and prayer data stay <strong>on your device</strong>.</li>
              <li>We run <strong>no servers</strong> that receive your data &mdash; there is no central database of users to leak.</li>
            </ul>
          </Section>

          <Section title="What stays on your device">
            <p>
              Everything Misbah remembers is stored locally on your iPhone and is
              never sent to us:
            </p>
            <ul>
              <li>Your preferences (calculation method, adhan, reminders, theme, language).</li>
              <li>Your location, if you grant it (see below).</li>
              <li>Quran &amp; dua bookmarks, your tasbih counts, qada (missed-prayer) records, and your &ldquo;continue reading&rdquo; position.</li>
              <li>Any Quran audio you download for offline listening.</li>
            </ul>
            <p>
              Deleting the app removes all of it. We keep no copy, because we never
              received one.
            </p>
          </Section>

          <Section title="Location">
            <p>
              Location is <strong>optional</strong> and is used only to calculate
              accurate prayer times and the Qibla direction for where you are.
            </p>
            <ul>
              <li>It is computed <strong>on your device</strong>. We do not collect, store, or transmit your location &mdash; we have no server to send it to.</li>
              <li>To turn a location into a city name (and to let you search for a city), Misbah uses Apple&rsquo;s location services on your device&rsquo;s behalf; that lookup is handled by Apple under Apple&rsquo;s privacy policy. You can also enter a city by hand instead.</li>
              <li>You can grant, limit, or revoke location access at any time in iOS Settings, under Privacy &amp; Security, Location Services.</li>
            </ul>
          </Section>

          <Section title="Connections the app makes">
            <p>Misbah is offline for its core features. The only network requests it makes are:</p>
            <ul>
              <li><strong>Quran recitation audio</strong> &mdash; streamed on demand from a third-party Quran audio host (everyayah.com) and then cached on your device. As with any web request, your device&rsquo;s IP address is visible to that host; no account, name, or identifying information is sent. That request is governed by the host&rsquo;s own policies.</li>
              <li><strong>Apple services</strong> &mdash; in-app purchases and TestFlight are handled by Apple, and prayer notifications are scheduled and shown locally by your device. Apple&rsquo;s privacy policy governs those.</li>
            </ul>
            <p>There are no analytics, advertising, or tracking SDKs in the app.</p>
          </Section>

          <Section title="What we do not do">
            <ul>
              <li>No user accounts or logins.</li>
              <li>No analytics, telemetry, or usage tracking.</li>
              <li>No advertising and no ad networks.</li>
              <li>No selling or sharing of your data with data brokers or anyone else.</li>
              <li>No profiling, and no using your data to train machine-learning models.</li>
            </ul>
          </Section>

          <Section title="Notifications">
            <p>
              Prayer-time and reminder notifications are scheduled and delivered
              <strong> locally by your device</strong>. There is no push server, so
              we never see whether or when you receive a reminder.
            </p>
          </Section>

          <Section title="Purchases">
            <p>
              Misbah Plus and optional tips are processed entirely by Apple through
              the App Store. We never see your payment details; Apple shares only
              aggregate, non-identifying sales information with us.
            </p>
          </Section>

          <Section title="Children's privacy">
            <p>
              Misbah is suitable for all ages and collects no personal information
              from anyone, including children under 13.
            </p>
          </Section>

          <Section title="Security">
            <p>
              Because your data stays on your device, it is protected by your
              device&rsquo;s own security (passcode and encryption). Since we hold no
              central store of user data, there is nothing on our side to breach.
            </p>
          </Section>

          <Section title="Your choices">
            <ul>
              <li>Grant, limit, or revoke <strong>location</strong> in iOS Settings.</li>
              <li>Turn <strong>notifications</strong> on or off in iOS Settings or in the app.</li>
              <li>Delete <strong>downloaded Quran audio</strong> from within the app (Settings, then Quran audio).</li>
              <li><strong>Delete the app</strong> to remove all locally stored data.</li>
            </ul>
            <p>
              Because we do not collect personal data, there is nothing for us to
              access, export, or delete on our end. California (CCPA) and EU/UK
              (GDPR) residents have the rights described in those laws; we honor
              them, though in practice we hold no personal data about you.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we make material changes, we&rsquo;ll update the &ldquo;Last
              updated&rdquo; date above.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy or the app? Email{' '}
              {emailHrefVal ? <a href={emailHrefVal} className={linkCls}>{email}</a> : email}.
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
