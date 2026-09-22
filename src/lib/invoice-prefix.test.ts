import { test } from 'node:test'
import assert from 'node:assert/strict'
import type Stripe from 'stripe'
import {
  createStripeCustomerWithPrefix,
  deriveInvoicePrefix,
  ensureUniqueInvoicePrefix,
  INVOICE_PREFIX_PATTERN,
  isInvoicePrefixError,
  isValidInvoicePrefix,
  resolveInvoicePrefix,
  type CustomerListCapableStripe,
} from './invoice-prefix'

// ---------------------------------------------------------------------------
// deriveInvoicePrefix
// ---------------------------------------------------------------------------

test('multi-word company names become BHC + initials', () => {
  assert.equal(deriveInvoicePrefix({ company: 'Grants Within Reach' }), 'BHCGWR')
  assert.equal(deriveInvoicePrefix({ company: 'Prometheus Minds' }), 'BHCPM')
  assert.equal(deriveInvoicePrefix({ displayName: 'Heights Dental Studio' }), 'BHCHDS')
})

test('single-word names take the first 3-5 letters', () => {
  assert.equal(deriveInvoicePrefix({ company: 'Bayou' }), 'BHCBAYOU')
  assert.equal(deriveInvoicePrefix({ company: 'Prometheus' }), 'BHCPROME')
  // Shorter than 3 letters: the BHC stem still keeps us inside Stripe's rules.
  assert.equal(deriveInvoicePrefix({ company: 'Ox' }), 'BHCOX')
})

test('punctuation and legal suffixes are stripped', () => {
  assert.equal(deriveInvoicePrefix({ company: 'Black Hart Consulting, LLC' }), 'BHCBHC')
  assert.equal(deriveInvoicePrefix({ company: 'Black Hart Consulting, L.L.C.' }), 'BHCBHC')
  assert.equal(deriveInvoicePrefix({ company: 'Grants Within Reach, Inc.' }), 'BHCGWR')
  assert.equal(deriveInvoicePrefix({ company: "O'Malley & Sons" }), 'BHCOMS')
  // A client literally named "Co" keeps its only word.
  assert.equal(deriveInvoicePrefix({ company: 'Co' }), 'BHCCO')
})

test('accented letters are folded to A-Z', () => {
  assert.equal(deriveInvoicePrefix({ company: 'Café Ünique Österreich' }), 'BHCCUO')
  assert.equal(deriveInvoicePrefix({ company: 'Ølsen' }), 'BHCOLSEN')
  // Nothing derivable from the name -> email fallback.
  assert.equal(deriveInvoicePrefix({ company: '日本語', email: 'kenji@example.com' }), 'BHCKENJI'.slice(0, 12))
})

test('digits survive; symbols do not', () => {
  assert.equal(deriveInvoicePrefix({ company: '3M Systems' }), 'BHC3S')
  assert.equal(deriveInvoicePrefix({ company: 'Studio 54' }), 'BHCS5')
  assert.equal(deriveInvoicePrefix({ company: '!!!' , email: 'jane.doe@example.com' }), 'BHCJD')
})

test('very long names are capped at Stripe 12-char ceiling', () => {
  const long = deriveInvoicePrefix({
    company: 'Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliet Kilo Lima',
  })
  assert.equal(long, 'BHCABCDEFGHI')
  assert.equal(long!.length, 12)
  assert.match(long!, INVOICE_PREFIX_PATTERN)

  const longSingle = deriveInvoicePrefix({ company: 'Supercalifragilisticexpialidocious' })
  assert.equal(longSingle, 'BHCSUPER')
})

test('falls back through displayName, name, last name, then email local part', () => {
  assert.equal(deriveInvoicePrefix({ displayName: 'Jordan Reyes' }), 'BHCJR')
  assert.equal(deriveInvoicePrefix({ name: 'Jordan Reyes' }), 'BHCJR')
  assert.equal(deriveInvoicePrefix({ firstName: 'Jordan', lastName: 'Reyes' }), 'BHCJR')
  assert.equal(deriveInvoicePrefix({ lastName: 'Reyes' }), 'BHCREYES')
  assert.equal(deriveInvoicePrefix({ email: 'accounts.payable@acme.com' }), 'BHCAP')
  assert.equal(deriveInvoicePrefix({ email: 'billing@acme.com' }), 'BHCBILLI')
  // Company wins over everything else.
  assert.equal(
    deriveInvoicePrefix({ company: 'Grants Within Reach', displayName: 'Jordan Reyes', email: 'j@x.com' }),
    'BHCGWR',
  )
})

test('empty / unusable input yields null so Stripe picks its own prefix', () => {
  assert.equal(deriveInvoicePrefix(null), null)
  assert.equal(deriveInvoicePrefix(undefined), null)
  assert.equal(deriveInvoicePrefix({}), null)
  assert.equal(deriveInvoicePrefix({ company: '   ', displayName: '', email: null }), null)
  assert.equal(deriveInvoicePrefix({ company: '—/—' }), null)
  assert.equal(deriveInvoicePrefix({ email: '@nolocalpart.com' }), null)
})

test('every derived prefix satisfies Stripe validation', () => {
  for (const company of [
    'Grants Within Reach',
    'Prometheus Minds',
    'Black Hart Consulting, LLC',
    'Ox',
    '3M Systems',
    'Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliet Kilo Lima',
  ]) {
    const prefix = deriveInvoicePrefix({ company })
    assert.ok(isValidInvoicePrefix(prefix), `${company} -> ${prefix}`)
  }
})

// ---------------------------------------------------------------------------
// ensureUniqueInvoicePrefix
// ---------------------------------------------------------------------------

/** Fake Stripe whose customer list is fed from an in-memory array. */
function fakeStripe(
  customers: Array<{ id: string; invoice_prefix?: string | null }>,
  opts: { pageSize?: number; throwOnList?: boolean } = {},
): CustomerListCapableStripe & { listCalls: number } {
  const pageSize = opts.pageSize ?? 100
  const state = { listCalls: 0 }
  return {
    get listCalls() {
      return state.listCalls
    },
    customers: {
      list: async (params) => {
        state.listCalls += 1
        if (opts.throwOnList) throw new Error('rate limited')
        const startIndex = params.starting_after
          ? customers.findIndex((c) => c.id === params.starting_after) + 1
          : 0
        const take = Math.min(pageSize, params.limit)
        const data = customers.slice(startIndex, startIndex + take)
        return { data, has_more: startIndex + data.length < customers.length }
      },
    },
  } as CustomerListCapableStripe & { listCalls: number }
}

test('a free prefix comes back untouched', async () => {
  const stripe = fakeStripe([{ id: 'cus_1', invoice_prefix: 'XRUMZVGS' }])
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BHCGWR'), 'BHCGWR')
})

test('collisions get numeric suffixes 2, 3, …', async () => {
  const stripe = fakeStripe([
    { id: 'cus_1', invoice_prefix: 'BHCGWR' },
    { id: 'cus_2', invoice_prefix: 'bhcgwr2' }, // case-insensitive match
  ])
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BHCGWR'), 'BHCGWR3')
})

test('numeric suffixes never overflow Stripe 12-char ceiling', async () => {
  const base = 'BHCABCDELFGH' // already 12 chars
  const stripe = fakeStripe([{ id: 'cus_1', invoice_prefix: base }])
  const unique = await ensureUniqueInvoicePrefix(stripe, base)
  assert.equal(unique, 'BHCABCDELFG2')
  assert.equal(unique!.length, 12)
})

test('the customer being edited does not collide with itself', async () => {
  const stripe = fakeStripe([{ id: 'cus_me', invoice_prefix: 'BHCGWR' }])
  assert.equal(
    await ensureUniqueInvoicePrefix(stripe, 'BHCGWR', { excludeCustomerId: 'cus_me' }),
    'BHCGWR',
  )
})

test('knownPrefixes from our own Clients collection count as taken', async () => {
  const stripe = fakeStripe([])
  assert.equal(
    await ensureUniqueInvoicePrefix(stripe, 'BHCGWR', { knownPrefixes: ['BHCGWR', null, ' '] }),
    'BHCGWR2',
  )
})

test('paginates through more than one page of customers', async () => {
  const many = Array.from({ length: 250 }, (_, i) => ({
    id: `cus_${i}`,
    invoice_prefix: i === 240 ? 'BHCGWR' : `RAND${i}`,
  }))
  const stripe = fakeStripe(many, { pageSize: 100 })
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BHCGWR'), 'BHCGWR2')
  assert.ok(stripe.listCalls >= 3)
})

test('a failed customer scan falls back to knownPrefixes instead of throwing', async () => {
  const stripe = fakeStripe([], { throwOnList: true })
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BHCGWR', { knownPrefixes: ['BHCGWR'] }), 'BHCGWR2')
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BHCGWR'), 'BHCGWR')
})

test('an invalid base prefix is rejected outright', async () => {
  const stripe = fakeStripe([])
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BH'), null)
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BHC-GWR'), null)
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'bhcgwr'), null)
  assert.equal(await ensureUniqueInvoicePrefix(stripe, 'BHCTOOLONGPREFIX'), null)
})

test('resolveInvoicePrefix derives + uniquifies in one call', async () => {
  const stripe = fakeStripe([{ id: 'cus_1', invoice_prefix: 'BHCGWR' }])
  assert.equal(await resolveInvoicePrefix(stripe, { company: 'Grants Within Reach' }), 'BHCGWR2')
  assert.equal(await resolveInvoicePrefix(stripe, {}), null)
})

// ---------------------------------------------------------------------------
// createStripeCustomerWithPrefix — the create-path guard
// ---------------------------------------------------------------------------

class FakeStripeError extends Error {
  param?: string
  constructor(message: string, param?: string) {
    super(message)
    this.param = param
  }
}

test('the prefix is passed through on a normal create', async () => {
  const calls: Array<Record<string, unknown>> = []
  const stripe = {
    customers: {
      create: async (params: Stripe.CustomerCreateParams) => {
        calls.push(params as unknown as Record<string, unknown>)
        return { id: 'cus_new', invoice_prefix: params.invoice_prefix as string }
      },
    },
  }
  const { customer, invoicePrefix } = await createStripeCustomerWithPrefix(
    stripe,
    { email: 'a@b.com' },
    { invoicePrefix: 'BHCGWR' },
  )
  assert.equal(customer.id, 'cus_new')
  assert.equal(invoicePrefix, 'BHCGWR')
  assert.equal(calls.length, 1)
  assert.equal(calls[0]!.invoice_prefix, 'BHCGWR')
})

test('a Stripe rejection of invoice_prefix retries once WITHOUT it', async () => {
  const calls: Array<Record<string, unknown>> = []
  const warnings: unknown[] = []
  const stripe = {
    customers: {
      create: async (params: Stripe.CustomerCreateParams) => {
        calls.push(params as unknown as Record<string, unknown>)
        if (params.invoice_prefix) {
          throw new FakeStripeError('Invoice prefix must be unique', 'invoice_prefix')
        }
        return { id: 'cus_fallback', invoice_prefix: 'XRUMZVGS' }
      },
    },
  }
  const { customer, invoicePrefix } = await createStripeCustomerWithPrefix(
    stripe,
    { email: 'a@b.com' },
    { invoicePrefix: 'BHCGWR', logger: { warn: (obj) => warnings.push(obj) } },
  )
  assert.equal(customer.id, 'cus_fallback')
  assert.equal(invoicePrefix, null, 'caller must not record a prefix Stripe refused')
  assert.equal(calls.length, 2)
  assert.equal(calls[0]!.invoice_prefix, 'BHCGWR')
  assert.equal('invoice_prefix' in calls[1]!, false)
  assert.equal(warnings.length, 1)
})

test('a rejection unrelated to the prefix is NOT retried', async () => {
  let attempts = 0
  const stripe = {
    customers: {
      create: async () => {
        attempts += 1
        throw new FakeStripeError('Invalid email address', 'email')
      },
    },
  }
  await assert.rejects(
    () =>
      createStripeCustomerWithPrefix(
        stripe as never,
        { email: 'nope' },
        { invoicePrefix: 'BHCGWR' },
      ),
    /Invalid email address/,
  )
  assert.equal(attempts, 1)
})

test('no prefix / an invalid prefix means a plain create', async () => {
  const calls: Array<Record<string, unknown>> = []
  const stripe = {
    customers: {
      create: async (params: Stripe.CustomerCreateParams) => {
        calls.push(params as unknown as Record<string, unknown>)
        return { id: 'cus_plain' }
      },
    },
  }
  assert.equal((await createStripeCustomerWithPrefix(stripe, { email: 'a@b.com' })).invoicePrefix, null)
  assert.equal(
    (await createStripeCustomerWithPrefix(stripe, { email: 'a@b.com' }, { invoicePrefix: 'BHC-GWR' }))
      .invoicePrefix,
    null,
  )
  assert.equal(calls.length, 2)
  assert.ok(calls.every((c) => !('invoice_prefix' in c)))
})

test('isInvoicePrefixError recognises the Stripe shapes we care about', () => {
  assert.equal(isInvoicePrefixError(new FakeStripeError('bad', 'invoice_prefix')), true)
  assert.equal(isInvoicePrefixError(new Error('Invoice prefix must be unique')), true)
  assert.equal(isInvoicePrefixError({ raw: { param: 'invoice_prefix', message: 'nope' } }), true)
  assert.equal(isInvoicePrefixError(new FakeStripeError('Invalid email', 'email')), false)
  assert.equal(isInvoicePrefixError(null), false)
  assert.equal(isInvoicePrefixError('invoice_prefix'), false)
})
