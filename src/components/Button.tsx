import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/* Buttons use the global semantic tokens --color-fg / --color-bg / --color-surface / --color-brass,
   so they automatically read correctly in both light and dark mode. Every variant below has been
   contrast-checked for WCAG AA in both themes. Warm Mono redesign (2026-06): pill radius, soft
   hover lift, matched 1:1 to the ported .btn-* classes used inside the redesigned blocks. */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold no-underline',
    'tracking-[0.01em] rounded-full select-none',
    'transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
    'active:translate-y-[1px]',
    'disabled:opacity-40 disabled:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /* Primary — strong filled. Background = foreground token (dark in light mode, ivory in dark mode).
           Hover lifts to brass, our accent. */
        primary: [
          'bg-[var(--color-fg)] text-[var(--color-bg)]',
          'hover:bg-[var(--color-brass)] hover:text-[var(--color-ink)]',
        ].join(' '),

        /* Secondary — outlined, clear border, fills on hover. */
        secondary: [
          'bg-transparent text-[var(--color-fg)]',
          'border border-[var(--color-border-strong)]',
          'hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] hover:border-[var(--color-fg)]',
        ].join(' '),

        /* Ghost — no background, subtle surface on hover. Safe on any background. */
        ghost: [
          'bg-transparent text-[var(--color-fg)]',
          'hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-fg)]',
        ].join(' '),

        /* On-photo ghost / outlined — for use against dark photo overlays
           (heroes with backgroundImageUrl). Always white-on-translucent so
           they read regardless of photo content. */
        onPhotoGhost: [
          'bg-white/10 text-white border border-white/35 backdrop-blur-sm',
          'hover:bg-white hover:text-[var(--color-ink)] hover:border-white',
        ].join(' '),
        onPhotoSecondary: [
          'bg-transparent text-white border border-white/60',
          'hover:bg-white hover:text-[var(--color-ink)] hover:border-white',
        ].join(' '),

        /* Brass — warm accent / lead-magnet button. Ink text on brass for max contrast;
           deepens + glows on hover. This is the primary conversion CTA color. */
        brass: [
          'bg-[var(--color-brass)] text-[var(--color-ink)] shadow-[0_1px_0_rgba(0,0,0,0.04)]',
          'hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)]',
        ].join(' '),
      },
      size: {
        sm: 'h-10 px-4 text-[13px]',
        md: 'h-12 px-5 text-[14.5px]',
        lg: 'h-14 px-7 text-[15.5px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { href?: string; openInNewTab?: boolean }

export function Button({ className, variant, size, href, openInNewTab, children, onClick, ...props }: ButtonProps) {
  if (href) {
    const isExternal = /^https?:\/\//.test(href)
    // Calendly is a special case: redirect-back to /lp/.../booked only works
    // when the booking happens in the SAME tab as the originating page.
    // Force same-tab navigation for any Calendly URL even though it's
    // technically external. Same applies if openInNewTab is explicitly false.
    const isCalendly = /calendly\.com/i.test(href)
    const target =
      openInNewTab === false || isCalendly
        ? undefined
        : openInNewTab || isExternal
          ? '_blank'
          : undefined
    const rel = target === '_blank' ? 'noopener noreferrer' : undefined
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={cn(button({ variant, size }), className)}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement> | undefined}
      >
        {children}
      </Link>
    )
  }
  return (
    <button className={cn(button({ variant, size }), className)} onClick={onClick} {...props}>
      {children}
    </button>
  )
}
