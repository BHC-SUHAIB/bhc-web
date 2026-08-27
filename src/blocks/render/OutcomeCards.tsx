import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { ArrowRight } from 'lucide-react'
import { TrackedLink } from '@/components/TrackedLink'
import { IconSearch, IconPhoneRing, IconLoop } from '@/components/BrandIcons'
import { phoneHref } from '@/lib/contact'

// Three outcome cards ("Get found" / "Never miss a call" / "Stop doing it by
// hand"): title, blurb, a concrete price line, a CTA into the matching service
// section, and an optional proof link (live site or tel: demo).
//
// Theme enrichment (2026-08): each card gets a photo header + a brass icon
// chip. Art is keyed off the card title (same sentinel spirit as the audit
// tool) so no schema migration is needed; unmatched titles render the classic
// text-only card. Swap in CMS-managed art later by adding an image field.

const CARD_ART: Array<{
  match: RegExp
  src: string
  alt: string
  Icon: typeof IconSearch
}> = [
  {
    match: /found/i,
    src: 'https://bhc-media.nyc3.cdn.digitaloceanspaces.com/new-home-v3.png',
    alt: 'A fast client website built by Black Hart',
    Icon: IconSearch,
  },
  {
    match: /call/i,
    src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=75',
    alt: 'Inside a small retail storefront',
    Icon: IconPhoneRing,
  },
  {
    match: /hand/i,
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=75',
    alt: 'Paperwork and planning documents on a desk',
    Icon: IconLoop,
  },
]

export type OutcomeCardsProps = {
  eyebrow?: string | null
  headline?: string | null
  cards?: Array<{
    title?: string | null
    blurb?: string | null
    priceLine?: string | null
    href?: string | null
    ctaLabel?: string | null
    demoHref?: string | null
    demoLabel?: string | null
  }> | null
}

export function OutcomeCards(b: OutcomeCardsProps) {
  const cards = (b.cards ?? []).filter((c) => c?.title)
  if (cards.length === 0) return null

  return (
    <section className="section">
      <Container size="xl">
        <div className="section-head">
          {b.eyebrow ? (
            <span className="eyebrow eyebrow-row">
              <span className="rule" />
              {b.eyebrow}
            </span>
          ) : null}
          {b.headline ? <h2>{b.headline}</h2> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-3" data-reveal-stagger>
          {cards.map((c, i) => {
            const isTelDemo = /^tel:/i.test(c.demoHref ?? '')
            const demoHref = isTelDemo ? (phoneHref(c.demoHref!.replace(/^tel:/i, '')) ?? c.demoHref) : c.demoHref
            const art = CARD_ART.find((a) => a.match.test(c.title ?? ''))
            return (
              <div
                key={i}
                className="group relative p-7 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-brass)]"
              >
                {art ? (
                  <div className="oc-thumb">
                    <Image
                      src={art.src}
                      alt={art.alt}
                      width={640}
                      height={360}
                      sizes="(min-width:768px) 33vw, 100vw"
                      quality={60}
                    />
                    <span className="oc-chip" aria-hidden>
                      <art.Icon />
                    </span>
                  </div>
                ) : null}
                <h3 className="font-serif font-semibold text-[22px] mb-2.5">{c.title}</h3>
                {c.blurb ? (
                  <p className="text-[14.5px] leading-[1.55] text-[var(--color-fg-muted)]">{c.blurb}</p>
                ) : null}
                {c.priceLine ? (
                  <p className="mt-4 font-mono text-[12px] tracking-[0.04em] text-[var(--color-brass-text)]">
                    {c.priceLine}
                  </p>
                ) : null}
                <div className="mt-auto pt-6 flex flex-col gap-2.5">
                  {c.href && c.ctaLabel ? (
                    <Link
                      href={c.href}
                      className="inline-flex items-center gap-2 font-semibold text-[15px] text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors"
                    >
                      {c.ctaLabel}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                  {demoHref && c.demoLabel ? (
                    isTelDemo ? (
                      <TrackedLink
                        href={demoHref}
                        trackEvent="phone_click"
                        trackLocation="outcome_card"
                        className="text-[13.5px] text-[var(--color-fg-muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-brass)] transition-colors"
                      >
                        {c.demoLabel}
                      </TrackedLink>
                    ) : (
                      <Link
                        href={demoHref}
                        className="text-[13.5px] text-[var(--color-fg-muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-brass)] transition-colors"
                      >
                        {c.demoLabel}
                      </Link>
                    )
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
