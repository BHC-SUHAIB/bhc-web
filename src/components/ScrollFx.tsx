'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Calm reveal-on-scroll engine. Adds `.in` to any element carrying a reveal
// class (`.reveal`, `.reveal-up`, `[data-reveal-stagger]`, `.line-mask`) once it
// scrolls into view. The hidden state is gated behind `html.js` in CSS, so if
// JS never runs (or is disabled) every element stays fully visible — no FOUC,
// no invisible content. Honors prefers-reduced-motion by revealing immediately.
// Mounted once per layout; re-scans on client-side route changes.

const SELECTOR = '.reveal, .reveal-up, [data-reveal-stagger], .line-mask'

export function ScrollFx() {
  const pathname = usePathname()

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter(
      (el) => !el.classList.contains('in'),
    )
    if (!els.length) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pathname])

  return null
}
