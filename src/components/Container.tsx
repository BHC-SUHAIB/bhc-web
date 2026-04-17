import { cn } from '@/lib/utils'

type ContainerProps = {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  as?: React.ElementType
}

const sizes = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
} as const

export function Container({ children, className, size = 'lg', as: As = 'div' }: ContainerProps) {
  return (
    <As className={cn('mx-auto w-full px-6 sm:px-8', sizes[size], className)}>{children}</As>
  )
}
