import type { Metadata } from 'next'
import Script from 'next/script'
import { manrope, fraunces, jetbrains } from '@/lib/fonts'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getCachedHeader, getCachedFooter, getCachedSiteSettings } from '@/lib/payload-cache'
import { ScrollFx } from '@/components/ScrollFx'
import { MobileCta } from '@/components/MobileCta'
import { ExitIntentModal } from '@/components/ExitIntentModal'
import { JsonLd } from '@/components/JsonLd'
import { buildLocalBusinessJsonLd } from '@/lib/schema'
import '../globals.css'

// Search engine ownership verification. Tokens come from each console's
// "verify by HTML tag" flow. Stored as env vars so we don't commit them
// (low secrecy, but no upside to leaking them either). Tokens are tied to
// the domain — rotating the value un-verifies the property in that console.
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
const bingSiteVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Black Hart Consulting',
    template: '%s · Black Hart Consulting',
  },
  description:
    'Websites, SEO, app design, and hosting for businesses that care how their work shows up online.',
  openGraph: {
    type: 'website',
    siteName: 'Black Hart Consulting',
  },
  verification: {
    ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
    ...(bingSiteVerification
      ? { other: { 'msvalidate.01': bingSiteVerification } }
      : {}),
  },
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const [header, footer, siteSettings] = await Promise.all([
    getCachedHeader(),
    getCachedFooter(),
    getCachedSiteSettings(),
  ])

  // Preconnect hints: CDN hosts image content (Spaces) and the Placeholder
  // component pulls from picsum.photos. Doing DNS + TLS handshake upfront
  // shaves ~150-300ms off the first image paint on mobile.
  const s3Public = process.env.S3_PUBLIC_URL
  const cdnOrigin = s3Public ? new URL(s3Public).origin : null

  // GTM is the single source of truth for all client-side tags. GA4 is
  // configured *inside* the GTM container, not loaded directly here, so
  // we never double-fire pageviews. Set NEXT_PUBLIC_GTM_ID in production
  // only; dev/preview boots without the env var stay analytics-free.
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID
  // Microsoft Clarity — session replay + heatmaps. Same env-var gating as
  // GTM so dev/preview boots stay clean. Loaded via Next/Script after
  // interactive so it doesn't block the initial paint.
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

  // No data-theme attribute \u2014 theme follows OS preference via the
  // `@media (prefers-color-scheme: dark)` block in globals.css.
  return (
    <html
      lang="en"
      // Next 16 no longer forces `scroll-behavior: auto` during SPA
      // navigations; without this attribute, our global smooth scrolling
      // animates cross-page jumps from the old scroll position and hash
      // targets land mid-page (e.g. /contact#contact-form from a deep
      // homepage scroll ended up at the FAQs).
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <head>
        {/* Sitewide LocalBusiness (ProfessionalService) structured data, built
            from SiteSettings so NAP stays consistent across every page and
            areaServed is the Houston metro, not "Worldwide". */}
        <JsonLd data={buildLocalBusinessJsonLd(siteSettings)} />
        {cdnOrigin ? (
          <>
            <link rel="preconnect" href={cdnOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={cdnOrigin} />
          </>
        ) : null}
        <link rel="preconnect" href="https://picsum.photos" crossOrigin="" />
        <link rel="dns-prefetch" href="https://picsum.photos" />
        <link rel="preconnect" href="https://fastly.picsum.photos" crossOrigin="" />
        {/* Hero LCP images on every block-rendered page can come from Unsplash
            via the editor-controlled `backgroundImageUrl` field. Preconnecting
            shaves ~100-200ms off mobile LCP on the first hero load. */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {gtmId ? (
          <>
            {/* Push page_type into the dataLayer BEFORE GTM loads so the
                first pageview tag fires with page_type already set. Lets
                you build "LP traffic only" segments in GA4 (Reports →
                Custom dimensions → page_type) without parsing pathnames
                in every report. The (lp) layout pushes 'landing_page';
                this main-site layout pushes 'main_site'.

                Both this and gtm-init below short-circuit when localStorage
                has bhc_skip_analytics='true' set — the internal-traffic
                opt-out flag. Set it once via Safari/Chrome DevTools
                console while on a blackhartconsulting.com tab to make
                that browser's visits invisible to GA4, GTM, Google Ads
                pixel, AND Clarity (the matching skip lives in
                clarity-init). The try/catch swallows SecurityError from
                Private Browsing so default-load behavior still happens
                for normal visitors when storage is unreadable. */}
            <Script id="gtm-page-type" strategy="beforeInteractive">
              {`(function(){try{if(window.localStorage&&localStorage.getItem('bhc_skip_analytics')==='true')return;}catch(e){}window.dataLayer=window.dataLayer||[];window.dataLayer.push({page_type:'main_site'});})();`}
            </Script>
            <Script id="gtm-init" strategy="afterInteractive">
              {`(function(w,d,s,l,i){try{if(w.localStorage&&w.localStorage.getItem('bhc_skip_analytics')==='true')return;}catch(e){}w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
          </>
        ) : null}
        {clarityId ? (
          // Clarity = session replay + heatmaps. Non-essential for conversion
          // attribution, so we lazy-load it after window.load to free the main
          // thread during initial paint. GTM stays at afterInteractive because
          // it carries the Google Ads conversion pixel — delaying GTM would
          // miss pageview events from quick-bouncing visitors.
          //
          // Same bhc_skip_analytics short-circuit as the GTM init above.
          <Script id="clarity-init" strategy="lazyOnload">
            {`(function(c,l,a,r,i,t,y){try{if(c.localStorage&&c.localStorage.getItem('bhc_skip_analytics')==='true')return;}catch(e){}c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
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
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-[var(--color-fg)] focus:text-[var(--color-bg)] focus:font-medium focus:text-[14px] focus:outline-2 focus:outline-[var(--color-brass)]"
        >
          Skip to content
        </a>
        <SiteHeader header={header} siteSettings={siteSettings} />
        <main id="main-content" className="flex-1">{children}</main>
        <SiteFooter footer={footer} siteSettings={siteSettings} />
        <ScrollFx />
        <MobileCta phone={siteSettings?.contactPhone ?? null} />
        <ExitIntentModal />
      </body>
    </html>
  )
}
