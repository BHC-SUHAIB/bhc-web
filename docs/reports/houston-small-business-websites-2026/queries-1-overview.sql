\echo === tables
select string_agg(table_name, ', ') from information_schema.tables where table_schema='public';
\echo === date range + status
select min(created_at)::date, max(created_at)::date, count(*) from leads;
select status, count(*) from leads group by 1 order by 2 desc;
\echo === has website overall
select count(*) total, count(website_url) with_site, round(100.0*count(website_url)/count(*),1) pct_with_site from leads;
\echo === by vertical
select vertical, count(*) n, count(website_url) with_site, round(100.0*count(website_url)/count(*),1) pct from leads group by 1 order by 2 desc;
\echo === by neighborhood
select coalesce(neighborhood,'(none)') nb, count(*) n, count(website_url) with_site, round(100.0*count(website_url)/count(*),1) pct from leads group by 1 order by 2 desc limit 25;
\echo === site checks
select count(*) checked,
 sum(case when (site_score->>'reachable')='true' then 1 else 0 end) reachable,
 sum(case when (site_score->>'https')='true' then 1 else 0 end) https,
 sum(case when (site_score->>'viewportOk')='true' then 1 else 0 end) viewport_ok,
 count(site_score->>'lighthouseMobile') lh_scored,
 count(site_score->>'designQuality') design_scored,
 count(nullif(site_score->>'copyrightYear','')) copyright_found
from leads where website_url is not null and site_score is not null;
\echo === among reachable
select count(*) reachable,
 sum(case when (site_score->>'https')='true' then 1 else 0 end) https,
 sum(case when (site_score->>'viewportOk')='true' then 1 else 0 end) viewport_ok
from leads where website_url is not null and (site_score->>'reachable')='true';
\echo === lighthouse buckets
select case when (site_score->>'lighthouseMobile')::int < 50 then 'a_under50' when (site_score->>'lighthouseMobile')::int < 90 then 'b_50_89' else 'c_90plus' end bucket, count(*)
from leads where website_url is not null and site_score->>'lighthouseMobile' is not null group by 1 order by 1;
select round(avg((site_score->>'lighthouseMobile')::int),1) avg_lh, percentile_cont(0.5) within group (order by (site_score->>'lighthouseMobile')::int) median_lh, count(*) from leads where website_url is not null and site_score->>'lighthouseMobile' is not null;
\echo === design buckets
select case when (site_score->>'designQuality')::int <= 30 then 'a_0_30_dated' when (site_score->>'designQuality')::int <= 60 then 'b_31_60_generic' else 'c_61plus_modern' end bucket, count(*)
from leads where website_url is not null and site_score->>'designQuality' is not null group by 1 order by 1;
select round(avg((site_score->>'designQuality')::int),1) avg_dq, percentile_cont(0.5) within group (order by (site_score->>'designQuality')::int) median_dq from leads where website_url is not null and site_score->>'designQuality' is not null;
\echo === builders
select coalesce(site_score->>'builderFingerprint','custom/other') builder, count(*) from leads where website_url is not null and (site_score->>'reachable')='true' group by 1 order by 2 desc;
\echo === copyright year
select case when (site_score->>'copyrightYear')::int <= 2022 then 'a_2022_or_older' when (site_score->>'copyrightYear')::int <= 2024 then 'b_2023_2024' else 'c_2025_2026' end yr, count(*) from leads where website_url is not null and nullif(site_score->>'copyrightYear','') is not null group by 1 order by 1;
\echo === email findable
select (website_url is not null) has_site, count(*) n, count(contact_email) email_found, round(100.0*count(contact_email)/count(*),1) pct from leads group by 1;
\echo === reviews by has_site
select (website_url is not null) has_site, round(avg(rating),2) avg_rating, round(avg(review_count),0) avg_reviews, percentile_cont(0.5) within group (order by review_count) med_reviews from leads group by 1;
\echo === no-site strong businesses
select count(*) filter (where review_count >= 50 and rating >= 4.5) strong50, count(*) filter (where review_count >= 20) rev20, count(*) filter (where review_count >= 100) rev100 from leads where website_url is null;
\echo === by builder quality
select coalesce(site_score->>'builderFingerprint','custom/other') builder, count(*) n, round(avg((site_score->>'lighthouseMobile')::int),1) avg_lh, round(avg((site_score->>'designQuality')::int),1) avg_dq from leads where website_url is not null and site_score->>'lighthouseMobile' is not null group by 1 order by 2 desc;
\echo === by vertical quality
select vertical, count(*) n, round(avg((site_score->>'lighthouseMobile')::int),1) avg_lh, round(100.0*sum(case when (site_score->>'lighthouseMobile')::int<50 then 1 else 0 end)/nullif(count(site_score->>'lighthouseMobile'),0),1) pct_under50, round(avg((site_score->>'designQuality')::int),1) avg_dq, round(100.0*sum(case when (site_score->>'https')='true' then 1 else 0 end)/count(*),1) pct_https from leads where website_url is not null and (site_score->>'reachable')='true' group by 1 order by 2 desc;
\echo === fit score buckets
select case when fit_score>=80 then 'a_80plus' when fit_score>=60 then 'b_60_79' when fit_score>=40 then 'c_40_59' else 'd_under40' end b, count(*) from leads where fit_score is not null group by 1 order by 1;
\echo === zip coverage
select zip, count(*) from leads group by 1 order by 2 desc limit 20;
\echo === settings tables
select string_agg(table_name, ', ') from information_schema.tables where table_schema='public' and table_name like 'settings%';
