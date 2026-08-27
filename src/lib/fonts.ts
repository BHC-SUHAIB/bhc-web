import { Manrope, Fraunces, JetBrains_Mono } from 'next/font/google'

// Warm Mono redesign (2026-06) font loadout. Headings now run in Fraunces, so
// it carries more visible text and needs a small weight range; the italic is
// used for the brass headline accents. Manrope gains 700 for emphasis/buttons;
// JetBrains gains 500 for labels/prices. Still a tight, subset, woff2 set —
// keep an eye on mobile LCP and trim if a weight proves unused.
//   - Manrope:  400 / 500 / 600 / 700, normal.
//   - Fraunces: 400 / 500 / 600, normal + italic (headlines + accents).
//   - JetBrains Mono: 400 / 500, normal (eyebrows, labels, prices, metadata).

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  variable: '--font-sans',
  // 'optional' instead of 'swap': a late font swap repaints the headline and
  // re-fires LCP at the swap moment, which is what pinned simulated mobile
  // LCP at ~4.5s (the text painted at FCP, then Fraunces arrived and reset
  // the clock). With 'optional', fonts that miss the ~100ms block window sit
  // out that pageview (cached for the next one) and LCP = first text paint.
  // Fast connections and repeat visits still get the brand fonts.
  display: 'optional',
})

export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'optional',
})

export const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal'],
  variable: '--font-mono',
  display: 'swap',
  // Mono only paints eyebrows/labels/prices — small, below-the-headline text.
  // Skipping the preload keeps ~25KB out of the critical path so the hero LCP
  // image wins that bandwidth on mobile; swap paints fallback mono meanwhile.
  preload: false,
})
