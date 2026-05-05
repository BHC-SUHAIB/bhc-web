import React from 'react'

// Top-left admin icon. Uses the brand SVG file directly (with its own
// well-fit viewBox) rather than the inline path component, so the
// antlers can't be clipped by sub-pixel rendering.
export default function AdminIcon() {
  return (
    <span
      className="bhc-admin-icon"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}
    >
      <img
        src="/brand/black-hart-avatar-512.png"
        alt="Black Hart"
        width={32}
        height={32}
        style={{ display: 'block', objectFit: 'contain' }}
      />
    </span>
  )
}
