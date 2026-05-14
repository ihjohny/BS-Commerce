import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_product_type" AS ENUM('standard', 'bundle');
  CREATE TABLE "products_bundle_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  ALTER TABLE "products" ADD COLUMN "product_type" "enum_products_product_type" DEFAULT 'standard' NOT NULL;
  ALTER TABLE "products_bundle_items" ADD CONSTRAINT "products_bundle_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
  ALTER TABLE "products_bundle_items" ADD CONSTRAINT "products_bundle_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_bundle_items" ADD CONSTRAINT "products_bundle_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_bundle_items_order_idx" ON "products_bundle_items" USING btree ("_order");
  CREATE INDEX "products_bundle_items_parent_id_idx" ON "products_bundle_items" USING btree ("_parent_id");
  CREATE INDEX "products_bundle_items_product_idx" ON "products_bundle_items" USING btree ("product_id");
  CREATE INDEX "products_bundle_items_variant_idx" ON "products_bundle_items" USING btree ("variant_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_bundle_items" CASCADE;
  ALTER TABLE "products" DROP COLUMN "product_type";
  DROP TYPE "public"."enum_products_product_type";`)
}
