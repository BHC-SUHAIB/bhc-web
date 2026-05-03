import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Placeholder } from '@/components/Placeholder'
import { getCachedArticlesList } from '@/lib/payload-cache'
import { articleCategoryLabel, formatArticleDate } from '@/lib/articles'
import { ArrowUpRight } from 'lucide-react'
import type { Article, Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Field notes and essays from Black Hart Consulting — strategy, engineering, SEO, and design.',
}

export default async function ArticlesPage() {
  const articles = await getCachedArticlesList()
  const featured = articles.find((a) => a.featured) ?? articles[0]
  const rest = articles.filter((a) => a.id !== featured?.id)

  return (
    <div className="pb-20">
      {/* Faint hero background — open notebook photo with a MEDIUM gradient
          (lighter than the conversion-page heroes) since this is a blog index,
          not a paid-traffic landing page; the visitor is already past the
          "convince me" stage and heavy gloom would feel oppressive. */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <Image
            src="https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1920&q=80"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.35)_40%,rgba(0,0,0,0.78)_100%)]"
          aria-hidden
        />
        <Container size="xl">
          <div className="py-24 sm:py-32 md:py-40 max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/85 mb-5 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
              Articles
            </p>
            <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]">
              Field notes.
            </h1>
            <p className="mt-6 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.55] text-white max-w-2xl [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
              Essays, deep dives, and the reasoning behind our engagements — written for the
              people who&apos;ll actually be hiring a studio like ours.
            </p>
          </div>
        </Container>
      </section>

      <Container size="xl" className="py-12 sm:py-16">
        {articles.length === 0 ? (
          <p className="text-[var(--color-fg-muted)]">No articles published yet.</p>
        ) : (
          <>
            {featured ? <FeaturedCard a={featured} /> : null}
            {rest.length > 0 ? (
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-10">
                {rest.map((a) => <ArticleCard key={a.id} a={a} />)}
              </ul>
            ) : null}
          </>
        )}
      </Container>
    </div>
  )
}

function FeaturedCard({ a }: { a: Article }) {
  const hero = typeof a.heroImage === 'object' ? (a.heroImage as Media | null) : null
  const cat = articleCategoryLabel(a.category)
  const date = formatArticleDate(a.publishedAt)
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-fg-muted)] transition-colors"
    >
      <div className="grid md:grid-cols-[1.2fr_1fr]">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px] bg-[var(--color-bg)] overflow-hidden">
          {hero?.url ? (
            <Image
              src={hero.url as string}
              alt={(hero.alt as string) ?? a.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(min-width:768px) 55vw, 100vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.02]">
              <Placeholder seed={a.slug ?? a.title} label={a.title} sublabel={cat ?? undefined} aspect="wide" />
            </div>
          )}
        </div>
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)]">
            <span className="inline-flex items-center rounded-full border border-[var(--color-border)] px-2 py-1 text-[9px] tracking-[0.18em] text-[var(--color-brass)]">Featured</span>
            {cat ? <span>{cat}</span> : null}
            {date ? <span>&middot;</span> : null}
            {date ? <span>{date}</span> : null}
          </div>
          <h2 className="font-serif font-semibold text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.1] tracking-[-0.02em] mb-3 group-hover:text-[var(--color-brass)] transition-colors flex items-start justify-between gap-4">
            <span>{a.title}</span>
            <ArrowUpRight className="size-5 shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
          </h2>
          {a.excerpt ? (
            <p className="text-[15px] leading-[1.55] text-[var(--color-fg-muted)]">{a.excerpt}</p>
          ) : null}
          <div className="mt-5 flex items-center gap-3 font-mono text-[11px] text-[var(--color-fg-muted)]">
            {a.author ? <span>{a.author}</span> : null}
            {a.readTime ? <span>&middot;</span> : null}
            {a.readTime ? <span>{a.readTime} min read</span> : null}
          </div>
        </div>
      </div>
    </Link>
  )
}

function ArticleCard({ a }: { a: Article }) {
  const hero = typeof a.heroImage === 'object' ? (a.heroImage as Media | null) : null
  const cat = articleCategoryLabel(a.category)
  const date = formatArticleDate(a.publishedAt)
  return (
    <li>
      <Link
        href={`/articles/${a.slug}`}
        className="group block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-fg-muted)] transition-colors h-full"
      >
        <div className="relative aspect-[16/10] bg-[var(--color-bg)] overflow-hidden">
          {hero?.url ? (
            <Image
              src={hero.url as string}
              alt={(hero.alt as string) ?? a.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
            />
          ) : (
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.02]">
              <Placeholder seed={a.slug ?? a.title} label={a.title} sublabel={cat ?? undefined} aspect="wide" />
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-fg-muted)]">
            {cat ? <span>{cat}</span> : null}
            {date ? <span>&middot;</span> : null}
            {date ? <span>{date}</span> : null}
          </div>
          <h3 className="font-serif font-semibold text-[19px] leading-[1.2] mb-2 group-hover:text-[var(--color-brass)] transition-colors flex items-start justify-between gap-3">
            <span>{a.title}</span>
            <ArrowUpRight className="size-4 shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
          </h3>
          {a.excerpt ? (
            <p className="text-[13.5px] leading-[1.55] text-[var(--color-fg-muted)] line-clamp-3">{a.excerpt}</p>
          ) : null}
          <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-[var(--color-fg-muted)]">
            {a.author ? <span>{a.author}</span> : null}
            {a.readTime ? <span>&middot;</span> : null}
            {a.readTime ? <span>{a.readTime} min</span> : null}
          </div>
        </div>
      </Link>
    </li>
  )
}
