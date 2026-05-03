import { type NextRequest, NextResponse } from 'next/server'
import { buildPdf } from '@/lib/pdfs/builder'
import { PDFS } from '@/lib/pdfs/content'

// Force dynamic — pdf-lib's loadLogoBytes() reads from /public at runtime,
// and Next's static-route inference can't see that. Skipping prerender keeps
// the route working in production.
export const dynamic = 'force-dynamic'

// Generates the requested PDF on-demand from the spec in @/lib/pdfs/content.
// Cached at the edge for 24h so Google Ads landing pages don't pay generation
// cost per visitor; the spec lives in source so any copy update ships with
// the next deploy without manual regeneration.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const spec = PDFS[slug]
  if (!spec) return new NextResponse('Not found', { status: 404 })

  const bytes = await buildPdf(spec)
  // pdf-lib returns Uint8Array; widen type so Response/NextResponse accepts it
  // without TS narrowing complaints across runtimes.
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${spec.filename}"`,
      // 24h CDN cache, allow stale-while-revalidate for fast subsequent hits.
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
