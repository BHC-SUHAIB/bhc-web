import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com').replace(/\/$/, '')

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
    const payload = await getPayloadClient()

    const [pagesRes, projectsRes, articlesRes] = await Promise.all([
      payload.find({ collection: 'pages', limit: 200, depth: 0 }),
      payload.find({ collection: 'projects', limit: 500, depth: 0 }),
      payload.find({ collection: 'articles', limit: 500, depth: 0 }),
    ])

    for (const doc of pagesRes.docs as Array<{ slug?: string | null; updatedAt?: string | null }>) {
      const slug = doc.slug ?? ''
      if (!slug) continue
      const path = slug === 'home' ? '' : slug
      entries.push({
        url: `${SITE_URL}/${path}`,
        lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
        changeFrequency: pageChangeFreq(slug),
        priority: pagePriority(slug),
      })
    }

    for (const doc of projectsRes.docs as Array<{ slug?: string | null; updatedAt?: string | null }>) {
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

    for (const doc of articlesRes.docs as Array<{ slug?: string | null; updatedAt?: string | null; publishedAt?: string | null }>) {
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
