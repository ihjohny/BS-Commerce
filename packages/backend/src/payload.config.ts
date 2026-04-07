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

import { ecommercePlugin } from './plugins/ecommerce'
import { multivendorPlugin } from './plugins/multivendor'
import { inventoryPlugin } from './plugins/inventory'
import { shippingPlugin } from './plugins/shipping'
import { paymentsPlugin } from './plugins/payments'
import { ordersPlugin } from './plugins/orders'
import { commissionsPlugin } from './plugins/commissions'
import { payoutsPlugin } from './plugins/payouts'
import { notificationsPlugin } from './plugins/notifications'
import { verificationPlugin } from './plugins/verification'
import { reviewsPlugin } from './plugins/reviews'
import { discountsPlugin } from './plugins/discounts'
import { openapi, swaggerUI } from 'payload-oapi'

import { Header } from './globals/header'
import { Footer } from './globals/footer'
import { PlatformSettings } from './globals/platform-settings'

import { redisConfig, cachedCollections } from './lib/redis'
import { authLoginEndpoint } from './endpoints/auth-login'
import { guestOrderLookupEndpoint } from './endpoints/guest-order-lookup'
import { checkoutProcessEndpoint } from './endpoints/checkout-process'
import { dashboardStatsEndpoint } from './endpoints/dashboard-stats'
import { adminBrandingEndpoint } from './endpoints/admin-branding'
import { customEndpointsOpenApiEndpoint } from './endpoints/custom-endpoints-openapi'
import { docsIndexEndpoint } from './endpoints/docs-index'
import { openapiAllEndpoint } from './endpoints/openapi-all'

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
      icons: [{ url: '/branding/brainstation-23-symbol.png', type: 'image/png' }],
    },
    components: {
      providers: [
        {
          path: '/components/admin/AdminBrandingCssVarsProvider',
        },
      ],
      graphics: {
        Logo: '/components/admin/AdminLogo',
        Icon: '/components/admin/AdminIcon',
      },
      views: {
        dashboard: {
          Component: '/components/admin/DashboardHome',
          path: '/',
          exact: true,
        },
        'create-first-user': {
          Component: '/components/CreateFirstUser',
          path: '/create-first-user',
          exact: true,
        },
      },
    },
  },

  // ─── Editor ──────────────────────────────────────────────────────────────────
  editor: lexicalEditor(),

  // ─── Database ────────────────────────────────────────────────────────────────
  // Default: Postgres via Drizzle ORM. Swap adapter to use MongoDB.
  // See: https://payloadcms.com/docs/database/postgres
  //
  // ID type: 'uuid' (default) = string IDs, DB-agnostic. 'serial' = integer IDs.
  // See docs/ID-STANDARD.md. Use serial only for existing DBs with integer IDs.
  db: postgresAdapter({
    idType: (process.env.DATABASE_ID_TYPE as 'serial' | 'uuid') || 'uuid',
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
  }),
  // Alternative: MongoDB (uses string ObjectIds; no idType option)
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

  // ─── Custom Endpoints ────────────────────────────────────────────────────────
  endpoints: [
    authLoginEndpoint,
    guestOrderLookupEndpoint,
    checkoutProcessEndpoint,
    dashboardStatsEndpoint,
    adminBrandingEndpoint,
    customEndpointsOpenApiEndpoint,
    openapiAllEndpoint,
    docsIndexEndpoint,
  ],

  // ─── Plugins ─────────────────────────────────────────────────────────────────
  // Order matters — dependencies must come first.
  // Phase 1: Redis cache only. Other plugins added in later phases.
  plugins: [
    // REST API documentation (OpenAPI + Swagger UI).
    // NOTE: payload-oapi does not yet include custom endpoint generation.
    openapi({
      openapiVersion: '3.0',
      specEndpoint: '/openapi.json',
      metadata: {
        title: 'BS-Commerce Backend API',
        version: '1.0.0',
        description: 'Autogenerated OpenAPI for Payload-managed REST endpoints.',
      },
    }),
    swaggerUI({
      specEndpoint: '/openapi-all.json',
      docsUrl: '/docs',
    }),
    swaggerUI({
      specEndpoint: '/openapi-custom.json',
      docsUrl: '/docs-custom',
    }),

    // Decision #16: Redis required for query caching + rate limiting
    redisCache({
      redis: redisConfig,
      collections: cachedCollections,
    }),

    // Phase 4: Multivendor Foundation (must run before ecommerce for tenant field on Users)
    multivendorPlugin({
      enabled: process.env.MULTIVENDOR_ENABLED === 'true',
      autoApproveVendors: process.env.VENDOR_AUTO_APPROVE === 'true',
      requireKYC: process.env.VENDOR_KYC_REQUIRED === 'true',
      requireProductApproval: process.env.PRODUCT_REQUIRES_APPROVAL === 'true',
    }),

    // Phase 2: Ecommerce Core
    ecommercePlugin({
      enabled: true,
      multivendorEnabled: process.env.MULTIVENDOR_ENABLED === 'true',
      currencies: (process.env.SUPPORTED_CURRENCIES || 'USD,BDT').split(','),
      defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
      allowGuestCheckout: process.env.GUEST_CHECKOUT_ENABLED === 'true',
    }),
    inventoryPlugin({
      enabled: process.env.INVENTORY_ENABLED !== 'false',
      multivendorEnabled: process.env.MULTIVENDOR_ENABLED === 'true',
      trackMovements: true,
      lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || '10'),
    }),
    shippingPlugin({
      enabled: true,
      model: (process.env.SHIPPING_MODEL || 'platform') as 'platform' | 'vendor' | 'hybrid',
    }),

    // Phase 3: Payments & Orders
    paymentsPlugin({
      enabled: true,
      adapter: (process.env.PAYMENT_PROVIDER || 'sslcommerz') as 'sslcommerz' | 'stripe',
      sslcommerz: {
        storeId: process.env.SSLCOMMERZ_STORE_ID,
        storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
        sandbox: process.env.SSLCOMMERZ_SANDBOX === 'true',
      },
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
    }),
    ordersPlugin({
      enabled: true,
      splitByVendor: process.env.MULTIVENDOR_ENABLED === 'true',
      orderStateMachine: 'default',
    }),
    commissionsPlugin({
      enabled: process.env.MULTIVENDOR_ENABLED === 'true',
      defaultStrategy: (process.env.COMMISSION_STRATEGY as 'percentage' | 'flat' | 'tiered' | 'category-based') || 'percentage',
      defaultRate: Number(process.env.DEFAULT_COMMISSION_RATE ?? '0'),
    }),
    payoutsPlugin({
      enabled: process.env.MULTIVENDOR_ENABLED === 'true',
      schedule: process.env.PAYOUT_SCHEDULE || 'biweekly',
      holdDays: Number(process.env.PAYOUT_HOLD_DAYS || '7'),
      adapter: (process.env.PAYOUT_ADAPTER as 'manual-ledger' | 'stripe-transfer') || 'manual-ledger',
    }),
    notificationsPlugin({
      enabled: true,
      adapters: {
        email: (process.env.EMAIL_ADAPTER as 'smtp' | 'resend') || 'smtp',
        sms: process.env.SMS_ADAPTER,
      },
    }),

    // Phase 6.1: Identifier verification (email link/OTP)
    verificationPlugin({
      enabled: process.env.VERIFICATION_ENABLED !== 'false',
      emailStrategy: (process.env.EMAIL_VERIFICATION_STRATEGY as 'link' | 'otp') || 'link',
    }),
    discountsPlugin({
      enabled: process.env.DISCOUNTS_ENABLED !== 'false',
    }),

    // Phase 6: Reviews (product + optional vendor reviews)
    reviewsPlugin({
      enabled: process.env.REVIEWS_ENABLED !== 'false',
      requireApproval: process.env.REVIEW_REQUIRES_APPROVAL === 'true',
      vendorReviews: process.env.MULTIVENDOR_ENABLED === 'true',
    }),

    // Future plugins (added per phase):
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
  // RFC 6750: Bearer is the standard; Payload also supports JWT prefix. Prefer Bearer first.
  auth: {
    jwtOrder: ['Bearer', 'JWT', 'cookie'] as const,
  },

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
