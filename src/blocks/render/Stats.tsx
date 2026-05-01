import { Container } from '@/components/Container'
import { cn } from '@/lib/utils'
import type { StatsBlock } from '@/payload-types'

export function Stats(b: StatsBlock) {
  const count = b.items?.length ?? 0
  const gridCols =
    count <= 1 ? 'grid-cols-1' :
    count === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    count === 3 ? 'grid-cols-1 sm:grid-cols-3' :
    'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
  return (
    <section className="py-10 sm:py-14">
      <Container size="xl">
        {b.eyebrow || b.headline ? (
          <div className="max-w-2xl mb-10">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
                {b.eyebrow}
              </p>
            ) : null}
            {b.headline ? (
              <h2 className="font-serif font-semibold text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.15] tracking-[-0.015em]">
                {b.headline}
              </h2>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            'grid gap-px bg-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)]',
            gridCols,
          )}
        >
          {b.items?.map((s, i) => (
            <div key={i} className="bg-[var(--color-bg)] p-7">
              <div className="font-serif font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.025em] leading-none">
                {s.value}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
                {s.label}
              </div>
              {s.description ? (
                <p className="mt-3 text-[13px] text-[var(--color-fg-muted)] leading-[1.5]">{s.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
