import Link from 'next/link'
import { Container } from '@/components/Container'
import type { FoundingClientBlock } from '@/payload-types'

// Founding-client banner: a temporary, time-bound discount mechanism that
// trades price for testimonials and case studies.
//
// The spot counter ("2 / 5 founding spots remaining") reads from the block's
// own spotsTotal / spotsRemaining fields. There's no real-time data source, so
// it renders statically — update spotsRemaining in the CMS as clients sign up.
// (An earlier version dropped the counter entirely over the "stale counter
// signals nobody's biting" concern; the Warm Mono design reinstates it as a
// scarcity rail, but kept fully editor-controlled.)

export async function FoundingClient(b: FoundingClientBlock) {
  const offers = b.offers ?? []

  // An offer's priceFounding is "monetary" when it starts with "$". For
  // non-monetary lead prices like "Free", the side-by-side strikethrough
  // retail price reads as "Free is the new price" — misleading. Drop the
  // strikethrough in that case and let the savings line carry the offer.
  const isMonetary = (price: string | null | undefined) =>
    typeof price === 'string' && price.trim().startsWith('$')

  // Spots rail. Clamp to sane bounds so a bad CMS value can't render negative
  // dots or a remaining count larger than the cohort.
  const total = Math.max(0, Math.round(b.spotsTotal ?? 5))
  const remaining = Math.max(0, Math.min(total, Math.round(b.spotsRemaining ?? total)))
  const filled = total - remaining // dots already claimed

  return (
    <section className="section-tight">
      <Container size="xl">
        <div className="founding">
          <div className="founding-grid">
            <div>
              {b.eyebrow ? <span className="eyebrow">{b.eyebrow}</span> : null}
              <h2>{b.headline}</h2>
              {b.description ? <p>{b.description}</p> : null}

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
              <div className="spot-dots">
                {Array.from({ length: total }).map((_, i) => (
                  <i key={i} className={i < filled ? 'filled' : undefined} />
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
              <div className="spot-k">Founding spots remaining</div>
              {b.cta?.label && b.cta?.href ? (
                <Link href={b.cta.href} className="btn btn-brass btn-md">
                  {b.cta.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
