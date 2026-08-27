// Custom Black Hart line-icon set. Geometry authored by Claude Design in the
// 2026-08 animation handoff (design_handoff_bhc_animations/icon-hover-micro.html)
// to the shared spec: 24px grid, 1.5 stroke, round caps, currentColor,
// pathLength=1 on every stroked path so components.css can run BOTH the
// scroll draw-in (stroke-dash 1 -> 0 when the reveal group gets `.in`) AND
// the per-icon hover micro-gestures (fired by `.group:hover`, keyed off the
// bic-<name> class; subpart classes like .h-min / .needle / .chk are the
// CSS contract - keep them if paths are ever redrawn). Server-safe, zero JS.

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

export function IconClock({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-clock', className)} {...p}>
      <circle cx="12" cy="12" r="8.5" pathLength={1} />
      <path className="h-min" d="M12 12V7.2" pathLength={1} />
      <path d="M12 12l3 1.8" pathLength={1} />
    </Base>
  )
}

export function IconGauge({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-gauge', className)} {...p}>
      <path d="M4 16.5a8.5 8.5 0 0 1 16 0" pathLength={1} />
      <path d="M4.8 16.5h.01M19.2 16.5h.01M12 8v.01" pathLength={1} />
      <path className="needle" d="M12 16.5l4.4-5.6" pathLength={1} />
      <circle cx="12" cy="16.5" r="1.1" pathLength={1} />
    </Base>
  )
}

export function IconWrench({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-wrench', className)} {...p}>
      <g className="whole">
        <path
          d="M13.8 5.2a4.4 4.4 0 0 0-5.9 5.9L3.6 15.4a1.6 1.6 0 0 0 0 2.3l2.7 2.7a1.6 1.6 0 0 0 2.3 0l4.3-4.3a4.4 4.4 0 0 0 5.9-5.9l-3 3-2.9-2.9 3-3z"
          pathLength={1}
        />
      </g>
    </Base>
  )
}

export function IconSearch({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-search', className)} {...p}>
      <g className="whole">
        <circle cx="11" cy="11" r="6" pathLength={1} />
        <path d="M15.4 15.4L20 20" pathLength={1} />
      </g>
    </Base>
  )
}

export function IconPhoneRing({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-phone-ring', className)} {...p}>
      <g className="hs">
        <path
          d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5V18a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 6.2 2 2 0 0 1 5 4z"
          pathLength={1}
        />
      </g>
      <path className="sig s1" d="M14.5 7a3.5 3.5 0 0 1 2.5 2.5" pathLength={1} />
      <path className="sig s2" d="M15.5 3.5a7 7 0 0 1 5 5" pathLength={1} />
    </Base>
  )
}

export function IconLoop({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-loop', className)} {...p}>
      <g className="whole">
        <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1" pathLength={1} />
        <path d="M17.8 3.6v3.5h-3.5" pathLength={1} />
        <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1" pathLength={1} />
        <path d="M6.2 20.4v-3.5h3.5" pathLength={1} />
      </g>
    </Base>
  )
}

export function IconPage({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-page', className)} {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" pathLength={1} />
      <path className="ln l1" d="M9 8.5h6" pathLength={1} />
      <path className="ln l2" d="M9 12h6" pathLength={1} />
      <path className="ln l3" d="M9 15.5h3.8" pathLength={1} />
    </Base>
  )
}

export function IconStack({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-stack', className)} {...p}>
      <path className="s1" d="M12 3.5l8 4-8 4-8-4z" pathLength={1} />
      <path className="s2" d="M4 12l8 4 8-4" pathLength={1} />
      <path className="s3" d="M4 16.5l8 4 8-4" pathLength={1} />
    </Base>
  )
}

export function IconPen({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-pen', className)} {...p}>
      <g className="whole">
        <path d="M13.5 5.5l5 5L8 21H3v-5z" pathLength={1} />
        <path d="M12 7l5 5" pathLength={1} />
      </g>
      <path className="sigline" d="M14.5 21c2.2-1.2 4.3-1.2 6.5 0" pathLength={1} />
    </Base>
  )
}

export function IconCompass({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-compass', className)} {...p}>
      <circle cx="12" cy="12" r="8.5" pathLength={1} />
      <path className="needle" d="M15.5 8.5L13.2 13.2 8.5 15.5l2.3-4.7z" pathLength={1} />
    </Base>
  )
}

export function IconStore({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-store', className)} {...p}>
      <path d="M5 10.5V20h14v-9.5" pathLength={1} />
      <path
        className="awn"
        d="M3.5 10.5L5.5 4h13l2 6.5a2.6 2.6 0 0 1-5.2 0 2.6 2.6 0 0 1-5.2 0 2.6 2.6 0 0 1-5.2 0h-1.4z"
        pathLength={1}
      />
      <path d="M10 20v-5h4v5" pathLength={1} />
    </Base>
  )
}

export function IconCrown({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-crown', className)} {...p}>
      {/* Fill layer (no pathLength: it is a fill, not a stroke) revealed by
          clip-path on hover; the stroked outline sits on top. */}
      <path className="crownfill" d="M3.5 8.5l3.6 3.4L12 5.5l4.9 6.4 3.6-3.4-1.6 9.5H5.1z" />
      <path d="M3.5 8.5l3.6 3.4L12 5.5l4.9 6.4 3.6-3.4-1.6 9.5H5.1z" pathLength={1} />
    </Base>
  )
}

export function IconShield({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-shield', className)} {...p}>
      <path d="M12 21.5s7.5-3.7 7.5-9.3V5.5L12 2.8 4.5 5.5v6.7c0 5.6 7.5 9.3 7.5 9.3z" pathLength={1} />
      <path className="chk" d="M8.7 11.7l2.4 2.4 4.2-4.2" pathLength={1} />
    </Base>
  )
}

export function IconEye({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-eye', className)} {...p}>
      <g className="whole">
        <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" pathLength={1} />
        <circle cx="12" cy="12" r="2.7" pathLength={1} />
      </g>
    </Base>
  )
}

export function IconTrend({ className, ...p }: IconProps) {
  return (
    <Base className={cn('bic-trend', className)} {...p}>
      <path className="tl" d="M3.5 16.5l5.2-5.2 3.4 3.4 7-7" pathLength={1} />
      <path className="ah" d="M14.9 7.5h4.2v4.2" pathLength={1} />
    </Base>
  )
}
