import {
  PDFDocument,
  PDFFont,
  PDFName,
  PDFPage,
  PDFRef,
  PDFString,
  StandardFonts,
  rgb,
  type Color,
} from 'pdf-lib'
import type Stripe from 'stripe'
import { BRAND, sanitize, wrap as wrapWords } from './builder'
import { BRAND_MARK_PATHS, BRAND_MARK_VIEWBOX } from '@/lib/brand-mark'
import { formatUSD } from '@/lib/care-plans'
import { formatPaymentMethodList, getPaymentMethodTypes } from '@/lib/payment-methods'

// Black Hart branded invoice PDF.
//
// Replaces Stripe's generic invoice_pdf as the attachment on the operator
// triggered invoice email. Visual language follows the Executive Modern
// report system used for BHC proposals (client-reporting/brand/report.css):
//   - ivory ground, ink text, brass accents, parchment hairlines
//   - tracked uppercase eyebrows, a heavy sans title, a serif italic lede
//   - the stag mark top-left, and a faint brass stag watermark on page one
//
// Fonts: pdf-lib ships the 14 standard PDF fonts only, and this repo does not
// bundle @pdf-lib/fontkit or the Manrope/Fraunces files, so Helvetica stands
// in for Manrope and Times Italic stands in for the Fraunces lede. The
// hierarchy (weights, sizes, tracking) is what carries the system.
//
// Layout is US Letter. Up to about eight line items fit on one page; longer
// invoices paginate with a running head and a repeated table header. Totals
// and the payment block always travel together onto the same page.

export type InvoicePdfLineItem = {
  description: string
  quantity: number
  unitCents: number
  amountCents: number
}

export type InvoicePdfData = {
  invoiceNumber: string
  issuedAt: Date
  dueAt: Date | null
  /** Drives the payment block: open invoices get the Pay online button, paid ones a receipt line. */
  status: 'open' | 'paid' | 'other'
  paidAt?: Date | null
  issuer: {
    legalName: string
    email: string
    phone: string
    website: string
    /** City, state line under the issuer block. Omitted when blank. */
    locality?: string | null
  }
  billTo: {
    name: string
    company?: string | null
    email?: string | null
    addressLines: string[]
  }
  memo?: string | null
  lineItems: InvoicePdfLineItem[]
  subtotalCents: number
  discountCents: number
  /** null when the Stripe invoice carries no tax. */
  taxCents: number | null
  totalCents: number
  amountPaidCents: number
  amountDueCents: number
  /** Signed BHC pay link: /invoice/<stripeInvoiceId>?token=... */
  payUrl: string
  /** Stripe hosted invoice page, printed as the fallback. */
  hostedInvoiceUrl?: string | null
  /** Already formatted, e.g. "Card, ACH, Klarna, Link, or Cash App Pay". */
  paymentMethods: string
  /**
   * Short note printed under the totals band when hosting is part of this
   * order (invoice `hostingMode === 'included'`). Omitted for every other
   * mode, so invoices that don't include hosting print exactly as before.
   */
  hostingNote?: string | null
  /** IANA zone for date display. Defaults to America/Chicago. */
  timeZone?: string
}

// ────────────────── palette + metrics ──────────────────

const INK = BRAND.ink
const IVORY = BRAND.ivory
const BRASS = BRAND.brass
const BRASS_DARK = BRAND.brassDark
const PARCHMENT = rgb(0xd6 / 255, 0xd0 / 255, 0xc2 / 255)
const MUTED = rgb(0x6b / 255, 0x65 / 255, 0x5a / 255)

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2
const RIGHT = PAGE_W - MARGIN
const FOOTER_H = 44
const SAFE_BOTTOM = FOOTER_H + 10

// Charges table columns. Amount is flush right; qty and unit are right
// aligned to fixed stops so the numbers line up down the page.
const COL_QTY_RIGHT = MARGIN + 316
const COL_UNIT_RIGHT = MARGIN + 406
const COL_AMOUNT_RIGHT = RIGHT
const COL_DESC_W = 256

const DEFAULT_TZ = 'America/Chicago'
const ISSUER_LEGAL_NAME = 'Black Hart Consulting LLC'

type Fonts = { sans: PDFFont; sansBold: PDFFont; serifItalic: PDFFont }

type Ctx = {
  doc: PDFDocument
  fonts: Fonts
  page: PDFPage
  y: number
  pageIndex: number
  /** Link annotations collected per page, attached once at the end. */
  links: Map<PDFPage, PDFRef[]>
  /** True while the charges table is being drawn, so a page break repeats the table header. */
  inTable: boolean
  data: InvoicePdfData
}

// ────────────────── text helpers ──────────────────

// pdf-lib throws on glyphs outside WinAnsi. sanitize() swaps the common
// typographic characters; anything still outside Latin-1 becomes a '?' so a
// client name in another script cannot take the whole email down.
function safe(text: string): string {
  return sanitize(text).replace(/[^\u0000-\u00ff]/g, '?')
}

function draw(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: Color) {
  page.drawText(safe(text), { x, y, size, font, color })
}

// Word wrap that also runs the WinAnsi guard, since the builder's wrap()
// measures glyph widths and would throw on an unencodable character.
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  return wrapWords(safe(text), font, size, width)
}

// Character-level wrap for strings with no spaces (URLs). wrap() from the
// builder only breaks on whitespace, so a hosted invoice URL would run off
// the page.
function wrapHard(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const ch of safe(text)) {
    if (font.widthOfTextAtSize(current + ch, size) > width && current) {
      lines.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawRight(page: PDFPage, text: string, rightX: number, y: number, font: PDFFont, size: number, color: Color) {
  const t = safe(text)
  page.drawText(t, { x: rightX - font.widthOfTextAtSize(t, size), y, size, font, color })
}

// Letter-spaced text. pdf-lib has no character spacing option, so each glyph
// is placed by hand. `tracking` is in em units, like CSS letter-spacing.
function trackedWidth(text: string, font: PDFFont, size: number, tracking: number): number {
  const t = safe(text)
  let w = 0
  for (const ch of t) w += font.widthOfTextAtSize(ch, size) + tracking * size
  return w - tracking * size
}

function drawTracked(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: Color,
  tracking: number,
): number {
  const t = safe(text)
  let cx = x
  for (const ch of t) {
    page.drawText(ch, { x: cx, y, size, font, color })
    cx += font.widthOfTextAtSize(ch, size) + tracking * size
  }
  return cx - tracking * size - x
}

function drawTrackedRight(page: PDFPage, text: string, rightX: number, y: number, font: PDFFont, size: number, color: Color, tracking: number) {
  const w = trackedWidth(text, font, size, tracking)
  drawTracked(page, text, rightX - w, y, font, size, color, tracking)
}

// Section eyebrow: short brass rule + tracked uppercase brass label, the
// cover__label pattern from the report system.
function drawEyebrow(page: PDFPage, text: string, x: number, y: number, fonts: Fonts) {
  page.drawRectangle({ x, y: y + 2.4, width: 18, height: 0.8, color: BRASS })
  drawTracked(page, text.toUpperCase(), x + 24, y, fonts.sansBold, 7, BRASS, 0.2)
}

function hairline(page: PDFPage, x: number, y: number, width: number, color: Color = PARCHMENT, height = 0.6) {
  page.drawRectangle({ x, y, width, height, color })
}

function formatDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone }).format(d)
}

// ────────────────── brand mark ──────────────────

// Draws the stag from its SVG paths. pdf-lib's drawSvgPath puts the SVG
// origin at (x, y) with SVG y running downward, so the offsets below map the
// icon's viewBox onto a box whose top-left corner is (x, yTop).
function drawMark(page: PDFPage, x: number, yTop: number, height: number, color: Color, opacity = 1) {
  const scale = height / BRAND_MARK_VIEWBOX.height
  const originX = x - BRAND_MARK_VIEWBOX.minX * scale
  const originY = yTop + BRAND_MARK_VIEWBOX.minY * scale
  for (const d of BRAND_MARK_PATHS) {
    page.drawSvgPath(d, { x: originX, y: originY, scale, color, opacity, borderWidth: 0 })
  }
}

function markWidth(height: number): number {
  return (height * BRAND_MARK_VIEWBOX.width) / BRAND_MARK_VIEWBOX.height
}

// ────────────────── links ──────────────────

function addLink(ctx: Ctx, page: PDFPage, rect: [number, number, number, number], url: string) {
  const ref = ctx.doc.context.register(
    ctx.doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: rect,
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }),
  )
  const list = ctx.links.get(page) ?? []
  list.push(ref)
  ctx.links.set(page, list)
}

function attachLinks(ctx: Ctx) {
  for (const [page, refs] of ctx.links) {
    page.node.set(PDFName.of('Annots'), ctx.doc.context.obj(refs))
  }
}

// ────────────────── page chrome ──────────────────

function paintGround(page: PDFPage) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: IVORY })
}

function drawFooter(page: PDFPage, fonts: Fonts, data: InvoicePdfData, pageNum: number, total: number) {
  hairline(page, MARGIN, FOOTER_H - 6, CONTENT_W, BRASS, 0.7)
  const parts = [data.issuer.legalName, data.issuer.email, data.issuer.phone, data.issuer.website]
  draw(page, parts.join('  ·  '), MARGIN, 18, fonts.sans, 7.5, MUTED)
  drawRight(page, `Page ${pageNum} of ${total}`, RIGHT, 18, fonts.sansBold, 7.5, BRASS_DARK)
}

// First page header: mark + wordmark on the left, invoice eyebrow + number on
// the right. Returns the y just below the header block.
function drawCoverHead(ctx: Ctx): number {
  const { page, fonts, data } = ctx
  const top = PAGE_H - MARGIN

  // Faint brass stag off the right edge, like the report cover watermark.
  drawMark(page, PAGE_W - 300, top + 10, 430, BRASS, 0.08)

  const markH = 30
  drawMark(page, MARGIN, top, markH, INK)
  const wordX = MARGIN + markWidth(markH) + 10
  drawTracked(page, 'BLACK HART CONSULTING', wordX, top - 13, fonts.sansBold, 9.5, INK, 0.05)
  drawTracked(page, 'CONSULTING FOR THE WEB', wordX, top - 25, fonts.sans, 6.5, MUTED, 0.28)

  drawTrackedRight(page, 'INVOICE', RIGHT, top - 10, fonts.sans, 7.5, MUTED, 0.2)
  drawRight(page, data.invoiceNumber, RIGHT, top - 25, fonts.sansBold, 10.5, INK)

  return top - markH
}

// Continuation page header: compact running head with a parchment rule.
function drawRunningHead(ctx: Ctx): number {
  const { page, fonts, data } = ctx
  const top = PAGE_H - MARGIN
  const markH = 16
  drawMark(page, MARGIN, top, markH, INK)
  drawTracked(page, 'BLACK HART CONSULTING', MARGIN + markWidth(markH) + 8, top - 12, fonts.sansBold, 8.5, INK, 0.05)
  drawTrackedRight(page, `INVOICE ${data.invoiceNumber}  ·  CONTINUED`, RIGHT, top - 12, fonts.sans, 7.5, MUTED, 0.16)
  hairline(page, MARGIN, top - markH - 8, CONTENT_W)
  return top - markH - 8
}

function newPage(ctx: Ctx): Ctx {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H])
  paintGround(page)
  const next: Ctx = { ...ctx, page, pageIndex: ctx.pageIndex + 1, y: 0 }
  next.y = drawRunningHead(next) - 26
  if (next.inTable) drawTableHeader(next)
  return next
}

function ensureSpace(ctx: Ctx, needed: number): Ctx {
  if (ctx.y - needed < SAFE_BOTTOM) return newPage(ctx)
  return ctx
}

// ────────────────── blocks ──────────────────

function drawTitle(ctx: Ctx) {
  const { page, fonts, data } = ctx
  const titleSize = 38
  ctx.y -= 24 + titleSize
  drawTracked(page, 'Invoice', MARGIN, ctx.y, fonts.sansBold, titleSize, INK, -0.03)

  if (data.memo && data.memo.trim()) {
    const size = 12.5
    const lines = wrap(data.memo.trim(), fonts.serifItalic, size, CONTENT_W * 0.62).slice(0, 3)
    ctx.y -= 20
    for (const line of lines) {
      draw(page, line, MARGIN, ctx.y, fonts.serifItalic, size, MUTED)
      ctx.y -= size * 1.35
    }
    ctx.y += size * 1.35
  }
  ctx.y -= 20
}

// The cover__foot grid: parchment rule on top, four labelled facts.
function drawMetaGrid(ctx: Ctx) {
  const { page, fonts, data } = ctx
  const tz = data.timeZone ?? DEFAULT_TZ
  const due = data.dueAt ? formatDate(data.dueAt, tz) : 'On receipt'
  let terms = 'Due on receipt'
  if (data.dueAt) {
    const days = Math.round((data.dueAt.getTime() - data.issuedAt.getTime()) / 86_400_000)
    terms = days > 0 ? `Net ${days}` : 'Due on receipt'
  }
  const cells: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Issued', value: formatDate(data.issuedAt, tz) },
    { label: 'Due', value: due },
    { label: 'Terms', value: terms },
    { label: data.status === 'paid' ? 'Paid' : 'Amount due', value: formatUSD(data.status === 'paid' ? data.totalCents : data.amountDueCents), bold: true },
  ]
  hairline(page, MARGIN, ctx.y, CONTENT_W)
  ctx.y -= 14
  const colW = CONTENT_W / cells.length
  cells.forEach((c, i) => {
    const x = MARGIN + colW * i
    drawTracked(page, c.label.toUpperCase(), x, ctx.y, fonts.sans, 6.8, MUTED, 0.14)
    draw(page, c.value, x, ctx.y - 14, c.bold ? fonts.sansBold : fonts.sans, 10.5, INK)
  })
  ctx.y -= 14 + 24
}

// From / Bill to, side by side. Returns nothing; advances ctx.y past the
// taller column.
function drawParties(ctx: Ctx) {
  const { page, fonts, data } = ctx
  const colW = CONTENT_W / 2
  const startY = ctx.y
  const lineH = 12.5
  const size = 9.5

  const renderColumn = (x: number, label: string, lines: Array<{ text: string; bold?: boolean; muted?: boolean }>) => {
    let y = startY
    drawEyebrow(page, label, x, y, fonts)
    y -= 18
    for (const l of lines) {
      const wrapped = wrap(l.text, l.bold ? fonts.sansBold : fonts.sans, size, colW - 24)
      for (const w of wrapped) {
        draw(page, w, x, y, l.bold ? fonts.sansBold : fonts.sans, size, l.muted ? MUTED : INK)
        y -= lineH
      }
    }
    return y
  }

  const from: Array<{ text: string; bold?: boolean; muted?: boolean }> = [
    { text: data.issuer.legalName, bold: true },
  ]
  if (data.issuer.locality) from.push({ text: data.issuer.locality })
  from.push({ text: data.issuer.email, muted: true })
  from.push({ text: data.issuer.phone, muted: true })
  from.push({ text: data.issuer.website, muted: true })

  const billTo: Array<{ text: string; bold?: boolean; muted?: boolean }> = [{ text: data.billTo.name, bold: true }]
  if (data.billTo.company && data.billTo.company.trim() && data.billTo.company.trim() !== data.billTo.name.trim()) {
    billTo.push({ text: data.billTo.company.trim() })
  }
  for (const line of data.billTo.addressLines) billTo.push({ text: line })
  if (data.billTo.email) billTo.push({ text: data.billTo.email, muted: true })

  const y1 = renderColumn(MARGIN, 'From', from)
  const y2 = renderColumn(MARGIN + colW, 'Bill to', billTo)
  ctx.y = Math.min(y1, y2) - 16
}

function drawTableHeader(ctx: Ctx) {
  const { page, fonts } = ctx
  const y = ctx.y
  drawTracked(page, 'DESCRIPTION', MARGIN, y, fonts.sans, 6.8, BRASS, 0.14)
  drawTrackedRight(page, 'QTY', COL_QTY_RIGHT, y, fonts.sans, 6.8, BRASS, 0.14)
  drawTrackedRight(page, 'UNIT', COL_UNIT_RIGHT, y, fonts.sans, 6.8, BRASS, 0.14)
  drawTrackedRight(page, 'AMOUNT', COL_AMOUNT_RIGHT, y, fonts.sans, 6.8, BRASS, 0.14)
  hairline(page, MARGIN, y - 8, CONTENT_W, INK, 0.9)
  ctx.y = y - 8
}

function drawLineItems(ctx: Ctx): Ctx {
  const { fonts, data } = ctx
  drawEyebrow(ctx.page, 'Charges', MARGIN, ctx.y, fonts)
  ctx.y -= 20
  drawTableHeader(ctx)

  const size = 9.5
  const lineH = 13
  const padTop = 8
  const padBottom = 6
  ctx.inTable = true

  const items = data.lineItems.length > 0 ? data.lineItems : [{ description: 'No line items', quantity: 0, unitCents: 0, amountCents: 0 }]
  for (const item of items) {
    const lines = wrap(item.description || 'Item', fonts.sans, size, COL_DESC_W)
    const rowH = padTop + lines.length * lineH + padBottom
    ctx = ensureSpace(ctx, rowH)
    const baseline = ctx.y - padTop - size * 0.8
    lines.forEach((line, i) => draw(ctx.page, line, MARGIN, baseline - i * lineH, fonts.sans, size, INK))
    drawRight(ctx.page, String(item.quantity), COL_QTY_RIGHT, baseline, fonts.sans, size, INK)
    drawRight(ctx.page, formatUSD(item.unitCents), COL_UNIT_RIGHT, baseline, fonts.sans, size, INK)
    drawRight(ctx.page, formatUSD(item.amountCents), COL_AMOUNT_RIGHT, baseline, fonts.sans, size, INK)
    ctx.y -= rowH
    hairline(ctx.page, MARGIN, ctx.y, CONTENT_W)
  }
  ctx.inTable = false
  return ctx
}

type TotalRow = { label: string; value: string }

function totalRows(data: InvoicePdfData): TotalRow[] {
  const rows: TotalRow[] = [{ label: 'Subtotal', value: formatUSD(data.subtotalCents) }]
  if (data.discountCents > 0) rows.push({ label: 'Discount', value: `-${formatUSD(data.discountCents)}` })
  if (data.taxCents !== null) rows.push({ label: 'Tax', value: formatUSD(data.taxCents) })
  rows.push({ label: 'Total', value: formatUSD(data.totalCents) })
  if (data.amountPaidCents > 0) rows.push({ label: 'Paid to date', value: `-${formatUSD(data.amountPaidCents)}` })
  return rows
}

// Totals on the right, payment block on the left, both in one band so they
// never split across a page break.
function drawTotalsAndPayment(ctx: Ctx): Ctx {
  const { fonts, data } = ctx
  const rows = totalRows(data)
  const rowH = 17
  // Heights are measured from ctx.y (the band starts 20pt below it) and
  // must cover everything drawn below, or the block runs into the footer.
  const bandGap = 14
  const totalsH = bandGap + 8 + rows.length * rowH + 14 + 34
  const paymentH = bandGap + 2 + 26 + 38 + 12 + 10 + 18 + 3 + 10 + 4
  ctx = ensureSpace(ctx, Math.max(totalsH, paymentH) + 6)
  const page = ctx.page
  const bandTop = ctx.y - bandGap

  // Totals column.
  const totalsX = MARGIN + 300
  const totalsW = RIGHT - totalsX
  let y = bandTop - 8
  for (const r of rows) {
    draw(page, r.label, totalsX, y, fonts.sans, 9.5, r.label === 'Total' ? INK : MUTED)
    drawRight(page, r.value, RIGHT, y, r.label === 'Total' ? fonts.sansBold : fonts.sans, 9.5, INK)
    y -= rowH
  }
  y += rowH - 10
  hairline(page, totalsX, y, totalsW, INK, 1.4)
  y -= 22
  const isPaid = data.status === 'paid'
  drawTracked(page, isPaid ? 'PAID IN FULL' : 'AMOUNT DUE', totalsX, y + 4, fonts.sans, 7, MUTED, 0.2)
  drawRight(page, formatUSD(isPaid ? data.amountPaidCents || data.totalCents : data.amountDueCents), RIGHT, y - 2, fonts.sansBold, 22, INK)
  const totalsBottom = y - 8

  // Payment column.
  const payX = MARGIN
  const payW = 290
  let py = bandTop - 2
  drawEyebrow(page, 'Payment', payX, py, fonts)
  py -= 26

  if (!isPaid) {
    // Ink pill button with a URI link annotation over it.
    const btnH = 26
    const label = 'Pay online'
    const labelW = fonts.sansBold.widthOfTextAtSize(label, 10.5)
    const btnW = labelW + 44
    const r = btnH / 2
    page.drawRectangle({ x: payX + r, y: py - btnH, width: btnW - btnH, height: btnH, color: INK })
    page.drawCircle({ x: payX + r, y: py - r, size: r, color: INK })
    page.drawCircle({ x: payX + btnW - r, y: py - r, size: r, color: INK })
    draw(page, label, payX + (btnW - labelW) / 2, py - r - 3.8, fonts.sansBold, 10.5, IVORY)
    addLink(ctx, page, [payX, py - btnH, payX + btnW, py], data.payUrl)
    // Tracked arrow-free hint to the right of the button.
    drawTracked(page, 'SECURE STRIPE CHECKOUT', payX + btnW + 12, py - r - 2.5, fonts.sans, 6.5, MUTED, 0.18)
    py -= btnH + 12

    if (data.paymentMethods) {
      const lines = wrap(`Pay by ${data.paymentMethods}.`, fonts.sans, 8.5, payW)
      for (const l of lines) {
        draw(page, l, payX, py, fonts.sans, 8.5, INK)
        py -= 12
      }
    }
    if (data.hostedInvoiceUrl) {
      draw(page, 'Button not working? Pay through Stripe instead:', payX, py, fonts.sans, 7.5, MUTED)
      py -= 10
      const urlLines = wrapHard(data.hostedInvoiceUrl, fonts.sans, 7, payW)
      const linkTop = py + 8
      for (const l of urlLines) {
        draw(page, l, payX, py, fonts.sans, 7, BRASS_DARK)
        py -= 9
      }
      addLink(ctx, page, [payX, py + 6, payX + payW, linkTop], data.hostedInvoiceUrl)
      py -= 3
    }
  } else {
    const tz = data.timeZone ?? DEFAULT_TZ
    const when = data.paidAt ? ` on ${formatDate(data.paidAt, tz)}` : ''
    const lines = wrap(`Thank you. This invoice was paid in full${when}. Keep this PDF as your receipt.`, fonts.sans, 9, payW)
    for (const l of lines) {
      draw(page, l, payX, py, fonts.sans, 9, INK)
      py -= 13
    }
    py -= 4
  }

  const q = wrap(`Questions? Reply to the invoice email or write to ${data.issuer.email}.`, fonts.sans, 7.5, payW)
  for (const l of q) {
    draw(page, l, payX, py, fonts.sans, 7.5, MUTED)
    py -= 10
  }

  ctx.y = Math.min(totalsBottom, py) - 10
  return ctx
}

// Hosting note. Only drawn when the invoice includes hosting, so the layout
// of every other invoice is byte-for-byte what it was before.
function drawHostingNote(ctx: Ctx): Ctx {
  const note = ctx.data.hostingNote?.trim()
  if (!note) return ctx
  const lines = wrap(note, ctx.fonts.sans, 8.5, CONTENT_W)
  ctx = ensureSpace(ctx, 18 + lines.length * 11 + 8)
  const page = ctx.page
  ctx.y -= 6
  hairline(page, MARGIN, ctx.y, CONTENT_W)
  ctx.y -= 14
  drawTracked(page, 'HOSTING', MARGIN, ctx.y, ctx.fonts.sans, 6.5, MUTED, 0.2)
  ctx.y -= 12
  for (const l of lines) {
    draw(page, l, MARGIN, ctx.y, ctx.fonts.sans, 8.5, INK)
    ctx.y -= 11
  }
  ctx.y -= 4
  return ctx
}

// ────────────────── entry points ──────────────────

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Invoice ${data.invoiceNumber}`)
  doc.setAuthor(data.issuer.legalName)
  doc.setSubject(`Invoice ${data.invoiceNumber} from ${data.issuer.legalName}`)
  doc.setProducer('Black Hart Consulting')
  doc.setCreator('bhc-web invoice generator')

  const fonts: Fonts = {
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  }

  const first = doc.addPage([PAGE_W, PAGE_H])
  paintGround(first)
  let ctx: Ctx = { doc, fonts, page: first, y: 0, pageIndex: 0, links: new Map(), inTable: false, data }

  ctx.y = drawCoverHead(ctx)
  drawTitle(ctx)
  drawMetaGrid(ctx)
  drawParties(ctx)
  ctx = drawLineItems(ctx)
  ctx.y -= 10
  ctx = drawTotalsAndPayment(ctx)
  ctx = drawHostingNote(ctx)

  const pages = doc.getPages()
  pages.forEach((p, i) => drawFooter(p, fonts, data, i + 1, pages.length))
  attachLinks(ctx)

  return doc.save()
}

export type InvoicePdfSiteSettings = {
  contactEmail?: string | null
  contactPhone?: string | null
  displayTimezone?: string | null
  localSeo?: { addressLocality?: string | null; addressRegion?: string | null } | null
}

export type InvoicePdfClient = {
  displayName?: string | null
  company?: string | null
  email?: string | null
}

function stripeAddressLines(addr: Stripe.Address | null | undefined): string[] {
  if (!addr) return []
  const lines: string[] = []
  if (addr.line1) lines.push(addr.line1)
  if (addr.line2) lines.push(addr.line2)
  const cityLine = [addr.city, [addr.state, addr.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  if (cityLine) lines.push(cityLine)
  if (addr.country && addr.country.toUpperCase() !== 'US') lines.push(addr.country)
  return lines
}

function expandedCustomerAddress(invoice: Stripe.Invoice): Stripe.Address | null {
  const c = invoice.customer
  if (!c || typeof c === 'string') return null
  if ('deleted' in c && c.deleted) return null
  return (c as Stripe.Customer).address ?? null
}

// Maps a Stripe Invoice (plus the Payload client + site settings) onto the
// plain data the renderer consumes. Kept separate so the renderer can be
// unit tested without Stripe and so the dev preview can feed it a fixture.
export function invoicePdfDataFromStripe(args: {
  invoice: Stripe.Invoice
  client?: InvoicePdfClient | null
  settings?: InvoicePdfSiteSettings | null
  payUrl: string
  paymentMethodTypes?: readonly string[]
  /** Passed straight through; set only when the invoice includes hosting. */
  hostingNote?: string | null
}): InvoicePdfData {
  const { invoice, client, settings, payUrl } = args
  const paymentMethodTypes = args.paymentMethodTypes ?? getPaymentMethodTypes()

  const lineItems: InvoicePdfLineItem[] = (invoice.lines?.data ?? []).map((li) => {
    const quantity = li.quantity ?? 1
    const amountCents = li.amount ?? 0
    const unitCents = li.price?.unit_amount ?? (quantity > 0 ? Math.round(amountCents / quantity) : amountCents)
    return { description: li.description || 'Item', quantity, unitCents, amountCents }
  })

  const lineSum = lineItems.reduce((s, li) => s + li.amountCents, 0)
  const subtotalCents = typeof invoice.subtotal === 'number' ? invoice.subtotal : lineSum
  const discountCents = (invoice.total_discount_amounts ?? []).reduce((s, d) => s + (d.amount ?? 0), 0)
  let taxCents: number | null = null
  if (typeof invoice.tax === 'number') taxCents = invoice.tax
  else if (invoice.total_tax_amounts && invoice.total_tax_amounts.length > 0) {
    taxCents = invoice.total_tax_amounts.reduce((s, t) => s + (t.amount ?? 0), 0)
  }
  if (taxCents === 0) taxCents = null
  const totalCents = typeof invoice.total === 'number' ? invoice.total : subtotalCents - discountCents + (taxCents ?? 0)
  const amountPaidCents = invoice.amount_paid ?? 0
  const amountDueCents = typeof invoice.amount_due === 'number' ? invoice.amount_due : totalCents - amountPaidCents

  const status: InvoicePdfData['status'] =
    invoice.status === 'paid' ? 'paid' : invoice.status === 'open' || !invoice.status ? 'open' : 'other'
  const paidAtSec = invoice.status_transitions?.paid_at
  const paidAt = paidAtSec ? new Date(paidAtSec * 1000) : null

  const address = invoice.customer_address ?? expandedCustomerAddress(invoice)
  const name = client?.displayName?.trim() || invoice.customer_name || 'Client'
  const localityParts = [settings?.localSeo?.addressLocality, settings?.localSeo?.addressRegion].filter(
    (s): s is string => Boolean(s && s.trim()),
  )

  return {
    invoiceNumber: invoice.number || invoice.id || 'INVOICE',
    issuedAt: invoice.created ? new Date(invoice.created * 1000) : new Date(),
    dueAt: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    status,
    paidAt,
    issuer: {
      legalName: ISSUER_LEGAL_NAME,
      email: settings?.contactEmail?.trim() || 'hello@blackhartconsulting.com',
      phone: settings?.contactPhone?.trim() || '(866) 434-9777',
      website: 'blackhartconsulting.com',
      locality: localityParts.length > 0 ? localityParts.join(', ') : null,
    },
    billTo: {
      name,
      company: client?.company ?? null,
      email: client?.email ?? invoice.customer_email ?? null,
      addressLines: stripeAddressLines(address),
    },
    memo: invoice.description ?? null,
    hostingNote: args.hostingNote ?? null,
    lineItems,
    subtotalCents,
    discountCents,
    taxCents,
    totalCents,
    amountPaidCents,
    amountDueCents,
    payUrl,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    paymentMethods: formatPaymentMethodList(paymentMethodTypes, 'or'),
    timeZone: settings?.displayTimezone?.trim() || DEFAULT_TZ,
  }
}
