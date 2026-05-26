'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'

// Parallax hero background. Isolated client leaf so motion/react's hooks
// don't bleed into Server Components. Uses useScroll + useTransform (NOT a
// window scroll listener) so the transform is updated on the animation
// thread, not React state.
//
// 2026-05-27: rewritten after iteration 2 didn't render any visible motion.
// Prior version gated parallax on a `(min-width: 768px) and (hover: hover)`
// media query that was too aggressive (laptop trackpads + iPad-with-keyboard
// + some Safari setups fail `hover: hover`), so the effect never engaged
// for most desktop visitors. New version always renders the motion value
// and only zeroes the transform when the user has `prefers-reduced-motion`
// turned on. Translate range bumped from ±30px to ±80px and scale from
// 1.15x to 1.25x so the effect is felt, not just theoretical.

type Props = {
  src: string
  alt?: string
  sizes?: string
  priority?: boolean
}

export function ParallaxBackground({ src, alt = '', sizes, priority = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // ±80px translate range on a 1.25× scaled image. The scale keeps the photo
  // covering its container even when translated, so the bg doesn't expose
  // a seam at the top/bottom of the hero section.
  const yRange = reduce ? ['0px', '0px'] : ['-80px', '80px']
  const y = useTransform(scrollYProgress, [0, 1], yRange)
  const scale = reduce ? 1 : 1.25

  return (
    <div ref={ref} className="absolute inset-0 -z-20 overflow-hidden">
      <motion.div
        style={{ y, scale }}
        className="absolute inset-0 will-change-transform"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1920px'}
          className="object-cover"
          priority={priority}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </motion.div>
    </div>
  )
}
