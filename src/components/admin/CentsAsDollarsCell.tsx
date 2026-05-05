'use client'

import React from 'react'
import type { DefaultServerCellComponentProps } from 'payload'

// List-view cell that formats an integer cents value as `$X.XX`. Pairs
// with CentsAsDollarsField — both keep the underlying storage in cents
// while presenting dollars to the admin user.

export default function CentsAsDollarsCell({ cellData }: DefaultServerCellComponentProps) {
  const cents = typeof cellData === 'number' ? cellData : Number(cellData ?? 0)
  if (!Number.isFinite(cents)) return <span style={{ opacity: 0.5 }}>—</span>
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {(cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
    </span>
  )
}
