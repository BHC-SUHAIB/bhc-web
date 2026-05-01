import Image from 'next/image'
import { Container } from '@/components/Container'
import { RichTextRenderer } from './RichTextRenderer'
import { cn } from '@/lib/utils'
import type { RichTextBlock, Media } from '@/payload-types'

/* Single source of truth for inner text width.
   Every variant (default, lede, card, with-image) uses the SAME clamp at the
   same maxWidth setting, so stacked rich-text blocks share a vertical reading
   gutter rather than zig-zagging at different indents.
   Using rem (not ch) so font-size changes inside child variants don't shift
   the gutter — every rich-text block at the same maxWidth lines up exactly. */
const innerWidthCls = (size: 'prose' | 'medium' | 'wide'): string => {
  if (size === 'wide') return 'max-w-none'
  if (size === 'medium') return 'max-w-[48rem] mx-auto'
  return 'max-w-[42rem] mx-auto'
}

export function RichText(b: RichTextBlock) {
  const size = (b.maxWidth ?? 'prose') as 'prose' | 'medium' | 'wide'
  const img = typeof b.image === 'object' ? (b.image as Media | null) : null
  const hasImage = !!img?.url
  const focus = (b.imageFocus as 'face' | 'center' | undefined) ?? 'face'
  const variant = (b.variant as 'default' | 'lede' | 'card' | undefined) ?? 'default'
  // Anchor the circular crop to the top of the photo for portrait subjects so
  // the head doesn't get cut off (object-cover defaults to centering both axes).
  const imgObjectClass = focus === 'face' ? 'object-cover object-top' : 'object-cover object-center'

  const inner = innerWidthCls(size)
  const proseCls = cn('prose-content text-[17px] leading-[1.6]', inner)

  return (
    <section className="py-10 sm:py-14">
      <Container size={size === 'wide' ? 'xl' : size === 'medium' ? 'md' : 'sm'}>
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

          /* Lede: an oversized opening statement set inside a brass-bordered
             surface card. The eyebrow + accent rule signal "this is a manifesto,
             not a paragraph". */
          .lede-content { font-family: var(--font-serif); font-weight: 500; font-size: clamp(1.2rem, 1.7vw, 1.4rem); line-height: 1.45; letter-spacing: -0.01em; color: var(--color-fg); }
          .lede-content p { margin: 0 0 0.9em; }
          .lede-content p:last-child { margin-bottom: 0; }
          .lede-content em { font-style: italic; color: var(--color-brass-dark); }

          /* Card: bordered surface that lifts a paragraph or two off the page. */
          .card-content p { margin: 0 0 1em; }
          .card-content p:last-child { margin-bottom: 0; }
        `}</style>

        {variant === 'lede' ? (
          <div className={inner}>
            <figure className="rounded-[var(--radius-lg)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] p-7 sm:p-10 shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--color-ink)_40%,transparent)]">
              <div className="flex items-center gap-3 mb-5">
                <span className="h-[2px] w-8 bg-[var(--color-brass)] rounded-full" aria-hidden />
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-brass-dark)]">
                  Our mission
                </span>
              </div>
              <div className="lede-content">
                <RichTextRenderer content={b.content} />
              </div>
            </figure>
          </div>
        ) : variant === 'card' ? (
          <div className={inner}>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-9 card-content text-[16px] leading-[1.6]">
              <RichTextRenderer content={b.content} />
            </div>
          </div>
        ) : hasImage ? (
          <div className={inner}>
            <div className="relative aspect-square w-[180px] sm:w-[200px] rounded-full overflow-hidden border-2 border-[var(--color-brass)] shadow-[0_18px_40px_-22px_color-mix(in_srgb,var(--color-ink)_45%,transparent)] mx-auto mb-8">
              <Image src={img!.url as string} alt={(img!.alt as string) ?? ''} fill className={imgObjectClass} sizes="(min-width:640px) 200px, 180px" />
            </div>
            <div className="prose-content text-[17px] leading-[1.6]">
              <RichTextRenderer content={b.content} />
            </div>
          </div>
        ) : (
          <div className={proseCls}>
            <RichTextRenderer content={b.content} />
          </div>
        )}
      </Container>
    </section>
  )
}
