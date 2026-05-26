/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'
import { ParallaxLayer } from '@/blocks/render/ParallaxLayer'

// Visual mockup A — Heritage warm palette (matches current site) + sans-only
// display (Manrope, no Fraunces). All sections keep their eyebrows so the
// only intentional difference vs. live is the font change + the multi-layer
// parallax on the hero and final CTA. Re-wrote 2026-05-27 after dev review
// rejected the dark Boreal palette.

export const metadata: Metadata = {
  title: 'Mockup A · Sans display, current palette',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const heroImg = 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1920&q=80'
const ctaImg = 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80'

const eyebrowCls = 'font-mono text-[11px] tracking-[0.22em] uppercase mb-3 text-[var(--color-brass)]'

export default function MockupAPage() {
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      <Banner label="Mockup A · Heritage palette + sans-only Manrope display · ALL sections keep eyebrows" />

      {/* HERO with multi-layer parallax */}
      <section className="relative isolate overflow-hidden min-h-[100dvh] flex items-center">
        {/* Background image — fast parallax */}
        <ParallaxLayer speed={1.5} className="absolute inset-0 -z-20">
          <img src={heroImg} alt="" className="absolute inset-0 w-full h-[120%] object-cover" />
        </ParallaxLayer>
        {/* Darkening overlay */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(26,23,19,0.78)_0%,rgba(26,23,19,0.55)_40%,rgba(26,23,19,0.92)_100%)]" aria-hidden />
        {/* Foreground decorative blob — slow OPPOSITE parallax for depth */}
        <ParallaxLayer speed={-0.6} className="absolute top-1/3 right-[-10%] -z-5 pointer-events-none w-[60vw] max-w-[700px]">
          <div className="aspect-square rounded-full bg-[var(--color-brass)] opacity-25 blur-[80px]" />
        </ParallaxLayer>

        <div className="relative mx-auto max-w-[1280px] px-6 sm:px-10 py-28 sm:py-36 w-full">
          <p className={eyebrowCls}>Houston Heights · One-person studio</p>
          <h1 className="text-[clamp(2.5rem,5.5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.035em] max-w-3xl text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]">
            Your phone isn&apos;t ringing. Let&apos;s fix the site that&apos;s costing you those calls.
          </h1>
          <p className="mt-6 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.5] max-w-2xl text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
            Heights-local senior developer. Paste your URL for a free written audit, or jump to a $999 founding rebuild that ships in 14 days.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonOnPhoto primary>Get my free audit</ButtonOnPhoto>
            <ButtonOnPhoto>Or book a 30-min call</ButtonOnPhoto>
          </div>
        </div>
      </section>

      {/* STATS — light bg, current site treatment */}
      <section style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-20">
          <p className={eyebrowCls}>What you get</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-6">
            <Stat value="14 days" label="From kickoff to launch" note="Founding clients delivered first." />
            <Stat value="<200KB" label="First-paint JavaScript" note="Fast on the worst phone in your customer base." />
            <Stat value="$0" label="In hidden fees" note="Hosting first month free. No scope creep clauses." />
          </div>
        </div>
      </section>

      {/* AUDIT TOOL */}
      <section style={{ backgroundColor: 'var(--color-surface)' }} className="border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-[840px] px-6 sm:px-10 py-20">
          <p className={eyebrowCls}>PageSpeed audit</p>
          <h2 className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-fg)]">
            How fast is your site, actually?
          </h2>
          <p className="mt-4 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
            Paste your URL. We run the same Lighthouse audit Google uses, then show you all four scores in about 30 seconds. No email required.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              placeholder="yoursite.com"
              className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] text-[15px]"
              readOnly
            />
            <ButtonStandard primary>Run audit</ButtonStandard>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-20">
          <p className={eyebrowCls}>What clients said</p>
          <figure className="max-w-3xl">
            <blockquote className="text-[clamp(1.25rem,1.8vw,1.75rem)] leading-[1.45] font-medium text-[var(--color-fg)]">
              &ldquo;Black Hart rebuilt my site from the ground up. Since launching, clients have a clearer understanding of our value, making sales easier.&rdquo;
            </blockquote>
            <figcaption className="mt-5 text-[14px] text-[var(--color-fg-muted)]">
              <span className="font-semibold text-[var(--color-fg)]">Philip Parmar</span>, Founder · Prometheus Minds
            </figcaption>
          </figure>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ backgroundColor: 'var(--color-surface)' }} className="border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-20">
          <p className={eyebrowCls}>The offer</p>
          <h2 className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] max-w-2xl text-[var(--color-fg)]">
            Two ways to start. Pick the one that fits.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 max-w-4xl">
            <TierCard
              name="Site Health Sprint"
              price="$297"
              note="5-day delivery · pick 3 fixes"
              highlight={false}
              features={['Free 5-minute audit included', '3 specific fixes shipped in 5 days', 'Tested mobile and desktop', '30-day fix guarantee']}
              cta="Start the Sprint"
            />
            <TierCard
              name="Starter Site"
              price="$999"
              priceStrike="$1,950"
              note="founding · 14-day build"
              highlight
              features={['Up to 5 bespoke pages', 'Block-based CMS', 'Technical SEO + LocalBusiness schema', 'Google Business Profile setup', '14-day delivery, guaranteed']}
              cta="Claim a founding spot"
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA with parallax bg */}
      <section className="relative isolate overflow-hidden">
        <ParallaxLayer speed={1.2} className="absolute inset-0 -z-20">
          <img src={ctaImg} alt="" className="absolute inset-0 w-full h-[120%] object-cover" />
        </ParallaxLayer>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(26,23,19,0.85)_0%,rgba(26,23,19,0.7)_50%,rgba(26,23,19,0.92)_100%)]" aria-hidden />
        <ParallaxLayer speed={-0.4} className="absolute bottom-[-20%] left-[-10%] -z-5 pointer-events-none w-[50vw] max-w-[600px]">
          <div className="aspect-square rounded-full bg-[var(--color-brass)] opacity-20 blur-[100px]" />
        </ParallaxLayer>
        <div className="relative mx-auto max-w-[1280px] px-6 sm:px-10 py-24 text-center">
          <p className={eyebrowCls}>Ready when you are</p>
          <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em] max-w-2xl mx-auto text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.7)]">
            Still here? Get the free audit.
          </h2>
          <p className="mt-4 text-[17px] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
            Four scores, in your browser, in 30 seconds. No call required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <ButtonOnPhoto primary>Get my free audit</ButtonOnPhoto>
            <ButtonOnPhoto>Book a 30-min call</ButtonOnPhoto>
          </div>
        </div>
      </section>
    </div>
  )
}

function Banner({ label }: { label: string }) {
  return (
    <div className="text-center text-[12px] font-mono tracking-[0.12em] uppercase py-2 px-4 bg-[var(--color-brass)] text-[var(--color-ink)] relative z-50">
      {label}
    </div>
  )
}

function ButtonStandard({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      className="inline-flex items-center justify-center h-[52px] px-7 rounded-full font-semibold text-[15px] transition-colors"
      style={
        primary
          ? { backgroundColor: 'var(--color-fg)', color: 'var(--color-bg)' }
          : { border: '1px solid var(--color-border-strong)', color: 'var(--color-fg)' }
      }
    >
      {children}
    </button>
  )
}

function ButtonOnPhoto({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      className="inline-flex items-center justify-center h-[52px] px-7 rounded-full font-semibold text-[15px] transition-colors"
      style={
        primary
          ? { backgroundColor: 'var(--color-brass)', color: 'var(--color-ink)' }
          : { backgroundColor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.35)', color: 'white', backdropFilter: 'blur(6px)' }
      }
    >
      {children}
    </button>
  )
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div>
      <div className="text-[clamp(2.5rem,3.5vw,3rem)] font-extrabold leading-none tracking-[-0.02em] text-[var(--color-fg)]">{value}</div>
      <div className="mt-3 font-semibold text-[15px] text-[var(--color-fg)]">{label}</div>
      <p className="mt-1 text-[14px] leading-[1.45] text-[var(--color-fg-muted)]">{note}</p>
    </div>
  )
}

function TierCard({
  name,
  price,
  priceStrike,
  note,
  features,
  cta,
  highlight,
}: {
  name: string
  price: string
  priceStrike?: string
  note: string
  features: string[]
  cta: string
  highlight: boolean
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border p-7"
      style={{
        borderColor: highlight ? 'var(--color-brass)' : 'var(--color-border)',
        backgroundColor: highlight ? 'color-mix(in srgb, var(--color-brass) 8%, var(--color-bg))' : 'var(--color-bg)',
      }}
    >
      {highlight ? (
        <span className="inline-flex font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full mb-4 bg-[var(--color-brass)] text-[var(--color-ink)]">
          Most popular
        </span>
      ) : (
        <span className="block h-7 mb-4" />
      )}
      <h3 className="text-[22px] font-semibold mb-2 text-[var(--color-fg)]">{name}</h3>
      <div className="flex items-baseline gap-3 mb-1">
        <span
          className="text-[44px] font-extrabold leading-none tracking-[-0.02em]"
          style={{ color: highlight ? 'var(--color-brass)' : 'var(--color-fg)' }}
        >
          {price}
        </span>
        {priceStrike ? (
          <span className="text-[22px] line-through text-[var(--color-fg-muted)]">{priceStrike}</span>
        ) : null}
      </div>
      <p className="text-[13.5px] mb-5 text-[var(--color-fg-muted)]">{note}</p>
      <ul className="space-y-2.5 text-[14px] mb-6 text-[var(--color-fg)]">
        {features.map((f, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="text-[var(--color-brass)]">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        className="inline-flex items-center justify-center h-12 px-6 rounded-full font-semibold text-[14.5px] w-full transition-colors"
        style={
          highlight
            ? { backgroundColor: 'var(--color-brass)', color: 'var(--color-ink)' }
            : { border: '1px solid var(--color-border-strong)', color: 'var(--color-fg)' }
        }
      >
        {cta}
      </button>
    </div>
  )
}
