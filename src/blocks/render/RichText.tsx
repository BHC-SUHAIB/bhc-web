import Image from 'next/image'
import { Container } from '@/components/Container'
import { RichTextRenderer } from './RichTextRenderer'
import { cn } from '@/lib/utils'
import type { RichTextBlock, Media } from '@/payload-types'

const innerWidthCls = (size: 'prose' | 'medium' | 'wide'): string => {
  if (size === 'wide') return 'max-w-none'
  if (size === 'medium') return 'max-w-[48rem] mx-auto'
  return 'max-w-[42rem] mx-auto'
}

// About-page bio headshot lives in the repo; the CMS "Who you'll work with"
// block doesn't reference it (and dev content is sync-locked), so we default
// it here. Replace by attaching an image to that block in the CMS when ready.
const ABOUT_BIO_PORTRAIT = '/seed-assets/about/suhaib-headshot.jpg'

export function RichText(b: RichTextBlock) {
  const size = (b.maxWidth ?? 'prose') as 'prose' | 'medium' | 'wide'
  const eyebrowLower = (b.eyebrow ?? '').toLowerCase()
  const isBio = eyebrowLower.includes('work with')
  const isMission = eyebrowLower.includes('mission')

  const img = typeof b.image === 'object' ? (b.image as Media | null) : null
  const imageUrlRaw = img?.url ?? b.imageUrl ?? null
  // The About bio's CMS upload references a Spaces CDN file that isn't reliably
  // served on dev (fails to fetch), so the portrait came up blank. Always use
  // the in-repo headshot for the bio — sync-proof and fast (optimized to ~75KB).
  const imageUrl = isBio ? ABOUT_BIO_PORTRAIT : imageUrlRaw
  const hasImage = !!imageUrl
  const focus = (b.imageFocus as 'face' | 'center' | undefined) ?? 'face'
  const variant = (b.variant as 'default' | 'lede' | 'card' | undefined) ?? 'default'
  const imgObjectClass = focus === 'face' ? 'object-cover object-top' : 'object-cover object-center'

  // "Our mission" reads wider per the 2026-06 revision (tighter side margins).
  const inner = isMission ? 'max-w-[56rem] mx-auto' : innerWidthCls(size)
  const proseCls = cn('prose-content text-[17px] leading-[1.6]', inner)
  const containerSize = isBio || isMission ? 'lg' : size === 'wide' ? 'xl' : size === 'medium' ? 'md' : 'sm'

  return (
    <section id={(b as { anchorId?: string | null }).anchorId || undefined} className="py-10 sm:py-14 scroll-mt-[73px]">
      <Container size={containerSize}>
        <style>{`
          .prose-content p { margin: 0 0 1.1em; }
          .prose-content h2 { font-family: var(--font-serif); font-weight: 600; font-size: 1.8em; margin: 2em 0 0.5em; letter-spacing: -0.02em; }
          .prose-content h2:first-child { margin-top: 0; }
          .prose-content h3 { font-weight: 600; font-size: 1.3em; margin: 1.8em 0 0.4em; letter-spacing: -0.015em; }
          .prose-content ul, .prose-content ol { margin: 0 0 1.2em; padding-left: 1.5em; }
          .prose-content li { margin: 0.3em 0; }
          .prose-content blockquote { margin: 1.5em 0; padding-left: 1.2em; border-left: 3px solid var(--color-brass); font-family: var(--font-serif); font-style: italic; color: var(--color-fg-muted); }
          .prose-content a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 3px; }
          .prose-content a:hover { color: var(--color-brass); }
          .lede-content { font-family: var(--font-serif); font-weight: 500; font-size: clamp(1.2rem, 1.7vw, 1.4rem); line-height: 1.45; letter-spacing: -0.01em; color: var(--color-fg); }
          .lede-content p { margin: 0 0 0.9em; }
          .lede-content p:last-child { margin-bottom: 0; }
          .lede-content em { font-style: italic; color: var(--color-brass-dark); }
          .card-content p { margin: 0 0 1em; }
          .card-content p:last-child { margin-bottom: 0; }
          .card-content h2 { font-family: var(--font-serif); font-weight: 600; font-size: 1.65em; letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 0.6em; }
          .card-content h2:not(:first-child) { margin-top: 1.4em; }
          /* When the card has an eyebrow, the content's leading h2 duplicates
             it (e.g. About's "How we build") - keep only the styled eyebrow.
             first-of-type, not first-child: the eyebrow renders before it. */
          .card-has-eyebrow .card-content > h2:first-of-type { display: none; }
        `}</style>

        {isBio ? (
          /* "Who you'll work with" — portrait + bio, two columns on desktop. */
          <div className="grid gap-8 sm:gap-12 md:grid-cols-[260px_1fr] md:items-center max-w-5xl mx-auto">
            <div className="relative w-[200px] sm:w-[240px] md:w-full aspect-[4/5] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border-strong)] shadow-[0_30px_60px_-36px_rgba(var(--shadow-color),0.5)] mx-auto md:mx-0">
              <Image
                src={imageUrl as string}
                alt={(img?.alt as string) || 'Suhaib Chaudhry, founder of Black Hart Consulting'}
                fill
                className={imgObjectClass}
                sizes="(min-width:768px) 260px, 240px"
                // Already a lean 75KB in /public — serve it raw so it doesn't
                // depend on the production image optimizer (which fails for this
                // local file on the dev droplet's image cache).
                unoptimized
              />
            </div>
            <div>
              {b.eyebrow ? (
                <span className="eyebrow eyebrow-row mb-4">
                  <span className="rule" />
                  {b.eyebrow}
                </span>
              ) : null}
              <div className="prose-content text-[17px] leading-[1.65] mt-3">
                <RichTextRenderer content={b.content} />
              </div>
            </div>
          </div>
        ) : variant === 'lede' && eyebrowLower.includes('why our prices') ? (
          /* Theme enrichment (2026-08): the "Why our prices are low" figure
             gets the founder portrait beside it. The section's central claim
             is "a senior developer reviews every line", so we show the
             developer. Same in-repo headshot as the About bio (sync-proof,
             ~75KB). The right column keeps the block's live lede styling. */
          <div className="why-grid max-w-5xl mx-auto">
            <figure className="why-portrait reveal-up">
              <Image
                src={ABOUT_BIO_PORTRAIT}
                alt="Suhaib Chaudhry, founder of Black Hart Consulting"
                fill
                className="object-cover"
                sizes="(min-width:860px) 340px, 100vw"
                unoptimized
              />
              <figcaption>
                <strong>Suhaib Chaudhry</strong>
                The senior developer who reviews every line.
              </figcaption>
            </figure>
            <figure className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] p-7 sm:p-10 shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--color-ink)_40%,transparent)] reveal-up">
              {/* 2026-08 punch list round 2: heading styled as the standard
                  section eyebrow (brass rule + mono caps), matching "What we
                  do" / "How we work"; body stays a regular paragraph. */}
              <span className="eyebrow eyebrow-row mb-4">
                <span className="rule" />
                {b.eyebrow}
              </span>
              <div className="card-content text-[17px] leading-[1.65] text-[var(--color-fg)] mt-4">
                <RichTextRenderer content={b.content} />
              </div>
            </figure>
          </div>
        ) : variant === 'lede' ? (
          <div className={inner}>
            <figure className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] p-7 sm:p-10 shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--color-ink)_40%,transparent)]">
              <span className="eyebrow eyebrow-row mb-4">
                <span className="rule" />
                {b.eyebrow ?? 'Our mission'}
              </span>
              <div className="card-content text-[17px] leading-[1.65] text-[var(--color-fg)] mt-4">
                <RichTextRenderer content={b.content} />
              </div>
            </figure>
          </div>
        ) : variant === 'card' ? (
          <div className={cn(inner, b.eyebrow && 'card-has-eyebrow')}>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9 card-content text-[16px] leading-[1.6]">
              {b.eyebrow ? (
                /* Standard section-eyebrow treatment (rule + mono caps),
                   matching "Who you'll work with" etc. (2026-08 round 2). */
                <span className="eyebrow eyebrow-row mb-4">
                  <span className="rule" />
                  {b.eyebrow}
                </span>
              ) : null}
              <RichTextRenderer content={b.content} />
            </div>
          </div>
        ) : hasImage ? (
          <div className={inner}>
            {b.eyebrow ? (
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-fg-muted)] mb-6 text-center">{b.eyebrow}</p>
            ) : null}
            <div className="relative aspect-square w-[180px] sm:w-[200px] rounded-full overflow-hidden border-2 border-[var(--color-brass)] shadow-[0_18px_40px_-22px_color-mix(in_srgb,var(--color-ink)_45%,transparent)] mx-auto mb-8">
              <Image src={imageUrl as string} alt={(img?.alt as string) ?? ''} fill className={imgObjectClass} sizes="(min-width:640px) 200px, 180px" />
            </div>
            <div className="prose-content text-[17px] leading-[1.6]">
              <RichTextRenderer content={b.content} />
            </div>
          </div>
        ) : (
          <div className={proseCls}>
            {b.eyebrow ? (
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-fg-muted)] mb-4">{b.eyebrow}</p>
            ) : null}
            <RichTextRenderer content={b.content} />
          </div>
        )}
      </Container>
    </section>
  )
}
