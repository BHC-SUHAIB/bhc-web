import { Container } from '@/components/Container'
import { RichTextRenderer } from './RichTextRenderer'
import { cn } from '@/lib/utils'
import type { RichTextBlock } from '@/payload-types'

export function RichText(b: RichTextBlock) {
  const size = b.maxWidth ?? 'prose'
  return (
    <section className="py-16 sm:py-20">
      <Container size={size === 'wide' ? 'xl' : size === 'medium' ? 'md' : 'sm'}>
        <div className={cn(
          'prose-content text-[17px] leading-[1.6]',
          size === 'prose' && 'max-w-[68ch] mx-auto',
        )}>
          <style>{`
            .prose-content p { margin: 0 0 1.1em; }
            .prose-content h2 { font-family: var(--font-serif); font-weight: 600; font-size: 1.8em; margin: 2em 0 0.5em; letter-spacing: -0.02em; }
            .prose-content h3 { font-weight: 600; font-size: 1.3em; margin: 1.8em 0 0.4em; letter-spacing: -0.015em; }
            .prose-content ul, .prose-content ol { margin: 0 0 1.2em; padding-left: 1.5em; }
            .prose-content li { margin: 0.3em 0; }
            .prose-content blockquote { margin: 1.5em 0; padding-left: 1.2em; border-left: 3px solid var(--color-brass); font-family: var(--font-serif); font-style: italic; color: var(--color-fg-muted); }
            .prose-content a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 3px; }
            .prose-content a:hover { color: var(--color-brass); }
          `}</style>
          <RichTextRenderer content={b.content} />
        </div>
      </Container>
    </section>
  )
}
