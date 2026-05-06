import type { Metadata } from 'next'
import { manrope, fraunces, jetbrains } from '@/lib/fonts'
import '../globals.css'

// Standalone layout — no SiteHeader, no SiteFooter, no GTM. The dev-login
// gate runs before the visitor has been authorized to see the site, so we
// don't want to leak structure (or fire analytics) until they're past the
// gate. Just the brand font + globals.

export const metadata: Metadata = {
  title: 'Dev access · Black Hart Consulting',
  description: 'Restricted preview environment.',
  robots: { index: false, follow: false },
}

export default function DevLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-dvh flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        {children}
      </body>
    </html>
  )
}
