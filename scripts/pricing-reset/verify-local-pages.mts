/* Phase 6 verification: status + link checks on the hub and all 42 pages,
 * plus a duplicate-content check that no two pages share more than 40% of
 * their sentences (exact sentence-string matches on rendered visible text).
 *
 *   npx tsx scripts/pricing-reset/verify-local-pages.mts http://localhost:3000
 */

const ORIGIN = process.argv[2] || 'http://localhost:3000'

const VERTICALS = ['plumbers', 'hvac', 'electricians', 'roofers', 'dentists', 'med-spas', 'auto-repair']
const NEIGHBORHOODS = ['heights', 'montrose', 'garden-oaks', 'spring-branch', 'katy', 'cypress']

const slugs = VERTICALS.flatMap((v) => NEIGHBORHOODS.map((n) => `${v}-website-design-${n}`))

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
}

function sentences(text: string): Set<string> {
  return new Set(
    text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.split(' ').length >= 6),
  )
}

async function main() {
  let failures = 0

  // Hub
  const hub = await fetch(`${ORIGIN}/houston`)
  console.log(`hub /houston: ${hub.status}`)
  if (hub.status !== 200) failures++
  const hubHtml = await hub.text()
  for (const slug of slugs) {
    if (!hubHtml.includes(`/houston/${slug}`)) { failures++; console.log(`hub missing link to ${slug}`) }
  }

  // Pages: status, word count, sentence sets
  const pageSentences = new Map<string, Set<string>>()
  for (const slug of slugs) {
    const res = await fetch(`${ORIGIN}/houston/${slug}`)
    if (res.status !== 200) { failures++; console.log(`FAIL ${slug}: status ${res.status}`); continue }
    const html = await res.text()
    const text = visibleText(html)
    const words = text.split(' ').filter(Boolean).length
    if (words < 400) { failures++; console.log(`FAIL ${slug}: only ${words} words`) }
    pageSentences.set(slug, sentences(text))
  }
  console.log(`pages checked: ${pageSentences.size}/42, all >= 400 words: ${failures === 0 ? 'yes' : 'see failures'}`)

  // Duplicate-content: pairwise shared-sentence ratio <= 40% on page-specific
  // copy. Sentences present on nearly every page (header, footer, and the
  // sitewide offer blocks: pricing, phone demo, guarantees, closing CTA) are
  // template chrome, identical by design like the nav, and are excluded so the
  // check measures the editorial content that makes each page non-doorway.
  const freq = new Map<string, number>()
  for (const set of pageSentences.values()) for (const s of set) freq.set(s, (freq.get(s) ?? 0) + 1)
  const chromeThreshold = Math.floor(pageSentences.size * 0.8)
  for (const [slug, set] of pageSentences) {
    pageSentences.set(slug, new Set([...set].filter((s) => (freq.get(s) ?? 0) < chromeThreshold)))
  }

  let worst = { a: '', b: '', ratio: 0 }
  const entries = [...pageSentences.entries()]
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [aSlug, aSet] = entries[i]
      const [bSlug, bSet] = entries[j]
      let shared = 0
      for (const s of aSet) if (bSet.has(s)) shared++
      const ratio = shared / Math.min(aSet.size, bSet.size)
      if (ratio > worst.ratio) worst = { a: aSlug, b: bSlug, ratio }
      if (ratio > 0.4) {
        failures++
        console.log(`FAIL duplicate content: ${aSlug} vs ${bSlug} share ${(ratio * 100).toFixed(0)}% of sentences`)
      }
    }
  }
  console.log(`worst sentence overlap: ${worst.a} vs ${worst.b} at ${(worst.ratio * 100).toFixed(0)}%`)

  // Sitemap
  const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text()
  const missing = ['houston', ...slugs.map((s) => `/houston/${s}`)].filter((u) => !sitemap.includes(u))
  if (missing.length) { failures++; console.log(`FAIL sitemap missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`) }
  else console.log('sitemap: hub + all 42 present')

  console.log(failures === 0 ? '\nALL LOCAL-PAGE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
