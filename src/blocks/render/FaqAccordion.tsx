'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { question: string; answer: string }

// Client-side accordion. Pure UI — the parent server component (Faq.tsx)
// resolves whether to use admin-collection FAQs or block-level items and
// passes the final list down.
export function FaqAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
      {items.map((it, i) => {
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
                <p className="pb-5 pr-10 text-[15px] leading-[1.6] text-[var(--color-fg-muted)] whitespace-pre-line">{it.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
