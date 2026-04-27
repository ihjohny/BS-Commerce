# Farm Greens seed — Payload collections reference

This document maps **`scripts/seed-farm-greens.mjs`** to the **actual Payload collection schemas** in `packages/backend/src`. Use it when extending the manifest or seed so you only send fields the API accepts, and you know which optional fields you are not using yet.

Paths are relative to `packages/backend/src/` unless noted.

---

## Quick index

| API slug / collection | Config source |
|----------------------|---------------|
| `shipping-zones` | `plugins/shipping/collections/shipping-zones.ts` |
| `shipping-methods` | `plugins/shipping/collections/shipping-methods.ts` |
| `categories` | `collections/categories/index.ts` |
| `products` | `plugins/ecommerce/collections/products.ts` |
| `product-variants` | `plugins/ecommerce/collections/product-variants.ts` |
| `stock-locations` | `plugins/inventory/collections/stock-locations.ts` |
| `stock-levels` | `plugins/inventory/collections/stock-levels.ts` |
| `geo-countries` | `plugins/geography/collections/geo-countries.ts` |
| `geo-subdivisions` | `plugins/geography/collections/geo-subdivisions.ts` |
| `geo-localities` | `plugins/geography/collections/geo-localities.ts` |
| `stock-location-service-areas` | `plugins/geography/collections/stock-location-service-areas.ts` |
| `media` | `collections/media/index.ts` (upload) |
| `users` | `collections/users/index.ts` |

---

## `shipping-zones`

**Fields:** `name` (text, required), `countries` (array of `{ code }` — ISO, e.g. `BD`), `isActive` (checkbox).

**Seed:** `name`, `countries` from manifest `shipping.zones[]`.

**Not used in seed:** (none — schema is minimal).

---

## `shipping-methods`

**Fields:** `name` (required), `zone` (relation → `shipping-zones`, required), `type` (`flat` | `per-item` | `weight-based`), `rate` (number ≥ 0), `currency` (select), `minOrderValue`, `maxOrderValue`, `isActive`.

**Seed:** `name`, `zone` (id), `type`, `rate`, `currency`, `isActive`, optional `minOrderValue` / `maxOrderValue` from `shipping.methods[]`.

**Room to extend:** `minOrderValue` / `maxOrderValue` for free-shipping thresholds; `type` and `weight-based` if you add weight to products and teach the storefront to use them.

**Green vs gray:** The schema has **no** `serviceTier` on methods. **Green/gray** is expressed by **separate method rows** (different `name` + `rate`) and should be **chosen at checkout** using the customer’s resolved **`geo-localities.serviceTier`** (see `farm-greens.manifest.json` `shipping.zoneTierNote`).

---

## `categories`

**Fields (high level):** `name` (localized text), `slug` (from `slugField`), `description` (richText, localized), `image` (upload), `parent` (self-relation), `displayOrder`, `isActive`, `commissionOverride`, `meta` (SEO group: title, description, image).

**Seed:** only **`name`**, **`slug`**. The manifest’s **`shortLabel`** is **not** a category field; it is documentation / storefront copy only unless you add a custom field or map it into `description`.

---

## `products`

**Fields (high level):** `name` (localized, required), `slug`, `description` (richText, localized), `shortDescription` (textarea, localized), `sku`, `status` (`draft` | `pending-review` | `published` | `archived`), `featured`, `categories` (many), `tags` (array of `{ tag }`), `images` (array of `{ image }` → `media`), `basePrice`, `compareAtPrice`, `saleDisplayMode`, `costPrice`, `currency`, `taxable`, `weight`, `dimensions` (group), `hasVariants`, `meta` (SEO), `publishedAt`, `rating`, `totalReviews` (read-only in admin).

**Multivendor:** `tenant` when `MULTIVENDOR_ENABLED`.

**Seed:** `name`, `slug`, `basePrice`, `currency`, `status`, `shortDescription`, `description` (lexical from manifest `fullDescription`), `featured`, `categories`, `images`.

**Room to extend:** `tags`, `weight`, `dimensions`, `compareAtPrice`, `meta`, `publishedAt`, `sku` on the product, etc.

---

## `product-variants`

**Fields:** `product` (relation), `name`, `sku` (unique), `price`, `compareAtPrice`, `saleDisplayMode`, `options` (array `{ name, value }`), `image` (upload), `weight`, `isActive`. **Multivendor:** `tenant`.

**Seed:** one default variant: `name` (string from `labelName(p.name)`), `sku` derived from product slug, `price` = `basePriceBdt`, `options` = Size/Standard, optional `image`.

**Room to extend:** weight, compare-at, more `options` rows.

---

## `stock-locations`

**Fields:** `name`, `code` (unique), `slug` (for public store URLs), `address` (group: `street`, `city`, `state`, `country`, `postalCode`), `isActive`, `isPublicStore`, `sortPriority`, **`storeDetails`** (group, **only if** `isPublicStore`): `description` (richText, localized), `logo`, `banner` (uploads), `contactEmail`, `contactPhone`, `operatingHours` (localized), `coverageArea` (array of `{ value }`).

**Multivendor:** `tenant` when multivendor is on.

**Seed:** from manifest `warehouses` / `stores`: `name`, `code`, `sortPriority`, `slug`, `isPublicStore`, `isActive`, `address`, `storeDetails` (email, phone, hours, `coverageArea`).

**Important:** The manifest sometimes includes **`storeDetails.notes`**. There is **no** `notes` field on `storeDetails` in the schema. Extra keys are typically **ignored or stripped** by the API; treat **`notes` in the manifest as human documentation only** unless you add a field to the collection.

**Room to extend:** `storeDetails.description`, `logo`, `banner` for branded store pages.

---

## `stock-levels`

**Fields:** `title` (read-only, auto), `product`, `variant` (optional), `location`, `quantity`, `reservedQuantity`.

**Seed:** `product`, `location`, `quantity`, `reservedQuantity: 0` (no `variant` — product-level stock).

**Room to extend:** attach `variant` if you want variant-level stock only.

---

## `geo-countries`

**Fields:** `name` (localized), `isoCode` (e.g. `BD`), `isActive`.

**Seed:** hard-coded Bangladesh on create if collection empty; manifest `geo.country` is not re-read for every field (name comes from code path).

---

## `geo-subdivisions`

**Fields:** `country`, `name` (localized), `code`, `defaultServiceTier` (`standard` | `extended` | `unserved`), `geocodeMatchAliases` (array `{ alias }`), `extendedFeeNote`, `extendedLeadTimeNote`, `unservedCustomerMessage`, `isActive`.

**Seed:** from `geo.subdivisions[]`: `name`, `code`, `defaultServiceTier` (defaults to `standard` in code). **Aliases and notes** are **not** currently passed from the manifest for subdivisions; extend `ensureGeoSub` in the seed if you add them to the manifest.

---

## `geo-localities`

**Fields:** `subdivision`, `name` (localized), `code`, `serviceTier` (`standard` = green, `extended` = gray, `unserved` = red), `geocodeMatchAliases` (array `{ alias }`), `extendedFeeNote`, `extendedLeadTimeNote`, `unservedCustomerMessage`, `isActive`.

**Seed:** `buildGeoLocalityBody()` sends `name`, `code`, `serviceTier`, `geocodeMatchAliases`, optional fee/lead time notes. Existing rows are **PATCH**ed on re-run.

**Manifest:** `geo.localities[]` in `farm-greens.manifest.json` should stay aligned with these fields.

---

## `stock-location-service-areas`

**Fields:** `stockLocation`, `subdivision` (required), `locality` (optional), `sortOrder`.

**Rules:** If `locality` is set, the hook fills `subdivision` from that locality. Empty `locality` = whole-subdivision row.

**Seed:** For each store, for each `linkSubdivisions` code → subdivision-only area; for each `linkLocalityCodes` → locality + subdivision.

---

## `media` (upload)

**Upload** plus fields: `alt` (localized), `caption` (localized).

**Seed:** multipart upload; passes **`alt`** from product name label. **No `caption`** in seed.

---

## `users`

**Fields (partial):** `email`, `phone`, `username`, `firstName`, `lastName`, `role`, `status`, `password` (auth), etc. See `collections/users/index.ts` for the full set.

**Seed:** `first-register` for admin, `POST /users` for customer with `email`, `password`, `role`, `status`, `emailVerified`.

---

## Manifest-only keys (not a Payload model)

The JSON file **`data/farm-greens.manifest.json`** also carries **orchestration data** that is **not** a single collection:

- `imageBaseDir`, `productCatalogFile`, `imageAttribution`, `branding`, `description`, `currency`, `accounts`, **`shipping.zoneTierNote`**, and the **`geo`** block as **input** to the seed (then split across collections above).

`assets/product_images/products.catalog.json` is **not** read by the seed today; it is a **sidecar** list for humans / tooling. Extending the seed to import from the catalog would be a code change.

---

## Related doc

- Runbook: [seed-farm-greens.md](./seed-farm-greens.md)
