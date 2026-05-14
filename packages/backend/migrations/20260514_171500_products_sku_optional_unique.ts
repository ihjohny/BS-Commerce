import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "products"
    SET "sku" = NULL
    WHERE "sku" IS NOT NULL
      AND btrim("sku") = '';

    CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_unique_non_null_idx"
      ON "products" USING btree ("sku")
      WHERE "sku" IS NOT NULL
        AND btrim("sku") <> '';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "products_sku_unique_non_null_idx";
  `)
}
