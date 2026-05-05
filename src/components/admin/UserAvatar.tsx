'use client'

import React from 'react'
import { useAuth } from '@payloadcms/ui'

// Custom avatar for the admin header. Shows the uploaded image from
// User.avatar (Media upload field). Falls back to a circle with the
// user's initials if no avatar is uploaded.

type UserWithAvatar = {
  email?: string
  name?: string
  avatar?:
    | string
    | number
    | { id: string | number; url?: string | null; alt?: string | null }
    | null
}

const initials = (u: UserWithAvatar): string => {
  const src = (u.name || u.email || '').trim()
  if (!src) return '·'
  const parts = src.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] || '·').toUpperCase()
}

export default function UserAvatar() {
  const { user } = useAuth<UserWithAvatar>()
  if (!user) return null

  const avatar = user.avatar
  const url =
    typeof avatar === 'object' && avatar !== null && 'url' in avatar && avatar.url
      ? avatar.url
      : null

  if (url) {
    return (
      <img
        src={url}
        alt={(typeof avatar === 'object' && avatar?.alt) || user.name || user.email || 'Avatar'}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          background: 'var(--theme-elevation-100, #ddd5bd)',
        }}
      />
    )
  }

  return (
    <div
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: '#1A1713',
        color: '#F4EFE6',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      {initials(user)}
    </div>
  )
}
