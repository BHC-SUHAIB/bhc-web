import Link from 'next/link'
import { Container } from './Container'
import { Logo } from './Logo'
import { TrackedLink } from './TrackedLink'
import { phoneHref, mailtoHref } from '@/lib/contact'
import type { Footer as FooterGlobal, SiteSetting } from '@/payload-types'

const socialLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  x: 'X',
  instagram: 'Instagram',
  dribbble: 'Dribbble',
  mastodon: 'Mastodon',
  email: 'Email',
}

type FooterProps = { footer: FooterGlobal | null; siteSettings: SiteSetting | null }

export function SiteFooter({ footer, siteSettings }: FooterProps) {
  const columns = footer?.columns ?? []
  const social = footer?.social ?? []
  const tagline = footer?.tagline
  const copyright = footer?.copyright
  const email = siteSettings?.contactEmail ?? ''
  const phone = siteSettings?.contactPhone ?? ''
  const emailHref = mailtoHref(email)
  const phoneHrefVal = phoneHref(phone)

  return (
    <footer className="mt-16 border-t border-[var(--color-border)] py-12 text-[var(--color-fg)]">
      <Container size="xl" className="grid gap-12 md:grid-cols-[1.3fr_2fr]">
        <div>
          <Logo variant="primary" height={48} className="text-[var(--color-fg)]" />
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
            {tagline}
          </p>
          {email || phone ? (
            <ul className="mt-6 space-y-2 text-[14px]">
              {email && emailHref ? (
                <li>
                  <TrackedLink
                    href={emailHref}
                    trackEvent="email_click"
                    trackLocation="footer"
                    className="hover:text-[var(--color-brass)] transition-colors"
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
                    className="font-mono tracking-[0.02em] hover:text-[var(--color-brass)] transition-colors"
                  >
                    {phone}
                  </TrackedLink>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-10 grid-cols-2 md:grid-cols-3">
          {columns.map((col, i) => (
            <div key={i}>
              <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">
                {col.heading}
              </h2>
              <ul className="space-y-2.5">
                {col.links?.map((l, j) => (
                  <li key={j}>
                    <Link href={l.href} className="text-[14px] hover:text-[var(--color-brass)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      <Container size="xl" className="mt-12 pt-6 border-t border-[var(--color-border)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-[13px] text-[var(--color-fg-muted)]">
        <span>{copyright}</span>
        <div className="flex gap-5">
          {social.map((s, i) => (
            <a
              key={i}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-brass)] transition-colors"
            >
              {socialLabels[s.platform] ?? s.platform}
            </a>
          ))}
        </div>
      </Container>
    </footer>
  )
}
