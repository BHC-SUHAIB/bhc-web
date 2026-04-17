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
  const [header, footer, settings] = await Promise.all([
    payload.findGlobal({ slug: 'header' }).catch(() => null),
    payload.findGlobal({ slug: 'footer' }).catch(() => null),
    payload.findGlobal({ slug: 'siteSettings' }).catch(() => null),
  ])
  const theme = (settings?.defaultTheme as string) || 'dark'

  return (
    <html
      lang="en"
      data-theme={theme === 'system' ? undefined : theme}
      className={`${manrope.variable} ${fraunces.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        <SiteHeader header={header} />
        <main className="flex-1">{children}</main>
        <SiteFooter footer={footer} />
      </body>
    </html>
  )
}
