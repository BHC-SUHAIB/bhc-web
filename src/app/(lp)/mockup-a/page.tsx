/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'

// Visual mockup A — palette + sans-only display, same eyebrow rhythm as live.
// Stand-alone hand-rolled JSX so the live components aren't affected. Built
// 2026-05-27 for design A/B review. Delete once a direction is picked.

export const metadata: Metadata = {
  title: 'Mockup A · Boreal palette + sans display',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Boreal dark palette scoped to this page only via inline CSS vars.
const themeStyle: React.CSSProperties = {
  // @ts-expect-error CSS variables as a style object
  '--bg': '#14181A',
  '--fg': '#F1EEE6',
  '--fg-muted': 'rgba(241,238,230,0.65)',
  '--surface': '#1A1F22',
  '--surface-raised': '#202629',
  '--border': 'rgba(241,238,230,0.12)',
  '--brass': '#C9A66B',
  '--forest': '#1F3B2F',
  '--moss': '#4A6B5C',
  backgroundColor: 'var(--bg)',
  color: 'var(--fg)',
  fontFamily: 'var(--font-sans)',
  minHeight: '100dvh',
}

const eyebrow = 'font-mono text-[11px] tracking-[0.22em] uppercase mb-3'
const eyebrowMuted = `${eyebrow}`

export default function MockupAPage() {
  return (
    <div style={themeStyle}>
      <Banner label="Mockup A · Boreal palette + sans-only display · ALL sections keep eyebrows" />

      {/* HERO */}
      <section className="relative isolate overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(60% 80% at 20% 20%, rgba(201,166,107,0.10), transparent 60%), radial-gradient(70% 80% at 80% 100%, rgba(31,59,47,0.55), transparent 60%)' }} />
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-20 sm:py-28 md:py-36">
          <p className={eyebrowMuted} style={{ color: 'var(--brass)' }}>Houston Heights · One-person studio</p>
          <h1 className="text-[clamp(2.5rem,5.5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.035em] max-w-3xl" style={{ color: 'var(--fg)' }}>
            Your phone isn&apos;t ringing. Let&apos;s fix the site that&apos;s costing you those calls.
          </h1>
          <p className="mt-6 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.5] max-w-2xl" style={{ color: 'var(--fg-muted)' }}>
            Heights-local senior developer. Paste your URL for a free written audit, or jump to a $999 founding rebuild that ships in 14 days.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonPrimary>Get my free audit</ButtonPrimary>
            <ButtonGhost>Or book a 30-min call</ButtonGhost>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-16">
          <p className={eyebrowMuted} style={{ color: 'var(--brass)' }}>What you get</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-6">
            <Stat value="14 days" label="From kickoff to launch" note="Founding clients delivered first." />
            <Stat value="<200KB" label="First-paint JavaScript" note="Fast on the worst phone in your customer base." />
            <Stat value="$0" label="In hidden fees" note="Hosting first month free. No scope creep clauses." />
          </div>
        </div>
      </section>

      {/* AUDIT TOOL */}
      <section className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-[840px] px-6 sm:px-10 py-16">
          <p className={eyebrowMuted} style={{ color: 'var(--brass)' }}>PageSpeed audit</p>
          <h2 className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em]" style={{ color: 'var(--fg)' }}>
            How fast is your site, actually?
          </h2>
          <p className="mt-4 text-[17px] leading-[1.55]" style={{ color: 'var(--fg-muted)' }}>
            Paste your URL. We run the same Lighthouse audit Google uses, then show you all four scores in about 30 seconds. No email required.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              placeholder="yoursite.com"
              className="w-full px-4 py-3 rounded-xl border text-[15px]"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--fg)' }}
              readOnly
            />
            <ButtonPrimary>Run audit</ButtonPrimary>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-16">
          <p className={eyebrowMuted} style={{ color: 'var(--brass)' }}>What clients said</p>
          <figure className="max-w-3xl">
            <blockquote className="text-[clamp(1.25rem,1.8vw,1.75rem)] leading-[1.45] font-medium" style={{ color: 'var(--fg)' }}>
              &ldquo;Black Hart rebuilt my site from the ground up. Since launching, clients have a clearer understanding of our value, making sales easier.&rdquo;
            </blockquote>
            <figcaption className="mt-5 text-[14px]" style={{ color: 'var(--fg-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--fg)' }}>Philip Parmar</span>, Founder · Prometheus Minds
            </figcaption>
          </figure>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-16">
          <p className={eyebrowMuted} style={{ color: 'var(--brass)' }}>The offer</p>
          <h2 className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] max-w-2xl" style={{ color: 'var(--fg)' }}>
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

      {/* FINAL CTA */}
      <section className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10 py-20 text-center">
          <p className={eyebrowMuted} style={{ color: 'var(--brass)' }}>Ready when you are</p>
          <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em] max-w-2xl mx-auto" style={{ color: 'var(--fg)' }}>
            Still here? Get the free audit.
          </h2>
          <p className="mt-4 text-[17px]" style={{ color: 'var(--fg-muted)' }}>
            Four scores, in your browser, in 30 seconds. No call required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <ButtonPrimary>Get my free audit</ButtonPrimary>
            <ButtonGhost>Book a 30-min call</ButtonGhost>
          </div>
        </div>
      </section>
    </div>
  )
}

function Banner({ label }: { label: string }) {
  return (
    <div style={{ backgroundColor: '#C9A66B', color: '#14181A' }} className="text-center text-[12px] font-mono tracking-[0.12em] uppercase py-2 px-4">
      {label}
    </div>
  )
}

function ButtonPrimary({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="inline-flex items-center justify-center h-[52px] px-7 rounded-full font-semibold text-[15px] transition-colors"
      style={{ backgroundColor: 'var(--brass)', color: '#14181A' }}
    >
      {children}
    </button>
  )
}

function ButtonGhost({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="inline-flex items-center justify-center h-[52px] px-7 rounded-full font-semibold text-[15px] border transition-colors"
      style={{ borderColor: 'var(--border)', color: 'var(--fg)', backgroundColor: 'transparent' }}
    >
      {children}
    </button>
  )
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div>
      <div className="text-[clamp(2.5rem,3.5vw,3rem)] font-extrabold leading-none tracking-[-0.02em]" style={{ color: 'var(--fg)' }}>{value}</div>
      <div className="mt-3 font-semibold text-[15px]" style={{ color: 'var(--fg)' }}>{label}</div>
      <p className="mt-1 text-[14px] leading-[1.45]" style={{ color: 'var(--fg-muted)' }}>{note}</p>
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
      className="rounded-2xl border p-7"
      style={{
        borderColor: highlight ? 'var(--brass)' : 'var(--border)',
        backgroundColor: highlight ? 'color-mix(in srgb, var(--brass) 8%, var(--surface))' : 'var(--surface)',
      }}
    >
      {highlight ? (
        <span className="inline-flex font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full mb-4" style={{ backgroundColor: 'var(--brass)', color: '#14181A' }}>
          Most popular
        </span>
      ) : (
        <span className="block h-7 mb-4" />
      )}
      <h3 className="text-[22px] font-semibold mb-2" style={{ color: 'var(--fg)' }}>{name}</h3>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[44px] font-extrabold leading-none tracking-[-0.02em]" style={{ color: highlight ? 'var(--brass)' : 'var(--fg)' }}>{price}</span>
        {priceStrike ? <span className="text-[22px] line-through" style={{ color: 'var(--fg-muted)' }}>{priceStrike}</span> : null}
      </div>
      <p className="text-[13.5px] mb-5" style={{ color: 'var(--fg-muted)' }}>{note}</p>
      <ul className="space-y-2.5 text-[14px] mb-6" style={{ color: 'var(--fg)' }}>
        {features.map((f, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span style={{ color: 'var(--brass)' }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        className="inline-flex items-center justify-center h-12 px-6 rounded-full font-semibold text-[14.5px] w-full"
        style={{
          backgroundColor: highlight ? 'var(--brass)' : 'transparent',
          color: highlight ? '#14181A' : 'var(--fg)',
          border: highlight ? 'none' : '1px solid var(--border)',
        }}
      >
        {cta}
      </button>
    </div>
  )
}
