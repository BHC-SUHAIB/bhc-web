import Link from 'next/link'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { SiteAuditTool } from '@/blocks/render/SiteAuditTool'
import { BarList, StatTile } from '@/components/report/ReportCharts'
import { buildBreadcrumbJsonLd } from '@/lib/schema'
import { canonical } from '@/lib/seo'
import { REPORT } from '@/lib/houston-report-2026'
import '@/components/report/report.css'

// Houston-specific home for the audit tool: same widget, framed against the
// local benchmarks from the 2026 report so a Houston owner can see where their
// site lands against the block, not just against Google's generic bands.
export const dynamic = 'force-dynamic'

const PATH = '/houston/website-audit'

export const metadata: Metadata = {
  title: { absolute: 'Houston Website Audit: How Does Your Site Compare to Your Neighbors? | Black Hart Consulting' },
  description:
    'Free Google PageSpeed audit for Houston small businesses, benchmarked against 1,178 local auto shops, home-service companies, salons, and med spas. Median local mobile score is 60. See where yours lands in 30 seconds.',
  ...canonical(PATH),
}

export default function HoustonWebsiteAuditPage() {
  const q = REPORT.quality
  const pr = REPORT.presence

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Houston', path: '/houston' },
          { name: 'Website audit', path: PATH },
        ])}
      />

      <section className="pt-12 sm:pt-16 pb-4">
        <Container size="lg">
          <span className="eyebrow eyebrow-row mb-4"><span className="rule" />Houston · Free tool</span>
          <h1 className="font-serif font-semibold text-[clamp(2.1rem,4.8vw,3.8rem)] leading-[1.04] tracking-[-0.03em] max-w-4xl">
            How does your website compare to the shop down the street?
          </h1>
          <p className="mt-6 text-[clamp(1.1rem,1.4vw,1.3rem)] leading-[1.5] text-[var(--color-fg-muted)] max-w-3xl">
            In September 2026 we ran Google’s speed test on every working website of{' '}
            {REPORT.sample.businesses.toLocaleString()} Houston auto shops, home-service companies, salons, and med
            spas from the Heights to Spring Branch to Downtown. Run the same test on yours and see where you land.
          </p>
        </Container>
      </section>

      <SiteAuditTool
        eyebrow="Run the audit"
        headline="Paste your address. Compare your number to the ones below."
        description="Free, no email, about 30 seconds. Use the mobile score: that is how most Houston customers find a local business."
      />

      <section className="py-6">
        <Container size="lg">
          <div className="report-stats">
            <StatTile value={String(q.speedMedian)} label="median mobile score, Houston service businesses" sub={`${q.speedScored} sites scored`} />
            <StatTile value={`${Math.round(q.under50Pct)}%`} label="score under 50, which Google calls poor" sub={`${q.under50Count} sites`} />
            <StatTile value={`${Math.round(q.over90Pct)}%`} label="score 90 or better" sub={`${q.over90Count} sites`} />
            <StatTile value={`${Math.round(pr.noRealSitePct)}%`} label="have no website of their own" sub={`${pr.noRealSiteCount} of ${REPORT.sample.businesses.toLocaleString()} businesses`} />
          </div>
        </Container>
        <Container size="md" className="report-prose">
          <h2>Read your score against the block</h2>
          <ul>
            <li><strong>Under 50:</strong> you are with the bottom quarter of local sites. Customers on a phone are leaving before your phone number appears. This is the group the report calls poor, and it is fixable in a week.</li>
            <li><strong>50 to 60:</strong> average for Houston, which is not a compliment. The median site here takes long enough to load that a visitor notices.</li>
            <li><strong>60 to 89:</strong> better than half your neighbors. Worth a pass to get over 90, usually by fixing images and one slow script.</li>
            <li><strong>90 or better:</strong> top tenth locally. Leave the site alone and put the money into getting found.</li>
          </ul>

          <h2>Where the slow sites are</h2>
          <p>Share of working websites scoring under 50 on mobile, by trade and by neighborhood.</p>
          <BarList rows={q.byVertical.map((v) => ({ label: v.label, value: v.value, n: v.n }))} max={50} caption="By trade. Home-service sites are the fastest group; no salon or med spa site in the sample reached 90." />
          <BarList rows={q.byNeighborhood.map((v) => ({ label: v.label, value: v.value, n: v.n }))} max={50} caption="By neighborhood, where at least 30 sites were scored." />

          <h2>Who has no site at all</h2>
          <p>
            A third of the businesses we found have no website of their own, only a Google listing or a social
            profile. That share is highest in auto services and in the neighborhoods north and west of the Loop.
          </p>
          <BarList rows={[...pr.byNeighborhood].slice(0, 8)} max={60} caption="Share of businesses with no website listed on Google, by neighborhood." />
          <p>
            The full report, with the dead-site rate, the site-builder comparison, and the method, is at{' '}
            <Link href="/reports/houston-small-business-websites-2026">the 2026 Houston small business website report</Link>.
            The plain-English guide to each score is on the{' '}
            <Link href="/free-website-audit">free website audit page</Link>.
          </p>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container size="xl">
          <div className="cta-band emph">
            <h2>Below the median?</h2>
            <p>We build Houston service businesses a free demo of what their site could be, from their real listing and reviews, before they spend anything. Or fix the three biggest problems in five days.</p>
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
