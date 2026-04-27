# Farm Greens seed — reference

Seeds the **Farm Greens** Bangladesh (BDT) catalogue: shipping zones and methods, categories, stock locations (warehouse + stores), optional geography and service areas, product media uploads, stock levels, and product variants. A single run also **preflight**-refreshes optional narrative JSON and category cover downloads, and applies **storefront** defaults from `data/farm-greens.storefront.json` (header, footer, platform currency, home hero page `home-hero-banners`, and static pages such as about / Dhaka delivery).

**Multivendor:** when `MULTIVENDOR_ENABLED=true`, the script finds or creates a **platform-store** tenant (slug from `manifest.branding.projectSlug`, default `farm-greens`) and sets **products** and **stock locations** to that tenant. Override with **`FARM_GREENS_TENANT_ID`** if you already have a tenant id. When multivendor is off, no tenant is sent.

**Script:** `scripts/seed-farm-greens.mjs`  
**Manifest (default):** `data/farm-greens.manifest.json`  
**Product image catalog (optional metadata):** `<monorepo>/assets/product_images/products.catalog.json` (image files may live there or elsewhere; see below).

Run all commands from the **`BS-Commerce`** directory unless noted.

---

## New empty database (migrations + seed)

1. **Create** an empty PostgreSQL database matching `DATABASE_URI` in `packages/backend/.env` (e.g. `createdb your_db` or `CREATE DATABASE …` in `psql`).
2. **Migrate:** from `packages/backend` run `yarn db:migrate`, or from repo root: `yarn workspace @bs-commerce/backend db:migrate` with `DATABASE_URI` (and other required vars) in the environment so Payload sees the same DB as the app.
3. **Start the API** (`yarn dev`, `yarn dev:host:mv`, etc.), then **seed:** `PAYLOAD_SEED_BASE=http://localhost:PORT yarn seed:farm-greens`

For a **production-like** local run (no dev HMR): `yarn workspace @bs-commerce/backend build` then `yarn workspace @bs-commerce/backend start` (set `PORT` as needed).

---

## Prerequisites

- Backend running with migrations applied (e.g. `yarn dev` in the backend package as your project expects).
- Recommended: `INVENTORY_ENABLED=true`, `GEOGRAPHY_ENABLED=true` (for geo and service areas). **`MULTIVENDOR_ENABLED`** can be `true` or `false` — the script adapts (tenant + per-locale writes when multivendor is on; see below).
- Network access to the Payload API. Match **`PAYLOAD_SEED_BASE`** to the port your API uses (default `http://localhost:3000`; if `.env` sets another `PORT`, use that, e.g. `http://localhost:3004`).

---

## Quick start

**Category cover JPEGs** are expected under `assets/product_category_images/` (names in the manifest, e.g. `category-fresh-vegetables.jpg`). The seed script’s **preflight** step runs the same download logic when possible (network required). If files are still missing, the seeder uploads a tiny placeholder JPEG so categories are not imageless.

```bash
yarn seed:farm-greens
```

Equivalent:

```bash
node scripts/seed-farm-greens.mjs
```

With API origin:

```bash
PAYLOAD_SEED_BASE=http://localhost:3000 yarn seed:farm-greens
```

---

## Data files

| Item | Path |
|------|------|
| Seed manifest | `BS-Commerce/data/farm-greens.manifest.json` |
| Image filename catalog | `<repo root>/assets/product_images/products.catalog.json` |
| Product images (default) | `<repo root>/assets/product_images/` (see `imageBaseDir` in the manifest) |
| Category cover images (default) | `<repo root>/assets/product_category_images/` (see `categoryImageBaseDir` and each category’s `imageFile` in the manifest) |
| Product copy + SEO (optional) | `BS-Commerce/data/farm-greens.narratives.json` — merged by slug; manifest wins on `basePriceBdt`, `imageFiles`, `categorySlugs`. The seed preflight step regenerates this file; to run only the generator: `node scripts/emit-farm-greens-narratives.mjs`. |
| Storefront (header, footer, hero, pages, BDT) | `BS-Commerce/data/farm-greens.storefront.json` — applied idempotently after products are seeded (omit with `FARM_GREENS_SKIP_STOREFRONT=true`). |

The manifest’s `imageBaseDir` is relative to **BS-Commerce** (e.g. `../assets/product_images`).  
`categoryImageBaseDir` uses the same rule (e.g. `../assets/product_category_images`).  
If images are **outside** the repository, set **`FARM_GREENS_IMAGE_DIR`** (products) and/or **`FARM_GREENS_CATEGORY_IMAGE_DIR`** (categories) to the absolute folder that contains the same filenames as in the manifest.

---

## Geography, green vs gray, and OSM / Nominatim names

- **`geo.localities`** in the manifest feed **`geo-localities`** in Payload. Each row has a stable **`code`**, a localized **`name`**, **`serviceTier`**: `standard` (admin label: *green*), `extended` (*gray*), or `unserved` (*red*).
- **`geocodeMatchAliases`**: list of alternate spellings from OpenStreetMap / Nominatim reverse geocoding (e.g. “Mahakali” vs “Mahakhali”, “Mirpur Baro” vs “Mirpur 12”, “D.O.H.S. Mirpur”). The storefront matcher can use these to attach the user’s coordinates to the right locality.
- **Shipping** (same country zone) includes **green** and **gray** method pairs: standard Pathao `60` BDT vs extended `120` BDT, and matching COD lines. The storefront should pick the method that matches the resolved locality’s `serviceTier` (see `shipping.zoneTierNote` in the manifest).
- **Stores** `geo.linkLocalityCodes` list which localities that hub serves (Gulshan hub includes e.g. Mahakhali, Gulshan 1/2, Uttara; Mirpur hub includes Mirpur 6/10/11/12, Pallabi, DOHS, plus gray Shewrapara / Agargaon).

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `PAYLOAD_SEED_BASE` / `BASE_URL` | API origin (default: `http://localhost:3000`). Must be the same origin as the running backend. |
| `FARM_GREENS_TENANT_ID` | When multivendor is on: use this **tenants** document id; skips find-by-slug / create. |
| `FARM_GREENS_MANIFEST_PATH` | Full path to override the manifest file. Default: `data/farm-greens.manifest.json` under `BS-Commerce`. |
| `FARM_GRAINS_MANIFEST_PATH` | Legacy alias; used only if `FARM_GREENS_MANIFEST_PATH` is unset. |
| `FARM_GREENS_IMAGE_DIR` | Absolute path to the product image directory (overrides manifest `imageBaseDir`). |
| `FARM_GREENS_CATEGORY_IMAGE_DIR` | Absolute path to category cover images (overrides manifest `categoryImageBaseDir`). |
| `SEED_DATA_PASSWORD` | Default password for seeded users when more specific vars are not set (default: `Asd@1234`). |
| `SEED_ADMIN_PASSWORD` | Overrides the admin password for login and `first-register`. |
| `SEED_CUSTOMER_PASSWORD` | Overrides the customer password when creating the customer user. |
| `SEED_ADMIN_EMAIL` | Optional. Use with `SEED_ADMIN_PASSWORD` to sign in as an **existing** admin instead of manifest accounts. |
| `SEED_SKIP_IMAGES` | If `true`, skips media upload (faster; products are created without photos). |
| `SEED_FARM_GREENS_CUSTOMER` / `SEED_FARM_GRAINS_CUSTOMER` | If `true`, creates the customer from `accounts.customer` in the manifest. |
| `FARM_GREENS_SKIP_PREFLIGHT` | If `true`, does not run emit + category image download at the start of the seed. |
| `FARM_GREENS_SKIP_EMIT` | If `true`, preflight does not run `emit-farm-greens-narratives.mjs` (keeps existing `farm-greens.narratives.json`). |
| `FARM_GREENS_SKIP_CATEGORY_DOWNLOAD` | If `true`, preflight does not run `download-farm-greens-category-images.mjs`. |
| `FARM_GREENS_SKIP_STOREFRONT` | If `true`, does not load `data/farm-greens.storefront.json` (no CMS header/footer/hero/currency from that file). |
| `FARM_GREENS_STOREFRONT_PATH` | Override path to the Farm Greens storefront JSON. |

---

## Localized fields and REST (en + bn)

The manifest stores **name**, **shortDescription**, and **description** with **en** and **bn**. Payload’s REST handler applies one **active locale** per request, so the script does not send a single `name: { en, …, bn, … }` object on create.

Instead it:

1. **Creates or patches** **categories**, **products**, and **`geo-localities`** (manifest `geo.localities`) with `?locale=en` for English strings / Lexical (products and category **description**) / non-name fields.
2. **Patches** the same document with `?locale=bn` for Bengali **name** (and product **shortDescription** / **description**; category **description**; **meta** where localized).

This matches the backend’s field-level localization (`en`, `bn` in `payload.config.ts`).

---

## Accounts (manifest)

- Emails in the default manifest use **`@example.com`** (reserved documentation domain).
- Passwords in the JSON are documented as **`Asd@1234`**; the seeder actually uses **`SEED_DATA_PASSWORD`** (default `Asd@1234`) unless `SEED_ADMIN_PASSWORD` / `SEED_CUSTOMER_PASSWORD` apply.
- `accounts.admin` — used for login or `first-register` on an empty database.
- `accounts.customer` — only created when `SEED_FARM_GREENS_CUSTOMER=true`.

---

## What gets logged

On success, the script prints the configured **`accounts`** object from the manifest (for your records). It also logs the resolved **product images directory** when not skipping images.

---

## See also

- **Payload field reference (collections vs seed):** [farm-greens-payload-collections.md](./farm-greens-payload-collections.md) — maps each API collection to `packages/backend/src` definitions and notes which manifest keys are not stored on a model.
- Source and inline comments: `scripts/seed-farm-greens.mjs`
- `package.json` script: `"seed:farm-greens"`
