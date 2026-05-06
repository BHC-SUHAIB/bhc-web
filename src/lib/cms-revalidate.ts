/**
 * CMS revalidation helpers.
 *
 * The data layer (src/lib/payload-cache.ts) wraps every Payload query in
 * unstable_cache with a 1-hour TTL and a tag like 'pages' or 'projects'.
 * This file's helpers are called from Payload `afterChange` / `afterDelete`
 * hooks to invalidate those tags the moment an editor saves a change, so
 * fresh data shows up on the public site within milliseconds rather than
 * after the TTL window.
 *
 * Without this, the trade-off would be: long TTL = stale content after
 * edits, short TTL = re-query on every request. The hooks let us have
 * both: aggressive caching plus instant propagation on save.
 */
import { revalidateTag, revalidatePath } from 'next/cache'

// Tags must match the ones used in src/lib/payload-cache.ts's
// `unstable_cache(..., { tags: [...] })` calls. If you add a new
// cached query there, add the tag here too — and consider whether
// any collection's hook should invalidate it.
export const TAGS = {
  pages: 'pages',
  landingPages: 'landingPages',
  projects: 'projects',
  articles: 'articles',
  testimonials: 'testimonials',
  faqs: 'faqs',
  globals: 'globals',
  globalHeader: 'global:header',
  globalFooter: 'global:footer',
  globalSiteSettings: 'global:siteSettings',
} as const

/**
 * Invalidate the data caches for a content type. Safe to call from
 * Payload hooks; revalidateTag itself is idempotent and cheap.
 *
 * The `paths` array is for routes whose URL doesn't follow the slug
 * (e.g. /portfolio is the index, /portfolio/[slug] is the detail —
 * both should refresh when a Project changes).
 */
export function revalidateContent(opts: {
  tag: keyof typeof TAGS
  paths?: string[]
  slug?: string | null
  slugPathPrefix?: string
}) {
  const { tag, paths = [], slug, slugPathPrefix } = opts

  try {
    // Next 16 requires a CacheLifeConfig (second arg). `expire: 0` =
    // immediate revalidation: the next request after this call gets
    // fresh data, no stale-while-revalidate window. Without it, the
    // tag would only be revalidated on the next time-based interval
    // — exactly what we're trying to avoid.
    revalidateTag(TAGS[tag], { expire: 0 })
  } catch (e) {
    // Two known harmless failure modes:
    //   1. Called during render context (e.g. seed run inside the first
    //      request after container boot) — Next 16 disallows it but the
    //      net effect is fine: the data we just wrote is already what
    //      the cache will return on the next read.
    //   2. Called outside any request context (migration scripts, scheduled
    //      jobs that import collection hooks) — same harmless skip.
    // Don't crash the hook; only log when it's NOT one of the expected
    // cases so real failures still surface.
    const msg = e instanceof Error ? e.message : String(e)
    const isRenderContext = msg.includes('during render which is unsupported')
    const isMissingStore = msg.includes('static generation store missing')
    if (!isRenderContext && !isMissingStore) {
      console.warn(`[cms-revalidate] revalidateTag('${TAGS[tag]}') failed:`, e)
    }
  }

  const safeRevalidatePath = (path: string) => {
    try {
      revalidatePath(path)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isRenderContext = msg.includes('during render which is unsupported')
      const isMissingStore = msg.includes('static generation store missing')
      if (!isRenderContext && !isMissingStore) {
        console.warn(`[cms-revalidate] revalidatePath('${path}') failed:`, e)
      }
    }
  }

  for (const path of paths) safeRevalidatePath(path)

  if (slug && slugPathPrefix) safeRevalidatePath(`${slugPathPrefix}/${slug}`)
}
