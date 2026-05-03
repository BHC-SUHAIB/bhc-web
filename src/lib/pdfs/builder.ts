import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Branded one-pager / lead-magnet PDF builder.
//
// Visual model (mirrors the website):
//   - Page background = ivory (#EFE9D9)  — matches --color-bg in light mode
//   - Body text       = ink (#1A1713)    — --color-fg
//   - Accent          = brass (#B08D57)  — --color-brass
//   - Subheadings     = brassDark (#8E6E3F) for hierarchy contrast
//
// Layout:
//   - Brass top rule (4pt) anchored to the absolute top of the page
//   - Brand mark + URL inset INTO the brass rule (white wordmark, no overlap
//     into body)
//   - Title block sits BELOW the rule with safe vertical clearance
//   - Footer band: brass divider + contact line + page number
//
// Builder guards single-page output via `ensureSpace`. If a content spec is
// too long it will spill to a second page — verify with /dev-pdf-check.

export const BRAND = {
  ink: rgb(0x1a / 255, 0x17 / 255, 0x13 / 255),
  ivory: rgb(0xef / 255, 0xe9 / 255, 0xd9 / 255),
  ivoryDeep: rgb(0xea / 255, 0xe2 / 255, 0xcd / 255),
  brass: rgb(0xb0 / 255, 0x8d / 255, 0x57 / 255),
  brassDark: rgb(0x8e / 255, 0x6e / 255, 0x3f / 255),
  fgMuted: rgb(0x55 / 255, 0x4d / 255, 0x40 / 255),
  surface: rgb(0xe5 / 255, 0xdd / 255, 0xc7 / 255), // tinted card bg (~5% ink mix)
  rule: rgb(0xc8 / 255, 0xbf / 255, 0xa9 / 255),    // subtle divider line
}

const PAGE_WIDTH = 612 // US Letter, 8.5"
const PAGE_HEIGHT = 792 // 11"
const HEADER_BAND_H = 28 // brass top band that holds the brand mark
const FOOTER_BAND_H = 36 // bottom band for contact + page number
export const MARGIN_X = 44 // 0.61"
const SAFE_TOP = HEADER_BAND_H + 24 // gap between brand band and title block
const SAFE_BOTTOM = FOOTER_BAND_H + 14
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2 // 524

export type Section =
  | { type: 'heading'; text: string; size?: number }
  /** `noTick` suppresses the brass tick rule above the subheading. Use when
   *  the subheading sits right under a callout or other dense element where
   *  the tick reads as visual noise. Auto-skipped on the first subheading
   *  per page and on any "How to start" subheading regardless of this flag. */
  | { type: 'subheading'; text: string; noTick?: boolean }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'spacer'; height?: number }
  | { type: 'rule' }
  | { type: 'callout'; title: string; body: string }

export type PdfDoc = {
  filename: string
  title: string
  eyebrow?: string
  subtitle?: string
  sections: Section[]
}

type Ctx = {
  doc: PDFDocument
  page: PDFPage
  fontReg: PDFFont
  fontBold: PDFFont
  fontItalic: PDFFont
  /** Logo PNG embedded once per build, redrawn into the brass band on every page. */
  logo: PDFImage
  y: number
  /** Flag flips after the first `subheading` is drawn — used to suppress the
   *  brass tick rule on the very first subheading (visually doubles up with
   *  the brass divider rule under the title block). */
  firstSubheadingDrawn: boolean
}

// pdf-lib's Helvetica is WinAnsi-encoded — common typographic Unicode chars
// throw at draw time. Swap them for visually-close ASCII so source content
// can stay nicely typeset.
const ASCII_MAP: Record<string, string> = {
  '—': '--',  // em-dash
  '–': '-',   // en-dash
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '→': '->',
  '…': '...',
  ' ': ' ',  // non-breaking space
  '·': '.',
  '•': '-',
}
function sanitize(text: string): string {
  return text.replace(/[—–‘’“”→… ·•]/g, (c) => ASCII_MAP[c] ?? c)
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = sanitize(text).split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawPageChrome(page: PDFPage, fontReg: PDFFont, fontBold: PDFFont, logo: PDFImage) {
  // Full-page ivory background — every drawn rectangle/text sits on this.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: BRAND.ivory })

  // Brass top band with logo + wordmark inset.
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_BAND_H, width: PAGE_WIDTH, height: HEADER_BAND_H, color: BRAND.brass })
  // Tight darker hairline along the bottom of the band — adds polish.
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_BAND_H, width: PAGE_WIDTH, height: 0.6, color: BRAND.brassDark })

  // Logo: square avatar fits inside the band with a 4pt vertical inset on
  // top and bottom (band is 28pt → logo ~20pt tall).
  const logoH = HEADER_BAND_H - 8
  const logoW = logoH // 1:1 source
  page.drawImage(logo, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - HEADER_BAND_H + 4,
    width: logoW,
    height: logoH,
  })

  // Wordmark sits to the right of the logo, vertically centered.
  const wordmarkY = PAGE_HEIGHT - HEADER_BAND_H / 2 - 3.5
  page.drawText('BLACK HART CONSULTING', {
    x: MARGIN_X + logoW + 8,
    y: wordmarkY,
    size: 9,
    font: fontBold,
    color: BRAND.ivory,
  })
  const urlText = 'blackhartconsulting.com'
  const urlWidth = fontReg.widthOfTextAtSize(urlText, 9)
  page.drawText(urlText, {
    x: PAGE_WIDTH - MARGIN_X - urlWidth,
    y: wordmarkY,
    size: 9,
    font: fontReg,
    color: BRAND.ivory,
  })
}

function drawFooter(page: PDFPage, fontReg: PDFFont, fontBold: PDFFont, pageNum: number, total: number) {
  // Brass divider rule above the footer.
  page.drawRectangle({
    x: MARGIN_X,
    y: FOOTER_BAND_H - 4,
    width: CONTENT_WIDTH,
    height: 0.7,
    color: BRAND.brass,
  })
  const contact = sanitize('hello@blackhartconsulting.com  ·  (866) 434-9777  ·  Houston, TX')
  page.drawText(contact, {
    x: MARGIN_X,
    y: 14,
    size: 8.5,
    font: fontReg,
    color: BRAND.fgMuted,
  })
  const pageLabel = `${pageNum} / ${total}`
  const pwidth = fontBold.widthOfTextAtSize(pageLabel, 8.5)
  page.drawText(pageLabel, {
    x: PAGE_WIDTH - MARGIN_X - pwidth,
    y: 14,
    size: 8.5,
    font: fontBold,
    color: BRAND.brassDark,
  })
}

function newPage(ctx: Ctx): Ctx {
  const page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageChrome(page, ctx.fontReg, ctx.fontBold, ctx.logo)
  return { ...ctx, page, y: PAGE_HEIGHT - SAFE_TOP }
}

function ensureSpace(ctx: Ctx, needed: number): Ctx {
  if (ctx.y - needed < SAFE_BOTTOM) return newPage(ctx)
  return ctx
}

function drawSection(ctx: Ctx, s: Section): Ctx {
  switch (s.type) {
    case 'heading': {
      const size = s.size ?? 14
      const lineHeight = size * 1.18
      const lines = wrap(s.text, ctx.fontBold, size, CONTENT_WIDTH)
      ctx = ensureSpace(ctx, lines.length * lineHeight + 6)
      ctx.y -= 4
      for (const line of lines) {
        ctx.page.drawText(line, { x: MARGIN_X, y: ctx.y, size, font: ctx.fontBold, color: BRAND.ink })
        ctx.y -= lineHeight
      }
      ctx.y -= 4
      return ctx
    }
    case 'subheading': {
      const size = 11
      const lineHeight = size * 1.2
      const lines = wrap(s.text, ctx.fontBold, size, CONTENT_WIDTH)
      // Skip the brass tick rule on (a) the first subheading on the page —
      // visually doubles up with the brass divider rule under the title
      // block, (b) the "How to start" subheading, which sits right below
      // other content where the tick reads as visual noise, or (c) any
      // subheading that opted in via `noTick: true` in its content spec.
      const skipTick = !ctx.firstSubheadingDrawn || /^how to start/i.test(s.text.trim()) || s.noTick === true
      const tickH = skipTick ? 0 : 6
      ctx = ensureSpace(ctx, tickH + 6 + lines.length * lineHeight + 8)
      ctx.y -= 8
      if (!skipTick) {
        ctx.page.drawRectangle({
          x: MARGIN_X,
          y: ctx.y + lineHeight - 2,
          width: 18,
          height: 1.5,
          color: BRAND.brass,
        })
        ctx.y -= 4
      }
      for (const line of lines) {
        ctx.page.drawText(line, { x: MARGIN_X, y: ctx.y, size, font: ctx.fontBold, color: BRAND.brassDark })
        ctx.y -= lineHeight
      }
      ctx.y -= 6
      ctx.firstSubheadingDrawn = true
      return ctx
    }
    case 'paragraph': {
      const size = 9.5
      const lineHeight = size * 1.4
      const lines = wrap(s.text, ctx.fontReg, size, CONTENT_WIDTH)
      ctx = ensureSpace(ctx, lines.length * lineHeight + 4)
      for (const line of lines) {
        ctx.page.drawText(line, { x: MARGIN_X, y: ctx.y, size, font: ctx.fontReg, color: BRAND.ink })
        ctx.y -= lineHeight
      }
      ctx.y -= 4
      return ctx
    }
    case 'bullets': {
      const size = 9.5
      const lineHeight = size * 1.32
      const indent = 13
      for (const item of s.items) {
        const lines = wrap(item, ctx.fontReg, size, CONTENT_WIDTH - indent)
        ctx = ensureSpace(ctx, lines.length * lineHeight + 2)
        // Brass dot bullet rendered as a small filled rectangle (cleaner
        // than a glyph in WinAnsi encoding).
        ctx.page.drawRectangle({
          x: MARGIN_X + 1,
          y: ctx.y + 1,
          width: 3,
          height: 3,
          color: BRAND.brass,
        })
        for (let i = 0; i < lines.length; i++) {
          ctx.page.drawText(lines[i], {
            x: MARGIN_X + indent,
            y: ctx.y,
            size,
            font: ctx.fontReg,
            color: BRAND.ink,
          })
          ctx.y -= lineHeight
        }
        ctx.y -= 1
      }
      ctx.y -= 2
      return ctx
    }
    case 'numbered': {
      const size = 9.5
      const lineHeight = size * 1.32
      const indent = 18
      for (let n = 0; n < s.items.length; n++) {
        const item = s.items[n]
        const lines = wrap(item, ctx.fontReg, size, CONTENT_WIDTH - indent)
        ctx = ensureSpace(ctx, lines.length * lineHeight + 2)
        ctx.page.drawText(`${n + 1}.`, {
          x: MARGIN_X,
          y: ctx.y,
          size,
          font: ctx.fontBold,
          color: BRAND.brass,
        })
        for (let i = 0; i < lines.length; i++) {
          ctx.page.drawText(lines[i], {
            x: MARGIN_X + indent,
            y: ctx.y,
            size,
            font: ctx.fontReg,
            color: BRAND.ink,
          })
          ctx.y -= lineHeight
        }
        ctx.y -= 2
      }
      ctx.y -= 2
      return ctx
    }
    case 'callout': {
      // Brass-tinted card with a brass left bar — visually echoes the
      // CalendlyBooking + LeadMagnet cards on the website. Compact enough
      // to fit in single-pager layouts.
      const size = 9
      const titleSize = 9.5
      const lineHeight = size * 1.32
      const padding = 9
      const titleH = titleSize * 1.25
      const lines = wrap(s.body, ctx.fontReg, size, CONTENT_WIDTH - padding * 2 - 4)
      const blockH = titleH + lines.length * lineHeight + padding * 2
      ctx = ensureSpace(ctx, blockH + 6)
      const top = ctx.y + 4
      const bottom = top - blockH
      // Tinted card background
      ctx.page.drawRectangle({
        x: MARGIN_X,
        y: bottom,
        width: CONTENT_WIDTH,
        height: blockH,
        color: BRAND.surface,
      })
      // Brass left bar
      ctx.page.drawRectangle({
        x: MARGIN_X,
        y: bottom,
        width: 3,
        height: blockH,
        color: BRAND.brass,
      })
      let inner = top - padding - titleSize
      ctx.page.drawText(sanitize(s.title), {
        x: MARGIN_X + padding + 4,
        y: inner,
        size: titleSize,
        font: ctx.fontBold,
        color: BRAND.brassDark,
      })
      inner -= titleH
      for (const line of lines) {
        ctx.page.drawText(line, {
          x: MARGIN_X + padding + 4,
          y: inner,
          size,
          font: ctx.fontReg,
          color: BRAND.ink,
        })
        inner -= lineHeight
      }
      ctx.y = bottom - 8
      return ctx
    }
    case 'rule': {
      ctx = ensureSpace(ctx, 12)
      ctx.page.drawRectangle({
        x: MARGIN_X,
        y: ctx.y,
        width: CONTENT_WIDTH,
        height: 0.5,
        color: BRAND.rule,
      })
      ctx.y -= 12
      return ctx
    }
    case 'spacer': {
      ctx.y -= s.height ?? 6
      return ctx
    }
  }
}

// Logo loaded once per process and reused across builds. Read from /public so
// it ships with the deploy without an additional asset pipeline.
let LOGO_BYTES: Uint8Array | null = null
async function loadLogoBytes(): Promise<Uint8Array> {
  if (LOGO_BYTES) return LOGO_BYTES
  const filePath = path.join(process.cwd(), 'public', 'brand', 'black-hart-avatar-512.png')
  const buf = await fs.readFile(filePath)
  LOGO_BYTES = new Uint8Array(buf)
  return LOGO_BYTES
}

export async function buildPdf(spec: PdfDoc): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontReg = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const logo = await doc.embedPng(await loadLogoBytes())

  const firstPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageChrome(firstPage, fontReg, fontBold, logo)
  let ctx: Ctx = {
    doc,
    page: firstPage,
    fontReg,
    fontBold,
    fontItalic,
    logo,
    y: PAGE_HEIGHT - SAFE_TOP,
    firstSubheadingDrawn: false,
  }

  // Title block — eyebrow on its own line (small + brass), then the title,
  // then optional subtitle. SAFE_TOP guarantees clearance from the brass
  // header band so the title can never crash into the brand mark.
  if (spec.eyebrow) {
    ctx.page.drawText(sanitize(spec.eyebrow.toUpperCase()), {
      x: MARGIN_X,
      y: ctx.y,
      size: 8,
      font: ctx.fontBold,
      color: BRAND.brass,
    })
    ctx.y -= 14
  }
  // Title — drawn with explicit baseline placement (drawText anchors at the
  // baseline, not the cap). Reserve titleSize for the cap-height of the
  // first line so the visible top of the title aligns under the eyebrow.
  const titleSize = 22
  const titleLines = wrap(spec.title, ctx.fontBold, titleSize, CONTENT_WIDTH)
  ctx.y -= titleSize  // make room for first line above its baseline
  for (let i = 0; i < titleLines.length; i++) {
    ctx.page.drawText(titleLines[i], {
      x: MARGIN_X,
      y: ctx.y,
      size: titleSize,
      font: ctx.fontBold,
      color: BRAND.ink,
    })
    if (i < titleLines.length - 1) ctx.y -= titleSize * 1.15
  }
  if (spec.subtitle) {
    // Generous gap between title and subtitle so the subtitle reads as a
    // separate paragraph, not a widow line under the title's descenders.
    ctx.y -= 18
    const subSize = 10
    const subLines = wrap(spec.subtitle, ctx.fontReg, subSize, CONTENT_WIDTH)
    for (const line of subLines) {
      ctx.page.drawText(line, {
        x: MARGIN_X,
        y: ctx.y,
        size: subSize,
        font: ctx.fontReg,
        color: BRAND.fgMuted,
      })
      ctx.y -= subSize * 1.4
    }
  }
  // Brass divider under title — short, accent-style.
  ctx.y -= 6
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: ctx.y,
    width: 42,
    height: 1.5,
    color: BRAND.brass,
  })
  ctx.y -= 14

  for (const s of spec.sections) ctx = drawSection(ctx, s)

  const total = doc.getPageCount()
  doc.getPages().forEach((p, i) => drawFooter(p, fontReg, fontBold, i + 1, total))

  return doc.save()
}
