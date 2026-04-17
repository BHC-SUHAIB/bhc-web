import { Container } from '@/components/Container'
import type { TestimonialsBlock } from '@/payload-types'

export function Testimonials(b: TestimonialsBlock) {
  return (
    <section className="py-20 sm:py-24">
      <Container size="xl">
        {b.eyebrow || b.headline ? (
          <div className="max-w-2xl mb-12">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">
                {b.eyebrow}
              </p>
            ) : null}
            {b.headline ? (
              <h2 className="font-serif font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em]">
                {b.headline}
              </h2>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {b.items?.map((t, i) => (
            <figure
              key={i}
              className="p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 text-[var(--color-brass)] mb-5" aria-hidden>
                <path d="M7.2 18.7H3l4.2-9h2.4v9H7.2Zm9 0h-4.2l4.2-9h2.4v9h-2.4Z" />
              </svg>
              <blockquote className="text-[16px] leading-[1.6]">&ldquo;{t.quote}&rdquo;</blockquote>
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
