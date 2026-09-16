import Link from 'next/link'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { SiteAuditTool } from '@/blocks/render/SiteAuditTool'
import { StatTile } from '@/components/report/ReportCharts'
import { buildBreadcrumbJsonLd, BUSINESS_ID } from '@/lib/schema'
import { canonical } from '@/lib/seo'
import { REPORT } from '@/lib/houston-report-2026'
import '@/components/report/report.css'

// Public, indexable home for the PageSpeed audit tool. The same widget also
// sits on the home page under #audit; this route exists so the tool has a
// URL, a title, and copy that can rank for "free website audit" searches.
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com'
const PATH = '/free-website-audit'

export const metadata: Metadata = {
  title: { absolute: 'Free Website Audit for Small Businesses | Black Hart Consulting' },
  description:
    'Paste your web address and get the same four Google Lighthouse scores Google uses to judge your site: speed, accessibility, best practices, and SEO. Free, no email, about 30 seconds. Plain-English explanation of what each score means and how to fix it.',
  ...canonical(PATH),
}

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Is the audit really free?',
    a: 'Yes. Paste a URL and you get all four scores with no email, no signup, and no follow-up unless you ask for the written report. It runs Google’s own PageSpeed Insights test, which is free to use.',
  },
  {
    q: 'What is a good PageSpeed score?',
    a: 'Google labels 90 to 100 as good, 50 to 89 as needs improvement, and 0 to 49 as poor. For a small business site, anything under 50 on mobile means a real share of visitors are leaving before the page finishes loading. The median Houston small business site scores 60 on mobile.',
  },
  {
    q: 'Why does the mobile score differ so much from desktop?',
    a: 'The mobile test simulates a mid-range phone on a slow 4G connection, which is closer to how most local customers actually find you. Desktop scores are almost always higher. Judge your site by the mobile number.',
  },
  {
    q: 'My score changed when I ran it twice. Which one is right?',
    a: 'Scores vary a few points between runs because network conditions and server response times vary. A swing of 3 to 5 points is normal. A swing of 20 usually means your host is inconsistent, which is itself a finding.',
  },
  {
    q: 'Does a low score hurt my Google ranking?',
    a: 'Page experience is a ranking signal, but a small one. The bigger cost is direct: slow pages lose visitors before they see your phone number. Fixing speed helps rankings at the margin and helps conversions a lot.',
  },
  {
    q: 'Can you fix what the audit finds?',
    a: 'Usually, yes. The $249 Site Health Sprint ships three specific fixes in five days with a before-and-after score. If the site needs more than three fixes, we will say so and show you a demo of what a rebuilt site would look like before you decide anything.',
  },
]

export default function FreeWebsiteAuditPage() {
  const q = REPORT.quality
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const appLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Black Hart free website audit',
    url: `${SITE_URL}${PATH}`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    provider: { '@id': BUSINESS_ID },
    description: 'Runs Google PageSpeed Insights against any public web address and reports performance, accessibility, best practices, and SEO scores with Core Web Vitals.',
  }

  return (
    <>
      <JsonLd data={faqLd} />
      <JsonLd data={appLd} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Free website audit', path: PATH },
        ])}
      />

      <section className="pt-12 sm:pt-16 pb-4">
        <Container size="lg">
          <span className="eyebrow eyebrow-row mb-4"><span className="rule" />Free tool · No email required</span>
          <h1 className="font-serif font-semibold text-[clamp(2.1rem,4.8vw,3.8rem)] leading-[1.04] tracking-[-0.03em] max-w-4xl">
            Free website audit: see your site the way Google sees it.
          </h1>
          <p className="mt-6 text-[clamp(1.1rem,1.4vw,1.3rem)] leading-[1.5] text-[var(--color-fg-muted)] max-w-3xl">
            Paste your web address below. In about 30 seconds you get the four Lighthouse scores Google
            uses to judge a site, a screenshot of what it rendered, and your Core Web Vitals. Then we explain
            what each number means in plain English and what usually fixes it.
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-3 text-[15px] text-[var(--color-fg-muted)] max-w-3xl">
            <li><strong className="text-[var(--color-fg)]">Free and anonymous.</strong> No signup, nothing to install.</li>
            <li><strong className="text-[var(--color-fg)]">Google’s own test.</strong> The same PageSpeed Insights engine Google runs.</li>
            <li><strong className="text-[var(--color-fg)]">Mobile first.</strong> Scored on a mid-range phone on 4G, the way customers find you.</li>
          </ul>
        </Container>
      </section>

      <SiteAuditTool
        eyebrow="Run the audit"
        headline="How fast is your site, actually?"
        description="Works for any public site: yours, a competitor’s, or one you are thinking of buying. Mobile is the score that matters for local search."
      />

      <section className="py-6">
        <Container size="md" className="report-prose">
          <h2>What the four scores mean</h2>
          <p>
            Lighthouse grades a page from 0 to 100 in four categories. Google colors them green at 90 and above,
            orange from 50 to 89, and red below 50. Here is what each one measures and why it matters for a
            business whose customers arrive from a phone.
          </p>
          <h3>Performance</h3>
          <p>
            How fast the page becomes usable. This is the one that costs you customers. It combines how quickly
            the biggest element on screen appears (Largest Contentful Paint), how much the layout jumps around while
            loading (Cumulative Layout Shift), and how soon the page responds to a tap. Common causes of a low
            score: uncompressed photos, too many fonts, a slow shared host, and third-party chat or tracking
            scripts that load before your content does.
          </p>
          <h3>Accessibility</h3>
          <p>
            Whether the page works for people using screen readers, keyboard navigation, or high zoom. Low contrast
            text, images without descriptions, and buttons without labels pull this down. It also tracks closely
            with how usable the site is for anyone squinting at it in sunlight.
          </p>
          <h3>Best Practices</h3>
          <p>
            Basic hygiene: the page is served over HTTPS, does not throw console errors, uses images at the right
            size, and does not lean on deprecated browser features. A low score here usually means the site has
            not been maintained in a while.
          </p>
          <h3>SEO</h3>
          <p>
            The technical basics Google needs to index the page: a title, a description, readable text sizes on
            mobile, crawlable links, and a valid viewport tag. This does not measure rankings. A site can score 100
            here and still rank nowhere if nothing links to it. It measures whether you are in the race at all.
          </p>

          <h2>What good looks like for a small business</h2>
          <p>
            We checked {REPORT.sample.businesses.toLocaleString()} Houston service businesses in September 2026 and
            scored every working site with this same test. Use these as your benchmark.
          </p>
        </Container>
        <Container size="lg" className="mt-6">
          <div className="report-stats">
            <StatTile value={String(q.speedMedian)} label="median mobile performance score" sub={`${q.speedScored} local sites scored`} />
            <StatTile value={`${Math.round(q.under50Pct)}%`} label="of local sites score under 50 on mobile" sub="Google calls this poor" />
            <StatTile value={`${Math.round(q.over90Pct)}%`} label="of local sites reach 90 or better" sub="the bar to aim for" />
            <StatTile value="1 in 12" label="listed sites is dead or shows a security warning" sub="check yours loads at all" />
          </div>
        </Container>
        <Container size="md" className="report-prose">
          <p>
            If your mobile performance score is above 60 you are already ahead of half your neighbors. Above 90
            puts you in the top tenth. The full breakdown by trade, neighborhood, and site builder is in the{' '}
            <Link href="/reports/houston-small-business-websites-2026">2026 Houston small business website report</Link>.
          </p>

          <h2>The five fixes that move the score most</h2>
          <ul>
            <li><strong>Resize and compress photos.</strong> The single most common cause of a poor score is a 4 MB phone photo served at full size in a 400 pixel slot. Modern formats and correct sizing often add 20 points on their own.</li>
            <li><strong>Cut the fonts.</strong> Each web font family is another download before text can appear. Two families is plenty; system fonts are free.</li>
            <li><strong>Delay third-party scripts.</strong> Chat widgets, review carousels, and tracking pixels should load after your content, not before it.</li>
            <li><strong>Fix the host.</strong> A slow server response is a floor no amount of front-end work can get under. If the first byte takes more than a second, the host is the problem.</li>
            <li><strong>Reserve space for images and embeds.</strong> Layout shift, the page jumping as things load, is fixed by telling the browser how big each element will be before it arrives.</li>
          </ul>

          <h2>Questions people ask</h2>
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container size="xl">
          <div className="cta-band emph">
            <h2>Scores lower than you expected?</h2>
            <p>Send your business name and Google listing and we will build a free demo of what your site could be. Or pick three fixes and the Site Health Sprint ships them in five days.</p>
            <div className="cta-row">
              <Link href="/free-demo-site" className="btn btn-brass btn-lg">See your site first</Link>
              <Link href="/contact?tier=site-health-sprint#contact-form" className="btn btn-onphoto btn-lg">Start a $249 Sprint</Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
