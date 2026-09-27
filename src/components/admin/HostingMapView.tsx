import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { loadHostingMap } from '@/lib/hosting-map'
import { HostingMap } from './HostingMap'

// Custom admin view at /admin/hosting (registered in payload.config.ts under
// admin.components.views.hostingMap). Payload renders brand-new custom views
// without a template, so we wrap in DefaultTemplate to keep the sidebar nav.

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 13px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
  border: '1px solid var(--theme-elevation-150, #e5dfce)',
  background: 'var(--theme-elevation-50, #fafaf7)',
  color: 'var(--theme-text)',
}

export default async function HostingMapView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, locale, visibleEntities } = initPageResult
  if (!req.user) redirect('/admin/login?redirect=%2Fadmin%2Fhosting')

  const data = await loadHostingMap(req.payload)

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      viewType="hosting"
      visibleEntities={{ collections: visibleEntities?.collections, globals: visibleEntities?.globals }}
    >
      <Gutter>
        <div style={{ padding: '28px 0 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', margin: '0 0 18px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', margin: 0, fontSize: 32, letterSpacing: '-0.02em' }}>Hosting map</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--theme-elevation-600, #7A7466)' }}>
                Which site lives on which server, what it costs, and how full the shared client droplets are.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href="/admin/collections/servers" style={btn}>Servers</a>
              <a href="/admin/collections/hosted-projects" style={btn}>Hosted projects</a>
              <a
                href="/admin/collections/hosted-projects/create"
                style={{ ...btn, background: 'var(--theme-text)', color: 'var(--theme-bg)', borderColor: 'var(--theme-text)' }}
              >
                + Hosted project
              </a>
            </div>
          </div>
          <HostingMap data={data} />
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
