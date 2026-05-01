import { Container } from '@/components/Container'
import { cn } from '@/lib/utils'
import type { TestimonialsBlock } from '@/payload-types'

export function Testimonials(b: TestimonialsBlock) {
  const count = b.items?.length ?? 0
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
          {b.items?.map((t, i) => (
            <figure
              key={i}
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
