import type { Metadata } from 'next'
import Script from 'next/script'
import { manrope, fraunces, jetbrains } from '@/lib/fonts'
import '../globals.css'

// Separate root layout from (frontend) so landing pages can omit the global
// SiteHeader/SiteFooter — paid-traffic pages shouldn't give visitors any
// nav exits. Route groups in Next.js can each declare their own <html>/<body>.
//
// Same metadata + GTM injection as the marketing layout so analytics still
// fires on LP traffic, but no nav, no footer columns.

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  // LPs are paid-traffic only — keep them out of the organic index so they
  // don't compete with /services for SEO.
  robots: { index: false, follow: true },
}

export default function LpLayout({ children }: { children: React.ReactNode }) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <head>
        {gtmId ? (
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
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
        <main id="lp-main" className="flex-1">{children}</main>
      </body>
    </html>
  )
}
