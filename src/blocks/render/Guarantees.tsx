import { Container } from '@/components/Container'
import { IconEye, IconShield, IconClock } from '@/components/BrandIcons'

// Per-promise custom icons: see-before-you-pay / score-in-writing / late-free.
// Falls back to the shield for any 4th+ item.
const GUARANTEE_ICONS = [IconEye, IconShield, IconClock]

// The three written promises (title + body columns). Distinct from
// GuaranteeStrip, which is a compact big-value stat strip used on LPs.

export type GuaranteesProps = {
  eyebrow?: string | null
  headline?: string | null
  items?: Array<{ title?: string | null; body?: string | null }> | null
}

export function Guarantees(b: GuaranteesProps) {
  const items = (b.items ?? []).filter((i) => i?.title)
  if (items.length === 0) return null

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
          {items.map((g, i) => {
            const Icon = GUARANTEE_ICONS[i] ?? IconShield
            return (
            <div
              key={i}
              className="group p-7 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-brass)]"
            >
              <div className="inline-flex items-center justify-center size-10 rounded-full bg-[color-mix(in_srgb,var(--color-brass)_16%,var(--color-bg))] mb-4">
                <Icon className="size-5 text-[var(--color-brass)]" />
              </div>
              <h3 className="font-serif font-semibold text-[19px] mb-2">{g.title}</h3>
              {g.body ? (
                <p className="text-[14.5px] leading-[1.55] text-[var(--color-fg-muted)]">{g.body}</p>
              ) : null}
            </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
