import Link from 'next/link'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { AntlerDrawIn } from '@/components/CdAnimations'
import { ArrowUpRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center">
      <Container size="xl" className="py-24 sm:py-32">
        <div className="grid gap-12 md:grid-cols-[1fr_minmax(180px,260px)] md:items-start max-w-4xl">
        <div className="max-w-2xl md:order-first">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
            404 &middot; Page not found
          </p>
          <h1 className="font-serif font-semibold text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em]">
            Trail went cold.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
            The page you&rsquo;re looking for isn&rsquo;t here. It may have moved, or the link that brought
            you was out of date. A few places that are worth a look:
          </p>

          <ul className="mt-10 space-y-px rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)]">
            {[
              { label: 'Home', href: '/', description: 'What we do, who we are, and how to reach us.' },
              { label: 'Portfolio', href: '/portfolio', description: 'Recent projects with full case studies.' },
              { label: 'Articles', href: '/articles', description: 'Field notes on engineering, SEO, and performance.' },
              { label: 'Contact', href: '/contact', description: 'Start a conversation about a new project.' },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center justify-between gap-6 bg-[var(--color-surface)] px-5 py-4 hover:bg-[var(--color-bg)] transition-colors"
                >
                  <div>
                    <div className="font-serif font-semibold text-[18px] group-hover:text-[var(--color-brass)] transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[13px] text-[var(--color-fg-muted)] mt-0.5">{item.description}</div>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Button href="/" variant="primary" size="md">Back to the home page</Button>
          </div>
        </div>

        {/* The antler draws itself in once on load (Claude Design handoff);
            reduced motion gets the solid mark. currentColor = page ink. */}
        <AntlerDrawIn className="hidden md:block text-[var(--color-fg)] opacity-90" />
        </div>
      </Container>
    </div>
  )
}
