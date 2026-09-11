import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Add flat_discount and flat_discount_reason columns to carts table.
 * Allows admins to apply courtesy or flat promotional discounts directly to customer carts.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "flat_discount" numeric DEFAULT 0;
    ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "flat_discount_reason" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "carts" DROP COLUMN IF EXISTS "flat_discount";
    ALTER TABLE "carts" DROP COLUMN IF EXISTS "flat_discount_reason";
  `)
}
