import React from 'react'
import { Logo as BrandLogo } from '../Logo'

export default function AdminLogo() {
  return (
    <div className="bhc-admin-logo">
      <BrandLogo variant="primary" height={56} />
      <div className="bhc-admin-logo__wordmark">
        <span className="bhc-admin-logo__name">Black Hart</span>
        <span className="bhc-admin-logo__sub">Consulting</span>
      </div>
    </div>
  )
}
