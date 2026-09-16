# Houston small-business website report (September 2026)

Public page: `/reports/houston-small-business-websites-2026` (route in
`src/app/(frontend)/reports/houston-small-business-websites-2026/page.tsx`,
numbers in `src/lib/houston-report-2026.ts`).

## Where the data comes from

Hart Pipeline (`~/Desktop/Web Development/hart-pipeline`, prod Postgres on the
165.227.210.216 droplet, container `5e99gtp7ma8jbwwko0xjaaeu`, db `hart_pipeline`,
table `leads`). Every business the pipeline discovered from Google Maps between
2026-08-31 and 2026-09-15 across three verticals (auto services, home services,
salons and med spas) in the Heights / northwest / central-west Houston ZIP set.
The qualify stage (`src/pipeline/qualify.ts`) stores a `siteScore` JSON per lead:
reachable, https, viewportOk, builderFingerprint, copyrightYear, lighthouseMobile
(PageSpeed Insights v5, mobile, performance), designQuality (Claude vision, 0-100).

## How to reproduce

Copy a `queries-*.sql` file to the droplet and run it read-only:

```bash
scp queries-4-final-base.sql root@165.227.210.216:/tmp/q.sql
ssh root@165.227.210.216 'docker cp /tmp/q.sql 5e99gtp7ma8jbwwko0xjaaeu:/tmp/q.sql && docker exec 5e99gtp7ma8jbwwko0xjaaeu psql -U postgres -d hart_pipeline -At -F" | " -f /tmp/q.sql'
```

`source-numbers.md` is the transcript of every figure used on the page, with the
denominators. Neighborhood figures are only published where n >= 30.

## The "unreachable" correction

The crawler (identified bot, honors robots.txt, 10 s timeout) could not load 140 of
the 786 real-domain websites. All 140 were re-fetched from a Mac with a Chrome user
agent (`curl -L`, 15 s): 53 were genuinely dead (DNS/connect failure, 404, 5xx,
timeout), 12 had broken TLS certificates, 56 loaded fine (bot-blocked), 19 were
ambiguous 4xx and are NOT counted as dead. The page therefore reports 6.7% dead and
8.3% dead-or-certificate-broken, never the raw 17.8% crawler failure rate.

## Privacy rule

No business is named or identifiable. Only aggregates are published, and only
with denominators. Social/aggregator "websites" (Instagram, Facebook, Yelp,
Google, Booksy, Vagaro, Square, hub.biz, business.site) are excluded from all
site-quality figures and counted separately as "no website of their own".
