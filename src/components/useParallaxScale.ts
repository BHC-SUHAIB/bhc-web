'use client'

import { useEffect, useState, type RefObject } from 'react'

// Reads the CMS-controlled parallax multiplier (--motion-parallax, stamped on
// <body> by the frontend layout from SiteSettings → Motion & animation) off
// the given element's computed style. SSR and first paint use 1 (standard);
// the corrected value lands before any meaningful scroll. 0 disables parallax.
export function useParallaxScale(ref: RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const raw = getComputedStyle(el).getPropertyValue('--motion-parallax').trim()
    const v = parseFloat(raw)
    if (!Number.isNaN(v) && v !== 1) setScale(Math.max(0, Math.min(v, 3)))
  }, [ref])
  return scale
}
