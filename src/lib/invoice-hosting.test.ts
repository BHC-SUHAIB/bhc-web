import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CARE_PLANS, CARE_PLAN_TRIAL_DAYS, carePlanBySlug } from './care-plans'
import {
  allowCarePlanUpsellFor,
  carePlanConsentText,
  defaultHostingForNewInvoice,
  deriveHostingMode,
  effectiveHostingMode,
  firstHostingChargeDate,
  formatHostingChargeDate,
  hostingPlanRefusal,
  invoicePayState,
  isHostingMode,
} from './invoice-hosting'

// Run with: npm test (node --test via tsx). Everything here is pure — no DB,
// no Stripe, no Next runtime.

// ────────────────── deriveHostingMode: stored value + back-compat ──────────────────

test('deriveHostingMode returns the stored mode when one is set', () => {
  assert.equal(deriveHostingMode({ hostingMode: 'included' }), 'included')
  assert.equal(deriveHostingMode({ hostingMode: 'offer' }), 'offer')
  assert.equal(deriveHostingMode({ hostingMode: 'hidden' }), 'hidden')
})

test('deriveHostingMode ignores the legacy boolean when a mode is stored', () => {
  // An operator switching an old invoice to Included must win over the
  // mirrored boolean, whatever it happens to say.
  assert.equal(deriveHostingMode({ hostingMode: 'included', allowCarePlanUpsell: false }), 'included')
  assert.equal(deriveHostingMode({ hostingMode: 'hidden', allowCarePlanUpsell: true }), 'hidden')
})

test('deriveHostingMode falls back to allowCarePlanUpsell for pre-existing invoices', () => {
  // This is the back-compat contract: every invoice written before the field
  // existed must render exactly as it did before.
  assert.equal(deriveHostingMode({ allowCarePlanUpsell: true }), 'offer')
  assert.equal(deriveHostingMode({ allowCarePlanUpsell: false }), 'hidden')
  // The old page used `allowCarePlanUpsell !== false`, so missing/null has
  // always meant "show the upsell".
  assert.equal(deriveHostingMode({}), 'offer')
  assert.equal(deriveHostingMode({ allowCarePlanUpsell: null }), 'offer')
  assert.equal(deriveHostingMode({ hostingMode: null, allowCarePlanUpsell: null }), 'offer')
})

test('deriveHostingMode treats a junk stored mode as "no mode stored"', () => {
  assert.equal(deriveHostingMode({ hostingMode: '', allowCarePlanUpsell: false }), 'hidden')
  assert.equal(deriveHostingMode({ hostingMode: 'nonsense', allowCarePlanUpsell: true }), 'offer')
})

test('isHostingMode only accepts the three modes', () => {
  assert.equal(isHostingMode('included'), true)
  assert.equal(isHostingMode('offer'), true)
  assert.equal(isHostingMode('hidden'), true)
  for (const bad of ['', null, undefined, 'Included', 'none', 0, {}]) {
    assert.equal(isHostingMode(bad), false)
  }
})

// ────────────────── effectiveHostingMode: hard suppressions ──────────────────

test('effectiveHostingMode hides hosting when the client already has a live subscription', () => {
  assert.equal(
    effectiveHostingMode({ hostingMode: 'included', clientHasLiveSubscription: true }),
    'hidden',
  )
  assert.equal(effectiveHostingMode({ hostingMode: 'offer', clientHasLiveSubscription: true }), 'hidden')
  assert.equal(effectiveHostingMode({ allowCarePlanUpsell: true, clientHasLiveSubscription: true }), 'hidden')
})

test('effectiveHostingMode hides hosting on a subscription invoice', () => {
  assert.equal(effectiveHostingMode({ hostingMode: 'included', isSubscriptionInvoice: true }), 'hidden')
  assert.equal(effectiveHostingMode({ hostingMode: 'offer', isSubscriptionInvoice: true }), 'hidden')
})

test('effectiveHostingMode passes the stored mode through otherwise', () => {
  assert.equal(
    effectiveHostingMode({
      hostingMode: 'included',
      isSubscriptionInvoice: false,
      clientHasLiveSubscription: false,
    }),
    'included',
  )
  // Legacy invoice, no suppressions → unchanged from today.
  assert.equal(effectiveHostingMode({ allowCarePlanUpsell: true }), 'offer')
  assert.equal(effectiveHostingMode({ allowCarePlanUpsell: false }), 'hidden')
})

// ────────────────── defaults on CREATE ──────────────────

test('defaultHostingForNewInvoice hides hosting when the client already pays monthly', () => {
  // Even if "Hosting agreed" is set — they're already on a plan.
  assert.deepEqual(
    defaultHostingForNewInvoice({ clientHasLiveSubscription: true, hostingAgreed: 'growth' }),
    { hostingMode: 'hidden' },
  )
  assert.deepEqual(defaultHostingForNewInvoice({ clientHasLiveSubscription: true }), {
    hostingMode: 'hidden',
  })
})

test('defaultHostingForNewInvoice includes the agreed plan', () => {
  for (const plan of CARE_PLANS) {
    assert.deepEqual(defaultHostingForNewInvoice({ hostingAgreed: plan.slug }), {
      hostingMode: 'included',
      suggestedCarePlan: plan.slug,
    })
  }
})

test('defaultHostingForNewInvoice hides hosting when nothing was agreed', () => {
  assert.deepEqual(defaultHostingForNewInvoice({ hostingAgreed: 'none' }), { hostingMode: 'hidden' })
  assert.deepEqual(defaultHostingForNewInvoice({ hostingAgreed: null }), { hostingMode: 'hidden' })
  assert.deepEqual(defaultHostingForNewInvoice({}), { hostingMode: 'hidden' })
  // A typo'd / retired slug must not silently become "included".
  assert.deepEqual(defaultHostingForNewInvoice({ hostingAgreed: 'scale' }), { hostingMode: 'hidden' })
})

test('allowCarePlanUpsellFor mirrors the mode onto the deprecated boolean', () => {
  assert.equal(allowCarePlanUpsellFor('included'), true)
  assert.equal(allowCarePlanUpsellFor('offer'), true)
  assert.equal(allowCarePlanUpsellFor('hidden'), false)
})

test('the mode/boolean mirror round-trips for the two legacy values', () => {
  // Writing the mirror and reading it back must not change how a legacy
  // reader sees the invoice.
  for (const mode of ['offer', 'hidden'] as const) {
    assert.equal(deriveHostingMode({ allowCarePlanUpsell: allowCarePlanUpsellFor(mode) }), mode)
  }
})

// ────────────────── pay-button state, all three modes ──────────────────

test('invoicePayState: hidden mode never gates the pay button', () => {
  const s = invoicePayState({ mode: 'hidden' })
  assert.deepEqual(s, { includesHosting: false, canPay: true, requiresAuthorization: false })
  // Nothing a browser could send changes that.
  assert.equal(invoicePayState({ mode: 'hidden', addCarePlanChecked: true }).includesHosting, false)
})

test('invoicePayState: offer mode is unchanged from today', () => {
  // Unticked → plain pay, enabled.
  assert.deepEqual(invoicePayState({ mode: 'offer' }), {
    includesHosting: false,
    canPay: true,
    requiresAuthorization: false,
  })
  // Ticked, not authorized → blocked.
  assert.deepEqual(invoicePayState({ mode: 'offer', addCarePlanChecked: true }), {
    includesHosting: true,
    canPay: false,
    requiresAuthorization: true,
  })
  // Ticked + authorized → allowed.
  assert.deepEqual(invoicePayState({ mode: 'offer', addCarePlanChecked: true, authorized: true }), {
    includesHosting: true,
    canPay: true,
    requiresAuthorization: true,
  })
})

test('invoicePayState: included mode blocks paying until the box is ticked', () => {
  assert.deepEqual(invoicePayState({ mode: 'included' }), {
    includesHosting: true,
    canPay: false,
    requiresAuthorization: true,
  })
  assert.deepEqual(invoicePayState({ mode: 'included', authorized: true }), {
    includesHosting: true,
    canPay: true,
    requiresAuthorization: true,
  })
})

test('invoicePayState: included mode never starts hosting without authorization', () => {
  // The only two states that pay are (a) authorized with hosting, or
  // (b) opted out without hosting. There is no (hosting && !authorized) pay.
  for (const authorized of [false, true]) {
    for (const optedOutOfHosting of [false, true]) {
      const s = invoicePayState({ mode: 'included', authorized, optedOutOfHosting })
      if (s.canPay) {
        assert.ok(
          !s.includesHosting || authorized,
          `payable with hosting but unauthorized (authorized=${authorized}, optedOut=${optedOutOfHosting})`,
        )
      }
    }
  }
})

test('invoicePayState: the "pay without hosting" escape hatch always leaves a payable invoice', () => {
  const s = invoicePayState({ mode: 'included', optedOutOfHosting: true })
  assert.equal(s.includesHosting, false)
  assert.equal(s.canPay, true)
  assert.equal(s.requiresAuthorization, false)
})

// ────────────────── consent record ──────────────────

test('carePlanConsentText is the verbatim sentence, per tier', () => {
  const care = carePlanBySlug('care')!
  assert.equal(
    carePlanConsentText(care),
    'I authorize Black Hart Consulting LLC to charge $129.00 per month to my saved payment method ' +
      'for the Care plan, until I cancel. The first 30 days are free: the first charge runs 30 days ' +
      'after this invoice is paid, and the same amount is charged every month after that. ' +
      'Cancellation is one-click via the Stripe customer portal or by emailing hello@blackhartconsulting.com.',
  )
})

test('carePlanConsentText names the amount, the tier, and the trial length for every tier', () => {
  for (const tier of CARE_PLANS) {
    const text = carePlanConsentText(tier)
    assert.ok(text.includes(`for the ${tier.name} plan`), tier.slug)
    assert.ok(text.includes(`${CARE_PLAN_TRIAL_DAYS} days are free`), tier.slug)
    assert.ok(text.includes('until I cancel'), tier.slug)
  }
})

test('the invoice page renders the checkbox unticked — no pre-ticked authorization', () => {
  // Express consent is a legal requirement for recurring charges, so this is
  // pinned in code, not just in review: neither the `included` nor the
  // `offer` path may seed the authorization state as true.
  const src = readFileSync(
    new URL('../app/(frontend)/invoice/[id]/InvoiceClient.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(
    /const \[authorized, setAuthorized\] = useState<boolean>\(false\)/.test(src),
    'the authorization checkbox must start unchecked',
  )
  assert.ok(
    /checked=\{authorized\}/.test(src),
    'the authorization checkbox must be bound to the authorized state',
  )
})

// ────────────────── first charge date ──────────────────

test('firstHostingChargeDate lands CARE_PLAN_TRIAL_DAYS after payment', () => {
  const from = new Date('2026-01-01T12:00:00.000Z')
  const charge = firstHostingChargeDate(from)
  assert.equal(
    Math.round((charge.getTime() - from.getTime()) / 86_400_000),
    CARE_PLAN_TRIAL_DAYS,
  )
  assert.equal(charge.toISOString(), '2026-01-31T12:00:00.000Z')
})

test('firstHostingChargeDate does not mutate its argument', () => {
  const from = new Date('2026-01-01T12:00:00.000Z')
  firstHostingChargeDate(from)
  assert.equal(from.toISOString(), '2026-01-01T12:00:00.000Z')
})

test('formatHostingChargeDate is a plain long US date', () => {
  assert.equal(
    formatHostingChargeDate(new Date('2026-01-31T18:00:00.000Z'), 'America/Chicago'),
    'January 31, 2026',
  )
})

// ────────────────── server-side refusal ──────────────────

test('hostingPlanRefusal allows a plain payment in every mode', () => {
  for (const mode of ['included', 'offer', 'hidden'] as const) {
    assert.equal(hostingPlanRefusal({ requestedPlan: null, mode }), null)
    assert.equal(hostingPlanRefusal({ requestedPlan: null, mode, clientHasLiveSubscription: true }), null)
  }
})

test('hostingPlanRefusal refuses a plan when the client already has one, in every mode', () => {
  for (const mode of ['included', 'offer', 'hidden'] as const) {
    const refusal = hostingPlanRefusal({
      requestedPlan: 'care',
      mode,
      clientHasLiveSubscription: true,
    })
    assert.ok(refusal, `mode=${mode} must refuse`)
    assert.equal(refusal.status, 409)
    assert.match(refusal.error, /already on a hosting plan/i)
    // Friendly: it must tell the client the invoice is still payable.
    assert.match(refusal.error, /pay the invoice/i)
  }
})

test('hostingPlanRefusal refuses a plan on a hidden-mode invoice', () => {
  const refusal = hostingPlanRefusal({ requestedPlan: 'care', mode: 'hidden' })
  assert.ok(refusal)
  assert.equal(refusal.status, 400)
})

test('hostingPlanRefusal allows a plan on included and offer invoices', () => {
  assert.equal(hostingPlanRefusal({ requestedPlan: 'care', mode: 'included' }), null)
  assert.equal(hostingPlanRefusal({ requestedPlan: 'host', mode: 'offer' }), null)
  assert.equal(
    hostingPlanRefusal({ requestedPlan: 'growth', mode: 'offer', clientHasLiveSubscription: false }),
    null,
  )
})

test('/api/checkout/start still wires the refusal guard in', () => {
  // The guard is pure and tested above; this pins the wiring so a refactor
  // can't quietly drop the server-side check and leave only the UI gate.
  const src = readFileSync(
    new URL('../app/api/checkout/start/route.ts', import.meta.url),
    'utf8',
  )
  assert.ok(src.includes('hostingPlanRefusal('), 'route must call hostingPlanRefusal')
  assert.ok(src.includes('clientHasLiveSubscription('), 'route must look up live subscriptions')
  assert.ok(
    /if \(refusal\) \{[\s\S]{0,160}status: refusal\.status/.test(src),
    'route must return the refusal status',
  )
})
