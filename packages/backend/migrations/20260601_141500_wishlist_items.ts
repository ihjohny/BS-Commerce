import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const idType = (process.env.DATABASE_ID_TYPE as 'serial' | 'uuid' | undefined) ?? 'uuid'

  if (idType === 'serial') {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "wishlist_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "product_id" integer NOT NULL,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      );

      DO $$
      BEGIN
        -- Recovery path for partially-applied previous versions of this migration.
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'wishlist_items'
            AND column_name = 'id'
            AND udt_name <> 'int4'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM "wishlist_items"
            WHERE btrim("id"::text) !~ '^[0-9]+$'
          ) THEN
            RAISE EXCEPTION 'wishlist_items.id contains non-integer values; cleanup required before migration';
          END IF;
          ALTER TABLE "wishlist_items" ALTER COLUMN "id" TYPE integer USING ("id"::integer);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'wishlist_items'
            AND column_name = 'user_id'
            AND udt_name <> 'int4'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM "wishlist_items"
            WHERE btrim("user_id"::text) !~ '^[0-9]+$'
          ) THEN
            RAISE EXCEPTION 'wishlist_items.user_id contains non-integer values; cleanup required before migration';
          END IF;
          ALTER TABLE "wishlist_items" ALTER COLUMN "user_id" TYPE integer USING ("user_id"::integer);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'wishlist_items'
            AND column_name = 'product_id'
            AND udt_name <> 'int4'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM "wishlist_items"
            WHERE btrim("product_id"::text) !~ '^[0-9]+$'
          ) THEN
            RAISE EXCEPTION 'wishlist_items.product_id contains non-integer values; cleanup required before migration';
          END IF;
          ALTER TABLE "wishlist_items" ALTER COLUMN "product_id" TYPE integer USING ("product_id"::integer);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_class WHERE relname = 'wishlist_items_id_seq'
        ) THEN
          CREATE SEQUENCE "wishlist_items_id_seq";
        END IF;

        ALTER TABLE "wishlist_items" ALTER COLUMN "id" SET DEFAULT nextval('"wishlist_items_id_seq"');
        ALTER SEQUENCE "wishlist_items_id_seq" OWNED BY "wishlist_items"."id";
        PERFORM setval('"wishlist_items_id_seq"', COALESCE((SELECT MAX("id") FROM "wishlist_items"), 0) + 1, false);
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_user_fk'
        ) THEN
          ALTER TABLE "wishlist_items"
            ADD CONSTRAINT "wishlist_items_user_fk"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_product_fk'
        ) THEN
          ALTER TABLE "wishlist_items"
            ADD CONSTRAINT "wishlist_items_product_fk"
            FOREIGN KEY ("product_id") REFERENCES "products"("id")
            ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS "wishlist_items_user_idx" ON "wishlist_items" USING btree ("user_id");
      CREATE INDEX IF NOT EXISTS "wishlist_items_product_idx" ON "wishlist_items" USING btree ("product_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_user_product_unique"
        ON "wishlist_items" USING btree ("user_id", "product_id");
    `)
    return
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "wishlist_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "product_id" uuid NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$
    BEGIN
      -- Recovery path for partially-applied previous versions of this migration.
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wishlist_items'
          AND column_name = 'id'
          AND udt_name <> 'uuid'
      ) THEN
        IF EXISTS (
          SELECT 1
          FROM "wishlist_items"
          WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ) THEN
          RAISE EXCEPTION 'wishlist_items.id contains non-UUID values; cleanup required before migration';
        END IF;
        ALTER TABLE "wishlist_items" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wishlist_items'
          AND column_name = 'user_id'
          AND udt_name <> 'uuid'
      ) THEN
        IF EXISTS (
          SELECT 1
          FROM "wishlist_items"
          WHERE "user_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ) THEN
          RAISE EXCEPTION 'wishlist_items.user_id contains non-UUID values; cleanup required before migration';
        END IF;
        ALTER TABLE "wishlist_items" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wishlist_items'
          AND column_name = 'product_id'
          AND udt_name <> 'uuid'
      ) THEN
        IF EXISTS (
          SELECT 1
          FROM "wishlist_items"
          WHERE "product_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ) THEN
          RAISE EXCEPTION 'wishlist_items.product_id contains non-UUID values; cleanup required before migration';
        END IF;
        ALTER TABLE "wishlist_items" ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid;
      END IF;
    END $$;

    ALTER TABLE "wishlist_items"
      ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_user_fk'
      ) THEN
        ALTER TABLE "wishlist_items"
          ADD CONSTRAINT "wishlist_items_user_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_product_fk'
      ) THEN
        ALTER TABLE "wishlist_items"
          ADD CONSTRAINT "wishlist_items_product_fk"
          FOREIGN KEY ("product_id") REFERENCES "products"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "wishlist_items_user_idx" ON "wishlist_items" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "wishlist_items_product_idx" ON "wishlist_items" USING btree ("product_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_user_product_unique"
      ON "wishlist_items" USING btree ("user_id", "product_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "wishlist_items_user_product_unique";
    DROP INDEX IF EXISTS "wishlist_items_product_idx";
    DROP INDEX IF EXISTS "wishlist_items_user_idx";
    ALTER TABLE IF EXISTS "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_product_fk";
    ALTER TABLE IF EXISTS "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_user_fk";
    DROP TABLE IF EXISTS "wishlist_items" CASCADE;
  `)
}
