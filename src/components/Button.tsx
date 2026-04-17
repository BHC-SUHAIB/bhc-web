import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const button = cva(
  'inline-flex items-center justify-center gap-2 font-medium tracking-[0.02em] rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)] disabled:opacity-40 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-fg)] text-[var(--color-bg)] hover:bg-[var(--color-forest)] hover:text-[var(--color-ivory)]',
        secondary: 'border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-fg)]',
        ghost: 'text-[var(--color-fg)] hover:text-[var(--color-brass)]',
        brass: 'bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-forest)] hover:text-[var(--color-ivory)]',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-[15px]',
        lg: 'h-13 px-7 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { href?: string; openInNewTab?: boolean }

export function Button({ className, variant, size, href, openInNewTab, children, ...props }: ButtonProps) {
  if (href) {
    const isExternal = /^https?:\/\//.test(href)
    const target = openInNewTab || isExternal ? '_blank' : undefined
    const rel = target === '_blank' ? 'noopener noreferrer' : undefined
    return (
      <Link href={href} target={target} rel={rel} className={cn(button({ variant, size }), className)}>
        {children}
      </Link>
    )
  }
  return (
    <button className={cn(button({ variant, size }), className)} {...props}>
      {children}
    </button>
  )
}
