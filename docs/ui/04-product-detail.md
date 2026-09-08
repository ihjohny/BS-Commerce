# 04 — Product Detail Page (PDP)

## Purpose & routes

`/[locale]/products/[slug]` — full detail for one published product: gallery, price with sale display, variant selection with combination math, stock indication, add-to-cart / buy-now, bundle contents, specifications, description, reviews, related products, SEO metadata.

- The page is a Server Component: it resolves `slug` → product (guest reads are server-constrained to `status=published`, so an unpublished/draft slug 404s naturally), then renders client islands for gallery, variant picker, quantity, CTAs, and the review form.
- Product/brand/category `slug` is a single non-localized unique field (`packages/backend/src/fields/slug.ts`) — the same PDP URL serves `en` and `bn`; localized fields (`name`, `shortDescription`, `description`, `meta.*`, brand/category names) resolve via the `locale` REST param.
- Deep link: `?variant={variantId}` pre-selects a variant (share/return from cart).

## Wireframe

### Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb  Home / Categories / Power Banks / Anker A1289                    │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ GALLERY                        │ BRAND  Anker (link → brand PLP?brand={id})   │
│ ┌───────────────────────────┐  │ h1  Anker PowerCore 20000mAh                 │
│ │                           │  │ ★★★★☆ 4.6 (128)  → jumps to #reviews         │
│ │        main image         │  │ ──────────────────────────────────────────   │
│ │        (hover zoom)       │  │ ৳2,190  ৳̶2̶,̶9̶9̶9̶  [-27%]      (sale mode)     │
│ └───────────────────────────┘  │ shortDescription one-liner                   │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │ SKU  A1289-BK                                │
│ │ 1  │ │ 2  │ │ 3  │ │ 4  │   │ CAPACITY   [20000mAh] [10000mAh]             │
│ └────┘ └────┘ └────┘ └────┘   │ COLOR      [● Black] [● Blue]                │
│ click = lightbox (Dialog)      │ STOCK      ● In stock       (Badge)          │
│                                │ QTY  [ − ] 1 [ + ]                           │
│                                │ [ Add to cart ]   [ Buy now ]                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Tabs: Description | Specifications (3) | Reviews (128)                       │
│  Description  → Lexical richText prose                                       │
│  Specs        → Table grouped by group ("Display", "Battery & Charging")     │
│  Reviews      → summary + distribution + list + [Write a review]             │
├──────────────────────────────────────────────────────────────────────────────┤
│ Related products  (same category, 8 × <ProductCard />)                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

Bundle variant (`productType: 'bundle'`): below the CTAs the buy box grows a **Bundle contents** list — each `bundleItems` row as `Card` fragment: thumbnail, product name (link to its PDP), variant name if set, `× {quantity}`. Variants/stock selector are absent (variants are blocked on bundles server-side; stock is product-level, `variantId: null`).

### Mobile

```
┌──────────────────────────┐
│ ← swipe gallery (aspect-square, dots)
│ ──────────────────────────
│ BRAND · h1 · ★4.6 (128)
│ ৳2,190  ৳̶2̶,̶9̶9̶9̶ [-27%]
│ CAPACITY [20000mAh][10000mAh]
│ COLOR    [● Black][● Blue]
│ ● In stock
│ QTY [−] 1 [+]   (full-width row)
│ [    Add to cart    ]      ← sticky bottom bar
│ [     Buy now       ]
│ ▸ Description  (Accordion)
│ ▸ Specifications
│ ▸ Reviews (128)
│ Related (horizontal scroll)
└──────────────────────────┘
```

## Sections

### 1. Gallery

- Source: `images[]` array (each `image` → media; use media sizes `card` 768×1024 for thumbs, `tablet` 1024w for main — `packages/backend/src/collections/media.ts`). `alt`/`caption` come from the media doc.
- Main pane: square `next/image`, hover zoom (transform scale on pointer position, desktop only). Click / Enter opens a lightbox `Dialog` with `DialogTitle` (product name) and prev/next `Button variant="ghost" size="icon"`, keyboard ←/→/Esc.
- Thumbnails: vertical rail on desktop, horizontal strip on mobile; active thumb ring `ring-ring`; `ScrollArea` when > 6.
- **Variant image swap**: when the selected variant has `image`, it becomes the main image (prepend if not in `images[]`); clearing selection restores the first product image.
- Loading: `Skeleton` square + thumb rail.

### 2. Title block

- Brand: `brand` relation (depth 1) → localized `name`, rendered as `Button variant="link"` linking to `/[locale]/products?brand={brandId}` (the PLP brand filter — no separate brand landing route is specced). Omitted when the product has no brand.
- Vendor (only when `MULTIVENDOR_ENABLED=true`): `tenant` relation → `tenants.name` (public read, `packages/backend/src/plugins/multivendor/collections/tenants.ts`) as plain `text-sm text-muted-foreground` with a `Storefront` icon — no invented vendor-store route. Hidden in single-vendor mode.
- `h1`: localized `name` (`text-2xl font-semibold tracking-tight`).
- Rating: `<RatingStars value={product.rating} />` + `{rating}` + `({totalReviews})` — both are read-only fields on the product recomputed from **approved** reviews (`packages/backend/src/plugins/reviews/lib/aggregate-ratings.ts`). Whole control is an anchor to `#reviews`; hidden when `totalReviews === 0`.
- `shortDescription` as `text-muted-foreground`.

### 3. Price block (`<Price />` extended with sale display mode)

Effective sale mode = variant's `saleDisplayMode` when set and ≠ `inherit`, else the product's `saleDisplayMode`. Price source: selected `variant.price` / `variant.compareAtPrice`, falling back to `basePrice` / `compareAtPrice` when no variant is selected.

| Mode | Render |
| :--- | :--- |
| `none` | price only — no strike, no badge (even if `compareAtPrice > price`) |
| `strike_through` | price + compare-at strike-through |
| `badge_percent` | price + `Badge variant="destructive"` `-N%` (`N = round((compare−price)/compare×100)`, only when `compare > price`) |
| `badge_amount` | price + badge `Save {formatted compare−price}` |
| `strike_and_badge` | strike + badge |

Money formatting goes through the single `formatMoney` helper + `tabular-nums` (`00-design-system.md`). Animated price swap on variant change (no layout shift; `min-w` reserved).

### 4. Variant selectors

Only when `hasVariants` is true. Data: `GET /api/product-variants?where[product][equals]={id}&where[isActive][equals]=true&limit=200&depth=0` (public reads already exclude `isActive=false`, but the explicit filter makes intent clear — `product-variants.ts` access).

**Axis derivation.** `options` is a flat array of `{ name, value }` pairs per variant. Build axes client-side: distinct `options[].name` in first-seen order across active variants; per axis, distinct values in first-seen order. Option names/values are plain text (not localized, not attribute objects) — render them verbatim.

**Combination math (the contract).**

```
type Selection = Record<axisName, value>            // one value per axis

matchesExactly(v, sel)  = v.options.length === axes.length
                          && v.options.every(o => sel[o.name] === o.value)

enabledValue(axis, value, sel) = ∃ active variant v:
    v has (axis, value)
    && ∀ other axes a ≠ axis with sel[a] set: v has (a, sel[a])
```

- **Variant resolution**: `selectedVariant = variants.find(matchesExactly(v, selection))`.
- **Value pruning**: a value is disabled when `enabledValue(...)` is false given the current partial selection (Shopify-style co-occurrence pruning). Disabled values render `disabled` with `aria-disabled` and reduced opacity; the reason (out of stock vs. non-existent combo) is indistinguishable from catalog data alone — both simply can't be bought.
- **Stock-aware pruning** (when availability data is loaded, §5): additionally disable values whose *every* co-occurring variant is `purchasable: false`.
- **Default selection**: pre-select `?variant={id}` if present and active; else the first **purchasable** variant (or first variant when availability is unknown/disabled). Deep-link ids that no longer exist fall back to the default.
- **Selection UX**: ≤ 7 values per axis → `ToggleGroup type="single"` chips (color-swatch values render the swatch dot via the value name only — attribute `hexColor` is not on the variant; derive swatch from the matching attribute option when a same-named attribute option exists, else text chip). More than 7 values → `Select`. Changing a value never leaves a dead state: if the new combination has no variant, keep the other axes and reset only what's needed to the nearest enabled value.
- The chosen variant's `name` (e.g. “20000mAh / Black”) renders under the selectors as confirmation text.

### 5. Stock indicator (flag-gated)

Source: `GET /api/storefront/variant-availability?product={id}&store={locationId?}` → `{ inventoryEnabled, productId, storeLocationId, lines: [{ variantId | null, purchasable }] }` (`packages/backend/src/endpoints/storefront-variant-availability.ts`; registered globally in `payload.config.ts`).

- Fetch once on mount (client) with the cart's selected store when `SINGLE_STORE_CART_ENABLED` is in play; `store` param optional.
- `inventoryEnabled: false` (or endpoint 404 — `STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED=false`) → render **no** stock indicator and enable CTAs; allocation is enforced later by cart/checkout.
- `INVENTORY_ENABLED=true`: per selected variant (or `variantId: null` line for variantless/bundle products) — `purchasable: true` → `Badge` “In stock” (default variant, `size="sm"`, dot dot-emerald via `bg-primary`); `false` → `Badge variant="destructive"` “Out of stock”, CTAs disabled, quantity reset to 1.
- **No numeric counts, no “Only N left”**: available quantities live in `stock-levels` (`quantity − reservedQuantity`) whose read access is admin/vendor-only (`packages/backend/src/access/is-admin-or-vendor-stock-tenant.ts`) — there is no public low-stock signal to display. Do not fabricate one.
- Availability uses the same allocation rules as checkout (`quantity=1` per line), so “In stock” means “can allocate at least one unit now”.

### 6. Quantity + CTAs

- `<QuantityStepper />` (per `00-design-system.md`): min 1; max clamps to 99 UI-side (no public numeric stock) — the server remains the authority: exceeding availability rejects the cart write with 400 “Insufficient stock …” (`carts.ts`), surfaced as `toast.error`; the stepper stays at the last valid value.
- **Add to cart**: builds `{ items: [{ product: id, variant: variantId? , quantity }] }`.
  - Logged-in customer → `POST /api/carts` (first item) / `PATCH /api/carts/{id}` (subsequent).
  - Guest: `GUEST_CHECKOUT_ENABLED=true` → same calls with `X-Guest-Id: {uuid}` header (UUID generated and persisted in `localStorage` on first use; carts.ts rejects missing/invalid header). `false` → button renders “Log in to order” linking to `/[locale]/auth/login?redirect={path}`.
  - Pending: `disabled` + `Spinner` + `data-icon="inline-start"`; success → `toast.success` + header mini-cart badge bump (`05-cart.md`).
- **Buy now**: same mutation, then `router.push('/[locale]/checkout')` on success. Guests proceed only if `GUEST_CHECKOUT_ENABLED` allows the cart; otherwise the login redirect applies.
- Out-of-stock (§5 false) → both CTAs `disabled`; Add-to-cart label switches to “Out of stock”.

### 7. Bundle contents (`productType === 'bundle'` only)

- `bundleItems[]` rows: media thumbnail (depth 1 populates item product + its `images`), name, variant name when set, `× {quantity}`; each links to the item's PDP. Sum of item prices is **not** shown (bundle price is authoritative; per-item prices may diverge) — render informational only.
- `hasVariants` is impossible on bundles (hook `preventVariantsForBundleProducts`, `products.ts`/`product-variants.ts`) — selectors section absent.

### 8. Specifications

- Source: `specifications[]` — rows `{ attribute?, key, label, value, values?, unit, group, isCustom, isAdHoc, displayOrder }` (`products.ts`). Populated `attribute` (depth 1) provides `unit`/`defaultGroup` when the row's own fields are empty.
- Group rows by `group` (fallback: `attribute.defaultGroup`, fallback: “General”), sort groups and rows by `displayOrder`. Render each group as heading + `Table` (two columns: label | value+unit). Only the section with content renders; no specs → whole tab hidden.
- Desktop: `Tabs` (Description / Specifications / Reviews). Mobile: `Accordion` per section, all collapsible, reviews open by default when `totalReviews > 0`.

### 9. Description

- `description` is Payload `richText` (Lexical) — render server-side with the shared Lexical→React renderer (`@payloadcms/richtext-lexical/react` `RichText` component), localized via the fetch `locale`. Prose styling via `prose`-equivalent token classes (headings `text-foreground`, links `text-primary underline-offset-4`); embedded uploads resolve through media `sizes`.

### 10. Reviews (`#reviews`)

Backend reality (`packages/backend/src/plugins/reviews/collections/product-reviews.ts`): creation requires an authenticated **customer** whose order for this product reached `shipped`/`delivered`/`completed` (vendor products: sub-order statuses incl. `partially-shipped` — `purchase-checks.ts`); **one review per user per product**; `status` defaults to `pending` when `REVIEW_REQUIRES_APPROVAL=true` else `approved` (`payload.config.ts:292`); public reads return approved-only while moderation is on. There is **no `verified` field** — every review is a verified purchase by construction, so the list labels all reviews “Verified purchase”. Review **authors are anonymous on the storefront**: `author` → `users`, whose read access is self-or-admin (`users/index.ts`), so depth-1 population leaves only an id — never render it; display “Verified Buyer”.

**a. Summary row**: `<RatingStars>` large + `{rating}` + `{totalReviews} reviews` (product fields, not a live count).

**b. Distribution bars**: no per-star counts are stored server-side — compute client-side from the fetched reviews: `GET /api/product-reviews?where[product][equals]={id}&where[status][equals]=approved&limit=500&depth=0&sort=-createdAt&locale={locale}`; tally `rating` 5→1 and render `Progress`-style bars with counts. When `totalReviews > fetched`, show bars with the fetched counts and a `text-muted-foreground` “based on {fetched} shown reviews” note — do not extrapolate.

**c. List**: paginated (`page` param, Payload `totalPages`); each item a `Card`: stars, `title`, `comment` prose, `Badge variant="secondary"` “Verified purchase”, date via `Intl.DateTimeFormat(locale)`. No avatar, no author name (see above). Own review: if the logged-in user's id matches `author`, render a `DropdownMenu` with “Edit review” (PUT `/api/product-reviews/{id}` — owner may edit; status changes are admin-only and are rejected) — the only case where an author is identifiable.

**d. Write a review `Dialog`** (`DialogTitle`: “Write a review”):

- Button “Write a review” always visible next to the summary. Gating UX mirrors server rules without probing:
  - Not authenticated → clicking routes to `/[locale]/auth/login?redirect={path}` (`AUTH_REQUIRED_IDENTIFIER` flow is `07-auth.md`'s concern).
  - Authenticated → opens the form; failures come from the server on submit: 400 “You can only review products you have purchased.” / 400 “You already reviewed this product.” → `toast.error` verbatim.
- Form (`Field`/`FieldGroup`): rating via `ToggleGroup type="single"` of 5 star `Button`s (1–5, `aria-label` per star); `title` `Input` (optional); `comment` `Textarea` (localized field). Validation: rating required, comment ≤ 5000 chars — `data-invalid` + `aria-invalid` + `FieldDescription` errors.
- Submit: `POST /api/product-reviews` `{ product, rating, title?, comment }` (author set server-side from session). Pending: `disabled` + `Spinner` + `data-icon`.
- Success: moderation on → `toast.info` “Review submitted — it will appear after approval” and the dialog closes (review invisible in list until approved; `totalReviews` unchanged). Moderation off → `toast.success`, dialog closes, reviews list refetches and includes it immediately.

### 11. Related products

No related-products relation or endpoint exists — derive from category overlap: `GET /api/products?where[categories][in]={firstCategoryId}&where[id][not_in]={currentId}&where[featured][not_equals]=true&limit=8&sort=-rating&depth=1&locale={locale}`. Render `<ProductCard />` in a horizontal scroll on mobile / 4-col grid on desktop. Empty → section hidden. (Products without categories → fall back to `where[productClass][equals]={classId}`; still empty → hide.)

### 12. SEO / metadata

`generateMetadata` from the product doc (`products.ts` `meta` group): `meta.title` (localized) → `title` + `og:title`; `meta.description` → `description` + `og:description`; `meta.image` (media) → `og:image` (fall back to `images[0]`, then brand `logo`). Canonical: `{origin}/{locale}/products/{slug}` with `alternates.languages` mapping `en`/`bn` to the same path. `robots: { index: true }` only for published docs (unpublished 404 at the access layer). JSON-LD `Product` schema: name, image[], description, `offers` (price, currency from `currency` field / platform settings), `aggregateRating` from `rating`/`totalReviews` when `totalReviews > 0`.

## shadcn components

`accordion`, `alert`, `badge`, `breadcrumb`, `button`, `card`, `dialog`, `dropdown-menu`, `empty`, `field`, `input`, `label`, `pagination`, `progress`, `scroll-area`, `select`, `separator`, `skeleton`, `sonner`, `spinner`, `table`, `tabs`, `textarea`, `toggle-group`, `tooltip`.

Enforced usages: lightbox and write-review overlays are `Dialog` **with `DialogTitle`**; mobile spec/review sections in `Accordion`; rating input in `ToggleGroup` (5 choices); variant chips in `ToggleGroup` / `Select` (>7); specs in `Table`; review-list paging in `Pagination`; distribution in `Progress`; stock and sale as `Badge`; pending CTAs/submits `disabled` + `Spinner` + `data-icon`; fetch error band as `Alert variant="destructive"`; transient feedback via `sonner`; zero-review state uses `Empty` (“Be the first to review”) with the write-review action.

## Interactions & states

| Concern | Spec |
| :--- | :--- |
| Initial load | Server-rendered; below-the-fold tabs hydrate lazily. Gallery/price `Skeleton` only on `loading.tsx` navigations. |
| Variant change | Price/stock/SKU swap synchronously from already-fetched variant + availability data (no per-selection request). `?variant=` pushed with `history.replaceState`. |
| Availability pending | CTAs enabled with stock `Badge` in skeleton-pulse until the availability call resolves (avoids flash-disabling fast paths); resolves → prune/disable per §5. |
| Add-to-cart failure | 400 stock/store messages shown verbatim via `toast.error`; 401 → login redirect; network → `toast.error` generic key. |
| Buy-now failure | Same toasts; on success navigate only after the cart write settles. |
| Review submit failure | Field-level for validation; server 400/403 via `toast.error`; keep dialog open with state intact. |
| 404 | `notFound()` renders the shared not-found surface for unpublished/unknown slugs (guest access constraint). |
| a11y | Gallery is a `list`/`listitem` with `aria-current` thumb; variant `ToggleGroup` is `radiogroup`-like with per-axis `aria-label`; star input has text alternative “{n} of 5 stars”; lightbox traps focus. |

## Data & API

| Data | Endpoint / params | Source |
| :--- | :--- | :--- |
| Product by slug | `GET /api/products?where[slug][equals]={slug}&depth=1&locale={locale}` (guest read constrained to `status=published`) | `packages/backend/src/plugins/ecommerce/collections/products.ts` (fields `:481`, access `:699`) |
| Variants | `GET /api/product-variants?where[product][equals]={id}&where[isActive][equals]=true&limit=200&depth=0` | `packages/backend/src/plugins/ecommerce/collections/product-variants.ts` |
| Stock indication | `GET /api/storefront/variant-availability?product={id}&store={locationId?}` → `{ inventoryEnabled, lines: [{ variantId\|null, purchasable }] }`; 404 when `STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED=false`; all-purchasable when `INVENTORY_ENABLED=false` | `packages/backend/src/endpoints/storefront-variant-availability.ts`; flags in `packages/backend/src/lib/inventory-policy.ts` |
| Brand name | populated via `depth=1` (`brand` relation); public read | `packages/backend/src/plugins/ecommerce/collections/brands.ts` |
| Vendor name | `tenant` relation, public read (multivendor only field) | `packages/backend/src/plugins/multivendor/collections/tenants.ts` |
| Category ids (breadcrumb + related) | product's `categories` (depth 1); category public read | `packages/backend/src/collections/categories.ts` |
| Specs metadata | `specifications[].attribute` (depth 1) for `unit`/`defaultGroup`; attribute/class definitions public read | `packages/backend/src/plugins/ecommerce/collections/attributes.ts`, `classes.ts` |
| Reviews list | `GET /api/product-reviews?where[product][equals]&where[status][equals]=approved&sort=-createdAt&page&limit&depth&locale` | `packages/backend/src/plugins/reviews/collections/product-reviews.ts` |
| Review create / edit | `POST /api/product-reviews`; `PUT /api/product-reviews/{id}` (owner-only edits; status immutable for non-admins) | same file (hooks `:71–153`) |
| Purchase gate semantics | shipped/delivered/completed segments; vendor sub-orders incl. `partially-shipped` | `packages/backend/src/plugins/reviews/lib/purchase-checks.ts` |
| Rating aggregates | `products.rating` / `products.totalReviews` recomputed from approved reviews on every review change | `packages/backend/src/plugins/reviews/lib/aggregate-ratings.ts` |
| Add to cart / buy now | `POST /api/carts` / `PATCH /api/carts/{id}`; guest header `X-Guest-Id` (UUID) when `GUEST_CHECKOUT_ENABLED=true`; stock errors 400 | `packages/backend/src/plugins/ecommerce/collections/carts.ts` (`:90–114`, `:179–256`) |
| Checkout handoff | `POST /api/checkout/process` | `packages/backend/src/endpoints/checkout-process.ts` (`:213`) |
| Media sizes | `thumbnail` 400×300, `card` 768×1024, `tablet` 1024w; `alt`/`caption` localized | `packages/backend/src/collections/media.ts` |
| Flags | `MULTIVENDOR_ENABLED`, `INVENTORY_ENABLED`, `GUEST_CHECKOUT_ENABLED`, `REVIEW_REQUIRES_APPROVAL`, `REVIEWS_ENABLED`, `STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED`, `SINGLE_STORE_CART_ENABLED` | `packages/backend/.env.example`, `packages/backend/src/payload.config.ts:229–296` |

Payload REST params in use: `where` (`equals`, `in`, `not_in`, `not_equals`, `like`), `sort`, `page`, `limit`, `depth`, `locale`. Non-goals: numeric public stock or low-stock thresholds (`stock-levels` reads are admin/vendor-only — `packages/backend/src/plugins/inventory/collections/stock-levels.ts`, `packages/backend/src/access/is-admin-or-vendor-stock-tenant.ts`); public store-location stock rows (`stock-locations.ts` gates guests to `isPublicStore` docs only, and PDP does not render outlets).

## Acceptance checklist

- [ ] `/en/products/{slug}` 404s for draft/archived slugs as a guest, renders for published; `/bn/…` shows Bengali name/description/SEO with the same slug.
- [ ] Variant math: selecting one value per axis resolves exactly one variant; price, `compareAtPrice`, effective `saleDisplayMode`, SKU, and stock line update from that variant; `?variant={id}` restores it on load; a stale id falls back to the default selection.
- [ ] Disabled values: any value that co-occurs with the current selection in **no** active variant is unselectable; when availability is loaded, values whose every co-occurring variant is unpurchasable are also disabled.
- [ ] `saleDisplayMode: none` hides strike-through and badge even when `compareAtPrice > price`; `badge_percent` shows the correct rounded percentage; `strike_and_badge` shows both.
- [ ] With `INVENTORY_ENABLED=false` (or endpoint disabled) no stock badge renders and CTAs are enabled; with it true, unpurchasable variants show “Out of stock” and disable both CTAs; no numeric quantity or “only N left” copy exists anywhere.
- [ ] Guest with `GUEST_CHECKOUT_ENABLED=false` sees “Log in to order”; with it true, add-to-cart sends an `X-Guest-Id` UUID header and succeeds without auth.
- [ ] Adding beyond availability returns the server's 400 message in a `toast.error` and the quantity stepper keeps its last valid value.
- [ ] Bundle product renders its `bundleItems` list with quantities and links, and no variant selectors appear.
- [ ] Specs table groups by `group` (or attribute `defaultGroup`), honors `displayOrder`, appends `unit`, and hides entirely when `specifications` is empty.
- [ ] Reviews: summary shows `products.rating`/`totalReviews`; distribution tallies match the fetched list; every listed review shows “Verified purchase”; no author name/id ever renders; pagination works via `page`.
- [ ] Review gating: anonymous click → login redirect; authenticated non-purchaser and repeat reviewer get the exact server 400 message via toast; with `REVIEW_REQUIRES_APPROVAL=true` the new review is absent from the list until approved and the info toast fires; with it false it appears immediately and `totalReviews` increments.
- [ ] Related products come from same-category (fallback: same class) products excluding the current one; section hides when empty.
- [ ] `generateMetadata` outputs localized `meta.title/description/image`, canonical with locale alternates, and JSON-LD with `aggregateRating` only when `totalReviews > 0`.
- [ ] All copy from the dictionary; loading uses `Skeleton`, empty reviews use `Empty`, errors use `Alert` destructive; no raw colors, no `dark:` overrides, `gap-*`/`size-*` only.

## i18n keys

| key | en | bn |
| :--- | :--- | :--- |
| `pdp.gallery.open` | Open image viewer | ছবি ভিউয়ার খুলুন |
| `pdp.gallery.previous` | Previous image | পূর্ববর্তী ছবি |
| `pdp.gallery.next` | Next image | পরবর্তী ছবি |
| `pdp.brand` | Brand | ব্র্যান্ড |
| `pdp.soldBy` | Sold by | বিক্রেতা |
| `pdp.sku` | SKU | এসকেইউ |
| `pdp.stock.in` | In stock | স্টকে আছে |
| `pdp.stock.out` | Out of stock | স্টকে নেই |
| `pdp.quantity` | Quantity | পরিমাণ |
| `pdp.addToCart` | Add to cart | কার্টে যোগ করুন |
| `pdp.buyNow` | Buy now | এখনই কিনুন |
| `pdp.loginToOrder` | Log in to order | অর্ডার করতে লগ ইন করুন |
| `pdp.addedToCart` | Added to cart | কার্টে যোগ হয়েছে |
| `pdp.cartError` | Couldn’t update cart | কার্ট আপডেট করা যায়নি |
| `pdp.bundle.title` | Bundle contents | বান্ডেলের বিষয়বস্তু |
| `pdp.bundle.itemQuantity` | × {count} | × {count} |
| `pdp.variant.selected` | Selected: {name} | নির্বাচিত: {name} |
| `pdp.tabs.description` | Description | বিবরণ |
| `pdp.tabs.specifications` | Specifications | স্পেসিফিকেশন |
| `pdp.tabs.reviews` | Reviews | রিভিউ |
| `pdp.specs.groupFallback` | General | সাধারণ |
| `pdp.reviews.basedOn` | {count} reviews | {count} টি রিভিউ |
| `pdp.reviews.basedOnShown` | based on {count} shown reviews | দেখানো {count} টি রিভিউ অনুযায়ী |
| `pdp.reviews.verified` | Verified purchase | যাচাইকৃত ক্রয় |
| `pdp.reviews.anonymousAuthor` | Verified Buyer | যাচাইকৃত ক্রয়কারী |
| `pdp.reviews.write` | Write a review | রিভিউ লিখুন |
| `pdp.reviews.empty.title` | No reviews yet | এখনো কোনো রিভিউ নেই |
| `pdp.reviews.empty.description` | Be the first to review this product. | এই পণ্যের প্রথম রিভিউ লিখুন। |
| `pdp.reviews.form.title` | Write a review | রিভিউ লিখুন |
| `pdp.reviews.form.rating` | Your rating | আপনার রেটিং |
| `pdp.reviews.form.ratingRequired` | Please select a rating | একটি রেটিং নির্বাচন করুন |
| `pdp.reviews.form.titleLabel` | Title (optional) | শিরোনাম (ঐচ্ছিক) |
| `pdp.reviews.form.commentLabel` | Your review | আপনার রিভিউ |
| `pdp.reviews.form.commentTooLong` | Review must be 5000 characters or fewer | রিভিউ সর্বোচ্চ ৫০০০ অক্ষরের হতে হবে |
| `pdp.reviews.form.submit` | Submit review | রিভিউ জমা দিন |
| `pdp.reviews.submittedPending` | Review submitted — it will appear after approval | রিভিউ জমা হয়েছে — অনুমোদনের পরে দেখা যাবে |
| `pdp.reviews.submitted` | Thanks! Your review is live | ধন্যবাদ! আপনার রিভিউ প্রকাশিত হয়েছে |
| `pdp.reviews.notPurchased` | You can only review products you have purchased. | শুধুমাত্র কেনা পণ্যের রিভিউ দেওয়া যায়। |
| `pdp.reviews.alreadyReviewed` | You already reviewed this product. | আপনি ইতিমধ্যে এই পণ্যের রিভিউ করেছেন। |
| `pdp.reviews.edit` | Edit review | রিভিউ সম্পাদনা |
| `pdp.reviews.updated` | Review updated | রিভিউ আপডেট হয়েছে |
| `pdp.related.title` | Related products | সম্পর্কিত পণ্য |
| `pdp.error.load` | Couldn’t load this product | এই পণ্য লোড করা যায়নি |
| `pdp.error.retry` | Retry | আবার চেষ্টা করুন |
