import { Container } from '@/components/Container'
import { Globe, Search, Smartphone, Server, Sparkles, Zap, Shield, Code, Lightbulb } from 'lucide-react'
import { PdfDownloadLink } from './PdfDownloadLink'
import type { ServicesBlock } from '@/payload-types'

const icons = { globe: Globe, search: Search, smartphone: Smartphone, server: Server, sparkles: Sparkles, zap: Zap, shield: Shield, code: Code, lightbulb: Lightbulb } as const

export function Services(b: ServicesBlock) {
  return (
    <section className="py-12 sm:py-16">
      <Container size="xl">
        <div className="max-w-2xl mb-10">
          {b.eyebrow ? (
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-3">
              {b.eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
            {b.headline}
          </h2>
          {b.description ? (
            <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
              {b.description}
            </p>
          ) : null}
        </div>

        <div
          className={
            // 1 col on mobile, 2 cols at sm, then split lg by item count:
            //   3 items → 3 across (fills row cleanly, no empty column)
            //   4 items → 4 across (no widow row)
            //   5-6 items → 3 across (clean 2-row grid)
            //   7+ → 4 across (compact)
            (b.items?.length ?? 0) === 3
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : (b.items?.length ?? 0) <= 4
                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
                : (b.items?.length ?? 0) <= 6
                  ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
          }
        >
          {b.items?.map((item, i) => {
            const Icon = item.icon ? icons[item.icon as keyof typeof icons] : null
            return (
              <div
                key={i}
                // `flex flex-col h-full` lets us pin the download CTA to the
                // bottom with `mt-auto`. `items-start` prevents the icon
                // container from stretching to the card width (default
                // align-items in a flex column is `stretch` — without this
                // the small inline-flex icon chip gets stretched into a
                // full-width pill).
                className="group flex flex-col items-start h-full p-7 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-brass)] hover:bg-[var(--color-surface-raised)] hover:shadow-[0_14px_30px_-18px_color-mix(in_srgb,var(--color-ink)_35%,transparent)]"
              >
                {Icon ? (
                  <div className="inline-flex p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] mb-5">
                    <Icon className="size-5 text-[var(--color-brass)]" />
                  </div>
                ) : null}
                <h3 className="font-serif font-semibold text-[20px] leading-[1.2] mb-2">{item.title}</h3>
                {item.description ? (
                  <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)] mb-3">
                    {item.description}
                  </p>
                ) : null}
                {item.bullets && item.bullets.length > 0 ? (
                  <ul className="space-y-1.5 text-[13px] text-[var(--color-fg-muted)]">
                    {item.bullets.map((bl, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-[var(--color-brass)] mt-[3px]">&#8250;</span>
                        <span>{bl.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {item.downloadHref ? (
                  // `mt-auto` pins to the bottom of the flex card. `w-full`
                  // is needed because the parent uses `items-start` (which
                  // would otherwise leave this block at its natural width).
                  // pt-8 puts a generous gap between the bullets above and
                  // the divider; pt-3 keeps the link tight to the divider.
                  <div className="mt-auto w-full pt-8">
                    <div className="border-t border-[var(--color-border)] pt-3">
                      <PdfDownloadLink
                        href={item.downloadHref}
                        label={item.downloadLabel ?? 'Download the one-pager'}
                        slug={item.downloadHref.split('/').pop() ?? 'service'}
                        location="services_card"
                        variant="ghost"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
