/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = { params: Promise<{ segments?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams } as any)

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams, importMap } as any)

export default Page
