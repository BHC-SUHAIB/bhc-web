/*
 * Renders a 320x132 PNG logo for Google Admin / Google Sites.
 * Composes: hart mark (left) + "BLACK HART" wordmark (right) + "CONSULTING" tagline.
 *
 * Run from the BHC_WEB directory:
 *   node scripts/build-google-admin-logo.mjs
 *
 * Outputs into ../BHC_BRAND/logos/final/:
 *   - black-hart-google-admin.png          (dark logo, transparent bg)
 *   - black-hart-google-admin-reversed.png (ivory logo on ink, for dark contexts)
 *   - black-hart-google-admin.svg          (source)
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BRAND_DIR = path.resolve(ROOT, '../BHC_BRAND/logos/final')

// Extract the hart silhouette path from the primary logo SVG
const primarySvg = fs.readFileSync(path.join(BRAND_DIR, 'black-hart-primary.svg'), 'utf-8')
const pathMatch = primarySvg.match(/<path d="([^"]+)"/)
if (!pathMatch) throw new Error('Could not find hart path in primary SVG')
const hartPath = pathMatch[1]

/**
 * Build a 320x132 SVG with the given color palette.
 * @param {{ ink: string, forest: string, bg: string | null }} palette
 */
function buildSvg({ ink, forest, bg }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 132" width="320" height="132">
  ${bg ? `<rect width="320" height="132" fill="${bg}"/>` : ''}

  <!-- Hart mark on the left, ~96px tall, 12px top/bottom margin -->
  <g transform="translate(14, 18) scale(0.069) translate(-600, -200)" fill="${ink}">
    <path d="${hartPath}"/>
  </g>

  <!-- BLACK HART wordmark -->
  <text x="112" y="60"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="800" font-size="28" letter-spacing="1.4"
        fill="${ink}">BLACK HART</text>

  <!-- Thin divider -->
  <line x1="112" y1="76" x2="306" y2="76"
        stroke="${ink}" stroke-width="0.8" opacity="0.35" stroke-linecap="round"/>

  <!-- CONSULTING tagline -->
  <text x="112" y="94"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="500" font-size="11" letter-spacing="4.2"
        fill="${forest}">CONSULTING</text>
</svg>`
}

const DARK = { ink: '#1A1713', forest: '#2F4A35', bg: null }       // transparent
const REVERSED = { ink: '#EFE9D9', forest: '#D6D0C2', bg: '#1A1713' } // ivory on ink

async function renderPng(svg, outPath) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(320, 132, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  const stat = fs.statSync(outPath)
  console.log(`  wrote ${path.relative(ROOT, outPath)}  (${(stat.size / 1024).toFixed(1)} KB)`)
}

async function main() {
  const darkSvg = buildSvg(DARK)
  const reversedSvg = buildSvg(REVERSED)

  fs.writeFileSync(path.join(BRAND_DIR, 'black-hart-google-admin.svg'), darkSvg)
  console.log(`  wrote ${path.relative(ROOT, path.join(BRAND_DIR, 'black-hart-google-admin.svg'))}`)

  await renderPng(darkSvg, path.join(BRAND_DIR, 'black-hart-google-admin.png'))
  await renderPng(reversedSvg, path.join(BRAND_DIR, 'black-hart-google-admin-reversed.png'))

  console.log('\n\u2713 Done. Upload black-hart-google-admin.png to Google Admin.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
