'use client'

import React from 'react'
import type { DefaultServerCellComponentProps } from 'payload'

// List-view cell for the Client.isDelinquent field. Renders a red "AT RISK"
// pill when true, dash when false. Pairs with the existing isDelinquent
// boolean storage — no schema change.

export default function DelinquentBadgeCell({ cellData }: DefaultServerCellComponentProps) {
  if (!cellData) {
    return <span style={{ opacity: 0.4, fontSize: 12 }}>—</span>
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: 'rgba(220, 38, 38, 0.15)',
        color: 'rgb(160, 25, 25)',
      }}
    >
      ⚠ At risk
    </span>
  )
}
