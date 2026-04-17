import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Placeholder } from '@/components/Placeholder'
import { RichTextRenderer } from '@/blocks/render/RichTextRenderer'
import { getPayloadClient } from '@/lib/payload'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { Article, Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug: string }> }

const categoryLabel = (v?: string | null) => {
  switch (v) {
    case 'strategy': return 'Strategy'
    case 'engineering': return 'Engineering'
    case 'seo': return 'SEO'
    case 'design': return 'Design'
    case 'hosting': return 'Hosting'
    case 'performance': return 'Performance'
    default: return null
  }
}

const formatDate = (iso?: string | null) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return null
  }
}

async function loadArticle(slug: string): Promise<Article | null> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return (res.docs[0] as Article | undefined) ?? null
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const a = await loadArticle(slug)
  if (!a) return {}
  const hero = typeof a.heroImage === 'object' ? (a.heroImage as Media | null) : null
  return {
    title: a.title,
    description: a.excerpt ?? undefined,
    openGraph: hero?.url ? { images: [{ url: hero.url as string }] } : undefined,
  }
}

export default async function ArticlePage({ params }: Args) {
  const { slug } = await params
  const a = await loadArticle(slug)
  if (!a) notFound()

  const hero = typeof a.heroImage === 'object' ? (a.heroImage as Media | null) : null
  const cat = categoryLabel(a.category)
  const date = formatDate(a.publishedAt)

  const payload = await getPayloadClient()
  const moreRes = await payload.find({
    collection: 'articles',
    where: { slug: { not_equals: slug } },
    limit: 3,
    sort: '-publishedAt',
  })
  const more = moreRes.docs as Article[]

  return (
    <article className="pb-24">
      <Container size="xl" className="pt-10">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--color-fg-muted)] hover:text-[var(--color-brass)] transition-colors"
        >
          <ArrowLeft className="size-3.5" /> All articles
        </Link>
      </Container>

      <Container size="lg" className="mt-10">
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
            {cat ? <span>{cat}</span> : null}
            {date ? <span>{date}</span> : null}
            {a.readTime ? <span>{a.readTime} min read</span> : null}
          </div>
          <h1 className="font-serif font-semibold text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] tracking-[-0.03em]">
            {a.title}
          </h1>
          {a.excerpt ? (
            <p className="mt-6 text-[clamp(1.1rem,1.4vw,1.35rem)] leading-[1.5] text-[var(--color-fg-muted)] max-w-2xl">
              {a.excerpt}
            </p>
          ) : null}
          {a.author ? (
            <p className="mt-6 font-mono text-[12px] tracking-[0.1em] text-[var(--color-fg-muted)]">
              By {a.author}
            </p>
          ) : null}
        </div>
      </Container>

      <Container size="xl">
        <div className="relative aspect-[16/9] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] my-4">
          {hero?.url ? (
            <Image
              src={hero.url as string}
              alt={(hero.alt as string) ?? a.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <Placeholder seed={a.slug ?? a.title} label={a.title} sublabel={cat ?? undefined} aspect="hero" />
          )}
        </div>
      </Container>

      <Container size="md" className="mt-16">
        <div className="article-prose text-[18px] leading-[1.7]">
          <RichTextRenderer content={a.content} />
        </div>

        {a.tags && a.tags.length > 0 ? (
          <div className="mt-12 pt-8 border-t border-[var(--color-border)]">
            <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-4">Tags</h3>
            <ul className="flex flex-wrap gap-2">
              {a.tags.map((t, i) => (
                <li key={i} className="px-3 py-1 text-[12px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)]">
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>

      {more.length > 0 ? (
        <Container size="xl" className="mt-24">
          <div className="border-t border-[var(--color-border)] pt-16">
            <h2 className="font-serif font-semibold text-[28px] tracking-[-0.02em] mb-10">Keep reading</h2>
            <ul className="grid gap-6 md:grid-cols-3">
              {more.map((m) => {
                const mHero = typeof m.heroImage === 'object' ? (m.heroImage as Media | null) : null
                const mCat = categoryLabel(m.category)
                return (
                  <li key={m.id}>
                    <Link href={`/articles/${m.slug}`} className="group block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-fg-muted)] transition-colors h-full">
                      <div className="relative aspect-[16/10] bg-[var(--color-bg)] overflow-hidden">
                        {mHero?.url ? (
                          <Image src={mHero.url as string} alt={(mHero.alt as string) ?? m.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" sizes="(min-width:768px) 33vw, 100vw" />
                        ) : (
                          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.02]">
                            <Placeholder seed={m.slug ?? m.title} label={m.title} sublabel={mCat ?? undefined} aspect="wide" />
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        {mCat ? (
                          <div className="mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-fg-muted)]">{mCat}</div>
                        ) : null}
                        <h3 className="font-serif font-semibold text-[18px] leading-[1.25] group-hover:text-[var(--color-brass)] transition-colors flex items-start justify-between gap-3">
                          <span>{m.title}</span>
                          <ArrowUpRight className="size-4 shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </h3>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </Container>
      ) : null}

      <style>{`
        .article-prose > * + * { margin-top: 1.2em; }
        .article-prose p { margin: 0 0 1em; }
        .article-prose h2 { font-family: var(--font-serif); font-weight: 600; font-size: 1.65em; line-height: 1.25; letter-spacing: -0.02em; margin: 2em 0 0.6em; }
        .article-prose h3 { font-family: var(--font-serif); font-weight: 600; font-size: 1.3em; line-height: 1.3; margin: 1.7em 0 0.4em; }
        .article-prose ul, .article-prose ol { margin: 0 0 1.2em; padding-left: 1.4em; }
        .article-prose li { margin: 0.4em 0; }
        .article-prose li::marker { color: var(--color-fg-muted); }
        .article-prose a { color: var(--color-brass); text-decoration: underline; text-underline-offset: 3px; }
        .article-prose blockquote { border-left: 2px solid var(--color-brass); padding: 0.25em 0 0.25em 1.25em; font-family: var(--font-serif); font-style: italic; font-size: 1.15em; color: var(--color-fg-muted); margin: 1.5em 0; }
        .article-prose code { font-family: var(--font-mono); font-size: 0.92em; background: var(--color-surface); padding: 0.12em 0.4em; border-radius: 4px; }
      `}</style>
    </article>
  )
}
