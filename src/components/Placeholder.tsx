/* Branded placeholder — NOT a photo.
   - 2026-09-01: this used to fetch a random Picsum stock photo per seed.
     That's exactly the "random unrelated image" bug reported against the
     articles page (an article with no heroImage set would silently show
     some stranger's random seeded photo, badge or no badge). Swapped for a
     pure CSS pattern in one of the brand tones, so a missing image reads as
     "no image yet" and never as mismatched content.
   - Tone (forest/ink/brass/lichen) is still seeded by slug so cards in a
     grid get some visual variety instead of being identical.
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

const tones = {
  forest: { color: '#2F4A35' },
  ink:    { color: '#1A1713' },
  brass:  { color: '#B08D57' },
  lichen: { color: '#8A9A7B' },
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
  const seedHash = hash(seed)
  const chosenTone = tone ?? toneKeys[seedHash % toneKeys.length]
  const t = tones[chosenTone]

  return (
    <div
      data-aspect={aspect}
      className={cn('relative overflow-hidden w-full h-full bg-[var(--color-surface)]', className)}
    >
      {/* Tone wash */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: t.color, opacity: 0.16 }} />

      {/* Diagonal hairline pattern — purely decorative, never a photo, so a
          missing image can never be mistaken for mismatched content. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, ${t.color}33 0, ${t.color}33 1px, transparent 1px, transparent 14px)`,
        }}
      />

      {/* Soft vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 50%, transparent 50%, rgba(0,0,0,0.18) 100%)',
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
