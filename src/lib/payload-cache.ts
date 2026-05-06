/**
 * Cached Payload query helpers.
 *
 * Pages in (frontend) stay `dynamic = 'force-dynamic'` so Docker builds
 * don't try to prerender them (Payload init needs runtime-only env vars).
 * But we still want the DB reads themselves to be cached — there's no
 * reason to re-query Postgres for the same page on every visit.
 *
 * `unstable_cache` sits at the data layer: each wrapped function keeps
 * its result in Next.js's data cache for REVALIDATE seconds, keyed by
 * the function's keyParts + its runtime args. Cache hits skip Payload
 * entirely. Cache misses run the real query and store the result.
 *
 * Admin edits propagate immediately via Payload afterChange hooks that
 * call revalidateTag — see src/lib/cms-revalidate.ts and the hooks on
 * each content collection. The time-based REVALIDATE below is just a
 * backstop for edge cases where a hook can't fire (out-of-band psql
 * edits, seed scripts, migration runs).
 */
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from './payload'
import type { Article, Faq, Footer, Header, LandingPage, Page, Project, SiteSetting, Testimonial } from '@/payload-types'

// 1 hour. Was 60s before 2026-05-06 — at that TTL roughly 1-in-60
// visitors paid the full Payload round-trip on hot pages. Bumped to
// 3600s once afterChange hooks were added so admin edits no longer
// have to wait for the time-based window to expire.
const REVALIDATE = 3600

// --- Globals ----------------------------------------------------------

export const getCachedHeader = unstable_cache(
  async (): Promise<Header | null> => {
    const payload = await getPayloadClient()
    return (await payload.findGlobal({ slug: 'header' }).catch(() => null)) as Header | null
  },
  ['global:header'],
  { revalidate: REVALIDATE, tags: ['globals', 'global:header'] },
)

export const getCachedFooter = unstable_cache(
  async (): Promise<Footer | null> => {
    const payload = await getPayloadClient()
    return (await payload.findGlobal({ slug: 'footer' }).catch(() => null)) as Footer | null
  },
  ['global:footer'],
  { revalidate: REVALIDATE, tags: ['globals', 'global:footer'] },
)

export const getCachedSiteSettings = unstable_cache(
  async (): Promise<SiteSetting | null> => {
    const payload = await getPayloadClient()
    return (await payload.findGlobal({ slug: 'siteSettings' }).catch(() => null)) as SiteSetting | null
  },
  ['global:siteSettings'],
  { revalidate: REVALIDATE, tags: ['globals', 'global:siteSettings'] },
)

// --- Pages ------------------------------------------------------------

export const getCachedPageBySlug = unstable_cache(
  async (slug: string): Promise<Page | null> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return (res.docs[0] as Page | undefined) ?? null
  },
  ['pages:by-slug'],
  { revalidate: REVALIDATE, tags: ['pages'] },
)

export const getCachedAllPages = unstable_cache(
  async (): Promise<Array<Pick<Page, 'id' | 'slug' | 'updatedAt'>>> => {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'pages', limit: 200, depth: 0 })
    return res.docs as Array<Pick<Page, 'id' | 'slug' | 'updatedAt'>>
  },
  ['pages:all'],
  { revalidate: REVALIDATE, tags: ['pages'] },
)

// --- Landing pages (paid-traffic, no-nav, noindex by default) -------

export const getCachedLandingPageBySlug = unstable_cache(
  async (slug: string): Promise<LandingPage | null> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'landingPages',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return (res.docs[0] as LandingPage | undefined) ?? null
  },
  ['landingPages:by-slug'],
  { revalidate: REVALIDATE, tags: ['landingPages'] },
)

export const getCachedAllLandingPages = unstable_cache(
  async (): Promise<Array<Pick<LandingPage, 'id' | 'slug' | 'updatedAt'>>> => {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'landingPages', limit: 200, depth: 0 })
    return res.docs as Array<Pick<LandingPage, 'id' | 'slug' | 'updatedAt'>>
  },
  ['landingPages:all'],
  { revalidate: REVALIDATE, tags: ['landingPages'] },
)

// --- Projects ---------------------------------------------------------

export const getCachedProjectsList = unstable_cache(
  async (): Promise<Project[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'projects',
      limit: 100,
      sort: '-publishedAt',
    })
    return res.docs as Project[]
  },
  ['projects:list'],
  { revalidate: REVALIDATE, tags: ['projects'] },
)

export const getCachedFeaturedProjects = unstable_cache(
  async (limit: number): Promise<Project[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'projects',
      where: { featured: { equals: true } },
      limit,
      sort: '-publishedAt',
    })
    return res.docs as Project[]
  },
  ['projects:featured'],
  { revalidate: REVALIDATE, tags: ['projects'] },
)

export const getCachedProjectBySlug = unstable_cache(
  async (slug: string): Promise<Project | null> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'projects',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return (res.docs[0] as Project | undefined) ?? null
  },
  ['projects:by-slug'],
  { revalidate: REVALIDATE, tags: ['projects'] },
)

export const getCachedAllProjects = unstable_cache(
  async (): Promise<Array<Pick<Project, 'id' | 'slug' | 'updatedAt'>>> => {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'projects', limit: 500, depth: 0 })
    return res.docs as Array<Pick<Project, 'id' | 'slug' | 'updatedAt'>>
  },
  ['projects:all'],
  { revalidate: REVALIDATE, tags: ['projects'] },
)

// --- Articles ---------------------------------------------------------

export const getCachedArticlesList = unstable_cache(
  async (): Promise<Article[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'articles',
      limit: 100,
      sort: '-publishedAt',
    })
    return res.docs as Article[]
  },
  ['articles:list'],
  { revalidate: REVALIDATE, tags: ['articles'] },
)

export const getCachedArticleBySlug = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'articles',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return (res.docs[0] as Article | undefined) ?? null
  },
  ['articles:by-slug'],
  { revalidate: REVALIDATE, tags: ['articles'] },
)

export const getCachedArticlesExceptSlug = unstable_cache(
  async (slug: string, limit: number): Promise<Article[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'articles',
      where: { slug: { not_equals: slug } },
      limit,
      sort: '-publishedAt',
    })
    return res.docs as Article[]
  },
  ['articles:except-slug'],
  { revalidate: REVALIDATE, tags: ['articles'] },
)

// --- Testimonials -----------------------------------------------------

export const getCachedFeaturedTestimonials = unstable_cache(
  async (limit: number): Promise<Testimonial[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'testimonials',
      where: { featured: { equals: true } },
      limit,
      sort: ['sortOrder', '-updatedAt'],
    })
    return res.docs as Testimonial[]
  },
  ['testimonials:featured'],
  { revalidate: REVALIDATE, tags: ['testimonials'] },
)

// --- FAQs ------------------------------------------------------------
//
// Fetch all featured FAQs once per cache window. Block render filters by
// category client-side from this set instead of having one cached query
// per (category, limit) tuple — keeps the cache surface small and lets
// every FAQ block on the site share a single backing query.

export const getCachedFeaturedFaqs = unstable_cache(
  async (): Promise<Faq[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'faqs',
      where: { featured: { equals: true } },
      limit: 200,
      sort: ['sortOrder', '-updatedAt'],
    })
    return res.docs as Faq[]
  },
  ['faqs:featured'],
  { revalidate: REVALIDATE, tags: ['faqs'] },
)

export const getCachedAllArticles = unstable_cache(
  async (): Promise<Array<Pick<Article, 'id' | 'slug' | 'updatedAt' | 'publishedAt'>>> => {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'articles', limit: 500, depth: 0 })
    return res.docs as Array<Pick<Article, 'id' | 'slug' | 'updatedAt' | 'publishedAt'>>
  },
  ['articles:all'],
  { revalidate: REVALIDATE, tags: ['articles'] },
)
