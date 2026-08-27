'use client'

import { useEffect, useRef, useState } from 'react'

// Animated count-up number that runs once when scrolled into view. Honors
// prefers-reduced-motion (shows the final value immediately). Used by the
// Express landing page stats.
type Props = {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  durationMs?: number
}

export function CountUpStat({ value, decimals = 0, prefix = '', suffix = '', durationMs = 1400 }: Props) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      setDisplay(value)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !done.current) {
            done.current = true
            io.disconnect()
            const start = performance.now()
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / durationMs)
              const eased = 1 - Math.pow(1 - t, 3) // cubic ease-out
              setDisplay(value * eased)
              if (t < 1) requestAnimationFrame(tick)
              else setDisplay(value)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, durationMs])

  // toLocaleString so 4+ digit values keep their comma mid-count
  // (Claude Design motion-polish item 4).
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-US')
  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
