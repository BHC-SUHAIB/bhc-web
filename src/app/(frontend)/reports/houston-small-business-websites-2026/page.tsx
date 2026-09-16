import Link from 'next/link'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbJsonLd, BUSINESS_ID } from '@/lib/schema'
import { canonical } from '@/lib/seo'
import { REPORT as R } from '@/lib/houston-report-2026'
import { BarList, Histogram, ShareBar, StatTile } from '@/components/report/ReportCharts'
import '@/components/report/report.css'

// Rendered per request like every other public route here: the Docker build has
// no NEXT_PUBLIC_SITE_URL, so a prerendered page would bake a localhost
// metadataBase into its canonical and JSON-LD URLs.
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com'
const PATH = `/reports/${R.slug}`

export const metadata: Metadata = {
  title: { absolute: `${R.title} | Black Hart Consulting` },
  description:
    'Original research: we checked 1,178 Houston auto shops, home-service companies, salons, and med spas. 33% have no website of their own, 27% fail Google’s mobile speed test, and 1 in 12 listed sites is dead. Data by neighborhood, trade, and site builder.',
  ...canonical(PATH),
  openGraph: {
    type: 'article',
    title: R.title,
    description: R.dek,
    publishedTime: R.published,
  },
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

export default function HoustonWebsiteReport2026() {
  const q = R.quality
  const pr = R.presence
  const d = R.dead

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: R.title,
    description: R.dek,
    datePublished: R.published,
    dateModified: R.published,
    author: { '@type': 'Person', name: 'Suhaib Chaudhry' },
    publisher: { '@id': BUSINESS_ID },
    mainEntityOfPage: `${SITE_URL}${PATH}`,
    about: [
      { '@type': 'Thing', name: 'Small business websites' },
      { '@type': 'Place', name: 'Houston, Texas' },
    ],
  }
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Houston small business website audit, September 2026',
    description:
      'Aggregate website checks (presence, reachability, HTTPS, mobile viewport, Google PageSpeed mobile performance, site builder, copyright year) for 1,178 Houston small businesses in auto services, home services, and salons/med spas.',
    creator: { '@id': BUSINESS_ID },
    temporalCoverage: '2026-08-31/2026-09-15',
    spatialCoverage: { '@type': 'Place', name: 'Houston, Texas' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    url: `${SITE_URL}${PATH}`,
  }

  return (
    <>
      <JsonLd data={articleLd} />
      <JsonLd data={datasetLd} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Houston', path: '/houston' },
          { name: 'Small business website report 2026', path: PATH },
        ])}
      />

      <article className="pb-24">
        <section className="pt-12 sm:pt-16 pb-8">
          <Container size="lg">
            <span className="eyebrow eyebrow-row mb-4"><span className="rule" />Original research · September 2026</span>
            <h1 className="font-serif font-semibold text-[clamp(2.1rem,4.8vw,3.8rem)] leading-[1.04] tracking-[-0.03em] max-w-4xl">
              {R.title}
            </h1>
            <p className="mt-6 text-[clamp(1.1rem,1.4vw,1.3rem)] leading-[1.5] text-[var(--color-fg-muted)] max-w-3xl">
              {R.dek}
            </p>
            <p className="mt-6 font-mono text-[12px] tracking-[0.1em] text-[var(--color-fg-muted)]">
              By Suhaib Chaudhry · Data collected {R.window} · Free to cite with a link
            </p>
          </Container>
        </section>

        <section className="py-6">
          <Container size="lg">
            <div className="report-stats">
              <StatTile value="1 in 3" label="has no website of its own" sub={`${pr.noRealSiteCount} of ${R.sample.businesses.toLocaleString()} businesses`} />
              <StatTile value={`${Math.round(q.anyProblemInclDeadPct)}%`} label="of sites have at least one serious problem" sub={`${q.anyProblemInclDead} of ${q.evaluated} sites evaluated`} />
              <StatTile value={`${Math.round(q.under50Pct)}%`} label="fail Google’s mobile speed test" sub={`PageSpeed under 50, ${q.under50Count} of ${q.speedScored}`} />
              <StatTile value="1 in 12" label="listed websites is dead or throws a security warning" sub={`${d.deadOrSslCount} of ${d.realDomainSites}`} />
            </div>
          </Container>
        </section>

        <Container size="md" className="report-prose">
          <P>
            Black Hart Consulting builds websites for Houston service businesses, and part of our
            outreach pipeline is an automated check of every business it finds on Google Maps: does it
            have a website, does the site load, is it secure, does it work on a phone, and how does
            Google score its speed. Over two weeks in September 2026 that check ran across {R.sample.businesses.toLocaleString()} businesses
            in three trades. This report is what the data says, with no business named.
          </P>
          <P>
            The short version: the problem is not that Houston small businesses have bad websites. A
            third of them have no website at all, and among those that do, the most common failure is
            speed on a phone, which is where most local searches now happen.
          </P>

          <h2>Who has a website</h2>
          <P>
            {pr.noSitePct}% of the businesses list no website on their Google profile. Another {pr.socialAsSiteCount} list
            an Instagram, Facebook, Yelp, booking app, or Google page as their &ldquo;website.&rdquo; Put together,{' '}
            <strong>{pr.noRealSitePct}% have no site of their own</strong>.
          </P>
          <ShareBar value={pr.noRealSitePct} label="no website of their own" rest="have a real website" caption={`${pr.noRealSiteCount} of ${R.sample.businesses.toLocaleString()} businesses. Social profiles and booking pages listed as the website count as no site.`} />

          <h3>By trade</h3>
          <P>Auto shops are the most likely to run on a Google listing alone. Home-service companies, which get a lot of their work from search, are the most likely to have a site.</P>
          <BarList rows={[...pr.byVertical]} max={60} caption="Share of businesses with no website listed on Google, by trade." />

          <h3>By neighborhood</h3>
          <P>
            The gap follows the map. In Northside and Independence Heights more than four in ten businesses
            have no website. Downtown, Montrose, and the Westside are closer to one in ten. The Greater Heights
            sits in between at about one in four.
          </P>
          <BarList rows={[...pr.byNeighborhood]} max={60} caption="Share of businesses with no website listed on Google. Neighborhoods with fewer than 36 businesses in the sample are left out." />

          <h3>The businesses that are doing fine without one</h3>
          <P>
            Lack of a website is not a sign of a struggling business. <strong>{pr.strongNoSite} businesses</strong> in
            the sample have 50 or more Google reviews at a 4.5-star average or better and still no website;{' '}
            {pr.hundredReviewsNoSite} of them have over 100 reviews. Most are auto shops and salons that fill their
            bays and chairs through word of mouth and their Google listing.
          </P>
          <P>
            That said, the businesses with a website average {pr.reviews.avgWithSite} reviews against {pr.reviews.avgWithoutSite} for
            those without (median {pr.reviews.medianWithSite} versus {pr.reviews.medianWithoutSite}). A website does not cause reviews,
            but the two go together: businesses that invest in one tend to invest in the other.
          </P>

          <h2>The dead links</h2>
          <P>
            Of the {d.realDomainSites} businesses whose Google listing points to a real domain, {d.deadCount} link to a
            site that is gone: the domain no longer resolves, the page returns a 404, or the server errors
            out. Another {d.brokenSslCount} load behind a broken or expired security certificate, which shows
            visitors a full-page warning before the site. <strong>{d.deadOrSslPct}%, or about 1 in 12 listed websites, is
            effectively off.</strong>
          </P>
          <BarList rows={d.breakdown.map((b) => ({ label: b.label, value: b.value }))} max={40} unit="" caption={`The ${d.deadOrSslCount} sites that do not load properly, by cause. Every site our crawler could not reach was re-checked by hand from a normal browser; the ${d.botBlockedButAlive} that loaded fine and the ${d.ambiguous} that were ambiguous are not counted here.`} />
          <P>
            These are businesses that paid for a website at some point and are still sending customers to it
            from Google. Most do not know.
          </P>

          <h2>Speed on a phone</h2>
          <P>
            Google&rsquo;s PageSpeed Insights scores a page from 0 to 100 on mobile performance. Google calls
            under 50 &ldquo;poor&rdquo; and 90 and above &ldquo;good.&rdquo; We scored {q.speedScored} sites that loaded normally.
            The median is {q.speedMedian}. <strong>{q.under50Pct}% score under 50</strong>, and only {q.over90Pct}% reach 90.
          </P>
          <Histogram bins={[...q.deciles]} total={q.speedScored} threshold={5} caption={`Distribution of Google PageSpeed mobile performance scores across ${q.speedScored} sites. Gray columns are the "poor" range under 50.`} />

          <h3>By site builder</h3>
          <P>
            About a quarter of the sites ({q.onBuilderPct}%) show the fingerprint of a DIY builder. Wix and GoDaddy
            sites score about the same as custom builds. Squarespace and Weebly sites are the slow ones in
            this sample, though the Weebly group is small.
          </P>
          <BarList rows={q.byBuilder.map((b) => ({ label: b.label, value: b.value, n: b.n }))} max={100} caption="Share of sites scoring under 50 on PageSpeed mobile, by detected builder. n is the number of sites scored." />

          <h3>By trade and neighborhood</h3>
          <BarList rows={q.byVertical.map((v) => ({ label: v.label, value: v.value, n: v.n }))} max={50} caption="Share of sites under 50, by trade. Home-service sites are the fastest group; not one salon or med spa site reached 90." />
          <BarList rows={q.byNeighborhood.map((v) => ({ label: v.label, value: v.value, n: v.n }))} max={50} caption="Share of sites under 50, by neighborhood, where at least 30 sites were scored." />

          <h2>The basics</h2>
          <P>Four things every site should have. Most do, which makes the ones that do not stand out.</P>
          <table className="report-table">
            <thead>
              <tr><th>Check</th><th className="num">Sites failing</th><th className="num">Share</th></tr>
            </thead>
            <tbody>
              <tr><td>No HTTPS (browser marks the site &ldquo;not secure&rdquo;)</td><td className="num">{q.hygiene.noHttps}</td><td className="num">{q.hygiene.noHttpsPct}%</td></tr>
              <tr><td>No mobile viewport tag (desktop layout squeezed onto a phone)</td><td className="num">{q.hygiene.noViewport}</td><td className="num">{q.hygiene.noViewportPct}%</td></tr>
              <tr><td>Copyright line of 2022 or earlier (of {q.hygiene.copyrightShown} sites that show one; oldest says {q.hygiene.oldestCopyright})</td><td className="num">{q.hygiene.staleCopyright}</td><td className="num">{q.hygiene.staleCopyrightPct}%</td></tr>
              <tr><td>Visibly dated design (screenshot judged 30/100 or lower)</td><td className="num">{q.hygiene.datedDesign}</td><td className="num">{q.hygiene.datedDesignPct}%</td></tr>
            </tbody>
          </table>
          <P>
            Stale copyright lines cluster in salons and med spas ({q.hygiene.verticalStale[0].value}% of those that show a year),
            which fits what we see in the field: a site built when the business opened and never touched again.
          </P>

          <h2>Adding it up</h2>
          <P>
            Counting a site as having a serious problem if it is dead, shows a certificate warning, is not
            HTTPS, has no mobile viewport, scores under 50 on mobile speed, looks visibly dated, or carries a
            copyright line from 2022 or earlier: <strong>{q.anyProblemInclDeadPct}% of the {q.evaluated} sites we could evaluate have
            at least one</strong>. The other {100 - Math.round(q.anyProblemInclDeadPct)}% are in reasonable shape.
          </P>
          <ShareBar value={q.anyProblemInclDeadPct} label="at least one serious problem" rest="in reasonable shape" caption={`${q.anyProblemInclDead} of ${q.evaluated} sites. Speed is by far the most common problem; the hygiene checks add a few points each.`} />
          <P>
            Combined with the third of businesses that have no site at all, roughly <strong>two out of every
            three Houston service businesses</strong> in this sample either have no website or one with a real
            problem a customer would notice.
          </P>

          <h2>What to do with this</h2>
          <ul>
            <li><strong>If you have no website:</strong> you are in good company, and your Google listing is doing real work. The question is what happens when someone wants to know your prices, your hours on a holiday, or whether you do the thing they need. A one-page site answers that and takes a week.</li>
            <li><strong>If you have one:</strong> open it on your phone on cellular, not Wi-Fi. If it takes more than three seconds, you are in the 27%. Then check that the address bar shows a lock.</li>
            <li><strong>If you have not looked at it in a year:</strong> click the link on your own Google profile. One in twelve of your neighbors is sending customers to a page that no longer exists.</li>
          </ul>

          <h2>Method and caveats</h2>
          <ul>
            <li><strong>Sample.</strong> Businesses returned by Google Maps for trade-specific searches across {R.sample.zips.length} ZIP codes in the Heights, Spring Branch, Montrose, Downtown, and northwest Houston between {R.window}. Three trades: {R.sample.verticals.map((v) => `${v.label.toLowerCase()} (${v.n})`).join(', ')}. This is a large sample of those trades in those areas, not a census of Houston.</li>
            <li><strong>Website checks.</strong> An identified crawler that honors robots.txt fetched each listed site with a 10-second timeout. HTTPS means the final URL after redirects is secure. The mobile viewport check looks for the standard meta tag. Site builders are detected from markup fingerprints.</li>
            <li><strong>Dead sites.</strong> Every site the crawler could not load was re-fetched by hand from a normal browser. Only DNS or connection failures, 404s, server errors, and timeouts count as dead; sites that simply blocked the crawler are counted as working.</li>
            <li><strong>Speed.</strong> Google PageSpeed Insights v5, mobile strategy, performance category, one run per site. Scores vary a few points run to run.</li>
            <li><strong>Design.</strong> Judged from a desktop screenshot by an AI model on a 0 to 100 scale. Treat it as directional; it is the softest measure here and carries little weight in the combined figure.</li>
            <li><strong>Privacy.</strong> No business is named or identifiable. Neighborhood figures are only shown where at least 30 businesses (or 30 scored sites) were in the sample.</li>
          </ul>
          <P>
            The numbers are free to cite with a link to this page. If you are a reporter or a business group and
            want a cut by another neighborhood or trade, <Link href="/contact">ask</Link>; if the sample supports
            it, we will run it.
          </P>
        </Container>

        <section className="pt-14">
          <Container size="xl">
            <div className="cta-band emph">
              <h2>Want to know where your site lands?</h2>
              <p>We will build you a free demo of what your site could be, or run the same checks on the one you have. No meeting required.</p>
              <div className="cta-row">
                <Link href="/free-demo-site" className="btn btn-brass btn-lg">See your site first</Link>
                <Link href="/#audit" className="btn btn-onphoto btn-lg">Run the free audit</Link>
              </div>
            </div>
          </Container>
        </section>
      </article>
    </>
  )
}
