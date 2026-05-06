// Strip Unsplash's hardcoded `?w=NNNN` query param from a URL so next/image
// can pick a size variant for the actual viewport. Editor-pasted Unsplash
// URLs almost always include `?w=1920&q=80`, which (a) bypasses Next's
// responsive optimization (the `w` is baked into the source URL Next sees,
// not the rendered output), and (b) ships a 1920px source on mobile when
// 750px would do. Lighthouse audit 2026-05-05 traced multi-second mobile
// LCP regressions site-wide to this single pattern.
//
// Used by every block that renders a backgroundImageUrl through next/image
// (Hero, Stats, CTA, BundleOffer, CalendlyBooking). Keep `q=80` if present —
// that's the JPEG quality and is fine.
export function stripUnsplashFixedWidth(url: string): string {
  return url
    .replace(/([?&])w=\d+&?/, (_m, sep) => (sep === '?' ? '?' : '&'))
    .replace(/[?&]$/, '')
}
