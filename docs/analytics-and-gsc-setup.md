# Analytics + Search Console — finish-the-setup guide

Two step-by-step walkthroughs you'll run **once** before re-enabling Google Ads. Both assume you're logged into the same Google account that owns GTM (`GTM-WMGWBR5R`), GA4 (`G-RKJH2522XZ`), Google Ads (`AW-18101888758`), and Search Console.

---

## #12 — Wire `page_type` so you can segment LP traffic from main-site traffic

The code now pushes `page_type: 'main_site'` on the main site and `page_type: 'landing_page'` on every `/lp/*` page **before** GTM loads. Now you have to tell GA4 about it so it shows up as a usable dimension. Five steps, ~10 minutes.

### 1. Create the GTM Variable that reads `page_type` from the dataLayer

1. Open GTM → **Variables** → **User-Defined Variables** → **New**
2. Name it: `dlv – page_type`
3. **Variable Configuration** → choose **Data Layer Variable**
4. **Data Layer Variable Name:** `page_type`
5. **Data Layer Version:** Version 2 (default)
6. **Default Value:** `unknown` (so GA4 doesn't see literal `undefined` strings)
7. Save.

### 2. Send `page_type` as a parameter on the GA4 Configuration tag

1. GTM → **Tags** → open your existing **GA4 Configuration** tag (the one with `G-RKJH2522XZ`)
2. Scroll to **Configuration Parameters** (or **Fields to Set**, depending on GA4 tag version)
3. Click **Add Row**
   - **Parameter Name:** `page_type`
   - **Value:** `{{dlv – page_type}}`
4. Save the tag. **Submit** the workspace and **Publish**.

> Why this works: every `event` GA4 receives now carries a `page_type` parameter. That parameter then becomes registerable as a custom dimension in GA4.

### 3. Register `page_type` as a Custom Dimension in GA4

1. Open **GA4** (the `G-RKJH2522XZ` property) → **Admin** (bottom-left gear)
2. Under **Data display**, click **Custom definitions**
3. Click **Create custom dimension**
   - **Dimension name:** `Page type`
   - **Scope:** Event
   - **Event parameter:** `page_type`
4. Save.

> First data shows up after GA4 sees ≥1 hit with the parameter. Allow up to 24 hours before the dimension appears in reports — but DebugView (next step) will show it instantly.

### 4. Verify in GA4 DebugView

1. In your browser, install the **Google Tag Assistant** extension (or use the GTM Preview mode).
2. Visit `https://blackhartconsulting.com/` → confirm DebugView shows `page_view` event with parameter `page_type: main_site`.
3. Visit `https://blackhartconsulting.com/lp/heights-dental` → confirm `page_view` shows `page_type: landing_page`.

If `page_type` is absent in DebugView: re-check that the `dlv – page_type` variable is mapped on the GA4 Config tag and that you **Published** the workspace (not just saved).

### 5. Use it in reports

- **Reports → Engagement → Pages and screens** → click the secondary dimension picker → search "Page type" — you can now split any page-level report by `main_site` vs `landing_page`.
- **Explore → Free form** → drag `Page type` into Rows → drag `Conversions` into Values → instantly see LP-conversion-rate vs main-site-conversion-rate.
- For Google Ads optimization: build an **audience** in GA4 with `page_type = landing_page` and import it to Google Ads as a conversion-quality audience. Smart Bidding will use it.

---

## #13 — Verify Search Console knows about every page that should be indexed

Goal: confirm GSC has crawled and indexed `/`, `/services`, `/about`, `/portfolio`, `/articles`, plus the 4 article slugs and 2 portfolio slugs. The 5 LPs (`/lp/*`) are intentionally `noIndex: true` and should NOT appear here — if they do, that's the bug to chase.

### 1. Confirm the property is verified

1. Open **Search Console** → switch to the `https://blackhartconsulting.com/` property.
2. If verification badge is missing, re-verify via Google Tag Manager (since GTM is already on every page) — **Settings → Ownership verification → Google Tag Manager → Verify**. Takes seconds, no DNS change needed.

### 2. Submit (or re-submit) the sitemap

1. **Sitemaps** (left nav)
2. If `sitemap.xml` is not listed, type `sitemap.xml` and click **Submit**.
3. The status should flip from "Couldn't fetch" → "Success" within a few minutes. If it stays on "Couldn't fetch," confirm the file exists at `https://blackhartconsulting.com/sitemap.xml` (the Next.js app route generates it at build time).
4. **Discovered URLs:** confirm the count matches your published `Pages` + published `Articles` + published `Projects` (currently 4 + 4 + 2 = 10). It should NOT include the 5 `/lp/*` URLs.

### 3. Force-index the 6 most important URLs

> Google indexes new URLs on its own schedule. You can hint by manually requesting indexing for the URLs that drive the most ad-quality-score weight and organic traffic.

For each of these URLs:

```
https://blackhartconsulting.com/
https://blackhartconsulting.com/services
https://blackhartconsulting.com/about
https://blackhartconsulting.com/portfolio
https://blackhartconsulting.com/articles
https://blackhartconsulting.com/contact
```

1. Paste the URL into the **Inspect any URL** bar at the top of GSC.
2. Wait for the inspection to complete.
3. If it says "URL is on Google" → done.
4. If it says "URL is not on Google" → click **Request indexing**. Google will queue it; usually crawls within 24–72 hours.
5. **Don't repeat-submit the same URL** — that doesn't speed it up and can flag your account as spammy.

### 4. Confirm `noIndex` is actually working on LPs

1. Inspect `https://blackhartconsulting.com/lp/heights-dental`.
2. The result should say "URL is not on Google" with reason "Excluded by 'noindex' tag."
3. If it instead says "URL is on Google" — you have a bug: the LP's SEO `noIndex: true` field isn't rendering the meta tag. Check `src/app/(lp)/lp/[slug]/page.tsx` `generateMetadata()` — `robots: { index: false }` should be set when `seo.noIndex` is true.

### 5. Set up the 3 useful alerts (one-time)

1. **Settings → Email preferences** → enable:
   - Coverage issues (catches if `noIndex` accidentally lands on the homepage)
   - Manual actions (catches Google penalties early)
   - Mobile usability errors (catches if a layout change breaks mobile)

### 6. Connect GSC to GA4 (this gets you organic-search keywords inside GA4)

1. **GA4 → Admin → Property → Search Console links** (under "Product links")
2. Click **Link** → choose your `https://blackhartconsulting.com/` property → confirm.
3. After ~24 hours, you'll see **Reports → Acquisition → Search Console** populated with your top organic queries — by far the most useful data for SEO content planning.

---

## After both are done

Before re-enabling Google Ads:

- [ ] DebugView shows `page_type` on both a main-site and an LP page (#12 step 4).
- [ ] GSC sitemap shows "Success" with 10 URLs (#13 step 2).
- [ ] At least 1 main URL shows "URL is on Google" in inspection (#13 step 3).
- [ ] `noIndex` confirmed on at least 1 LP (#13 step 4).
- [ ] GSC↔GA4 link active (#13 step 6).

Then resume the paused Search-Web-Design-US-LP-Express campaign — Smart Bidding will have `page_type = landing_page` as a quality signal from day one instead of having to learn it.

## #14 — First-touch attribution on lead submissions (shipped 2026-09-13)

Every lead form (contact, free-demo, audit tool, exit-intent popup) now sends the
visitor's **first-touch attribution** with the submission, and the notification
email carries a `Source:` block (e.g. `google / cpc / lp_express_website · keyword
"custom website design" · gclid`). No more reconstructing origin from GA4 + Clarity.

How it works (`src/lib/attribution.ts`):

1. An inline `<script id="first-touch">` in both root layouts runs before anything
   else and stores `gclid / gbraid / wbraid / msclkid / fbclid`, `utm_*`, the external
   referrer, the landing path (with query string) and a timestamp in
   `localStorage.bhc_first_touch`.
2. A stored record is only overwritten when it has **no** campaign data and the
   current visit does (organic first, ad later → the ad wins; an ad first-touch is
   never clobbered).
3. Forms call `getAttribution()` at submit time (falls back to the current URL when
   storage is blocked, e.g. Safari Private Browsing) and send `attribution`.
4. `ContactSubmissions` whitelists + length-caps the object and stores it in the
   `attribution` group (visible in Admin → Leads → Contact submissions).

Preview the email: `/dev-email-preview?type=contact` or `?type=demo-request` (dev only).

### Related dataLayer event: `form_validation_error`

Fired when a lead form's client-side required-field check blocks the submit.
Params: `form` (`contact` | `demo_request`), `missing` (comma-joined field keys),
`source_page`. Register it in GTM as a GA4 event (NOT a conversion) to see how
often real visitors get stuck on a required field. Background: the 2026-09-13
Google Ads visitor who tapped "Send me my demo" three times never produced a
server request; this event would have shown why.

### Spam handling is now soft

A filled honeypot no longer rejects the submission. The record is saved with
`suspectedSpam = true` + `spamSignals`, the notification email is skipped, and it
still shows up in Admin → Leads (column "Suspected spam"). Time-to-submit is
recorded on every lead; under 3s is noted as a soft signal only. Cross-origin
and rate-limit checks are unchanged (still hard rejects).
