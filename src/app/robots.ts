import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private, token-gated client ops tools. These already emit per-page
      // noindex and are absent from the sitemap; listing them here makes the
      // boundary explicit so the billing subsystem stays off the public site.
      disallow: ['/admin', '/api/', '/p/', '/app-content/', '/privacy/misbahapp', '/support/misbahapp', '/misbah/', '/invoice/', '/portal/', '/care-plan/'],
    },
    sitemap: `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`,
  }
}
