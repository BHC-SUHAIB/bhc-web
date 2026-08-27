/* Phase 4 verification: status codes, link resolution, tel/mailto shape, price
 * scrape vs the facts table, and sitemap membership.
 *
 * Run against a running server:
 *   npx tsx scripts/pricing-reset/verify-pages.mts http://localhost:3000
 */

const ORIGIN = process.argv[2] || 'http://localhost:3000'

const PAGES = [
  '/', '/services', '/fix-it', '/ai-front-desk', '/automation', '/free-demo-site',
  '/thanks', '/about', '/contact', '/contact?tier=starter-site', '/portfolio',
  '/web-design-houston-heights', '/local-seo-houston',
]

// Every dollar amount that may legitimately appear on the reset pages
// (facts table + copy pack + budget ranges + carried-over copy).
const ALLOWED_PRICES = new Set([
  '$399', '$699', '$119', '$1,795', '$249', '$5,000', '$59', '$129', '$395',
  '$449', '$295', '$299', '$149', '$799', '$79', '$2,500', '$99', '$195',
  '$999', '$1,395', '$0.35', '$49', '$1,193', '$208', '$2,441', '$287',
  '$2,000', '$500', '$1,000',
  // Pre-existing About-page bio copy ("deliverables you'd normally pay $20K+ for")
  '$20K',
])

const FORBIDDEN = /founding|spots remaining|\$1,950|\$4,500|\$1,495|Save \$|(?<![a-z])retail(?![a-z])|346[ .-]?560[ .-]?5430|3465605430/i

type Result = { page: string; status: number; badLinks: string[]; badTel: string[]; prices: string[]; unexpected: string[]; forbidden: string[] }

async function fetchStatus(url: string): Promise<number> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    return res.status
  } catch {
    return 0
  }
}

async function main() {
  const results: Result[] = []
  const checkedLinks = new Map<string, number>()

  for (const page of PAGES) {
    const url = ORIGIN + page
    const res = await fetch(url)
    const html = res.ok ? await res.text() : ''

    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
      .filter((h) => !h.startsWith('#') && !h.startsWith('data:'))
    const badLinks: string[] = []
    const badTel: string[] = []

    for (const href of new Set(hrefs)) {
      if (/^tel:/i.test(href)) {
        if (!/^tel:\+?[\d]{10,15}$/.test(href)) badTel.push(href)
        continue
      }
      if (/^mailto:/i.test(href)) {
        if (!/^mailto:[^@\s]+@[^@\s]+\.[a-z]+$/i.test(href)) badTel.push(href)
        continue
      }
      if (/^https?:\/\//i.test(href)) continue // external: not fetched
      if (href.startsWith('/_next') || href.startsWith('/admin')) continue
      const target = ORIGIN + href
      if (!checkedLinks.has(target)) checkedLinks.set(target, await fetchStatus(target))
      const st = checkedLinks.get(target)!
      if (st !== 200) badLinks.push(`${href} -> ${st}`)
    }

    // Visible-text price scrape (strip tags/scripts first)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
    const prices = [...new Set([...text.matchAll(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?K?/g)].map((m) => m[0]))]
    const unexpected = prices.filter((p) => !ALLOWED_PRICES.has(p))
    const forbidden = [...new Set((text.match(new RegExp(FORBIDDEN.source, 'gi')) ?? []))]

    results.push({ page, status: res.status, badLinks, badTel, prices, unexpected, forbidden })
  }

  // Sitemap checks
  const sitemap = await (await fetch(ORIGIN + '/sitemap.xml')).text()
  const mustInclude = ['/services', '/fix-it', '/ai-front-desk', '/automation', '/free-demo-site']
  const sitemapProblems: string[] = []
  for (const p of mustInclude) if (!sitemap.includes(p)) sitemapProblems.push(`missing ${p}`)
  if (/\/thanks</.test(sitemap)) sitemapProblems.push('contains /thanks')

  let failures = 0
  for (const r of results) {
    const problems: string[] = []
    if (r.status !== 200) problems.push(`status ${r.status}`)
    if (r.badLinks.length) problems.push(`broken links: ${r.badLinks.join(', ')}`)
    if (r.badTel.length) problems.push(`malformed tel/mailto: ${r.badTel.join(', ')}`)
    if (r.unexpected.length) problems.push(`unexpected prices: ${r.unexpected.join(', ')}`)
    if (r.forbidden.length) problems.push(`FORBIDDEN: ${r.forbidden.join(', ')}`)
    if (problems.length) {
      failures++
      console.log(`FAIL ${r.page}\n  ${problems.join('\n  ')}`)
    } else {
      console.log(`ok   ${r.page} (prices: ${r.prices.join(' ') || 'none'})`)
    }
  }
  if (sitemapProblems.length) { failures++; console.log(`FAIL sitemap: ${sitemapProblems.join('; ')}`) }
  else console.log('ok   sitemap (new pages present, /thanks excluded)')

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} PAGE(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
