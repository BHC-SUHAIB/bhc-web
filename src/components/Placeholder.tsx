/* Placeholder image using Picsum (https://picsum.photos).
   - Real editorial photos, seeded by slug so each project gets a consistent image
   - Brand-toned overlay (forest or ink, multiply blend) so it reads as "on-brand"
   - Mono "PLACEHOLDER" label so there's no confusion about what it is
   - Swaps to real Media once the user uploads from /admin. */
import { cn } from '@/lib/utils'

type AspectKey = 'video' | 'square' | 'wide' | 'tall' | 'hero'

type PlaceholderProps = {
  seed?: string
  label?: string
  sublabel?: string
  aspect?: AspectKey
  tone?: 'forest' | 'ink' | 'brass' | 'lichen'
  showLabel?: boolean
  className?: string
}

const aspects: Record<AspectKey, { w: number; h: number }> = {
  video:  { w: 1600, h: 900 },
  square: { w: 1000, h: 1000 },
  wide:   { w: 2400, h: 900 },
  tall:   { w: 900,  h: 1200 },
  hero:   { w: 2400, h: 1350 },
}

const tones = {
  forest: { color: '#2F4A35', opacity: 0.55 },
  ink:    { color: '#1A1713', opacity: 0.5 },
  brass:  { color: '#B08D57', opacity: 0.4 },
  lichen: { color: '#8A9A7B', opacity: 0.45 },
} as const

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(h * 31 + str.charCodeAt(i), 1) | 0
  return Math.abs(h)
}

const toneKeys = ['forest', 'ink', 'brass', 'lichen'] as const

export function Placeholder({
  seed = 'bhc',
  label,
  sublabel,
  aspect = 'video',
  tone,
  showLabel = true,
  className,
}: PlaceholderProps) {
  const { w, h } = aspects[aspect]
  const seedHash = hash(seed)
  const chosenTone = tone ?? toneKeys[seedHash % toneKeys.length]
  const t = tones[chosenTone]

  // Picsum picture URL — static "id" param keeps the same photo across renders per seed.
  // Using seed/ path for readable URLs; grayscale=0 keeps color; blur=1 softens for overlay legibility.
  const imgSrc = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`

  return (
    <div className={cn('relative overflow-hidden w-full h-full bg-[var(--color-surface)]', className)}>
      {/* The picsum photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={label ? `Placeholder image for ${label}` : 'Placeholder image'}
        className="absolute inset-0 w-full h-full object-cover select-none"
        loading="lazy"
        decoding="async"
        draggable={false}
      />

      {/* Brand-toned overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: t.color, opacity: t.opacity, mixBlendMode: 'multiply' }}
      />

      {/* Subtle vignette + grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.28) 100%)',
        }}
      />

      {/* Placeholder badge + label */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6 pointer-events-none">
          <div className="flex justify-end">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#EFE9D9] bg-[#1A1713]/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-[#EFE9D9]/20">
              Placeholder
            </span>
          </div>
          {label && (
            <div>
              <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-[#EFE9D9]/85 mb-1">
                {label}
              </div>
              {sublabel && (
                <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.15em] uppercase text-[#EFE9D9]/60">
                  {sublabel}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
