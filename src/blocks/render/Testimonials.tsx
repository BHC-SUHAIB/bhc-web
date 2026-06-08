import React from 'react'
import { Container } from '@/components/Container'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { getCachedFeaturedTestimonials } from '@/lib/payload-cache'
import { TestimonialsCarousel } from './TestimonialsCarousel'
import type { TestimonialsBlock, Testimonial } from '@/payload-types'

export async function Testimonials(b: TestimonialsBlock) {
  let raw: Testimonial[] = []
  if (b.mode === 'manual' && Array.isArray(b.testimonials)) {
    raw = b.testimonials
      .map((t) => (typeof t === 'object' ? (t as Testimonial) : null))
      .filter(Boolean) as Testimonial[]
  } else {
    raw = await getCachedFeaturedTestimonials(b.limit ?? 3)
  }

  if (raw.length === 0) return null

  const items = raw.map((t) => ({
    id: t.id,
    author: t.author,
    role: t.role,
    company: t.company,
    rating: (() => {
      const r = parseFloat((t.rating as string | undefined) ?? '')
      return Number.isFinite(r) && r > 0 ? r : undefined
    })(),
    quote: renderQuote(typeof t.quote === 'string' ? t.quote : ''),
    multiPara: typeof t.quote === 'string'
      ? t.quote.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).length > 1
      : false,
  }))

  const count = items.length
  // 4+ testimonials → looping carousel with arrows. 1–3 → a centered grid that
  // sizes to the number of cards (1 centered, 2 centered, 3 across).
  const useCarousel = count >= 4

  return (
    <section className="py-12 sm:py-16">
      <Container size="lg">
        {b.eyebrow || b.headline ? (
          <div className="mb-10 max-w-2xl mx-auto text-center">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
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

        {useCarousel ? (
          <TestimonialsCarousel
            items={items.map((t) => ({ id: t.id, quote: t.quote, author: t.author, role: t.role, company: t.company, rating: t.rating }))}
          />
        ) : (
          <div
            className={cn(
              'grid gap-5 mx-auto',
              count === 1 ? 'max-w-md' : count === 2 ? 'sm:grid-cols-2 max-w-3xl' : 'sm:grid-cols-2 lg:grid-cols-3 max-w-5xl',
            )}
          >
            {items.map((t) => {
              const stars = Math.max(0, Math.min(5, Math.round(t.rating ?? 5)))
              const sub = [t.role, t.company].filter(Boolean).join(' · ')
              return (
                <div key={t.id} className="quote">
                  <div className="stars" role="img" aria-label={`${stars} out of 5 stars`}>
                    {Array.from({ length: stars }).map((_, i) => (
                      <Star key={i} fill="currentColor" strokeWidth={0} aria-hidden />
                    ))}
                  </div>
                  <blockquote className={cn(t.multiPara && 'testimonial-quote')}>{t.quote}</blockquote>
                  <div className="by">
                    <span
                      className="av"
                      aria-hidden
                      style={{ display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-fg-muted)' }}
                    >
                      {initial(t.author)}
                    </span>
                    <span>
                      <b>{t.author}</b>
                      {sub ? <span>{sub}</span> : null}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </section>
  )
}

function initial(name: string): string {
  const c = (name ?? '').trim().charAt(0)
  return c ? c.toUpperCase() : '·'
}

function renderQuote(quote: string): React.ReactNode {
  const paragraphs = quote.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return null
  return paragraphs.map((para, i) => {
    const lines = para.split('\n')
    return (
      <p key={i}>
        {lines.map((line, j) => (
          <React.Fragment key={j}>
            {line}
            {j < lines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </p>
    )
  })
}
