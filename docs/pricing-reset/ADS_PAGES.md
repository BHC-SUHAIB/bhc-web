# Paused Ads landing pages: status and recommendations

All `/lp/*` pages were rewritten to the new catalog (new prices, new CTAs,
founding language removed), remain `noindex`, and stay out of the sitemap.
They are reachable by URL for a future Ads test. Nothing was deleted.
Do not act on the recommendations below until Suhaib approves them.

| Page | What it is now | Recommendation |
|---|---|---|
| `/lp/express-website` | Generic Heights small-business offer: audit tool + $699 Starter single-offer + bundle configurator (Starter, Host, SEO Sprint, Front Desk setup) | **Keep as an Ads page.** It is the generic offer page; its bundle configurator has no equivalent elsewhere. Repoint ads here or at /free-demo-site. |
| `/lp/heights-dental` | Dental vertical pitch, new websites pricing | **Merge into Phase 6** (dentists x Heights is in the phase-two matrix; its vertical copy is mostly unique). Retire (draft) after the Phase 6 page exists. |
| `/lp/heights-med-spa` | Med spa vertical pitch | **Merge into Phase 6** (med spas x Heights is in the matrix). Retire (draft) after the Phase 6 page exists. |
| `/lp/heights-restaurant` | Restaurant vertical pitch | **Keep as an Ads page.** Restaurants are not in the Phase 6 vertical matrix, and the copy is vertical-specific. |
| `/lp/heights-real-estate` | Real estate vertical pitch | **Keep as an Ads page.** Real estate is not in the Phase 6 matrix. |
| `/lp/houston-midmarket` | Mid-market pitch (Pro Site + Custom Build) | **Keep as an Ads page.** Generic offer page for a distinct audience; exists only in the database (no seed), so treat the CMS as its source of truth. |
| `/p/<slug>/*` prospect previews | Password-gated client mockups | Not Ads pages; out of scope. No retired-phone or founding content found in them. |

## Approved Ads recommendations (apply in the Ads console; Claude never touches the live campaign)

1. **Primary destination: `/free-demo-site`.** The no-risk offer ("see your
   new site before you pay a dollar") is the lowest-friction click on the site
   and matches a cold, price-sensitive audience far better than a pricing
   page. Point the Houston-Exact campaign's main ad group here.
2. **Test price-led copy: "$399" and "$699" in headlines.** The old ads could
   not name an honest low price; the new catalog can. RSA headline ideas:
   "Websites From $399", "See Your Site Before You Pay", "New Site Live in 7
   Days", "Free Demo Site in 48 Hours".
3. **Second ad group: AI Front Desk** ("Never miss a call", "24/7 answering
   from $149/mo", destination `/ai-front-desk`) once the demo line answers.
   Do NOT launch this group before the 866 agent is live.
4. **Conversion tracking:** map the new `purchase` dataLayer event (fires on
   /thanks?sku= with real dollar values) as a Google Ads conversion alongside
   `generate_lead`, then move to value-based bidding once volume exists.
5. Keep `/lp/*` pages noindex either way; if an LP test resumes, update the
   final URLs in the existing RSAs rather than creating new campaigns.
