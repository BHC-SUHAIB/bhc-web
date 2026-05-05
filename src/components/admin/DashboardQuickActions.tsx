'use client'

import React from 'react'

// Compact action bar pinned above the KPI strip on the admin dashboard.
// One-click access to the two most common operator tasks: drafting an
// invoice and adding a client.

const Btn = ({ href, label, primary, brass }: { href: string; label: string; primary?: boolean; brass?: boolean }) => (
  <a
    href={href}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 13px',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      textDecoration: 'none',
      border: '1px solid',
      transition: 'background 100ms, color 100ms, border-color 100ms',
      ...(primary
        ? { background: 'var(--theme-text)', color: 'var(--theme-bg)', borderColor: 'var(--theme-text)' }
        : brass
          ? { background: 'transparent', color: 'var(--bhc-brass-dark, #8E6E3F)', borderColor: 'var(--bhc-brass, #B08D57)' }
          : { background: 'var(--theme-elevation-50, #fafaf7)', color: 'var(--theme-text)', borderColor: 'var(--theme-elevation-150, #e5dfce)' }),
    }}
  >
    {label}
  </a>
)

export default function DashboardQuickActions() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        margin: '0 0 14px',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <Btn href="/admin/collections/clients/create" label="+ New client" />
      <Btn href="/admin/collections/contact-submissions" label="View leads" />
      <Btn href="/admin/collections/invoices/create" label="+ New invoice" primary />
    </div>
  )
}
