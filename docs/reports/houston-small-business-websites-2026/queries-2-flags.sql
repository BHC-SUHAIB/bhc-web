\echo === problem flags among checked sites (website present, site_score present)
with s as (
 select id, vertical, neighborhood,
  (site_score->>'reachable')='true' as reachable,
  (site_score->>'https')='true' as https,
  (site_score->>'viewportOk')='true' as viewport,
  (site_score->>'lighthouseMobile')::int as lh,
  (site_score->>'designQuality')::int as dq,
  nullif(site_score->>'copyrightYear','')::int as cy,
  coalesce(site_score->>'builderFingerprint','custom') as builder
 from leads where website_url is not null and site_score is not null)
select count(*) checked,
 count(*) filter (where not reachable) unreachable,
 count(*) filter (where reachable and not https) no_https,
 count(*) filter (where reachable and not viewport) no_viewport,
 count(*) filter (where lh < 50) lh_under50,
 count(*) filter (where lh < 30) lh_under30,
 count(*) filter (where dq <= 30) design_dated,
 count(*) filter (where cy <= 2022) stale_copyright,
 count(*) filter (where builder='parked') parked,
 count(*) filter (where not reachable or not https or not viewport or lh < 50 or dq <= 30 or cy <= 2022) any_problem,
 count(*) filter (where reachable and (not https or not viewport or lh < 50 or dq <= 30 or cy <= 2022)) any_problem_reachable,
 count(*) filter (where reachable) reachable_n,
 count(*) filter (where reachable and lh is not null and dq is not null) fully_scored,
 count(*) filter (where reachable and lh is not null and dq is not null and not (not https or not viewport or lh < 50 or dq <= 30 or cy <= 2022)) fully_scored_clean
from s;
\echo === lighthouse deciles (for chart)
select (((site_score->>'lighthouseMobile')::int)/10)*10 as decile, count(*) from leads where website_url is not null and site_score->>'lighthouseMobile' is not null group by 1 order by 1;
\echo === design deciles
select (((site_score->>'designQuality')::int)/10)*10 as decile, count(*) from leads where website_url is not null and site_score->>'designQuality' is not null group by 1 order by 1;
\echo === lh under 50 by builder
select coalesce(site_score->>'builderFingerprint','custom') b, count(*) n, count(*) filter (where (site_score->>'lighthouseMobile')::int<50) under50, round(100.0*count(*) filter (where (site_score->>'lighthouseMobile')::int<50)/count(*),1) pct from leads where website_url is not null and site_score->>'lighthouseMobile' is not null group by 1 order by 2 desc;
\echo === no-website by neighborhood (top 12 by n)
select coalesce(neighborhood,'(none)') nb, count(*) n, count(*) filter (where website_url is null) no_site, round(100.0*count(*) filter (where website_url is null)/count(*),1) pct_no_site from leads group by 1 order by 2 desc limit 12;
\echo === no-website by vertical with strong reviews
select vertical, count(*) filter (where website_url is null) no_site, count(*) filter (where website_url is null and review_count>=50 and rating>=4.5) strong_no_site from leads group by 1 order by 2 desc;
\echo === copyright year detail
select nullif(site_score->>'copyrightYear','')::int y, count(*) from leads where website_url is not null and nullif(site_score->>'copyrightYear','') is not null group by 1 order by 1;
\echo === categories top 25
select category, count(*) from leads group by 1 order by 2 desc limit 25;
\echo === sample unreachable urls (verification only)
select website_url from leads where website_url is not null and (site_score->>'reachable')='false' order by random() limit 20;
\echo === settings areas
select name from settings_areas order by 1;
