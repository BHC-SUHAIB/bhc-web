import { Manrope, Fraunces, JetBrains_Mono } from 'next/font/google'

// Only load the weights/styles actually used in the UI:
//   - Manrope: body (400), medium (500), semibold (600). No italic.
//   - Fraunces: semibold (600) only. Italic used in blockquotes.
//   - JetBrains Mono: regular (400) for eyebrows & badges. No italic, no weights.
// Restricting weights cuts font payload by roughly 60-70% vs loading the full
// families, which measurably improves LCP on mobile.

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal'],
  variable: '--font-sans',
  display: 'swap',
})

export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal'],
  variable: '--font-mono',
  display: 'swap',
})
