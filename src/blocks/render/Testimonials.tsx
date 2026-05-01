import { Container } from '@/components/Container'
import { cn } from '@/lib/utils'
import { getCachedFeaturedTestimonials } from '@/lib/payload-cache'
import { RichTextRenderer } from './RichTextRenderer'
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

  // Pre-render the rich-text quote on the server, hand React nodes to
  // the client carousel. Keeps the renderer logic out of the client
  // bundle and avoids needing to ship a richText reader to the browser.
  const items = raw.map((t) => ({
    id: t.id,
    author: t.author,
    role: t.role,
    company: t.company,
    rating: (() => {
      const r = parseFloat((t.rating as string | undefined) ?? '')
      return Number.isFinite(r) && r > 0 ? r : undefined
    })(),
    quote: <RichTextRenderer content={t.quote} />,
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
