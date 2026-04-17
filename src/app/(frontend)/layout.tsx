import type { Metadata } from 'next'
import { manrope, fraunces, jetbrains } from '@/lib/fonts'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getPayloadClient } from '@/lib/payload'
import '../globals.css'

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
  icons: {
    icon: [
      { url: '/brand/black-hart-icon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayloadClient()
  const [header, footer] = await Promise.all([
    payload.findGlobal({ slug: 'header' }).catch(() => null),
    payload.findGlobal({ slug: 'footer' }).catch(() => null),
  ])

  // Preconnect hints: CDN hosts image content (Spaces) and the Placeholder
  // component pulls from picsum.photos. Doing DNS + TLS handshake upfront
  // shaves ~150-300ms off the first image paint on mobile.
  const s3Public = process.env.S3_PUBLIC_URL
  const cdnOrigin = s3Public ? new URL(s3Public).origin : null

  // No data-theme attribute \u2014 theme follows OS preference via the
  // `@media (prefers-color-scheme: dark)` block in globals.css.
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <head>
        {cdnOrigin ? (
          <>
            <link rel="preconnect" href={cdnOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={cdnOrigin} />
          </>
        ) : null}
        <link rel="preconnect" href="https://picsum.photos" crossOrigin="" />
        <link rel="dns-prefetch" href="https://picsum.photos" />
        <link rel="preconnect" href="https://fastly.picsum.photos" crossOrigin="" />
      </head>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-[var(--color-fg)] focus:text-[var(--color-bg)] focus:font-medium focus:text-[14px] focus:outline-2 focus:outline-[var(--color-brass)]"
        >
          Skip to content
        </a>
        <SiteHeader header={header} />
        <main id="main-content" className="flex-1">{children}</main>
        <SiteFooter footer={footer} />
      </body>
    </html>
  )
}
