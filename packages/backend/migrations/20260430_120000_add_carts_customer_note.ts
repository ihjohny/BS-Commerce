import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Align DB with `customerNote` on carts (checkout seller note → order notes).
 * Baseline migration `20260426_095728` predates this field.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "customer_note" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "carts" DROP COLUMN IF EXISTS "customer_note";
  `)
}
