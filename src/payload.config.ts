import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
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

// Trusted origins for Payload's CSRF check. Covers the public site URL,
// the droplet IP (during pre-DNS HTTP access), and both production domains
// so admin logins succeed from any of them.
const csrfOrigins = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'http://104.131.82.31',
  'https://blackhartconsulting.com',
  'https://www.blackhartconsulting.com',
  'http://localhost:3000',
].filter(Boolean) as string[]

// S3-compatible media storage (DigitalOcean Spaces in production).
// When any required env var is missing we fall back to local disk storage,
// which keeps local dev working without the Spaces creds in place.
const s3Configured = Boolean(
  process.env.S3_BUCKET &&
  process.env.S3_ENDPOINT &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY,
)

// eslint-disable-next-line no-console
console.log('[payload-config] s3Configured =', s3Configured,
  '| S3_BUCKET present:', Boolean(process.env.S3_BUCKET),
  '| S3_ENDPOINT present:', Boolean(process.env.S3_ENDPOINT),
  '| S3_ACCESS_KEY_ID present:', Boolean(process.env.S3_ACCESS_KEY_ID),
  '| S3_SECRET_ACCESS_KEY present:', Boolean(process.env.S3_SECRET_ACCESS_KEY))

const plugins = s3Configured
  ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.S3_BUCKET as string,
        config: {
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
          },
          // DigitalOcean Spaces supports virtual-hosted-style URLs.
          forcePathStyle: false,
        },
        // Uploads land with public-read ACL so the <img src="..."> served
        // from the CDN works without signed URLs.
        acl: 'public-read',
      }),
    ]
  : []

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  secret: process.env.PAYLOAD_SECRET || '',

  csrf: csrfOrigins,
  cors: csrfOrigins,

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

  plugins,

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
