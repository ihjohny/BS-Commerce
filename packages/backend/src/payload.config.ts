import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
// import { mongooseAdapter } from '@payloadcms/db-mongodb' // swap adapter here to use MongoDB
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import { en } from '@payloadcms/translations/languages/en'
import { bnBd } from '@payloadcms/translations/languages/bnBd'
import { redisCache } from 'payloadcms-redis-plugin'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/users'
import { Media } from './collections/media'
import { Pages } from './collections/pages'
import { Categories } from './collections/categories'

import { Header } from './globals/header'
import { Footer } from './globals/footer'
import { PlatformSettings } from './globals/platform-settings'

import { redisConfig, cachedCollections } from './lib/redis'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // ─── Admin Panel ─────────────────────────────────────────────────────────────
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— BS-Commerce Admin',
    },
  },

  // ─── Editor ──────────────────────────────────────────────────────────────────
  editor: lexicalEditor(),

  // ─── Database ────────────────────────────────────────────────────────────────
  // Default: Postgres via Drizzle ORM. Swap adapter to use MongoDB.
  // See: https://payloadcms.com/docs/database/postgres
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
  }),
  // Alternative: MongoDB
  // db: mongooseAdapter({ url: process.env.DATABASE_URI! }),

  // ─── Localization ────────────────────────────────────────────────────────────
  // Decision #15: en + bn from day one. Payload field-level localization.
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'বাংলা', code: 'bn' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },

  // ─── Admin UI i18n ───────────────────────────────────────────────────────────
  i18n: {
    supportedLanguages: { en, 'bn-BD': bnBd },
    fallbackLanguage: 'en',
  },

  // ─── Core Collections ────────────────────────────────────────────────────────
  collections: [
    Users,
    Media,
    Pages,
    Categories,
    // Plugin collections are registered by their respective plugins (Phase 2+)
  ],

  // ─── Globals ─────────────────────────────────────────────────────────────────
  globals: [Header, Footer, PlatformSettings],

  // ─── Plugins ─────────────────────────────────────────────────────────────────
  // Order matters — dependencies must come first.
  // Phase 1: Redis cache only. Other plugins added in later phases.
  plugins: [
    // Decision #16: Redis required for query caching + rate limiting
    redisCache({
      redis: redisConfig,
      collections: cachedCollections,
    }),

    // Future plugins (added per phase):
    // multivendorPlugin({ enabled: process.env.MULTIVENDOR_ENABLED === 'true', ... })
    // ecommercePlugin({ ... })
    // ordersPlugin({ ... })
    // paymentsPlugin({ ... })
    // commissionsPlugin({ ... })
    // payoutsPlugin({ ... })
    // reviewsPlugin({ ... })
    // shippingPlugin({ ... })
    // inventoryPlugin({ ... })
    // notificationsPlugin({ ... })
    // analyticsPlugin({ ... })
    // seoPlugin({ collections: ['pages', 'products', 'vendor-profiles'] })
  ],

  // ─── Auth ─────────────────────────────────────────────────────────────────────
  // Decision #18: email OR phone + password.
  // Decision #17: social login (Google + Facebook) via @papercup/payload-auth-plugin (Phase 1 prep).
  secret: process.env.PAYLOAD_SECRET!,

  // ─── Sharp (image processing) ────────────────────────────────────────────────
  sharp,

  // ─── Upload ───────────────────────────────────────────────────────────────────
  upload: {
    limits: {
      fileSize: 10_000_000, // 10 MB
    },
  },

  // ─── TypeScript ───────────────────────────────────────────────────────────────
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  // ─── GraphQL ──────────────────────────────────────────────────────────────────
  graphQL: {
    schemaOutputFile: path.resolve(dirname, 'generated-schema.graphql'),
  },

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // Auth cookie is only accepted when request Origin is in this list (see payload auth extractJWT).
  cors: [
    process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ].filter(Boolean),

  // ─── CSRF ────────────────────────────────────────────────────────────────────
  csrf: [
    process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ].filter(Boolean),
})
