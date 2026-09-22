import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { InvoiceClient, type InvoiceClientProps } from './InvoiceClient'

// Component tests for the three hosting modes on /invoice/[id]. Rendered with
// react-dom/server, so what's asserted is the FIRST paint a client sees —
// which is exactly where the legal requirement lives (the authorization box
// must arrive unticked and the pay button must arrive disabled).
//
// Written as .ts (not .tsx) with createElement so it matches the repo's
// `node --test` glob (src/**/*.test.ts) and needs no JSX transform or DOM.
// State transitions after a click aren't reachable without a DOM; those are
// covered exhaustively by invoicePayState() in src/lib/invoice-hosting.test.ts.

const BASE: InvoiceClientProps = {
  invoiceId: 'in_TEST123',
  invoiceNumber: 'INV-ACME-001',
  totalCents: 149_500,
  description: 'Starter Site build',
  lineItems: [{ description: 'Starter Site', amountCents: 149_500, quantity: 1 }],
  clientName: 'Acme Co',
  hostingMode: 'offer',
  suggestedCarePlan: 'host',
  firstChargeLabel: 'October 21, 2026',
  paymentMethodTypes: ['card', 'us_bank_account'],
  token: 'tok.abc',
}

const render = (props: Partial<InvoiceClientProps>) =>
  renderToStaticMarkup(createElement(InvoiceClient, { ...BASE, ...props }))

// A disabled primary button, ignoring attribute order.
const hasDisabledButton = (html: string) => /<button[^>]*\sdisabled=""/.test(html)

// ────────────────── included ──────────────────

test('included: presents hosting as part of the order, not an optional add-on', () => {
  const html = render({ hostingMode: 'included', suggestedCarePlan: 'host' })
  assert.match(html, /Your order/)
  assert.match(html, /Due today/)
  assert.match(html, /Host hosting/)
  assert.match(html, /\$59\.00\/month/)
  assert.match(html, /First month free, first charge on October 21, 2026/)
  assert.match(html, /Cancel any time/)
  // Not the optional-add-on affordance.
  assert.doesNotMatch(html, /Add a hosting plan/)
  // The plan is fixed: no tier radio group.
  assert.doesNotMatch(html, /Choose tier/)
  assert.doesNotMatch(html, /type="radio"/)
})

test('included: the pay button says what it does and starts disabled', () => {
  const html = render({ hostingMode: 'included' })
  assert.match(html, /Pay \$1,495\.00 and start hosting/)
  assert.ok(hasDisabledButton(html), 'pay must be disabled until the box is ticked')
})

test('included: exactly one unticked authorization checkbox, carrying the consent sentence', () => {
  const html = render({ hostingMode: 'included', suggestedCarePlan: 'care' })
  const checkboxes = html.match(/type="checkbox"/g) ?? []
  assert.equal(checkboxes.length, 1, 'included mode shows one checkbox: the authorization')
  assert.doesNotMatch(html, /checked=""/, 'the authorization box must never arrive pre-ticked')
  assert.match(html, /I authorize Black Hart Consulting LLC to charge \$129\.00 per month/)
  assert.match(html, /The first 30 days are free/)
  assert.match(html, /until I cancel/)
})

test('included: offers a way out so the client is never trapped', () => {
  const html = render({ hostingMode: 'included' })
  assert.match(html, /Pay the invoice without hosting/)
})

test('included: honours the invoice’s suggested plan', () => {
  assert.match(render({ hostingMode: 'included', suggestedCarePlan: 'growth' }), /Growth hosting/)
  assert.match(render({ hostingMode: 'included', suggestedCarePlan: 'growth' }), /\$395\.00\/month/)
})

// ────────────────── offer (unchanged) ──────────────────

test('offer: unchanged — optional tick box, no authorization shown yet, pay enabled', () => {
  const html = render({ hostingMode: 'offer' })
  assert.match(html, /Add a hosting plan/)
  assert.match(html, /Pay now/)
  assert.match(html, /Pay \$1,495\.00/)
  assert.doesNotMatch(html, /and start hosting/)
  // The tier picker + authorization only appear after the box is ticked.
  assert.doesNotMatch(html, /Choose tier/)
  assert.doesNotMatch(html, /I authorize Black Hart Consulting LLC/)
  // One checkbox (the add-on opt-in), unticked, and paying is allowed.
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1)
  assert.doesNotMatch(html, /checked=""/)
  assert.ok(!hasDisabledButton(html), 'a plain payment must not be blocked in offer mode')
  // No order-summary framing.
  assert.doesNotMatch(html, /Your order/)
})

// ────────────────── hidden ──────────────────

test('hidden: no hosting UI at all', () => {
  const html = render({ hostingMode: 'hidden' })
  assert.doesNotMatch(html, /Add a hosting plan/)
  assert.doesNotMatch(html, /Your order/)
  assert.doesNotMatch(html, /hosting/i)
  assert.doesNotMatch(html, /I authorize Black Hart Consulting LLC/)
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 0)
  assert.match(html, /Pay \$1,495\.00/)
  assert.ok(!hasDisabledButton(html), 'a hidden-mode invoice is immediately payable')
})

// ────────────────── shared ──────────────────

test('every mode still renders the invoice itself', () => {
  for (const hostingMode of ['included', 'offer', 'hidden'] as const) {
    const html = render({ hostingMode })
    assert.match(html, /INV-ACME-001/, hostingMode)
    assert.match(html, /Acme Co/, hostingMode)
    assert.match(html, /Starter Site/, hostingMode)
    assert.match(html, /Total due/, hostingMode)
  }
})
