import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFString, decodePDFRawStream } from 'pdf-lib'
import type Stripe from 'stripe'
import { buildInvoicePdf, invoicePdfDataFromStripe, type InvoicePdfData } from './invoice-pdf'

// Run with: npm test (node --test via tsx). No Stripe, DB, or Next runtime
// needed: the generator is pure and the fixture below is a Stripe-shaped
// object literal.

const FIXTURE: Stripe.Invoice = {
  id: 'in_TEST1234567890',
  number: 'INV-PREVIEW-0042',
  status: 'open',
  created: 1_757_808_000, // 2025-09-14 00:00:00 UTC
  due_date: 1_757_808_000 + 14 * 86_400,
  amount_due: 149_500,
  amount_paid: 0,
  subtotal: 149_500,
  total: 149_500,
  tax: null,
  customer: 'cus_TEST',
  customer_name: "Joe's Coffee",
  customer_email: 'joe@joescoffee.com',
  customer_address: { line1: '1200 Heights Blvd', line2: null, city: 'Houston', state: 'TX', postal_code: '77008', country: 'US' },
  description: 'Starter Site rebuild and 30-day SEO content kickoff.',
  hosted_invoice_url: 'https://invoice.stripe.com/i/acct_test/test_sample_hosted_url_1234567890',
  lines: {
    data: [
      { description: 'Starter Site (5-page custom build, 14-day delivery)', amount: 149_500, quantity: 1, price: { unit_amount: 149_500 } },
      { description: 'Launch discount applied', amount: 0, quantity: 1, price: { unit_amount: 0 } },
    ],
  },
} as unknown as Stripe.Invoice

const PAY_URL = 'https://blackhartconsulting.com/invoice/in_TEST1234567890?token=abc.def'

function baseData(overrides: Partial<InvoicePdfData> = {}): InvoicePdfData {
  return {
    ...invoicePdfDataFromStripe({
      invoice: FIXTURE,
      client: { displayName: "Joe's Coffee", company: 'Joe Coffee Roasters LLC', email: 'joe@joescoffee.com' },
      settings: { contactEmail: 'hello@blackhartconsulting.com', contactPhone: '(866) 434-9777', localSeo: { addressLocality: 'Houston', addressRegion: 'TX' } },
      payUrl: PAY_URL,
      paymentMethodTypes: ['card', 'us_bank_account', 'klarna', 'link', 'cashapp'],
    }),
    ...overrides,
  }
}

// Concatenates every decoded content stream in the file. pdf-lib writes
// drawText output as hex strings (`<494E56...> Tj`) encoded in WinAnsi, so
// each hex run is decoded back to `(literal)` form. Anything drawn as one
// string can then be found with a plain substring check.
async function pdfStreamsText(bytes: Uint8Array): Promise<{ doc: PDFDocument; text: string }> {
  const doc = await PDFDocument.load(bytes)
  let raw = ''
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      try {
        raw += Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1')
      } catch {
        // Non-decodable streams (embedded font programs) are not interesting.
      }
    }
  }
  const text = raw.replace(/<([0-9A-Fa-f\s]+)>/g, (_m, hex: string) => `(${Buffer.from(hex.replace(/\s+/g, ''), 'hex').toString('latin1')})`)
  return { doc, text }
}

// URIs of every link annotation on a page.
function pageLinkUris(doc: PDFDocument, pageIndex: number): string[] {
  const annots = doc.getPage(pageIndex).node.lookup(PDFName.of('Annots'), PDFArray)
  if (!annots) return []
  const uris: string[] = []
  for (let i = 0; i < annots.size(); i++) {
    const annot = annots.lookup(i, PDFDict)
    const action = annot.lookup(PDFName.of('A'), PDFDict)
    const uri = action?.lookup(PDFName.of('URI'))
    if (uri instanceof PDFString) uris.push(uri.asString())
  }
  return uris
}

test('renders a one-page invoice containing the number and total', async () => {
  const bytes = await buildInvoicePdf(baseData())
  const { doc, text } = await pdfStreamsText(bytes)
  assert.equal(doc.getPageCount(), 1)
  assert.ok(text.includes('(INV-PREVIEW-0042)'), 'invoice number is drawn')
  assert.ok(text.includes('($1,495.00)'), 'total is drawn')
  assert.ok(text.includes('(Pay online)'), 'pay button label is drawn')
  assert.ok(text.includes('(Black Hart Consulting LLC)'), 'issuer legal name is drawn')
  assert.ok(text.includes('(Page 1 of 1)'), 'footer page number is drawn')
  assert.equal(doc.getTitle(), 'Invoice INV-PREVIEW-0042')
})

test('links the Pay online button to the signed pay URL and the Stripe fallback', async () => {
  const bytes = await buildInvoicePdf(baseData())
  const { doc } = await pdfStreamsText(bytes)
  const uris = pageLinkUris(doc, 0)
  assert.ok(uris.includes(PAY_URL), `pay URL is linked (got ${uris.join(', ')})`)
  assert.ok(uris.includes('https://invoice.stripe.com/i/acct_test/test_sample_hosted_url_1234567890'), 'hosted URL is linked')
})

test('keeps eight single-line items, tax, and the payment block on one page', async () => {
  const lineItems = Array.from({ length: 8 }, (_, i) => ({
    description: `Line item ${i + 1}`,
    quantity: 1,
    unitCents: 25_000,
    amountCents: 25_000,
  }))
  const bytes = await buildInvoicePdf(
    baseData({ lineItems, subtotalCents: 200_000, taxCents: 16_500, totalCents: 216_500, amountDueCents: 216_500 }),
  )
  const { doc, text } = await pdfStreamsText(bytes)
  assert.equal(doc.getPageCount(), 1)
  assert.ok(text.includes('($2,165.00)'))
  assert.ok(text.includes('(Pay online)'))
})

test('paginates past eight line items and repeats the footer on every page', async () => {
  const lineItems = Array.from({ length: 20 }, (_, i) => ({
    description: `Line item ${i + 1}: a reasonably long description that wraps onto a second line of the table`,
    quantity: 1,
    unitCents: 10_000,
    amountCents: 10_000,
  }))
  const bytes = await buildInvoicePdf(baseData({ lineItems, subtotalCents: 200_000, totalCents: 200_000, amountDueCents: 200_000 }))
  const { doc, text } = await pdfStreamsText(bytes)
  assert.ok(doc.getPageCount() >= 2, `expected pagination, got ${doc.getPageCount()} page(s)`)
  assert.ok(text.includes(`(Page 1 of ${doc.getPageCount()})`))
  assert.ok(text.includes(`(Page ${doc.getPageCount()} of ${doc.getPageCount()})`))
  assert.ok(text.includes('($2,000.00)'))
})

test('survives characters outside WinAnsi in client-supplied text', async () => {
  const bytes = await buildInvoicePdf(
    baseData({
      billTo: { name: 'Café Łódź 東京', company: null, email: null, addressLines: [] },
      memo: 'Em dash — and ellipsis … and “quotes”',
    }),
  )
  const { doc } = await pdfStreamsText(bytes)
  assert.equal(doc.getPageCount(), 1)
})

test('maps Stripe tax, discounts, unit prices, and address onto the data model', () => {
  const withTax = {
    ...FIXTURE,
    subtotal: 149_500,
    tax: 12_334,
    total: 161_834,
    amount_due: 161_834,
    total_discount_amounts: [{ amount: 5_000, discount: 'di_x' }],
    lines: { data: [{ description: 'Hours', amount: 30_000, quantity: 3, price: null }] },
  } as unknown as Stripe.Invoice
  const data = invoicePdfDataFromStripe({ invoice: withTax, payUrl: PAY_URL, paymentMethodTypes: ['card', 'us_bank_account'] })
  assert.equal(data.taxCents, 12_334)
  assert.equal(data.discountCents, 5_000)
  assert.equal(data.totalCents, 161_834)
  assert.equal(data.lineItems[0].unitCents, 10_000, 'unit derived from amount / quantity when price is absent')
  assert.deepEqual(data.billTo.addressLines, ['1200 Heights Blvd', 'Houston, TX 77008'])
  assert.equal(data.billTo.name, "Joe's Coffee", 'falls back to Stripe customer_name without a Payload client')
  assert.equal(data.paymentMethods, 'Card or ACH')
  assert.equal(data.status, 'open')
})

test('treats a Stripe invoice without tax as having no tax row', () => {
  const data = invoicePdfDataFromStripe({ invoice: FIXTURE, payUrl: PAY_URL, paymentMethodTypes: ['card'] })
  assert.equal(data.taxCents, null)
  assert.equal(data.discountCents, 0)
  assert.equal(data.issuer.legalName, 'Black Hart Consulting LLC')
  assert.equal(data.issuer.email, 'hello@blackhartconsulting.com')
})

test('renders a paid invoice as a receipt without the pay button', async () => {
  const paid = { ...FIXTURE, status: 'paid', amount_due: 0, amount_paid: 149_500, status_transitions: { paid_at: 1_757_900_000 } } as unknown as Stripe.Invoice
  const data = invoicePdfDataFromStripe({ invoice: paid, payUrl: PAY_URL, paymentMethodTypes: ['card'] })
  assert.equal(data.status, 'paid')
  const bytes = await buildInvoicePdf(data)
  const { text } = await pdfStreamsText(bytes)
  assert.ok(!text.includes('(Pay online)'))
  assert.ok(text.includes('($1,495.00)'))
})
