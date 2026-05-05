import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import { phoneHref, mailtoHref } from '@/lib/contact'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of Black Hart Consulting services and products.',
  robots: { index: true, follow: true },
}

// Update LAST_UPDATED whenever the terms materially change. The date is
// shown at the top of the page so visitors / clients can tell at a glance
// when the terms last changed.
// Bump this whenever the Terms materially change. Per the "Changes to these
// Terms" section, material changes also require 14 days' email notice to
// active clients before they take effect.
const LAST_UPDATED = 'May 5, 2026 (revised)'

export default async function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-6 font-mono text-[12px] tracking-[0.1em] text-[var(--color-fg-muted)]">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the website
          at blackhartconsulting.com and the design, development, hosting, SEO,
          and Care Plan services provided by Black Hart Consulting LLC
          (&ldquo;Black Hart,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By
          engaging us for paid work, signing a Statement of Work, or paying an
          invoice, you agree to these Terms. Plain language, no dark patterns.
        </p>

        <div className="prose mt-12 text-[16px] leading-[1.7]">
          <Section title="Who we are">
            <p>
              Black Hart Consulting LLC is a Texas-registered consulting firm
              providing website design, SEO, app development, and hosting
              services. You can reach us at{' '}
              {emailHrefVal ? (
                <a href={emailHrefVal} className={linkCls}>{email}</a>
              ) : email}
              {' '}or{' '}
              {phoneHrefVal ? (
                <a href={phoneHrefVal} className={cn(linkCls, 'font-mono tracking-[0.02em]')}>{phone}</a>
              ) : phone}.
            </p>
          </Section>

          <Section title="The work we do">
            <p>
              We deliver web design, SEO, app development, and ongoing care
              under one of three engagement types:
            </p>
            <ul>
              <li>
                <strong>One-time projects</strong> &mdash; fixed-price packages
                (e.g. Single Page, Heights Starter, Pro Site, Custom Build) or
                quick-win add-ons. Delivered against a Statement of Work or an
                accepted proposal.
              </li>
              <li>
                <strong>Care Plans</strong> &mdash; recurring monthly
                subscriptions (Care, Growth, Scale) for ongoing hosting,
                monitoring, and small-edit support.
              </li>
              <li>
                <strong>SEO retainers</strong> &mdash; recurring monthly
                engagements for ongoing search-engine optimization work.
              </li>
            </ul>
            <p>
              Each engagement&rsquo;s specific deliverables, timeline, and
              scope are described in the proposal, Statement of Work, or
              published service description you accept before payment.
            </p>
          </Section>

          <Section title="Payment terms">
            <p>
              All prices are in U.S. dollars unless otherwise stated.
              Payments are processed by Stripe; we don&rsquo;t see or store
              your card details. We accept card, ACH (U.S. bank), Klarna,
              Affirm, Cash App Pay, and Link.
            </p>
            <ul>
              <li>
                <strong>Single Page Site, SEO Sprints, and quick-win add-ons
                under $1,000</strong>: payable in full when invoiced. Work
                begins after payment is received.
              </li>
              <li>
                <strong>Heights Starter, Pro Site, and most other one-time
                projects $1,000&ndash;$5,000</strong>: 50% deposit when the
                Statement of Work is signed; remaining 50% due on launch.
                The second invoice is net-15.
              </li>
              <li>
                <strong>Custom Build and projects over $5,000</strong>: 50%
                deposit at signature, 25% on approved design milestone, 25%
                on launch. Optional installment plans available on request.
              </li>
              <li>
                <strong>Care Plans and SEO retainers</strong>: pre-pay
                monthly. The first charge runs the day you activate the
                subscription, with the same amount charged automatically
                every 30 days thereafter to your saved payment method.
              </li>
              <li>
                <strong>Late payment</strong>: invoices unpaid for 14 days
                past their due date may be referred to collections or paused
                for service.
              </li>
              <li>
                <strong>Refund policy</strong>: see the dedicated section
                below.
              </li>
            </ul>
            <p>
              These are defaults. Your specific Statement of Work or invoice
              may set different terms by mutual agreement.
            </p>
          </Section>

          <Section title="Project timelines and dependencies">
            <p>
              Project timelines committed in your Statement of Work assume
              timely client cooperation: prompt approvals, content delivery,
              access credentials (logos, brand assets, hosting/domain
              access, third-party platform logins), and design feedback
              within 5 business days of request.
            </p>
            <ul>
              <li>
                <strong>Delays on your side</strong> &mdash; if we&rsquo;re
                blocked waiting on you (content, approvals, credentials), the
                committed timeline pauses. We don&rsquo;t pro-rate or refund
                fees for client-caused delay, and the project may be
                rescheduled or paused if a client goes unresponsive for more
                than 14 days.
              </li>
              <li>
                <strong>Delays on our side</strong> &mdash; if we slip a
                deadline for any reason on our end, we&rsquo;ll keep you
                informed and reasonable about deadline impact. We
                don&rsquo;t apply penalty fees to ourselves, but we make
                every reasonable effort to recover the schedule and never
                let a delay become a billing issue for you.
              </li>
            </ul>
          </Section>

          <Section title="Recurring billing authorization">
            <p>
              When you subscribe to a Care Plan or SEO retainer, you authorize
              Black Hart Consulting LLC to charge the saved payment method on
              file for the monthly amount disclosed at signup, on a recurring
              basis, until you cancel. We will not change the amount or
              frequency without notifying you in advance. You can cancel at
              any time (see &ldquo;Cancellation&rdquo; below); cancellation
              stops future charges but does not refund the current period.
            </p>
          </Section>

          <Section title="Cancellation">
            <p>
              You can cancel a Care Plan or SEO retainer at any time:
            </p>
            <ul>
              <li>
                Through the Stripe Customer Portal link we provide in your
                signup email and on your post-payment thank-you page.
              </li>
              <li>
                By replying to any billing email, or emailing{' '}
                {emailHrefVal ? (
                  <a href={emailHrefVal} className={linkCls}>{email}</a>
                ) : email}.
              </li>
            </ul>
            <p>
              Cancellation takes effect at the end of the current billing
              period &mdash; you keep the service through what you&rsquo;ve
              already paid for, and no further charges run after that.
            </p>
          </Section>

          <Section title="Refunds">
            <p>
              Our refund policy depends on the engagement type:
            </p>
            <ul>
              <li>
                <strong>One-time projects</strong> &mdash; partial or full
                refunds are evaluated case-by-case based on what work has been
                delivered. If we&rsquo;ve delivered a Figma mockup but no
                code, you&rsquo;re typically entitled to a partial refund. If
                the site has launched and revisions are complete, refunds are
                generally not available.
              </li>
              <li>
                <strong>Care Plans and SEO retainers</strong> &mdash; we
                don&rsquo;t prorate or refund partial months. Cancellation
                stops the next billing cycle.
              </li>
              <li>
                <strong>Mistakes on our end</strong> &mdash; if we double-bill
                you, miss a deadline you depend on, or fail to deliver
                committed scope, we&rsquo;ll make it right. Reach out and
                we&rsquo;ll work it out.
              </li>
            </ul>
          </Section>

          <Section title="What you provide">
            <p>You agree to:</p>
            <ul>
              <li>
                Provide accurate billing information and keep your payment
                method current.
              </li>
              <li>
                Provide the content, brand assets, access credentials, and
                feedback we need to do the work, in a reasonable timeframe.
              </li>
              <li>
                Not use our services to host or transmit illegal content,
                spam, malware, or material infringing on third-party rights.
              </li>
              <li>
                Have the legal right to share any content, copy, images, or
                trademarks you provide to us.
              </li>
            </ul>
          </Section>

          <Section title="Ownership of work">
            <p>
              On full payment of the agreed fee, you own the source code,
              copy, and design assets we deliver, in their final form.
              We&rsquo;re happy to hand over the GitHub repo, design files,
              and any third-party account credentials we set up on your
              behalf.
            </p>
            <p>
              Some elements remain ours or third parties&rsquo;:
            </p>
            <ul>
              <li>
                Open-source frameworks, libraries, and components we use
                (Next.js, Payload, Tailwind, etc.) are licensed under their
                respective licenses.
              </li>
              <li>
                Our internal tooling, methodology, and reusable patterns
                remain ours. You don&rsquo;t get the right to resell our
                process, only the deliverables built with it.
              </li>
              <li>
                Stock photography licensed to your project transfers usage
                rights but not the underlying license &mdash; you can use the
                images for your business but can&rsquo;t resell them.
              </li>
            </ul>
          </Section>

          <Section title="Hosting and uptime">
            <p>
              Sites we host run on infrastructure operated by reputable
              providers (DigitalOcean for compute, Cloudflare for CDN, etc.).
              We target 99.5% uptime measured monthly, but don&rsquo;t
              guarantee it &mdash; outages caused by upstream providers,
              DNS issues, your domain registrar lapsing, or content you push
              that breaks the site are not our responsibility. We monitor
              uptime and will tell you about extended outages.
            </p>
            <p>
              We perform daily encrypted backups of databases and media on
              all hosted sites. Backups are retained for 30 days.
            </p>
          </Section>

          <Section title="Communication">
            <p>
              By providing your email when engaging us, you consent to
              receive transactional emails from us related to your account,
              invoices, and the work in progress &mdash; this includes
              project updates, invoice reminders, payment receipts,
              billing-related notifications, and service announcements. You
              cannot opt out of these while engaged with us.
            </p>
            <p>
              Optional marketing emails are separate and you can unsubscribe
              from those at any time.
            </p>
          </Section>

          <Section title="Confidentiality">
            <p>
              We treat anything you share with us during an engagement as
              confidential and don&rsquo;t share it with third parties
              without your permission, except where required by law.
            </p>
            <p>
              We may publish anonymized case studies of work we&rsquo;ve
              done. If we&rsquo;re going to credit you by name, logo, or
              specific result, we&rsquo;ll get your written permission first.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              Our services are provided &ldquo;as is&rdquo; without
              warranties of merchantability or fitness for a particular
              purpose, except as required by applicable law. Our total
              aggregate liability for any claim arising out of these Terms
              or our services is limited to the amount you paid us in the
              twelve (12) months preceding the claim.
            </p>
            <p>
              We are not liable for indirect, incidental, consequential, or
              punitive damages, including but not limited to lost profits,
              lost revenue, lost data, or business interruption.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You can stop using our services at any time by canceling your
              subscriptions and ending the engagement. We can stop providing
              services if you breach these Terms, fail to pay, or use our
              services for unlawful purposes; in that case, we&rsquo;ll
              notify you in writing first whenever practical.
            </p>
            <p>
              Termination doesn&rsquo;t refund prepaid amounts for
              already-delivered work. Sections that should reasonably
              survive termination (Ownership, Confidentiality, Limitation of
              Liability, Governing Law) survive.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by the laws of the State of Texas,
              without regard to conflict-of-laws principles. Any dispute
              arising from these Terms or our services will be brought in
              the state or federal courts located in Harris County, Texas,
              and you and we consent to that jurisdiction.
            </p>
          </Section>

          <Section title="Changes to these Terms">
            <p>
              We may update these Terms occasionally. Material changes will
              be communicated by email to active clients at least 14 days
              before they take effect. Continued use of our services after
              the effective date constitutes acceptance of the updated
              Terms.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these Terms? Email{' '}
              {emailHrefVal ? (
                <a href={emailHrefVal} className={linkCls}>{email}</a>
              ) : email}{' '}
              or call{' '}
              {phoneHrefVal ? (
                <a href={phoneHrefVal} className={cn(linkCls, 'font-mono tracking-[0.02em]')}>{phone}</a>
              ) : phone}.
            </p>
            <p className="mt-6">
              See also our <Link href="/privacy" className={linkCls}>Privacy Policy</Link>{' '}
              and our <Link href="/sms-terms" className={linkCls}>SMS opt-in disclosure</Link>.
            </p>
          </Section>
        </div>
      </Container>

      <style
        // Plain server-rendered <style>. styled-jsx requires a client
        // component which this page intentionally is not — these styles
        // only target descendants of .prose, so collisions with other
        // pages are bounded.
        dangerouslySetInnerHTML={{
          __html: `
            .prose h2 {
              font-family: var(--font-serif);
              font-size: 1.6rem;
              line-height: 1.2;
              letter-spacing: -0.02em;
              margin: 2.5em 0 0.6em;
              color: var(--color-fg);
            }
            .prose p { margin: 0 0 1em; max-width: 65ch; }
            .prose ul { margin: 0 0 1em; padding-left: 1.3em; }
            .prose li { margin: 0.3em 0; }
            .prose li::marker { color: var(--color-fg-muted); }
            .prose strong { color: var(--color-fg); font-weight: 600; }
          `,
        }}
      />
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
