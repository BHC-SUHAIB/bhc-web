// Cap the source width that next/image fetches from Unsplash before Sharp
// transforms it. Editor-pasted Unsplash URLs almost always include
// `?w=1920&q=80`, but if the `w` is stripped (or the URL never had one),
// Unsplash returns the FULL ORIGINAL — typically 4–5 MB, 5000+ px wide.
// Sharp then has to download all of that, decode it, and resize for every
// `w=` srcset variant Next requests. First-cold-transform per width drops
// from ~1.3 s to ~250 ms when the source is capped at 2400 px instead of
// the original 5000 px.
//
// The 2400 cap is the same number as the Payload Media collection's
// `resizeOptions.width` — uploaded media is already capped to 2400 px,
// and Unsplash sources should match so the largest output (1920 px on
// retina) still has a comfortable headroom for Sharp's downscale.
//
// Used by every block that renders an editor-pasted Unsplash URL through
// next/image (Hero, Stats, CTA, BundleOffer, CalendlyBooking).
//
// History note (2026-05-06): the prior version of this helper STRIPPED
// the `?w=NNNN` from Unsplash URLs entirely on the theory that a baked-in
// width broke retina srcsets. That's true for the rendered output but not
// for the source — Next.js still has to fetch a single source from
// Unsplash per transform, so removing the cap forced a 4-5 MB download
// per request. The fix is to clamp, not strip.
export function clampUnsplashSourceWidth(url: string, max: number = 2400): string {
  // Only operate on Unsplash hosts — leave any other URL untouched.
  if (!/^https?:\/\/(images\.|plus\.|source\.)unsplash\.com\//.test(url)) {
    return url
  }

  const widthMatch = url.match(/[?&]w=(\d+)/)
  if (widthMatch) {
    const current = parseInt(widthMatch[1], 10)
    if (Number.isFinite(current) && current > max) {
      return url.replace(/([?&])w=\d+/, `$1w=${max}`)
    }
    return url
  }

  // No `w=` present — append one. Use the existing query separator.
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}w=${max}`
}

// Backwards-compat re-export for any caller that still imports the old name.
// New code should use clampUnsplashSourceWidth directly. Remove this alias
// after the next refactor pass once all import sites are updated.
export const stripUnsplashFixedWidth = clampUnsplashSourceWidth
