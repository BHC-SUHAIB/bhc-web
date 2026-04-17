import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Projects } from './collections/Projects'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { SiteSettings } from './globals/SiteSettings'
import { seedOnInit } from './seed/onInit'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const dbUri = process.env.DATABASE_URI || 'file:./payload.db'
const isPostgres = /^postgres(ql)?:\/\//.test(dbUri)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  secret: process.env.PAYLOAD_SECRET || '',

  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' \u00b7 Black Hart CMS',
    },
    components: {},
  },

  editor: lexicalEditor({}),

  onInit: seedOnInit,

  collections: [Users, Media, Pages, Projects],
  globals: [Header, Footer, SiteSettings],

  db: isPostgres
    ? postgresAdapter({
        pool: { connectionString: dbUri },
        // Schema push on boot instead of requiring pre-generated migrations.
        // Safe at this stage (no real data yet). For established sites, flip
        // to false and run `payload migrate:create` / `payload migrate` in CI.
        push: true,
      })
    : sqliteAdapter({ client: { url: dbUri } }),

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  sharp,
})
