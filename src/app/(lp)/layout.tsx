import type { Metadata } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import { manrope, fraunces, jetbrains } from '@/lib/fonts'
import { Container } from '@/components/Container'
import { Logo } from '@/components/Logo'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import { phoneHref, mailtoHref } from '@/lib/contact'
import '../globals.css'

// LP layout — visually quieter than (frontend) but with the brand minimums
// paid traffic still needs:
//   - Logo top-left (unlinked — no nav exit)
//   - Compact footer (logo, contact, legal links, copyright)
//
// Same metadata + GTM injection so analytics still fires.

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  // LPs are paid-traffic only — keep them out of the organic index so they
  // don't compete with /services for SEO.
  robots: { index: false, follow: true },
}

export default async function LpLayout({ children }: { children: React.ReactNode }) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID
  const siteSettings = await getCachedSiteSettings()
  const email = siteSettings?.contactEmail ?? 'hello@blackhartconsulting.com'
  const phone = siteSettings?.contactPhone ?? ''
  const emailHref = mailtoHref(email)
  const phoneHrefVal = phoneHref(phone)
  const year = new Date().getFullYear()

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <head>
        {gtmId ? (
          <>
            {/* page_type pushed before GTM loads so the first pageview tag
                already has it set. The (frontend) layout pushes 'main_site';
                this LP layout pushes 'landing_page' so paid-traffic pages
                are trivially separable in GA4. */}
            <Script id="gtm-page-type" strategy="beforeInteractive">
              {`window.dataLayer = window.dataLayer || []; window.dataLayer.push({ page_type: 'landing_page' });`}
            </Script>
            <Script id="gtm-init" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
          </>
        ) : null}
      </head>
      <body className="min-h-dvh flex flex-col">
        {gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}
        <a
          href="#lp-main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-[var(--color-fg)] focus:text-[var(--color-bg)] focus:font-medium focus:text-[14px] focus:outline-2 focus:outline-[var(--color-brass)]"
        >
          Skip to content
        </a>

        {/* Top-left logo — UNLINKED on purpose. LPs are paid traffic and we
            don't want a nav exit back to the marketing site that pulls the
            visitor out of the conversion funnel. Just brand presence.
            Forced white because LP heroes always have a darkening overlay
            and the logo must read clearly over them. */}
        <header className="absolute top-0 left-0 right-0 z-30 pt-6 sm:pt-8 px-6 sm:px-10">
          <div aria-label="Black Hart Consulting" className="inline-flex items-center text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
            <Logo variant="primary" height={40} />
          </div>
        </header>

        <main id="lp-main" className="flex-1">{children}</main>

        {/* Compact LP footer — legal + contact + copyright only.
            No nav columns or social links; LPs stay focused on conversion. */}
        <footer className="mt-12 border-t border-[var(--color-border)] py-10 text-[13px] text-[var(--color-fg-muted)]">
          <Container size="xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              {/* Static logo (no link) + copyright */}
              <div className="flex items-center gap-4">
                <span aria-label="Black Hart Consulting" className="inline-flex items-center text-[var(--color-fg)]">
                  <Logo variant="primary" height={32} />
                </span>
                <span>© {year} Black Hart Consulting LLC</span>
              </div>

              {/* Contact + legal links */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                {emailHref ? (
                  <a href={emailHref} className="hover:text-[var(--color-brass)] transition-colors">
                    {email}
                  </a>
                ) : null}
                {phoneHrefVal ? (
                  <a href={phoneHrefVal} className="font-mono tracking-[0.02em] hover:text-[var(--color-brass)] transition-colors">
                    {phone}
                  </a>
                ) : null}
                <Link href="/privacy" className="hover:text-[var(--color-brass)] transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/sms-terms" className="hover:text-[var(--color-brass)] transition-colors">
                  SMS Opt-In
                </Link>
              </div>
            </div>
          </Container>
        </footer>
      </body>
    </html>
  )
}
