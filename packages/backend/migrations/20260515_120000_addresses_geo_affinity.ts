import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "addresses"
      ADD COLUMN IF NOT EXISTS "geo_country_id" varchar,
      ADD COLUMN IF NOT EXISTS "geo_subdivision_id" varchar,
      ADD COLUMN IF NOT EXISTS "geo_locality_id" varchar,
      ADD COLUMN IF NOT EXISTS "preferred_store_id" varchar;

    CREATE INDEX IF NOT EXISTS "addresses_geo_country_idx"
      ON "addresses" USING btree ("geo_country_id");
    CREATE INDEX IF NOT EXISTS "addresses_geo_subdivision_idx"
      ON "addresses" USING btree ("geo_subdivision_id");
    CREATE INDEX IF NOT EXISTS "addresses_geo_locality_idx"
      ON "addresses" USING btree ("geo_locality_id");
    CREATE INDEX IF NOT EXISTS "addresses_preferred_store_idx"
      ON "addresses" USING btree ("preferred_store_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "addresses_geo_country_idx";
    DROP INDEX IF EXISTS "addresses_geo_subdivision_idx";
    DROP INDEX IF EXISTS "addresses_geo_locality_idx";
    DROP INDEX IF EXISTS "addresses_preferred_store_idx";

    ALTER TABLE "addresses"
      DROP COLUMN IF EXISTS "geo_country_id",
      DROP COLUMN IF EXISTS "geo_subdivision_id",
      DROP COLUMN IF EXISTS "geo_locality_id",
      DROP COLUMN IF EXISTS "preferred_store_id";
  `)
}
