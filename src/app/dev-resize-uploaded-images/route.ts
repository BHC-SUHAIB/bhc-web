/**
 * Dev-only one-off: re-process Media records whose ORIGINAL file is larger
 * than the resize cap (2400px wide), shrinking them in place via Sharp +
 * Payload's update API. Triggered after introducing `resizeOptions` on the
 * Media collection so existing oversized uploads (the homepage hero PNGs at
 * ~1MB / 4000px wide) come down to ~150KB / 2400px wide.
 *
 *   curl -X POST https://blackhartconsulting.com/dev-resize-uploaded-images
 *
 * Locked in production unless ALLOW_DEV_SEED=one-time-yes is set on the
 * container — same pattern as the rest of the /dev-* endpoints.
 *
 * Returns 403 in production by default. Delete this file once the migration
 * has run on prod + dev.
 */

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import sharp from 'sharp'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

export const dynamic = 'force-dynamic'

// Match the cap configured in src/collections/Media.ts. Anything wider than
// this gets resized; anything ≤ this is left alone.
const MAX_WIDTH = 2400

type Result = {
  filename: string
  status: 'resized' | 'skipped-small' | 'skipped-non-image' | 'error'
  before?: { width: number; height: number; size: number; format: string }
  after?: { width: number; height: number; size: number; format: string }
  error?: string
}

export async function POST(): Promise<Response> {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'media',
    limit: 500,
    depth: 0,
  })

  const results: Result[] = []

  for (const doc of docs as Array<Record<string, unknown>>) {
    const filename = (doc.filename as string) ?? '(no filename)'
    const mimeType = (doc.mimeType as string) ?? ''
    const url = (doc.url as string) ?? ''
    const id = doc.id

    if (!mimeType.startsWith('image/')) {
      results.push({ filename, status: 'skipped-non-image' })
      continue
    }

    if (!url || !id) {
      results.push({ filename, status: 'error', error: 'missing url or id' })
      continue
    }

    try {
      // Pull the current original file. With S3 storage adapter, `url` is a
      // public CDN URL; with local fallback it's a /api/media/file/<name> URL.
      // Either way, fetch resolves it.
      const fetchUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}${url}`
      const res = await fetch(fetchUrl, { cache: 'no-store' })
      if (!res.ok) {
        results.push({ filename, status: 'error', error: `fetch ${fetchUrl}: HTTP ${res.status}` })
        continue
      }
      const inputBuffer = Buffer.from(await res.arrayBuffer())

      const inputMeta = await sharp(inputBuffer).metadata()
      const beforeWidth = inputMeta.width ?? 0
      const beforeFormat = (inputMeta.format as string) ?? 'unknown'

      if (beforeWidth <= MAX_WIDTH) {
        results.push({
          filename,
          status: 'skipped-small',
          before: {
            width: beforeWidth,
            height: inputMeta.height ?? 0,
            size: inputBuffer.length,
            format: beforeFormat,
          },
        })
        continue
      }

      // Resize preserving format. PNG transparency stays PNG; JPEG re-encoded
      // at quality 85 (the Sharp default for JPEG out from a re-encode).
      const resized = await sharp(inputBuffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' })
        .toBuffer({ resolveWithObject: true })

      const afterMeta = await sharp(resized.data).metadata()

      // Push back through Payload's update with a `file` payload — this
      // re-runs the upload pipeline (S3 upload, imageSizes regeneration).
      await payload.update({
        collection: 'media',
        id: id as string | number,
        data: {} as Record<string, unknown>,
        file: {
          name: filename,
          data: resized.data,
          mimetype: mimeType,
          size: resized.data.length,
        },
      })

      results.push({
        filename,
        status: 'resized',
        before: {
          width: beforeWidth,
          height: inputMeta.height ?? 0,
          size: inputBuffer.length,
          format: beforeFormat,
        },
        after: {
          width: afterMeta.width ?? 0,
          height: afterMeta.height ?? 0,
          size: resized.data.length,
          format: (afterMeta.format as string) ?? 'unknown',
        },
      })
    } catch (e) {
      results.push({ filename, status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  }

  // Bust any cached page that referenced the old image variants. The Next.js
  // `/_next/image` endpoint hashes by source URL, so technically the URLs
  // didn't change — Spaces overwrote at the same key. But Sharp's transform
  // cache on the droplet keys by source URL + size; that cache lives at
  // /app/.next/cache/images and would still serve stale variants until it
  // expires. Clearing the data-fetch tags here is best-effort; a container
  // recreate after this runs is the cleanest cache reset.
  try {
    revalidateTag('payload-media-list')
  } catch {
    // Tag may not exist; safe to ignore.
  }

  const summary = {
    total: results.length,
    resized: results.filter((r) => r.status === 'resized').length,
    skippedSmall: results.filter((r) => r.status === 'skipped-small').length,
    skippedNonImage: results.filter((r) => r.status === 'skipped-non-image').length,
    errors: results.filter((r) => r.status === 'error').length,
  }

  return NextResponse.json({ summary, results }, { status: 200 })
}
