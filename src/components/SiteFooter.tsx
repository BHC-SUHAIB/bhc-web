import Link from 'next/link'
import { Container } from './Container'
import { Logo } from './Logo'
import { TrackedLink } from './TrackedLink'
import { phoneHref, mailtoHref } from '@/lib/contact'
import type { Footer as FooterGlobal, SiteSetting } from '@/payload-types'

// Warm Mono redesign (2026-06): footer is now a warm ink band with brass column
// headings. Content is unchanged — logo, tagline, contact, link columns, copyright.
// Social links are still intentionally NOT rendered (none exist in content); real
// contact (email + phone) lives in the brand column.

type FooterProps = { footer: FooterGlobal | null; siteSettings: SiteSetting | null }

const contactLinkClass =
  'text-[color-mix(in_srgb,var(--band-fg)_82%,transparent)] hover:text-[var(--color-brass)] transition-colors'

export function SiteFooter({ footer, siteSettings }: FooterProps) {
  const columns = footer?.columns ?? []
  const tagline = footer?.tagline
  const copyright = footer?.copyright
  const email = siteSettings?.contactEmail ?? ''
  const phone = siteSettings?.contactPhone ?? ''
  const emailHref = mailtoHref(email)
  const phoneHrefVal = phoneHref(phone)

  return (
    <footer className="site-foot">
      <Container size="xl" className="foot-grid">
        <div className="foot-brand">
          <Logo variant="primary" height={40} className="text-white mb-4" />
          {tagline ? <p>{tagline}</p> : null}
          {email || phone ? (
            <ul className="mt-5 space-y-2 text-[14px]">
              {email && emailHref ? (
                <li>
                  <TrackedLink
                    href={emailHref}
                    trackEvent="email_click"
                    trackLocation="footer"
                    className={contactLinkClass}
                  >
                    {email}
                  </TrackedLink>
                </li>
              ) : null}
              {phone && phoneHrefVal ? (
                <li>
                  <TrackedLink
                    href={phoneHrefVal}
                    trackEvent="phone_click"
                    trackLocation="footer"
                    className={`font-mono tracking-[0.02em] ${contactLinkClass}`}
                  >
                    {phone}
                  </TrackedLink>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {columns.map((col, i) => (
          <div key={i} className="foot-col">
            <h4>{col.heading}</h4>
            <div>
              {col.links?.map((l, j) => (
                <Link key={j} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </Container>

      <Container size="xl" className="foot-bottom">
        <span className="copy">{copyright}</span>
        {/* No social links rendered. Contact lives in the brand column above. */}
      </Container>
    </footer>
  )
}
