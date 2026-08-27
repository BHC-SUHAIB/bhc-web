import type { MetadataRoute } from 'next'
import { getCachedAllPages, getCachedAllProjects, getCachedAllArticles } from '@/lib/payload-cache'
import { ALL_LOCAL_PAGES } from '@/lib/local-pages'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com').replace(/\/$/, '')

// Re-render at most every 10 min. Without this Next caches the route
// indefinitely — if the Payload fetch in the try block fails once during a
// deploy and the catch fallback emits a stub sitemap, Google would keep
// seeing the broken version until the next deploy. With revalidate=600 the
// next request after 10 min retries the real fetch.
export const revalidate = 600

const pageChangeFreq = (slug: string): 'daily' | 'weekly' | 'monthly' | 'yearly' => {
  if (slug === 'home') return 'weekly'
  if (slug === 'contact') return 'yearly'
  return 'monthly'
}

const pagePriority = (slug: string): number => {
  if (slug === 'home') return 1
  if (['services', 'portfolio', 'about', 'contact'].includes(slug)) return 0.8
  return 0.6
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  const now = new Date()

  try {
    // The first request after a deploy can land before Payload is warm, and a
    // failed fetch here would cache the catch-block stub for a full
    // revalidate window. Retry briefly so a cold boot yields the real sitemap.
    const fetchAll = () =>
      Promise.all([getCachedAllPages(), getCachedAllProjects(), getCachedAllArticles()])
    let docs: Awaited<ReturnType<typeof fetchAll>> | null = null
    for (let attempt = 0; attempt < 3 && !docs; attempt++) {
      try {
        docs = await fetchAll()
      } catch (err) {
        if (attempt === 2) throw err
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
      }
    }
    const [pageDocs, projectDocs, articleDocs] = docs!

    for (const doc of pageDocs as Array<{ slug?: string | null; updatedAt?: string | null; seo?: { noIndex?: boolean | null } | null }>) {
      const slug = doc.slug ?? ''
      if (!slug) continue
      // Pages marked noindex (e.g. /thanks) stay out of the sitemap.
      if (doc.seo?.noIndex) continue
      const path = slug === 'home' ? '' : slug
      entries.push({
        url: `${SITE_URL}/${path}`,
        lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
        changeFrequency: pageChangeFreq(slug),
        priority: pagePriority(slug),
      })
    }

    for (const doc of projectDocs as Array<{ slug?: string | null; updatedAt?: string | null }>) {
      if (!doc.slug) continue
      entries.push({
        url: `${SITE_URL}/portfolio/${doc.slug}`,
        lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }

    entries.push({
      url: `${SITE_URL}/portfolio`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })

    for (const doc of articleDocs as Array<{ slug?: string | null; updatedAt?: string | null; publishedAt?: string | null }>) {
      if (!doc.slug) continue
      entries.push({
        url: `${SITE_URL}/articles/${doc.slug}`,
        lastModified: doc.updatedAt ? new Date(doc.updatedAt) : (doc.publishedAt ? new Date(doc.publishedAt) : now),
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }

    entries.push({
      url: `${SITE_URL}/articles`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    })

    // Local vertical pages (Phase 6): /houston hub + 42 vertical x neighborhood pages.
    entries.push({
      url: `${SITE_URL}/houston`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
    for (const p of ALL_LOCAL_PAGES) {
      entries.push({
        url: `${SITE_URL}/houston/${p.slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }

    // Hard-coded legal / compliance routes (not Payload-backed).
    entries.push({
      url: `${SITE_URL}/sms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    })
    entries.push({
      url: `${SITE_URL}/sms-terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    })
    entries.push({
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    })
    entries.push({
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    })
  } catch {
    entries.push({
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    })
  }

  return entries
}
