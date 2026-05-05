import React from 'react'

// Top-left admin icon. Wraps the hart PNG in a dedicated div with an
// explicit box (CSS in admin.css overrides Payload's .step-nav__home
// 18×18 + .step-nav span { overflow: hidden } so the antlers can't be
// clipped). The breadcrumb segments render in their own siblings inside
// .step-nav, so logo + crumbs are already structurally separate.
export default function AdminIcon() {
  return (
    <div className="bhc-admin-icon-wrap">
      <img
        src="/brand/black-hart-avatar-512.png"
        alt="Black Hart"
        className="bhc-admin-icon-img"
      />
    </div>
  )
}
