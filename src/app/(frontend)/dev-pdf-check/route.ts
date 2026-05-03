import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { buildPdf } from '@/lib/pdfs/builder'
import { PDFS } from '@/lib/pdfs/content'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

export const dynamic = 'force-dynamic'

// Dev helper — returns page count for every registered PDF so we can verify
// each one fits on a single page after a content/builder edit. Loads pdf-lib
// server-side to count pages directly instead of regex-parsing the binary.
// Lives outside `/downloads/` so the dynamic `[slug]` route doesn't intercept it.
export async function GET() {
  const denied = denyIfProductionLocked()
  if (denied) return denied
  const out: Record<string, { bytes: number; pageCount: number; ok: boolean }> = {}
  for (const [slug, spec] of Object.entries(PDFS)) {
    const bytes = await buildPdf(spec)
    const doc = await PDFDocument.load(bytes)
    const count = doc.getPageCount()
    out[slug] = { bytes: bytes.byteLength, pageCount: count, ok: count === 1 }
  }
  return NextResponse.json(out)
}
