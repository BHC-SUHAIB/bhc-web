import { Container } from '@/components/Container'
import { Phone } from 'lucide-react'
import { TrackedLink } from '@/components/TrackedLink'
import { phoneHref } from '@/lib/contact'

// "Call our front desk" demo band: a large tel: link plus a short "try asking
// it" list. The number is CMS-authored per block (the live demo line).

export type PhoneDemoProps = {
  eyebrow?: string | null
  headline?: string | null
  body?: string | null
  phoneNumber?: string | null
  phoneLabel?: string | null
  bullets?: Array<{ label?: string | null }> | null
  cta?: { label?: string | null; href?: string | null } | null
}

export function PhoneDemo(b: PhoneDemoProps) {
  const tel = phoneHref(b.phoneNumber)
  if (!b.phoneNumber || !tel) return null
  const bullets = (b.bullets ?? []).filter((x) => x?.label)

  return (
    <section className="section surface scroll-mt-[73px]" id="phone-demo">
      <Container size="xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="section-head mb-0">
              {b.eyebrow ? (
                <span className="eyebrow eyebrow-row">
                  <span className="rule" />
                  {b.eyebrow}
                </span>
              ) : null}
              {b.headline ? <h2>{b.headline}</h2> : null}
              {b.body ? <p className="lede">{b.body}</p> : null}
            </div>
            {bullets.length > 0 ? (
              <ul className="mt-6 space-y-3 text-[15px]">
                {bullets.map((x, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span
                      aria-hidden
                      className="mt-[7px] size-1.5 rounded-full bg-[var(--color-brass)] shrink-0"
                    />
                    <span>{x.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 sm:p-10 text-center">
            {b.phoneLabel ? (
              <p className="inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-brass-text)] mb-4">
                {/* Live-line pulse: this number is genuinely answered around
                    the clock, so the dot conveys real state, not decoration. */}
                <span className="pulse-dot" aria-hidden />
                {b.phoneLabel}
              </p>
            ) : null}
            <TrackedLink
              href={tel}
              trackEvent="phone_click"
              trackLocation="phone_demo"
              className="inline-flex items-center gap-3 font-serif font-semibold text-[clamp(1.75rem,4vw,2.75rem)] tracking-[-0.02em] text-[var(--color-fg)] hover:text-[var(--color-brass)] transition-colors"
            >
              <Phone aria-hidden className="size-7 text-[var(--color-brass)]" />
              {b.phoneNumber}
            </TrackedLink>
            <p className="mt-3 text-[13px] text-[var(--color-fg-muted)]">
              Answered around the clock. It will text you a summary afterward.
            </p>
            {b.cta?.label && b.cta?.href ? (
              <div className="mt-7">
                <TrackedLink
                  href={b.cta.href}
                  trackEvent="cta_click"
                  trackLocation="phone_demo"
                  className="inline-flex items-center justify-center gap-2 font-semibold no-underline tracking-[0.01em] rounded-full select-none whitespace-nowrap transition-[background-color,color,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)] active:translate-y-[1px] h-[48px] px-7 text-[15px] bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)]"
                >
                  {b.cta.label}
                </TrackedLink>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  )
}
