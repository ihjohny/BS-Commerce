# 03 — Catalog: Categories, Product Listing (PLP), Search

## Purpose & routes

| Route | Purpose |
| :--- | :--- |
| `/[locale]/categories` | Category directory: top-level categories with nested children, each linking to a category PLP. |
| `/[locale]/categories/[slug]` | Category PLP: products of one category with facets, sort, pagination. |
| `/[locale]/products` | All-products PLP: every published product with the same filter/sort body. |
| `/[locale]/search` | Search results page. Renders the **same PLP body** as `/products`; only the header differs (query echo, no category breadcrumb). |

All routes are Server Components reading URL query params as the single source of truth. Every filter, sort, page, and density change is written back to the URL (`router.replace(..., { scroll: false })`) so results are shareable and back/forward-safe.

`[locale]` is `en` or `bn`; every fetch passes Payload's `locale` query param so localized fields (`products.name`, `shortDescription`, `meta.*`, `categories.name`, `brands.name`, `classes.name`, attribute labels/option labels) resolve in the active language. Product/brand/category `slug` values are **not localized** (single unique slug, `packages/backend/src/fields/slug.ts`) — one URL per product/category works for both locales.

## Wireframe

### PLP — desktop (`/products`, `/categories/[slug]`, `/search`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb  Home / Categories / Power Banks                                  │
│ h1  Power Banks        (category description richText, 1–2 lines)            │
├───────────────────┬──────────────────────────────────────────────────────────┤
│ FILTERS (aside)   │  Toolbar                                                 │
│                   │  ┌────────────────────────────────────────────────────┐  │
│ Active chips      │  │ 64 results   Sort [Newest ▾]   [⊞ Grid][≡ List]    │  │
│ [Anker ✕][≤5000 ✕]│  └────────────────────────────────────────────────────┘  │
│ Clear all         │  ┌────────┐ ┌────────┐ ┌────────┐                        │
│                   │  │  img   │ │  img   │ │  img   │   <ProductCard /> grid │
│ CLASS FACETS      │  │  title │ │        │ │        │   (3–4 cols)           │
│ ▾ Power Bank      │  │  ★4.6  │ │        │ │        │                        │
│   Capacity        │  │  ৳2,190│ │        │ │        │                        │
│   ☑ 20000mAh (12) │  └────────┘ └────────┘ └────────┘                        │
│   ☐ 10000mAh (7)  │  ┌────────┐ ┌────────┐ ┌────────┐                        │
│   ☐ 50000mAh (3)  │  └────────┘ └────────┘ └────────┘                        │
│   Output          │                                                          │
│   ☐ 65W (9) …     │  ◀ 1 2 3 … 6 ▶        (Pagination)                       │
│ ▾ Smartphone      │                                                          │
│ BRAND             │                                                          │
│   ☐ Anker  ☐ Baseus                                                          │
│ PRICE (৳)                                                                     │
│   [min] – [max]  [Apply]                                                      │
│ RATING                                                                        │
│   ☐ 4★ & up    ☐ 3★ & up                                                     │
└───────────────────┴──────────────────────────────────────────────────────────┘
```

List density replaces the grid with full-width rows: image left (128px square), title + brand + rating + short description middle, price + quick-add right.

### PLP — mobile

```
┌────────────────────────────┐
│ ☰ Filters        64 items ▾│  ← toolbar row: [Filter] Button (Sheet), sort Select
├────────────────────────────┤
│ [Anker ✕] [≤5000 ✕] Clear  │  ← horizontal scroll chips (only when active)
├────────────────────────────┤
│ ┌──────────┐ ┌──────────┐  │
│ │   img    │ │   img    │  │  <ProductCard /> 2-col grid
│ └──────────┘ └──────────┘  │
│ ◀ 1 2 3 ▶                  │
└────────────────────────────┘

  Filter Sheet (bottom, Sheet):
  ┌────────────────────────────┐
  │ ────────────               │  SheetHandle
  │ SheetTitle: Filters        │
  │ (same facet tree as aside) │
  │ [Reset]      [Show 64]     │  ← sticky footer; Show n = live totalDocs
  └────────────────────────────┘
```

### Categories index (`/categories`)

```
┌──────────────────────────────────────────────────────────────┐
│ h1  All Categories                                           │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────┐  Electronics                                    │
│ │  image   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│ │  card    │  │Mobile│ │Laptop│ │Audio │ │Cameras│  children │
│ └──────────┘  └──────┘ └──────┘ └──────┘ └──────┘            │
│ ┌──────────┐  Fashion                                        │
│ │  image   │  ┌──────┐ ┌──────┐                              │
│ └──────────┘  └──────┘ └──────┘                              │
└──────────────────────────────────────────────────────────────┘
```

## Sections

Order is render order. Shared `<ProductCard />`, `<Price />`, `<RatingStars />`, `<PageHeader />` come from `00-design-system.md`.

### 1. Categories index (`/categories`)

1. Fetch **all** active categories in one call: `GET /api/categories?where[isActive][equals]=true&limit=200&sort=displayOrder&depth=0&locale={locale}`. Public read returns inactive docs too (`categories.ts` → `read: () => true`), so the `isActive` filter is mandatory client-side.
2. Build the tree locally from `parent` (null = top level). Group children under each top-level category, sorted by `displayOrder`.
3. Each top level renders a `Card`: category `image` (media `card` size, square, `next/image`), localized `name`, first ~120 chars of `description` plain text. Whole card links to `/[locale]/categories/[slug]`.
4. Children render as `Badge variant="outline"` chips linking to their own category PLP.
5. `Empty` when no active categories. `Skeleton` card grid while loading. `Alert variant="destructive"` + retry on fetch error.

### 2. PLP header (`/categories/[slug]`, `/products`, `/search`)

- `PageHeader` with `Breadcrumb`: Home / Categories / **{category.name}**. On `/products`: Home / Products. On `/search`: Home / Search.
- `h1` = category `name`; below it, category `description` (richText, Lexical) rendered as prose, clamped to 3 lines with an expander (`Button variant="link" size="sm"`).
- Category resolution: slug → id via `GET /api/categories?where[slug][equals]={slug}&limit=1`. 404 → `notFound()`.
- Descendant expansion: fetch the category tree, collect descendant ids, query products with `where[categories][in]={id1,id2,…}` — products are tagged with leaf categories only, so an ancestor page must expand or it under-counts.
- `/search`: `h1` echoes the query (“Results for “power bank””); `Badge` with result count.

### 3. Filter sidebar (desktop `aside` / mobile `Sheet`)

Identical facet tree in both containers. Mobile wraps it in a bottom `Sheet` with `SheetTitle` and a sticky footer (`Reset` ghost + `Show {n}` primary showing live `totalDocs`).

**a. Class/spec facets (the real faceted engine).**
`GET /api/storefront/facets?category={categorySlug}&locale={locale}` → `{ classes[], facets[] }` (`packages/backend/src/endpoints/storefront-facets.ts`). Each `facets[]` group: `{ classId, className, classSlug, key, label, type, unit?, displayOrder, options: [{ value, label, count }] }`.

- One `Accordion` item per **class** (`className` as header); inside, one labeled `Checkbox` group per facet `key`, options sorted by the API order.
- Checkbox label: `{label}` + `count` in `text-muted-foreground` (e.g. `20000mAh (12)`). Color-type facets (`type: 'color'`) render a swatch `size-4 rounded-full` next to the label — swatch color comes from the attribute option `hexColor`, but the facets endpoint does not return `hexColor`; render swatches only when `value` is a valid hex string, otherwise fall back to the label checkbox.
- Facet `type: number` with `unit`: keep checkboxes (values are dynamic, already counted by the endpoint); do **not** build range sliders — the endpoint provides point values only.
- Hide empty groups: when browsing all products (no class selected) the endpoint already strips `count === 0` options and empty facets.

**b. Brand facet.** From `GET /api/brands?limit=50&sort=displayOrder&depth=0&locale={locale}` (public read, `brands.ts`). Plain checkbox list — **no counts** (no aggregation endpoint for brands). Multi-select.

**c. Price range.** Two `Input type="number"` (min/max) in a `Field` + `FieldGroup` with the currency symbol prefix; `Apply` button commits both values in one URL update. Validates min ≤ max (`data-invalid` + `aria-invalid` + `FieldDescription` error).

**d. Rating.** Checkboxes `4★ & up` / `3★ & up` → `where[rating][greater_than_equal]=4|3` (`products.rating` is the approved-reviews aggregate, `products.ts`).

**Filter → URL param map (single source of truth):**

| UI filter | URL param | API param |
| :--- | :--- | :--- |
| Class | `class={classSlug}` | `class=` (slug accepted) |
| Spec value (per key, multi) | `specs[{key}]={v1,v2}` | `specs[{key}]={v1,v2}` — AND across keys, OR within values |
| Brand (multi) | `brand={id1,id2}` | `where[brand][in]=…` |
| Price min / max | `minPrice` / `maxPrice` | `where[basePrice][greater_than_equal]` / `[less_than_equal]` |
| Rating floor | `rating=4` | `where[rating][greater_than_equal]=4` |
| Search term | `q` | see §5 |
| Sort | `sort` | `sort=` |
| Page | `page` | `page=` |
| Density | `view=grid\|list` | — (client only) |

Spec filters work on plain `GET /api/products` too: the `applySpecificationFacetFilters` before-operation hook (`products.ts:444`) parses `class`/`specs[key]` from query params and injects matching product ids — same contract as `/api/storefront/store-products`.

**e. Active filter chips.** One dismissible `Badge variant="secondary"` per active value (label resolved from the facet options that produced it; price renders as `৳min–৳max`). `✕` removes that value (or the whole range) and re-fetches. `Clear all` `Button variant="ghost" size="sm"` strips every filter param, keeps `sort`/`view`.

### 4. Toolbar

- Results count: `{totalDocs} products` (`text-sm text-muted-foreground`).
- Sort: `Select` — Newest (`-createdAt`), Price: Low to High (`basePrice`), Price: High to Low (`-basePrice`), Top Rated (`-rating`), Name A–Z (`name`). All are real sortable fields.
- Density: `ToggleGroup type="single"` (2 choices: grid `⊞` / list `≡`, icon buttons, `aria-label`), persists to `view` param.
- Mobile: collapses to `[Filter] Button` (opens Sheet) + results count + sort `Select`; density toggle hidden below `md`.

### 5. Product grid / list

- `ProductCard` grid per `00-design-system.md` (3-col `lg`, 4-col `xl`, 2-col mobile; list density renders `Card` rows with horizontal layout).
- Sale display: honor `saleDisplayMode` (`none` hides strike **and** badge; `badge_percent` computes `round((compareAtPrice−basePrice)/compareAtPrice×100)%`; `badge_amount` shows the absolute saving; `strike_and_badge` both) — logic shared with PDP `<Price />`.
- **No stock badge on cards**: per-product purchasability requires one availability call per product (`/api/storefront/variant-availability` is single-product; `stock-levels` has no public read). Quick-add therefore always renders; failures surface as `toast.error` from the cart API (“Insufficient stock …” is raised server-side on cart save, `carts.ts`). Do not fake availability.
- Quick-add sends `{ product: id }` (variant choice needs the PDP — omit quick-add for `hasVariants` products; button links to PDP instead).

### 6. Pagination

- shadcn `Pagination` from the Payload find response (`page`, `totalPages`, `hasPrevPage`, `hasNextPage`, `prevPage`, `nextPage`).
- Page change → `page` param, `router.replace(scroll: false)`, grid wrapped in `Skeleton` during the transition. Hide the control when `totalPages ≤ 1`.

### 7. Search body (`/search`)

- `q` maps to an OR like-query on plain REST:
  `GET /api/products?where[or][0][name][like]={q}&where[or][1][shortDescription][like]={q}&limit=12&page={n}&locale={locale}&depth=1`.
- Guest reads are constrained server-side to `status=published` (`products.ts` access) — no status filter needed client-side.
- Empty `q` → the PLP body over all products with an `Empty`-style hint in the header (“Type to search”).
- 0 results → `Empty` with actions: “Clear filters” and “Browse all products” (links `/[locale]/products`). Suggestion: also render the 3 most recent products (`sort=-createdAt&limit=3`) under a “Popular products” heading — optional, same endpoint.

## shadcn components

`accordion`, `alert`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `drawer` (or `sheet` bottom), `empty`, `field`, `input`, `input-group`, `label`, `pagination`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `toggle-group`, `tooltip`.

Enforced usages: the sort `Select`; filter inputs inside `Field`/`FieldGroup` (`data-invalid`/`aria-invalid`); mobile filters in `Sheet` **with `SheetTitle`**; density in `ToggleGroup`; active filters as `Badge`; empty = `Empty`; loading = `Skeleton` mirrors of toolbar + card grid; fetch error = `Alert variant="destructive"` with a retry `Button`; the header search box that links here uses `InputGroup` + `InputGroupAddon` (per `01-app-shell.md`).

## Interactions & states

| Concern | Spec |
| :--- | :--- |
| Loading | `Skeleton` toolbar row + `Skeleton` card grid (8 tiles). Filter Sheet content: `Skeleton` accordion blocks. |
| Empty results | `Empty` + one primary action (“Clear filters”) + one link action (“Browse all products”). |
| Error | `Alert variant="destructive"` + `Button variant="outline" size="sm"` retry. Transient failures (quick-add) → `toast.error` with the backend message. |
| Facet loading | Facets are fetched once per category scope and cached (`Cache-Control: max-age=60` server-side); sidebar shows `Skeleton` accordions until resolved. |
| Filter changes | Debounce nothing (explicit Apply for price); every change → URL update → RSC refetch; keep scroll position (`scroll: false`). |
| Pending quick-add | Button `disabled` + `Spinner` + `data-icon="inline-start"` until the cart mutation settles. |
| a11y | Facet groups labeled by `AccordionTrigger`; checkboxes carry counts in the label node (not `::after`); `Sheet` traps focus with `SheetTitle` announced. |

## Data & API

| Data | Endpoint / params | Source |
| :--- | :--- | :--- |
| Categories | `GET /api/categories` — `where[isActive][equals]`, `where[slug][equals]`, `where[parent][exists]`, `sort`, `page`, `limit`, `depth`, `locale` | `packages/backend/src/collections/categories.ts` |
| Brands | `GET /api/brands` — `sort=displayOrder`, `limit`, `depth`, `locale` | `packages/backend/src/plugins/ecommerce/collections/brands.ts` |
| Products | `GET /api/products` — `where[...]` (`status` auto-constrained for guests), `sort`, `page`, `limit`, `depth`, `locale`, plus `class=` & `specs[key]=` via the before-operation hook | `packages/backend/src/plugins/ecommerce/collections/products.ts` (`applySpecificationFacetFilters` at `:444`) |
| Spec/class facets | `GET /api/storefront/facets?category={slug}&class={slug}&store={id}&locale=` → `{ classes, facets }`; also mounted at `GET /api/products/facets` | `packages/backend/src/endpoints/storefront-facets.ts`; registered in `packages/backend/src/payload.config.ts` |
| Store-scoped listing (alternative) | `GET /api/storefront/store-products` — `store, category, brand, search, featured, tenant, productType, minPrice, maxPrice, class, specs[key], page, limit≤100, sort, depth≤3, locale` | `packages/backend/src/endpoints/storefront-store-products.ts` |
| Quick-add | `POST /api/carts` (create; guest requires `X-Guest-Id` UUID header when `GUEST_CHECKOUT_ENABLED=true`) then `PATCH /api/carts/{id}` for further items | `packages/backend/src/plugins/ecommerce/collections/carts.ts` |
| Currency for `<Price>` | Per-product `currency` field on product payloads | `packages/backend/src/plugins/ecommerce/collections/products.ts:617` |

Supported Payload REST params on collections (used throughout): `where` (with `and`/`or`, `equals`, `in`, `like`, `greater_than_equal`, `less_than_equal`, `exists`), `sort` (`field` / `-field`), `page`, `limit`, `depth`, `locale`.

Not available (do not spec): per-facet **brand counts**; **in-stock-only filter** (needs per-product availability calls); cross-category full-text search endpoint (name/shortDescription `like` only).

## Acceptance checklist

- [ ] `/en/categories` and `/bn/categories` render the localized category tree; inactive categories never appear even though the API returns them.
- [ ] Category PLP at `/en/categories/power-banks` lists only products whose `categories` include that category **or any descendant**; count matches the grid.
- [ ] Checking facet `20000mAh` updates the URL to `?class=power-bank&specs[capacity]=20000mah` and the results; adding `65W` ANDs the keys (`specs[capacity]=…&specs[output]=65w`); selecting two values in one key ORs them (comma-joined).
- [ ] Brand multi-select produces `where[brand][in]=id1,id2`; price range produces `greater_than_equal`/`less_than_equal`; each chip removes exactly its own constraint.
- [ ] Every sort option changes result order via the corresponding `sort` value; `page=2` shows Payload page 2 with correct `totalDocs`.
- [ ] Density toggle switches grid/list without refetch; choice survives reload via `view` param.
- [ ] Mobile ≤ `md`: filters open in a bottom `Sheet` with a visible title, `Show {n}` reflects live count, `Reset` clears only filter params.
- [ ] Loading grid = `Skeleton`; zero results = `Empty`; fetch failure = `Alert` destructive with working retry; quick-add failure = `toast.error` with the server message.
- [ ] `/en/search?q=anker` OR-queries `name`/`shortDescription`; result header echoes `q`; empty `q` degrades to full catalog with hint.
- [ ] All visible strings come from the dictionary; `bn` shows Bengali copy and Noto Sans Bengali; no raw color classes anywhere.

## i18n keys

| key | en | bn |
| :--- | :--- | :--- |
| `catalog.filters.title` | Filters | ফিল্টার |
| `catalog.filters.clearAll` | Clear all | সব মুছুন |
| `catalog.filters.apply` | Apply | প্রয়োগ করুন |
| `catalog.filters.show` | Show {count} | {count} টি দেখান |
| `catalog.filters.reset` | Reset | রিসেট |
| `catalog.filters.brand` | Brand | ব্র্যান্ড |
| `catalog.filters.price` | Price | মূল্য |
| `catalog.filters.rating` | Rating | রেটিং |
| `catalog.filters.ratingUp` | {stars}★ & up | {stars}★ এবং উপরে |
| `catalog.sort.newest` | Newest | নতুন |
| `catalog.sort.priceAsc` | Price: Low to High | মূল্য: কম থেকে বেশি |
| `catalog.sort.priceDesc` | Price: High to Low | মূল্য: বেশি থেকে কম |
| `catalog.sort.topRated` | Top Rated | সর্বোচ্চ রেটেড |
| `catalog.sort.name` | Name A–Z | নাম A–Z |
| `catalog.results.count` | {count} products | {count} টি পণ্য |
| `catalog.view.grid` | Grid | গ্রিড |
| `catalog.view.list` | List | তালিকা |
| `catalog.empty.title` | No products found | কোনো পণ্য পাওয়া যায়নি |
| `catalog.empty.description` | Try removing some filters or browse all products. | কিছু ফিল্টার সরিয়ে দেখুন বা সব পণ্য ব্রাউজ করুন। |
| `catalog.empty.browseAll` | Browse all products | সব পণ্য ব্রাউজ করুন |
| `catalog.search.title` | Results for “{query}” | “{query}” এর ফলাফল |
| `catalog.search.prompt` | Type to search products | পণ্য খুঁজতে টাইপ করুন |
| `catalog.categories.title` | All Categories | সব ক্যাটাগরি |
| `catalog.error.title` | Couldn’t load products | পণ্য লোড করা যায়নি |
| `catalog.error.retry` | Retry | আবার চেষ্টা করুন |
| `catalog.breadcrumb.home` | Home | হোম |
| `catalog.breadcrumb.categories` | Categories | ক্যাটাগরি |
| `catalog.breadcrumb.products` | Products | পণ্য |
| `catalog.breadcrumb.search` | Search | খুঁজুন |
| `catalog.card.addToCart` | Add to cart | কার্টে যোগ করুন |
