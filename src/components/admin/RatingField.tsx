'use client'

import React, { useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { SelectFieldClientProps } from 'payload'

const STARS = [1, 2, 3, 4, 5] as const
const STAR_PX = 32
const GAP_PX = 4

type Props = SelectFieldClientProps

// Interactive star rating field. Backs the existing `rating` select
// column (values "0"/"0.5"/"1"…"5") so swapping the dropdown for this
// component is a UI-only change with zero schema impact. Hover the
// left or right half of any star to preview, click to commit, click
// the × to clear back to no rating.
export default function RatingField({ path, field }: Props) {
  const { value, setValue } = useField<string | undefined>({ path })
  const [hover, setHover] = useState<number | null>(null)

  const numericValue = (() => {
    const n = parseFloat(value ?? '')
    return Number.isFinite(n) ? n : 0
  })()
  const display = hover ?? numericValue

  return (
    <div className="field-type bhc-rating-field">
      <label className="field-label">
        {(field?.label as string) || 'Rating'}
      </label>
      <div className="bhc-rating-field__row" onMouseLeave={() => setHover(null)}>
        <div
          className="bhc-rating-field__stars"
          style={{ gap: GAP_PX }}
          role="radiogroup"
          aria-label="Star rating"
        >
          {STARS.map((i) => (
            <StarButton
              key={i}
              index={i}
              fill={fillFor(i, display)}
              onHover={(half) => setHover(i - 1 + half)}
              onClick={(half) => setValue(String(i - 1 + half))}
              size={STAR_PX}
            />
          ))}
        </div>
        <span className="bhc-rating-field__readout">
          {numericValue > 0 ? `${numericValue} / 5` : 'No rating'}
        </span>
        {numericValue > 0 ? (
          <button
            type="button"
            className="bhc-rating-field__clear"
            onClick={() => {
              setValue('')
              setHover(null)
            }}
            aria-label="Clear rating"
            title="Clear rating"
          >
            ×
          </button>
        ) : null}
      </div>
      {field?.admin?.description ? (
        <p className="field-description">{field.admin.description as string}</p>
      ) : null}
    </div>
  )
}

function fillFor(index: number, value: number): 'full' | 'half' | 'empty' {
  if (value >= index) return 'full'
  if (value >= index - 0.5) return 'half'
  return 'empty'
}

function StarButton({
  index,
  fill,
  onHover,
  onClick,
  size,
}: {
  index: number
  fill: 'full' | 'half' | 'empty'
  onHover: (half: 0.5 | 1) => void
  onClick: (half: 0.5 | 1) => void
  size: number
}) {
  const ref = useRef<HTMLButtonElement>(null)

  const half = (e: React.MouseEvent<HTMLButtonElement>): 0.5 | 1 => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return 1
    return e.clientX - rect.left < rect.width / 2 ? 0.5 : 1
  }

  const gradId = `bhc-rating-half-${index}`

  return (
    <button
      ref={ref}
      type="button"
      className="bhc-rating-field__star"
      onMouseMove={(e) => onHover(half(e))}
      onClick={(e) => onClick(half(e))}
      style={{ width: size, height: size }}
      aria-label={`${index} star${index === 1 ? '' : 's'}`}
    >
      <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={gradId}>
            <stop offset="50%" stopColor="var(--color-brass, #B08D57)" />
            <stop
              offset="50%"
              stopColor="color-mix(in srgb, var(--theme-text) 25%, transparent)"
            />
          </linearGradient>
        </defs>
        <path
          d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.78l-5.2 2.72.99-5.78-4.21-4.1 5.82-.85L10 1.5z"
          fill={
            fill === 'full'
              ? 'var(--color-brass, #B08D57)'
              : fill === 'half'
                ? `url(#${gradId})`
                : 'color-mix(in srgb, var(--theme-text) 25%, transparent)'
          }
          stroke="var(--color-brass, #B08D57)"
          strokeWidth="0.5"
        />
      </svg>
    </button>
  )
}
