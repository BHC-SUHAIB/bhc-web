import Link from 'next/link'
import { Container } from './Container'
import { Logo } from './Logo'
import { Button } from './Button'
import { ThemeToggle } from './ThemeToggle'
import type { Header as HeaderGlobal } from '@/payload-types'

type HeaderProps = { header: HeaderGlobal | null }

export function SiteHeader({ header }: HeaderProps) {
  const nav = header?.nav ?? []
  const cta = header?.cta

  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] border-b border-[var(--color-border)]">
      <Container size="xl" className="flex items-center justify-between gap-6 py-4">
        <Link href="/" aria-label="Black Hart Consulting home" className="flex items-center gap-3 shrink-0">
          <Logo variant="primary" height={36} className="text-[var(--color-fg)]" />
          <span className="hidden sm:block font-serif text-[18px] font-semibold tracking-[-0.015em]">
            Black Hart
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {nav.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              target={item.openInNewTab ? '_blank' : undefined}
              rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
              className="text-[14px] font-medium text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {cta?.show && cta.label && cta.href ? (
            <Button href={cta.href} variant="primary" size="sm" className="hidden sm:inline-flex">
              {cta.label}
            </Button>
          ) : null}
        </div>
      </Container>
    </header>
  )
}
