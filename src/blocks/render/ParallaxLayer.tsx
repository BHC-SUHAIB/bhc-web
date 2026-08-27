'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useParallaxScale } from '@/components/useParallaxScale'

// Generic parallax wrapper. Multiple layers with different `speed` values
// composite into a depth illusion (negative speeds translate opposite to
// scroll direction). useReducedMotion zeroes the transform for users who
// have prefers-reduced-motion enabled.

type Props = {
  children: ReactNode
  /** Multiplier on the ±100px translate range. 1.5 = aggressive bg, 0.4 = subtle mid-ground,
   *  negative values = movement opposite to scroll (good for foreground accents). */
  speed?: number
  className?: string
}

export function ParallaxLayer({ children, speed = 1, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // speed is the per-layer depth; pScale is the site-wide CMS multiplier
  // (SiteSettings → Motion & animation → parallax strength).
  const pScale = useParallaxScale(ref)
  const range = 100 * speed * pScale
  const yRange = reduce || range === 0 ? ['0px', '0px'] : [`${-range}px`, `${range}px`]
  const y = useTransform(scrollYProgress, [0, 1], yRange)

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="will-change-transform h-full">
        {children}
      </motion.div>
    </div>
  )
}
