'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

// Sidebar link to the custom /admin/hosting view (afterNavLinks). Uses
// Payload's own nav classes so it looks like any other nav entry.

export default function HostingNavLink() {
  const pathname = usePathname()
  const active = pathname === '/admin/hosting'
  return (
    <a className="nav__link" href="/admin/hosting" id="nav-hosting-map" style={{ marginTop: 8 }}>
      {active ? <div className="nav__link-indicator" /> : null}
      <span className="nav__link-label">Hosting map</span>
    </a>
  )
}
