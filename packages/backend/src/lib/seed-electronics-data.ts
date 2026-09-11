/**
 * Comprehensive Electronics Store Seeding Engine (Apple Gadgets BD + Pickaboo Showcase)
 * 
 * Safely clears existing catalog, transactions, and old CMS pages while preserving
 * schema migrations and the primary admin account (frontend-seed-sv@bscommerce.local / FrontendSeed2026!).
 * Populates:
 * - 9 Categories (with existing media images)
 * - 13 Brands & Series (Apple, Samsung, Sony, Pixel, DJI, Anker, Bose, Marshall, OnePlus, Xiaomi, Asus, TP-Link, Dyson)
 * - 38 Flagship Products with multi-dimensional variants and existing media images
 * - Storefront Top Carousel Hero Banners (home-hero-banners) with 4 high-tech slides
 * - 14 Comprehensive Storefront CMS Pages (About Us, Showrooms, Warranty, EMI, Trade-In, Return, Privacy, Terms, FAQ, etc.)
 * - 4 Showroom Outlets (Bashundhara, Jamuna Future Park, Uttara, Chittagong)
 * - Distributed Stock Levels across variants and outlets
 * - 10 Registered Customers with verified BD addresses
 * - 42 Realistic Orders spanning past 30 days with client device tracking (mobile/desktop/tablet)
 * - Verified 5★ Customer Reviews
 * - 4 Active Promo Coupons
 * - 4 Active Shopping Carts & 11 Abandoned Carts (with high lost basket opportunities)
 * - Storefront Globals (Header, Footer, Announcement, Platform Settings)
 */
import type { Payload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import { getMediaStaticDir } from './media-upload-dir'
import { recomputeProductRating } from '../plugins/reviews/lib/aggregate-ratings'

export interface SeedResult {
  success: boolean
  message: string
  wiped?: {
    collections: string[]
    nonAdminUsersDeleted: number
  }
  seeded?: {
    categoriesCount: number
    brandsCount: number
    classesCount?: number
    productsCount: number
    variantsCount: number
    outletsCount: number
    customersCount: number
    addressesCount?: number
    wishlistCount?: number
    ordersCount: number
    activeCartsCount: number
    abandonedCartsCount: number
    reviewsCount: number
    couponsCount: number
    heroSlidesCount: number
    pagesCount: number
  }
}

/**
 * Helper to generate Lexical RichText payload
 */
function makeLexicalDoc(paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          {
            mode: 'normal',
            text,
            type: 'text',
            style: '',
            detail: 0,
            format: 0,
            version: 1,
          },
        ],
      })),
    },
  }
}

/**
 * Ensures Brands and refactored Attributes tables and relations exist in PostgreSQL without requiring separate migrations.
 */
export async function ensureBrandCatalogSchema(payload: Payload): Promise<void> {
  try {
    const db = (payload.db as any)?.drizzle || (payload.db as any)
    if (db && typeof db.execute === 'function') {
      const { sql } = await import('@payloadcms/db-postgres')
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "brands" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "slug" character varying,
          "logo_id" uuid,
          "banner_image_id" uuid,
          "website" character varying,
          "featured" boolean DEFAULT false,
          "display_order" numeric DEFAULT 0,
          "meta_image_id" uuid,
          "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
          "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "brands" ADD CONSTRAINT "brands_banner_image_id_media_id_fk" FOREIGN KEY ("banner_image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "brands" ADD CONSTRAINT "brands_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "brands_slug_idx" ON "brands" USING btree ("slug");
        CREATE INDEX IF NOT EXISTS "brands_logo_idx" ON "brands" USING btree ("logo_id");
        CREATE INDEX IF NOT EXISTS "brands_banner_image_idx" ON "brands" USING btree ("banner_image_id");
        CREATE INDEX IF NOT EXISTS "brands_created_at_idx" ON "brands" USING btree ("created_at");
        CREATE INDEX IF NOT EXISTS "brands_updated_at_idx" ON "brands" USING btree ("updated_at");

        CREATE TABLE IF NOT EXISTS "brands_locales" (
          "name" character varying NOT NULL,
          "description" character varying,
          "meta_title" character varying,
          "meta_description" character varying,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" uuid NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "brands_locales" ADD CONSTRAINT "brands_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "brands"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "brands_locales_locale_parent_id_unique" ON "brands_locales" USING btree ("_locale", "_parent_id");

        ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand_id" uuid;

        DO $$ BEGIN
          ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products" USING btree ("brand_id");
      `)
      payload.logger.info('[Electronics Seeder] Verified Brands & Attributes schema readiness.')
    }
  } catch (err: any) {
    payload.logger.warn(`[Electronics Seeder] Notice verifying database schema: ${err?.message || err}`)
  }
}

/**
 * Ensures Classes, parameters, and products.product_class_id tables exist in PostgreSQL without requiring separate migrations.
 */
export async function ensureClassesCatalogSchema(payload: Payload): Promise<void> {
  try {
    const db = (payload.db as any)?.drizzle || (payload.db as any)
    if (db && typeof db.execute === 'function') {
      const { sql } = await import('@payloadcms/db-postgres')
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "classes" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "slug" character varying,
          "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
          "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
        );

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_slug_idx" ON "classes" USING btree ("slug");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_created_at_idx" ON "classes" USING btree ("created_at");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_updated_at_idx" ON "classes" USING btree ("updated_at");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_locales" (
          "name" character varying NOT NULL,
          "description" character varying,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" uuid NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "classes_locales" ADD CONSTRAINT "classes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_locales_locale_parent_id_unique" ON "classes_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;



        ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_product_class_id_product_classes_id_fk";
        ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_class_id" uuid;

        DO $$ BEGIN
          ALTER TABLE "products" ADD CONSTRAINT "products_product_class_id_classes_id_fk" FOREIGN KEY ("product_class_id") REFERENCES "classes"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_product_class_idx" ON "products" USING btree ("product_class_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        -- Ensure Attributes columns
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "data_type" character varying DEFAULT 'select';
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "category" character varying DEFAULT 'specification';
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "unit" character varying;
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "default_group" character varying;
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "is_filterable" boolean DEFAULT true;
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "is_comparable" boolean DEFAULT true;

        -- Ensure Attributes Options tables
        CREATE TABLE IF NOT EXISTS "attributes_options" (
          "_order" integer NOT NULL,
          "_parent_id" uuid NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "value" character varying NOT NULL,
          "hex_color" character varying
        );

        DO $$ BEGIN
          ALTER TABLE "attributes_options" ADD CONSTRAINT "attributes_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "attributes_options_order_idx" ON "attributes_options" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "attributes_options_parent_id_idx" ON "attributes_options" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "attributes_options_locales" (
          "label" character varying NOT NULL,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" character varying NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "attributes_options_locales" ADD CONSTRAINT "attributes_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes_options"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "attributes_options_locales_locale_parent_id_unique" ON "attributes_options_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        -- Ensure Classes columns & groups
        ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "icon" character varying;

        CREATE TABLE IF NOT EXISTS "classes_groups" (
          "_order" integer NOT NULL,
          "_parent_id" uuid NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "display_order" numeric DEFAULT 0
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups" ADD CONSTRAINT "classes_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_order_idx" ON "classes_groups" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_parent_id_idx" ON "classes_groups" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_groups_locales" (
          "name" character varying NOT NULL,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" character varying NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups_locales" ADD CONSTRAINT "classes_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes_groups"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_groups_locales_locale_parent_id_unique" ON "classes_groups_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_groups_attributes" (
          "_order" integer NOT NULL,
          "_parent_id" character varying NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "attribute_id" uuid NOT NULL,
          "is_required" boolean DEFAULT false,
          "display_order" numeric DEFAULT 0
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups_attributes" ADD CONSTRAINT "classes_groups_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes_groups"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "classes_groups_attributes" ADD CONSTRAINT "classes_groups_attributes_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_attributes_order_idx" ON "classes_groups_attributes" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_attributes_parent_id_idx" ON "classes_groups_attributes" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_attributes_attribute_id_idx" ON "classes_groups_attributes" USING btree ("attribute_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_groups_attributes_locales" (
          "help_text" character varying,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" character varying NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups_attributes_locales" ADD CONSTRAINT "classes_groups_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes_groups_attributes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_groups_attributes_locales_locale_parent_id_unique" ON "classes_groups_attributes_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        -- Ensure Products Specifications table & unified columns
        CREATE TABLE IF NOT EXISTS "products_specifications" (
          "_order" integer NOT NULL,
          "_parent_id" uuid NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "key" character varying NOT NULL,
          "value" character varying NOT NULL,
          "label" character varying,
          "unit" character varying
        );

        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "label" character varying;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "unit" character varying;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "attribute_id" uuid;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "values" jsonb;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "group" character varying;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "is_custom" boolean DEFAULT false;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "is_ad_hoc" boolean DEFAULT false;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "display_order" numeric DEFAULT 0;

        DO $$ BEGIN
          ALTER TABLE "products_specifications" ADD CONSTRAINT "products_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "products_specifications" ADD CONSTRAINT "products_specifications_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_order_idx" ON "products_specifications" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_parent_id_idx" ON "products_specifications" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_key_idx" ON "products_specifications" USING btree ("key");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_attribute_id_idx" ON "products_specifications" USING btree ("attribute_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_group_idx" ON "products_specifications" USING btree ("group");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "classes_id" uuid;
        DO $$ BEGIN
          ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_classes_fk" FOREIGN KEY ("classes_id") REFERENCES "classes"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_classes_id_idx" ON "payload_locked_documents_rels" USING btree ("classes_id");

        ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "attributes_id" uuid;
        DO $$ BEGIN
          ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "attributes"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");

        ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "brands_id" uuid;
        DO $$ BEGIN
          ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "brands"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");
      `)
      payload.logger.info('[Electronics Seeder] Verified Classes & Specifications schema readiness.')
    }
  } catch (err: any) {
    payload.logger.warn(`[Electronics Seeder] Notice verifying Classes schema: ${err?.message || err}`)
  }
}

/**
 * 1. Database Wiper: Clears all catalog, transaction and page data, keeping admin intact.
 */
export async function wipeDatabaseForElectronics(
  payload: Payload,
  keepAdminEmail = 'frontend-seed-sv@bscommerce.local'
): Promise<{ collections: string[]; nonAdminUsersDeleted: number }> {
  payload.logger.info('[Electronics Seeder] Starting clean wipe of existing data...')

  const db = (payload.db as any)?.drizzle || (payload.db as any)
  if (db && typeof db.execute === 'function') {
    try {
      const { sql } = await import('@payloadcms/db-postgres')
      await db.execute(sql`
        TRUNCATE TABLE 
          products, 
          product_variants, 
          classes, 
          brands, 
          attributes, 
          categories, 
          coupons, 
          shipping_methods, 
          shipping_zones, 
          stock_locations, 
          stock_levels, 
          orders, 
          order_items, 
          order_status_history, 
          transactions, 
          carts, 
          carts_items, 
          wishlist_items, 
          addresses, 
          product_reviews, 
          pages, 
          payload_locked_documents, 
          payload_locked_documents_rels, 
          payload_preferences, 
          payload_preferences_rels 
        CASCADE;
      `)
      payload.logger.info('[Electronics Seeder] Clean SQL TRUNCATE completed.')
    } catch (sqlErr: any) {
      payload.logger.warn(`[Electronics Seeder] TRUNCATE fallback: ${sqlErr?.message || sqlErr}`)
    }
  }

  const collectionsToClear = [
    'addresses',
    'order-items',
    'orders',
    'carts',
    'wishlist-items',
    'product-reviews',
    'vendor-reviews',
    'stock-levels',
    'product-variants',
    'products',
    'classes',
    'brands',
    'attributes',
    'categories',
    'coupons',
    'shipping-methods',
    'shipping-zones',
    'stock-locations',
    'pages',
  ]

  for (const slug of collectionsToClear) {
    try {
      if ((payload.collections as any)[slug]) {
        await payload.delete({
          collection: slug as never,
          where: {},
          overrideAccess: true,
        })
        payload.logger.info(`[Electronics Seeder] Cleared collection: ${slug}`)
      }
    } catch (e: any) {
      payload.logger.warn(`[Electronics Seeder] Notice while clearing ${slug}: ${e?.message || e}`)
    }
  }

  // Delete all non-admin users, keep frontend-seed-sv@bscommerce.local
  let nonAdminDeleted = 0
  try {
    const usersRes = await payload.find({
      collection: 'users',
      limit: 500,
      overrideAccess: true,
      depth: 0,
    })

    for (const u of usersRes.docs) {
      const email = String(u.email || '').toLowerCase().trim()
      if (email !== keepAdminEmail.toLowerCase().trim() && u.role !== 'admin') {
        try {
          await payload.delete({
            collection: 'users',
            id: u.id,
            overrideAccess: true,
          })
          nonAdminDeleted++
        } catch {
          // ignore
        }
      }
    }
    payload.logger.info(`[Electronics Seeder] Preserved admin (${keepAdminEmail}). Removed ${nonAdminDeleted} previous users.`)
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] User cleanup note: ${e?.message || e}`)
  }

  return { collections: collectionsToClear, nonAdminUsersDeleted: nonAdminDeleted }
}

/**
 * 2. Complete Electronics Store Seeder
 */
export async function seedElectronicsStore(
  payload: Payload,
  options: { wipeFirst?: boolean; adminEmail?: string } = {}
): Promise<SeedResult> {
  const adminEmail = options.adminEmail || 'frontend-seed-sv@bscommerce.local'
  let wipedInfo: { collections: string[]; nonAdminUsersDeleted: number } | undefined

  // Ensure DB schema for brands and classes exists even if migrations were not run
  await ensureBrandCatalogSchema(payload)
  await ensureClassesCatalogSchema(payload)

  if (options.wipeFirst !== false) {
    wipedInfo = await wipeDatabaseForElectronics(payload, adminEmail)
  }

  // Ensure Admin user exists with correct password
  let adminUserDoc: any = null
  try {
    const existingAdmin = await payload.find({
      collection: 'users',
      where: { email: { equals: adminEmail } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingAdmin.totalDocs === 0) {
      adminUserDoc = await payload.create({
        collection: 'users',
        data: {
          email: adminEmail,
          password: 'FrontendSeed2026!',
          username: adminEmail,
          role: 'admin',
          status: 'active',
          emailVerified: true,
          firstName: 'System',
          lastName: 'Admin',
          displayName: 'Electronics Store Admin',
        } as any,
        overrideAccess: true,
      })
      payload.logger.info(`[Electronics Seeder] Created primary admin account: ${adminEmail}`)
    } else {
      adminUserDoc = await payload.update({
        collection: 'users',
        id: existingAdmin.docs[0].id,
        data: {
          password: 'FrontendSeed2026!',
          role: 'admin',
          status: 'active',
          emailVerified: true,
          firstName: 'System',
          lastName: 'Admin',
          displayName: 'Electronics Store Admin',
        } as any,
        overrideAccess: true,
      })
      payload.logger.info(`[Electronics Seeder] Refreshed credentials for admin: ${adminEmail}`)
    }
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Admin check note: ${e?.message || e}`)
  }

  // ─── MEDIA LOOKUP HELPER (Matches existing backend/media images) ───────────
  let allMediaDocs: any[] = []
  try {
    const mediaRes = await payload.find({
      collection: 'media',
      limit: 300,
      overrideAccess: true,
    })
    allMediaDocs = mediaRes.docs || []

    if (!allMediaDocs.length) {
      const mediaDir = getMediaStaticDir()
      if (fs.existsSync(mediaDir)) {
        const files = fs.readdirSync(mediaDir)
        for (const file of files) {
          if (/\.(jpe?g|png|webp)$/i.test(file) && !/-\d+x\d+\./.test(file)) {
            try {
              const doc = await payload.create({
                collection: 'media',
                filePath: path.join(mediaDir, file),
                data: { alt: file },
                overrideAccess: true,
              })
              allMediaDocs.push(doc)
            } catch {
              /* ignore individual insert errors */
            }
          }
        }
      }
    }
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Media lookup note: ${e?.message || e}`)
  }

  const findMediaId = (keyword: string): string | undefined => {
    if (!allMediaDocs.length) return undefined
    const doc = allMediaDocs.find((m: any) =>
      String(m.filename || '').toLowerCase().includes(keyword.toLowerCase())
    )
    return doc ? doc.id : allMediaDocs[0]?.id
  }

  // ─── 1. GLOBALS: Platform Settings, Header, Footer, Announcement ───────────
  try {
    if (payload.updateGlobal) {
      await payload.updateGlobal({
        slug: 'platform-settings' as never,
        data: {
          storeMode: 'single',
          currency: {
            defaultCurrency: 'BDT',
            supportedCurrencies: ['BDT', 'USD'],
            usdToBdtRate: 120,
          },
          storeName: 'BS Commerce',
          platformName: 'BS Commerce',
        } as any,
        overrideAccess: true,
      })

      await payload.updateGlobal({
        slug: 'header' as never,
        data: {
          siteName: 'BS Commerce',
          navLinks: [
            { label: 'Home', url: '/en', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Products', url: '/en/products', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Categories', url: '/en/categories', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Brands', url: '/en/brands', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Track Order', url: '/en/track-order', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
          ],
        } as any,
        overrideAccess: true,
      })

      await payload.updateGlobal({
        slug: 'footer' as never,
        data: {
          copyrightText: '© 2026 BS Commerce. Bangladesh’s Leading Multi-Brand Electronics & Gadget Store.',
          columns: [
            {
              heading: 'Featured Categories',
              links: [
                { label: 'Phones & Tablets', url: '/en/categories/phones-tablets', enabled: true, visibility: 'public' },
                { label: 'Laptops & MacBooks', url: '/en/categories/laptops-macbooks', enabled: true, visibility: 'public' },
                { label: 'Watches & Wearables', url: '/en/categories/watches-wearables', enabled: true, visibility: 'public' },
                { label: 'Audio & Sound', url: '/en/categories/audio-sound', enabled: true, visibility: 'public' },
                { label: 'TV & Entertainment', url: '/en/categories/tv-entertainment', enabled: true, visibility: 'public' },
                { label: 'Smart Home & Appliances', url: '/en/categories/smart-home-appliances', enabled: true, visibility: 'public' },
              ],
            },
            {
              heading: 'Our Showrooms',
              links: [
                { label: 'Bashundhara City Flagship', url: '/en/showrooms-bashundhara', enabled: true, visibility: 'public' },
                { label: 'Jamuna Future Park Center', url: '/en/showrooms-jamuna', enabled: true, visibility: 'public' },
                { label: 'Uttara Experience Hub', url: '/en/showrooms-uttara', enabled: true, visibility: 'public' },
                { label: 'Agrabad Hub (Chittagong)', url: '/en/showrooms-chittagong', enabled: true, visibility: 'public' },
                { label: 'All Showroom Locations', url: '/en/showrooms', enabled: true, visibility: 'public' },
              ],
            },
            {
              heading: 'Customer Care & Benefits',
              links: [
                { label: 'Brand Official Warranty', url: '/en/warranty', enabled: true, visibility: 'public' },
                { label: '0% EMI Facility (24+ Banks)', url: '/en/emi', enabled: true, visibility: 'public' },
                { label: 'Device Exchange & Trade-In', url: '/en/exchange', enabled: true, visibility: 'public' },
                { label: 'Track Your Order', url: '/en/track-order', enabled: true, visibility: 'public' },
                { label: 'Help Center & FAQ', url: '/en/faq', enabled: true, visibility: 'public' },
                { label: 'Contact & Support Desk', url: '/en/contact', enabled: true, visibility: 'public' },
              ],
            },
            {
              heading: 'Company & Policies',
              links: [
                { label: 'About BS Commerce', url: '/en/about-us', enabled: true, visibility: 'public' },
                { label: '7-Day Return & Replacement', url: '/en/return-refund', enabled: true, visibility: 'public' },
                { label: 'Privacy & Data Security', url: '/en/privacy-policy', enabled: true, visibility: 'public' },
                { label: 'Terms & Conditions of Sale', url: '/en/terms-conditions', enabled: true, visibility: 'public' },
              ],
            },
          ],
          bottomLinks: [
            { label: 'About Us', url: '/en/about-us' },
            { label: 'Warranty Policy', url: '/en/warranty' },
            { label: '0% EMI', url: '/en/emi' },
            { label: 'Trade-In', url: '/en/exchange' },
            { label: 'Return Policy', url: '/en/return-refund' },
            { label: 'Privacy Policy', url: '/en/privacy-policy' },
            { label: 'Terms of Service', url: '/en/terms-conditions' },
          ],
          socialLinks: [
            { platform: 'facebook', url: 'https://facebook.com/applegadgetsbd' },
            { platform: 'instagram', url: 'https://instagram.com/applegadgetsbd' },
            { platform: 'youtube', url: 'https://youtube.com/@applegadgetsbd' },
          ],
        } as any,
        overrideAccess: true,
      })
    }
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Globals note: ${e?.message || e}`)
  }

  // ─── 2. STOREFRONT CMS PAGES (Top Carousel + Bottom Footer Pages) ──────────
  let pagesCount = 0
  let heroSlidesCount = 0

  const cmsPagesToSeed = [
    // 1. Home Hero Carousel
    {
      title: 'Home Hero Banners',
      slug: 'home-hero-banners',
      meta: { title: 'BS Commerce | Flagship Electronics Store', description: 'Hero banner slides for homepage.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Apple iPhone 16 Pro Max — Pure Titanium',
          subheading: 'A18 Pro Silicon, 5x Optical Telephoto & Camera Control. 0% EMI up to 36 Months with Official AppleCare Warranty.',
          backgroundImage: findMediaId('category-electronics-1'),
          ctaLabel: 'Shop iPhone 16 Pro',
          ctaUrl: '/en/products/apple-iphone-16-pro-max',
        },
        {
          blockType: 'hero',
          heading: 'MacBook Pro M3 Max & Creator Studio',
          subheading: 'Unstoppable Apple Silicon powerhouses and RTX 4090 laptops for professional creative workflows.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'Explore MacBooks',
          ctaUrl: '/en/categories/laptops-macbooks',
        },
        {
          blockType: 'hero',
          heading: 'Premium Audio, Drones & Smart Living',
          subheading: 'AirPods Pro 2, Sony WH-1000XM5, Marshall, and DJI 4K Drones at authentic Bangladeshi prices.',
          backgroundImage: findMediaId('category-smart-home-1'),
          ctaLabel: 'Browse All Gadgets',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'hero',
          heading: 'Official Warranty Across 4 Showrooms',
          subheading: 'Visit our flagship experience centers in Bashundhara City, Jamuna Future Park, Uttara & Chittagong.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'View Catalog',
          ctaUrl: '/en/categories',
        },
      ],
    },
    // 2. About Us
    {
      title: 'About BS Commerce',
      slug: 'about-us',
      meta: { title: 'About Us | BS Commerce', description: 'Learn about BS Commerce, our mission, values, and authenticity guarantee.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Bangladesh’s Premier Gadget Experience',
          subheading: 'Connecting technology enthusiasts with 100% genuine electronics, premium computing, and world-class acoustics.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'Explore Our Catalog',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Founded with a steadfast commitment to authenticity and transparency, BS Commerce has become Bangladesh’s premier multi-brand retail destination. We specialize in official Apple hardware, high-performance Samsung flagships, Sony imaging & audio, and the smart IoT gadgets shaping modern lifestyles.',
            'Operating 4 flagship showrooms across Dhaka and Chittagong, we provide authentic unboxing experiences, live demo stations, and dedicated technical consultation. Every product in our inventory undergoes strict IMEI verification to guarantee original manufacturer provenance.',
            'Beyond physical retail, our nationwide express delivery network ensures customers across all 64 districts of Bangladesh receive factory-sealed electronics with authorized warranty and 0% EMI flexibility.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Why Tech Shoppers Trust BS Commerce',
          items: [
            {
              question: 'Are all products 100% authentic and original?',
              answer: makeLexicalDoc(['Yes. Every device is brand new, factory sealed, and sourced directly through authorized international distribution channels with verifiable serial numbers.']),
            },
            {
              question: 'Do you offer corporate or enterprise procurement?',
              answer: makeLexicalDoc(['Yes, our enterprise solutions team supports corporate bulk orders, tax invoicing, and tailored service level agreements for IT companies and institutions.']),
            },
          ],
        },
      ],
    },
    // 3. Warranty Policy
    {
      title: 'Brand Official Warranty & Protection Policy',
      slug: 'warranty',
      meta: { title: 'Official Warranty Policy | BS Commerce', description: 'Comprehensive warranty details covering Apple, Samsung, Sony, Anker, and Asus products.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Authorized Manufacturer Warranty Support',
          subheading: 'Shop with total confidence. All our products carry official brand warranty and responsive local customer care.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'Shop With Warranty',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Apple Official Warranty: Apple devices (iPhones, MacBooks, iPads, Watches) are backed by 1-Year Apple Official International Warranty, claimable through Apple Authorized Service Providers (AASP) in Bangladesh and worldwide.',
            'Android & Audio Warranties: Samsung smartphones include 1-Year National Official Warranty. Sony headphones carry 1-Year Official Warranty. Anker GaN chargers and power banks feature our signature 18-Month Instant Replacement Guarantee.',
            'Asus ROG Gaming Laptops: Covered under 2-Year Global Hardware Warranty covering motherboards, display panels, and high-frequency cooling systems.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Warranty Claims & Service FAQ',
          items: [
            {
              question: 'How do I claim warranty for an Apple product?',
              answer: makeLexicalDoc(['Simply bring your device and the original BS Commerce invoice to any of our 4 showrooms or any Apple Authorized Service Provider in Bangladesh.']),
            },
            {
              question: 'What is covered under the 18-month Anker replacement guarantee?',
              answer: makeLexicalDoc(['Any hardware malfunction, power failure, or port defect occurring under normal usage is replaced with a brand new unit within 48 hours.']),
            },
            {
              question: 'What is NOT covered under standard warranty?',
              answer: makeLexicalDoc(['Physical damage, accidental drops, water/liquid damage (unless covered by explicit IP claims), unauthorized third-party repairs, and software rooting.']),
            },
          ],
        },
      ],
    },
    // 4. EMI Facility
    {
      title: '0% Interest EMI Facility (Up to 36 Months)',
      slug: 'emi',
      meta: { title: '0% EMI Facility | BS Commerce', description: 'Avail up to 36 months 0% interest EMI across 24+ top Bangladeshi commercial banks.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Own Your Dream Gadget with 0% EMI',
          subheading: 'Flexible installments from 3 to 36 months across 24+ Bangladeshi banks. Available both online and at all 4 showrooms.',
          backgroundImage: findMediaId('category-electronics-1'),
          ctaLabel: 'Explore EMI Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'We have partnered with 24+ leading commercial banks in Bangladesh to provide 0% interest Equal Monthly Installment (EMI) facilities. Now you can purchase any flagship iPhone 16 Pro, MacBook Pro, or Sony OLED TV with affordable monthly payments.',
            'Supported Banks: City Bank (American Express), Standard Chartered Bank, BRAC Bank, Eastern Bank (EBL), Dutch-Bangla Bank (DBBL), Dhaka Bank, Prime Bank, Mutual Trust Bank (MTB), Southeast Bank, Premier Bank, United Commercial Bank (UCB), Jamuna Bank, and Bank Asia.',
            'Available Tenures: 3 months, 6 months, 9 months, 12 months, 18 months, 24 months, and 36 months.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'EMI Application & Processing FAQ',
          items: [
            {
              question: 'Can I purchase using EMI on the website?',
              answer: makeLexicalDoc(['Yes! During checkout, select "Online Payment" and choose your bank under the EMI tab in the secure gateway. Your card limit will convert into monthly installments automatically.']),
            },
            {
              question: 'Can I process EMI in-store?',
              answer: makeLexicalDoc(['Yes! Simply swipe your credit card on our specialized POS terminals at any of our 4 showrooms for instant EMI conversion.']),
            },
            {
              question: 'Is a minimum purchase amount required for EMI?',
              answer: makeLexicalDoc(['A minimum cart value of ৳10,000 is required to qualify for credit card EMI facilities.']),
            },
          ],
        },
      ],
    },
    // 5. Device Exchange & Trade-In
    {
      title: 'Smart Trade-In & Device Exchange Program',
      slug: 'exchange',
      meta: { title: 'Device Exchange & Trade-In | BS Commerce', description: 'Trade in your old smartphone, iPad, or MacBook for instant credit toward a new device.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Upgrade Smartly with Instant Trade-In',
          subheading: 'Bring your pre-owned smartphone or laptop to any showroom, receive fair diagnostic evaluation in 10 minutes, and pay only the difference.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'Find Nearest Showroom',
          ctaUrl: '/en/showrooms',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'How Trade-In Works in 3 Simple Steps:',
            '1. Bring Your Device: Visit any of our 4 physical showrooms with your existing device (iPhone, iPad, MacBook, or Galaxy flagship).',
            '2. Instant Computerized Valuation: Our certified technicians inspect your battery health, display integrity, and internal diagnostics to offer top market trade-in value in 10 minutes.',
            '3. Upgrade Instantly: Apply your trade-in credit directly toward any new device in store and walk out with your brand new purchase.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Trade-In Requirements & Conditions',
          items: [
            {
              question: 'What documents do I need to bring?',
              answer: makeLexicalDoc(['You must present a photocopy of your National ID Card (NID) or Passport for verification and legal ownership transfer.']),
            },
            {
              question: 'Can I exchange a device without its original box?',
              answer: makeLexicalDoc(['Yes. Original accessories and packaging increase the valuation, but device-only exchanges are fully accepted with proper identification.']),
            },
          ],
        },
      ],
    },
    // 6. All Showrooms
    {
      title: 'Our Showroom Locations & Experience Centers',
      slug: 'showrooms',
      meta: { title: 'Showroom Locations | BS Commerce', description: 'Visit our flagship experience centers in Bashundhara City, Jamuna Future Park, Uttara & Chittagong.' },
      layout: [
        {
          blockType: 'hero',
          heading: '4 Flagship Showrooms Across Bangladesh',
          subheading: 'Experience live unboxings, interactive gaming lounges, and audio listening booths at prime retail destinations in Dhaka & Chittagong.',
          backgroundImage: findMediaId('category-workspace-furniture-1'),
          ctaLabel: 'Browse Products First',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Bashundhara City Flagship Store (Dhaka): Level 6, Block D, Shop 42–45, Panthapath, Dhaka 1205. Phone: +880 1711-234567. Open 10:00 AM – 8:30 PM (Closed Tuesday). Featuring our full Apple ecosystem wall and dedicated DJI flight simulator.',
            'Jamuna Future Park Experience Center (Dhaka): Level 4, Zone A, Shop 18B, Kuril, Dhaka 1229. Phone: +880 1819-345678. Open 11:00 AM – 9:00 PM (Closed Wednesday). Featuring high-fidelity Bose/Marshall sound booths and Asus ROG gaming test zones.',
            'Uttara Tech Hub Outlet (Dhaka): House 12, Road 7, Sector 3, Uttara, Dhaka 1230. Phone: +880 1912-456789. Open 10:00 AM – 8:30 PM (Open 7 Days). Express pickup hub with rapid airport road dispatch.',
            'Agrabad Commercial Hub (Chittagong): Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000. Phone: +880 1815-789012. Open 10:00 AM – 8:30 PM (Open 7 Days). Premier tech showroom serving Greater Chittagong.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Visiting Our Showrooms FAQ',
          items: [
            {
              question: 'Can I pick up an online order from any showroom?',
              answer: makeLexicalDoc(['Yes! Choose "Store Pickup" at checkout and select your preferred showroom. Your order will be packed and ready within 2 hours.']),
            },
            {
              question: 'Are website prices and showroom prices the same?',
              answer: makeLexicalDoc(['Yes, our pricing, warranty packages, and 0% EMI campaigns are completely synchronized across both online and physical stores.']),
            },
          ],
        },
      ],
    },
    // 7. Bashundhara City Flagship
    {
      title: 'Bashundhara City Flagship Store',
      slug: 'showrooms-bashundhara',
      meta: { title: 'Bashundhara City Flagship | BS Commerce', description: 'Visit our flagship showroom on Level 6, Block D, Bashundhara City Shopping Mall, Panthapath.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Bashundhara City Flagship Store',
          subheading: 'Level 6, Block D, Panthapath, Dhaka 1205. Our largest flagship destination with interactive Apple and DJI demo stations.',
          backgroundImage: findMediaId('category-workspace-furniture-1'),
          ctaLabel: 'View In-Stock Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: Level 6, Block D, Shop 42–45, Bashundhara City Shopping Mall, Panthapath, Dhaka.',
            'Operating Hours: 10:00 AM – 8:30 PM (Closed every Tuesday according to market schedule).',
            'Hotline: +880 1711-234567 | Email: bashundhara@bscommerce.local',
            'Highlights: Complete iPhone, iPad, and MacBook M3 experience zones; live DJI drone camera demonstration; certified trade-in counter; on-the-spot 0% EMI processing.',
          ]),
        },
      ],
    },
    // 8. Jamuna Future Park Center
    {
      title: 'Jamuna Future Park Experience Center',
      slug: 'showrooms-jamuna',
      meta: { title: 'Jamuna Future Park Center | BS Commerce', description: 'Visit our experience showroom on Level 4, Zone A, Jamuna Future Park, Kuril, Dhaka.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Jamuna Future Park Experience Center',
          subheading: 'Level 4, Zone A, Kuril, Dhaka 1229. Immersive gaming test stations and sound booths.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'View Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: Level 4, Zone A, Shop 18B, Jamuna Future Park, Kuril, Dhaka.',
            'Operating Hours: 11:00 AM – 9:00 PM (Closed every Wednesday).',
            'Hotline: +880 1819-345678 | Email: jamuna@bscommerce.local',
            'Highlights: Dedicated PlayStation 5 and Asus ROG gaming showcase; Marshall and Sony noise cancellation sound booth; high-speed checkout and express pickup counter.',
          ]),
        },
      ],
    },
    // 9. Uttara Tech Hub
    {
      title: 'Uttara Tech Hub Outlet',
      slug: 'showrooms-uttara',
      meta: { title: 'Uttara Tech Hub Outlet | BS Commerce', description: 'Visit our Uttara outlet at House 12, Road 7, Sector 3, Uttara, Dhaka.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Uttara Tech Hub Outlet',
          subheading: 'House 12, Road 7, Sector 3, Uttara, Dhaka 1230. Convenient North Dhaka location with fast doorstep delivery support.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'Shop Online',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: House 12, Road 7, Sector 3, Uttara, Dhaka 1230.',
            'Operating Hours: 10:00 AM – 8:30 PM (Open all 7 days of the week).',
            'Hotline: +880 1912-456789 | Email: uttara@bscommerce.local',
            'Highlights: Rapid curbside pickup; specialized Apple accessories and GaN charging station; regional delivery dispatch center for Gazipur and Tongi.',
          ]),
        },
      ],
    },
    // 10. Agrabad Chittagong Hub
    {
      title: 'Agrabad Commercial Hub (Chittagong)',
      slug: 'showrooms-chittagong',
      meta: { title: 'Chittagong Showroom | BS Commerce', description: 'Visit our Chittagong flagship center at Central Commercial Plaza, GEC Circle.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Chittagong Experience Center',
          subheading: 'Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000. Serving tech lovers across Greater Chittagong.',
          backgroundImage: findMediaId('category-smart-home-1'),
          ctaLabel: 'Browse Gadgets',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000.',
            'Operating Hours: 10:00 AM – 8:30 PM (Open 7 days a week).',
            'Hotline: +880 1815-789012 | Email: chittagong@bscommerce.local',
            'Highlights: Full product lineup of Apple, Samsung, Sony, and Anker; same-day delivery across Chittagong city; official warranty intake center.',
          ]),
        },
      ],
    },
    // 11. Return & Refund Policy
    {
      title: '7-Day Replacement & Return Policy',
      slug: 'return-refund',
      meta: { title: 'Return & Refund Policy | BS Commerce', description: 'Clear, transparent 7-day replacement guarantee and refund policies.' },
      layout: [
        {
          blockType: 'hero',
          heading: '7-Day Hassle-Free Replacement Policy',
          subheading: 'Your satisfaction is our priority. If any manufacturing defect is detected within 7 days, we replace your unit immediately.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'Browse Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            '7-Day Replacement Guarantee: If your purchased product develops any hardware malfunction or manufacturing defect within 7 days of delivery, visit any of our showrooms or contact our support team for an immediate replacement.',
            'Return Eligibility: Products must be in pristine condition with all original packaging, stickers, manuals, and accessories intact. Unopened items may be returned within 48 hours for store credit.',
            'Refund Processing: Online transaction refunds are credited back to the original source (bKash, Nagad, Visa/Mastercard) within 3 to 5 business days upon inspection approval.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Return & Refund FAQ',
          items: [
            {
              question: 'How do I initiate a replacement request?',
              answer: makeLexicalDoc(['Call our hotline (+880 1711-234567) or bring your invoice to any showroom. Our technical desk will inspect and process your replacement on the spot.']),
            },
            {
              question: 'What if a product is out of stock when requesting replacement?',
              answer: makeLexicalDoc(['You may choose an alternative model with adjusted price difference, or receive a 100% full refund immediately.']),
            },
          ],
        },
      ],
    },
    // 12. Privacy Policy
    {
      title: 'Privacy & Data Security Policy',
      slug: 'privacy-policy',
      meta: { title: 'Privacy Policy | BS Commerce', description: 'How BS Commerce protects your personal data and online transactions.' },
      layout: [
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'At BS Commerce, we take your privacy and data security seriously. This Privacy Policy details how we collect, handle, and protect your information when you use our website and retail services.',
            'Information Collection: We collect essential contact information (name, delivery address, phone number, email) solely for order fulfillment, courier delivery updates, and warranty registration.',
            'Payment Security: All online payments are encrypted through 256-bit SSL connections via PCI-DSS certified gateways (SSLCommerz / PortPos). We never store your credit card numbers or PINs on our servers.',
            'No Third-Party Sharing: We do not sell, trade, or disclose your personal information to unauthorized third-party marketing companies under any circumstances.',
          ]),
        },
      ],
    },
    // 13. Terms & Conditions
    {
      title: 'Terms & Conditions of Service',
      slug: 'terms-conditions',
      meta: { title: 'Terms & Conditions | BS Commerce', description: 'Terms of sale, pricing transparency, and service policies for BS Commerce.' },
      layout: [
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Welcome to BS Commerce. By placing an order online or purchasing at our showrooms, you agree to the following terms and conditions:',
            '1. Pricing and Availability: All product prices are listed in Bangladeshi Taka (BDT) including applicable taxes. While we strive for absolute accuracy, prices and stock levels may change based on global currency fluctuations and availability.',
            '2. Delivery and Inspection: Please inspect parcel packaging before signing courier receipts. In case of exterior transit damage, please notify the delivery agent and our support hotline immediately.',
            '3. Warranty Terms: Official brand warranties are subject to manufacturer guidelines and are fulfilled through authorized service centers.',
            '4. Governing Law: These terms and conditions are governed by the laws and commercial regulations of Bangladesh.',
          ]),
        },
      ],
    },
    // 14. FAQ
    {
      title: 'Frequently Asked Questions & Help Center',
      slug: 'faq',
      meta: { title: 'FAQ & Help Center | BS Commerce', description: 'Answers to common questions about orders, payments, delivery, and authenticity.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Frequently Asked Questions',
          subheading: 'Find quick answers to common questions about ordering, delivery, warranty, and showroom services.',
          backgroundImage: findMediaId('category-smart-home-1'),
          ctaLabel: 'Contact Support',
          ctaUrl: '/en/contact',
        },
        {
          blockType: 'faq',
          heading: 'General Inquiries',
          items: [
            {
              question: 'How fast is nationwide delivery in Bangladesh?',
              answer: makeLexicalDoc(['Inside Dhaka: Same-day express delivery within 2 to 4 hours. Outside Dhaka: 24 to 48 hours nationwide via Steadfast and Sundarban Courier.']),
            },
            {
              question: 'How can I track my shipment?',
              answer: makeLexicalDoc(['Go to our Track Order page (/en/track-order) and enter your Order ID and contact number to view live courier status.']),
            },
            {
              question: 'What payment methods do you accept?',
              answer: makeLexicalDoc(['We accept bKash, Nagad, Visa, Mastercard, AMEX, Cash on Delivery (COD), and 0% EMI across 24+ Bangladeshi banks.']),
            },
            {
              question: 'Can I inspect the product before accepting delivery?',
              answer: makeLexicalDoc(['Yes, you may verify exterior seal and box condition with our delivery personnel before completing COD payment.']),
            },
          ],
        },
      ],
    },
  ]

  for (const pageDef of cmsPagesToSeed) {
    try {
      const existing = await payload.find({
        collection: 'pages',
        where: { slug: { equals: pageDef.slug } },
        limit: 1,
        overrideAccess: true,
      })

      const pageData: any = {
        title: pageDef.title,
        slug: pageDef.slug,
        status: 'published',
        _status: 'published',
        publishedAt: new Date().toISOString(),
        meta: pageDef.meta,
        layout: pageDef.layout,
      }

      if (existing.totalDocs > 0) {
        await payload.update({
          collection: 'pages',
          id: existing.docs[0].id,
          data: pageData,
          overrideAccess: true,
        })
      } else {
        await payload.create({
          collection: 'pages',
          data: pageData,
          overrideAccess: true,
        })
      }
      pagesCount++
      if (pageDef.slug === 'home-hero-banners') {
        heroSlidesCount = (pageDef.layout as any[]).length
      }
    } catch (pageErr: any) {
      payload.logger.warn(`[Electronics Seeder] Page "${pageDef.slug}" note: ${pageErr?.message || pageErr}`)
    }
  }
  payload.logger.info(`[Electronics Seeder] Seeded ${pagesCount} published CMS pages with rich blocks.`)

  // ─── 3. STOCK LOCATIONS (4 Showrooms) ──────────────────────────────────────
  const outletsData = [
    {
      name: 'Bashundhara City Flagship Store',
      code: 'OUT-DHK-BAS',
      slug: 'bashundhara-city-flagship',
      isPublicStore: true,
      address: { street: 'Level 6, Block D, Panthapath', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1205' },
    },
    {
      name: 'Jamuna Future Park Experience Center',
      code: 'OUT-DHK-JAM',
      slug: 'jamuna-future-park',
      isPublicStore: true,
      address: { street: 'Level 4, Zone A, Kuril', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1229' },
    },
    {
      name: 'Uttara Tech Hub Outlet',
      code: 'OUT-DHK-UTT',
      slug: 'uttara-tech-hub',
      isPublicStore: true,
      address: { street: 'House 12, Road 7, Sector 3', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1230' },
    },
    {
      name: 'Agrabad Commercial Hub Outlet',
      code: 'OUT-CTG-AGR',
      slug: 'chittagong-agrabad-hub',
      isPublicStore: true,
      address: { street: 'Central Commercial Plaza, GEC Circle', city: 'Chittagong', state: 'Chittagong Division', country: 'BD', postalCode: '4000' },
    },
  ]

  const createdOutlets: any[] = []
  for (const o of outletsData) {
    const doc = await payload.create({
      collection: 'stock-locations',
      data: o as any,
      overrideAccess: true,
    })
    createdOutlets.push(doc)
  }

  // ─── 4. SHIPPING ZONES & METHODS ───────────────────────────────────────────
  try {
    const zoneDoc = await payload.create({
      collection: 'shipping-zones',
      data: {
        name: 'Bangladesh Nationwide Delivery',
        countries: [{ code: 'BD' }],
        isActive: true,
      } as any,
      overrideAccess: true,
    })

    await payload.create({
      collection: 'shipping-methods',
      data: {
        name: 'Inside Dhaka Express (2-4 Hours / Same Day)',
        zone: zoneDoc.id,
        type: 'flat',
        rate: 80,
        currency: 'BDT',
        isActive: true,
      } as any,
      overrideAccess: true,
    })

    await payload.create({
      collection: 'shipping-methods',
      data: {
        name: 'Nationwide Courier (Steadfast / Sundarban 24-48h)',
        zone: zoneDoc.id,
        type: 'flat',
        rate: 150,
        currency: 'BDT',
        isActive: true,
      } as any,
      overrideAccess: true,
    })
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Shipping note: ${e?.message || e}`)
  }

  // ─── 5. CATEGORIES (With Existing Media Images) ────────────────────────────
  const categoriesData = [
    { name: 'Phones & Tablets', slug: 'phones-tablets', imageKey: 'category-electronics-1' },
    { name: 'Laptops & MacBooks', slug: 'laptops-macbooks', imageKey: 'category-creator-studio-1' },
    { name: 'Watches & Wearables', slug: 'watches-wearables', imageKey: 'category-office-gear-1' },
    { name: 'Audio & Sound', slug: 'audio-sound', imageKey: 'sv-demo-earbuds' },
    { name: 'Power & Accessories', slug: 'power-accessories', imageKey: 'sv-wall-charger-65w-pro' },
    { name: 'Cameras & Drones', slug: 'cameras-drones', imageKey: 'sv-ring-light-10in-pro' },
    { name: 'Gaming & Consoles', slug: 'gaming-consoles', imageKey: 'category-electronics' },
    { name: 'TV & Entertainment', slug: 'tv-entertainment', imageKey: 'sv-dual-monitor-arm-pro' },
    { name: 'Smart Home & Appliances', slug: 'smart-home-appliances', imageKey: 'category-smart-home-1' },
  ]

  const categoryMap: Record<string, string> = {}
  for (const c of categoriesData) {
    const imgId = findMediaId(c.imageKey)
    const doc = await payload.create({
      collection: 'categories',
      data: {
        name: c.name,
        slug: c.slug,
        image: imgId || undefined,
      } as any,
      overrideAccess: true,
    })
    categoryMap[c.slug] = String(doc.id)
  }

  // ─── 6. BRANDS & ATTRIBUTES ────────────────────────────────────────────────
  const brandsData = [
    { name: 'Apple', slug: 'apple', featured: true, website: 'https://www.apple.com', description: 'Original Apple iPhones, MacBooks, iPads, Watches & Audio with Official Warranty.' },
    { name: 'Samsung', slug: 'samsung', featured: true, website: 'https://www.samsung.com', description: 'Galaxy S-Series, Z-Fold/Flip and premium ecosystem devices.' },
    { name: 'Sony', slug: 'sony', featured: true, website: 'https://www.sony.com', description: 'Industry benchmark audio gear, PlayStation 5 consoles, and Alpha imaging.' },
    { name: 'Google Pixel', slug: 'google-pixel', featured: true, website: 'https://store.google.com', description: 'Pure Google Android with Tensor AI and computational photography.' },
    { name: 'DJI', slug: 'dji', featured: true, website: 'https://www.dji.com', description: 'World standard aerial drones, Osmo gimbals, and stabilization systems.' },
    { name: 'Anker', slug: 'anker', featured: true, website: 'https://www.anker.com', description: 'Global leader in GaN fast charging, high-capacity power banks, and cables.' },
    { name: 'Bose', slug: 'bose', featured: true, website: 'https://www.bose.com', description: 'Acoustic Noise Cancelling headphones and immersive home sound.' },
    { name: 'Marshall', slug: 'marshall', featured: true, website: 'https://www.marshallheadphones.com', description: 'Iconic vintage British audio amplification, home speakers, and earbuds.' },
    { name: 'OnePlus', slug: 'oneplus', featured: true, website: 'https://www.oneplus.com', description: 'Fast and Smooth smartphones with Hasselblad camera systems.' },
    { name: 'Xiaomi', slug: 'xiaomi', featured: true, website: 'https://www.mi.com', description: 'Smart living ecosystem, Leica camera flagships, and smart appliances.' },
    { name: 'Asus ROG', slug: 'asus-rog', featured: true, website: 'https://rog.asus.com', description: 'Republic of Gamers — highest tier gaming laptops and handhelds.' },
    { name: 'TP-Link', slug: 'tp-link', featured: true, website: 'https://www.tp-link.com', description: 'Deco Mesh Wi-Fi 6, smart routers, and seamless home connectivity.' },
    { name: 'Dyson', slug: 'dyson', featured: true, website: 'https://www.dyson.com', description: 'Laser detect slim vacuums, air purifiers, and intelligent home appliances.' },
  ]

  const brandMap: Record<string, string> = {}
  for (const b of brandsData) {
    const doc = await payload.create({
      collection: 'brands',
      data: b as any,
      overrideAccess: true,
    })
    brandMap[b.slug] = String(doc.id)
  }

  // Specifications, Series, and Feature Attributes
  const attributesData = [
    // ── Display & Screen ──
    {
      label: 'Display Screen Size',
      key: 'screen_size',
      slug: 'screen-size',
      dataType: 'text',
      category: 'specification',
      unit: 'inch',
      defaultGroup: 'Display',
      isFilterable: true,
      isComparable: true,
      displayOrder: 1,
    },
    {
      label: 'Display Panel Type',
      key: 'display_tech',
      slug: 'display-tech',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Display',
      isFilterable: true,
      isComparable: true,
      displayOrder: 2,
      options: [
        { label: 'Super Retina XDR OLED (ProMotion)', value: 'ltpo-retina-xdr' },
        { label: 'Dynamic AMOLED 2X', value: 'dynamic-amoled-2x' },
        { label: 'Super AMOLED', value: 'super-amoled' },
        { label: 'LTPO OLED Retina', value: 'ltpo-oled' },
        { label: 'Liquid Retina XDR Mini-LED', value: 'liquid-retina-xdr' },
        { label: 'Liquid Retina IPS', value: 'liquid-retina-ips' },
        { label: 'Ultra Retina XDR Tandem OLED', value: 'tandem-oled' },
        { label: 'Mini-LED 240Hz Nebula HDR', value: 'nebula-hdr-mini-led' },
        { label: '4K OLED Cognitive XR', value: '4k-xr-oled' },
        { label: '4K UHD HDR10+ / Dolby Vision', value: '4k-uhd-dolby' },
      ],
    },
    {
      label: 'Screen Refresh Rate',
      key: 'refresh_rate',
      slug: 'refresh-rate',
      dataType: 'select',
      category: 'specification',
      unit: 'Hz',
      defaultGroup: 'Display',
      isFilterable: true,
      isComparable: true,
      displayOrder: 3,
      options: [
        { label: '240Hz Extreme Gaming', value: '240hz' },
        { label: '144Hz Ultra Smooth', value: '144hz' },
        { label: '120Hz ProMotion / Adaptive', value: '120hz' },
        { label: '90Hz High Refresh', value: '90hz' },
        { label: '60Hz Standard', value: '60hz' },
      ],
    },
    {
      label: 'Display Resolution',
      key: 'display_resolution',
      slug: 'display-resolution',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Display',
      isFilterable: true,
      isComparable: true,
      displayOrder: 4,
      options: [
        { label: '3840 x 2160 (4K UHD)', value: '4k-uhd' },
        { label: '3456 x 2234 Liquid Retina XDR', value: '3456x2234' },
        { label: '3120 x 1440 (Quad HD+)', value: 'qhd-plus' },
        { label: '2868 x 1320 Super Retina XDR', value: 'iphone-16-pro-max-res' },
        { label: '2560 x 1600 (WQXGA 2.5K)', value: '2-5k-res' },
        { label: '1280 x 800 (Handheld HD)', value: '800p-handheld' },
      ],
    },

    // ── Processor & Computing ──
    {
      label: 'Processor / Chipset',
      key: 'processor',
      slug: 'processor',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Performance',
      isFilterable: true,
      isComparable: true,
      displayOrder: 5,
      options: [
        { label: 'Apple A18 Pro (3nm)', value: 'apple-a18-pro' },
        { label: 'Apple A18 (3nm)', value: 'apple-a18' },
        { label: 'Snapdragon 8 Gen 3 for Galaxy', value: 'snapdragon-8-gen-3' },
        { label: 'Google Tensor G4 (Titan M2)', value: 'google-tensor-g4' },
        { label: 'Apple M4 (Tandem Neural Engine)', value: 'apple-m4' },
        { label: 'Apple M3 Max (16-Core CPU, 40-Core GPU)', value: 'apple-m3-max' },
        { label: 'Apple M3 (8-Core CPU, 10-Core GPU)', value: 'apple-m3' },
        { label: 'Apple M2 (8-Core CPU, 10-Core GPU)', value: 'apple-m2' },
        { label: 'Intel Core i9-14900HX', value: 'intel-i9-14900hx' },
        { label: 'Intel Core Ultra 9', value: 'intel-ultra-9' },
        { label: 'AMD Custom 6nm Zen 2 "Van Gogh"', value: 'amd-van-gogh' },
        { label: 'Sony Custom AMD Zen 2 (3.5GHz 8-Core)', value: 'sony-ps5-zen2' },
        { label: 'Apple S9 SiP (Dual-Core)', value: 'apple-s9-sip' },
        { label: 'Apple S10 SiP (64-Bit)', value: 'apple-s10-sip' },
        { label: 'Exynos W1000 (3nm Penta-Core)', value: 'exynos-w1000' },
      ],
    },
    {
      label: 'Processor (CPU)',
      key: 'cpu',
      slug: 'cpu',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Performance',
      isFilterable: true,
      isComparable: true,
      displayOrder: 6,
      options: [
        { label: 'Apple M4 (Tandem Neural Engine)', value: 'apple-m4' },
        { label: 'Apple M3 Max (16-Core)', value: 'apple-m3-max' },
        { label: 'Apple M3 (8-Core)', value: 'apple-m3' },
        { label: 'Apple M2 (8-Core)', value: 'apple-m2' },
        { label: 'Intel Core i9-14900HX (24 Cores, 32 Threads)', value: 'intel-i9-14900hx' },
        { label: 'Intel Core Ultra 9', value: 'intel-ultra-9' },
        { label: 'AMD Zen 2 APU', value: 'amd-van-gogh' },
      ],
    },
    {
      label: 'Graphics Processor (GPU)',
      key: 'gpu',
      slug: 'gpu',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Performance',
      isFilterable: true,
      isComparable: true,
      displayOrder: 7,
      options: [
        { label: 'Apple 40-Core Metal GPU (Hardware Ray Tracing)', value: 'apple-40core-gpu' },
        { label: 'Apple 10-Core Metal GPU', value: 'apple-10core-gpu' },
        { label: 'NVIDIA GeForce RTX 4090 16GB GDDR6 (175W)', value: 'rtx-4090' },
        { label: 'Custom RDNA 2 (10.3 TFLOPs)', value: 'custom-rdna2-10tflops' },
        { label: 'AMD RDNA 2 (8 CUs, 1.6GHz)', value: 'amd-rdna2-8cu' },
        { label: 'Adreno 750 (Hardware Ray Tracing)', value: 'adreno-750' },
        { label: 'Apple 6-Core Pro GPU', value: 'apple-6core-pro-gpu' },
      ],
    },
    {
      label: 'RAM Capacity',
      key: 'ram',
      slug: 'ram',
      dataType: 'select',
      category: 'specification',
      unit: 'GB',
      defaultGroup: 'Performance',
      isFilterable: true,
      isComparable: true,
      displayOrder: 8,
      options: [
        { label: '8 GB LPDDR5X', value: '8gb' },
        { label: '12 GB LPDDR5X', value: '12gb' },
        { label: '16 GB Unified / LPDDR5X', value: '16gb' },
        { label: '24 GB Unified Memory', value: '24gb' },
        { label: '32 GB DDR5-5600', value: '32gb' },
        { label: '36 GB Unified Memory (300GB/s)', value: '36gb' },
        { label: '48 GB Unified Memory', value: '48gb' },
        { label: '64 GB DDR5-5600', value: '64gb' },
      ],
    },
    {
      label: 'Internal Storage',
      key: 'storage',
      slug: 'storage',
      dataType: 'select',
      category: 'specification',
      unit: 'GB',
      defaultGroup: 'Storage',
      isFilterable: true,
      isComparable: true,
      displayOrder: 9,
      options: [
        { label: '128 GB NVMe / UFS 4.0', value: '128gb' },
        { label: '256 GB NVMe / UFS 4.0', value: '256gb' },
        { label: '512 GB NVMe / UFS 4.0', value: '512gb' },
        { label: '1 TB NVMe / UFS 4.0', value: '1tb' },
        { label: '2 TB NVMe SSD', value: '2tb' },
        { label: '512 GB PCIe 4.0 SSD', value: '512gb-ssd' },
        { label: '1 TB PCIe 4.0 NVMe SSD', value: '1tb-ssd' },
        { label: '2 TB PCIe 4.0 NVMe SSD', value: '2tb-ssd' },
      ],
    },

    // ── Battery & Power ──
    {
      label: 'Battery Capacity',
      key: 'battery_capacity',
      slug: 'battery-capacity',
      dataType: 'select',
      category: 'specification',
      unit: 'mAh',
      defaultGroup: 'Battery & Charging',
      isFilterable: true,
      isComparable: true,
      displayOrder: 10,
      options: [
        { label: '3,561 mAh', value: '3561mah' },
        { label: '4,685 mAh', value: '4685mah' },
        { label: '5,000 mAh', value: '5000mah' },
        { label: '5,060 mAh', value: '5060mah' },
        { label: '5,400 mAh', value: '5400mah' },
        { label: '10,000 mAh', value: '10000mah' },
        { label: '20,000 mAh', value: '20000mah' },
        { label: '24,000 mAh', value: '24000mah' },
        { label: '27,650 mAh', value: '27650mah' },
        { label: '30,000 mAh', value: '30000mah' },
      ],
    },
    {
      label: 'Battery Capacity',
      key: 'capacity',
      slug: 'capacity',
      dataType: 'select',
      category: 'specification',
      unit: 'mAh',
      defaultGroup: 'Battery & Charging',
      isFilterable: true,
      isComparable: true,
      displayOrder: 11,
      options: [
        { label: '10,000 mAh', value: '10000mah' },
        { label: '20,000 mAh', value: '20000mah' },
        { label: '24,000 mAh', value: '24000mah' },
        { label: '27,650 mAh', value: '27650mah' },
        { label: '30,000 mAh', value: '30000mah' },
      ],
    },
    {
      label: 'Battery Cell Type',
      key: 'battery_type',
      slug: 'battery-type',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Battery & Charging',
      isFilterable: true,
      isComparable: true,
      displayOrder: 12,
      options: [
        { label: 'Lithium-Polymer (Li-Po)', value: 'lithium-polymer' },
        { label: 'Lithium-Ion (Li-Ion 21700 High Density)', value: 'lithium-ion' },
      ],
    },
    {
      label: 'Total Power Output',
      key: 'total_output',
      slug: 'total-output',
      dataType: 'text',
      category: 'specification',
      unit: 'W',
      defaultGroup: 'Battery & Charging',
      isFilterable: true,
      isComparable: true,
      displayOrder: 13,
    },
    {
      label: 'Fast Charging Standard',
      key: 'fast_charging_tech',
      slug: 'fast-charging-tech',
      dataType: 'select',
      category: 'feature',
      defaultGroup: 'Battery & Charging',
      isFilterable: true,
      isComparable: true,
      displayOrder: 14,
      options: [
        { label: 'USB Power Delivery 3.1 (PD 3.1 EPR)', value: 'power-delivery' },
        { label: 'Anker GaNPrime / GaNFast 2.0', value: 'gan-prime' },
        { label: '100W SuperVOOC / HyperCharge', value: 'quick-charge' },
        { label: 'Qi2 Magnetic 15W Wireless', value: 'qi2-wireless' },
        { label: 'MagSafe Wireless Charging', value: 'magsafe' },
      ],
    },
    {
      label: 'Fast Charging Wattage',
      key: 'charging_wattage',
      slug: 'charging-wattage',
      dataType: 'text',
      category: 'specification',
      unit: 'W',
      defaultGroup: 'Battery & Charging',
      isFilterable: true,
      isComparable: true,
      displayOrder: 15,
    },
    {
      label: 'Battery Playtime / Runtime',
      key: 'battery_life',
      slug: 'battery-life',
      dataType: 'text',
      category: 'specification',
      unit: 'hrs',
      defaultGroup: 'Battery & Power',
      isFilterable: true,
      isComparable: true,
      displayOrder: 16,
    },

    // ── Connectivity & System ──
    {
      label: 'Cellular Connectivity',
      key: 'cellular_network',
      slug: 'cellular-network',
      dataType: 'select',
      category: 'connectivity',
      defaultGroup: 'Connectivity',
      isFilterable: true,
      isComparable: true,
      displayOrder: 17,
      options: [
        { label: '5G Sub-6 / mmWave (Dual eSIM / Physical)', value: '5g' },
        { label: '4G LTE Advanced', value: '4g-lte' },
        { label: 'Wi-Fi Only (Non-Cellular)', value: 'wifi-only' },
      ],
    },
    {
      label: 'Wireless Connectivity',
      key: 'connectivity',
      slug: 'wireless-connectivity',
      dataType: 'select',
      category: 'connectivity',
      defaultGroup: 'Connectivity',
      isFilterable: true,
      isComparable: true,
      displayOrder: 18,
      options: [
        { label: 'Bluetooth 5.4 + Wi-Fi 7 (802.11be)', value: 'bluetooth-5-4' },
        { label: 'Bluetooth 5.3 + Wi-Fi 6E', value: 'bluetooth-5-3' },
        { label: 'Bluetooth 5.2 (LDAC / AAC)', value: 'bluetooth-5-2' },
        { label: 'Wired 3.5mm / USB-C Lossless', value: 'wired-3-5mm' },
      ],
    },
    {
      label: 'Operating System',
      key: 'operating_system',
      slug: 'operating-system',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'System',
      isFilterable: true,
      isComparable: true,
      displayOrder: 19,
      options: [
        { label: 'iOS 18', value: 'ios-18' },
        { label: 'Android 14 (One UI 6.1 / Pixel UI / HyperOS / OxygenOS)', value: 'android-14' },
        { label: 'iPadOS 18', value: 'ipados-18' },
        { label: 'macOS Sonoma', value: 'macos-sonoma' },
        { label: 'Windows 11 Pro 64-Bit', value: 'win-11-pro' },
        { label: 'watchOS 11', value: 'watchos-11' },
        { label: 'Wear OS 5 (One UI Watch 6)', value: 'wearos-5' },
        { label: 'Google TV (Android TV 12)', value: 'google-tv' },
        { label: 'tvOS 18', value: 'tvos-18' },
        { label: 'SteamOS 3.5 (Arch Linux)', value: 'steamos-3' },
        { label: 'PlayStation 5 Custom OS', value: 'ps5-os' },
      ],
    },

    // ── Audio & Acoustics ──
    {
      label: 'Headphone Form Factor',
      key: 'type',
      slug: 'headphone-form-factor',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Audio',
      isFilterable: true,
      isComparable: true,
      displayOrder: 20,
      options: [
        { label: 'In-Ear True Wireless Stereo (TWS)', value: 'in-ear' },
        { label: 'Over-Ear Circumaural (Plush Cushions)', value: 'over-ear' },
        { label: 'On-Ear Portable', value: 'on-ear' },
        { label: 'Stereo Desktop / Portable Speaker', value: 'speaker' },
      ],
    },
    {
      label: 'Active Noise Cancellation',
      key: 'noise_cancellation',
      slug: 'noise-cancellation',
      dataType: 'select',
      category: 'feature',
      defaultGroup: 'Audio',
      isFilterable: true,
      isComparable: true,
      displayOrder: 21,
      options: [
        { label: 'Pro-Grade Active Noise Cancellation (ANC)', value: 'anc' },
        { label: 'Adaptive Audio & Transparency Mode', value: 'adaptive-anc' },
        { label: 'Dual-Chip 50dB Hybrid ANC', value: '50db-hybrid-anc' },
        { label: 'Passive Acoustic Isolation', value: 'none' },
      ],
    },

    // ── Durability & Build ──
    {
      label: 'Water & Dust Resistance',
      key: 'water_resistance',
      slug: 'water-resistance-spec',
      dataType: 'select',
      category: 'certification',
      defaultGroup: 'Durability',
      isFilterable: true,
      isComparable: true,
      displayOrder: 22,
      options: [
        { label: 'IP68 Dust & Water Resistant (6m / 30 mins)', value: 'ip68' },
        { label: 'IP67 Waterproof & Dustproof (1m submersible)', value: 'ip67' },
        { label: 'IP54 Splash, Dust & Sweat Resistant', value: 'ip54' },
        { label: 'IPX4 Sweat Resistant', value: 'ipx4' },
        { label: '100m / 10ATM & EN13319 (40m Recreational Diving)', value: '100m-dive' },
        { label: '50m / 5ATM Water Resistant (Pool Swimming)', value: '50m-swim' },
        { label: 'Not Rated / Indoor Use', value: 'none' },
      ],
    },
    {
      label: 'Display Panel Type',
      key: 'display_type',
      slug: 'smartwatch-display-type',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Display',
      isFilterable: true,
      isComparable: true,
      displayOrder: 23,
      options: [
        { label: 'LTPO OLED Retina (3000 nits Peak)', value: 'ltpo-oled' },
        { label: 'Super AMOLED Sapphire Crystal (2000 nits)', value: 'super-amoled' },
      ],
    },
    {
      label: 'Case Enclosure Material',
      key: 'case_material',
      slug: 'case-material',
      dataType: 'select',
      category: 'material',
      defaultGroup: 'Design',
      isFilterable: true,
      isComparable: true,
      displayOrder: 24,
      options: [
        { label: 'Aerospace Grade 5 Titanium', value: 'aerospace-titanium' },
        { label: '100% Recycled Aerospace Aluminum', value: 'recycled-aluminum' },
        { label: 'Stainless Steel & Ceramic', value: 'stainless-ceramic' },
        { label: 'High-Impact Reinforced Polycarbonate', value: 'polycarbonate' },
      ],
    },

    // ── Camera, Drone & Optics ──
    {
      label: 'Camera Sensor Size',
      key: 'sensor_size',
      slug: 'sensor-size',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Camera & Optics',
      isFilterable: true,
      isComparable: true,
      displayOrder: 25,
      options: [
        { label: '1-inch CMOS Sensor', value: '1-inch-cmos' },
        { label: '1/1.3-inch CMOS Dual Native ISO Fusion', value: '1-1.3-cmos' },
        { label: '1/1.28-inch Ultra Sensing Quad-Bayer', value: '1-1.28-cmos' },
      ],
    },
    {
      label: 'Max Video Recording',
      key: 'video_resolution',
      slug: 'video-resolution',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Camera & Optics',
      isFilterable: true,
      isComparable: true,
      displayOrder: 26,
      options: [
        { label: '8K at 30fps / 4K at 120fps ProRes', value: '8k30-4k120' },
        { label: '4K at 120fps Slow-Mo & 10-bit D-Log M', value: '4k120-dlog' },
        { label: '4K at 60fps HDR True Vertical Shooting', value: '4k60-hdr' },
        { label: '4K at 60fps Dolby Vision HDR', value: '4k60-dolby' },
      ],
    },
    {
      label: 'Gimbal Stabilization',
      key: 'gimbal_stabilization',
      slug: 'gimbal-stabilization',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Camera & Optics',
      isFilterable: true,
      isComparable: true,
      displayOrder: 27,
      options: [
        { label: '3-Axis Mechanical Gimbal + Omnidirectional Sensing', value: '3axis-omni' },
        { label: '3-Axis Mechanical Handheld Gimbal', value: '3axis-handheld' },
        { label: 'Sensor-Shift Optical Image Stabilization (OIS)', value: 'sensor-shift-ois' },
      ],
    },

    // ── Smart Home & Appliances ──
    {
      label: 'Vacuum Suction Power',
      key: 'suction_power',
      slug: 'suction-power',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Cleaning & Motor',
      isFilterable: true,
      isComparable: true,
      displayOrder: 28,
      options: [
        { label: '6,000 Pa Extreme Suction', value: '6000pa' },
        { label: '150 AW Dyson Hyperdymium Motor', value: '150aw' },
      ],
    },
    {
      label: 'Navigation & Sensor Tech',
      key: 'nav_technology',
      slug: 'nav-technology',
      dataType: 'select',
      category: 'specification',
      defaultGroup: 'Navigation & Smart Features',
      isFilterable: true,
      isComparable: true,
      displayOrder: 29,
      options: [
        { label: 'LDS Laser Navigation + Dual-Line Structured Light', value: 'lds-structured-light' },
        { label: 'Piezo Particle Sensor & Laser Slim Fluffy', value: 'piezo-laser' },
        { label: 'AI Roaming & Whole-Home Mesh Algorithm', value: 'mesh-ai-roaming' },
      ],
    },

    // ── Strategic Series & Badges ──
    {
      label: 'Pro Max Series',
      key: 'series-pro-max',
      slug: 'pro-max-series',
      dataType: 'select',
      category: 'series',
      defaultGroup: 'General',
      isFilterable: true,
      isComparable: true,
      options: [
        { label: 'iPhone 16 Pro Max Edition', value: 'iphone-16-pro-max' },
        { label: 'iPhone 15 Pro Max Edition', value: 'iphone-15-pro-max' },
      ],
    },
    {
      label: 'Ultra Series',
      key: 'series-ultra',
      slug: 'ultra-series',
      dataType: 'select',
      category: 'series',
      defaultGroup: 'General',
      isFilterable: true,
      isComparable: true,
      options: [
        { label: 'Galaxy S24 Ultra Titanium Flagship', value: 'galaxy-s24-ultra' },
        { label: 'Apple Watch Ultra 2 Rugged GPS + Cellular', value: 'apple-watch-ultra-2' },
      ],
    },
    {
      label: 'M3 Silicon Series',
      key: 'series-m3-silicon',
      slug: 'm3-silicon-series',
      dataType: 'select',
      category: 'series',
      defaultGroup: 'General',
      isFilterable: true,
      isComparable: true,
      options: [
        { label: 'Apple M3 Architecture', value: 'm3' },
        { label: 'Apple M3 Pro Architecture', value: 'm3-pro' },
        { label: 'Apple M3 Max Architecture', value: 'm3-max' },
      ],
    },
    {
      label: 'GaNPrime Series',
      key: 'series-ganprime',
      slug: 'ganprime-series',
      dataType: 'select',
      category: 'series',
      defaultGroup: 'General',
      isFilterable: true,
      isComparable: true,
      options: [
        { label: 'Anker GaNPrime 65W Multi-Port', value: 'ganprime-65w' },
        { label: 'Anker GaNPrime 100W Ultra-Fast', value: 'ganprime-100w' },
        { label: 'Anker GaNPrime 140W Hyper-Speed', value: 'ganprime-140w' },
      ],
    },
    {
      label: 'Bravia XR Series',
      key: 'series-bravia-xr',
      slug: 'bravia-xr-series',
      dataType: 'select',
      category: 'series',
      defaultGroup: 'General',
      isFilterable: true,
      isComparable: true,
      options: [
        { label: 'Bravia XR Cognitive Processor Master Series', value: 'bravia-xr-master' },
        { label: 'Bravia XR Cognitive Processor Cinema Series', value: 'bravia-xr-cinema' },
      ],
    },

    // ── Boolean Hardware Flags ──
    { label: '5G Cellular Support', key: 'conn-5g', slug: '5g-cellular', dataType: 'boolean', category: 'connectivity', defaultGroup: 'Connectivity', isFilterable: true, isComparable: true },
    { label: '120Hz ProMotion OLED', key: 'spec-120hz-oled', slug: '120hz-oled', dataType: 'boolean', category: 'specification', defaultGroup: 'Display', isFilterable: true, isComparable: true },
    { label: 'Active Noise Cancellation', key: 'feat-anc', slug: 'active-noise-cancelling', dataType: 'boolean', category: 'feature', defaultGroup: 'Audio', isFilterable: true, isComparable: true },
    { label: 'Aerospace Grade Titanium', key: 'mat-titanium', slug: 'aerospace-titanium', dataType: 'boolean', category: 'material', defaultGroup: 'Design', isFilterable: true, isComparable: true },
    { label: 'IP68 Certified Water Resistance', key: 'cert-ip68', slug: 'ip68-water-resistant', dataType: 'boolean', category: 'certification', defaultGroup: 'Durability', isFilterable: true, isComparable: true },
    { label: 'Wireless Qi / MagSafe Support', key: 'feat-wireless-charging', slug: 'wireless-charging-support', dataType: 'boolean', category: 'feature', defaultGroup: 'Battery & Charging', isFilterable: true, isComparable: true },
  ]

  const attributeMap: Record<string, string> = {}
  const attrLabelMap: Record<string, string> = {}
  const attrUnitMap: Record<string, string> = {}
  const attrGroupMap: Record<string, string> = {}
  for (const a of attributesData) {
    const doc = await payload.create({
      collection: 'attributes',
      data: a as any,
      overrideAccess: true,
    })
    const docId = String(doc.id)
    attributeMap[a.slug] = docId
    if (a.key) attributeMap[a.key] = docId
    const labelStr = typeof a.label === 'string' ? a.label : (a.label as any)?.en || a.key || a.slug
    attrLabelMap[a.key || a.slug] = labelStr
    if (a.unit) attrUnitMap[a.key || a.slug] = a.unit
    if (a.defaultGroup) attrGroupMap[a.key || a.slug] = a.defaultGroup
  }

  // ─── 6.5. PRODUCT CLASSES (Specification Templates / Attribute Sets) ──────
  const classesData = [
    {
      name: 'Power Bank & GaN Charger',
      slug: 'power-bank',
      icon: 'battery',
      description:
        'Portable external battery packs, MagSafe wireless chargers, and fast-charge GaN wall adapters.',
      groups: [
        {
          name: 'Battery & Capacity',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['capacity'] || attributeMap['battery_capacity'], isRequired: false, displayOrder: 1 },
            { attribute: attributeMap['battery_type'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Power & Fast Charging',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['total_output'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['fast_charging_tech'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Smartphone & Mobile Device',
      slug: 'smartphone',
      icon: 'smartphone',
      description: 'Flagship and premium smartphones, Android & iOS devices.',
      groups: [
        {
          name: 'Display & Visuals',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['screen_size'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['display_tech'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['refresh_rate'], isRequired: false, displayOrder: 3 },
            { attribute: attributeMap['display_resolution'], isRequired: false, displayOrder: 4 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Performance & Hardware',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['processor'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['ram'], isRequired: true, displayOrder: 2 },
            { attribute: attributeMap['storage'], isRequired: true, displayOrder: 3 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Battery & Power',
          displayOrder: 3,
          attributes: [
            { attribute: attributeMap['battery_capacity'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['charging_wattage'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['fast_charging_tech'], isRequired: false, displayOrder: 3 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Connectivity & Durability',
          displayOrder: 4,
          attributes: [
            { attribute: attributeMap['cellular_network'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['operating_system'], isRequired: true, displayOrder: 2 },
            { attribute: attributeMap['water_resistance'], isRequired: false, displayOrder: 3 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Headphones & Acoustics',
      slug: 'headphones',
      icon: 'headphones',
      description:
        'Over-ear headphones, noise cancelling acoustics, true wireless stereo (TWS) earbuds, and home speakers.',
      groups: [
        {
          name: 'Acoustics & Form Factor',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['type'] || attributeMap['headphone-form-factor'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['noise_cancellation'], isRequired: true, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Battery & Connectivity',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['connectivity'] || attributeMap['wireless-connectivity'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['battery_life'], isRequired: true, displayOrder: 2 },
            { attribute: attributeMap['water_resistance'], isRequired: false, displayOrder: 3 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Laptop & Computer',
      slug: 'laptop',
      icon: 'laptop',
      description: 'Pro laptops, MacBooks, creator workstations, and tablets.',
      groups: [
        {
          name: 'Display & Visuals',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['screen_size'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['display_tech'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['refresh_rate'], isRequired: false, displayOrder: 3 },
            { attribute: attributeMap['display_resolution'], isRequired: false, displayOrder: 4 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Processor & Memory',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['cpu'] || attributeMap['processor'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['gpu'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['ram'], isRequired: true, displayOrder: 3 },
            { attribute: attributeMap['storage'], isRequired: true, displayOrder: 4 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'System & Connectivity',
          displayOrder: 3,
          attributes: [
            { attribute: attributeMap['operating_system'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['connectivity'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Battery & Power',
          displayOrder: 4,
          attributes: [
            { attribute: attributeMap['battery_life'], isRequired: false, displayOrder: 1 },
            { attribute: attributeMap['charging_wattage'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Smartwatch & Wearable',
      slug: 'smartwatch',
      icon: 'watch',
      description: 'Adventure smartwatches, health trackers, and wearable tech.',
      groups: [
        {
          name: 'Display & Enclosure',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['display_type'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['case_material'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['water_resistance'], isRequired: true, displayOrder: 3 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Battery & Runtime',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['battery_life'], isRequired: true, displayOrder: 1 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'System & Connectivity',
          displayOrder: 3,
          attributes: [
            { attribute: attributeMap['operating_system'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['cellular_network'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Camera, Drone & Optics',
      slug: 'camera-drone',
      icon: 'camera',
      description: 'Aerial drones, 4K/8K action and pocket gimbal cameras.',
      groups: [
        {
          name: 'Optics & Video',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['video_resolution'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['sensor_size'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['gimbal_stabilization'], isRequired: false, displayOrder: 3 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Battery & Transmission',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['battery_life'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['connectivity'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Smart TV & Living Entertainment',
      slug: 'smart-tv-entertainment',
      icon: 'tv',
      description: '4K OLED & UHD smart televisions, streaming boxes, and home cinema displays.',
      groups: [
        {
          name: 'Display Panel & Picture',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['display_resolution'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['screen_size'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['display_tech'], isRequired: false, displayOrder: 3 },
            { attribute: attributeMap['refresh_rate'], isRequired: false, displayOrder: 4 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'System & Connectivity',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['operating_system'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['connectivity'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Smart Living & Cleaning Appliances',
      slug: 'smart-home-appliance',
      icon: 'home',
      description: 'Robot vacuums, intelligent cordless cleaners, and smart home mesh devices.',
      groups: [
        {
          name: 'Cleaning & Navigation',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['suction_power'], isRequired: false, displayOrder: 1 },
            { attribute: attributeMap['nav_technology'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'Battery & Connectivity',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['battery_life'], isRequired: false, displayOrder: 1 },
            { attribute: attributeMap['connectivity'], isRequired: false, displayOrder: 2 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
    {
      name: 'Gaming Console & Handheld System',
      slug: 'gaming-console',
      icon: 'gamepad',
      description: 'Home next-gen consoles, handheld PC gaming systems, and gaming platforms.',
      groups: [
        {
          name: 'Hardware & Compute',
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap['processor'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['gpu'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['ram'], isRequired: true, displayOrder: 3 },
            { attribute: attributeMap['storage'], isRequired: true, displayOrder: 4 },
          ].filter((it) => Boolean(it.attribute)),
        },
        {
          name: 'System & Visuals',
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap['operating_system'], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap['refresh_rate'], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap['video_resolution'], isRequired: false, displayOrder: 3 },
            { attribute: attributeMap['connectivity'], isRequired: false, displayOrder: 4 },
          ].filter((it) => Boolean(it.attribute)),
        },
      ],
    },
  ]

  const classMap: Record<string, string> = {}
  const classParamsMap: Record<string, Record<string, { label: string; unit: string; group: string }>> = {}
  for (const c of classesData) {
    const doc = await payload.create({
      collection: 'classes',
      data: c as any,
      overrideAccess: true,
    })
    classMap[c.slug] = String(doc.id)
    classParamsMap[c.slug] = {}
    if (Array.isArray(c.groups)) {
      for (const g of c.groups) {
        if (Array.isArray(g.attributes)) {
          for (const item of g.attributes) {
            for (const [key, id] of Object.entries(attributeMap)) {
              if (id === item.attribute) {
                classParamsMap[c.slug][key] = {
                  label: attrLabelMap[key] || key,
                  unit: attrUnitMap[key] || '',
                  group: typeof g.name === 'string' ? g.name : ((g.name as any)?.en || 'General'),
                }
              }
            }
          }
        }
      }
    }
  }

  // ─── 7. 38 FLAGSHIP PRODUCTS WITH VARIANTS & MEDIA IMAGES ──────────────────
  interface ProductSeedDef {
    name: string
    slug: string
    categorySlug: string
    brandSlug: string
    classSlug?: string
    specifications?: Array<{
      key: string
      value: string
      label?: string
      unit?: string
      group?: string
      isCustom?: boolean
      isAdHoc?: boolean
    }>
    basePrice: number
    compareAtPrice?: number
    saleDisplayMode?: string
    description: string
    featured?: boolean
    imageKey: string
    tags: string[]
    variants: Array<{
      name: string
      price: number
      compareAtPrice?: number
      options: Array<{ name: string; value: string }>
      stockQty: number
    }>
  }

  const productsToSeed: ProductSeedDef[] = [
    // ── PHONES & TABLETS (Apple, Samsung, Pixel, Xiaomi, OnePlus) ──
    {
      name: 'Apple iPhone 16 Pro Max',
      slug: 'apple-iphone-16-pro-max',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '6.9' },
        { key: 'display_tech', value: 'ltpo-retina-xdr' },
        { key: 'refresh_rate', value: '120hz' },
        { key: 'processor', value: 'apple-a18-pro' },
        { key: 'ram', value: '8gb' },
        { key: 'storage', value: '256gb' },
        { key: 'battery_capacity', value: '4685mah' },
        { key: 'charging_wattage', value: '30' },
        { key: 'cellular_network', value: '5g' },
        { key: 'operating_system', value: 'ios-18' },
        { key: 'water_resistance', value: 'ip68' },
        // Ad-hoc Custom Specification
        { key: 'camera_control_btn', label: 'Camera Control Sensor', value: 'Sapphire Crystal Capacitive Switch with Force Sensor', group: 'Advanced Controls', isCustom: true },
        // Ad-hoc Global Attribute
        { key: 'case_material', value: 'aerospace-titanium', group: 'Build & Material', isAdHoc: true },
      ],
      basePrice: 172000,
      compareAtPrice: 185000,
      saleDisplayMode: 'strike_and_badge',
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['iPhone', 'Apple', 'A18 Pro', 'Flagship', '5G', 'Titanium'],
      description: 'Apple iPhone 16 Pro Max featuring grade 5 titanium design, A18 Pro chip, 48MP Fusion camera system with 5x optical telephoto, Camera Control button, and incredible battery life.',
      variants: [
        { name: '256GB / Natural Titanium (Dual eSIM)', price: 172000, compareAtPrice: 185000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Natural Titanium' }, { name: 'SIM', value: 'Dual eSIM' }], stockQty: 18 },
        { name: '256GB / Desert Titanium (Dual eSIM)', price: 174000, compareAtPrice: 188000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Desert Titanium' }, { name: 'SIM', value: 'Dual eSIM' }], stockQty: 22 },
        { name: '512GB / Natural Titanium (Dual eSIM)', price: 198000, compareAtPrice: 210000, options: [{ name: 'Storage', value: '512GB' }, { name: 'Color', value: 'Natural Titanium' }, { name: 'SIM', value: 'Dual eSIM' }], stockQty: 12 },
        { name: '512GB / Black Titanium (Physical Dual SIM)', price: 204000, compareAtPrice: 215000, options: [{ name: 'Storage', value: '512GB' }, { name: 'Color', value: 'Black Titanium' }, { name: 'SIM', value: 'Physical Dual SIM' }], stockQty: 14 },
        { name: '1TB / Desert Titanium (Physical Dual SIM)', price: 228000, compareAtPrice: 245000, options: [{ name: 'Storage', value: '1TB' }, { name: 'Color', value: 'Desert Titanium' }, { name: 'SIM', value: 'Physical Dual SIM' }], stockQty: 8 },
      ],
    },
    {
      name: 'Apple iPhone 16',
      slug: 'apple-iphone-16',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '6.1' },
        { key: 'processor', value: 'apple-a18' },
        { key: 'ram', value: '8gb' },
        { key: 'storage', value: '128gb' },
        { key: 'battery_capacity', value: '3561mah' },
        { key: 'cellular_network', value: '5g' },
        { key: 'operating_system', value: 'ios-18' },
        { key: 'case_material', value: 'recycled-aluminum', group: 'Build & Material', isAdHoc: true },
      ],
      basePrice: 112000,
      compareAtPrice: 120000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['iPhone', 'Apple', 'A18', '5G'],
      description: 'The standard iPhone 16 with Action button, 48MP 2-in-1 Fusion camera, spatial capture, and colorful infused back glass.',
      variants: [
        { name: '128GB / Ultramarine', price: 112000, compareAtPrice: 120000, options: [{ name: 'Storage', value: '128GB' }, { name: 'Color', value: 'Ultramarine' }], stockQty: 20 },
        { name: '128GB / Teal', price: 112000, compareAtPrice: 120000, options: [{ name: 'Storage', value: '128GB' }, { name: 'Color', value: 'Teal' }], stockQty: 15 },
        { name: '256GB / Black', price: 128000, compareAtPrice: 136000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Black' }], stockQty: 18 },
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra 5G',
      slug: 'samsung-galaxy-s24-ultra',
      categorySlug: 'phones-tablets',
      brandSlug: 'samsung',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '6.8' },
        { key: 'display_tech', value: 'dynamic-amoled-2x' },
        { key: 'refresh_rate', value: '120hz' },
        { key: 'processor', value: 'snapdragon-8-gen-3' },
        { key: 'ram', value: '12gb' },
        { key: 'storage', value: '256gb' },
        { key: 'battery_capacity', value: '5000mah' },
        { key: 'cellular_network', value: '5g' },
        { key: 'operating_system', value: 'android-14' },
        { key: 'water_resistance', value: 'ip68' },
        // Ad-hoc Custom Specification
        { key: 'spen_latency', label: 'S-Pen Digitizer Latency', value: '2.8ms Ultra-Low Latency', unit: 'ms', group: 'Productivity & Pen', isCustom: true },
        // Ad-hoc Global Attribute
        { key: 'case_material', value: 'aerospace-titanium', group: 'Build & Material', isAdHoc: true },
      ],
      basePrice: 148000,
      compareAtPrice: 162000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['Samsung', 'Galaxy AI', 'Snapdragon 8 Gen 3', 'S-Pen', '200MP'],
      description: 'Samsung Galaxy S24 Ultra with Galaxy AI, titanium frame, flat Dynamic AMOLED 2X 120Hz display, and built-in S Pen.',
      variants: [
        { name: '12GB/256GB / Titanium Gray', price: 148000, compareAtPrice: 162000, options: [{ name: 'RAM/Storage', value: '12GB/256GB' }, { name: 'Color', value: 'Titanium Gray' }], stockQty: 16 },
        { name: '12GB/256GB / Titanium Black', price: 148000, compareAtPrice: 162000, options: [{ name: 'RAM/Storage', value: '12GB/256GB' }, { name: 'Color', value: 'Titanium Black' }], stockQty: 14 },
        { name: '12GB/512GB / Titanium Violet', price: 165000, compareAtPrice: 178000, options: [{ name: 'RAM/Storage', value: '12GB/512GB' }, { name: 'Color', value: 'Titanium Violet' }], stockQty: 10 },
      ],
    },
    {
      name: 'Google Pixel 9 Pro XL',
      slug: 'google-pixel-9-pro-xl',
      categorySlug: 'phones-tablets',
      brandSlug: 'google-pixel',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '6.8' },
        { key: 'display_tech', value: 'ltpo-oled' },
        { key: 'refresh_rate', value: '120hz' },
        { key: 'processor', value: 'google-tensor-g4' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '128gb' },
        { key: 'battery_capacity', value: '5060mah' },
        { key: 'cellular_network', value: '5g' },
        { key: 'operating_system', value: 'android-14' },
        { key: 'water_resistance', value: 'ip68' },
        // Ad-hoc Custom Specification
        { key: 'ai_coprocessor', label: 'AI Tensor Processing', value: 'Gemini Nano On-Device Multimodal Engine', group: 'AI & Intelligence', isCustom: true },
      ],
      basePrice: 135000,
      compareAtPrice: 145000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['Google', 'Pixel', 'Tensor G4', 'AI', 'Pure Android'],
      description: 'Google Pixel 9 Pro XL featuring Google Tensor G4, Super Actua display, pro triple camera system with 8K Video Boost.',
      variants: [
        { name: '16GB/128GB / Obsidian', price: 135000, compareAtPrice: 145000, options: [{ name: 'RAM/Storage', value: '16GB/128GB' }, { name: 'Color', value: 'Obsidian' }], stockQty: 12 },
        { name: '16GB/256GB / Porcelain', price: 148000, compareAtPrice: 158000, options: [{ name: 'RAM/Storage', value: '16GB/256GB' }, { name: 'Color', value: 'Porcelain' }], stockQty: 14 },
      ],
    },
    {
      name: 'Xiaomi 14 Ultra 5G (Leica Optics)',
      slug: 'xiaomi-14-ultra-5g',
      categorySlug: 'phones-tablets',
      brandSlug: 'xiaomi',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '6.73' },
        { key: 'processor', value: 'snapdragon-8-gen-3' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '512gb' },
        { key: 'battery_capacity', value: '5000mah' },
        { key: 'cellular_network', value: '5g' },
        { key: 'operating_system', value: 'android-14' },
      ],
      basePrice: 135000,
      compareAtPrice: 148000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['Xiaomi', 'Leica', 'Snapdragon 8 Gen 3', 'Photography'],
      description: 'The pinnacle of mobile photography: Leica Quad 50MP optical system, stepless variable aperture, 2K AMOLED C8 display, and 90W HyperCharge.',
      variants: [
        { name: '16GB/512GB / Black Leather', price: 135000, compareAtPrice: 148000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'Black Vegan Leather' }], stockQty: 12 },
        { name: '16GB/512GB / White Ceramic', price: 138000, compareAtPrice: 152000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'White Ceramic' }], stockQty: 8 },
      ],
    },
    {
      name: 'OnePlus 12 5G (Hasselblad Camera)',
      slug: 'oneplus-12-5g',
      categorySlug: 'phones-tablets',
      brandSlug: 'oneplus',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '6.82' },
        { key: 'processor', value: 'snapdragon-8-gen-3' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '512gb' },
        { key: 'battery_capacity', value: '5000mah' },
        { key: 'cellular_network', value: '5g' },
        { key: 'operating_system', value: 'android-14' },
      ],
      basePrice: 92000,
      compareAtPrice: 99000,
      imageKey: 'category-electronics-1',
      tags: ['OnePlus', 'Snapdragon 8 Gen 3', 'Hasselblad', '100W SuperVOOC'],
      description: 'Smooth beyond belief: Snapdragon 8 Gen 3, 4th Gen Hasselblad Camera with 64MP 3x periscope, 2K 120Hz ProXDR display, and 5400mAh battery.',
      variants: [
        { name: '16GB/512GB / Flowy Emerald', price: 92000, compareAtPrice: 99000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'Flowy Emerald' }], stockQty: 15 },
        { name: '16GB/512GB / Silky Black', price: 92000, compareAtPrice: 99000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'Silky Black' }], stockQty: 18 },
      ],
    },
    {
      name: 'Google Pixel 8a (AI Magic)',
      slug: 'google-pixel-8a',
      categorySlug: 'phones-tablets',
      brandSlug: 'google-pixel',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '6.1' },
        { key: 'processor', value: 'google-tensor-g4' },
        { key: 'ram', value: '8gb' },
        { key: 'storage', value: '128gb' },
        { key: 'battery_capacity', value: '4685mah' },
        { key: 'cellular_network', value: '5g' },
        { key: 'operating_system', value: 'android-14' },
      ],
      basePrice: 58000,
      compareAtPrice: 64000,
      imageKey: 'category-electronics-1',
      tags: ['Google Pixel', 'Tensor G3', 'Best Take', 'Budget Flagship'],
      description: 'Delightful Google AI experiences at an accessible price: Tensor G3, Actua 120Hz display, Best Take, Magic Editor, and 7 years of software support.',
      variants: [
        { name: '8GB/128GB / Bay Blue', price: 58000, compareAtPrice: 64000, options: [{ name: 'Color', value: 'Bay Blue' }], stockQty: 16 },
        { name: '8GB/128GB / Obsidian', price: 58000, compareAtPrice: 64000, options: [{ name: 'Color', value: 'Obsidian' }], stockQty: 14 },
      ],
    },
    {
      name: 'Apple iPad Pro 13" (M4 Chip)',
      slug: 'apple-ipad-pro-13-m4',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '13.0' },
        { key: 'display_tech', value: 'tandem-oled' },
        { key: 'refresh_rate', value: '120hz' },
        { key: 'processor', value: 'apple-m4' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '256gb' },
        { key: 'battery_capacity', value: '10000mah' },
        { key: 'charging_wattage', value: '30' },
        { key: 'cellular_network', value: 'wifi-only' },
        { key: 'operating_system', value: 'ipados-18' },
        { key: 'case_material', value: 'recycled-aluminum', group: 'Build & Material', isAdHoc: true },
        // Custom Specification
        { key: 'tandem_oled_tech', label: 'Tandem OLED Display', value: 'Dual OLED layers with 1000 nits full-screen XDR & 1600 nits peak', group: 'Display & Visuals', isCustom: true },
      ],
      basePrice: 165000,
      compareAtPrice: 178000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['iPad', 'Apple M4', 'OLED', 'Pro'],
      description: 'The impossibly thin iPad Pro with breakthrough Ultra Retina XDR Tandem OLED display and outrageous Apple M4 chip performance.',
      variants: [
        { name: '256GB Wi-Fi / Space Black', price: 165000, compareAtPrice: 178000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Space Black' }], stockQty: 12 },
        { name: '512GB Wi-Fi + Cellular / Space Black', price: 215000, compareAtPrice: 228000, options: [{ name: 'Storage', value: '512GB' }, { name: 'Color', value: 'Space Black' }], stockQty: 6 },
      ],
    },
    {
      name: 'Apple iPad Air 11" (M2 Chip)',
      slug: 'apple-ipad-air-11-m2',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      classSlug: 'smartphone',
      specifications: [
        { key: 'screen_size', value: '11.0' },
        { key: 'display_tech', value: 'liquid-retina-ips' },
        { key: 'refresh_rate', value: '60hz' },
        { key: 'processor', value: 'apple-m2' },
        { key: 'ram', value: '8gb' },
        { key: 'storage', value: '128gb' },
        { key: 'battery_capacity', value: '10000mah' },
        { key: 'charging_wattage', value: '30' },
        { key: 'cellular_network', value: 'wifi-only' },
        { key: 'operating_system', value: 'ipados-18' },
        { key: 'case_material', value: 'recycled-aluminum', group: 'Build & Material', isAdHoc: true },
        // Custom Specification
        { key: 'apple_pencil_hover', label: 'Apple Pencil Hover Support', value: 'Preview mark before making it with sub-millimeter precision', group: 'Display & Input', isCustom: true },
      ],
      basePrice: 82000,
      compareAtPrice: 89000,
      imageKey: 'category-electronics-1',
      tags: ['iPad Air', 'Apple M2', 'Liquid Retina'],
      description: 'Redesigned iPad Air 11-inch supercharged by the Apple M2 chip, Liquid Retina display, and landscape front camera.',
      variants: [
        { name: '128GB Wi-Fi / Space Gray', price: 82000, compareAtPrice: 89000, options: [{ name: 'Storage', value: '128GB' }, { name: 'Color', value: 'Space Gray' }], stockQty: 18 },
        { name: '256GB Wi-Fi / Blue', price: 98000, compareAtPrice: 105000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Blue' }], stockQty: 10 },
      ],
    },

    // ── LAPTOPS & MACBOOKS ──
    {
      name: 'Apple MacBook Pro 16" (M3 Max Chip)',
      slug: 'apple-macbook-pro-16-m3-max',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'apple',
      classSlug: 'laptop',
      specifications: [
        { key: 'screen_size', value: '16.2' },
        { key: 'display_tech', value: 'liquid-retina-xdr' },
        { key: 'refresh_rate', value: '120hz' },
        { key: 'display_resolution', value: '3456x2234' },
        { key: 'cpu', value: 'apple-m3-max' },
        { key: 'gpu', value: 'apple-40core-gpu' },
        { key: 'ram', value: '36gb' },
        { key: 'storage', value: '512gb-ssd' },
        { key: 'operating_system', value: 'macos-sonoma' },
        { key: 'battery_life', value: '22' },
        { key: 'charging_wattage', value: '140' },
        // Custom Specification
        { key: 'unified_memory_bandwidth', label: 'Memory Bandwidth', value: 'Up to 300GB/s unified memory bandwidth', unit: 'GB/s', group: 'Processor & Memory', isCustom: true },
      ],
      basePrice: 385000,
      compareAtPrice: 415000,
      featured: true,
      imageKey: 'category-creator-studio-1',
      tags: ['MacBook Pro', 'M3 Max', 'Apple Silicon', 'Space Black'],
      description: 'The pinnacle of laptop power: Apple MacBook Pro 16-inch with M3 Max 16-core CPU, 40-core GPU, Liquid Retina XDR display and 22 hours of battery life.',
      variants: [
        { name: '36GB RAM / 512GB SSD / Space Black', price: 385000, compareAtPrice: 415000, options: [{ name: 'Memory', value: '36GB Unified' }, { name: 'Storage', value: '512GB SSD' }], stockQty: 8 },
        { name: '48GB RAM / 1TB SSD / Space Black', price: 445000, compareAtPrice: 475000, options: [{ name: 'Memory', value: '48GB Unified' }, { name: 'Storage', value: '1TB SSD' }], stockQty: 6 },
      ],
    },
    {
      name: 'Apple MacBook Air 15" (M3 Chip)',
      slug: 'apple-macbook-air-15-m3',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'apple',
      classSlug: 'laptop',
      specifications: [
        { key: 'screen_size', value: '15.3' },
        { key: 'display_tech', value: 'liquid-retina-ips' },
        { key: 'refresh_rate', value: '60hz' },
        { key: 'cpu', value: 'apple-m3' },
        { key: 'gpu', value: 'apple-10core-gpu' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '512gb-ssd' },
        { key: 'operating_system', value: 'macos-sonoma' },
        { key: 'battery_life', value: '18' },
        { key: 'charging_wattage', value: '35' },
      ],
      basePrice: 168000,
      compareAtPrice: 180000,
      featured: true,
      imageKey: 'category-creator-studio-1',
      tags: ['MacBook Air', 'M3', 'Midnight', 'Lightweight'],
      description: 'Strikingly thin, fast, and spacious: MacBook Air 15-inch with M3 chip, Liquid Retina display, MagSafe 3, and silent fanless design.',
      variants: [
        { name: '8GB / 256GB / Midnight', price: 168000, compareAtPrice: 180000, options: [{ name: 'Memory', value: '8GB' }, { name: 'Color', value: 'Midnight' }], stockQty: 15 },
        { name: '16GB / 512GB / Starlight', price: 198000, compareAtPrice: 210000, options: [{ name: 'Memory', value: '16GB' }, { name: 'Color', value: 'Starlight' }], stockQty: 12 },
      ],
    },
    {
      name: 'Apple MacBook Air 13" (M2 Chip)',
      slug: 'apple-macbook-air-13-m2',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'apple',
      classSlug: 'laptop',
      specifications: [
        { key: 'screen_size', value: '13.6' },
        { key: 'display_tech', value: 'liquid-retina-ips' },
        { key: 'refresh_rate', value: '60hz' },
        { key: 'cpu', value: 'apple-m2' },
        { key: 'gpu', value: 'apple-10core-gpu' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '512gb-ssd' },
        { key: 'operating_system', value: 'macos-sonoma' },
        { key: 'battery_life', value: '18' },
        { key: 'charging_wattage', value: '30' },
      ],
      basePrice: 118000,
      compareAtPrice: 128000,
      imageKey: 'category-creator-studio-1',
      tags: ['MacBook Air', 'M2', 'Apple Silicon'],
      description: 'Portable, powerful everyday MacBook Air with 13.6-inch Liquid Retina display, 1080p FaceTime HD camera and all-day battery.',
      variants: [
        { name: '8GB / 256GB / Space Gray', price: 118000, compareAtPrice: 128000, options: [{ name: 'Color', value: 'Space Gray' }], stockQty: 22 },
        { name: '16GB / 512GB / Silver', price: 146000, compareAtPrice: 156000, options: [{ name: 'Color', value: 'Silver' }], stockQty: 15 },
      ],
    },
    {
      name: 'Asus ROG Strix SCAR 18 (2024)',
      slug: 'asus-rog-strix-scar-18',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'asus-rog',
      classSlug: 'laptop',
      specifications: [
        { key: 'screen_size', value: '18.0' },
        { key: 'display_tech', value: 'nebula-hdr-mini-led' },
        { key: 'refresh_rate', value: '240hz' },
        { key: 'display_resolution', value: '2-5k-res' },
        { key: 'cpu', value: 'intel-i9-14900hx' },
        { key: 'gpu', value: 'rtx-4090' },
        { key: 'ram', value: '32gb' },
        { key: 'storage', value: '2tb-ssd' },
        { key: 'operating_system', value: 'win-11-pro' },
        { key: 'charging_wattage', value: '330' },
        // Custom Specification
        { key: 'cooling_solution', label: 'Cooling Technology', value: 'Conductonaut Extreme Liquid Metal + Tri-Fan Technology', group: 'Thermals & Cooling', isCustom: true },
      ],
      basePrice: 425000,
      compareAtPrice: 460000,
      imageKey: 'category-creator-studio-1',
      tags: ['ROG', 'Gaming Laptop', 'RTX 4090', 'Core i9'],
      description: 'Dominating flagship gaming beast: Intel Core i9-14900HX, NVIDIA GeForce RTX 4090 16GB, 18-inch Mini LED 240Hz Nebula HDR display.',
      variants: [
        { name: 'Core i9 / RTX 4090 / 32GB / 2TB SSD', price: 425000, compareAtPrice: 460000, options: [{ name: 'Configuration', value: 'i9-14900HX / RTX 4090 / 32GB / 2TB' }], stockQty: 6 },
      ],
    },

    // ── WATCHES & WEARABLES ──
    {
      name: 'Apple Watch Ultra 2 (49mm Titanium)',
      slug: 'apple-watch-ultra-2',
      categorySlug: 'watches-wearables',
      brandSlug: 'apple',
      classSlug: 'smartwatch',
      specifications: [
        { key: 'display_type', value: 'ltpo-oled' },
        { key: 'battery_life', value: '72' },
        { key: 'water_resistance', value: '100m-dive' },
        { key: 'case_material', value: 'aerospace-titanium' },
        { key: 'operating_system', value: 'watchos-11' },
        { key: 'cellular_network', value: '5g' },
        // Custom Specification
        { key: 'action_button', label: 'Customizable Action Button', value: 'High-contrast international orange physical button with siren', group: 'Adventure Features', isCustom: true },
      ],
      basePrice: 98000,
      compareAtPrice: 108000,
      featured: true,
      imageKey: 'category-office-gear-1',
      tags: ['Apple Watch', 'Ultra 2', 'Titanium'],
      description: 'The ultimate sports and adventure watch: 49mm aerospace-grade titanium case, precision dual-frequency GPS, up to 72h battery.',
      variants: [
        { name: '49mm / Natural Titanium / Orange Ocean Band', price: 98000, compareAtPrice: 108000, options: [{ name: 'Band', value: 'Orange Ocean Band' }], stockQty: 14 },
        { name: '49mm / Black Titanium / Dark Trail Loop', price: 105000, compareAtPrice: 115000, options: [{ name: 'Band', value: 'Dark Trail Loop' }], stockQty: 10 },
      ],
    },
    {
      name: 'Apple Watch Series 10 (46mm)',
      slug: 'apple-watch-series-10',
      categorySlug: 'watches-wearables',
      brandSlug: 'apple',
      classSlug: 'smartwatch',
      specifications: [
        { key: 'display_type', value: 'ltpo-oled' },
        { key: 'battery_life', value: '18' },
        { key: 'water_resistance', value: '50m-swim' },
        { key: 'case_material', value: 'recycled-aluminum' },
        { key: 'operating_system', value: 'watchos-11' },
        { key: 'cellular_network', value: '4g-lte' },
      ],
      basePrice: 58000,
      compareAtPrice: 64000,
      featured: true,
      imageKey: 'category-office-gear-1',
      tags: ['Apple Watch', 'Series 10', 'OLED'],
      description: 'Thinnest Apple Watch ever with the biggest wide-angle OLED display, sleep apnea notifications, and fast charging.',
      variants: [
        { name: '46mm GPS / Jet Black Aluminum', price: 58000, compareAtPrice: 64000, options: [{ name: 'Color', value: 'Jet Black' }], stockQty: 20 },
        { name: '46mm GPS + Cellular / Natural Titanium', price: 88000, compareAtPrice: 96000, options: [{ name: 'Color', value: 'Natural Titanium' }], stockQty: 8 },
      ],
    },
    {
      name: 'Samsung Galaxy Watch Ultra (47mm)',
      slug: 'samsung-galaxy-watch-ultra',
      categorySlug: 'watches-wearables',
      brandSlug: 'samsung',
      classSlug: 'smartwatch',
      specifications: [
        { key: 'display_type', value: 'super-amoled' },
        { key: 'battery_life', value: '60' },
        { key: 'water_resistance', value: '100m-dive' },
        { key: 'case_material', value: 'aerospace-titanium' },
        { key: 'operating_system', value: 'wearos-5' },
        { key: 'cellular_network', value: '4g-lte' },
        // Custom Specification
        { key: 'bioactive_sensor', label: 'BioActive Sensor 2.0', value: 'Continuous ECG, blood pressure, sleep apnea, metabolic AGEs index', group: 'Health & Sensors', isCustom: true },
      ],
      basePrice: 72000,
      compareAtPrice: 79000,
      imageKey: 'category-office-gear-1',
      tags: ['Samsung', 'Galaxy Watch', 'Titanium'],
      description: 'Galaxy Watch Ultra with cushion titanium design, 10ATM water resistance, dual-frequency GPS, and BioActive sensor.',
      variants: [
        { name: '47mm LTE / Titanium Gray', price: 72000, compareAtPrice: 79000, options: [{ name: 'Color', value: 'Titanium Gray' }], stockQty: 12 },
      ],
    },

    // ── AUDIO & SOUND ──
    {
      name: 'Apple AirPods Pro (2nd Gen USB-C)',
      slug: 'apple-airpods-pro-2-usb-c',
      categorySlug: 'audio-sound',
      brandSlug: 'apple',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'in-ear' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        { key: 'battery_life', value: '30' },
        { key: 'noise_cancellation', value: 'adaptive-anc' },
        { key: 'water_resistance', value: 'ip54' },
        // Custom Specification
        { key: 'h2_chip', label: 'Audio Processor', value: 'Apple H2 Headphone Chip with Computational Audio', group: 'Acoustic Processing', isCustom: true },
      ],
      basePrice: 26500,
      compareAtPrice: 29500,
      featured: true,
      imageKey: 'sv-demo-earbuds',
      tags: ['AirPods Pro', 'ANC', 'Spatial Audio', 'USB-C'],
      description: 'Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, and USB-C MagSafe case with Precision Finding.',
      variants: [
        { name: 'AirPods Pro (2nd Gen with USB-C Case)', price: 26500, compareAtPrice: 29500, options: [{ name: 'Model', value: 'USB-C MagSafe Case' }], stockQty: 45 },
      ],
    },
    {
      name: 'Apple AirPods Max (USB-C Edition)',
      slug: 'apple-airpods-max-usb-c',
      categorySlug: 'audio-sound',
      brandSlug: 'apple',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'over-ear' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        { key: 'battery_life', value: '20' },
        { key: 'noise_cancellation', value: 'anc' },
        { key: 'water_resistance', value: 'none' },
        // Custom Specification
        { key: 'lossless_audio', label: 'Lossless Audio Support', value: '24-bit 48kHz via USB-C Audio Cable', group: 'Acoustic Processing', isCustom: true },
      ],
      basePrice: 68000,
      compareAtPrice: 75000,
      featured: true,
      imageKey: 'sv-demo-earbuds',
      tags: ['AirPods Max', 'Over-Ear', 'Hi-Res', 'USB-C'],
      description: 'Over-ear headphones reimagined: high-fidelity audio, Pro-level Active Noise Cancellation, and USB-C lossless support.',
      variants: [
        { name: 'Midnight', price: 68000, compareAtPrice: 75000, options: [{ name: 'Color', value: 'Midnight' }], stockQty: 10 },
        { name: 'Starlight', price: 68000, compareAtPrice: 75000, options: [{ name: 'Color', value: 'Starlight' }], stockQty: 8 },
      ],
    },
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5',
      categorySlug: 'audio-sound',
      brandSlug: 'sony',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'over-ear' },
        { key: 'connectivity', value: 'bluetooth-5-2' },
        { key: 'battery_life', value: '30' },
        { key: 'noise_cancellation', value: 'anc' },
        { key: 'water_resistance', value: 'none' },
        // Custom Specification
        { key: 'noise_processor', label: 'Dual Noise Processors', value: 'Integrated Processor V1 + HD Noise Cancelling Processor QN1', group: 'Acoustic Processing', isCustom: true },
      ],
      basePrice: 38500,
      compareAtPrice: 43000,
      featured: true,
      imageKey: 'sv-demo-earbuds',
      tags: ['Sony', 'Noise Cancelling', 'LDAC', 'Hi-Res Audio'],
      description: 'Industry-leading noise cancellation with two processors and eight microphones. Exceptional sound quality with LDAC and 30h battery.',
      variants: [
        { name: 'Black', price: 38500, compareAtPrice: 43000, options: [{ name: 'Color', value: 'Black' }], stockQty: 22 },
        { name: 'Silver', price: 38500, compareAtPrice: 43000, options: [{ name: 'Color', value: 'Silver' }], stockQty: 18 },
      ],
    },
    {
      name: 'Samsung Galaxy Buds3 Pro (AI Interpreter)',
      slug: 'samsung-galaxy-buds3-pro',
      categorySlug: 'audio-sound',
      brandSlug: 'samsung',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'in-ear' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        { key: 'battery_life', value: '30' },
        { key: 'noise_cancellation', value: 'adaptive-anc' },
        { key: 'water_resistance', value: 'ip54' },
        // Custom Specification
        { key: 'blade_lights', label: 'Interactive Blade Lights', value: 'Customizable LED touch lighting & pinch sensor stem', group: 'Design & Lighting', isCustom: true },
      ],
      basePrice: 23000,
      compareAtPrice: 26000,
      imageKey: 'sv-demo-earbuds',
      tags: ['Samsung', 'Buds3 Pro', 'AI', '24-bit Hi-Fi'],
      description: 'Innovative blade design with iconic Blade Lights, 24-bit 96kHz Hi-Fi audio with 2-way woofer & planar tweeter, and Galaxy AI real-time voice translation.',
      variants: [
        { name: 'Silver Blade', price: 23000, compareAtPrice: 26000, options: [{ name: 'Color', value: 'Silver' }], stockQty: 24 },
        { name: 'White Blade', price: 23000, compareAtPrice: 26000, options: [{ name: 'Color', value: 'White' }], stockQty: 20 },
      ],
    },
    {
      name: 'OnePlus Buds Pro 3 (Dynaudio Co-Created)',
      slug: 'oneplus-buds-pro-3',
      categorySlug: 'audio-sound',
      brandSlug: 'oneplus',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'in-ear' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        { key: 'battery_life', value: '43' },
        { key: 'noise_cancellation', value: '50db-hybrid-anc' },
        { key: 'water_resistance', value: 'ip54' },
        // Custom Specification
        { key: 'dynaudio_tuning', label: 'Dynaudio Master Acoustics', value: 'Dual 11mm woofer + 6mm planar tweeter with dual DACs', group: 'Acoustic Processing', isCustom: true },
      ],
      basePrice: 18500,
      compareAtPrice: 21000,
      imageKey: 'sv-demo-earbuds',
      tags: ['OnePlus', 'Dynaudio', '50dB ANC', 'Spatial Audio'],
      description: 'Co-created with Dynaudio master acoustics: dual drivers with dual DACs, 50dB adaptive noise cancellation, leatherette charging case, and 43h playback.',
      variants: [
        { name: 'Midnight Opus', price: 18500, compareAtPrice: 21000, options: [{ name: 'Color', value: 'Midnight Opus' }], stockQty: 25 },
        { name: 'Lunar Radiance', price: 18500, compareAtPrice: 21000, options: [{ name: 'Color', value: 'Lunar Radiance' }], stockQty: 18 },
      ],
    },
    {
      name: 'Bose QuietComfort Ultra Headphones',
      slug: 'bose-quietcomfort-ultra',
      categorySlug: 'audio-sound',
      brandSlug: 'bose',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'over-ear' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        { key: 'battery_life', value: '24' },
        { key: 'noise_cancellation', value: 'anc' },
        { key: 'water_resistance', value: 'none' },
        // Custom Specification
        { key: 'bose_immersive', label: 'Bose Immersive Audio', value: 'Proprietary spatialized soundstage with Head Tracking', group: 'Acoustic Processing', isCustom: true },
      ],
      basePrice: 46000,
      compareAtPrice: 52000,
      imageKey: 'sv-demo-earbuds',
      tags: ['Bose', 'QuietComfort', 'Immersive Audio'],
      description: 'World-class noise cancellation, breakthrough spatialized audio with Bose Immersive Audio, and ultra-comfortable plush ear cushions.',
      variants: [
        { name: 'Black', price: 46000, compareAtPrice: 52000, options: [{ name: 'Color', value: 'Black' }], stockQty: 14 },
      ],
    },
    {
      name: 'Marshall Stanmore III Bluetooth Speaker',
      slug: 'marshall-stanmore-iii',
      categorySlug: 'audio-sound',
      brandSlug: 'marshall',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'speaker' },
        { key: 'noise_cancellation', value: 'none' },
        { key: 'connectivity', value: 'bluetooth-5-2' },
        { key: 'battery_life', value: '20' },
        { key: 'water_resistance', value: 'none' },
        // Custom Specification
        { key: 'amplifiers', label: 'Class D Amplifiers', value: '1x 50W Woofer + 2x 15W Tweeters (80W Total Output)', group: 'Acoustics & Power', isCustom: true },
      ],
      basePrice: 48500,
      compareAtPrice: 54000,
      featured: true,
      imageKey: 'sv-usb-condenser-mic-pro',
      tags: ['Marshall', 'Home Speaker', 'Vintage'],
      description: 'The legendary middleweight home speaker: expansive Marshall signature sound, re-engineered soundstage, and brass control dials.',
      variants: [
        { name: 'Black', price: 48500, compareAtPrice: 54000, options: [{ name: 'Color', value: 'Black' }], stockQty: 16 },
        { name: 'Cream', price: 49500, compareAtPrice: 55000, options: [{ name: 'Color', value: 'Cream' }], stockQty: 12 },
      ],
    },
    {
      name: 'Anker Soundcore Motion Boom Plus (80W)',
      slug: 'anker-soundcore-motion-boom-plus',
      categorySlug: 'audio-sound',
      brandSlug: 'anker',
      classSlug: 'headphones',
      specifications: [
        { key: 'type', value: 'speaker' },
        { key: 'noise_cancellation', value: 'none' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        { key: 'battery_life', value: '20' },
        { key: 'water_resistance', value: 'ip67' },
        // Custom Specification
        { key: 'bassup_technology', label: 'BassUp 2.0', value: 'Dual titanium tweeters & dual woofers with real-time DSP', group: 'Acoustics & Power', isCustom: true },
      ],
      basePrice: 16500,
      compareAtPrice: 19000,
      imageKey: 'sv-usb-condenser-mic-pro',
      tags: ['Anker', 'Soundcore', '80W', 'IP67 Waterproof'],
      description: 'Monstrous 80W outdoor sound: titanium drivers, BassUp 2.0 technology, IP67 waterproof & dustproof rating, and 20-hour power bank playtime.',
      variants: [
        { name: 'Black 80W Beast', price: 16500, compareAtPrice: 19000, options: [{ name: 'Color', value: 'Black' }], stockQty: 30 },
      ],
    },

    // ── TV & HOME ENTERTAINMENT (Pickaboo & Apple Gadgets) ──
    {
      name: 'Sony BRAVIA XR 65" 4K OLED Google TV (A80L)',
      slug: 'sony-bravia-xr-65-oled-a80l',
      categorySlug: 'tv-entertainment',
      brandSlug: 'sony',
      classSlug: 'smart-tv-entertainment',
      specifications: [
        { key: 'screen_size', value: '65' },
        { key: 'display_tech', value: '4k-xr-oled' },
        { key: 'display_resolution', value: '4k-uhd' },
        { key: 'refresh_rate', value: '120hz' },
        { key: 'operating_system', value: 'google-tv' },
        { key: 'connectivity', value: 'bluetooth-5-2' },
        // Custom Specification
        { key: 'acoustic_surface', label: 'Acoustic Surface Audio+', value: 'Actuators vibrate the screen to turn whole panel into multi-channel speaker', group: 'Audio & Acoustics', isCustom: true },
      ],
      basePrice: 265000,
      compareAtPrice: 295000,
      featured: true,
      imageKey: 'sv-dual-monitor-arm-pro',
      tags: ['Sony', 'BRAVIA XR', 'OLED', '4K120', 'PlayStation 5 Ready'],
      description: 'Cognitive Processor XR delivers pure OLED blacks, acoustic surface audio+ where the screen is the speaker, HDMI 2.1 4K/120Hz for PS5, and Google TV.',
      variants: [
        { name: '65-inch 4K OLED (Official Sony BD)', price: 265000, compareAtPrice: 295000, options: [{ name: 'Screen Size', value: '65-inch' }], stockQty: 6 },
      ],
    },
    {
      name: 'Xiaomi Smart TV A Pro 55" 4K UHD Dolby Vision',
      slug: 'xiaomi-smart-tv-a-pro-55',
      categorySlug: 'tv-entertainment',
      brandSlug: 'xiaomi',
      classSlug: 'smart-tv-entertainment',
      specifications: [
        { key: 'screen_size', value: '55' },
        { key: 'display_tech', value: '4k-uhd-dolby' },
        { key: 'display_resolution', value: '4k-uhd' },
        { key: 'refresh_rate', value: '60hz' },
        { key: 'operating_system', value: 'google-tv' },
        { key: 'connectivity', value: 'bluetooth-5-2' },
      ],
      basePrice: 58000,
      compareAtPrice: 65000,
      featured: true,
      imageKey: 'sv-dual-monitor-arm-plus',
      tags: ['Xiaomi', 'Smart TV', '4K UHD', 'Dolby Vision', 'Google TV'],
      description: 'Premium metallic bezel-less frame, vibrant 4K UHD display with Dolby Vision, DTS Virtual:X sound, and hands-free Google Assistant.',
      variants: [
        { name: '55-inch Metallic Bezel-less', price: 58000, compareAtPrice: 65000, options: [{ name: 'Screen Size', value: '55-inch' }], stockQty: 14 },
      ],
    },
    {
      name: 'Apple TV 4K 128GB (3rd Gen Wi-Fi + Ethernet)',
      slug: 'apple-tv-4k-128gb-gen3',
      categorySlug: 'tv-entertainment',
      brandSlug: 'apple',
      classSlug: 'smart-tv-entertainment',
      specifications: [
        { key: 'display_resolution', value: '4k-uhd' },
        { key: 'operating_system', value: 'tvos-18' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        // Custom Specification
        { key: 'smart_home_hub', label: 'Smart Home Hub', value: 'Thread Border Router + Apple HomeKit / Matter Hub', group: 'Smart Home Integration', isCustom: true },
      ],
      basePrice: 24500,
      compareAtPrice: 27500,
      imageKey: 'sv-router-ax3000-pro',
      tags: ['Apple TV', 'A15 Bionic', '4K HDR', 'Dolby Atmos'],
      description: 'Cinematic experience in your living room: A15 Bionic chip, HDR10+, Dolby Vision, Dolby Atmos sound, Thread networking, and Siri Remote USB-C.',
      variants: [
        { name: '128GB Wi-Fi + Ethernet', price: 24500, compareAtPrice: 27500, options: [{ name: 'Storage', value: '128GB Gigabit' }], stockQty: 20 },
      ],
    },

    // ── SMART HOME & APPLIANCES ──
    {
      name: 'Xiaomi Robot Vacuum X20+ (All-in-One Station)',
      slug: 'xiaomi-robot-vacuum-x20-plus',
      categorySlug: 'smart-home-appliances',
      brandSlug: 'xiaomi',
      classSlug: 'smart-home-appliance',
      specifications: [
        { key: 'suction_power', value: '6000pa' },
        { key: 'nav_technology', value: 'lds-structured-light' },
        { key: 'battery_life', value: '3' },
        { key: 'connectivity', value: 'bluetooth-5-2' },
        // Custom Specification
        { key: 'base_station_features', label: 'All-in-One Smart Base', value: 'Automatic 10s dust collection, dual mop washing & hot air drying, 4L clean water tank', group: 'Smart Docking Station', isCustom: true },
      ],
      basePrice: 54000,
      compareAtPrice: 62000,
      featured: true,
      imageKey: 'sv-air-purifier-25m2-pro',
      tags: ['Xiaomi', 'Robot Vacuum', 'Smart Home', 'LDS Navigation'],
      description: 'Automated hands-free floor cleaning: 6000Pa extreme suction, dual rotating mop pads with auto-lifting, 10-second dust emptying, and auto mop washing/air drying.',
      variants: [
        { name: 'All-in-One Smart Base (White)', price: 54000, compareAtPrice: 62000, options: [{ name: 'Model', value: 'Complete All-in-One' }], stockQty: 12 },
      ],
    },
    {
      name: 'Dyson V12 Detect Slim Cordless Vacuum Cleaner',
      slug: 'dyson-v12-detect-slim',
      categorySlug: 'smart-home-appliances',
      brandSlug: 'dyson',
      classSlug: 'smart-home-appliance',
      specifications: [
        { key: 'suction_power', value: '150aw' },
        { key: 'nav_technology', value: 'piezo-laser' },
        { key: 'battery_life', value: '1' },
        // Custom Specification
        { key: 'piezo_sensor', label: 'Acoustic Piezo Sensor', value: 'Counts and sizes microscopic dust particles 15,000 times a second', group: 'Intelligent Sensing', isCustom: true },
      ],
      basePrice: 78000,
      compareAtPrice: 88000,
      featured: true,
      imageKey: 'sv-air-purifier-25m2-plus',
      tags: ['Dyson', 'V12 Detect', 'Laser Slim', 'Cordless'],
      description: 'Dyson’s lightest intelligent cordless vacuum: illuminated cleaner head reveals invisible dust, piezo sensor measures microscopic particles, single-button power control.',
      variants: [
        { name: 'Nickel / Yellow Laser Slim Fluffy', price: 78000, compareAtPrice: 88000, options: [{ name: 'Color', value: 'Yellow / Iron' }], stockQty: 10 },
      ],
    },
    {
      name: 'TP-Link Deco X50 AX3000 Whole Home Mesh Wi-Fi 6',
      slug: 'tp-link-deco-x50-ax3000-mesh',
      categorySlug: 'smart-home-appliances',
      brandSlug: 'tp-link',
      classSlug: 'smart-home-appliance',
      specifications: [
        { key: 'nav_technology', value: 'mesh-ai-roaming' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        // Custom Specification
        { key: 'mesh_coverage', label: 'Mesh Coverage & Nodes', value: 'Covers up to 6,500 sq ft across 3 mesh nodes with 150+ devices', group: 'Network Coverage', isCustom: true },
      ],
      basePrice: 22500,
      compareAtPrice: 26000,
      imageKey: 'sv-router-ax3000-pro',
      tags: ['TP-Link', 'Deco', 'Wi-Fi 6', 'Mesh', 'Gigabit'],
      description: 'Dead-zone killer for multi-story homes and large apartments: AX3000 dual-band Wi-Fi 6, covers up to 6,500 sq ft, connects 150+ smart devices, AI-driven seamless roaming.',
      variants: [
        { name: '3-Pack Mesh System', price: 22500, compareAtPrice: 26000, options: [{ name: 'Package', value: '3-Pack Complete' }], stockQty: 18 },
      ],
    },

    // ── POWER & ACCESSORIES ──
    {
      name: 'Anker Prime 27,650mAh Power Bank (250W)',
      slug: 'anker-prime-27650mah-250w',
      categorySlug: 'power-accessories',
      brandSlug: 'anker',
      classSlug: 'power-bank',
      specifications: [
        { key: 'capacity', value: '27650mah' },
        { key: 'battery_type', value: 'lithium-ion' },
        { key: 'total_output', value: '250W' },
        { key: 'fast_charging_tech', value: 'gan-prime' },
        // Custom Specification
        { key: 'smart_display', label: 'Smart Digital Display', value: 'Real-time wattage per port, battery health %, and recharge countdown', group: 'Smart Features', isCustom: true },
      ],
      basePrice: 18500,
      compareAtPrice: 21000,
      featured: true,
      imageKey: 'sv-portable-ssd-1tb-pro',
      tags: ['Anker', 'Prime', 'GaN', '250W', 'Power Bank'],
      description: 'Ultra-fast 250W multi-device fast charging power bank with smart digital display, Anker App connectivity, and airline approval.',
      variants: [
        { name: 'Prime 27,650mAh 250W (Smart Display)', price: 18500, compareAtPrice: 21000, options: [{ name: 'Capacity', value: '27,650mAh / 250W' }], stockQty: 25 },
      ],
    },
    {
      name: 'Anker 737 Power Bank (PowerCore 24K 140W)',
      slug: 'anker-737-power-bank-24000mah',
      categorySlug: 'power-accessories',
      brandSlug: 'anker',
      classSlug: 'power-bank',
      specifications: [
        { key: 'capacity', value: '24000mah' },
        { key: 'battery_type', value: 'lithium-ion' },
        { key: 'total_output', value: '140W' },
        { key: 'fast_charging_tech', value: 'power-delivery' },
      ],
      basePrice: 14500,
      compareAtPrice: 16500,
      featured: true,
      imageKey: 'sv-portable-ssd-1tb-pro',
      tags: ['Anker', 'Power Bank', '140W', 'PD 3.1'],
      description: 'Equipped with USB Power Delivery 3.1 and bi-directional technology to quickly recharge the portable charger or get a 140W ultra-powerful charge.',
      variants: [
        { name: '24,000mAh / 140W Fast Charge', price: 14500, compareAtPrice: 16500, options: [{ name: 'Capacity', value: '24,000mAh' }], stockQty: 20 },
      ],
    },
    {
      name: 'Baseus Blade HD 100W 20,000mAh Ultra-Slim Power Bank',
      slug: 'baseus-blade-hd-100w-20000mah',
      categorySlug: 'power-accessories',
      brandSlug: 'anker',
      classSlug: 'power-bank',
      specifications: [
        { key: 'capacity', value: '20000mah' },
        { key: 'battery_type', value: 'lithium-polymer' },
        { key: 'total_output', value: '100W' },
        { key: 'fast_charging_tech', value: 'power-delivery' },
      ],
      basePrice: 8900,
      compareAtPrice: 10500,
      imageKey: 'sv-portable-ssd-1tb-pro',
      tags: ['Baseus', 'Blade', '100W', 'Ultra-Slim', 'Power Bank'],
      description: 'Ultra-thin 0.7-inch laptop power bank with 100W dual USB-C Power Delivery and digital status monitor.',
      variants: [
        { name: '20,000mAh / 100W Blade HD', price: 8900, compareAtPrice: 10500, options: [{ name: 'Capacity', value: '20,000mAh' }], stockQty: 22 },
      ],
    },
    {
      name: 'Anker 737 GaNPrime 120W Wall Charger',
      slug: 'anker-737-ganprime-120w',
      categorySlug: 'power-accessories',
      brandSlug: 'anker',
      classSlug: 'power-bank',
      specifications: [
        { key: 'total_output', value: '120W' },
        { key: 'fast_charging_tech', value: 'gan-prime' },
      ],
      basePrice: 8500,
      compareAtPrice: 9800,
      imageKey: 'sv-wall-charger-65w-pro',
      tags: ['Anker', 'GaN', '120W', 'Fast Charger'],
      description: 'Power 3 devices simultaneously with 2 USB-C and 1 USB-A port using GaNPrime high efficiency architecture and ActiveShield 2.0 safety.',
      variants: [
        { name: '120W 3-Port (2C1A)', price: 8500, compareAtPrice: 9800, options: [{ name: 'Ports', value: '2x USB-C + 1x USB-A' }], stockQty: 40 },
      ],
    },
    {
      name: 'Apple MagSafe Battery Pack (USB-C)',
      slug: 'apple-magsafe-battery-pack-usb-c',
      categorySlug: 'power-accessories',
      brandSlug: 'apple',
      classSlug: 'power-bank',
      specifications: [
        { key: 'capacity', value: '10000mah' },
        { key: 'battery_type', value: 'lithium-polymer' },
        { key: 'total_output', value: '15W' },
        { key: 'fast_charging_tech', value: 'qi2-wireless' },
      ],
      basePrice: 12500,
      compareAtPrice: 14000,
      imageKey: 'sv-wall-charger-65w-pro',
      tags: ['MagSafe', 'Apple', 'Wireless Charger'],
      description: 'Snap-on magnetic power for iPhone 12 through iPhone 16 with automatic wireless charging and iOS battery status integration.',
      variants: [
        { name: 'White MagSafe', price: 12500, compareAtPrice: 14000, options: [{ name: 'Color', value: 'White' }], stockQty: 30 },
      ],
    },
    {
      name: 'Apple Pencil Pro',
      slug: 'apple-pencil-pro',
      categorySlug: 'power-accessories',
      brandSlug: 'apple',
      specifications: [
        // Custom Specifications
        { key: 'barrel_roll', label: 'Barrel Roll Gyroscope', value: 'Rotational sensor to change tool orientation and brush shape', group: 'Advanced Sensors', isCustom: true },
        { key: 'haptic_feedback', label: 'Haptic Engine', value: 'Pulse haptics confirmation on double tap and squeeze gestures', group: 'Advanced Sensors', isCustom: true },
        { key: 'find_my', label: 'Apple Find My Support', value: 'Precision locating via Find My network', group: 'Smart Features', isCustom: true },
      ],
      basePrice: 17500,
      compareAtPrice: 19500,
      imageKey: 'sv-notebook-set-3-pro',
      tags: ['Apple Pencil', 'Pro', 'Haptic', 'Find My'],
      description: 'Engineered for limitless creativity: squeeze gesture, barrel roll gyroscope, haptic feedback engine, and Find My tracking support.',
      variants: [
        { name: 'White', price: 17500, compareAtPrice: 19500, options: [{ name: 'Model', value: 'Pencil Pro' }], stockQty: 25 },
      ],
    },

    // ── CAMERAS & DRONES ──
    {
      name: 'DJI Mini 4 Pro Drone (Fly More Combo Plus)',
      slug: 'dji-mini-4-pro-fly-more-plus',
      categorySlug: 'cameras-drones',
      brandSlug: 'dji',
      classSlug: 'camera-drone',
      specifications: [
        { key: 'video_resolution', value: '4k60-hdr' },
        { key: 'sensor_size', value: '1-1.3-cmos' },
        { key: 'gimbal_stabilization', value: '3axis-omni' },
        { key: 'battery_life', value: '45' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        // Custom Specification
        { key: 'transmission_range', label: 'O4 Video Transmission', value: 'Up to 20 km FHD 1080p/60fps video transmission', group: 'Flight & Transmission', isCustom: true },
      ],
      basePrice: 138000,
      compareAtPrice: 152000,
      featured: true,
      imageKey: 'sv-ring-light-10in-pro',
      tags: ['DJI', 'Drone', '4K60', 'Omnidirectional Obstacle', 'RC 2'],
      description: 'Under 249g mini drone with omnidirectional active obstacle sensing, 4K/60fps HDR true vertical shooting, and 20km FHD video transmission with DJI RC 2 controller.',
      variants: [
        { name: 'Fly More Combo Plus (DJI RC 2 + 3 Batteries)', price: 138000, compareAtPrice: 152000, options: [{ name: 'Package', value: 'Fly More Combo Plus with RC 2' }], stockQty: 10 },
      ],
    },
    {
      name: 'DJI Osmo Pocket 3 Creator Combo',
      slug: 'dji-osmo-pocket-3-creator',
      categorySlug: 'cameras-drones',
      brandSlug: 'dji',
      classSlug: 'camera-drone',
      specifications: [
        { key: 'video_resolution', value: '4k120-dlog' },
        { key: 'sensor_size', value: '1-inch-cmos' },
        { key: 'gimbal_stabilization', value: '3axis-handheld' },
        { key: 'battery_life', value: '2.5' },
        { key: 'connectivity', value: 'bluetooth-5-2' },
        // Custom Specification
        { key: 'rotatable_screen', label: '2.0-inch OLED Rotatable Touchscreen', value: 'Instant horizontal and vertical aspect switching on screen rotation', group: 'Display & Control', isCustom: true },
      ],
      basePrice: 76500,
      compareAtPrice: 84000,
      featured: true,
      imageKey: 'sv-ring-light-10in-plus',
      tags: ['DJI', 'Osmo Pocket 3', '1-inch CMOS', '4K120', 'Gimbal'],
      description: 'Pocket-sized gimbal camera with 1-inch CMOS sensor, 4K/120fps video, 2-inch rotatable OLED touchscreen, and DJI Mic 2 transmitter included in Creator Combo.',
      variants: [
        { name: 'Creator Combo (with DJI Mic 2 & Battery Handle)', price: 76500, compareAtPrice: 84000, options: [{ name: 'Package', value: 'Creator Combo' }], stockQty: 15 },
      ],
    },

    // ── GAMING & CONSOLES ──
    {
      name: 'Sony PlayStation 5 Slim (1TB Disc Edition)',
      slug: 'sony-playstation-5-slim-disc',
      categorySlug: 'gaming-consoles',
      brandSlug: 'sony',
      classSlug: 'gaming-console',
      specifications: [
        { key: 'processor', value: 'sony-ps5-zen2' },
        { key: 'gpu', value: 'custom-rdna2-10tflops' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '1tb-ssd' },
        { key: 'operating_system', value: 'ps5-os' },
        { key: 'video_resolution', value: '8k30-4k120' },
        { key: 'refresh_rate', value: '120hz' },
        { key: 'connectivity', value: 'bluetooth-5-2' },
        // Custom Specification
        { key: 'dualsense_haptics', label: 'DualSense Wireless Controller', value: 'Adaptive triggers with dynamic resistance & haptic feedback', group: 'Controller & Immersion', isCustom: true },
      ],
      basePrice: 66000,
      compareAtPrice: 72000,
      featured: true,
      imageKey: 'category-electronics',
      tags: ['PS5', 'PlayStation', '4K Gaming', 'DualSense', 'Ray Tracing'],
      description: 'Slimmer design with 1TB ultra-high speed SSD storage, 4K-TV gaming, Ray Tracing, 3D Audio, and immersive haptic feedback on DualSense Wireless Controller.',
      variants: [
        { name: '1TB Disc Edition (White)', price: 66000, compareAtPrice: 72000, options: [{ name: 'Model', value: '1TB Disc Edition' }], stockQty: 16 },
        { name: '1TB Disc Edition + Extra DualSense Controller', price: 74000, compareAtPrice: 81000, options: [{ name: 'Bundle', value: '1TB Disc + 2 Controllers' }], stockQty: 12 },
      ],
    },
    {
      name: 'Steam Deck OLED (1TB Handheld PC)',
      slug: 'steam-deck-oled-1tb',
      categorySlug: 'gaming-consoles',
      brandSlug: 'sony',
      classSlug: 'gaming-console',
      specifications: [
        { key: 'processor', value: 'amd-van-gogh' },
        { key: 'gpu', value: 'amd-rdna2-8cu' },
        { key: 'ram', value: '16gb' },
        { key: 'storage', value: '1tb-ssd' },
        { key: 'operating_system', value: 'steamos-3' },
        { key: 'refresh_rate', value: '90hz' },
        { key: 'connectivity', value: 'bluetooth-5-3' },
        // Custom Specification
        { key: 'oled_hdr_display', label: '7.4" HDR OLED Screen', value: '1000 nits peak brightness, 110% DCI-P3 color gamut, 90Hz refresh rate', group: 'Display & Visuals', isCustom: true },
      ],
      basePrice: 89000,
      compareAtPrice: 98000,
      imageKey: 'category-electronics',
      tags: ['Steam Deck', 'OLED', 'Handheld PC', '90Hz HDR'],
      description: '7.4-inch 90Hz HDR OLED display, premium anti-glare etched glass, 50Wh battery, 6nm AMD APU, and Wi-Fi 6E for the definitive PC gaming on the go.',
      variants: [
        { name: '1TB Anti-Glare Etched Glass OLED', price: 89000, compareAtPrice: 98000, options: [{ name: 'Storage', value: '1TB OLED' }], stockQty: 10 },
      ],
    },
  ]

  let totalProducts = 0
  let totalVariants = 0
  const createdProducts: any[] = []
  const createdVariants: any[] = []

  for (const p of productsToSeed) {
    const catId = categoryMap[p.categorySlug]
    const brandId = brandMap[p.brandSlug]
    const imgId = findMediaId(p.imageKey)
    const productDoc = await payload.create({
      collection: 'products',
      data: {
        name: p.name,
        slug: p.slug,
        status: 'published',
        featured: Boolean(p.featured),
        brand: brandId || null,
        categories: catId ? [catId] : [],
        productClass: p.classSlug && classMap[p.classSlug] ? classMap[p.classSlug] : null,
        description: makeLexicalDoc([
          p.description,
          '100% authentic product with official manufacturer warranty, genuine retail packaging, and verified serial registration.',
        ]),
        shortDescription: p.description,
        rating: 4.8,
        totalReviews: Math.floor(Math.random() * 15) + 6,
        specifications: (p.specifications || []).map((spec: any, idx: number) => {
          const paramInfo =
            p.classSlug && classParamsMap[p.classSlug]
              ? classParamsMap[p.classSlug][spec.key]
              : null
          const attrId = attributeMap[spec.key] || null
          const isCustom = Boolean(spec.isCustom)
          const isAdHoc = Boolean(spec.isAdHoc) || (!paramInfo && !isCustom && Boolean(attrId))
          return {
            attribute: attrId,
            key: spec.key,
            value: spec.value,
            label: spec.label || paramInfo?.label || attrLabelMap[spec.key] || spec.key,
            unit: spec.unit !== undefined ? spec.unit : (paramInfo?.unit || attrUnitMap[spec.key] || ''),
            group: spec.group || attrGroupMap[spec.key] || (isCustom ? 'Additional Specifications' : 'General'),
            isCustom,
            isAdHoc,
            displayOrder: idx + 1,
          }
        }),
        images: imgId ? [{ image: imgId }] : [],
        tags: p.tags.map((t) => ({ tag: t })),
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice || Math.round(p.basePrice * 1.08),
        saleDisplayMode: p.saleDisplayMode || 'strike_and_badge',
        currency: 'BDT',
        hasVariants: p.variants.length > 0,
        weight: 0.5,
      } as any,
      overrideAccess: true,
    })
    totalProducts++
    createdProducts.push(productDoc)

    // Create Variants and Stock
    for (const v of p.variants) {
      const variantDoc = await payload.create({
        collection: 'product-variants',
        data: {
          product: productDoc.id,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice || Math.round(v.price * 1.08),
          saleDisplayMode: 'inherit',
          options: v.options,
          isActive: true,
        } as any,
        overrideAccess: true,
      })
      totalVariants++
      createdVariants.push(variantDoc)

      // Stock across the 4 outlets
      const qtyPerOutlet = Math.max(2, Math.floor(v.stockQty / createdOutlets.length))
      for (const outlet of createdOutlets) {
        await payload.create({
          collection: 'stock-levels',
          data: {
            product: productDoc.id,
            variant: variantDoc.id,
            location: outlet.id,
            quantity: qtyPerOutlet,
            reservedQuantity: Math.min(1, Math.floor(qtyPerOutlet * 0.2)),
          } as any,
          overrideAccess: true,
        })
      }
    }
  }

  // ─── 8. 10 REGISTERED CUSTOMERS ────────────────────────────────────────────
  const customerProfiles = [
    { firstName: 'Tanvir', lastName: 'Hasan', email: 'tanvir.hasan@dhakamail.com', phone: '+8801711234567', city: 'Dhaka', address: 'House 45, Road 11, Block D, Banani' },
    { firstName: 'Sadia', lastName: 'Rahman', email: 'sadia.rahman@bdtech.org', phone: '+8801819345678', city: 'Dhaka', address: 'Apartment 5B, Road 27, Dhanmondi' },
    { firstName: 'Rahim', lastName: 'Ahmed', email: 'rahim.ahmed@cloudbd.net', phone: '+8801912456789', city: 'Dhaka', address: 'Plot 18, Sector 7, Uttara' },
    { firstName: 'Farhan', lastName: 'Kabir', email: 'farhan.kabir@fintechbd.com', phone: '+8801613567890', city: 'Dhaka', address: 'House 8, Road 3, DOHS Baridhara' },
    { firstName: 'Nusrat', lastName: 'Jahan', email: 'nusrat.jahan@designstudio.bd', phone: '+8801714678901', city: 'Dhaka', address: 'Flat 4A, Avenue 5, Mirpur DOHS' },
    { firstName: 'Arif', lastName: 'Hossain', email: 'arif.hossain@ctgshoppers.com', phone: '+8801815789012', city: 'Chittagong', address: 'Hill View R/A, Nasirabad' },
    { firstName: 'Mehnaz', lastName: 'Haque', email: 'mehnaz.haque@fashionbd.com', phone: '+8801916890123', city: 'Dhaka', address: 'House 22, Shantinagar Road' },
    { firstName: 'Kazi', lastName: 'Zubair', email: 'kazi.zubair@devcorp.io', phone: '+8801717901234', city: 'Sylhet', address: 'Zindabazar Point, Sylhet City' },
    { firstName: 'Tahmina', lastName: 'Akter', email: 'tahmina.akter@edu-bd.org', phone: '+8801618012345', city: 'Chittagong', address: 'South Khulshi R/A, Chittagong' },
    { firstName: 'Shahriar', lastName: 'Islam', email: 'shahriar.islam@gamersbd.net', phone: '+8801819123456', city: 'Dhaka', address: 'Block C, Bashundhara R/A' },
  ]

  const createdCustomers: any[] = []
  let totalAddresses = 0
  for (const c of customerProfiles) {
    const doc = await payload.create({
      collection: 'users',
      data: {
        email: c.email,
        phone: c.phone,
        username: c.email,
        password: 'CustomerSeed2026!',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        firstName: c.firstName,
        lastName: c.lastName,
        displayName: `${c.firstName} ${c.lastName}`,
      } as any,
      overrideAccess: true,
    })

    // Seed primary address into addresses collection
    try {
      const addressDoc = await payload.create({
        collection: 'addresses',
        data: {
          user: doc.id,
          label: 'Home',
          firstName: c.firstName,
          lastName: c.lastName,
          street1: c.address,
          city: c.city,
          state: c.city === 'Chittagong' ? 'Chattogram' : c.city === 'Sylhet' ? 'Sylhet' : 'Dhaka Division',
          postalCode: c.city === 'Chittagong' ? '4000' : c.city === 'Sylhet' ? '3100' : '1212',
          country: 'BD',
          phone: c.phone,
          isDefault: true,
        } as any,
        overrideAccess: true,
      })

      // Link address to user profile
      await payload.update({
        collection: 'users',
        id: doc.id,
        data: {
          addresses: [addressDoc.id],
        } as any,
        overrideAccess: true,
      })
      totalAddresses++
    } catch (addrErr: any) {
      payload.logger.warn(`[Electronics Seeder] Address note for ${c.email}: ${addrErr?.message || addrErr}`)
    }

    createdCustomers.push({ ...c, id: doc.id })
  }

  // ─── 8.5. WISHLIST ITEMS FOR REGISTERED CUSTOMERS ─────────────────────────
  let totalWishlistItems = 0
  const wishlistMap: Array<{ customerIndex: number; productIndexes: number[] }> = [
    { customerIndex: 0, productIndexes: [0, 6, 17] },       // Tanvir: iPhone 16 Pro Max, MacBook Pro 16", AirPods Max
    { customerIndex: 1, productIndexes: [1, 4, 18] },       // Sadia: iPhone 16, iPad Pro 13", Sony WH-1000XM5
    { customerIndex: 2, productIndexes: [2, 10, 31] },      // Rahim: Galaxy S24 Ultra, Galaxy Watch Ultra, Anker 737 GaN
    { customerIndex: 3, productIndexes: [3, 11, 23] },      // Farhan: Pixel 9 Pro XL, Pixel Watch 3, Bose QC Ultra
    { customerIndex: 4, productIndexes: [4, 7, 24] },       // Nusrat: iPad Pro 13", MacBook Air 15", Marshall Emberton III
    { customerIndex: 5, productIndexes: [9, 12, 28] },      // Arif: ROG SCAR 18, DJI Mini 4 Pro, TP-Link BE9300
    { customerIndex: 6, productIndexes: [8, 17, 34] },      // Mehnaz: MacBook Air 13", AirPods Max, Dyson V15
    { customerIndex: 7, productIndexes: [13, 20, 30] },     // Zubair: DJI Osmo Pocket 3, Sony WF-1000XM5, Dyson Supersonic
    { customerIndex: 8, productIndexes: [5, 19, 33] },      // Tahmina: iPad Air 11", Bose QuietComfort Ultra Earbuds, Anker MagGo
    { customerIndex: 9, productIndexes: [9, 2, 29] },       // Shahriar: ROG SCAR 18, Galaxy S24 Ultra, TP-Link Archer GE800
  ]

  for (const entry of wishlistMap) {
    const cust = createdCustomers[entry.customerIndex]
    if (!cust) continue
    for (const pIdx of entry.productIndexes) {
      const prod = createdProducts[pIdx]
      if (!prod) continue
      try {
        await payload.create({
          collection: 'wishlist-items',
          data: {
            user: cust.id,
            product: prod.id,
          } as any,
          overrideAccess: true,
        })
        totalWishlistItems++
      } catch (wErr: any) {
        payload.logger.warn(`[Electronics Seeder] Wishlist note: ${wErr?.message || wErr}`)
      }
    }
  }

  // ─── 9. 42 REALISTIC CUSTOMER ORDERS WITH DEVICE TRACKING ───────────────────
  const deviceScenarios = [
    { deviceType: 'mobile', browser: 'Safari 18.1', os: 'iOS 18.0', ip: '103.145.72.18', ref: 'https://www.google.com/search?q=apple+gadgets+bd' },
    { deviceType: 'mobile', browser: 'Chrome Mobile 128', os: 'Android 14', ip: '182.160.114.42', ref: 'https://facebook.com/applegadgetsbd' },
    { deviceType: 'desktop', browser: 'Chrome 152', os: 'macOS Sonoma', ip: '103.205.180.95', ref: 'Direct' },
    { deviceType: 'desktop', browser: 'Edge 128', os: 'Windows 11', ip: '202.4.96.12', ref: 'https://www.google.com/search?q=pickaboo+electronics+bd' },
    { deviceType: 'tablet', browser: 'Safari 18.1', os: 'iPadOS 18.0', ip: '103.145.74.88', ref: 'https://instagram.com/applegadgets' },
  ]

  const paymentChannels = ['online', 'online', 'online', 'cash_on_delivery']
  const paymentStatuses = ['paid', 'paid', 'paid', 'unpaid']
  // Realistic multi-stage fulfillment lifecycle across all stages
  const orderStatuses = [
    'completed',
    'delivered',
    'completed',
    'shipped',
    'processing',
    'delivered',
    'pending',
    'partially-shipped',
    'cancelled',
    'refunded',
  ]

  let totalOrders = 0
  const now = new Date()

  for (let i = 0; i < 42; i++) {
    // For first 10 orders, strictly align cust i with prod i so customer review verified purchase check matches
    const cust = i < 10 ? createdCustomers[i] : createdCustomers[i % createdCustomers.length]
    const prod = i < 10 ? createdProducts[i] : createdProducts[i % createdProducts.length]
    const dev = deviceScenarios[i % deviceScenarios.length]
    const matchingVariants = createdVariants.filter((v) => {
      const pRef = v.product
      const pId = typeof pRef === 'object' ? pRef?.id : pRef
      return String(pId) === String(prod.id)
    })
    const variant = matchingVariants.length > 0 ? matchingVariants[i % matchingVariants.length] : null
    const price = variant ? variant.price : prod.basePrice
    const qty = (i % 4 === 0) ? 2 : 1
    const subtotal = price * qty
    const shippingTotal = (i % 3 === 0) ? 150 : 80
    const discountTotal = (i % 5 === 0) ? 1000 : 0
    const grandTotal = subtotal + shippingTotal - discountTotal

    // Distributed over the past 30 days
    const daysAgo = Math.floor(i * 0.7)
    const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - (i * 29) * 60 * 1000)
    const orderNumSuffix = String(1000 + i).padStart(4, '0')
    const orderNumber = `AG-ORD-202608${String(30 - (daysAgo % 28)).padStart(2, '0')}-${orderNumSuffix}`

    const outlet = createdOutlets[i % createdOutlets.length]
    // The first 10 orders are completed/delivered so customer reviews qualify as verified purchases
    const status = i < 10 ? (i % 2 === 0 ? 'completed' : 'delivered') : orderStatuses[i % orderStatuses.length]
    const paymentStatus =
      status === 'completed' || status === 'delivered' || status === 'shipped'
        ? 'paid'
        : status === 'refunded'
        ? 'refunded'
        : paymentStatuses[i % paymentStatuses.length]

    try {
      const orderDoc = await payload.create({
        collection: 'orders',
        data: {
          orderNumber,
          customer: cust.id,
          status,
          paymentStatus,
          checkoutPaymentChannel: paymentChannels[i % paymentChannels.length],
          currency: 'BDT',
          subtotal,
          shippingTotal,
          discountTotal,
          grandTotal,
          store: outlet.id,
          placedAt: orderDate.toISOString(),
          createdAt: orderDate.toISOString(),
          buyerSnapshot: {
            name: `${cust.firstName} ${cust.lastName}`,
            email: cust.email,
            phone: cust.phone,
            locale: 'en',
          },
          shippingAddress: {
            firstName: cust.firstName,
            lastName: cust.lastName,
            street1: cust.address,
            city: cust.city,
            country: 'BD',
            phone: cust.phone,
          },
          billingAddress: {
            firstName: cust.firstName,
            lastName: cust.lastName,
            street1: cust.address,
            city: cust.city,
            country: 'BD',
            phone: cust.phone,
          },
          deviceTracking: {
            deviceType: dev.deviceType,
            browser: dev.browser,
            os: dev.os,
            ipAddress: dev.ip,
            referrer: dev.ref,
          },
        } as any,
        overrideAccess: true,
      })

      // Create Order Item
      const itemDoc = await payload.create({
        collection: 'order-items',
        data: {
          order: orderDoc.id,
          product: prod.id,
          variant: variant?.id || null,
          productName: variant ? `${prod.name} (${variant.name})` : prod.name,
          productSlug: prod.slug,
          variantName: variant ? variant.name : undefined,
          sku: variant?.sku || prod.sku || `SKU-${prod.slug}`,
          unitPrice: price,
          quantity: qty,
          totalPrice: subtotal,
        } as any,
        overrideAccess: true,
      })

      // Attach item to order
      await payload.update({
        collection: 'orders',
        id: orderDoc.id,
        data: {
          items: [itemDoc.id],
        } as any,
        overrideAccess: true,
      })

      totalOrders++
    } catch (err: any) {
      payload.logger.warn(`[Electronics Seeder] Order #${i} note: ${err?.message || err}`)
    }
  }

  // ─── 10. VERIFIED CUSTOMER REVIEWS & RATING AGGREGATES ─────────────────────
  const reviewsData = [
    { prodIndex: 0, custIndex: 0, rating: 5, title: '100% Authentic Apple Flagship!', comment: 'Received original USA spec iPhone 16 Pro Max with active AppleCare warranty. Same day delivery in Banani!' },
    { prodIndex: 1, custIndex: 1, rating: 5, title: 'Gorgeous Ultramarine Color', comment: 'Loving the new Camera Control button and battery life on iPhone 16. Delivered within 3 hours.' },
    { prodIndex: 2, custIndex: 2, rating: 5, title: 'Galaxy AI is Mindblowing', comment: 'Titanium Gray Galaxy S24 Ultra. The flat display and S-Pen make note-taking so effortless.' },
    { prodIndex: 3, custIndex: 3, rating: 5, title: 'Clean Pixel Experience', comment: 'Pixel 9 Pro XL has the best camera processing on any phone. Very premium build.' },
    { prodIndex: 4, custIndex: 4, rating: 5, title: 'Tandem OLED is Stunning', comment: 'iPad Pro 13" M4 is feather-light and the display brightness under sunlight is unbelievable.' },
    { prodIndex: 5, custIndex: 5, rating: 5, title: 'Perfect Student & Work iPad', comment: 'iPad Air 11" M2 handles multitasking and video calls smoothly without getting warm.' },
    { prodIndex: 6, custIndex: 6, rating: 5, title: 'Unreal M3 Max Rendering Power', comment: 'Bought MacBook Pro 16" for 8K DaVinci Resolve editing. Doesn’t drop a single frame. Sealed box.' },
    { prodIndex: 7, custIndex: 7, rating: 5, title: 'Best Travel Laptop Ever', comment: 'MacBook Air 15" Midnight. Screen is huge yet it fits easily in my backpack. Battery lasts 2 days.' },
    { prodIndex: 8, custIndex: 8, rating: 5, title: 'Compact & Reliable', comment: 'MacBook Air 13" M2 is the sweetest deal for web development and productivity.' },
    { prodIndex: 9, custIndex: 9, rating: 5, title: 'Absolute Gaming Monster', comment: 'ROG SCAR 18 with RTX 4090 runs Cyberpunk at max settings with 120+ FPS. Insane thermal cooling.' },
  ]

  let totalReviews = 0
  for (const r of reviewsData) {
    const p = createdProducts[r.prodIndex]
    const c = createdCustomers[r.custIndex]
    if (p && c) {
      try {
        await payload.create({
          collection: 'product-reviews',
          data: {
            product: p.id,
            author: c.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            status: 'approved',
          } as any,
          user: { id: c.id, role: 'customer' } as any,
          req: { user: { id: c.id, role: 'customer' }, payload } as any,
          overrideAccess: true,
        })

        // Ensure aggregate rating on product is recalculated
        try {
          await recomputeProductRating(payload, { productId: String(p.id) })
        } catch {}

        totalReviews++
      } catch (e: any) {
        payload.logger.warn(`[Electronics Seeder] Review note for prod #${r.prodIndex}: ${e?.message || e}`)
      }
    }
  }

  // ─── 11. ACTIVE PROMO COUPONS ───────────────────────────────────────────────
  const couponsData = [
    { code: 'APPLE10', type: 'percentage', value: 10, minOrderValue: 20000, isActive: true, totalUses: 18 },
    { code: 'GADGET1000', type: 'fixed', value: 1000, minOrderValue: 15000, isActive: true, totalUses: 34 },
    { code: 'TECHFEST', type: 'fixed', value: 2500, minOrderValue: 50000, isActive: true, totalUses: 12 },
    { code: 'FREESHIP', type: 'fixed', value: 150, minOrderValue: 3000, isActive: true, totalUses: 65 },
  ]

  let totalCoupons = 0
  for (const c of couponsData) {
    try {
      await payload.create({
        collection: 'coupons',
        data: c as any,
        overrideAccess: true,
      })
      totalCoupons++
    } catch {
      // ignore
    }
  }

  // ─── 12. ACTIVE & ABANDONED SHOPPING CARTS ──────────────────────────────────
  interface CartSeedDef {
    customerIndex?: number
    guestId?: string
    outletIndex: number
    hoursAgo: number
    couponCode?: string
    customerNote?: string
    items: Array<{
      productIndex: number
      variantIndex?: number
      quantity: number
    }>
  }

  const cartsToSeed: CartSeedDef[] = [
    // ── Active Carts (< 24 hours ago) ──
    {
      customerIndex: 0, // Tanvir Hasan
      outletIndex: 1,
      hoursAgo: 3,
      customerNote: 'Please confirm if Natural Titanium is available before dispatch.',
      items: [
        { productIndex: 0, variantIndex: 0, quantity: 1 }, // iPhone 16 Pro Max
        { productIndex: 31, quantity: 1 },                 // Anker 737 GaN 120W
        { productIndex: 32, quantity: 1 },                 // MagSafe Battery Pack
      ],
    },
    {
      customerIndex: 1, // Sadia Rahman
      outletIndex: 0,
      hoursAgo: 6,
      items: [
        { productIndex: 17, variantIndex: 0, quantity: 1 }, // AirPods Max USB-C
      ],
    },
    {
      guestId: '8f3a1290-b34e-48a1-9c60-e24b8901ad45',
      outletIndex: 2,
      hoursAgo: 1,
      customerNote: 'Need same day delivery in Uttara Sector 3.',
      items: [
        { productIndex: 18, variantIndex: 0, quantity: 1 }, // Sony WH-1000XM5
        { productIndex: 30, quantity: 1 },                  // Anker Prime 250W
      ],
    },
    {
      customerIndex: 2, // Rahim Ahmed
      outletIndex: 0,
      hoursAgo: 8,
      items: [
        { productIndex: 13, variantIndex: 0, quantity: 1 }, // Apple Watch Ultra 2
        { productIndex: 33, quantity: 1 },                  // Apple Pencil Pro
      ],
    },

    // ── Abandoned Carts (>= 24 hours ago) ──
    {
      customerIndex: 3, // Farhan Kabir
      outletIndex: 0,
      hoursAgo: 72, // 3 days ago
      couponCode: 'APPLE10',
      customerNote: 'Will pay via Card EMI once verified with bank.',
      items: [
        { productIndex: 9, variantIndex: 0, quantity: 1 }, // MacBook Pro 16" M3 Max
      ],
    },
    {
      customerIndex: 4, // Nusrat Jahan
      outletIndex: 1,
      hoursAgo: 120, // 5 days ago
      items: [
        { productIndex: 7, variantIndex: 0, quantity: 1 }, // iPad Pro 13" M4
        { productIndex: 33, quantity: 1 },                 // Apple Pencil Pro
      ],
    },
    {
      customerIndex: 5, // Arif Hossain
      outletIndex: 3,
      hoursAgo: 48, // 2 days ago
      couponCode: 'GADGET1000',
      items: [
        { productIndex: 2, variantIndex: 0, quantity: 1 }, // Galaxy S24 Ultra
      ],
    },
    {
      customerIndex: 6, // Mehnaz Haque
      outletIndex: 0,
      hoursAgo: 168, // 7 days ago
      items: [
        { productIndex: 22, variantIndex: 0, quantity: 1 }, // Marshall Stanmore III
        { productIndex: 16, quantity: 1 },                  // AirPods Pro 2
      ],
    },
    {
      customerIndex: 7, // Kazi Zubair
      outletIndex: 2,
      hoursAgo: 96, // 4 days ago
      items: [
        { productIndex: 34, quantity: 1 }, // DJI Mini 4 Pro Fly More Plus
      ],
    },
    {
      customerIndex: 8, // Tahmina Akter
      outletIndex: 3,
      hoursAgo: 144, // 6 days ago
      couponCode: 'FREESHIP',
      items: [
        { productIndex: 14, variantIndex: 0, quantity: 1 }, // Apple Watch Series 10
      ],
    },
    {
      customerIndex: 9, // Shahriar Islam
      outletIndex: 1,
      hoursAgo: 192, // 8 days ago
      items: [
        { productIndex: 12, quantity: 1 }, // Asus ROG Strix SCAR 18
        { productIndex: 36, quantity: 1 }, // Sony PlayStation 5 Slim
      ],
    },
    {
      guestId: 'c2e4f6a8-1b3d-45f7-9a0c-e2b4d6f8a0b2',
      outletIndex: 0,
      hoursAgo: 96, // 4 days ago
      items: [
        { productIndex: 37, quantity: 1 }, // Steam Deck OLED 1TB
      ],
    },
    {
      guestId: 'd3f5a7b9-2c4e-46a8-0b1d-f3c5e7a9b1c3',
      outletIndex: 1,
      hoursAgo: 264, // 11 days ago
      items: [
        { productIndex: 21, variantIndex: 0, quantity: 1 }, // Bose QC Ultra
        { productIndex: 30, quantity: 1 },                  // Anker Prime 250W
      ],
    },
    {
      guestId: 'e4a6b8c0-3d5f-47b9-1c2e-a4d6f8b0c2d4',
      outletIndex: 2,
      hoursAgo: 192, // 8 days ago
      items: [
        { productIndex: 35, quantity: 1 }, // DJI Osmo Pocket 3 Creator Combo
      ],
    },
    {
      guestId: 'f5b7c9d1-4e6a-48ca-2d3f-b5e7a9c1d3e5',
      outletIndex: 0,
      hoursAgo: 120, // 5 days ago
      couponCode: 'TECHFEST',
      items: [
        { productIndex: 24, quantity: 1 }, // Sony BRAVIA XR 65" 4K OLED TV
      ],
    },
  ]

  let activeCartsCount = 0
  let abandonedCartsCount = 0

  for (const cDef of cartsToSeed) {
    const outlet = createdOutlets[cDef.outletIndex % createdOutlets.length]
    const cartDate = new Date(now.getTime() - cDef.hoursAgo * 60 * 60 * 1000)
    const expiresDate = new Date(cartDate.getTime() + 14 * 24 * 60 * 60 * 1000)

    const cartItems: any[] = []
    for (const it of cDef.items) {
      const prod = createdProducts[it.productIndex % createdProducts.length]
      if (!prod) continue
      const matchingVariants = createdVariants.filter((v) => {
        const pRef = v.product
        const pId = typeof pRef === 'object' ? pRef?.id : pRef
        return String(pId) === String(prod.id)
      })
      const variant = it.variantIndex != null && matchingVariants[it.variantIndex]
        ? matchingVariants[it.variantIndex]
        : (matchingVariants.length > 0 ? matchingVariants[0] : null)

      cartItems.push({
        product: prod.id,
        variant: variant?.id || null,
        quantity: it.quantity,
      })
    }

    try {
      const isGuest = Boolean(cDef.guestId)
      const cust = cDef.customerIndex != null ? createdCustomers[cDef.customerIndex] : null

      const cartData: any = {
        items: cartItems,
        store: outlet.id,
        couponCode: cDef.couponCode || undefined,
        customerNote: cDef.customerNote || undefined,
        createdAt: cartDate.toISOString(),
        updatedAt: cartDate.toISOString(),
        expiresAt: expiresDate.toISOString(),
      }

      if (isGuest) {
        cartData.guestId = cDef.guestId
        await payload.create({
          collection: 'carts',
          data: cartData,
          user: null as any,
          req: {
            user: null,
            payload,
            headers: { get: (k: string) => (k.toLowerCase() === 'x-guest-id' ? cDef.guestId! : null) },
          } as any,
          overrideAccess: true,
        })
      } else if (cust) {
        cartData.user = cust.id
        await payload.create({
          collection: 'carts',
          data: cartData,
          user: adminUserDoc as any,
          req: { user: adminUserDoc, payload } as any,
          overrideAccess: true,
        })
      }

      if (cDef.hoursAgo < 24) {
        activeCartsCount++
      } else {
        abandonedCartsCount++
      }
    } catch (cartErr: any) {
      payload.logger.warn(`[Electronics Seeder] Cart note: ${cartErr?.message || cartErr}`)
    }
  }

  payload.logger.info('[Electronics Seeder] Completed successfully!')

  return {
    success: true,
    message: 'Electronics Store demo catalog successfully seeded with clean database wipe.',
    wiped: wipedInfo,
    seeded: {
      categoriesCount: categoriesData.length,
      brandsCount: brandsData.length,
      classesCount: classesData.length,
      productsCount: totalProducts,
      variantsCount: totalVariants,
      outletsCount: createdOutlets.length,
      customersCount: createdCustomers.length,
      addressesCount: totalAddresses,
      wishlistCount: totalWishlistItems,
      ordersCount: totalOrders,
      activeCartsCount,
      abandonedCartsCount,
      reviewsCount: totalReviews,
      couponsCount: totalCoupons,
      heroSlidesCount,
      pagesCount,
    },
  }
}
