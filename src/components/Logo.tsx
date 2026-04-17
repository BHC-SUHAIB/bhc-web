import Image from 'next/image'

type LogoProps = {
  variant?: 'primary' | 'icon' | 'wordmark-horizontal' | 'wordmark-stacked'
  height?: number
  className?: string
}

const variantMap = {
  primary: { src: '/brand/black-hart-primary.svg', defaultHeight: 40, aspect: 1.01 },
  icon: { src: '/brand/black-hart-icon.svg', defaultHeight: 32, aspect: 1.1 },
  'wordmark-horizontal': { src: '/brand/black-hart-wordmark-horizontal.svg', defaultHeight: 44, aspect: 3 },
  'wordmark-stacked': { src: '/brand/black-hart-wordmark-stacked.svg', defaultHeight: 160, aspect: 0.83 },
} as const

export function Logo({ variant = 'primary', height, className }: LogoProps) {
  const v = variantMap[variant]
  const h = height ?? v.defaultHeight
  const w = Math.round(h * v.aspect)
  return (
    <Image
      src={v.src}
      alt="Black Hart Consulting"
      width={w}
      height={h}
      className={className}
      priority
    />
  )
}
