# Stripe invoice prefixes (branded invoice numbers)

Stripe numbers each Customer's invoices `PREFIX-0001`, `PREFIX-0002`, … where
`PREFIX` is that customer's `invoice_prefix` and the counter is their
`next_invoice_sequence`. Numbering is **per customer**, not per account.

If we don't supply a prefix, Stripe generates a random 8-character one
(`XRUMZVGS-0001`), which reads like a database artifact on a client's receipt.
So every Stripe Customer the app creates now gets a branded prefix.

## The rule

`BHC` + letters derived from the client, capped at Stripe's 12-character
ceiling. Implemented in [`src/lib/invoice-prefix.ts`](../../src/lib/invoice-prefix.ts)
(`deriveInvoicePrefix`).

1. Pick the source string, first non-empty wins:
   **company** → **display name** (or Stripe `name`) → **first + last** →
   **last name** → **local part of the e-mail**.
2. Drop legal-entity suffixes (`LLC`, `L.L.C.`, `Inc.`, `Ltd`, `Corp`, `GmbH`, …)
   when another word remains.
3. Fold accents (`Café` → `CAFE`), uppercase, and drop everything that isn't
   `A-Z0-9`.
4. **Multi-word** → first letter of each word. **Single word** → first 3-5
   characters.
5. Prepend `BHC` and truncate to 12 characters.

| Client | Prefix | First invoice |
| --- | --- | --- |
| Grants Within Reach | `BHCGWR` | `BHCGWR-0001` |
| Prometheus Minds | `BHCPM` | `BHCPM-0001` |
| Black Hart Consulting, LLC | `BHCBHC` | `BHCBHC-0001` |
| Bayou (single word) | `BHCBAYOU` | `BHCBAYOU-0001` |
| no company, `jane.doe@…` | `BHCJD` | `BHCJD-0001` |

Uniqueness (`ensureUniqueInvoicePrefix`) appends `2`, `3`, … on a collision
(`BHCGWR` taken → `BHCGWR2`), trimming the base so the result still fits 12
characters.

If nothing usable can be derived (symbol-only name, no e-mail), the helpers
return `null` and we simply omit `invoice_prefix` — Stripe assigns its own.

## Stripe's constraints

- 3-12 characters, **uppercase letters and digits only** — no hyphens, spaces
  or punctuation (`^[A-Z0-9]{3,12}$`).
- Must be **unique across every Customer** in the Stripe account.
- Changing a prefix affects **future invoices only**. Already-issued invoices
  keep the number they were issued with, and `next_invoice_sequence` is not
  reset — so a customer at sequence 4 who gets a new prefix continues at
  `NEWPREFIX-0004`.
- There is **no way to search or filter Customers by `invoice_prefix`**:
  `customers.search` indexes name/email/phone/metadata only, and
  `customers.list` takes no prefix filter. So the uniqueness check pages
  through Customers (newest first, default cap 1000) and reads the field off
  each one, and additionally treats every prefix recorded in our own
  `clients.stripeInvoicePrefix` column as taken. On a very large account a
  collision with an older customer is still possible — Stripe then rejects it
  and the create path falls back to a Stripe-assigned prefix (see below).

## Where it happens automatically

All three customer-create paths derive a prefix and pass `invoice_prefix` to
`stripe.customers.create`, then mirror the result onto the Client record's
read-only `stripeInvoicePrefix` field:

- `src/collections/Clients.ts` — `afterChange` on a newly created Client.
- `src/app/api/checkout/start/route.ts` — client pays an invoice link.
- `src/app/api/invoices/[id]/sync/route.ts` — pushing a draft invoice to Stripe.

Each goes through `createStripeCustomerWithPrefix`, which is **guarded**: if
Stripe rejects the prefix (bad format, already used), it logs a warning and
retries once without `invoice_prefix`. Customer creation can never fail because
of a prefix.

When a path *links an existing* Stripe Customer by e-mail instead of creating
one, we only **read** its `invoice_prefix` into the mirror field — never
overwrite it.

## Existing clients: the manual action

Prefixes are never rewritten automatically (it would shift invoice numbering
for a client mid-engagement). To fix a client created before this existed:

1. Open the Client in the admin → sidebar → **Invoice prefix** → **Set invoice
   prefix**.
2. The confirm panel shows the **current** prefix straight from Stripe, the
   **new** one, and what the next invoice number will be. Cancel or Confirm.
3. Confirm calls `stripe.customers.update(cus_…, { invoice_prefix })` —
   `next_invoice_sequence` is deliberately untouched — writes
   `stripeInvoicePrefix`, and records a `client.invoice_prefix_set` audit event
   (visible in the client's Activity timeline).

Endpoint: `POST /api/clients/[id]/set-invoice-prefix`, admin session required,
same-origin only.

- `{ "mode": "preview" }` → `{ current, suggested, nextInvoiceSequence, unchanged }`
- `{ "mode": "apply", "prefix": "BHCGWR" }` → applies it (`prefix` optional;
  omit to use the derived one, supply it to override — it is validated against
  Stripe's pattern and uniqueness either way).

## Tests

`src/lib/invoice-prefix.test.ts` (`npm test`) covers derivation (multi-word,
single word, punctuation and legal suffixes, accents, digits, very long names,
empty → e-mail fallback), uniqueness suffixing/pagination/scan-failure
fallback, and the create-path guard (Stripe rejecting `invoice_prefix` → retry
without it, unrelated errors still thrown). All mocked — no Stripe API calls.
