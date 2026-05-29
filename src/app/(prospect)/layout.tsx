import type { Metadata } from 'next'
import { manrope, fraunces, jetbrains } from '@/lib/fonts'
import '../globals.css'

// Standalone layout for prospect preview gates. Same pattern as
// dev-login/layout.tsx — no SiteHeader, no SiteFooter, no analytics. The
// gate runs before the prospect has been authorised to see the mockup, so
// we don't want to leak anything until they're past the gate. Just the
// brand font stack + globals so the gate matches the rest of the site.

export const metadata: Metadata = {
  title: 'Concept preview · Black Hart Consulting',
  description: 'Private prospect preview.',
  robots: { index: false, follow: false },
}

export default function ProspectLayout({ children }: { children: React.ReactNode }) {
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
