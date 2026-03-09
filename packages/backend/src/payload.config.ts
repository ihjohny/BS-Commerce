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

import { Header } from './globals/header'
import { Footer } from './globals/footer'
import { PlatformSettings } from './globals/platform-settings'

import { redisConfig, cachedCollections } from './lib/redis'
import { processCheckout } from './lib/process-checkout'
import { authLoginEndpoint } from './endpoints/auth-login'

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
    components: {
      views: {
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
    {
      path: '/checkout/process',
      method: 'post',
      handler: async (req) => {
        const data = (await (req as Request).json?.().catch(() => ({}))) || {}
        const { cartId, shippingAddress, billingAddress, guestEmail, simulatePayment = false } = data

        if (!cartId || !shippingAddress || !billingAddress) {
          return Response.json(
            { error: 'Missing required fields: cartId, shippingAddress, billingAddress' },
            { status: 400 }
          )
        }

        const requiredAddressFields = ['firstName', 'lastName', 'street1', 'city', 'country']
        for (const field of requiredAddressFields) {
          if (!shippingAddress[field]) {
            return Response.json({ error: `shippingAddress.${field} is required` }, { status: 400 })
          }
          if (!billingAddress[field]) {
            return Response.json({ error: `billingAddress.${field} is required` }, { status: 400 })
          }
        }

        const userId = req.user?.id ?? undefined
        if (!userId && !guestEmail) {
          return Response.json(
            { error: 'Guest checkout requires guestEmail in body' },
            { status: 400 }
          )
        }

        try {
          const result = await processCheckout(
            req.payload,
            { cartId, shippingAddress, billingAddress, guestEmail, simulatePayment },
            userId,
            req
          )
          if (result.error) {
            const status = result.statusCode ?? 400
            return Response.json({ error: result.error }, { status })
          }
          return Response.json(result, { status: 201 })
        } catch (err) {
          console.error('[checkout/process]', err)
          const message = err instanceof Error ? err.message : 'Checkout failed'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  ],

  // ─── Plugins ─────────────────────────────────────────────────────────────────
  // Order matters — dependencies must come first.
  // Phase 1: Redis cache only. Other plugins added in later phases.
  plugins: [
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
