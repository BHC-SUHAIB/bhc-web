// Centralized JSON-LD builders. NAP, geo, and social profiles come from
// SiteSettings so the site has one source of truth and Google sees consistent
// NAP on every page. areaServed is the Houston metro (never "Worldwide") per
// the local-SEO + Google Business Profile strategy.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://blackhartconsulting.com').replace(/\/$/, '')

// Stable @id so other entities (CreativeWork, breadcrumbs) can reference the
// one business node instead of redeclaring it.
export const BUSINESS_ID = `${SITE_URL}/#business`

// Curated served area: Houston plus the Heights and inner-loop neighborhoods.
// Chosen for Local Pack relevance over a broad metro net (decision 2026-06-25).
// Editing this list is the one place to widen/narrow the named service area.
export const HOUSTON_AREA_SERVED: Array<Record<string, unknown>> = [
  { '@type': 'City', name: 'Houston', sameAs: 'https://en.wikipedia.org/wiki/Houston' },
  { '@type': 'Place', name: 'The Heights, Houston' },
  { '@type': 'Place', name: 'Greater Heights' },
  { '@type': 'Place', name: 'Montrose, Houston' },
  { '@type': 'Place', name: 'Garden Oaks, Houston' },
  { '@type': 'Place', name: 'Oak Forest, Houston' },
  { '@type': 'Place', name: 'Rice Military, Houston' },
]

// Loose structural types so these builders never depend on generated
// payload-types (which is gitignored and may be absent locally).
type LocalSeo = {
  streetAddress?: string | null
  addressLocality?: string | null
  addressRegion?: string | null
  postalCode?: string | null
  addressCountry?: string | null
  latitude?: number | null
  longitude?: number | null
  serviceRadiusMiles?: number | null
  openingHours?: string | null
  sameAs?: Array<{ url?: string | null } | null> | null
}

type SettingsLike = {
  siteName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  localSeo?: LocalSeo | null
} | null | undefined

function telE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

// Houston Heights centroid. Used so geo + GeoCircle render even before anyone
// fills the SiteSettings fields; override per-site in admin. This is a public
// neighborhood centroid, not a home address.
const DEFAULT_LAT = 29.7989
const DEFAULT_LNG = -95.3989
const DEFAULT_HOURS = 'Mo-Fr 09:00-18:00'

function resolveCoords(seo: LocalSeo): { latitude: number; longitude: number } {
  return {
    latitude: typeof seo.latitude === 'number' ? seo.latitude : DEFAULT_LAT,
    longitude: typeof seo.longitude === 'number' ? seo.longitude : DEFAULT_LNG,
  }
}

function buildPostalAddress(seo: LocalSeo): Record<string, unknown> {
  const addr: Record<string, unknown> = { '@type': 'PostalAddress' }
  if (seo.streetAddress) addr.streetAddress = seo.streetAddress
  addr.addressLocality = seo.addressLocality || 'Houston'
  addr.addressRegion = seo.addressRegion || 'TX'
  if (seo.postalCode) addr.postalCode = seo.postalCode
  addr.addressCountry = seo.addressCountry || 'US'
  return addr
}

function buildAreaServed(seo: LocalSeo): Array<Record<string, unknown>> {
  return [
    ...HOUSTON_AREA_SERVED,
    {
      '@type': 'GeoCircle',
      geoMidpoint: { '@type': 'GeoCoordinates', ...resolveCoords(seo) },
      geoRadius: Math.round((seo.serviceRadiusMiles || 25) * 1609.34),
    },
  ]
}

// ProfessionalService is the specific LocalBusiness subtype that fits a web
// design / SEO studio. Injected sitewide from the frontend layout.
export function buildLocalBusinessJsonLd(settings?: SettingsLike): Record<string, unknown> {
  const seo: LocalSeo = settings?.localSeo ?? {}
  const phone = settings?.contactPhone || '(866) 434-9777'
  const sameAs = (seo.sameAs ?? [])
    .map((s) => s?.url)
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': BUSINESS_ID,
    name: settings?.siteName || 'Black Hart Consulting',
    description:
      'Custom websites, SEO, app design, and managed hosting from a Houston Heights digital studio that ships its own products.',
    url: SITE_URL,
    telephone: telE164(phone),
    email: settings?.contactEmail || 'hello@blackhartconsulting.com',
    address: buildPostalAddress(seo),
    areaServed: buildAreaServed(seo),
    priceRange: '$$',
  }
  ld.geo = { '@type': 'GeoCoordinates', ...resolveCoords(seo) }
  ld.openingHours = seo.openingHours || DEFAULT_HOURS
  if (sameAs.length) ld.sameAs = sameAs
  return ld
}

// BreadcrumbList for inner pages. Pass crumbs in order from Home to the
// current page; absolute URLs are derived from the site URL.
export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path.startsWith('/') ? it.path : `/${it.path}`}`,
    })),
  }
}

// Per-project CreativeWork for portfolio detail pages, credited to the studio.
export function buildCreativeWorkJsonLd(project: {
  title?: string | null
  slug?: string | null
  challenge?: string | null
  excerpt?: string | null
}): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title || 'Project',
    url: `${SITE_URL}/portfolio/${project.slug ?? ''}`,
    creator: { '@type': 'ProfessionalService', '@id': BUSINESS_ID, name: 'Black Hart Consulting' },
  }
  const desc = project.excerpt || project.challenge
  if (desc) ld.abstract = desc
  return ld
}
