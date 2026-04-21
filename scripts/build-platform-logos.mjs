/*
 * Renders platform-specific PNG logos from the canonical SVG mark.
 * Add new platforms by appending to `PLATFORMS` at the bottom.
 *
 * Run from the project directory:
 *   node scripts/build-platform-logos.mjs
 *
 * Outputs into ~/Desktop/Web Development/brand-kit/logos/final/
 * and this project's public/brand/.
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BRAND_DIR = path.join(os.homedir(), 'Desktop/Web Development/brand-kit/logos/final')
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

/* ---------------- Layout: hart + big "BHC" monogram (Google Admin, small contexts) ---------------- */
// The full "BLACK HART / CONSULTING" wordmark is illegible at 320x132 and below.
// This layout swaps in a large "BHC" where the "C" is coloured with the accent,
// preserving the brand split without needing readable sub-pixel typography.
function bhcLockup({ w, h, ink, accent, bg = null, pad = 18 }) {
  const markH = h * 0.78
  const scale = markH / HART_H
  const markW = HART_W * scale
  const markX = pad
  const markY = (h - markH) / 2

  const textX = pad + markW + 18
  const fontSize = Math.round(h * 0.58)
  // No dominant-baseline support in some SVG renderers; compute baseline manually.
  // Manrope 800 cap-height ~= 0.72 * fontSize, so visual centring = h/2 + cap/2.
  const baselineY = h / 2 + fontSize * 0.36

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}
  <g transform="translate(${markX}, ${markY}) scale(${scale.toFixed(4)}) translate(-600, -200)" fill="${ink}">
    <path d="${hartPath}"/>
  </g>
  <text x="${textX}" y="${baselineY.toFixed(2)}"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="800" font-size="${fontSize}" letter-spacing="2"
        fill="${ink}">BH<tspan fill="${accent}">C</tspan></text>
</svg>`
}

/* ---------------- Layout: hart + horizontal wordmark (larger contexts, letterheads) ---------------- */
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

/* ---------------- Layout: wide banner (e.g. Exclaimer signature banner, headers) ---------------- */
function wideBanner({ w, h, ink, ivory, brass, parchment, bg }) {
  const markH = Math.round(h * 0.78)
  const scale = markH / HART_H
  const markW = HART_W * scale
  const markX = 36
  const markY = Math.round((h - markH) / 2)

  const textX = markX + markW + 20
  const wordmarkSize = Math.round(h * 0.38)
  const taglineSize = Math.round(h * 0.13)
  const servicesSize = Math.round(h * 0.095)

  const centerY = h / 2
  const wordmarkY = centerY - 8
  const ruleY = centerY + 6
  const servicesY = centerY + 22

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <g transform="translate(${markX}, ${markY}) scale(${scale.toFixed(4)}) translate(-600, -200)" fill="${ivory}">
    <path d="${hartPath}"/>
  </g>
  <text x="${textX}" y="${wordmarkY}"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="800" font-size="${wordmarkSize}" letter-spacing="3"
        fill="${ivory}">BLACK HART</text>
  <line x1="${textX}" y1="${ruleY}" x2="${w - 36}" y2="${ruleY}"
        stroke="${parchment}" stroke-width="1" opacity="0.5" stroke-linecap="round"/>
  <text x="${textX}" y="${servicesY}"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="500" font-size="${servicesSize}" letter-spacing="8"
        fill="${brass}">WEB &#8226; SEO &#8226; APPS &#8226; HOSTING</text>
</svg>`
}

/* ---------------- Layout: meeting background (1920x1080, minimal, corner mark only) ---------------- */
function meetingBackground({ w, h, ink, ivory, brass }) {
  // Hart mark in bottom-right corner. Small, tasteful watermark that
  // doesn't compete with the speaker's face in the centre of frame.
  const markH = Math.round(h * 0.22)
  const scale = markH / HART_H
  const markW = HART_W * scale
  const cornerMargin = Math.round(h * 0.06)
  const markX = w - markW - cornerMargin
  const markY = h - markH - cornerMargin

  // Wordmark in bottom-left, balanced against the hart in bottom-right
  const wordmarkSize = Math.round(h * 0.042)
  const taglineSize = Math.round(h * 0.019)
  const textX = cornerMargin
  const textY = h - cornerMargin - 12

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.9">
      <stop offset="45%" stop-color="${ink}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${ink}"/>
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
  <g transform="translate(${markX.toFixed(2)}, ${markY.toFixed(2)}) scale(${scale.toFixed(4)}) translate(-600, -200)" fill="${ivory}" opacity="0.22">
    <path d="${hartPath}"/>
  </g>
  <text x="${textX}" y="${textY - wordmarkSize - 6}"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="700" font-size="${wordmarkSize}" letter-spacing="4"
        fill="${ivory}">BLACK HART</text>
  <text x="${textX}" y="${textY}"
        font-family="'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="500" font-size="${taglineSize}" letter-spacing="7"
        fill="${brass}">CONSULTING</text>
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
    // 320x132: hart + large "BHC" where the "C" is forest green. Readable at
    // the actual size Google Admin shows it; full "BLACK HART / CONSULTING"
    // wordmark becomes sub-pixel at this display size.
    svg: bhcLockup({ w: 320, h: 132, ink: COLORS.ink, accent: COLORS.forest }),
  },
  {
    name: 'black-hart-google-admin-reversed',
    // Same layout but ivory + brass on ink for dark-themed surfaces
    svg: bhcLockup({ w: 320, h: 132, ink: COLORS.ivory, accent: '#B08D57', bg: COLORS.ink }),
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

  /* ---- Exclaimer brand kit ---- */
  {
    name: 'exclaimer-logo',
    // "Logo" field \u2014 main brand image (horizontal lockup). Min 200x150;
    // rendering at 600x200 so it scales crisply in retina email clients.
    svg: horizontalLockup({ w: 600, h: 200, ink: COLORS.ink, forest: COLORS.forest, pad: 24, markHeightPct: 0.7 }),
  },
  {
    name: 'exclaimer-icon',
    // "Icon" field \u2014 square mark. Min 150x150; rendering at 400x400.
    // Also used for Meeting Branding per Exclaimer's note.
    svg: squareMark({ size: 400, ink: COLORS.ink }),
  },
  {
    name: 'exclaimer-banner',
    // "Banner" field \u2014 signature header/footer banner. Min 600x100;
    // rendering at 1200x200 (2x for crisp retina scaling).
    svg: wideBanner({
      w: 1200, h: 200,
      ink: COLORS.ink, ivory: COLORS.ivory,
      brass: '#B08D57', parchment: COLORS.parchment,
      bg: COLORS.ink,
    }),
  },
  {
    name: 'exclaimer-meeting-background',
    // "Meeting Background" field \u2014 video call background. Min 1920x1080;
    // rendering at exact size. Dark, low-distraction, watermark hart.
    svg: meetingBackground({
      w: 1920, h: 1080,
      ink: COLORS.ink, ivory: COLORS.ivory, brass: '#B08D57',
    }),
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
