import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Immutable PDP slug snapshot at checkout (`order-items.productSlug`).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_slug" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "order_items" DROP COLUMN IF EXISTS "product_slug";
  `)
}
