/* Minimal lexical-rich-text renderer. Handles paragraphs, headings, lists, bold, italic, links.
   Good enough for CMS-authored prose; extend as needed. */
import Link from 'next/link'

type LexNode = {
  type: string
  tag?: string
  text?: string
  format?: number | string
  url?: string
  newTab?: boolean
  listType?: 'bullet' | 'number'
  children?: LexNode[]
  fields?: { url?: string; newTab?: boolean; doc?: unknown }
}

const renderText = (n: LexNode, i: number) => {
  const fmt = typeof n.format === 'number' ? n.format : 0
  let el: React.ReactNode = n.text
  if (fmt & 1) el = <strong>{el}</strong>     // bold
  if (fmt & 2) el = <em>{el}</em>             // italic
  if (fmt & 8) el = <u>{el}</u>               // underline
  if (fmt & 16) el = <code className="font-mono text-[0.92em] bg-[var(--color-surface)] px-1.5 py-0.5 rounded">{el}</code>
  if (fmt & 32) el = <s>{el}</s>              // strikethrough
  return <span key={i}>{el}</span>
}

const renderNode = (n: LexNode, i: number): React.ReactNode => {
  const kids = n.children?.map((c, j) => renderNode(c, j))

  switch (n.type) {
    case 'paragraph':
      return <p key={i}>{kids}</p>
    case 'heading': {
      const Tag = (n.tag || 'h2') as keyof React.JSX.IntrinsicElements
      return <Tag key={i}>{kids}</Tag>
    }
    case 'list': {
      const Tag = n.listType === 'number' ? 'ol' : 'ul'
      return <Tag key={i}>{kids}</Tag>
    }
    case 'listitem':
      return <li key={i}>{kids}</li>
    case 'quote':
      return <blockquote key={i}>{kids}</blockquote>
    case 'text':
      return renderText(n, i)
    case 'link':
    case 'autolink': {
      const href = n.fields?.url ?? n.url ?? '#'
      const target = n.fields?.newTab || n.newTab ? '_blank' : undefined
      return (
        <Link key={i} href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
          {kids}
        </Link>
      )
    }
    case 'linebreak':
      return <br key={i} />
    case 'root':
      return kids
    default:
      return kids
  }
}

export function RichTextRenderer({ content }: { content: unknown }) {
  if (!content || typeof content !== 'object') return null
  const c = content as { root?: LexNode }
  if (!c.root) return null
  return <>{renderNode(c.root, 0)}</>
}
