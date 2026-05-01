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
 * Admin edits propagate within REVALIDATE seconds; tags let us add
 * explicit invalidation (revalidateTag) later if we wire up Payload
 * afterChange hooks to purge on save.
 */
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from './payload'
import type { Article, Footer, Header, Page, Project, SiteSetting } from '@/payload-types'

const REVALIDATE = 60

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

export const getCachedAllArticles = unstable_cache(
  async (): Promise<Array<Pick<Article, 'id' | 'slug' | 'updatedAt' | 'publishedAt'>>> => {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'articles', limit: 500, depth: 0 })
    return res.docs as Array<Pick<Article, 'id' | 'slug' | 'updatedAt' | 'publishedAt'>>
  },
  ['articles:all'],
  { revalidate: REVALIDATE, tags: ['articles'] },
)
