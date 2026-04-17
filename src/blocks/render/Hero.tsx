import Image from 'next/image'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Placeholder } from '@/components/Placeholder'
import type { HeroBlock, Media } from '@/payload-types'
import { cn } from '@/lib/utils'

export function Hero(b: HeroBlock) {
  const align = b.align ?? 'left'
  const img = typeof b.image === 'object' ? (b.image as Media | null) : null
  const hasImage = !!img?.url

  return (
    <section className="relative py-20 sm:py-28 md:py-36">
      <Container size="xl">
        <div className={cn(
          'grid gap-12 items-center',
          hasImage ? 'md:grid-cols-[1.1fr_0.9fr]' : 'md:grid-cols-1',
          align === 'center' && !hasImage && 'text-center',
        )}>
          <div className={cn('max-w-3xl', align === 'center' && !hasImage && 'mx-auto')}>
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
                {b.eyebrow}
              </p>
            ) : null}
            <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em]">
              {b.headline}
            </h1>
            {b.subheadline ? (
              <p className="mt-6 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                {b.subheadline}
              </p>
            ) : null}
            {b.ctas && b.ctas.length > 0 ? (
              <div className={cn(
                'mt-10 flex flex-wrap gap-3',
                align === 'center' && !hasImage && 'justify-center',
              )}>
                {b.ctas.map((c, i) => (
                  <Button key={i} href={c.href} variant={c.variant ?? 'primary'} size="lg">
                    {c.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {hasImage ? (
            <div className="relative aspect-[4/5] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)]">
              <Image
                src={img!.url as string}
                alt={(img!.alt as string) ?? ''}
                fill
                className="object-cover"
                sizes="(min-width:768px) 45vw, 100vw"
                priority
              />
            </div>
          ) : img === null && b.image ? (
            <div className="relative aspect-[4/5] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)]">
              <Placeholder seed={b.headline} label={b.eyebrow ?? 'Hero'} aspect="tall" />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
