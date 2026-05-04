import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * COD is modeled on shipping-methods via `collect_payment_on_delivery`.
 * Orders persist `checkout_payment_channel` (online vs cash_on_delivery) for admin / fulfillment.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "shipping_methods"
    ADD COLUMN IF NOT EXISTS "collect_payment_on_delivery" boolean DEFAULT false NOT NULL;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_orders_checkout_payment_channel" AS ENUM('online', 'cash_on_delivery');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    ALTER TABLE "orders"
    ADD COLUMN IF NOT EXISTS "checkout_payment_channel" "enum_orders_checkout_payment_channel" DEFAULT 'online' NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "checkout_payment_channel";
  `)
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_orders_checkout_payment_channel";
  `)
  await db.execute(sql`
    ALTER TABLE "shipping_methods" DROP COLUMN IF EXISTS "collect_payment_on_delivery";
  `)
}
