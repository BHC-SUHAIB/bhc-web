/* Minimal layout for Payload admin routes — intentionally does NOT pull in the site shell (Header/Footer).
   This keeps Payload's own styles and layout isolated. */
import React from 'react'
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import { importMap } from './admin/importMap'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

type Props = { children: React.ReactNode }

const Layout = ({ children }: Props) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
