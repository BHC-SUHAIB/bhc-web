import Image from 'next/image'
import { Container } from '@/components/Container'
import { Placeholder } from '@/components/Placeholder'
import type { MediaBlockBlock, Media } from '@/payload-types'

export function MediaBlock(b: MediaBlockBlock) {
  const m = typeof b.media === 'object' ? (b.media as Media | null) : null

  const content = (
    <figure className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)]">
      <div className="relative aspect-video bg-[var(--color-surface)]">
        {m?.url ? (
          <Image
            src={m.url as string}
            alt={(m.alt as string) ?? ''}
            fill
            className="object-cover"
            sizes="(min-width:1024px) 60vw, 100vw"
          />
        ) : (
          <Placeholder seed={b.caption ?? 'media'} label={b.caption ?? 'Media'} aspect="video" />
        )}
      </div>
      {b.caption ? (
        <figcaption className="px-5 py-4 text-[13px] text-[var(--color-fg-muted)] bg-[var(--color-surface)] border-t border-[var(--color-border)]">
          {b.caption}
        </figcaption>
      ) : null}
    </figure>
  )

  return (
    <section className="py-12 sm:py-16">
      {b.fullBleed ? (
        <div className="px-6">{content}</div>
      ) : (
        <Container size="lg">{content}</Container>
      )}
    </section>
  )
}
