import React from 'react'
import { Container } from '@/components/Container'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { getCachedFeaturedTestimonials } from '@/lib/payload-cache'
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

  return (
    <section className="py-12 sm:py-16">
      <Container size="lg">
        {b.eyebrow || b.headline ? (
          <div className="mb-10 max-w-2xl mx-auto text-center">
            {b.eyebrow ? (
              <p className={cn(
                'font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3',
              )}>
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

        <div className="quote-grid">
          {items.map((t) => {
            // Stars default to a full 5 when no explicit rating is set, matching
            // the redesign reference. Half-star ratings round to the nearest whole
            // brass star (lucide Star has no half glyph; the grid layout reads
            // cleanest with whole icons).
            const stars = Math.max(0, Math.min(5, Math.round(t.rating ?? 5)))
            const sub = [t.role, t.company].filter(Boolean).join(' · ')
            return (
              <div key={t.id} className="quote">
                <div className="stars" role="img" aria-label={`${stars} out of 5 stars`}>
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} fill="currentColor" strokeWidth={0} aria-hidden />
                  ))}
                </div>
                <blockquote className={cn(t.multiPara && 'testimonial-quote')}>
                  {t.quote}
                </blockquote>
                <div className="by">
                  {/* No avatar field exists on the Testimonial collection, so the
                      `.av` slot renders the author's initial rather than a broken
                      next/image with no source. The `.av` class supplies the 38px
                      brass-tinted circle from the Warm Mono spec; inline styles only
                      add box-centering + type treatment (a <span>, not an <img>). */}
                  <span
                    className="av"
                    aria-hidden
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: 'var(--color-fg-muted)',
                    }}
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
      </Container>
    </section>
  )
}

function initial(name: string): string {
  const c = (name ?? '').trim().charAt(0)
  return c ? c.toUpperCase() : '·'
}

// Split a textarea quote into paragraph blocks. Two-or-more newlines
// start a new <p>; single newlines inside a paragraph become <br>.
// Preserves the typing pattern admins are most likely to use (Enter
// twice between paragraphs) without requiring a richText migration.
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
