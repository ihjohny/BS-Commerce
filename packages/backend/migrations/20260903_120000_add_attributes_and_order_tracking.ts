import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Enums
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_attributes_type" AS ENUM('brand', 'manufacturer', 'series', 'material', 'feature', 'custom');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_orders_device_tracking_device_type" AS ENUM('desktop', 'mobile', 'tablet', 'bot', 'unknown');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_attributes_properties_property_type" AS ENUM('text', 'number', 'boolean', 'color');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // 2. Attributes base table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "attributes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "key" character varying NOT NULL,
      "type" "enum_attributes_type" DEFAULT 'brand' NOT NULL,
      "slug" character varying,
      "logo_id" uuid,
      "website" character varying,
      "featured" boolean DEFAULT false,
      "display_order" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "attributes" ADD CONSTRAINT "attributes_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "attributes_key_idx" ON "attributes" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "attributes_type_idx" ON "attributes" USING btree ("type");
    CREATE UNIQUE INDEX IF NOT EXISTS "attributes_slug_idx" ON "attributes" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "attributes_logo_idx" ON "attributes" USING btree ("logo_id");
    CREATE INDEX IF NOT EXISTS "attributes_created_at_idx" ON "attributes" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "attributes_updated_at_idx" ON "attributes" USING btree ("updated_at");
  `)

  // 3. Attributes localized table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "attributes_locales" (
      "label" character varying NOT NULL,
      "description" character varying,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" uuid NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "attributes_locales" ADD CONSTRAINT "attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "attributes_locales_locale_parent_id_unique" ON "attributes_locales" USING btree ("_locale", "_parent_id");
  `)

  // 4. Attributes dynamic properties table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "attributes_properties" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" character varying PRIMARY KEY NOT NULL,
      "property_key" character varying NOT NULL,
      "property_value" character varying NOT NULL,
      "property_type" "enum_attributes_properties_property_type" DEFAULT 'text'
    );

    DO $$ BEGIN
      ALTER TABLE "attributes_properties" ADD CONSTRAINT "attributes_properties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "attributes_properties_order_idx" ON "attributes_properties" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "attributes_properties_parent_id_idx" ON "attributes_properties" USING btree ("_parent_id");
  `)

  // 5. Products rels link for attributes
  await db.execute(sql`
    ALTER TABLE "products_rels" ADD COLUMN IF NOT EXISTS "attributes_id" uuid;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_rels_attributes_fk'
      ) THEN
        ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "products_rels_attributes_id_idx" ON "products_rels" USING btree ("attributes_id");
  `)

  // 6. Orders device tracking columns
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_ip_address" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_user_agent" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_device_type" "enum_orders_device_tracking_device_type";
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_browser" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_os" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_referrer" character varying;
  `)

  // 7. Payload locked documents rels
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "attributes_id" uuid;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_attributes_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_attributes_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_attributes_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "attributes_id";

    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_ip_address";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_user_agent";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_device_type";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_browser";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_os";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_referrer";

    ALTER TABLE "products_rels" DROP CONSTRAINT IF EXISTS "products_rels_attributes_fk";
    DROP INDEX IF EXISTS "products_rels_attributes_id_idx";
    ALTER TABLE "products_rels" DROP COLUMN IF EXISTS "attributes_id";

    DROP TABLE IF EXISTS "attributes_properties";
    DROP TABLE IF EXISTS "attributes_locales";
    DROP TABLE IF EXISTS "attributes";

    DROP TYPE IF EXISTS "public"."enum_attributes_properties_property_type";
    DROP TYPE IF EXISTS "public"."enum_orders_device_tracking_device_type";
    DROP TYPE IF EXISTS "public"."enum_attributes_type";
  `)
}
