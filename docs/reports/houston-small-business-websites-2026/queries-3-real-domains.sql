\echo === non-site website_url values (social / google / aggregator)
select count(*) filter (where website_url ~* 'instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee|yelp\.com|google\.com/|business\.site|hub\.biz|booksy|vagaro|square\.site|squareup\.com|nextdoor') non_site,
       count(*) filter (where website_url ~* 'instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee') social_only,
       count(*) with_url from leads where website_url is not null;
\echo === unreachable breakdown: non-site vs real domains
select (website_url ~* 'instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee|yelp\.com|google\.com/|business\.site|hub\.biz|booksy|vagaro|square\.site|squareup\.com|nextdoor') non_site, count(*) from leads where website_url is not null and (site_score->>'reachable')='false' group by 1;
\echo === unreachable real-domain sites by scheme (http vs https as listed)
select split_part(website_url,':',1) scheme, count(*) from leads where website_url is not null and (site_score->>'reachable')='false' and website_url !~* 'instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee|yelp\.com|google\.com/|business\.site|hub\.biz|booksy|vagaro|square\.site|squareup\.com|nextdoor' group by 1;
\echo === clean vs problem, NULL-safe, among reachable real-domain sites with LH + design scored
with s as (
 select (site_score->>'https')='true' as https, (site_score->>'viewportOk')='true' as viewport,
  (site_score->>'lighthouseMobile')::int as lh, (site_score->>'designQuality')::int as dq,
  nullif(site_score->>'copyrightYear','')::int as cy
 from leads where website_url is not null and (site_score->>'reachable')='true'
  and website_url !~* 'instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee|yelp\.com|google\.com/|business\.site|hub\.biz|booksy|vagaro|square\.site|squareup\.com|nextdoor')
select count(*) reachable_real,
 count(*) filter (where lh is not null) lh_scored,
 count(*) filter (where lh is not null and (not https or not viewport or lh<50 or coalesce(dq,100)<=30 or coalesce(cy,2026)<=2022)) problem_among_scored,
 count(*) filter (where lh is not null and not (not https or not viewport or lh<50 or coalesce(dq,100)<=30 or coalesce(cy,2026)<=2022)) clean_among_scored,
 count(*) filter (where lh is not null and (not https or not viewport or lh<50 or coalesce(cy,2026)<=2022)) problem_no_design,
 count(*) filter (where lh<50) lh_under50, count(*) filter (where lh<50 and (not https or not viewport or coalesce(cy,2026)<=2022)) two_plus_ish,
 count(*) filter (where not https) no_https, count(*) filter (where not viewport) no_viewport, count(*) filter (where coalesce(cy,2026)<=2022) stale_cy, count(*) filter (where coalesce(dq,100)<=30) dated_design
from s;
\echo === LH stats among reachable real-domain sites
select round(avg((site_score->>'lighthouseMobile')::int),1) avg_lh, percentile_cont(0.5) within group (order by (site_score->>'lighthouseMobile')::int) med, count(*) n,
 count(*) filter (where (site_score->>'lighthouseMobile')::int<50) under50, count(*) filter (where (site_score->>'lighthouseMobile')::int>=90) over90
from leads where website_url is not null and site_score->>'lighthouseMobile' is not null and website_url !~* 'instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee|yelp\.com|google\.com/|business\.site|hub\.biz|booksy|vagaro|square\.site|squareup\.com|nextdoor';
\echo === why LH null among reachable (count)
select count(*) filter (where site_score->>'lighthouseMobile' is null) lh_null, count(*) reachable from leads where website_url is not null and (site_score->>'reachable')='true';
\echo === settings_areas columns
select string_agg(column_name, ', ') from information_schema.columns where table_name='settings_areas';
