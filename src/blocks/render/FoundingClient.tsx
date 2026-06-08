import Link from 'next/link'
import { Container } from '@/components/Container'
import { relabelDiscount, toContactAnchor } from '@/lib/redesign'
import type { FoundingClientBlock } from '@/payload-types'

// Discounted-client banner: a temporary, time-bound discount that trades price
// for testimonials and case studies.
//
// The spot rail reads from the block's own spotsTotal / spotsRemaining fields
// (edit them in the CMS as clients sign up). Brass dots = spots still available,
// so going 5/5 → 4/5 unfills one dot. "Founding" wording is relabeled to
// "Discounted" at render per the 2026-06 revision.

export async function FoundingClient(b: FoundingClientBlock) {
  const offers = b.offers ?? []

  const isMonetary = (price: string | null | undefined) =>
    typeof price === 'string' && price.trim().startsWith('$')

  // Clamp to sane bounds so a bad CMS value can't render negative/oversized.
  const total = Math.max(0, Math.round(b.spotsTotal ?? 5))
  const remaining = Math.max(0, Math.min(total, Math.round(b.spotsRemaining ?? total)))

  return (
    <section className="section-tight">
      <Container size="xl">
        <div className="founding">
          <div className="founding-grid">
            <div>
              {b.eyebrow ? <span className="eyebrow">{relabelDiscount(b.eyebrow)}</span> : null}
              <h2>{relabelDiscount(b.headline)}</h2>
              {b.description ? <p>{relabelDiscount(b.description)}</p> : null}

              {offers.length > 0 ? (
                <div className="offer-list">
                  {offers.map((o, i) => (
                    <div key={i} className="offer-row">
                      <span className="o-name">{o.name}</span>
                      <span className="o-price">
                        {o.priceRetail && isMonetary(o.priceFounding) ? <s>{o.priceRetail}</s> : null}
                        {o.priceFounding}
                        {o.savings ? <span className="o-save"> {o.savings}</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="spots">
              {/* Brass dots = spots still available (filled = remaining). */}
              <div className="spot-dots">
                {Array.from({ length: total }).map((_, i) => (
                  <i key={i} className={i < remaining ? 'filled' : undefined} />
                ))}
              </div>
              <div className="spot-num">
                <em>{remaining}</em>
                <span
                  style={{
                    color: 'color-mix(in srgb, var(--band-fg) 55%, var(--band-bg))',
                    fontSize: '1.6rem',
                  }}
                >
                  {' '}/ {total}
                </span>
              </div>
              <div className="spot-k">{relabelDiscount('Founding spots remaining')}</div>
              {b.cta?.label && b.cta?.href ? (
                <Link href={toContactAnchor(b.cta.href)} className="btn btn-brass btn-md">
                  {relabelDiscount(b.cta.label)}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
