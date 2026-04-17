/*
 * Renders platform-specific PNG logos from the canonical SVG mark.
 * Add new platforms by appending to `PLATFORMS` at the bottom.
 *
 * Run from BHC_WEB directory:
 *   node scripts/build-platform-logos.mjs
 *
 * Outputs into ../BHC_BRAND/logos/final/ and BHC_WEB/public/brand/
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BRAND_DIR = path.resolve(ROOT, '../BHC_BRAND/logos/final')
const PUBLIC_DIR = path.resolve(ROOT, 'public/brand')

// Hart silhouette path — pulled once from the canonical primary mark.
const primarySvg = fs.readFileSync(path.join(BRAND_DIR, 'black-hart-primary.svg'), 'utf-8')
const hartPath = primarySvg.match(/<path d="([^"]+)"/)?.[1]
if (!hartPath) throw new Error('Could not extract hart path from primary SVG')

// Canonical primary mark viewBox is "600 200 1220 1390" (W x H = 1220 x 1390).
// All transforms below assume that.
const HART_W = 1220
const HART_H = 1390

const COLORS = {
  ink:    '#1A1713',
  forest: '#2F4A35',
  ivory:  '#EFE9D9',
  parchment: '#D6D0C2',
}

/* ---------------- Layout: hart + horizontal wordmark (e.g. Google Admin) ---------------- */
function horizontalLockup({ w, h, ink, forest, bg = null, markHeightPct = 0.72, pad = 14 }) {
  const markH = Math.round(h * markHeightPct)
  const scale = markH / HART_H
  const markW = HART_W * scale
  const markX = pad
  const markY = Math.round((h - markH) / 2)

  const textX = pad + markW + 14
  const wordmarkFontSize = Math.round(h * 0.215)
  const taglineFontSize = Math.max(9, Math.round(h * 0.085))
  const centerY = h / 2
  const wordmarkY = centerY - 4
  const ruleY = centerY + 10
  const taglineY = centerY + 26

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}
  <g transform="translate(${markX}, ${markY}) scale(${scale.toFixed(4)}) translate(-600, -200)" fill="${ink}">
    <path d="${hartPath}"/>
  </g>
  <text x="${textX}" y="${wordmarkY}"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="800" font-size="${wordmarkFontSize}" letter-spacing="1.4"
        fill="${ink}">BLACK HART</text>
  <line x1="${textX}" y1="${ruleY}" x2="${w - pad}" y2="${ruleY}"
        stroke="${ink}" stroke-width="0.8" opacity="0.35" stroke-linecap="round"/>
  <text x="${textX}" y="${taglineY}"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="500" font-size="${taglineFontSize}" letter-spacing="4.2"
        fill="${forest}">CONSULTING</text>
</svg>`
}

/* ---------------- Layout: hart centered in a square (e.g. Exclaimer, avatars) ---------------- */
function squareMark({ size, ink, bg = null, padPct = 0.12 }) {
  const pad = size * padPct
  const maxH = size - pad * 2
  const scale = maxH / HART_H
  const markW = HART_W * scale
  const markH = HART_H * scale
  const x = (size - markW) / 2
  const y = (size - markH) / 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <g transform="translate(${x.toFixed(2)}, ${y.toFixed(2)}) scale(${scale.toFixed(4)}) translate(-600, -200)" fill="${ink}">
    <path d="${hartPath}"/>
  </g>
</svg>`
}

/* ---------------- Rasterize helper ---------------- */
async function renderPng(svg, outPath) {
  // Extract declared width/height from the SVG so the PNG is exactly that size.
  // We render at high density for sharp antialiasing, then resize down \u2014 this gives
  // much cleaner edges than letting librsvg render at the target resolution directly.
  const w = Number(svg.match(/<svg[^>]*\\swidth="(\\d+)"/)?.[1] ?? svg.match(/<svg[^>]*\swidth="(\d+)"/)?.[1])
  const h = Number(svg.match(/<svg[^>]*\\sheight="(\\d+)"/)?.[1] ?? svg.match(/<svg[^>]*\sheight="(\d+)"/)?.[1])
  if (!w || !h) throw new Error('Could not determine target size from SVG')
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  const stat = fs.statSync(outPath)
  console.log(`  wrote ${path.relative(ROOT, outPath)}  (${w}x${h}, ${(stat.size / 1024).toFixed(1)} KB)`)
}

function writeSvg(name, svg) {
  const svgPath = path.join(BRAND_DIR, `${name}.svg`)
  fs.writeFileSync(svgPath, svg)
  console.log(`  wrote ${path.relative(ROOT, svgPath)}`)
}

async function emit(name, svg) {
  writeSvg(name, svg)
  const brandPng = path.join(BRAND_DIR, `${name}.png`)
  const publicPng = path.join(PUBLIC_DIR, `${name}.png`)
  await renderPng(svg, brandPng)
  fs.copyFileSync(brandPng, publicPng)
  console.log(`  copied \u2192 ${path.relative(ROOT, publicPng)}`)
}

/* ---------------- Platforms ---------------- */
const PLATFORMS = [
  {
    name: 'black-hart-google-admin',
    // 320x132, dark logo on transparent \u2014 Google Admin / Google Sites services logo
    svg: horizontalLockup({ w: 320, h: 132, ink: COLORS.ink, forest: COLORS.forest }),
  },
  {
    name: 'black-hart-google-admin-reversed',
    // Same but ivory on ink for dark-themed contexts
    svg: horizontalLockup({ w: 320, h: 132, ink: COLORS.ivory, forest: COLORS.parchment, bg: COLORS.ink }),
  },
  {
    name: 'black-hart-exclaimer',
    // 200x200 hart mark on transparent \u2014 Exclaimer email-signature manager company logo
    svg: squareMark({ size: 200, ink: COLORS.ink }),
  },
  {
    name: 'black-hart-exclaimer-reversed',
    // 200x200 ivory hart on ink \u2014 for dark-backgrounded email signatures
    svg: squareMark({ size: 200, ink: COLORS.ivory, bg: COLORS.ink }),
  },
  {
    name: 'black-hart-avatar-512',
    // 512x512 generic square avatar (LinkedIn, GitHub org, social)
    svg: squareMark({ size: 512, ink: COLORS.ink }),
  },
]

async function main() {
  for (const p of PLATFORMS) {
    console.log(`\n${p.name}`)
    await emit(p.name, p.svg)
  }
  console.log('\n\u2713 All platform logos generated.')
}

main().catch((err) => { console.error(err); process.exit(1) })
