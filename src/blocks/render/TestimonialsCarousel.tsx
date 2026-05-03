'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const AUTO_ADVANCE_MS = 6000

type Testimonial = {
  id: string | number
  quote: React.ReactNode
  author: string
  role?: string | null
  company?: string | null
  rating?: number
}

type Props = {
  items: Testimonial[]
}

export function TestimonialsCarousel({ items }: Props) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = items.length
  const liveRegionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (count <= 1 || paused) return
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % count)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [count, paused, active])

  if (count === 0) return null

  const go = (dir: 1 | -1) => {
    setActive((prev) => (prev + dir + count) % count)
  }

  const t = items[active]

  return (
    <div
      className="relative max-w-3xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Client testimonials"
    >
      {count > 1 ? (
        <>
          <CarouselArrow direction="left" onClick={() => go(-1)} />
          <CarouselArrow direction="right" onClick={() => go(1)} />
        </>
      ) : null}

      <figure
        className={cn(
          'p-8 sm:p-12 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]',
          // Fixed height — every slide occupies the same vertical slot so
          // the surrounding page doesn't reflow as the carousel rotates
          // between short and long quotes. Sized to comfortably fit the
          // 400-char `maxLength` enforced on Testimonial.quote.
          'h-[460px] sm:h-[420px] overflow-hidden flex flex-col justify-center',
        )}
        aria-roledescription="slide"
        aria-label={`${active + 1} of ${count}`}
      >
        {t.rating && t.rating > 0 ? <CarouselStars value={t.rating} /> : null}

        <blockquote className="testimonial-quote text-[18px] sm:text-[20px] leading-[1.65] text-center max-w-2xl mx-auto">
          {t.quote}
        </blockquote>

        <figcaption className="mt-8 pt-6 border-t border-[var(--color-border)] text-center max-w-md mx-auto">
          <div className="font-semibold text-[15px]">{t.author}</div>
          {(t.role || t.company) ? (
            <div className="text-[13px] text-[var(--color-fg-muted)] mt-1">
              {[t.role, t.company].filter(Boolean).join(' · ')}
            </div>
          ) : null}
        </figcaption>
      </figure>

      {count > 1 ? (
        <div
          className="mt-6 flex items-center justify-center gap-2"
          aria-label="Testimonial selector"
        >
          {items.map((_, i) => (
            <span
              key={i}
              role="presentation"
              aria-hidden
              className={cn(
                'h-1 rounded-full transition-all duration-300 ease-out',
                i === active
                  ? 'w-8 bg-[var(--color-brass)]'
                  : 'w-4 bg-[color-mix(in_srgb,var(--color-fg-muted)_35%,transparent)]',
              )}
            />
          ))}
        </div>
      ) : null}

      <div ref={liveRegionRef} aria-live="polite" className="sr-only">
        Testimonial {active + 1} of {count} from {t.author}
      </div>
    </div>
  )
}

function CarouselArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'left' ? 'Previous testimonial' : 'Next testimonial'}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 z-10',
        'size-11 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]',
        'flex items-center justify-center text-[var(--color-fg-muted)]',
        'transition-[border-color,color,transform] duration-200 ease-out',
        'hover:border-[var(--color-brass)] hover:text-[var(--color-brass)] hover:scale-105',
        'focus-visible:outline-2 focus-visible:outline-[var(--color-brass)]',
        direction === 'left'
          ? 'left-2 sm:-left-5'
          : 'right-2 sm:-right-5',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}

function CarouselStars({ value }: { value: number }) {
  const full = Math.floor(value)
  const hasHalf = value - full >= 0.5
  const display = hasHalf ? full + 0.5 : full
  const items = []
  for (let i = 1; i <= 5; i++) {
    let fill: 'full' | 'half' | 'empty' = 'empty'
    if (i <= full) fill = 'full'
    else if (i === full + 1 && hasHalf) fill = 'half'
    items.push({ i, fill })
  }
  const SIZE = 48
  return (
    <div
      className="flex items-center justify-center gap-1.5 mb-6"
      role="img"
      aria-label={`${display} out of 5 stars`}
    >
      {items.map(({ i, fill }) => {
        const gradId = `bhc-tstar-${i}`
        return (
          <svg key={i} viewBox="0 0 20 20" width={SIZE} height={SIZE} aria-hidden>
            <defs>
              <linearGradient id={gradId}>
                <stop offset="50%" stopColor="var(--color-brass)" />
                <stop offset="50%" stopColor="color-mix(in srgb, var(--color-fg-muted) 30%, transparent)" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.78l-5.2 2.72.99-5.78-4.21-4.1 5.82-.85L10 1.5z"
              fill={
                fill === 'full'
                  ? 'var(--color-brass)'
                  : fill === 'half'
                    ? `url(#${gradId})`
                    : 'color-mix(in srgb, var(--color-fg-muted) 30%, transparent)'
              }
              stroke="var(--color-brass)"
              strokeWidth="0.5"
            />
          </svg>
        )
      })}
    </div>
  )
}
