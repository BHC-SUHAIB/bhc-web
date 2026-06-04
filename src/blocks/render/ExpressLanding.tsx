import Image from 'next/image'
import { ShieldCheck, Check, Zap } from 'lucide-react'
import { Container } from '@/components/Container'
import { MobileCta } from '@/components/MobileCta'
import { CountUpStat } from '@/components/CountUpStat'
import { LP_PHONE_DISPLAY } from '@/lib/contact'
import { SiteAuditTool } from './SiteAuditTool'
import { FoundingClient } from './FoundingClient'
import { Pricing } from './Pricing'
import { Testimonials } from './Testimonials'
import { FaqAccordion } from './FaqAccordion'
import { CalendlyBooking } from './CalendlyBooking'
import { CTA } from './CTA'
import { BundleConfigurator } from './BundleConfigurator'

const CALENDLY_URL = 'https://calendly.com/suhaib-blackhartconsulting/discovery-call'

const FAQ_ITEMS = [
  { question: "What if I don't like the design?", answer: "You see a Figma mockup before any code is written. If the mockup isn't right, we iterate until it is. The 14-day clock doesn't start until you approve the design direction." },
  { question: 'Do I own the code?', answer: 'Yes. The code lives in a GitHub repo we hand over to you on launch. No proprietary lock-in. You can host it anywhere — but most clients keep us as their host because it is already optimized.' },
  { question: 'Can you work with my existing brand?', answer: 'Yes. If you have a logo, color palette, and fonts, we use them. If not, we recommend a small design system as part of the project (typically a $300 add-on).' },
  { question: "What's the next step?", answer: 'Send a quick note via the form, or book a call. We reply within one business day with a calendar link for a 30-minute intro call. From the call, you get a written proposal within 48 hours.' },
]

const STARTER_FEATURES = [
  '5 bespoke pages designed for your business',
  'Mobile-first, under 200KB JavaScript',
  'Block-based CMS — your team edits every section',
  'Google Business Profile setup + LocalBusiness schema',
  'Contact form + GA4 + conversion tracking pre-wired',
  'First month of hosting free, then $99/mo bundle price',
  '14-day delivery, guaranteed in writing',
]

const STEPS = [
  { n: '01', h: 'Intro call', p: "30 minutes. What you need, what it costs, whether we're a fit." },
  { n: '02', h: 'Design preview', p: 'You approve a Figma mockup before any code is written.' },
  { n: '03', h: 'Build', p: 'The 14-day clock starts. One developer, daily progress.' },
  { n: '04', h: 'Review', p: 'One round of revisions. We tune copy, photos, and details.' },
  { n: '05', h: 'Launch', p: 'Live site, GitHub repo handed over, GBP and schema in place.' },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
}

// Code-composed flagship landing page (/lp/express-website), faithful to the
// Claude Design "Express Website" mockup. Composed in code (not the CMS) so it
// survives the prod→dev content sync and ships cleanly to prod with the branch.
export function ExpressLanding() {
  return (
    <div className="lp-pad-bottom">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />

      {/* HERO — editorial */}
      <section className="hero">
        <Container size="xl">
          <div className="hero-grid">
            <div className="hero-copy reveal-up">
              <span className="pill">
                <span className="dot" />
                <span>Houston Heights · 14-Day Delivery</span>
              </span>
              <h1>
                A custom small business website. <span className="accent">In 14 days.</span> From $1,495.
              </h1>
              <p className="lede">
                Built by hand, hosted by us, kept fast forever. Discounted pricing for the first 5
                Heights small businesses — a lower price in exchange for a review and a case study.
              </p>
              <div className="cta-row">
                <a className="btn btn-brass btn-lg" href="#audit">
                  Run my free site audit <span aria-hidden>→</span>
                </a>
                <a className="btn btn-outline btn-lg" href="#offer">See the deliverables</a>
              </div>
              <div className="trust-row">
                <span className="trust-item"><ShieldCheck aria-hidden /> Fixed price, in writing</span>
                <span className="trust-item"><Check aria-hidden /> You own the code</span>
                <span className="trust-item"><Zap aria-hidden /> Under 1-second loads</span>
              </div>
            </div>
            <div className="hero-media reveal-up reveal-d2">
              <div className="photo-frame">
                <Image
                  src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1100&q=80"
                  alt="A warm, full local restaurant in the Heights at dinner service"
                  fill
                  className="object-cover"
                  sizes="(min-width:980px) 45vw, 100vw"
                  priority
                />
                <span className="photo-tag">Sample · Heights local business</span>
              </div>
              <div className="float-card">
                <div className="fc-head"><b>PageSpeed · after</b><b style={{ color: 'var(--color-brass-text)' }}>live</b></div>
                <div className="scoreline"><span className="lbl">Performance</span><span className="bar"><i style={{ width: '94%' }} /></span><span className="val">94</span></div>
                <div className="scoreline"><span className="lbl">SEO</span><span className="bar"><i style={{ width: '98%' }} /></span><span className="val">98</span></div>
                <div className="scoreline"><span className="lbl">Best prac.</span><span className="bar warn"><i style={{ width: '92%' }} /></span><span className="val">92</span></div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* GUARANTEE STRIP */}
      <div className="guarantee-strip reveal-up">
        <div className="g"><b>14 days</b><span>Kickoff to launch, guaranteed</span></div>
        <div className="g"><b>$1,495</b><span>Discounted price · was $1,950</span></div>
        <div className="g"><b>&lt;200KB</b><span>First-paint JavaScript</span></div>
        <div className="g"><b>1 dev</b><span>One person, one bill, no agency layers</span></div>
      </div>

      {/* AUDIT TOOL */}
      <div id="audit" style={{ scrollMarginTop: '90px' }}>
        <SiteAuditTool
          eyebrow="Free · no email required"
          headline="See exactly what's holding your current site back."
          description="Paste your URL. We run the same Google Lighthouse audit we use on every project and show you the four scores that matter — in about 30 seconds."
        />
      </div>

      {/* DISCOUNTED BANNER */}
      <FoundingClient
        {...({
          blockType: 'foundingClient',
          eyebrow: 'Heights Founding Client Pricing',
          headline: 'First 5 small businesses save up to $1,000.',
          description:
            'A temporary discount for our first cohort of Heights clients. Trades a lower price for a Google review, a written testimonial, and case-study permission — exactly the assets we need most right now.',
          spotsTotal: 5,
          spotsRemaining: 2,
          offers: [
            { name: 'Starter Site', priceFounding: '$1,495', priceRetail: '$1,950', savings: 'Save $455' },
            { name: 'The Pro Site', priceFounding: '$3,500', priceRetail: '$4,500', savings: 'Save $1,000' },
            { name: 'Local SEO Sprint', priceFounding: '$1,195', priceRetail: '$1,495', savings: 'Save $300' },
            { name: 'Care plans', priceFounding: 'Free first month', priceRetail: null, savings: '$149 value' },
          ],
          cta: { label: 'Claim a founding spot', href: '/contact' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)}
      />

      {/* THE OFFER — single tier */}
      <div id="offer" style={{ scrollMarginTop: '80px' }}>
        <Pricing
          {...({
            blockType: 'pricing',
            eyebrow: 'The offer',
            headline: 'One package, one price, fourteen days.',
            description:
              'No hourly bills, no scope creep. Fixed price, fixed timeline, senior-engineer sign-off on every line of code.',
            layoutVariant: 'centered-single',
            tiers: [
              {
                name: 'Starter Site',
                price: '$1,495',
                originalPrice: '$1,950',
                priceNote: 'founding price · 14-day build',
                highlighted: true,
                description:
                  'A 5-page small business website that handles 90% of what a Heights business needs — mobile-first, fast, and fully editable.',
                features: STARTER_FEATURES.map((label) => ({ label, included: true })),
                cta: { label: 'Claim a founding spot', href: '/contact' },
              },
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)}
        />
      </div>

      {/* BUNDLE CONFIGURATOR */}
      <BundleConfigurator />

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
        <Testimonials
          {...({ blockType: 'testimonials', eyebrow: 'What clients said', headline: 'Real work, real businesses.', mode: 'latest', limit: 3 } as any)}
        />
      </section>

      {/* FAQ */}
      <section className="section">
        <Container size="lg">
          <div className="section-head reveal-up">
            <span className="eyebrow eyebrow-row"><span className="rule" />Common questions</span>
            <h2>Everything you wanted to ask.</h2>
          </div>
          <div className="reveal-up reveal-d1">
            <FaqAccordion items={FAQ_ITEMS} />
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)}
      />

      {/* FINAL CTA */}
      <CTA
        {...({
          blockType: 'cta',
          variant: 'emphasized',
          headline: 'Founding pricing ends at 5 clients.',
          description: 'Right now, that means a lower price and a faster project. Two spots left.',
          primaryCta: { label: 'Claim a founding spot', href: '/contact' },
          secondaryCta: { label: 'See recent work', href: '/portfolio' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)}
      />

      {/* Sticky mobile bar — scrolls to the audit tool */}
      <MobileCta primaryLabel="Run free audit" primaryHref="#audit" phone={LP_PHONE_DISPLAY} />
    </div>
  )
}
