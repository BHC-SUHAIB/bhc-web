import React from 'react'

// Login-screen logo (large). Uses the brand SVG file directly so the
// rendered art matches design exports byte-for-byte.
export default function AdminLogo() {
  return (
    <div
      className="bhc-admin-logo"
      style={{ display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <img
        src="/brand/black-hart-avatar-512.png"
        alt="Black Hart"
        width={64}
        height={64}
        style={{ display: 'block', objectFit: 'contain' }}
      />
      <div className="bhc-admin-logo__wordmark" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="bhc-admin-logo__name" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Black Hart</span>
        <span className="bhc-admin-logo__sub" style={{ fontSize: 12, opacity: 0.65, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Consulting</span>
      </div>
    </div>
  )
}
