import { Container } from '@/components/Container'
import { getCachedFeaturedFaqs } from '@/lib/payload-cache'
import { FaqAccordion } from './FaqAccordion'
import type { FaqBlock } from '@/payload-types'

// FAQ block with two modes:
//
//   - auto (default) — pulls every featured FAQ from the FAQs collection in
//     the admin. One source of truth: edit a question once and it propagates
//     to every FAQ block on the site. Optional category filter narrows the
//     pool to a single category.
//   - manual — uses the inline `items` array on this specific block. Lets
//     editors override the centralized list per-page when needed (rare).
//
// Auto mode is what 99% of pages should use.

export async function Faq(b: FaqBlock) {
  const mode = b.mode ?? 'auto'
  let items: Array<{ question: string; answer: string }> = []

  if (mode === 'manual' && Array.isArray(b.items) && b.items.length > 0) {
    items = b.items.map((it) => ({ question: it.question, answer: it.answer }))
  } else {
    const all = await getCachedFeaturedFaqs()
    const filtered = b.category && b.category.length > 0 ? all.filter((f) => f.category === b.category) : all
    const cap = b.limit ?? 12
    items = filtered.slice(0, cap).map((f) => ({ question: f.question, answer: f.answer }))
  }

  if (items.length === 0) return null

  // Emit FAQPage structured data so these questions are eligible for rich
  // results. Built from the same items rendered below, so it never drifts.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }

  return (
    <section className="section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <Container size="md">
        {b.eyebrow || b.headline ? (
          <div className="section-head">
            {b.eyebrow ? (
              <span className="eyebrow eyebrow-row">
                <span className="rule" />
                {b.eyebrow}
              </span>
            ) : null}
            {b.headline ? <h2>{b.headline}</h2> : null}
          </div>
        ) : null}

        <FaqAccordion items={items} />
      </Container>
    </section>
  )
}
