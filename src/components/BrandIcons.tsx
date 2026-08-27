// Custom Black Hart line-icon set (theme enrichment, 2026-08). One consistent
// style: 24px grid, 1.5 stroke, round caps, currentColor. Every path carries
// pathLength=1 so components.css can run the draw-in animation (stroke-dash
// from 1 -> 0) when the icon's reveal group scrolls into view. Server-safe.

import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

function Base({ className, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('bic', className)}
      {...rest}
    >
      {children}
    </svg>
  )
}

export function IconClock(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.5" pathLength={1} />
      <path d="M12 7.5V12l3 2" pathLength={1} />
    </Base>
  )
}

export function IconGauge(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 15.5a8 8 0 1 1 16 0" pathLength={1} />
      <path d="M12 15.5 15.5 9" pathLength={1} />
      <path d="M3.5 19h17" pathLength={1} />
    </Base>
  )
}

export function IconWrench(p: IconProps) {
  return (
    <Base {...p}>
      <path
        d="M14.5 6.5a4 4 0 0 0-5.4 4.8L4 16.4V20h3.6l5.1-5.1a4 4 0 0 0 4.8-5.4L14.6 12l-2.6-2.6 2.5-2.9Z"
        pathLength={1}
      />
    </Base>
  )
}

export function IconSearch(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="10.5" cy="10.5" r="6" pathLength={1} />
      <path d="m15 15 5 5" pathLength={1} />
      <path d="M8 10.5h5M10.5 8v5" pathLength={1} />
    </Base>
  )
}

export function IconPhoneRing(p: IconProps) {
  return (
    <Base {...p}>
      <path
        d="M6 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5l1.5-2 4 1.5v3a1.8 1.8 0 0 1-2 1.8C10.6 19.9 4.1 13.4 3.2 5.5A1.8 1.8 0 0 1 5 3.5Z"
        pathLength={1}
      />
      <path d="M14.5 5.5a5 5 0 0 1 4 4" pathLength={1} />
    </Base>
  )
}

export function IconLoop(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 9a6 6 0 0 1 10.5-4M20 15a6 6 0 0 1-10.5 4" pathLength={1} />
      <path d="M14 4h4V0M10 18H6v4" pathLength={1} />
    </Base>
  )
}

export function IconPage(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M6.5 3h8l3 3v15h-11Z" pathLength={1} />
      <path d="M9.5 10h5M9.5 13.5h5M9.5 17h3" pathLength={1} />
    </Base>
  )
}

export function IconStack(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5Z" pathLength={1} />
      <path d="m4 12 8 4.2 8-4.2" pathLength={1} />
      <path d="m4 16.2 8 4.2 8-4.2" pathLength={1} />
    </Base>
  )
}

export function IconPen(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m14.5 4.5 5 5L8 21H3v-5Z" pathLength={1} />
      <path d="m12 7 5 5" pathLength={1} />
    </Base>
  )
}

export function IconCompass(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.5" pathLength={1} />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" pathLength={1} />
    </Base>
  )
}

export function IconStore(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.5 9 6 4h12l1.5 5" pathLength={1} />
      <path d="M4.5 9h15v11h-15Z" pathLength={1} />
      <path d="M9.5 20v-6h5v6" pathLength={1} />
    </Base>
  )
}

export function IconCrown(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m4 8 4 3.5L12 5l4 6.5L20 8v9H4Z" pathLength={1} />
      <path d="M4 20h16" pathLength={1} />
    </Base>
  )
}

export function IconShield(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 3 5 5.5v6c0 4.6 3 7.9 7 9.5 4-1.6 7-4.9 7-9.5v-6Z" pathLength={1} />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" pathLength={1} />
    </Base>
  )
}

export function IconEye(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" pathLength={1} />
      <circle cx="12" cy="12" r="2.6" pathLength={1} />
    </Base>
  )
}

export function IconTrend(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m4 17 5.5-5.5 3.5 3.5L20 8" pathLength={1} />
      <path d="M15.5 8H20v4.5" pathLength={1} />
    </Base>
  )
}
