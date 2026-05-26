'use client'

import Image from 'next/image'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'

// Parallax hero background, isolated as a client leaf per the taste-skill rule
// that scroll-driven motion must be opt-in and never touch React state per
// frame. Uses Motion's `useScroll` + `useTransform` (no window scroll listeners,
// no useState per frame). Mobile degrades to static because: 1) iOS Safari's
// scroll behavior fights parallax, 2) it eats battery, 3) Heights SMB owners
// are mobile-heavy and we promised <200KB JS budget.

type Props = {
  src: string
  alt?: string
  sizes?: string
  priority?: boolean
}

export function ParallaxBackground({ src, alt = '', sizes, priority = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (hover: hover)')
    setIsDesktop(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // useScroll tracks the section's offset relative to the viewport. The
  // `target` ref ties progress to THIS section, not the page, so each hero
  // gets its own progress timeline. Range [start end, end start] means: 0
  // when the section's top hits the viewport bottom, 1 when the section's
  // bottom hits the viewport top.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Translate the image up to 60px down as the section scrolls past. Subtle:
  // the parallax effect should be felt, not noticed. Scaling the image to 110%
  // means the 60px translate doesn't expose the underlying background.
  const y = useTransform(scrollYProgress, [0, 1], ['-30px', '30px'])

  const enableParallax = isDesktop && !reduce

  return (
    <div ref={ref} className="absolute inset-0 -z-20 overflow-hidden">
      <motion.div
        style={{
          y: enableParallax ? y : 0,
          scale: enableParallax ? 1.15 : 1,
        }}
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
