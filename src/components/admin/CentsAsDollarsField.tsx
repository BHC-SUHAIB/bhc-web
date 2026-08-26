'use client'

import React, { useEffect, useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { NumberFieldClientProps } from 'payload'

// Stores integer cents in the DB, but renders + accepts dollar input
// in the admin form. Lets the editor type "495.00" instead of 49500.
//
// Implementation: maintains a local string buffer so the user can type
// natural decimal input (including intermediate states like "4." or
// "495." that don't parse cleanly). On blur or valid parse, commits
// the integer cent value back to the underlying form field.

type Props = NumberFieldClientProps

export default function CentsAsDollarsField(props: Props) {
  const { path, field } = props
  const { value, setValue } = useField<number>({ path })

  // Local string buffer — keeps typed input intact while user is editing.
  const [draft, setDraft] = useState<string>(() => formatFromCents(value))
  const [focused, setFocused] = useState(false)

  // Re-sync from form state when the underlying value changes externally
  // (e.g. another field hook auto-updating, or initial load completing).
  useEffect(() => {
    if (!focused) setDraft(formatFromCents(value))
  }, [value, focused])

  function commit(raw: string) {
    const cents = parseToCents(raw)
    if (cents == null) {
      // Invalid input — revert the visible buffer to last valid value.
      setDraft(formatFromCents(value))
      return
    }
    setValue(cents)
    setDraft(formatFromCents(cents))
  }

  const label = (field?.label as string) || (field?.name as string) || 'Amount'
  const required = Boolean(field?.required)
  const description = field?.admin?.description as string | undefined

  return (
    <div className="field-type number">
      <label className="field-label" htmlFor={`field-${path}`}>
        {label}
        {required ? <span className="required">*</span> : null}
      </label>
      <div style={{ position: 'relative' }}>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.6,
            pointerEvents: 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          $
        </span>
        <input
          id={`field-${path}`}
          type="text"
          inputMode="decimal"
          value={draft}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false)
            commit(e.target.value)
          }}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.currentTarget as HTMLInputElement).blur()
            }
          }}
          placeholder="0.00"
          style={{ paddingLeft: 22, fontVariantNumeric: 'tabular-nums' }}
        />
      </div>
      {description ? <p className="field-description">{description}</p> : null}
    </div>
  )
}

function formatFromCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return ''
  return (Number(cents) / 100).toFixed(2)
}

// Returns integer cents, or null if input cannot be parsed.
function parseToCents(raw: string): number | null {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return 0
  // Accept "$1,795.00", "1795", "1795.5", "1,795.50"
  const cleaned = trimmed.replace(/[$,\s]/g, '')
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null
  const dollars = parseFloat(cleaned)
  if (!Number.isFinite(dollars)) return null
  return Math.round(dollars * 100)
}
