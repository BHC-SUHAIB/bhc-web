'use client'

import { useState } from 'react'
import { Container } from '@/components/Container'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FaqBlock } from '@/payload-types'

export function Faq(b: FaqBlock) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="py-20 sm:py-24">
      <Container size="md">
        {b.eyebrow || b.headline ? (
          <div className="mb-12">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
                {b.eyebrow}
              </p>
            ) : null}
            {b.headline ? (
              <h2 className="font-serif font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em]">
                {b.headline}
              </h2>
            ) : null}
          </div>
        ) : null}

        <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {b.items?.map((it, i) => {
            const isOpen = open === i
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-left flex items-center justify-between gap-4 py-5 hover:text-[var(--color-brass)] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-[16px] sm:text-[17px]">{it.question}</span>
                  <ChevronDown className={cn('size-4 transition-transform shrink-0', isOpen && 'rotate-180')} />
                </button>
                <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-10 text-[15px] leading-[1.6] text-[var(--color-fg-muted)]">{it.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
