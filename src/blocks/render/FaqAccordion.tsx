'use client'

import { useRef, useState } from 'react'

type Item = { question: string; answer: string }

// Client-side accordion. Pure UI — the parent server component (Faq.tsx)
// resolves whether to use admin-collection FAQs or block-level items and
// passes the final list down.
//
// Warm Mono markup: `.faq-list` > `.faq-item` (gets `.open` when expanded) >
// `.faq-q` button (with a `.ico` whose plus→minus morph is drawn entirely in
// CSS via ::before/::after) + `.faq-a` collapsible wrapper > `.faq-a-inner`.
// The component CSS only declares the collapsed state (`max-height: 0`) and
// transitions max-height, so the open height is applied inline from the
// measured inner content height.
export function FaqAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0)
  const innerRefs = useRef<Array<HTMLDivElement | null>>([])

  return (
    <div className="faq-list">
      {items.map((it, i) => {
        const isOpen = open === i
        return (
          <div key={i} className={isOpen ? 'faq-item open' : 'faq-item'}>
            <button
              type="button"
              className="faq-q"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              {it.question}
              <span className="ico" aria-hidden />
            </button>
            <div
              className="faq-a"
              style={{ maxHeight: isOpen ? innerRefs.current[i]?.scrollHeight ?? undefined : 0 }}
            >
              <div
                className="faq-a-inner"
                ref={(el) => {
                  innerRefs.current[i] = el
                }}
                style={{ whiteSpace: 'pre-line' }}
              >
                {it.answer}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
