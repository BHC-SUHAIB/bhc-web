import { Container } from '@/components/Container'
import { Globe, Search, Smartphone, Server, Sparkles, Zap, Shield, Code, Lightbulb } from 'lucide-react'
import type { ServicesBlock } from '@/payload-types'

const icons = { globe: Globe, search: Search, smartphone: Smartphone, server: Server, sparkles: Sparkles, zap: Zap, shield: Shield, code: Code, lightbulb: Lightbulb } as const

export function Services(b: ServicesBlock) {
  return (
    <section className="py-20 sm:py-24">
      <Container size="xl">
        <div className="max-w-2xl mb-14">
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">
              {b.eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-5 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
              {b.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {b.items?.map((item, i) => {
            const Icon = item.icon ? icons[item.icon as keyof typeof icons] : null
            return (
              <div
                key={i}
                className="p-7 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-fg-muted)] transition-colors"
              >
                {Icon ? (
                  <div className="inline-flex p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] mb-5">
                    <Icon className="size-5 text-[var(--color-brass)]" />
                  </div>
                ) : null}
                <h3 className="font-serif font-semibold text-[20px] leading-[1.2] mb-2">{item.title}</h3>
                {item.description ? (
                  <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">
                    {item.description}
                  </p>
                ) : null}
                {item.bullets && item.bullets.length > 0 ? (
                  <ul className="mt-5 space-y-1.5 text-[13px] text-[var(--color-fg-muted)]">
                    {item.bullets.map((bl, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-[var(--color-brass)] mt-[3px]">&#8250;</span>
                        <span>{bl.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
