'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Container } from './Container'
import { Logo } from './Logo'
import { Button } from './Button'
import { Menu, X } from 'lucide-react'
import type { Header as HeaderGlobal } from '@/payload-types'

type HeaderProps = { header: HeaderGlobal | null }

export function SiteHeader({ header }: HeaderProps) {
  const nav = header?.nav ?? []
  const cta = header?.cta
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] border-b border-[var(--color-border)]">
        <Container size="xl" className="flex items-center justify-between gap-6 py-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Logo variant="primary" height={36} className="text-[var(--color-fg)]" />
            <span className="hidden sm:block font-serif text-[18px] font-semibold tracking-[-0.015em]">
              Black Hart
            </span>
            <span className="sr-only">Consulting home</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
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
            {cta?.show && cta.label && cta.href ? (
              <Button href={cta.href} variant="primary" size="sm" className="hidden sm:inline-flex">
                {cta.label}
              </Button>
            ) : null}
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center size-10 rounded-[var(--radius)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-fg-muted)] transition-colors"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </Container>
      </header>

      {/* Mobile drawer is rendered as a sibling of <header> so the header's
          backdrop-filter containing block doesn't clip this fixed element. */}
      {open ? (
        <div
          id="mobile-menu"
          className="md:hidden fixed inset-x-0 top-[72px] bottom-0 z-30 overflow-y-auto bg-[var(--color-bg)] border-t border-[var(--color-border)]"
        >
          <Container size="xl" className="py-8">
            <nav className="flex flex-col gap-1" aria-label="Mobile primary">
              {nav.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  onClick={() => setOpen(false)}
                  className="font-serif text-[28px] font-semibold tracking-[-0.02em] py-3 border-b border-[var(--color-border)] hover:text-[var(--color-brass)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {cta?.show && cta.label && cta.href ? (
              <div className="mt-8">
                <Button href={cta.href} variant="primary" size="lg" className="w-full justify-center">
                  {cta.label}
                </Button>
              </div>
            ) : null}
          </Container>
        </div>
      ) : null}
    </>
  )
}
