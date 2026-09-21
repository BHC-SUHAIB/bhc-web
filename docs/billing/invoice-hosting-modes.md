# Invoice hosting modes

How an invoice presents hosting (the Care Plan tiers: Host / Care / Growth),
how the default is chosen, and how to send an invoice from the admin.

Code: `src/lib/invoice-hosting.ts` (all the logic, pure + unit tested),
`src/lib/hosting-subscriptions.ts` (the "already on a plan?" lookup),
`src/collections/Invoices.ts`, `src/collections/Clients.ts`,
`src/app/(frontend)/invoice/[id]/`, `src/app/api/checkout/start/route.ts`,
`src/components/admin/InvoiceWorkflowField.tsx`.

---

## The three modes

Set per invoice, in the sidebar field **Hosting on this invoice**.

| Mode | What the client sees on `/invoice/[id]` |
|---|---|
| **Included: client already agreed to hosting** | An order summary — "Due today: $X" and "{Plan} hosting: $Y/month, first month free, first charge on {date}" — the plan fixed to the invoice's **Suggested care plan**, one unticked authorization checkbox, and a single button **"Pay $X and start hosting"** that stays disabled until the box is ticked. A small text link, *Pay the invoice without hosting*, drops hosting and reveals a plain pay button. |
| **Offer: show an optional hosting add-on** | Unchanged from before this feature: an unticked "Add a hosting plan" box; ticking it reveals the tier picker and the authorization checkbox, and the pay button is blocked until that box is ticked. |
| **Hidden: no hosting section** | No hosting UI at all. Just line items and Pay. |

Two things override the mode and force **hidden**, wherever hosting is
resolved (page, checkout route, invoice email):

- the invoice bills a subscription (`stripeSubscriptionId` is set), or
- the client already has an `active` or `trialing` row in **Subscriptions**.

We never sell a second hosting plan to someone who is already paying for one.

### Back-compat

`hostingMode` is a new, nullable field. Every invoice created before it
existed has it empty, and the mode is then derived from the old
`allowCarePlanUpsell` checkbox:

| Stored `hostingMode` | `allowCarePlanUpsell` | Effective mode |
|---|---|---|
| set | anything | the stored mode |
| empty | `true` | `offer` |
| empty | `false` | `hidden` |
| empty | missing / null | `offer` (the old page used `!== false`) |

So existing invoices render byte-for-byte as they did before.

`allowCarePlanUpsell` is **deprecated but still live**: it is read-only in the
admin and mirrored from the mode on every save (checked for included/offer,
unchecked for hidden), so anything still reading the boolean keeps agreeing
with the mode. It is never written for an invoice that has no mode stored —
that would flip the meaning of a legacy row on an unrelated partial update.

---

## Why the authorization box is never pre-ticked

A hosting plan is a recurring, merchant-initiated charge against a saved
payment method. Card-network MIT rules and US consumer-protection practice
both require **express, affirmative** consent captured at the moment of
agreement — a pre-ticked box is not consent, and neither is "they agreed on
the phone".

So, in `included` mode:

- the box arrives **unticked** (pinned by a test in
  `src/lib/invoice-hosting.test.ts` and by the render tests in
  `src/app/(frontend)/invoice/[id]/InvoiceClient.test.ts`),
- the pay button is **disabled** until it is ticked,
- there is **no path** that starts hosting without it — `invoicePayState()`
  has no state where `includesHosting && canPay && !authorized`, and
  `/api/checkout/start` re-checks the mode server-side and ignores what the
  browser claims,
- the exact sentence shown is stored verbatim with a timestamp, IP and user
  agent on the Subscription's `consentRecord` (unchanged from the old flow —
  the string is the same one, now shared by both modes via
  `carePlanConsentText()`).

The counterweight is the escape hatch: *Pay the invoice without hosting*. A
client who changes their mind must always be able to settle the invoice.
"Included" is a sales default, not a lock-in.

---

## Defaults, and where they come from

**Clients → Hosting agreed** (`none` / Host / Care / Growth). Set it when a
client accepts a proposal that includes hosting.

On invoice **create only** (the operator can change the mode freely
afterwards; nothing re-runs on update):

1. client has an `active`/`trialing` subscription → `hidden`
2. else client's *Hosting agreed* is a real tier → `included`, and
   **Suggested care plan** is set to that tier
3. else → `hidden`

Friend & family clients keep their existing behaviour: `skipStripePush` on
and hosting `hidden`.

Note the default for a brand-new client with nothing agreed is **hidden**,
not `offer`. Existing invoices are untouched; if you want the old upsell on a
new invoice, pick *Offer* on the form.

---

## Operator flow

On the Invoice document, under **Send this invoice**:

- **Push to Stripe** (drafts only) — calls `/api/invoices/[id]/sync`, which
  creates and finalizes the Stripe invoice and returns the signed branded
  URL. Nobody is emailed. The URL is shown with a copy button. Writes an
  `invoice.pushed_to_stripe` audit event.
- **Finalize and send** — shows a confirmation with the client name + email,
  the total (and the monthly amount when hosting is included), the hosting
  mode in plain words, and "this emails the client now". On confirm it runs
  sync (if the invoice is still a draft) and then
  `/api/invoices/[id]/send-email`, which sends the branded email with the
  branded PDF attached and writes an `invoice.email_sent` audit event.

Off-platform invoices (`skipStripePush`) show an explanation instead of
buttons — they never go to Stripe.

The same two-step is available on draft rows in **Invoices & subscriptions**
on the Client document ("Finalize & send", with a confirm click).

Errors are printed verbatim from the route, so a Stripe rejection reads as a
Stripe rejection.

### What the client gets when the mode is `included`

- **Email**: one extra sentence ("Your {Plan} hosting plan starts with this
  payment: the first month is free, the first $X charge runs on {date}, and
  you can cancel any time.") plus a row in the summary table.
- **PDF**: a short HOSTING note under the totals with the same facts.
- Other modes: email and PDF are unchanged.

The first-charge date is *today + `CARE_PLAN_TRIAL_DAYS`* (30), i.e. it
assumes same-day payment. The consent sentence itself is worded relative to
the payment ("30 days after this invoice is paid"), so a client who pays
later is never charged earlier than they were told.

---

## Production rollout checklist

1. **Merge the PR** into `main`.
2. **GitHub Actions deploys it.** Pushing `main` triggers the deploy
   workflow. **Watch the run to completion.** Never run
   `scripts/deploy.sh` by hand after a push — the workflow already does,
   and a manual run races it.
3. The two new columns (`invoices.hosting_mode`, `clients.hosting_agreed`)
   are additive and nullable; Payload adds them on boot. Nothing to
   backfill — empty `hosting_mode` is the supported legacy state.
4. **Verify an existing open invoice renders as before.** Open a real
   pre-existing invoice's branded link and confirm the hosting section looks
   exactly as it did (upsell present if `allowCarePlanUpsell` was checked,
   absent if not).
5. **Create a $1 live test invoice to yourself**, set *Hosting on this
   invoice* to Included, run Finalize and send, check the email and the PDF
   note, open the branded page, confirm the box is unticked and the button
   disabled — then **void the invoice** in Stripe.
6. Spot-check a client with an active subscription: a new invoice for them
   should default to `hidden`, and their branded page should show no hosting
   section.
