// Numbers for /reports/houston-small-business-websites-2026.
// Every figure here is an aggregate pulled read-only from Hart Pipeline's
// prod database on 2026-09-15; the queries, denominators, and the manual
// recheck of "unreachable" sites live in docs/reports/houston-small-business-websites-2026/.
// No business is named anywhere in this file or on the page.

export const REPORT = {
  slug: 'houston-small-business-websites-2026',
  title: 'The State of Small Business Websites in Houston, 2026',
  dek: 'We checked 1,178 auto shops, home-service companies, salons, and med spas across the Heights, Spring Branch, Montrose, Downtown, and northwest Houston. One in three has no website of its own, and half of the sites that exist have at least one serious problem.',
  published: '2026-09-16',
  window: 'August 31 to September 15, 2026',
  sample: {
    businesses: 1178,
    verticals: [
      { key: 'auto', label: 'Auto services', n: 531 },
      { key: 'home', label: 'Home services', n: 453 },
      { key: 'salon', label: 'Salons and med spas', n: 194 },
    ],
    topCategories: [
      'auto repair', 'tire shops', 'car washes', 'detailers', 'plumbers', 'nail salons', 'electricians',
      'beauty salons', 'auto glass', 'barbers', 'fence contractors', 'handymen', 'landscapers',
    ],
    zips: ['77092', '77055', '77008', '77018', '77007', '77002', '77009', '77080', '77024', '77040', '77091', '77005', '77098', '77019', '77006', '77022', '77003'],
  },

  presence: {
    noSitePct: 28.9, // 340 / 1178
    noSiteCount: 340,
    listedSites: 838,
    socialAsSiteCount: 52, // Instagram, Facebook, Yelp, Google, Booksy, Vagaro, Square, business.site, hub.biz
    socialAsSitePct: 6.2, // 52 / 838
    noRealSitePct: 33.3, // (340 + 52) / 1178
    noRealSiteCount: 392,
    byVertical: [
      { label: 'Auto services', value: 37.1, n: 531 },
      { label: 'Salons and med spas', value: 29.4, n: 194 },
      { label: 'Home services', value: 19.0, n: 453 },
    ],
    byNeighborhood: [
      { label: 'Northside / Northline', value: 54.5, n: 44 },
      { label: 'Independence Heights', value: 42.5, n: 40 },
      { label: 'Fairbanks / Northwest Crossing', value: 41.7, n: 72 },
      { label: 'Central Northwest', value: 36.5, n: 96 },
      { label: 'Spring Branch East', value: 34.1, n: 129 },
      { label: 'Spring Branch Central', value: 30.6, n: 36 },
      { label: 'Greater Heights', value: 27.6, n: 123 },
      { label: 'Washington Ave / Memorial Park', value: 17.5, n: 80 },
      { label: 'Montrose', value: 15.5, n: 58 },
      { label: 'Downtown', value: 14.1, n: 78 },
      { label: 'Greenway / Upper Kirby', value: 13.9, n: 36 },
      { label: 'Westside', value: 10.4, n: 48 },
    ],
    strongNoSite: 62, // 50+ reviews, 4.5+ rating, no website
    strongNoSiteByVertical: { auto: 40, salon: 19, home: 3 },
    hundredReviewsNoSite: 50,
    reviews: {
      avgWithSite: 255, avgWithoutSite: 59,
      medianWithSite: 66, medianWithoutSite: 26,
      ratingWithSite: 4.63, ratingWithoutSite: 4.43,
    },
  },

  dead: {
    realDomainSites: 786,
    crawlerFailed: 140,
    deadCount: 53, // DNS/connect 37, 404 9, 5xx 4, timeout 3
    deadPct: 6.7,
    brokenSslCount: 12,
    brokenSslPct: 1.5,
    deadOrSslCount: 65,
    deadOrSslPct: 8.3,
    botBlockedButAlive: 56,
    ambiguous: 19,
    breakdown: [
      { label: 'Domain does not resolve or refuses connections', value: 37 },
      { label: 'Loads, but the page is gone (404)', value: 9 },
      { label: 'Server error (5xx)', value: 4 },
      { label: 'Times out after 15 seconds', value: 3 },
      { label: 'Broken or expired security certificate', value: 12 },
    ],
  },

  quality: {
    reachableSites: 616,
    speedScored: 523,
    speedMean: 60.6,
    speedMedian: 60,
    under50Count: 140, under50Pct: 26.8,
    over90Count: 46, over90Pct: 8.8,
    mid: 337, midPct: 64.4,
    deciles: [
      { label: '0-9', count: 3 }, { label: '10-19', count: 9 }, { label: '20-29', count: 18 }, { label: '30-39', count: 48 },
      { label: '40-49', count: 62 }, { label: '50-59', count: 115 }, { label: '60-69', count: 99 }, { label: '70-79', count: 83 },
      { label: '80-89', count: 40 }, { label: '90-99', count: 31 }, { label: '100', count: 15 },
    ],
    byVertical: [
      { label: 'Salons and med spas', value: 30.7, n: 75, avg: 53.9, over90: 0.0 },
      { label: 'Auto services', value: 32.0, n: 203, avg: 58.3, over90: 7.4 },
      { label: 'Home services', value: 21.2, n: 245, avg: 64.5, over90: 12.7 },
    ],
    byBuilder: [
      { label: 'Weebly', value: 75.0, n: 8, avg: 30.3 },
      { label: 'Squarespace', value: 65.5, n: 29, avg: 40.3 },
      { label: 'Custom or other', value: 24.7, n: 405, avg: 62.5 },
      { label: 'GoDaddy', value: 20.0, n: 35, avg: 61.4 },
      { label: 'Wix', value: 17.4, n: 46, avg: 61.0 },
    ],
    onBuilderCount: 147, onBuilderPct: 23.9,
    byNeighborhood: [
      { label: 'Central Northwest', value: 37.5, n: 40, avg: 53.7 },
      { label: 'Washington Ave / Memorial Park', value: 35.6, n: 45, avg: 60.4 },
      { label: 'Montrose', value: 35.5, n: 31, avg: 56.3 },
      { label: 'Spring Branch East', value: 31.7, n: 60, avg: 57.1 },
      { label: 'Greater Heights', value: 26.8, n: 56, avg: 59.6 },
      { label: 'Downtown', value: 25.7, n: 35, avg: 64.6 },
    ],
    hygiene: {
      noHttps: 37, noHttpsPct: 6.0,
      noViewport: 34, noViewportPct: 5.5,
      copyrightShown: 331, staleCopyright: 55, staleCopyrightPct: 16.6, oldestCopyright: 2004,
      designScored: 610, datedDesign: 42, datedDesignPct: 6.9,
      verticalStale: [
        { label: 'Salons and med spas', value: 25.0 },
        { label: 'Home services', value: 16.0 },
        { label: 'Auto services', value: 14.7 },
      ],
    },
    anyProblemCount: 224, anyProblemPct: 42.8, cleanCount: 299, cleanPct: 57.2,
    evaluated: 588, anyProblemInclDead: 289, anyProblemInclDeadPct: 49.1,
  },
} as const
