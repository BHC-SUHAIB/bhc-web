import React from 'react'
import { Container } from '@/components/Container'
import { cn } from '@/lib/utils'
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

        <TestimonialsCarousel items={items} />
      </Container>
    </section>
  )
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
