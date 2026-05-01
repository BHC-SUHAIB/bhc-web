import { Container } from '@/components/Container'
import { cn } from '@/lib/utils'
import { getCachedFeaturedTestimonials } from '@/lib/payload-cache'
import type { TestimonialsBlock, Testimonial } from '@/payload-types'

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value)
  const hasHalf = value - full >= 0.5
  const display = hasHalf ? full + 0.5 : full
  const stars = []
  for (let i = 1; i <= 5; i++) {
    let fill: 'full' | 'half' | 'empty' = 'empty'
    if (i <= full) fill = 'full'
    else if (i === full + 1 && hasHalf) fill = 'half'
    stars.push({ i, fill })
  }
  return (
    <div className="flex items-center gap-0.5 mb-4" role="img" aria-label={`${display} out of 5 stars`}>
      {stars.map(({ i, fill }) => (
        <svg key={i} viewBox="0 0 20 20" className="size-4" aria-hidden>
          <defs>
            <linearGradient id={`star-half-${i}`}>
              <stop offset="50%" stopColor="var(--color-brass)" />
              <stop offset="50%" stopColor="color-mix(in srgb, var(--color-fg-muted) 35%, transparent)" />
            </linearGradient>
          </defs>
          <path
            d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.78l-5.2 2.72.99-5.78-4.21-4.1 5.82-.85L10 1.5z"
            fill={fill === 'full' ? 'var(--color-brass)' : fill === 'half' ? `url(#star-half-${i})` : 'color-mix(in srgb, var(--color-fg-muted) 35%, transparent)'}
          />
        </svg>
      ))}
    </div>
  )
}

export async function Testimonials(b: TestimonialsBlock) {
  let items: Testimonial[] = []
  if (b.mode === 'manual' && Array.isArray(b.testimonials)) {
    items = b.testimonials
      .map((t) => (typeof t === 'object' ? (t as Testimonial) : null))
      .filter(Boolean) as Testimonial[]
  } else {
    items = await getCachedFeaturedTestimonials(b.limit ?? 3)
  }

  if (items.length === 0) return null

  const count = items.length
  const isFew = count <= 2
  const containerSize = isFew ? 'lg' : 'xl'
  const gridCls = count === 1
    ? 'grid grid-cols-1 max-w-2xl mx-auto'
    : count === 2
      ? 'grid gap-6 md:grid-cols-2 max-w-4xl mx-auto'
      : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
  const headerCls = cn('mb-8', isFew ? 'max-w-2xl mx-auto text-center' : 'max-w-2xl')
  const eyebrowCls = cn(
    'font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3',
  )
  return (
    <section className="py-12 sm:py-16">
      <Container size={containerSize}>
        {b.eyebrow || b.headline ? (
          <div className={headerCls}>
            {b.eyebrow ? <p className={eyebrowCls}>{b.eyebrow}</p> : null}
            {b.headline ? (
              <h2 className="font-serif font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em]">
                {b.headline}
              </h2>
            ) : null}
          </div>
        ) : null}
        <div className={gridCls}>
          {items.map((t) => (
            <figure
              key={t.id}
              className={cn(
                'p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]',
                'transition-[transform,border-color,box-shadow] duration-200 ease-out',
                'hover:-translate-y-0.5 hover:border-[var(--color-brass)] hover:shadow-[0_14px_30px_-18px_color-mix(in_srgb,var(--color-ink)_35%,transparent)]',
                count === 1 && 'sm:p-10',
              )}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 text-[var(--color-brass)] mb-5" aria-hidden>
                <path d="M7.2 18.7H3l4.2-9h2.4v9H7.2Zm9 0h-4.2l4.2-9h2.4v9h-2.4Z" />
              </svg>
              {(() => {
                const r = parseFloat(t.rating ?? '')
                return Number.isFinite(r) && r > 0 ? <StarRating value={r} /> : null
              })()}
              <blockquote className={cn('leading-[1.6]', count === 1 ? 'text-[19px] sm:text-[20px]' : 'text-[16px]')}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-[var(--color-border)]">
                <div className="font-semibold text-[14px]">{t.author}</div>
                {(t.role || t.company) && (
                  <div className="text-[12px] text-[var(--color-fg-muted)]">
                    {[t.role, t.company].filter(Boolean).join(' · ')}
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  )
}
