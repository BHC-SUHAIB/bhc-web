import Image from 'next/image'
import { ShieldCheck, Check, Zap } from 'lucide-react'
import { Container } from '@/components/Container'
import { MobileCta } from '@/components/MobileCta'
import { CountUpStat } from '@/components/CountUpStat'
import { LP_PHONE_DISPLAY } from '@/lib/contact'
import { relabelDiscount } from '@/lib/redesign'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'
import { getCachedPageBySlug, getCachedLandingPageBySlug, getCachedSiteSettings } from '@/lib/payload-cache'
import { SiteAuditTool } from './SiteAuditTool'
import { FoundingClient } from './FoundingClient'
import { Pricing } from './Pricing'
import { Testimonials } from './Testimonials'
import { FaqAccordion } from './FaqAccordion'
import { CalendlyBooking } from './CalendlyBooking'
import { CTA } from './CTA'
import { ExpressLeadSection } from './ExpressLeadSection'

const CALENDLY_URL = 'https://calendly.com/suhaib-blackhartconsulting/discovery-call'
const DEFAULT_HERO_BG = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80'

const FALLBACK_FAQ = [
  { question: "What if I don't like the design?", answer: 'You see a Figma mockup before any code is written. If the mockup is not right, we iterate until it is. The build clock does not start until you approve the direction.' },
  { question: 'Do I own the code?', answer: 'Yes. The code lives in a GitHub repo we hand over on launch. No lock-in — though most clients keep us as their host because it is already optimized.' },
  { question: 'Can you work with my existing brand?', answer: 'Yes. If you have a logo, colors, and fonts, we use them. If not, we recommend a small design system as a $300 add-on.' },
  { question: "What's the next step?", answer: 'Send a note via the form, or book a call. We reply within one business day and send a written proposal within 48 hours of the intro call.' },
]

const STEPS = [
  { n: '01', h: 'Intro call', p: "30 minutes. What you need, what it costs, whether we're a fit." },
  { n: '02', h: 'Design preview', p: 'You approve a Figma mockup before any code is written.' },
  { n: '03', h: 'Build', p: 'The 14-day clock starts. One developer, daily progress.' },
  { n: '04', h: 'Review', p: 'One round of revisions. We tune copy, photos, and details.' },
  { n: '05', h: 'Launch', p: 'Live site, GitHub repo handed over, GBP and schema in place.' },
]

const FALLBACK_FEATURES = [
  '5 bespoke pages designed for your business',
  'Mobile-first, under 200KB JavaScript',
  'Block-based CMS — your team edits every section',
  'Google Business Profile setup + LocalBusiness schema',
  'Contact form + GA4 + conversion tracking pre-wired',
  'First month of hosting free',
  '14-day delivery, guaranteed in writing',
]

/* eslint-disable @typescript-eslint/no-explicit-any */
// Code-composed flagship LP. Layout + interactivity live in code (sync-proof),
// but the editable DATA is pulled from the CMS so it stays correct + in sync
// with the rest of the site: pricing from the Services "Website packages"
// Starter tier, spots from the home "Discounted" banner, hero copy + FAQ from
// the express-website landing-page record.
export async function ExpressLanding() {
  const [homeDoc, servicesDoc, lpDoc, settings] = await Promise.all([
    getCachedPageBySlug('home'),
    getCachedPageBySlug('services'),
    getCachedLandingPageBySlug('express-website'),
    getCachedSiteSettings(),
  ])

  const layoutOf = (d: any): any[] => (d?.layout as any[]) ?? []
  const homeFounding = layoutOf(homeDoc).find((b) => b.blockType === 'foundingClient')
  const svcPricing = layoutOf(servicesDoc).find((b) => b.blockType === 'pricing' && /package/i.test(String(b.eyebrow ?? '')))
  const starterTier = (svcPricing?.tiers as any[] | undefined)?.find((t) => /starter/i.test(String(t.name ?? ''))) ?? null
  const lpHero = layoutOf(lpDoc).find((b) => b.blockType === 'hero')
  const lpFaqBlock = layoutOf(lpDoc).find((b) => b.blockType === 'faq')

  const starterPrice = starterTier?.price ?? '$999'
  const starterOrig = starterTier?.originalPrice ?? '$1,950'
  const heroBg = stripUnsplashFixedWidth(String(lpHero?.backgroundImageUrl || DEFAULT_HERO_BG))
  const heroEyebrow = lpHero?.eyebrow ?? 'Houston Heights · 14-Day Delivery'
  const heroLede = relabelDiscount(
    String(lpHero?.subheadline ?? 'Built by hand, hosted by us, kept fast forever. Discounted pricing for the first 5 Heights small businesses — a lower price in exchange for a review and a case study.'),
  )

  // The offer tier — the actual Services Starter tier, with the CTA pointed at
  // the on-page lead form so visitors stay on the LP.
  const offerTier = {
    ...(starterTier ?? {
      name: 'Starter Site',
      price: starterPrice,
      originalPrice: starterOrig,
      priceNote: 'discounted · 14-day build',
      description: 'A 5-page small business website that handles 90% of what a Heights business needs — mobile-first, fast, and fully editable.',
      features: FALLBACK_FEATURES.map((label) => ({ label, included: true })),
      highlighted: true,
    }),
    highlighted: true,
    cta: { label: 'Claim your discount', href: '#lp-start' },
  }

  // The home banner's Starter offer is stale ($1,495); normalize it to the
  // real Services Starter price so the whole LP reads one number ($999).
  const fixStarter = (offers: any[]) =>
    (offers ?? []).map((o: any) =>
      /starter/i.test(String(o.name ?? '')) ? { ...o, priceFounding: starterPrice, priceRetail: starterOrig, savings: 'Save $951' } : o,
    )
  const foundingProps = homeFounding
    ? { ...homeFounding, offers: fixStarter(homeFounding.offers), cta: { ...(homeFounding.cta ?? {}), label: homeFounding.cta?.label ?? 'Claim a founding spot', href: '#lp-start' } }
    : {
        blockType: 'foundingClient',
        eyebrow: 'Heights Founding Client Pricing',
        headline: 'First 5 small businesses save up to $1,000.',
        description: 'A temporary discount for our first cohort of Heights clients, in exchange for a review and a case study.',
        spotsTotal: 5,
        spotsRemaining: 5,
        offers: [{ name: 'Starter Site', priceFounding: starterPrice, priceRetail: starterOrig, savings: 'Save $951' }],
        cta: { label: 'Claim a founding spot', href: '#lp-start' },
      }

  const faqItems = ((lpFaqBlock?.items as any[] | undefined) ?? FALLBACK_FAQ).map((f: any) => ({
    question: relabelDiscount(String(f.question ?? '')),
    answer: relabelDiscount(String(f.answer ?? '')),
  }))
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  }

  return (
    <div className="lp-pad-bottom">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />

      {/* HERO — full-bleed photo background (matches Services/About/Portfolio) */}
      <section className="hero-photo" aria-label="Express website offer">
        <div className="hp-bg">
          <Image src={heroBg} alt="" fill sizes="100vw" className="object-cover" priority fetchPriority="high" />
        </div>
        <Container size="xl" className="hp-inner">
          <span className="eyebrow eyebrow-row">
            <span className="rule" />
            {heroEyebrow}
          </span>
          <h1>
            A custom small business website. <em>In 14 days.</em> From {starterPrice}.
          </h1>
          <p className="lede">{heroLede}</p>
          <div className="cta-row">
            <a className="btn btn-brass btn-lg" href="#audit">
              Run my free site audit <span aria-hidden>→</span>
            </a>
            <a className="btn btn-onphoto btn-lg" href="#offer">See the deliverables</a>
          </div>
          <div className="trust-row">
            <span className="trust-item"><ShieldCheck aria-hidden /> Fixed price, in writing</span>
            <span className="trust-item"><Check aria-hidden /> You own the code</span>
            <span className="trust-item"><Zap aria-hidden /> Under 1-second loads</span>
          </div>
        </Container>
      </section>

      {/* GUARANTEE STRIP */}
      <div className="guarantee-strip reveal-up">
        <div className="g"><b>14 days</b><span>Kickoff to launch, guaranteed</span></div>
        <div className="g"><b>{starterPrice}</b><span>Discounted price · was {starterOrig}</span></div>
        <div className="g"><b>&lt;200KB</b><span>First-paint JavaScript</span></div>
        <div className="g"><b>1 dev</b><span>One person, one bill, no agency layers</span></div>
      </div>

      {/* AUDIT TOOL — #audit anchor target for the hero CTA */}
      <div id="audit" style={{ scrollMarginTop: '24px' }}>
        <SiteAuditTool
          eyebrow="Free · no email required"
          headline="See exactly what's holding your current site back."
          description="Paste your URL. We run the same Google Lighthouse audit we use on every project and show you the four scores that matter — in about 30 seconds."
        />
      </div>

      {/* DISCOUNTED BANNER — spots + offers mirror the homepage CMS block */}
      <FoundingClient {...(foundingProps as any)} />

      {/* THE OFFER — single tier from the Services CMS pricing ($999) */}
      <div id="offer" style={{ scrollMarginTop: '24px' }}>
        <Pricing
          {...({
            blockType: 'pricing',
            eyebrow: 'The offer',
            headline: 'One package, one price, fourteen days.',
            description: 'No hourly bills, no scope creep. Fixed price, fixed timeline, senior-engineer sign-off on every line of code.',
            layoutVariant: 'centered-single',
            tiers: [offerTier],
          } as any)}
        />
      </div>

      {/* BUNDLE CONFIGURATOR + LEAD FORM (captures the selected bundle) */}
      <ExpressLeadSection contactEmail={settings?.contactEmail ?? null} contactPhone={LP_PHONE_DISPLAY} />

      {/* HOW IT WORKS */}
      <section className="section surface">
        <Container size="xl">
          <div className="section-head reveal-up">
            <span className="eyebrow eyebrow-row"><span className="rule" />How it works</span>
            <h2>Five steps. Two weeks. No mystery.</h2>
          </div>
          <div className="steps cols-5 reveal-up reveal-d1" data-reveal-stagger>
            {STEPS.map((s) => (
              <div key={s.n} className="step">
                <div className="num">{s.n}</div>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* STATS — animated */}
      <section className="section">
        <Container size="xl">
          <div className="section-head reveal-up">
            <span className="eyebrow eyebrow-row"><span className="rule" />What you get</span>
            <h2>Numbers we hold ourselves to.</h2>
          </div>
          <div className="stats-grid reveal-up reveal-d1">
            <div className="stat"><div className="s-val"><CountUpStat value={14} suffix=" days" /></div><div className="s-label">From kickoff to launch</div><div className="s-desc">Discounted clients delivered first.</div></div>
            <div className="stat"><div className="s-val"><CountUpStat value={0.9} decimals={1} suffix="s" /></div><div className="s-label">Typical load time</div><div className="s-desc">Down from 8s on the sites we replace.</div></div>
            <div className="stat"><div className="s-val"><CountUpStat value={140} suffix="%" /></div><div className="s-label">More organic traffic</div><div className="s-desc">Six months in, on a sample rebuild. <span className="placeholder-note">sample</span></div></div>
            <div className="stat"><div className="s-val"><CountUpStat value={0} prefix="$" /></div><div className="s-label">In hidden fees</div><div className="s-desc">Fixed price. No scope-creep clauses.</div></div>
          </div>
        </Container>
      </section>

      {/* TESTIMONIALS */}
      <section className="surface">
        <Testimonials {...({ blockType: 'testimonials', eyebrow: 'What clients said', headline: 'Real work, real businesses.', mode: 'latest', limit: 3 } as any)} />
      </section>

      {/* FAQ */}
      <section className="section">
        <Container size="lg">
          <div className="section-head reveal-up">
            <span className="eyebrow eyebrow-row"><span className="rule" />Common questions</span>
            <h2>Everything you wanted to ask.</h2>
          </div>
          <div className="reveal-up reveal-d1">
            <FaqAccordion items={faqItems} />
          </div>
        </Container>
      </section>

      {/* BOOK A CALL */}
      <CalendlyBooking
        {...({
          blockType: 'calendlyBooking',
          eyebrow: 'Book a call',
          headline: 'Pick a time that works for you.',
          description: "A 30-minute intro call. We talk about what you need, what it costs, and whether we're a fit. No hard sell.",
          calendlyUrl: CALENDLY_URL,
          popupButtonLabel: 'Book a 30-min discovery call',
          showEmailFallback: true,
        } as any)}
      />

      {/* FINAL CTA */}
      <CTA
        {...({
          blockType: 'cta',
          variant: 'emphasized',
          headline: 'Discounted pricing ends at 5 clients.',
          description: 'Right now, that means a lower price and a faster project. Start your project before the cohort fills.',
          primaryCta: { label: 'Claim your discount', href: '#lp-start' },
          secondaryCta: { label: 'See recent work', href: '/portfolio' },
        } as any)}
      />

      <MobileCta primaryLabel="Run free audit" primaryHref="#audit" phone={LP_PHONE_DISPLAY} />
    </div>
  )
}
