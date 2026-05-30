import { NextResponse, type NextRequest } from 'next/server'
import { getProspect } from '@/lib/prospects'

// Server-side proxy for a prospect demo's instant-valuation tool.
//
// Holds the RentCast API key (env) so it is never exposed to the browser, and
// is gated by the same per-prospect cookie as the preview itself — so the key
// can only be exercised by someone who has already entered the demo password.
// Mirrors the cookie/runtime conventions of the sibling login route.

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

function mapType(t: string): string {
  const s = t.toLowerCase()
  if (s.includes('condo') || s.includes('town')) return 'Condo'
  if (s.includes('commercial') || s.includes('invest') || s.includes('multi')) return 'Multi-Family'
  return 'Single Family'
}

export async function GET(req: NextRequest, { params }: { params: Params }): Promise<Response> {
  const { slug } = await params

  // Unknown slug — 404 so probing the endpoint doesn't reveal which slugs exist.
  if (!getProspect(slug)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // The per-prospect cookie is path-scoped to /p/<slug>, so the browser never
  // sends it to this /api/ path — gate softly on a same-origin referer instead.
  // The RentCast free tier (50 lookups/month) bounds any abuse regardless.
  const provenance = (req.headers.get('referer') || '') + ' ' + (req.headers.get('origin') || '')
  if (process.env.NODE_ENV === 'production' && !provenance.includes('blackhartconsulting.com')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const key = process.env.RENTCAST_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const address = (req.nextUrl.searchParams.get('address') || '').trim()
  if (!address) {
    return NextResponse.json({ error: 'address_required' }, { status: 400 })
  }

  const qs = new URLSearchParams({
    address,
    propertyType: mapType(req.nextUrl.searchParams.get('propertyType') || ''),
    compCount: '5',
    lookupSubjectAttributes: 'true',
  })
  const headers = { 'X-Api-Key': key, Accept: 'application/json' }

  try {
    const [valR, rentR] = await Promise.allSettled([
      fetch(`https://api.rentcast.io/v1/avm/value?${qs.toString()}`, { headers }),
      fetch(`https://api.rentcast.io/v1/avm/rent/long-term?${qs.toString()}`, { headers }),
    ])

    if (valR.status !== 'fulfilled' || !valR.value.ok) {
      const detail = valR.status === 'fulfilled' ? await valR.value.text() : String(valR.reason)
      return NextResponse.json({ error: 'rentcast_failed', detail }, { status: 502 })
    }

    const v = await valR.value.json()
    const comparables = Array.isArray(v.comparables) ? v.comparables : []
    const out: Record<string, unknown> = {
      source: 'rentcast',
      address,
      value: v.price,
      low: v.priceRangeLow,
      high: v.priceRangeHigh,
      comps: comparables.slice(0, 5).map((c: Record<string, unknown>) => ({
        address: c.formattedAddress,
        price: c.price,
        beds: c.bedrooms,
        baths: c.bathrooms,
        sqft: c.squareFootage,
        distance: c.distance,
      })),
    }

    if (rentR.status === 'fulfilled' && rentR.value.ok) {
      const rj = await rentR.value.json()
      if (rj && rj.rent) {
        out.rent = rj.rent
        out.rentLow = rj.rentRangeLow
        out.rentHigh = rj.rentRangeHigh
      }
    }

    return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String((e as Error)?.message || e) }, { status: 500 })
  }
}
