import { NextResponse } from 'next/server'

// PageSpeed Insights audit endpoint. Server-side proxy to Google's public PSI
// v5 API. We proxy (instead of calling from the browser) so the visitor doesn't
// see any API key, and so we can rate-limit + log + normalise the response
// shape. Free tier of PSI is 25k queries/day and 1 query/second without an API
// key, which is more than enough for the LP audit-tool volume.

export const dynamic = 'force-dynamic'

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const CATEGORIES = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']

// Per-process rolling window. PSI's free tier is ~1 query/sec; we cap stricter
// to leave headroom for legitimate retries. Resets on container restart, which
// is fine for our scale.
const RATE_BUCKET = { count: 0, windowStart: Date.now() }
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30

function withinRateLimit(): boolean {
  const now = Date.now()
  if (now - RATE_BUCKET.windowStart > RATE_WINDOW_MS) {
    RATE_BUCKET.count = 0
    RATE_BUCKET.windowStart = now
  }
  if (RATE_BUCKET.count >= RATE_LIMIT) return false
  RATE_BUCKET.count++
  return true
}

function normaliseUrl(raw: string): URL | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  if (!withinRateLimit()) {
    return NextResponse.json(
      { error: 'rate_limited', message: "We're seeing a lot of audit requests right now. Try again in a minute." },
      { status: 429 },
    )
  }

  let body: { url?: string; strategy?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json', message: 'Could not parse request body.' }, { status: 400 })
  }

  const parsed = normaliseUrl(String(body?.url ?? ''))
  if (!parsed) {
    return NextResponse.json({ error: 'invalid_url', message: "That doesn't look like a valid URL." }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'invalid_protocol', message: 'Only http:// and https:// URLs are supported.' }, { status: 400 })
  }
  // Avoid auditing localhost / private ranges from the public endpoint.
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
    return NextResponse.json({ error: 'unreachable_host', message: 'Cannot audit private or localhost addresses.' }, { status: 400 })
  }

  const strategy = body?.strategy === 'desktop' ? 'desktop' : 'mobile'
  const psiUrl = new URL(PSI_URL)
  psiUrl.searchParams.set('url', parsed.toString())
  psiUrl.searchParams.set('strategy', strategy)
  CATEGORIES.forEach((c) => psiUrl.searchParams.append('category', c))

  // Attach a Google Cloud API key when one is configured. Without a key,
  // Google groups every anonymous PSI request from a shared IP under the
  // same project quota (which is tiny and easily exhausted by other tenants
  // on the same network). With a key the call counts against the project's
  // own 25k-queries-per-day budget. Provision a key at:
  //   https://console.cloud.google.com/apis/credentials
  // and add PAGESPEED_API_KEY=<key> to the droplet's .env, then:
  //   docker compose up -d --force-recreate web
  const apiKey = process.env.PAGESPEED_API_KEY
  if (apiKey) {
    psiUrl.searchParams.set('key', apiKey)
  }

  // PSI can take 20-60s for a cold run. 90s ceiling to fail-fast on edge cases.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  // Build request headers. When the Google Cloud API key has an HTTP-referrer
  // application restriction (the recommended setting so a leaked key can't be
  // used from arbitrary origins), Google rejects server-side requests with
  // no Referer header as `API_KEY_HTTP_REFERRER_BLOCKED`. We send a Referer
  // that matches the site's public URL so the restriction is satisfied
  // without weakening it.
  const headers: Record<string, string> = { Accept: 'application/json' }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (apiKey && siteUrl) {
    headers.Referer = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`
  }
  try {
    const res = await fetch(psiUrl.toString(), {
      signal: controller.signal,
      headers,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const errBody: { error?: { message?: string } } = await res.json().catch(() => ({}))
      const rawMsg = errBody?.error?.message ?? ''
      // Surface a friendly message for the common Google quota error. The raw
      // PSI text is a 200-character mouthful about consumer projects and SKUs
      // that scares visitors. Map it to plain English.
      const isQuota = res.status === 429 || /quota/i.test(rawMsg)
      const friendly = isQuota
        ? "We've hit Google's PageSpeed audit limit for the day. Try again tomorrow, or text me your URL at the number below for a written audit within one business day."
        : rawMsg
          ? `PageSpeed Insights couldn't audit that site. ${rawMsg.slice(0, 200)}`
          : 'PageSpeed Insights returned an error. The site may block crawlers or be down.'
      return NextResponse.json(
        { error: isQuota ? 'quota_exceeded' : 'psi_error', status: res.status, message: friendly },
        { status: isQuota ? 429 : 502 },
      )
    }
    type PsiResp = {
      lighthouseResult?: {
        finalUrl?: string
        categories?: Record<string, { score?: number }>
        audits?: Record<string, { displayValue?: string }>
      }
    }
    const data = (await res.json()) as PsiResp
    const cats = data?.lighthouseResult?.categories ?? {}
    const audits = data?.lighthouseResult?.audits ?? {}
    const scores = {
      performance: Math.round((cats.performance?.score ?? 0) * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
      seo: Math.round((cats.seo?.score ?? 0) * 100),
    }
    const vitals = {
      lcp: audits['largest-contentful-paint']?.displayValue ?? null,
      cls: audits['cumulative-layout-shift']?.displayValue ?? null,
      speedIndex: audits['speed-index']?.displayValue ?? null,
    }
    return NextResponse.json({
      ok: true,
      strategy,
      url: data?.lighthouseResult?.finalUrl ?? parsed.toString(),
      scores,
      vitals,
    })
  } catch (err) {
    clearTimeout(timeout)
    const aborted = (err as { name?: string })?.name === 'AbortError'
    return NextResponse.json(
      {
        error: aborted ? 'timeout' : 'fetch_failed',
        message: aborted
          ? 'PageSpeed Insights took longer than 90 seconds to respond. Try again, or check if the site is reachable.'
          : 'Could not reach PageSpeed Insights. Try again in a moment.',
      },
      { status: aborted ? 504 : 502 },
    )
  }
}
