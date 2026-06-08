import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Placeholder } from '@/components/Placeholder'
import { getCachedArticlesList } from '@/lib/payload-cache'
import { articleCategoryLabel, formatArticleDate } from '@/lib/articles'
import { canonical } from '@/lib/seo'
import type { Article, Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Field notes and essays from Black Hart Consulting — strategy, engineering, SEO, and design.',
  ...canonical('/articles'),
}

// Right-arrow glyph for the "Read" link, matching the inline SVG in
// bhc-redesign/Articles.html.
function ReadArrow({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={size} height={size} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export default async function ArticlesPage() {
  const articles = await getCachedArticlesList()
  const featured = articles.find((a) => a.featured) ?? articles[0]
  const rest = articles.filter((a) => a.id !== featured?.id)

  return (
    <div className="lp-pad-bottom">
      {/* Full-bleed photo hero — Warm Mono `.hero-photo`. Gradient overlay is
          baked into the CSS, so legibility is handled without inline styles. */}
      <section className="hero-photo" aria-label="Articles intro">
        <div className="hp-bg">
          <Image
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            fetchPriority="high"
          />
        </div>
        <Container size="xl" className="hp-inner">
          <span className="eyebrow eyebrow-row">
            <span className="rule" />
            Articles
          </span>
          <h1>
            Field notes <em>for owners.</em>
          </h1>
          <p className="lede">
            Essays, deep dives, and the reasoning behind our engagements — written for the
            people who&apos;ll actually be hiring a studio like ours.
          </p>
        </Container>
      </section>

      <section className="section-tight">
        <Container size="xl">
          {articles.length === 0 ? (
            <p className="text-[var(--color-fg-muted)]">No articles published yet.</p>
          ) : (
            <>
              {featured ? <FeaturedCard a={featured} /> : null}
              {rest.length > 0 ? (
                <div className="art-grid">
                  {rest.map((a) => (
                    <ArticleCard key={a.id} a={a} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </Container>
      </section>
    </div>
  )
}

function FeaturedCard({ a }: { a: Article }) {
  const hero = typeof a.heroImage === 'object' ? (a.heroImage as Media | null) : null
  const cat = articleCategoryLabel(a.category)
  const date = formatArticleDate(a.publishedAt)
  return (
    <Link href={`/articles/${a.slug}`} className="art-feature">
      <div className="shot relative">
        {hero?.url ? (
          <Image
            src={hero.url as string}
            alt={(hero.alt as string) ?? a.title}
            fill
            sizes="(min-width:768px) 55vw, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <Placeholder seed={a.slug ?? a.title} label={a.title} sublabel={cat ?? undefined} aspect="wide" />
        )}
      </div>
      <div className="body">
        {/* `.k` is scoped to `.art .body .k`; the featured card (`.art-feature`)
            reproduces that mono kicker styling inline. */}
        <span
          className="k"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-brass-text)' }}
        >
          Featured{cat ? ` · ${cat}` : ''}
        </span>
        <h3>{a.title}</h3>
        {a.excerpt ? (
          <p className="text-[var(--color-fg-muted)]" style={{ marginTop: '0.7rem', lineHeight: 1.6 }}>{a.excerpt}</p>
        ) : null}
        {date || a.author || a.readTime ? (
          <span className="font-mono text-[0.7rem] text-[var(--color-fg-muted)]" style={{ marginTop: '1rem' }}>
            {[a.author, date, a.readTime ? `${a.readTime} min read` : null].filter(Boolean).join(' · ')}
          </span>
        ) : null}
        {/* `.read` is scoped to `.art .body .read` in components.css, so the
            featured card (`.art-feature`) styles it inline to match. */}
        <span
          className="read"
          style={{ marginTop: '1.2rem', color: 'var(--color-accent)', fontWeight: 600, display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}
        >
          Read the guide <ReadArrow size={15} />
        </span>
      </div>
    </Link>
  )
}

function ArticleCard({ a }: { a: Article }) {
  const hero = typeof a.heroImage === 'object' ? (a.heroImage as Media | null) : null
  const cat = articleCategoryLabel(a.category)
  const date = formatArticleDate(a.publishedAt)
  return (
    <Link href={`/articles/${a.slug}`} className="art">
      <div className="shot relative">
        {hero?.url ? (
          <Image
            src={hero.url as string}
            alt={(hero.alt as string) ?? a.title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <Placeholder seed={a.slug ?? a.title} label={a.title} sublabel={cat ?? undefined} aspect="wide" />
        )}
      </div>
      <div className="body">
        <span className="k">{cat ?? 'Article'}</span>
        <h3>{a.title}</h3>
        {a.excerpt ? <p>{a.excerpt}</p> : null}
        {date || a.readTime ? (
          <span className="font-mono text-[0.66rem] text-[var(--color-fg-muted)]" style={{ marginTop: '0.7rem' }}>
            {[date, a.readTime ? `${a.readTime} min` : null].filter(Boolean).join(' · ')}
          </span>
        ) : null}
        <span className="read">
          Read <ReadArrow />
        </span>
      </div>
    </Link>
  )
}
