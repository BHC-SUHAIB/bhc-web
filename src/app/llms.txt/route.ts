// llms.txt convention (llmstxt.org): a plain-text, markdown-formatted file
// that gives AI assistants and LLM crawlers a concise map of the site,
// its services, exact prices, and its most useful pages.
//
// Content is hand-maintained here rather than pulled from Payload: prices
// and routes change rarely enough (see src/seed/reset-content.ts, the
// single source of truth for the nine-SKU catalog, and src/seed/onInit.ts
// for the seeded article slugs) that a static string is the correct amount
// of machinery, mirroring src/app/robots.ts. Unlike src/app/sitemap.ts this
// route makes no Payload calls, so it can stay statically generated.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com').replace(/\/$/, '')

const LLMS_TXT = `# Black Hart Consulting

> Houston Heights web design and development studio. Fixed-price websites, AI phone answering, and business automation for local service businesses, built in days instead of months.

Houston Heights, TX. Phone (866) 434-9777. Email hello@blackhartconsulting.com.

## Services and pricing

- [Services](${SITE_URL}/services): Full price list. Launch Page $399 (3-day build), Starter Site $699 one-time or $119/mo for 12 months then owned (7-day build), Pro Site $1,795 one-time or $249/mo for 12 months then owned (14-day build), Custom Build from $5,000 (scoped proposal in 48 hours). Hosting plans: Host $59/mo, Care $129/mo, Growth $395/mo.
- [Fix-it menu](${SITE_URL}/fix-it): Single-issue fixes at fixed prices, each with a before-and-after report and a 30-day guarantee: Site Health Sprint $249 (5 days, pick 3 fixes), Google Business Profile Setup $195 (3 days), Schema Markup Pack $195 (3 days), GA4 + Conversion Tracking $195 (3 days), Site Speed Sprint $395 (5 days), Mobile Audit + Fix $395 (5 days), 5-Page SEO Refresh $395 (7 days).
- [AI Front Desk](${SITE_URL}/ai-front-desk): AI phone answering that books appointments and texts callers back. Setup $299 one-time, live in 5 days. Then Basic $149/mo (300 minutes), Plus $249/mo (750 minutes), or Pro $399/mo (1,500 minutes). Overage $0.35 per minute on all plans.
- [Automation and internal tools](${SITE_URL}/automation): Automation Sprint $799 for one workflow (7-day delivery), Automation Run $79/mo per client to keep workflows running, Internal Tool from $2,500 (2 to 3 weeks) plus $99/mo hosting.
- [Local SEO + AI Search](${SITE_URL}/services#seo): Local SEO + AI Search Sprint $449, 10-day delivery (Google Business Profile setup, 10 citations, schema, FAQ page, and llms.txt). Local SEO + AI Search Monthly $295/mo (weekly Google Business Profile post, 5 citations, 1 article a month).
- [Free demo site](${SITE_URL}/free-demo-site): Free working mockup of a business's new site built from its public listing, delivered within 48 hours, no cost or obligation.

## Bundles

- [Open for Business](${SITE_URL}/services#websites): $999 plus $149/mo. Starter Site, Google Business Profile setup, and AI Front Desk setup plus Basic plan (300 minutes).
- [Booked Solid](${SITE_URL}/services#websites): $1,395 plus $149/mo. Everything in Open for Business, plus the Local SEO + AI Search Sprint and one Automation Sprint.

## Company

- [Home](${SITE_URL}/): Overview of services, pricing, and guarantees.
- [About](${SITE_URL}/about): The studio, its founder, and how engagements work.
- [Contact](${SITE_URL}/contact): Contact form; replies within one business day.
- [Portfolio](${SITE_URL}/portfolio): Case studies of completed client projects.
- [Articles](${SITE_URL}/articles): Blog covering web performance, SEO, hosting, and AI phone answering.
- [Houston Heights web design](${SITE_URL}/houston): Local service pages by Houston neighborhood.

## Articles

- [Why we build on Next.js instead of WordPress](${SITE_URL}/articles/why-nextjs-over-wordpress): Platform comparison for small-business client work.
- [A realistic SEO playbook for small teams](${SITE_URL}/articles/realistic-seo-playbook): SEO priorities for a business without a content team.
- [Managed hosting is a boring superpower](${SITE_URL}/articles/managed-hosting-boring-superpower): What a managed hosting retainer actually covers.
- [The Core Web Vitals playbook](${SITE_URL}/articles/core-web-vitals-playbook): The order of operations used to fix LCP, CLS, and INP.
- [What an AI receptionist actually costs a Houston contractor](${SITE_URL}/articles/ai-receptionist-cost-houston-contractor): Cost comparison of human answering services versus AI phone answering.
- [How to show up when someone asks ChatGPT or Google for a plumber](${SITE_URL}/articles/show-up-in-chatgpt-google-local-search): How AI assistants pick local businesses, and a 30-day checklist to get mentioned.
`

export async function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
