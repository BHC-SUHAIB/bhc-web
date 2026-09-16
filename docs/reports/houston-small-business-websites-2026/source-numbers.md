# Houston small-business website report: source numbers (pulled 2026-09-15, read-only)

Source: hart-pipeline prod Postgres (leads table), businesses discovered from Google Maps
2026-08-31 to 2026-09-15 across three verticals (auto services, home services, salons/med spas)
in Houston Heights / northwest / central-west Houston ZIPs (top: 77092, 77055, 77008, 77018,
77007, 77002, 77009, 77080, 77024, 77040, 77091, 77005, 77098, 77019, 77006, 77022, 77003).

## Sample
- 1,178 businesses. auto-services 531, home-services 453, salon-medspa 194.
- Top categories: auto repair 129, tire shop 80, car wash 75, detailing 69, plumber 61, nail salon 57,
  electrician 53, beauty salon 45, auto glass 40, barber 35, fence 31, handyman 30, landscaper 25.
- Reviews: avg rating 4.43 (no site) vs 4.63 (site); avg review count 59 vs 255; median 26 vs 66.

## Website presence
- No website listed on Google: 340 / 1,178 = 28.9%.
- Listed "website" is a social/aggregator link (Instagram, Facebook, TikTok, Linktree, Yelp, Google,
  business.site, hub.biz, Booksy, Vagaro, Square): 52 / 838 = 6.2% of listed sites (26 pure social).
- No real website of their own: (340 + 52) / 1,178 = 392 = 33.3%.
- By vertical, no website: auto 197/531 = 37.1%; salon-medspa 57/194 = 29.4%; home-services 86/453 = 19.0%.
- No-website businesses with 50+ reviews and 4.5+ rating: 62 (auto 40, salon 19, home 3). 100+ reviews: 50. 20+ reviews: 168.
- No-website by neighborhood (n>=36): Northside/Northline 54.5% (44), Independence Heights 42.5% (40),
  Fairbanks/NW Crossing 41.7% (72), Central Northwest 36.5% (96), Spring Branch East 34.1% (129),
  Spring Branch Central 30.6% (36), Greater Heights 27.6% (123), Wash Ave/Memorial Park 17.5% (80),
  Montrose 15.5% (58), Downtown 14.1% (78), Greenway/Upper Kirby 13.9% (36), Westside 10.4% (48).

## Dead / broken sites (786 real-domain URLs)
- Crawler could not load 140. Re-checked all 140 from a Mac with a Chrome UA (curl -L, 15s):
  dead (DNS/connect fail 37, 404 9, timeout 3, 5xx 4) = 53; broken SSL cert = 12; loads fine = 56;
  ambiguous 403/4xx = 19 (not counted as dead).
- Dead or broken: 53 / 786 = 6.7%. Dead or SSL-broken: 65 / 786 = 8.3% (about 1 in 12).

## Site quality (616 real-domain sites the crawler loaded)
- No HTTPS: 37 / 616 = 6.0%. No mobile viewport tag: 34 / 616 = 5.5%.
- Copyright year shown: 331; 2022 or older: 55 = 16.6% of those showing a year (oldest 2004; 2007 x4).
- Design judged dated (0-30/100): 42 / 616 = 6.8% (model-judged from screenshot; use lightly).
- Builder fingerprints (639 reachable incl. non-real): custom/other 484 (75.7%), GoDaddy 58, Wix 50, Squarespace 31, Weebly 16 -> 155 = 24.3% on a DIY builder.

## Google PageSpeed mobile performance (523 real-domain sites scored)
- Mean 60.6, median 60. Under 50 ("poor"): 140 = 26.8%. 90+ ("good"): 46 = 8.8%. 50-89: 337 = 64.4%.
- Deciles (all scored, 543): 0s:3 10s:14 20s:21 30s:49 40s:64 50s:117 60s:100 70s:84 80s:43 90s:33 100:15.
- By builder (% under 50): Weebly 86.7% (n15), Squarespace 65.5% (29), custom 24.9% (418), GoDaddy 20.0% (35), Wix 17.4% (46).
- By vertical (reachable): home-services avg 64.6 / 21.1% under 50 (286); auto 58.2 / 32.4% (247); salon-medspa 51.9 / 36.4% (106).
- By neighborhood (n>=30 scored): Downtown 64.6 avg / 25.7% under 50 (35); Wash Ave 60.4 / 35.6% (45);
  Greater Heights 59.6 / 26.8% (56); Spring Branch East 57.1 / 31.7% (60); Montrose 56.3 / 35.5% (31); Central NW 53.7 / 37.5% (40).

## Combined
- Among 523 scored sites: at least one serious problem (no https, no viewport, PageSpeed <50, dated design, copyright <=2022) = 224 = 42.8%; clean = 299 = 57.2%. Without the design signal: 211 = 40.3%.
- Adding the 65 dead/SSL-broken sites: 289 / 588 evaluated = 49.1% ~ "half".

## Method caveats for the write-up
- Sample = businesses Google Maps returns for vertical search terms in these ZIPs; not a census.
- Crawler = identified bot honoring robots.txt with a 10s timeout; "unreachable" re-verified by hand as above.
- PageSpeed = Google PageSpeed Insights v5, mobile strategy, performance category only.
- Design score = Claude vision judgment from a desktop screenshot; treat as directional.
- HTTPS = final URL after redirects starts with https. Viewport = presence of a meta viewport tag.
- No business is named; all figures are aggregates; neighborhood figures only where n >= 30.

## Recheck of the 140 crawler-failed real domains (2026-09-15, curl -L, Chrome UA, 15 s)
alive_200 56 · dead_dns_or_connect 37 · blocked_or_unknown 19 (403 x16, 409, 402, 400) · broken_ssl 12 · dead_404 9 · server_error 4 · dead_timeout 3
=> dead or broken = 37+9+4+3 = 53 (6.7% of 786); + broken SSL 12 = 65 (8.3%).

## FINAL BASE used on the page (real-domain, crawler-reachable = 616; PageSpeed-scored = 523), queries-4-final-base.sql
- By trade (n reachable / scored / avg / median / %<50 / %90+ / %no-https / %no-viewport / %stale-of-dated / %dated-design):
  home-services 280/245/64.5/63/21.2/12.7/8.6/6.8/16.0/5.7; auto-services 246/203/58.3/58/32.0/7.4/2.8/4.9/14.7/7.9; salon-medspa 90/75/53.9/58/30.7/0.0/6.7/3.3/25.0/7.8
- By builder (n / scored / avg / %<50): custom 469/405/62.5/24.7; GoDaddy 58/35/61.4/20.0; Wix 50/46/61.0/17.4; Squarespace 31/29/40.3/65.5; Weebly 8/8/30.3/75.0. On a builder: 147/616 = 23.9%.
- Deciles (523): 0s 3, 10s 9, 20s 18, 30s 48, 40s 62, 50s 115, 60s 99, 70s 83, 80s 40, 90s 31, 100 15. Under 50 = 140 (26.8%), 90+ = 46 (8.8%), 50-89 = 337 (64.4%).
- By neighborhood (scored / avg / %<50): Central NW 40/53.7/37.5; Wash Ave-Memorial Park 45/60.4/35.6; Montrose 31/56.3/35.5; Spring Branch East 60/57.1/31.7; Greater Heights 56/59.6/26.8; Downtown 35/64.6/25.7.
- Hygiene (616): no https 37 (6.0%); no viewport 34 (5.5%); copyright shown 331, <=2022 55 (16.6%); design scored 610, <=30 42 (6.9%).
- Combined: 224/523 scored have >=1 problem (42.8%); + 65 dead/SSL = 289/588 = 49.1%.
