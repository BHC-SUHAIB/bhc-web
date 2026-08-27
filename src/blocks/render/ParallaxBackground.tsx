'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useParallaxScale } from '@/components/useParallaxScale'

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
  /** Extra classes on the image, e.g. "opacity-30" for faded section washes. */
  imgClassName?: string
  quality?: number
  /** Hide the photo below the sm breakpoint (mobile LCP art direction):
   * the wrapper gets hidden sm:block and the image loses its preload so a
   * phone's largest paint is the headline text, not a full-bleed photo.
   * The section's gradient overlay carries the visual on mobile. */
  mobileHidden?: boolean
}

export function ParallaxBackground({ src, alt = '', sizes, priority = true, imgClassName, quality = 60, mobileHidden = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // ±110px translate range on a 1.3× scaled image (bumped from ±80/1.25 in
  // the 2026-08 pass so the motion is clearly felt site-wide). The scale
  // keeps the photo covering its container even when translated, so the bg
  // doesn't expose a seam at the top/bottom of the section.
  // pScale is the CMS multiplier (SiteSettings → Motion & animation →
  // parallax strength): 0 off, 0.5 subtle, 1 standard, 1.5 strong. The
  // cover-scale grows with the range so stronger drift never exposes seams.
  const pScale = useParallaxScale(ref)
  const range = 110 * pScale
  const still = reduce || range === 0
  const yRange = still ? ['0px', '0px'] : [`-${range}px`, `${range}px`]
  const y = useTransform(scrollYProgress, [0, 1], yRange)
  const scale = still ? 1 : 1 + 0.3 * Math.max(pScale, 0.5)

  return (
    <div
      ref={ref}
      aria-hidden
      className={
        mobileHidden
          ? 'hidden sm:block absolute inset-0 -z-20 overflow-hidden'
          : 'absolute inset-0 -z-20 overflow-hidden'
      }
    >
      <motion.div
        style={{ y, scale }}
        className="absolute inset-0 will-change-transform"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1920px'}
          className={imgClassName ? `object-cover ${imgClassName}` : 'object-cover'}
          // mobileHidden drops the <link rel=preload> (priority) so phones
          // don't spend critical bandwidth on a hidden image; the SSR'd img
          // tag with loading=eager still lets desktop's preload scanner
          // fetch it immediately.
          priority={priority && !mobileHidden}
          loading="eager"
          fetchPriority={priority ? 'high' : 'auto'}
          quality={quality}
        />
      </motion.div>
    </div>
  )
}
