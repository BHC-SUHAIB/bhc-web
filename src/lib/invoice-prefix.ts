import type Stripe from 'stripe'
import type { Payload } from 'payload'

// ---------------------------------------------------------------------------
// Stripe invoice prefixes
// ---------------------------------------------------------------------------
//
// Every Stripe Customer owns an `invoice_prefix` + `next_invoice_sequence`.
// Stripe numbers that customer's invoices `PREFIX-0001`, `PREFIX-0002`, … .
// When we don't supply one, Stripe generates a random 8-char prefix
// (e.g. `XRUMZVGS`), which reads like a database artifact on a client's
// receipt. So we derive a branded prefix instead: `BHC` + initials/letters
// from the client's company or name, e.g.
//
//   "Grants Within Reach"        -> BHCGWR
//   "Prometheus Minds"           -> BHCPM
//   "Bayou" (single word)        -> BHCBAYOU
//
// Stripe's constraints (as of API 2024-12-18):
//   - 3-12 characters
//   - uppercase letters and digits only — NO hyphens, spaces or punctuation
//   - unique across every Customer in the Stripe account
//   - changing it on an existing customer only affects FUTURE invoices
//     (Stripe keeps `next_invoice_sequence` as-is), so we never rewrite a
//     prefix automatically — see `docs/billing/stripe-invoice-prefix.md`.
//
// Nothing here ever throws into a customer-create path: every helper either
// returns a usable prefix or `null`, and `null` means "let Stripe pick".

/** Stripe's own validation rule for `invoice_prefix`. */
export const INVOICE_PREFIX_PATTERN = /^[A-Z0-9]{3,12}$/

/** Brand stem every derived prefix starts with. */
export const INVOICE_PREFIX_BASE = 'BHC'

/** Stripe's hard ceiling on prefix length. */
export const INVOICE_PREFIX_MAX_LEN = 12

/** Stripe's floor on prefix length. */
export const INVOICE_PREFIX_MIN_LEN = 3

/** How many letters we take from a single-word name (spec: 3-5). */
const SINGLE_WORD_LETTERS = 5

/**
 * Legal-entity suffixes dropped before deriving initials — "Grants Within
 * Reach, LLC" should read BHCGWR, not BHCGWRL. Only stripped when at least
 * one other word survives.
 */
const LEGAL_SUFFIXES = new Set([
  'LLC',
  'INC',
  'INCORPORATED',
  'CO',
  'CORP',
  'CORPORATION',
  'LTD',
  'LIMITED',
  'LLP',
  'LP',
  'PLLC',
  'PC',
  'PA',
  'GMBH',
  'BV',
  'SA',
  'AG',
  'NV',
  'PLC',
])

/** Minimal logger shape — satisfied by `payload.logger` (pino). */
export type PrefixLogger = {
  info?: (obj: unknown, msg?: string) => void
  warn?: (obj: unknown, msg?: string) => void
  error?: (obj: unknown, msg?: string) => void
}

/** The fields of a Client record we can derive a prefix from. */
export type InvoicePrefixSource = {
  company?: string | null
  displayName?: string | null
  /** Accepted as an alias for displayName (Stripe Customer `name`). */
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

export function isValidInvoicePrefix(value: unknown): value is string {
  return typeof value === 'string' && INVOICE_PREFIX_PATTERN.test(value)
}

/**
 * Strip accents/diacritics and anything that isn't A-Z0-9, returning the
 * uppercase word tokens of `input`. "Café Münster & Co." -> ['CAFE','MUNSTER','CO']
 */
function tokenize(input: string): string[] {
  const unaccented = input
    .normalize('NFD')
    // Combining marks — é -> e, ü -> u. Written as a range so we don't need
    // the Unicode property-escape flag.
    .replace(/[̀-ͯ]/g, '')
    // Common ligatures/letters that don't decompose.
    .replace(/[ØøŒœÆæÐðÞþŁł]/g, (ch) =>
      ({ Ø: 'O', ø: 'O', Œ: 'OE', œ: 'OE', Æ: 'AE', æ: 'AE', Ð: 'D', ð: 'D', Þ: 'TH', þ: 'TH', Ł: 'L', ł: 'L' })[ch] ?? '',
    )
  return unaccented
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
}

/**
 * Dotted legal forms ("Black Hart Consulting, L.L.C.") don't survive
 * tokenisation as one word, so strip them off the raw string first.
 */
const DOTTED_LEGAL_SUFFIX =
  /[,\s]+(?:l\.?l\.?c|l\.?l\.?p|p\.?l\.?l\.?c|p\.?c|p\.?a|s\.?a|inc|incorporated|corp|corporation|co|ltd|limited|lp|gmbh|plc|b\.?v|n\.?v|a\.?g)\.?\s*$/i

function stripDottedLegalSuffix(input: string): string {
  let out = input.trim()
  for (let i = 0; i < 3; i += 1) {
    const next = out.replace(DOTTED_LEGAL_SUFFIX, '').trim()
    // Never strip away the entire name (e.g. a client literally called "Co").
    if (!next || next === out) break
    out = next
  }
  return out
}

/** Drop trailing legal-entity words when something else remains. */
function dropLegalSuffixes(tokens: string[]): string[] {
  const kept = [...tokens]
  while (kept.length > 1 && LEGAL_SUFFIXES.has(kept[kept.length - 1]!)) {
    kept.pop()
  }
  return kept
}

/**
 * The name-derived part of the prefix (no `BHC` stem).
 *
 *  - multi-word  -> one letter per word  ("Grants Within Reach" -> GWR)
 *  - single word -> first 3-5 characters ("Bayou" -> BAYOU)
 *
 * Returns '' when nothing usable survives normalisation.
 */
function deriveSuffix(source: string): string {
  const tokens = dropLegalSuffixes(tokenize(stripDottedLegalSuffix(source)))
  if (tokens.length === 0) return ''
  if (tokens.length === 1) {
    // Single word: take up to SINGLE_WORD_LETTERS characters. Short words
    // (e.g. "Ox") simply yield what exists — the `BHC` stem keeps us above
    // Stripe's 3-char floor either way.
    return tokens[0]!.slice(0, SINGLE_WORD_LETTERS)
  }
  return tokens.map((t) => t[0]!).join('')
}

/**
 * Pick the string we derive from, in priority order: company, display name,
 * first+last, last name, then the local part of the email.
 */
function pickSourceString(client: InvoicePrefixSource): string {
  const candidates = [
    client.company,
    client.displayName ?? client.name,
    [client.firstName, client.lastName].filter(Boolean).join(' '),
    client.lastName,
    client.email ? String(client.email).split('@')[0] : null,
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    const text = String(candidate).trim()
    if (!text) continue
    if (tokenize(text).length > 0) return text
  }
  return ''
}

/**
 * Derive the branded prefix for a client, e.g. `BHCGWR`.
 *
 * Returns `null` when nothing usable can be derived (empty/symbol-only name
 * and no e-mail) — callers then omit `invoice_prefix` and let Stripe assign
 * its own random one rather than failing the customer create.
 */
export function deriveInvoicePrefix(client: InvoicePrefixSource | null | undefined): string | null {
  if (!client) return null
  const source = pickSourceString(client)
  if (!source) return null
  const suffix = deriveSuffix(source)
  if (!suffix) return null
  const prefix = `${INVOICE_PREFIX_BASE}${suffix}`.slice(0, INVOICE_PREFIX_MAX_LEN)
  return isValidInvoicePrefix(prefix) ? prefix : null
}

/**
 * Build `base` + numeric suffix, trimming the base so the result still fits
 * Stripe's 12-char ceiling. numberedPrefix('BHCGWR', 2) -> 'BHCGWR2'
 */
function numberedPrefix(base: string, n: number): string {
  const tag = String(n)
  const room = INVOICE_PREFIX_MAX_LEN - tag.length
  return `${base.slice(0, room)}${tag}`
}

type CustomerListPage = {
  data: Array<{ id: string; invoice_prefix?: string | null }>
  has_more?: boolean
}

/**
 * Just enough of the Stripe SDK for prefix uniqueness — keeps the helpers
 * mockable in unit tests without standing up a Stripe client.
 */
export type CustomerListCapableStripe = {
  customers: {
    list: (params: { limit: number; starting_after?: string }) => Promise<CustomerListPage>
  }
}

export type EnsureUniqueOptions = {
  /** Don't count this customer's own prefix as a collision (manual re-set). */
  excludeCustomerId?: string
  /**
   * Extra prefixes to treat as taken. In practice the app's own
   * `clients.stripeInvoicePrefix` column — see the limitation note below.
   */
  knownPrefixes?: Iterable<string | null | undefined>
  /** Ceiling on how many Stripe Customers we page through. Default 1000. */
  maxScan?: number
  logger?: PrefixLogger
}

/** How many numeric suffixes we try before giving up. */
const MAX_SUFFIX_ATTEMPTS = 99

const DEFAULT_MAX_SCAN = 1000
const PAGE_SIZE = 100

/**
 * Collect the `invoice_prefix` values already in use on the Stripe account.
 *
 * LIMITATION: Stripe has no way to filter or search Customers by
 * `invoice_prefix` — `customers.search` only indexes name/email/phone/
 * metadata, and `customers.list` takes no prefix filter. So we page through
 * customers (newest first) up to `maxScan` and read the field off each one.
 * For an account with more customers than that, a collision with a very old
 * customer is still possible; Stripe then rejects the create/update and the
 * callers fall back to letting Stripe assign a prefix (create path) or
 * surface the error (manual action). `knownPrefixes` lets callers add the
 * app's own recorded prefixes to the set so the common case is covered even
 * if the scan is truncated or the API call fails.
 */
async function collectTakenPrefixes(
  stripe: CustomerListCapableStripe,
  opts: EnsureUniqueOptions,
): Promise<Set<string>> {
  const taken = new Set<string>()
  for (const p of opts.knownPrefixes ?? []) {
    if (typeof p === 'string' && p.trim()) taken.add(p.trim().toUpperCase())
  }

  const maxScan = opts.maxScan ?? DEFAULT_MAX_SCAN
  let scanned = 0
  let startingAfter: string | undefined

  try {
    while (scanned < maxScan) {
      const page: CustomerListPage = await stripe.customers.list({
        limit: Math.min(PAGE_SIZE, maxScan - scanned),
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      const rows = page.data ?? []
      for (const customer of rows) {
        scanned += 1
        if (opts.excludeCustomerId && customer.id === opts.excludeCustomerId) continue
        const prefix = customer.invoice_prefix
        if (typeof prefix === 'string' && prefix.trim()) taken.add(prefix.trim().toUpperCase())
      }
      if (!page.has_more || rows.length === 0) break
      startingAfter = rows[rows.length - 1]!.id
    }
  } catch (err) {
    // Read-only scan failed (rate limit, restricted key, network). Fall back
    // to whatever `knownPrefixes` gave us — Stripe still enforces uniqueness
    // server-side, and the create path retries without the prefix on reject.
    opts.logger?.warn?.(
      { err: err instanceof Error ? err.message : err, scanned },
      '[invoice-prefix] could not scan Stripe customers for prefix collisions; using known prefixes only',
    )
  }

  return taken
}

/**
 * Return `base`, or `base2`, `base3`, … — the first variant not already used
 * by another Stripe Customer. Returns `null` if `base` is not a legal Stripe
 * prefix or if every variant is taken (caller then lets Stripe pick).
 */
export async function ensureUniqueInvoicePrefix(
  stripe: CustomerListCapableStripe,
  base: string,
  opts: EnsureUniqueOptions = {},
): Promise<string | null> {
  if (!isValidInvoicePrefix(base)) return null

  const taken = await collectTakenPrefixes(stripe, opts)
  if (!taken.has(base)) return base

  for (let n = 2; n <= MAX_SUFFIX_ATTEMPTS + 1; n += 1) {
    const candidate = numberedPrefix(base, n)
    if (!isValidInvoicePrefix(candidate)) continue
    if (!taken.has(candidate)) return candidate
  }

  opts.logger?.warn?.(
    { base },
    '[invoice-prefix] every numbered variant is taken; letting Stripe assign a prefix',
  )
  return null
}

/**
 * derive + uniquify in one call. Never throws — returns `null` whenever we
 * can't produce a prefix, which means "omit `invoice_prefix`".
 */
export async function resolveInvoicePrefix(
  stripe: CustomerListCapableStripe,
  client: InvoicePrefixSource | null | undefined,
  opts: EnsureUniqueOptions = {},
): Promise<string | null> {
  try {
    const base = deriveInvoicePrefix(client)
    if (!base) return null
    return await ensureUniqueInvoicePrefix(stripe, base, opts)
  } catch (err) {
    opts.logger?.warn?.(
      { err: err instanceof Error ? err.message : err },
      '[invoice-prefix] prefix resolution failed; letting Stripe assign a prefix',
    )
    return null
  }
}

/**
 * The prefixes this app has already recorded on its own Client records.
 * Fed into `ensureUniqueInvoicePrefix` as `knownPrefixes` so uniqueness still
 * holds for our own clients even if the Stripe customer scan is truncated or
 * unavailable. Best-effort — returns [] on any DB error.
 */
export async function collectAppInvoicePrefixes(payload: Payload, limit = 500): Promise<string[]> {
  try {
    const rows = await payload.find({
      collection: 'clients',
      limit,
      depth: 0,
      where: { stripeInvoicePrefix: { exists: true } } as never,
    })
    return rows.docs
      .map((doc) => (doc as { stripeInvoicePrefix?: string | null }).stripeInvoicePrefix)
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
  } catch (err) {
    payload.logger?.warn?.(
      { err: err instanceof Error ? err.message : err },
      '[invoice-prefix] could not read existing client prefixes (non-fatal)',
    )
    return []
  }
}

/**
 * True when a Stripe error is about `invoice_prefix` specifically (bad
 * format, or already used by another customer) rather than something else.
 */
export function isInvoicePrefixError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { param?: unknown; message?: unknown; raw?: { param?: unknown; message?: unknown } }
  const param = e.param ?? e.raw?.param
  if (typeof param === 'string' && param.toLowerCase().includes('invoice_prefix')) return true
  const message = [e.message, e.raw?.message].filter((m) => typeof m === 'string').join(' ')
  return /invoice[ _-]?prefix/i.test(message)
}

/** Structural slice of the SDK needed to create a customer (mockable). */
export type CustomerCreateCapableStripe<C> = {
  customers: {
    create: (params: Stripe.CustomerCreateParams) => Promise<C>
  }
}

/**
 * `stripe.customers.create` with the branded prefix attached, guarded so a
 * rejected prefix can never block customer creation: if Stripe complains
 * about `invoice_prefix` we log a warning and retry once without it, letting
 * Stripe assign its own.
 *
 * Returns the created customer plus the prefix that actually stuck (`null`
 * when Stripe assigned its own).
 */
export async function createStripeCustomerWithPrefix<C extends { id: string }>(
  stripe: CustomerCreateCapableStripe<C>,
  params: Stripe.CustomerCreateParams,
  opts: { invoicePrefix?: string | null; logger?: PrefixLogger } = {},
): Promise<{ customer: C; invoicePrefix: string | null }> {
  const prefix = opts.invoicePrefix && isValidInvoicePrefix(opts.invoicePrefix) ? opts.invoicePrefix : null
  if (!prefix) {
    const customer = await stripe.customers.create(params)
    return { customer, invoicePrefix: null }
  }

  try {
    const customer = await stripe.customers.create({ ...params, invoice_prefix: prefix })
    return { customer, invoicePrefix: prefix }
  } catch (err) {
    if (!isInvoicePrefixError(err)) throw err
    opts.logger?.warn?.(
      { err: err instanceof Error ? err.message : err, invoicePrefix: prefix },
      '[invoice-prefix] Stripe rejected the invoice prefix; creating the customer without one',
    )
    const customer = await stripe.customers.create(params)
    return { customer, invoicePrefix: null }
  }
}
