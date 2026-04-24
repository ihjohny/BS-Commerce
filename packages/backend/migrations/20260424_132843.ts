import { sql } from '@payloadcms/db-postgres'
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'bn');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'vendor', 'customer');
  CREATE TYPE "public"."enum_users_status" AS ENUM('active', 'suspended', 'banned');
  CREATE TYPE "public"."enum_users_locale" AS ENUM('en', 'bn');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en', 'bn');
  CREATE TYPE "public"."enum_tenants_type" AS ENUM('platform-store', 'vendor');
  CREATE TYPE "public"."enum_vendor_settings_commission_type" AS ENUM('percentage', 'flat', 'tiered');
  CREATE TYPE "public"."enum_vendor_settings_payout_method" AS ENUM('stripe', 'bank-transfer', 'manual');
  CREATE TYPE "public"."enum_vendor_settings_shipping_model" AS ENUM('platform', 'vendor', 'hybrid');
  CREATE TYPE "public"."enum_vendor_applications_business_type" AS ENUM('individual', 'company', 'partnership');
  CREATE TYPE "public"."enum_vendor_applications_status" AS ENUM('pending', 'under-review', 'approved', 'rejected');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'pending-review', 'published', 'archived');
  CREATE TYPE "public"."enum_products_sale_display_mode" AS ENUM('none', 'strike_through', 'badge_percent', 'badge_amount', 'strike_and_badge');
  CREATE TYPE "public"."enum_products_currency" AS ENUM('BDT');
  CREATE TYPE "public"."enum_product_variants_sale_display_mode" AS ENUM('inherit', 'none', 'strike_through', 'badge_percent', 'badge_amount', 'strike_and_badge');
  CREATE TYPE "public"."enum_geo_subdivisions_default_service_tier" AS ENUM('standard', 'extended', 'unserved');
  CREATE TYPE "public"."enum_geo_localities_service_tier" AS ENUM('standard', 'extended', 'unserved');
  CREATE TYPE "public"."enum_shipping_methods_type" AS ENUM('flat', 'per-item', 'weight-based');
  CREATE TYPE "public"."enum_shipping_methods_currency" AS ENUM('BDT');
  CREATE TYPE "public"."enum_transactions_type" AS ENUM('charge', 'refund', 'partial-refund');
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'processing', 'partially-shipped', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('unpaid', 'paid', 'partially-refunded', 'refunded');
  CREATE TYPE "public"."enum_sub_orders_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_commission_rules_type" AS ENUM('percentage', 'flat', 'tiered', 'category-based');
  CREATE TYPE "public"."enum_payout_items_status" AS ENUM('included', 'held', 'disputed');
  CREATE TYPE "public"."enum_payouts_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'on-hold');
  CREATE TYPE "public"."enum_verification_codes_type" AS ENUM('email', 'phone');
  CREATE TYPE "public"."enum_coupons_type" AS ENUM('percentage', 'fixed');
  CREATE TYPE "public"."enum_product_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_vendor_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_footer_columns_links_visibility" AS ENUM('public', 'guest', 'authenticated');
  CREATE TYPE "public"."enum_footer_social_links_platform" AS ENUM('facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok');
  CREATE TYPE "public"."enum_platform_settings_currency_supported_currencies" AS ENUM('USD', 'BDT');
  CREATE TYPE "public"."enum_platform_settings_currency_default_currency" AS ENUM('USD', 'BDT');
  CREATE TYPE "public"."enum_platform_settings_vendor_defaults_default_commission_type" AS ENUM('percentage', 'flat', 'tiered');
  CREATE TYPE "public"."enum_platform_settings_vendor_defaults_payout_schedule" AS ENUM('weekly', 'biweekly', 'monthly');
  CREATE TYPE "public"."enum_platform_settings_shipping_default_model" AS ENUM('platform', 'vendor', 'hybrid');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"phone" varchar,
  	"first_name" varchar,
  	"last_name" varchar,
  	"display_name" varchar,
  	"avatar_id" uuid,
  	"role" "enum_users_role" DEFAULT 'customer' NOT NULL,
  	"status" "enum_users_status" DEFAULT 'active' NOT NULL,
  	"email_verified" boolean DEFAULT false,
  	"phone_verified" boolean DEFAULT false,
  	"locale" "enum_users_locale" DEFAULT 'en',
  	"tenant_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar,
  	"username" varchar,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"addresses_id" uuid
  );
  
  CREATE TABLE "media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_tablet_url" varchar,
  	"sizes_tablet_width" numeric,
  	"sizes_tablet_height" numeric,
  	"sizes_tablet_mime_type" varchar,
  	"sizes_tablet_filesize" numeric,
  	"sizes_tablet_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"slug" varchar,
  	"status" "enum_pages_status" DEFAULT 'draft',
  	"meta_image_id" uuid,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"layout" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_slug" varchar,
  	"version_status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"version_meta_image_id" uuid,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_layout" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"slug" varchar,
  	"image_id" uuid,
  	"parent_id" uuid,
  	"display_order" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"commission_override" numeric,
  	"meta_image_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "tenants" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"type" "enum_tenants_type" DEFAULT 'vendor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_profiles_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "vendor_profiles" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"logo_id" uuid,
  	"banner_id" uuid,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"website" varchar,
  	"address_street" varchar,
  	"address_city" varchar,
  	"address_state" varchar,
  	"address_country" varchar,
  	"address_zip" varchar,
  	"rating" numeric DEFAULT 0,
  	"total_sales" numeric DEFAULT 0,
  	"joined_at" timestamp(3) with time zone,
  	"meta_image_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_profiles_locales" (
  	"display_name" varchar NOT NULL,
  	"description" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "vendor_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"commission_rate" numeric,
  	"commission_type" "enum_vendor_settings_commission_type",
  	"payout_method" "enum_vendor_settings_payout_method",
  	"stripe_connect_account_id" varchar,
  	"bank_details_bank_name" varchar,
  	"bank_details_account_number" varchar,
  	"bank_details_routing_number" varchar,
  	"bank_details_iban" varchar,
  	"shipping_model" "enum_vendor_settings_shipping_model",
  	"auto_publish_products" boolean DEFAULT true,
  	"max_products" numeric,
  	"is_active" boolean DEFAULT true,
  	"suspension_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_applications_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"document_id" uuid NOT NULL
  );
  
  CREATE TABLE "vendor_applications" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"applicant_id" uuid,
  	"business_name" varchar NOT NULL,
  	"business_type" "enum_vendor_applications_business_type",
  	"tax_id" varchar,
  	"status" "enum_vendor_applications_status" DEFAULT 'pending' NOT NULL,
  	"reviewed_by_id" uuid,
  	"review_notes" varchar,
  	"rejection_reason" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "products_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"slug" varchar,
  	"sku" varchar,
  	"status" "enum_products_status" DEFAULT 'draft' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"base_price" numeric NOT NULL,
  	"compare_at_price" numeric,
  	"sale_display_mode" "enum_products_sale_display_mode" DEFAULT 'strike_through' NOT NULL,
  	"cost_price" numeric,
  	"currency" "enum_products_currency" DEFAULT 'BDT' NOT NULL,
  	"taxable" boolean DEFAULT true,
  	"weight" numeric,
  	"dimensions_length" numeric,
  	"dimensions_width" numeric,
  	"dimensions_height" numeric,
  	"has_variants" boolean DEFAULT false,
  	"meta_image_id" uuid,
  	"published_at" timestamp(3) with time zone,
  	"rating" numeric DEFAULT 0,
  	"total_reviews" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"short_description" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" uuid
  );
  
  CREATE TABLE "product_variants_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "product_variants" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"product_id" uuid NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"sku" varchar,
  	"price" numeric NOT NULL,
  	"compare_at_price" numeric,
  	"sale_display_mode" "enum_product_variants_sale_display_mode" DEFAULT 'inherit',
  	"image_id" uuid,
  	"weight" numeric,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"vendor_id" uuid,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric
  );
  
  CREATE TABLE "carts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"user_id" uuid,
  	"guest_id" varchar,
  	"subtotal" numeric DEFAULT 0,
  	"coupon_code" varchar,
  	"applied_coupon_id" uuid,
  	"discount_total" numeric DEFAULT 0,
  	"grand_total" numeric DEFAULT 0,
  	"store_id" uuid,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "addresses" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"user_id" uuid NOT NULL,
  	"label" varchar NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"street1" varchar NOT NULL,
  	"street2" varchar,
  	"city" varchar NOT NULL,
  	"state" varchar,
  	"postal_code" varchar,
  	"country" varchar NOT NULL,
  	"phone" varchar,
  	"is_default" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_locations_store_details_coverage_area" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "stock_locations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"tenant_id" uuid,
  	"code" varchar NOT NULL,
  	"slug" varchar,
  	"address_street" varchar,
  	"address_city" varchar,
  	"address_state" varchar,
  	"address_country" varchar,
  	"address_postal_code" varchar,
  	"is_active" boolean DEFAULT true,
  	"is_public_store" boolean DEFAULT false,
  	"sort_priority" numeric DEFAULT 0,
  	"store_details_logo_id" uuid,
  	"store_details_banner_id" uuid,
  	"store_details_contact_email" varchar,
  	"store_details_contact_phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_locations_locales" (
  	"store_details_description" jsonb,
  	"store_details_operating_hours" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "stock_levels" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"location_id" uuid NOT NULL,
  	"quantity" numeric NOT NULL,
  	"reserved_quantity" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_countries" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"iso_code" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_countries_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "geo_subdivisions_geocode_match_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alias" varchar NOT NULL
  );
  
  CREATE TABLE "geo_subdivisions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"country_id" uuid NOT NULL,
  	"code" varchar,
  	"default_service_tier" "enum_geo_subdivisions_default_service_tier" DEFAULT 'standard' NOT NULL,
  	"extended_fee_note" varchar,
  	"extended_lead_time_note" varchar,
  	"unserved_customer_message" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_subdivisions_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "geo_localities_geocode_match_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alias" varchar NOT NULL
  );
  
  CREATE TABLE "geo_localities" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"subdivision_id" uuid NOT NULL,
  	"code" varchar,
  	"service_tier" "enum_geo_localities_service_tier" DEFAULT 'standard' NOT NULL,
  	"extended_fee_note" varchar,
  	"extended_lead_time_note" varchar,
  	"unserved_customer_message" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_localities_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "stock_location_service_areas" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"stock_location_id" uuid NOT NULL,
  	"subdivision_id" uuid NOT NULL,
  	"locality_id" uuid,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shipping_zones_countries" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL
  );
  
  CREATE TABLE "shipping_zones" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shipping_methods" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"zone_id" uuid NOT NULL,
  	"type" "enum_shipping_methods_type" NOT NULL,
  	"rate" numeric NOT NULL,
  	"currency" "enum_shipping_methods_currency" DEFAULT 'BDT' NOT NULL,
  	"min_order_value" numeric,
  	"max_order_value" numeric,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "transactions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"type" "enum_transactions_type" NOT NULL,
  	"provider" varchar NOT NULL,
  	"provider_transaction_id" varchar,
  	"amount" numeric NOT NULL,
  	"currency" varchar NOT NULL,
  	"status" "enum_transactions_status" DEFAULT 'pending' NOT NULL,
  	"platform_fee" numeric,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "order_items" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"sub_order_id" uuid,
  	"tenant_id" uuid,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"stock_level_id" uuid,
  	"product_name" varchar NOT NULL,
  	"item_label" varchar,
  	"variant_name" varchar,
  	"sku" varchar,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric NOT NULL,
  	"total_price" numeric NOT NULL,
  	"product_image" varchar,
  	"vendor_name_snapshot" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "order_status_history" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"from_status" varchar,
  	"to_status" varchar NOT NULL,
  	"changed_by_id" uuid,
  	"reason" varchar,
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_number" varchar NOT NULL,
  	"customer_id" uuid,
  	"guest_email" varchar,
  	"guest_phone" varchar,
  	"buyer_snapshot_email" varchar,
  	"buyer_snapshot_name" varchar,
  	"buyer_snapshot_phone" varchar,
  	"buyer_snapshot_locale" varchar,
  	"idempotency_key" varchar,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"shipping_address_first_name" varchar NOT NULL,
  	"shipping_address_last_name" varchar NOT NULL,
  	"shipping_address_street1" varchar NOT NULL,
  	"shipping_address_street2" varchar,
  	"shipping_address_city" varchar NOT NULL,
  	"shipping_address_state" varchar,
  	"shipping_address_postal_code" varchar,
  	"shipping_address_country" varchar NOT NULL,
  	"shipping_address_phone" varchar,
  	"billing_address_first_name" varchar NOT NULL,
  	"billing_address_last_name" varchar NOT NULL,
  	"billing_address_street1" varchar NOT NULL,
  	"billing_address_street2" varchar,
  	"billing_address_city" varchar NOT NULL,
  	"billing_address_state" varchar,
  	"billing_address_postal_code" varchar,
  	"billing_address_country" varchar NOT NULL,
  	"billing_address_phone" varchar,
  	"subtotal" numeric DEFAULT 0 NOT NULL,
  	"shipping_total" numeric DEFAULT 0 NOT NULL,
  	"tax_total" numeric DEFAULT 0 NOT NULL,
  	"discount_total" numeric DEFAULT 0 NOT NULL,
  	"applied_coupon_id" uuid,
  	"coupon_code_snapshot" varchar,
  	"grand_total" numeric DEFAULT 0 NOT NULL,
  	"currency" varchar NOT NULL,
  	"payment_status" "enum_orders_payment_status" DEFAULT 'unpaid' NOT NULL,
  	"transaction_id" uuid,
  	"store_id" uuid,
  	"notes" varchar,
  	"placed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"order_items_id" uuid,
  	"sub_orders_id" uuid
  );
  
  CREATE TABLE "sub_orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_order_id" uuid NOT NULL,
  	"parent_order_number" varchar,
  	"tenant_id" uuid NOT NULL,
  	"tenant_name_snapshot" varchar,
  	"sub_order_number" varchar NOT NULL,
  	"status" "enum_sub_orders_status" DEFAULT 'pending' NOT NULL,
  	"subtotal" numeric DEFAULT 0 NOT NULL,
  	"shipping_total" numeric DEFAULT 0 NOT NULL,
  	"tax_total" numeric DEFAULT 0 NOT NULL,
  	"commission_amount" numeric DEFAULT 0 NOT NULL,
  	"commission_rate" numeric,
  	"vendor_earnings" numeric DEFAULT 0 NOT NULL,
  	"shipping_method" varchar,
  	"tracking_number" varchar,
  	"tracking_url" varchar,
  	"shipped_at" timestamp(3) with time zone,
  	"delivered_at" timestamp(3) with time zone,
  	"fulfilled_by_id" uuid,
  	"store_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sub_orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"order_items_id" uuid
  );
  
  CREATE TABLE "commission_rules_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"min_amount" numeric NOT NULL,
  	"max_amount" numeric,
  	"rate" numeric NOT NULL
  );
  
  CREATE TABLE "commission_rules" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_commission_rules_type" NOT NULL,
  	"rate" numeric,
  	"category_rate" numeric,
  	"tenant_id" uuid,
  	"priority" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "commission_rules_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" uuid
  );
  
  CREATE TABLE "payout_items" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"payout_id" uuid NOT NULL,
  	"sub_order_id" uuid NOT NULL,
  	"order_number" varchar,
  	"amount" numeric NOT NULL,
  	"commission" numeric DEFAULT 0 NOT NULL,
  	"status" "enum_payout_items_status" DEFAULT 'included',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payouts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"period_start" timestamp(3) with time zone NOT NULL,
  	"period_end" timestamp(3) with time zone NOT NULL,
  	"total_earnings" numeric DEFAULT 0 NOT NULL,
  	"total_commission" numeric DEFAULT 0 NOT NULL,
  	"net_amount" numeric DEFAULT 0 NOT NULL,
  	"status" "enum_payouts_status" DEFAULT 'pending' NOT NULL,
  	"method" varchar,
  	"provider_payout_id" varchar,
  	"processed_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payouts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"payout_items_id" uuid
  );
  
  CREATE TABLE "verification_codes" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"identifier" varchar NOT NULL,
  	"type" "enum_verification_codes_type" NOT NULL,
  	"code" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"used" boolean DEFAULT false,
  	"used_at" timestamp(3) with time zone,
  	"ip" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "coupons" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"type" "enum_coupons_type" DEFAULT 'percentage' NOT NULL,
  	"value" numeric NOT NULL,
  	"min_order_value" numeric DEFAULT 0,
  	"expires_at" timestamp(3) with time zone,
  	"max_total_uses" numeric,
  	"max_uses_per_user" numeric,
  	"is_active" boolean DEFAULT true,
  	"total_uses" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "product_reviews" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"product_id" uuid NOT NULL,
  	"author_id" uuid NOT NULL,
  	"rating" numeric NOT NULL,
  	"title" varchar,
  	"status" "enum_product_reviews_status" DEFAULT 'approved' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "product_reviews_locales" (
  	"comment" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "vendor_reviews" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"author_id" uuid NOT NULL,
  	"rating" numeric NOT NULL,
  	"title" varchar,
  	"status" "enum_vendor_reviews_status" DEFAULT 'approved' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_reviews_locales" (
  	"comment" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"media_id" uuid,
  	"pages_id" uuid,
  	"categories_id" uuid,
  	"tenants_id" uuid,
  	"vendor_profiles_id" uuid,
  	"vendor_settings_id" uuid,
  	"vendor_applications_id" uuid,
  	"products_id" uuid,
  	"product_variants_id" uuid,
  	"carts_id" uuid,
  	"addresses_id" uuid,
  	"stock_locations_id" uuid,
  	"stock_levels_id" uuid,
  	"geo_countries_id" uuid,
  	"geo_subdivisions_id" uuid,
  	"geo_localities_id" uuid,
  	"stock_location_service_areas_id" uuid,
  	"shipping_zones_id" uuid,
  	"shipping_methods_id" uuid,
  	"transactions_id" uuid,
  	"order_items_id" uuid,
  	"order_status_history_id" uuid,
  	"orders_id" uuid,
  	"sub_orders_id" uuid,
  	"commission_rules_id" uuid,
  	"payout_items_id" uuid,
  	"payouts_id" uuid,
  	"verification_codes_id" uuid,
  	"coupons_id" uuid,
  	"product_reviews_id" uuid,
  	"vendor_reviews_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "header_nav_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false,
  	"show_in_desktop_nav" boolean DEFAULT true,
  	"show_in_mobile_drawer" boolean DEFAULT true
  );
  
  CREATE TABLE "header" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"logo_id" uuid,
  	"announcement_bar_enabled" boolean DEFAULT false,
  	"announcement_bar_background_color" varchar DEFAULT '#000000',
  	"announcement_bar_text_color" varchar DEFAULT '#ffffff',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "header_locales" (
  	"site_name" varchar DEFAULT 'BS-Commerce',
  	"announcement_bar_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"visibility" "enum_footer_columns_links_visibility" DEFAULT 'public'
  );
  
  CREATE TABLE "footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL
  );
  
  CREATE TABLE "footer_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_footer_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "footer_bottom_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "footer" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_locales" (
  	"copyright_text" varchar DEFAULT '© 2026 BS-Commerce. All rights reserved.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "platform_settings_currency_supported_currencies" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_platform_settings_currency_supported_currencies",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "platform_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"platform_name" varchar DEFAULT 'BS-Commerce',
  	"support_email" varchar,
  	"support_phone" varchar,
  	"admin_branding_logo_id" uuid,
  	"admin_branding_favicon_id" uuid,
  	"admin_branding_login_tagline" varchar,
  	"features_multivendor_enabled" boolean DEFAULT false,
  	"features_guest_checkout_enabled" boolean DEFAULT true,
  	"features_reviews_enabled" boolean DEFAULT true,
  	"features_review_requires_approval" boolean DEFAULT false,
  	"features_inventory_tracking_enabled" boolean DEFAULT true,
  	"features_social_login_enabled" boolean DEFAULT true,
  	"currency_default_currency" "enum_platform_settings_currency_default_currency" DEFAULT 'USD',
  	"currency_usd_to_bdt_rate" numeric DEFAULT 110,
  	"currency_last_rate_updated" timestamp(3) with time zone,
  	"vendor_defaults_default_commission_rate" numeric DEFAULT 0,
  	"vendor_defaults_default_commission_type" "enum_platform_settings_vendor_defaults_default_commission_type" DEFAULT 'percentage',
  	"vendor_defaults_auto_approve_vendors" boolean DEFAULT false,
  	"vendor_defaults_require_k_y_c" boolean DEFAULT false,
  	"vendor_defaults_require_product_approval" boolean DEFAULT false,
  	"vendor_defaults_payout_schedule" "enum_platform_settings_vendor_defaults_payout_schedule" DEFAULT 'biweekly',
  	"vendor_defaults_payout_hold_days" numeric DEFAULT 7,
  	"inventory_low_stock_threshold" numeric DEFAULT 10,
  	"shipping_default_model" "enum_platform_settings_shipping_default_model" DEFAULT 'platform',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_profiles_social_links" ADD CONSTRAINT "vendor_profiles_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles_locales" ADD CONSTRAINT "vendor_profiles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_settings" ADD CONSTRAINT "vendor_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_applications_documents" ADD CONSTRAINT "vendor_applications_documents_document_id_media_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_applications_documents" ADD CONSTRAINT "vendor_applications_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_tags" ADD CONSTRAINT "products_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants_options" ADD CONSTRAINT "product_variants_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_vendor_id_tenants_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_applied_coupon_id_coupons_id_fk" FOREIGN KEY ("applied_coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_stock_locations_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations_store_details_coverage_area" ADD CONSTRAINT "stock_locations_store_details_coverage_area_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_store_details_logo_id_media_id_fk" FOREIGN KEY ("store_details_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_store_details_banner_id_media_id_fk" FOREIGN KEY ("store_details_banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations_locales" ADD CONSTRAINT "stock_locations_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "geo_countries_locales" ADD CONSTRAINT "geo_countries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_subdivisions_geocode_match_aliases" ADD CONSTRAINT "geo_subdivisions_geocode_match_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_subdivisions" ADD CONSTRAINT "geo_subdivisions_country_id_geo_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."geo_countries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "geo_subdivisions_locales" ADD CONSTRAINT "geo_subdivisions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_localities_geocode_match_aliases" ADD CONSTRAINT "geo_localities_geocode_match_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_localities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_localities" ADD CONSTRAINT "geo_localities_subdivision_id_geo_subdivisions_id_fk" FOREIGN KEY ("subdivision_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "geo_localities_locales" ADD CONSTRAINT "geo_localities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_localities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stock_location_service_areas" ADD CONSTRAINT "stock_location_service_areas_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("stock_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_location_service_areas" ADD CONSTRAINT "stock_location_service_areas_subdivision_id_geo_subdivisions_id_fk" FOREIGN KEY ("subdivision_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_location_service_areas" ADD CONSTRAINT "stock_location_service_areas_locality_id_geo_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."geo_localities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shipping_zones_countries" ADD CONSTRAINT "shipping_zones_countries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sub_order_id_sub_orders_id_fk" FOREIGN KEY ("sub_order_id") REFERENCES "public"."sub_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_stock_level_id_stock_levels_id_fk" FOREIGN KEY ("stock_level_id") REFERENCES "public"."stock_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_applied_coupon_id_coupons_id_fk" FOREIGN KEY ("applied_coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stock_locations_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_order_items_fk" FOREIGN KEY ("order_items_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_sub_orders_fk" FOREIGN KEY ("sub_orders_id") REFERENCES "public"."sub_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_parent_order_id_orders_id_fk" FOREIGN KEY ("parent_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_fulfilled_by_id_users_id_fk" FOREIGN KEY ("fulfilled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_store_id_stock_locations_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders_rels" ADD CONSTRAINT "sub_orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sub_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sub_orders_rels" ADD CONSTRAINT "sub_orders_rels_order_items_fk" FOREIGN KEY ("order_items_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commission_rules_tiers" ADD CONSTRAINT "commission_rules_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."commission_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commission_rules_rels" ADD CONSTRAINT "commission_rules_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."commission_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commission_rules_rels" ADD CONSTRAINT "commission_rules_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_sub_order_id_sub_orders_id_fk" FOREIGN KEY ("sub_order_id") REFERENCES "public"."sub_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payouts_rels" ADD CONSTRAINT "payouts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payouts_rels" ADD CONSTRAINT "payouts_rels_payout_items_fk" FOREIGN KEY ("payout_items_id") REFERENCES "public"."payout_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_reviews_locales" ADD CONSTRAINT "product_reviews_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_reviews" ADD CONSTRAINT "vendor_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_reviews" ADD CONSTRAINT "vendor_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_reviews_locales" ADD CONSTRAINT "vendor_reviews_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_profiles_fk" FOREIGN KEY ("vendor_profiles_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_settings_fk" FOREIGN KEY ("vendor_settings_id") REFERENCES "public"."vendor_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_applications_fk" FOREIGN KEY ("vendor_applications_id") REFERENCES "public"."vendor_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_locations_fk" FOREIGN KEY ("stock_locations_id") REFERENCES "public"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_levels_fk" FOREIGN KEY ("stock_levels_id") REFERENCES "public"."stock_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_geo_countries_fk" FOREIGN KEY ("geo_countries_id") REFERENCES "public"."geo_countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_geo_subdivisions_fk" FOREIGN KEY ("geo_subdivisions_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_geo_localities_fk" FOREIGN KEY ("geo_localities_id") REFERENCES "public"."geo_localities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_location_service_area_fk" FOREIGN KEY ("stock_location_service_areas_id") REFERENCES "public"."stock_location_service_areas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_zones_fk" FOREIGN KEY ("shipping_zones_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_methods_fk" FOREIGN KEY ("shipping_methods_id") REFERENCES "public"."shipping_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_items_fk" FOREIGN KEY ("order_items_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_status_history_fk" FOREIGN KEY ("order_status_history_id") REFERENCES "public"."order_status_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sub_orders_fk" FOREIGN KEY ("sub_orders_id") REFERENCES "public"."sub_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commission_rules_fk" FOREIGN KEY ("commission_rules_id") REFERENCES "public"."commission_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_items_fk" FOREIGN KEY ("payout_items_id") REFERENCES "public"."payout_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payouts_fk" FOREIGN KEY ("payouts_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verification_codes_fk" FOREIGN KEY ("verification_codes_id") REFERENCES "public"."verification_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupons_fk" FOREIGN KEY ("coupons_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_reviews_fk" FOREIGN KEY ("product_reviews_id") REFERENCES "public"."product_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_reviews_fk" FOREIGN KEY ("vendor_reviews_id") REFERENCES "public"."vendor_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_nav_links" ADD CONSTRAINT "header_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header" ADD CONSTRAINT "header_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header_locales" ADD CONSTRAINT "header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_social_links" ADD CONSTRAINT "footer_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_bottom_links" ADD CONSTRAINT "footer_bottom_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings_currency_supported_currencies" ADD CONSTRAINT "platform_settings_currency_supported_currencies_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."platform_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_admin_branding_logo_id_media_id_fk" FOREIGN KEY ("admin_branding_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_admin_branding_favicon_id_media_id_fk" FOREIGN KEY ("admin_branding_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_addresses_id_idx" ON "users_rels" USING btree ("addresses_id");
  CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_tablet_sizes_tablet_filename_idx" ON "media" USING btree ("sizes_tablet_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_meta_meta_image_idx" ON "categories" USING btree ("meta_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");
  CREATE INDEX "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  CREATE INDEX "vendor_profiles_social_links_order_idx" ON "vendor_profiles_social_links" USING btree ("_order");
  CREATE INDEX "vendor_profiles_social_links_parent_id_idx" ON "vendor_profiles_social_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "vendor_profiles_tenant_idx" ON "vendor_profiles" USING btree ("tenant_id");
  CREATE INDEX "vendor_profiles_logo_idx" ON "vendor_profiles" USING btree ("logo_id");
  CREATE INDEX "vendor_profiles_banner_idx" ON "vendor_profiles" USING btree ("banner_id");
  CREATE INDEX "vendor_profiles_meta_meta_image_idx" ON "vendor_profiles" USING btree ("meta_image_id");
  CREATE INDEX "vendor_profiles_updated_at_idx" ON "vendor_profiles" USING btree ("updated_at");
  CREATE INDEX "vendor_profiles_created_at_idx" ON "vendor_profiles" USING btree ("created_at");
  CREATE UNIQUE INDEX "vendor_profiles_locales_locale_parent_id_unique" ON "vendor_profiles_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "vendor_settings_tenant_idx" ON "vendor_settings" USING btree ("tenant_id");
  CREATE INDEX "vendor_settings_updated_at_idx" ON "vendor_settings" USING btree ("updated_at");
  CREATE INDEX "vendor_settings_created_at_idx" ON "vendor_settings" USING btree ("created_at");
  CREATE INDEX "vendor_applications_documents_order_idx" ON "vendor_applications_documents" USING btree ("_order");
  CREATE INDEX "vendor_applications_documents_parent_id_idx" ON "vendor_applications_documents" USING btree ("_parent_id");
  CREATE INDEX "vendor_applications_documents_document_idx" ON "vendor_applications_documents" USING btree ("document_id");
  CREATE INDEX "vendor_applications_applicant_idx" ON "vendor_applications" USING btree ("applicant_id");
  CREATE INDEX "vendor_applications_reviewed_by_idx" ON "vendor_applications" USING btree ("reviewed_by_id");
  CREATE INDEX "vendor_applications_updated_at_idx" ON "vendor_applications" USING btree ("updated_at");
  CREATE INDEX "vendor_applications_created_at_idx" ON "vendor_applications" USING btree ("created_at");
  CREATE INDEX "products_tags_order_idx" ON "products_tags" USING btree ("_order");
  CREATE INDEX "products_tags_parent_id_idx" ON "products_tags" USING btree ("_parent_id");
  CREATE INDEX "products_images_order_idx" ON "products_images" USING btree ("_order");
  CREATE INDEX "products_images_parent_id_idx" ON "products_images" USING btree ("_parent_id");
  CREATE INDEX "products_images_image_idx" ON "products_images" USING btree ("image_id");
  CREATE INDEX "products_tenant_idx" ON "products" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_meta_meta_image_idx" ON "products" USING btree ("meta_image_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_categories_id_idx" ON "products_rels" USING btree ("categories_id");
  CREATE INDEX "product_variants_options_order_idx" ON "product_variants_options" USING btree ("_order");
  CREATE INDEX "product_variants_options_parent_id_idx" ON "product_variants_options" USING btree ("_parent_id");
  CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");
  CREATE INDEX "product_variants_tenant_idx" ON "product_variants" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");
  CREATE INDEX "product_variants_image_idx" ON "product_variants" USING btree ("image_id");
  CREATE INDEX "product_variants_updated_at_idx" ON "product_variants" USING btree ("updated_at");
  CREATE INDEX "product_variants_created_at_idx" ON "product_variants" USING btree ("created_at");
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_items_variant_idx" ON "carts_items" USING btree ("variant_id");
  CREATE INDEX "carts_items_vendor_idx" ON "carts_items" USING btree ("vendor_id");
  CREATE INDEX "carts_user_idx" ON "carts" USING btree ("user_id");
  CREATE INDEX "carts_guest_id_idx" ON "carts" USING btree ("guest_id");
  CREATE INDEX "carts_applied_coupon_idx" ON "carts" USING btree ("applied_coupon_id");
  CREATE INDEX "carts_store_idx" ON "carts" USING btree ("store_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");
  CREATE INDEX "addresses_updated_at_idx" ON "addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "addresses" USING btree ("created_at");
  CREATE INDEX "stock_locations_store_details_coverage_area_order_idx" ON "stock_locations_store_details_coverage_area" USING btree ("_order");
  CREATE INDEX "stock_locations_store_details_coverage_area_parent_id_idx" ON "stock_locations_store_details_coverage_area" USING btree ("_parent_id");
  CREATE INDEX "stock_locations_tenant_idx" ON "stock_locations" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "stock_locations_code_idx" ON "stock_locations" USING btree ("code");
  CREATE UNIQUE INDEX "stock_locations_slug_idx" ON "stock_locations" USING btree ("slug");
  CREATE INDEX "stock_locations_store_details_store_details_logo_idx" ON "stock_locations" USING btree ("store_details_logo_id");
  CREATE INDEX "stock_locations_store_details_store_details_banner_idx" ON "stock_locations" USING btree ("store_details_banner_id");
  CREATE INDEX "stock_locations_updated_at_idx" ON "stock_locations" USING btree ("updated_at");
  CREATE INDEX "stock_locations_created_at_idx" ON "stock_locations" USING btree ("created_at");
  CREATE UNIQUE INDEX "stock_locations_locales_locale_parent_id_unique" ON "stock_locations_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "stock_levels_product_idx" ON "stock_levels" USING btree ("product_id");
  CREATE INDEX "stock_levels_variant_idx" ON "stock_levels" USING btree ("variant_id");
  CREATE INDEX "stock_levels_location_idx" ON "stock_levels" USING btree ("location_id");
  CREATE INDEX "stock_levels_updated_at_idx" ON "stock_levels" USING btree ("updated_at");
  CREATE INDEX "stock_levels_created_at_idx" ON "stock_levels" USING btree ("created_at");
  CREATE INDEX "geo_countries_updated_at_idx" ON "geo_countries" USING btree ("updated_at");
  CREATE INDEX "geo_countries_created_at_idx" ON "geo_countries" USING btree ("created_at");
  CREATE UNIQUE INDEX "geo_countries_locales_locale_parent_id_unique" ON "geo_countries_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "geo_subdivisions_geocode_match_aliases_order_idx" ON "geo_subdivisions_geocode_match_aliases" USING btree ("_order");
  CREATE INDEX "geo_subdivisions_geocode_match_aliases_parent_id_idx" ON "geo_subdivisions_geocode_match_aliases" USING btree ("_parent_id");
  CREATE INDEX "geo_subdivisions_country_idx" ON "geo_subdivisions" USING btree ("country_id");
  CREATE INDEX "geo_subdivisions_code_idx" ON "geo_subdivisions" USING btree ("code");
  CREATE INDEX "geo_subdivisions_updated_at_idx" ON "geo_subdivisions" USING btree ("updated_at");
  CREATE INDEX "geo_subdivisions_created_at_idx" ON "geo_subdivisions" USING btree ("created_at");
  CREATE UNIQUE INDEX "geo_subdivisions_locales_locale_parent_id_unique" ON "geo_subdivisions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "geo_localities_geocode_match_aliases_order_idx" ON "geo_localities_geocode_match_aliases" USING btree ("_order");
  CREATE INDEX "geo_localities_geocode_match_aliases_parent_id_idx" ON "geo_localities_geocode_match_aliases" USING btree ("_parent_id");
  CREATE INDEX "geo_localities_subdivision_idx" ON "geo_localities" USING btree ("subdivision_id");
  CREATE INDEX "geo_localities_code_idx" ON "geo_localities" USING btree ("code");
  CREATE INDEX "geo_localities_updated_at_idx" ON "geo_localities" USING btree ("updated_at");
  CREATE INDEX "geo_localities_created_at_idx" ON "geo_localities" USING btree ("created_at");
  CREATE UNIQUE INDEX "geo_localities_locales_locale_parent_id_unique" ON "geo_localities_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "stock_location_service_areas_stock_location_idx" ON "stock_location_service_areas" USING btree ("stock_location_id");
  CREATE INDEX "stock_location_service_areas_subdivision_idx" ON "stock_location_service_areas" USING btree ("subdivision_id");
  CREATE INDEX "stock_location_service_areas_locality_idx" ON "stock_location_service_areas" USING btree ("locality_id");
  CREATE INDEX "stock_location_service_areas_updated_at_idx" ON "stock_location_service_areas" USING btree ("updated_at");
  CREATE INDEX "stock_location_service_areas_created_at_idx" ON "stock_location_service_areas" USING btree ("created_at");
  CREATE INDEX "shipping_zones_countries_order_idx" ON "shipping_zones_countries" USING btree ("_order");
  CREATE INDEX "shipping_zones_countries_parent_id_idx" ON "shipping_zones_countries" USING btree ("_parent_id");
  CREATE INDEX "shipping_zones_updated_at_idx" ON "shipping_zones" USING btree ("updated_at");
  CREATE INDEX "shipping_zones_created_at_idx" ON "shipping_zones" USING btree ("created_at");
  CREATE INDEX "shipping_methods_zone_idx" ON "shipping_methods" USING btree ("zone_id");
  CREATE INDEX "shipping_methods_updated_at_idx" ON "shipping_methods" USING btree ("updated_at");
  CREATE INDEX "shipping_methods_created_at_idx" ON "shipping_methods" USING btree ("created_at");
  CREATE INDEX "transactions_order_idx" ON "transactions" USING btree ("order_id");
  CREATE INDEX "transactions_updated_at_idx" ON "transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");
  CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");
  CREATE INDEX "order_items_sub_order_idx" ON "order_items" USING btree ("sub_order_id");
  CREATE INDEX "order_items_tenant_idx" ON "order_items" USING btree ("tenant_id");
  CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");
  CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("variant_id");
  CREATE INDEX "order_items_stock_level_idx" ON "order_items" USING btree ("stock_level_id");
  CREATE INDEX "order_items_updated_at_idx" ON "order_items" USING btree ("updated_at");
  CREATE INDEX "order_items_created_at_idx" ON "order_items" USING btree ("created_at");
  CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id");
  CREATE INDEX "order_status_history_changed_by_idx" ON "order_status_history" USING btree ("changed_by_id");
  CREATE INDEX "order_status_history_updated_at_idx" ON "order_status_history" USING btree ("updated_at");
  CREATE INDEX "order_status_history_created_at_idx" ON "order_status_history" USING btree ("created_at");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_idempotency_key_idx" ON "orders" USING btree ("idempotency_key");
  CREATE INDEX "orders_applied_coupon_idx" ON "orders" USING btree ("applied_coupon_id");
  CREATE INDEX "orders_transaction_idx" ON "orders" USING btree ("transaction_id");
  CREATE INDEX "orders_store_idx" ON "orders" USING btree ("store_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "orders_rels_order_idx" ON "orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_order_items_id_idx" ON "orders_rels" USING btree ("order_items_id");
  CREATE INDEX "orders_rels_sub_orders_id_idx" ON "orders_rels" USING btree ("sub_orders_id");
  CREATE INDEX "sub_orders_parent_order_idx" ON "sub_orders" USING btree ("parent_order_id");
  CREATE INDEX "sub_orders_tenant_idx" ON "sub_orders" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "sub_orders_sub_order_number_idx" ON "sub_orders" USING btree ("sub_order_number");
  CREATE INDEX "sub_orders_fulfilled_by_idx" ON "sub_orders" USING btree ("fulfilled_by_id");
  CREATE INDEX "sub_orders_store_idx" ON "sub_orders" USING btree ("store_id");
  CREATE INDEX "sub_orders_updated_at_idx" ON "sub_orders" USING btree ("updated_at");
  CREATE INDEX "sub_orders_created_at_idx" ON "sub_orders" USING btree ("created_at");
  CREATE INDEX "sub_orders_rels_order_idx" ON "sub_orders_rels" USING btree ("order");
  CREATE INDEX "sub_orders_rels_parent_idx" ON "sub_orders_rels" USING btree ("parent_id");
  CREATE INDEX "sub_orders_rels_path_idx" ON "sub_orders_rels" USING btree ("path");
  CREATE INDEX "sub_orders_rels_order_items_id_idx" ON "sub_orders_rels" USING btree ("order_items_id");
  CREATE INDEX "commission_rules_tiers_order_idx" ON "commission_rules_tiers" USING btree ("_order");
  CREATE INDEX "commission_rules_tiers_parent_id_idx" ON "commission_rules_tiers" USING btree ("_parent_id");
  CREATE INDEX "commission_rules_tenant_idx" ON "commission_rules" USING btree ("tenant_id");
  CREATE INDEX "commission_rules_updated_at_idx" ON "commission_rules" USING btree ("updated_at");
  CREATE INDEX "commission_rules_created_at_idx" ON "commission_rules" USING btree ("created_at");
  CREATE INDEX "commission_rules_rels_order_idx" ON "commission_rules_rels" USING btree ("order");
  CREATE INDEX "commission_rules_rels_parent_idx" ON "commission_rules_rels" USING btree ("parent_id");
  CREATE INDEX "commission_rules_rels_path_idx" ON "commission_rules_rels" USING btree ("path");
  CREATE INDEX "commission_rules_rels_categories_id_idx" ON "commission_rules_rels" USING btree ("categories_id");
  CREATE INDEX "payout_items_payout_idx" ON "payout_items" USING btree ("payout_id");
  CREATE INDEX "payout_items_sub_order_idx" ON "payout_items" USING btree ("sub_order_id");
  CREATE INDEX "payout_items_updated_at_idx" ON "payout_items" USING btree ("updated_at");
  CREATE INDEX "payout_items_created_at_idx" ON "payout_items" USING btree ("created_at");
  CREATE INDEX "payouts_tenant_idx" ON "payouts" USING btree ("tenant_id");
  CREATE INDEX "payouts_updated_at_idx" ON "payouts" USING btree ("updated_at");
  CREATE INDEX "payouts_created_at_idx" ON "payouts" USING btree ("created_at");
  CREATE INDEX "payouts_rels_order_idx" ON "payouts_rels" USING btree ("order");
  CREATE INDEX "payouts_rels_parent_idx" ON "payouts_rels" USING btree ("parent_id");
  CREATE INDEX "payouts_rels_path_idx" ON "payouts_rels" USING btree ("path");
  CREATE INDEX "payouts_rels_payout_items_id_idx" ON "payouts_rels" USING btree ("payout_items_id");
  CREATE INDEX "verification_codes_updated_at_idx" ON "verification_codes" USING btree ("updated_at");
  CREATE INDEX "verification_codes_created_at_idx" ON "verification_codes" USING btree ("created_at");
  CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");
  CREATE INDEX "coupons_updated_at_idx" ON "coupons" USING btree ("updated_at");
  CREATE INDEX "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
  CREATE INDEX "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id");
  CREATE INDEX "product_reviews_author_idx" ON "product_reviews" USING btree ("author_id");
  CREATE INDEX "product_reviews_updated_at_idx" ON "product_reviews" USING btree ("updated_at");
  CREATE INDEX "product_reviews_created_at_idx" ON "product_reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "product_reviews_locales_locale_parent_id_unique" ON "product_reviews_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "vendor_reviews_tenant_idx" ON "vendor_reviews" USING btree ("tenant_id");
  CREATE INDEX "vendor_reviews_author_idx" ON "vendor_reviews" USING btree ("author_id");
  CREATE INDEX "vendor_reviews_updated_at_idx" ON "vendor_reviews" USING btree ("updated_at");
  CREATE INDEX "vendor_reviews_created_at_idx" ON "vendor_reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "vendor_reviews_locales_locale_parent_id_unique" ON "vendor_reviews_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_settings_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_applications_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_product_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("product_variants_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_stock_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_locations_id");
  CREATE INDEX "payload_locked_documents_rels_stock_levels_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_levels_id");
  CREATE INDEX "payload_locked_documents_rels_geo_countries_id_idx" ON "payload_locked_documents_rels" USING btree ("geo_countries_id");
  CREATE INDEX "payload_locked_documents_rels_geo_subdivisions_id_idx" ON "payload_locked_documents_rels" USING btree ("geo_subdivisions_id");
  CREATE INDEX "payload_locked_documents_rels_geo_localities_id_idx" ON "payload_locked_documents_rels" USING btree ("geo_localities_id");
  CREATE INDEX "payload_locked_documents_rels_stock_location_service_are_idx" ON "payload_locked_documents_rels" USING btree ("stock_location_service_areas_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_zones_id_idx" ON "payload_locked_documents_rels" USING btree ("shipping_zones_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_methods_id_idx" ON "payload_locked_documents_rels" USING btree ("shipping_methods_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_locked_documents_rels_order_items_id_idx" ON "payload_locked_documents_rels" USING btree ("order_items_id");
  CREATE INDEX "payload_locked_documents_rels_order_status_history_id_idx" ON "payload_locked_documents_rels" USING btree ("order_status_history_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_sub_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("sub_orders_id");
  CREATE INDEX "payload_locked_documents_rels_commission_rules_id_idx" ON "payload_locked_documents_rels" USING btree ("commission_rules_id");
  CREATE INDEX "payload_locked_documents_rels_payout_items_id_idx" ON "payload_locked_documents_rels" USING btree ("payout_items_id");
  CREATE INDEX "payload_locked_documents_rels_payouts_id_idx" ON "payload_locked_documents_rels" USING btree ("payouts_id");
  CREATE INDEX "payload_locked_documents_rels_verification_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("verification_codes_id");
  CREATE INDEX "payload_locked_documents_rels_coupons_id_idx" ON "payload_locked_documents_rels" USING btree ("coupons_id");
  CREATE INDEX "payload_locked_documents_rels_product_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("product_reviews_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_reviews_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "header_nav_links_order_idx" ON "header_nav_links" USING btree ("_order");
  CREATE INDEX "header_nav_links_parent_id_idx" ON "header_nav_links" USING btree ("_parent_id");
  CREATE INDEX "header_nav_links_locale_idx" ON "header_nav_links" USING btree ("_locale");
  CREATE INDEX "header_logo_idx" ON "header" USING btree ("logo_id");
  CREATE UNIQUE INDEX "header_locales_locale_parent_id_unique" ON "header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_columns_links_order_idx" ON "footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_links_locale_idx" ON "footer_columns_links" USING btree ("_locale");
  CREATE INDEX "footer_columns_order_idx" ON "footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "footer_columns" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_locale_idx" ON "footer_columns" USING btree ("_locale");
  CREATE INDEX "footer_social_links_order_idx" ON "footer_social_links" USING btree ("_order");
  CREATE INDEX "footer_social_links_parent_id_idx" ON "footer_social_links" USING btree ("_parent_id");
  CREATE INDEX "footer_bottom_links_order_idx" ON "footer_bottom_links" USING btree ("_order");
  CREATE INDEX "footer_bottom_links_parent_id_idx" ON "footer_bottom_links" USING btree ("_parent_id");
  CREATE INDEX "footer_bottom_links_locale_idx" ON "footer_bottom_links" USING btree ("_locale");
  CREATE UNIQUE INDEX "footer_locales_locale_parent_id_unique" ON "footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "platform_settings_currency_supported_currencies_order_idx" ON "platform_settings_currency_supported_currencies" USING btree ("order");
  CREATE INDEX "platform_settings_currency_supported_currencies_parent_idx" ON "platform_settings_currency_supported_currencies" USING btree ("parent_id");
  CREATE INDEX "platform_settings_admin_branding_admin_branding_logo_idx" ON "platform_settings" USING btree ("admin_branding_logo_id");
  CREATE INDEX "platform_settings_admin_branding_admin_branding_favicon_idx" ON "platform_settings" USING btree ("admin_branding_favicon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "tenants" CASCADE;
  DROP TABLE "vendor_profiles_social_links" CASCADE;
  DROP TABLE "vendor_profiles" CASCADE;
  DROP TABLE "vendor_profiles_locales" CASCADE;
  DROP TABLE "vendor_settings" CASCADE;
  DROP TABLE "vendor_applications_documents" CASCADE;
  DROP TABLE "vendor_applications" CASCADE;
  DROP TABLE "products_tags" CASCADE;
  DROP TABLE "products_images" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "product_variants_options" CASCADE;
  DROP TABLE "product_variants" CASCADE;
  DROP TABLE "carts_items" CASCADE;
  DROP TABLE "carts" CASCADE;
  DROP TABLE "addresses" CASCADE;
  DROP TABLE "stock_locations_store_details_coverage_area" CASCADE;
  DROP TABLE "stock_locations" CASCADE;
  DROP TABLE "stock_locations_locales" CASCADE;
  DROP TABLE "stock_levels" CASCADE;
  DROP TABLE "geo_countries" CASCADE;
  DROP TABLE "geo_countries_locales" CASCADE;
  DROP TABLE "geo_subdivisions_geocode_match_aliases" CASCADE;
  DROP TABLE "geo_subdivisions" CASCADE;
  DROP TABLE "geo_subdivisions_locales" CASCADE;
  DROP TABLE "geo_localities_geocode_match_aliases" CASCADE;
  DROP TABLE "geo_localities" CASCADE;
  DROP TABLE "geo_localities_locales" CASCADE;
  DROP TABLE "stock_location_service_areas" CASCADE;
  DROP TABLE "shipping_zones_countries" CASCADE;
  DROP TABLE "shipping_zones" CASCADE;
  DROP TABLE "shipping_methods" CASCADE;
  DROP TABLE "transactions" CASCADE;
  DROP TABLE "order_items" CASCADE;
  DROP TABLE "order_status_history" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "orders_rels" CASCADE;
  DROP TABLE "sub_orders" CASCADE;
  DROP TABLE "sub_orders_rels" CASCADE;
  DROP TABLE "commission_rules_tiers" CASCADE;
  DROP TABLE "commission_rules" CASCADE;
  DROP TABLE "commission_rules_rels" CASCADE;
  DROP TABLE "payout_items" CASCADE;
  DROP TABLE "payouts" CASCADE;
  DROP TABLE "payouts_rels" CASCADE;
  DROP TABLE "verification_codes" CASCADE;
  DROP TABLE "coupons" CASCADE;
  DROP TABLE "product_reviews" CASCADE;
  DROP TABLE "product_reviews_locales" CASCADE;
  DROP TABLE "vendor_reviews" CASCADE;
  DROP TABLE "vendor_reviews_locales" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "header_nav_links" CASCADE;
  DROP TABLE "header" CASCADE;
  DROP TABLE "header_locales" CASCADE;
  DROP TABLE "footer_columns_links" CASCADE;
  DROP TABLE "footer_columns" CASCADE;
  DROP TABLE "footer_social_links" CASCADE;
  DROP TABLE "footer_bottom_links" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "footer_locales" CASCADE;
  DROP TABLE "platform_settings_currency_supported_currencies" CASCADE;
  DROP TABLE "platform_settings" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_status";
  DROP TYPE "public"."enum_users_locale";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_tenants_type";
  DROP TYPE "public"."enum_vendor_settings_commission_type";
  DROP TYPE "public"."enum_vendor_settings_payout_method";
  DROP TYPE "public"."enum_vendor_settings_shipping_model";
  DROP TYPE "public"."enum_vendor_applications_business_type";
  DROP TYPE "public"."enum_vendor_applications_status";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_products_sale_display_mode";
  DROP TYPE "public"."enum_products_currency";
  DROP TYPE "public"."enum_product_variants_sale_display_mode";
  DROP TYPE "public"."enum_geo_subdivisions_default_service_tier";
  DROP TYPE "public"."enum_geo_localities_service_tier";
  DROP TYPE "public"."enum_shipping_methods_type";
  DROP TYPE "public"."enum_shipping_methods_currency";
  DROP TYPE "public"."enum_transactions_type";
  DROP TYPE "public"."enum_transactions_status";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_payment_status";
  DROP TYPE "public"."enum_sub_orders_status";
  DROP TYPE "public"."enum_commission_rules_type";
  DROP TYPE "public"."enum_payout_items_status";
  DROP TYPE "public"."enum_payouts_status";
  DROP TYPE "public"."enum_verification_codes_type";
  DROP TYPE "public"."enum_coupons_type";
  DROP TYPE "public"."enum_product_reviews_status";
  DROP TYPE "public"."enum_vendor_reviews_status";
  DROP TYPE "public"."enum_footer_columns_links_visibility";
  DROP TYPE "public"."enum_footer_social_links_platform";
  DROP TYPE "public"."enum_platform_settings_currency_supported_currencies";
  DROP TYPE "public"."enum_platform_settings_currency_default_currency";
  DROP TYPE "public"."enum_platform_settings_vendor_defaults_default_commission_type";
  DROP TYPE "public"."enum_platform_settings_vendor_defaults_payout_schedule";
  DROP TYPE "public"."enum_platform_settings_shipping_default_model";`)
}
