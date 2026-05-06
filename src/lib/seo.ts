// SEO helpers — keep canonical-URL logic in one place.
//
// Without an explicit `<link rel="canonical">` on every public page, Google
// can't tell which version of a duplicate URL to index (e.g. www vs apex,
// query-string variants). Search Console flagged us with
// "Duplicate without user-selected canonical" 2026-05-05 because of this.
//
// Usage in a page's generateMetadata:
//
//   import { canonical } from '@/lib/seo'
//   return { ...canonical(`/portfolio/${slug}`) }
//
// `metadataBase` (set in the root layout) prefixes the relative path with
// the canonical origin, so the resulting tag is the apex-domain absolute URL.
import type { Metadata } from 'next'

export function canonical(path: string): Pick<Metadata, 'alternates'> {
  // Always lead with `/`, never `//`. Strip trailing slash except on root.
  const normalized = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`
  return { alternates: { canonical: normalized } }
}
