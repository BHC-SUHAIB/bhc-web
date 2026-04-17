export const articleCategoryLabel = (value?: string | null): string | null => {
  switch (value) {
    case 'strategy': return 'Strategy'
    case 'engineering': return 'Engineering'
    case 'seo': return 'SEO'
    case 'design': return 'Design'
    case 'hosting': return 'Hosting'
    case 'performance': return 'Performance'
    default: return null
  }
}

export const formatArticleDate = (iso?: string | null): string | null => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return null
  }
}
