'use client'

import { useEffect } from 'react'

// Renders nothing — just runs a one-time-per-user seeding of nav-group
// collapsed state. System + Site are rarely opened, so we default-collapse
// them so the sidebar opens cleaner. After the first run, the user's own
// toggles persist normally (the bhcSeededV1 flag prevents re-seeding).

const SEED_VERSION = 'bhcSeededV2'

export default function InitNavPrefs() {
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/payload-preferences/nav', { credentials: 'include' })
        if (!res.ok) return
        const body = await res.json().catch(() => null) as { value?: { groups?: Record<string, { open?: boolean }>; [k: string]: unknown } } | null
        const current = body?.value ?? {}
        if (current && (current as Record<string, unknown>)[SEED_VERSION]) return

        const nextGroups = { ...(current.groups ?? {}) }
        const ensureCollapsed = (label: string) => {
          if (!(label in nextGroups)) nextGroups[label] = { open: false }
        }
        ensureCollapsed('⌬ System')
        ensureCollapsed('⬢ Site')

        if (cancelled) return
        await fetch('/api/payload-preferences/nav', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: { ...current, groups: nextGroups, [SEED_VERSION]: true },
          }),
        })
      } catch {
        // Non-fatal — sidebar just renders Payload's default expanded state.
      }
    })()
    return () => { cancelled = true }
  }, [])

  return null
}
