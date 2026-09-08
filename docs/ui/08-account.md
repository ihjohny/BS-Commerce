# 08 — Customer account area

Authenticated customer surface: dashboard, orders (+ detail, sub-order split, timeline), addresses, wishlist, my reviews, profile, password, preferences. Grounded in the real access rules — customers read **their own** orders/items/sub-orders/addresses/wishlist/reviews and patch their own user; everything admin-only is specified as absent or disabled, never faked.

## Purpose & routes

| Route | Purpose | Key data |
| :--- | :--- | :--- |
| `/{locale}/account` | Dashboard: stats, last order, quick links | `GET /api/customer/analytics`, `GET /api/orders?limit=5` |
| `/{locale}/account/orders` | Paginated order list | `GET /api/orders` (owner-scoped by access rule) |
| `/{locale}/account/orders/[id]` | Order detail: items, totals, sub-orders, timeline, reorder/cancel | `GET /api/orders/{id}?depth=2`, `GET /api/sub-orders?where=parentOrder={id}` |
| `/{locale}/account/addresses` | Address book CRUD + default switching | `addresses` collection REST |
| `/{locale}/account/wishlist` | Wishlist grid, move to cart | `wishlist-items` + `carts` REST |
| `/{locale}/account/reviews` | My product/vendor reviews, edit | `product-reviews`, `vendor-reviews` REST |
| `/{locale}/account/profile` | Profile fields, identifiers + re-verification | `PATCH /api/users/{id}`, `POST /api/auth/send-verification` |
| `/{locale}/account/password` | Change password | `POST /api/auth/login` + `PATCH /api/users/{id}` |
| `/{locale}/account/preferences` | Locale + theme | `PATCH /api/users/{id}` (locale), client theme |

**Auth guard (all `/account/*`, aligned with `01-app-shell.md` and `07-auth.md`):** middleware matcher `/:locale/account/:path*`; no valid session → redirect `/{locale}/auth/login?next={path}`; a `401` from any account fetch triggers the same redirect. Header/footer render "My account" (icon + footer link) only when authed, and "Sign in / Create account" only for guests. `next` accepts local paths only.

## Wireframe

Desktop — `Sidebar` navigation (inset variant), content column:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ header (01)                                                              │
├────────────────┬─────────────────────────────────────────────────────────┤
│ ACCOUNT        │  Dashboard                              PageHeader      │
│ ────────       │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│ 🏠 Dashboard   │  │ Orders  │ │ Spent   │ │ Member  │ │ Last order    │  │
│ 📦 Orders      │  │   12    │ │ ৳4,890  │ │ since … │ │ ORD-…  [Badge]│  │
│ 📍 Addresses   │  └─────────┘ └─────────┘ └─────────┘ └───────────────┘  │
│ ❤ Wishlist     │  Recent orders (Table, 5 rows)          [View all →]    │
│ ★ Reviews      │  ┌──────────────────────────────────────────────────┐   │
│ 👤 Profile     │  │ ORD-20260225-A1B2 │ 25 Feb │ [Processing] │ ৳1,2…│   │
│ 🔑 Password    │  └──────────────────────────────────────────────────┘   │
│ ⚙ Preferences  │  Quick links (address book, wishlist, support)          │
│                │  Recommended for you (ProductCard grid)                 │
└────────────────┴─────────────────────────────────────────────────────────┘
```

Mobile — sidebar collapses; a horizontally scrollable `Tabs`-style nav sits under the `PageHeader`:

```
┌──────────────────────────────┐
│ header (01)          ☰  🛒   │
│ Dashboard            PageHeader
│ [🏠][📦][📍][❤][★][👤][🔑][⚙] ← scroll-x nav, active = bg-accent
│ ┌──────────┐ ┌──────────┐    │
│ │ Orders 12│ │ Spent …  │    │  ← stat cards stack
│ └──────────┘ └──────────┘    │
│ Recent orders (cards)        │  ← Table swaps to stacked Card list < sm
└──────────────────────────────┘
```

## Sections

### 1. Layout & navigation

- `SidebarProvider` + collapsible `Sidebar` (desktop ≥ `lg`), nav items above; active route = `data-active=true` styling. Below `lg`: `Tabs`-like horizontal scroll strip. All nav labels from dictionary.
- Unverified banner: when the session user has both `emailVerified=false` and `phoneVerified=false` **and** `REQUIRE_VERIFIED_FOR_CHECKOUT=true`, pin a dismissible `Alert` with a **Verify now** action → `/auth/verify` (grounded gate: `packages/backend/src/lib/process-checkout.ts`). With the flag `false` (default) the banner only appears on the profile page.
- Footer of the content column: "Sign out" (`POST /api/users/logout`) → redirect `/{locale}`.

### 2. Dashboard (`/account`)

- Stat `Card` row: **Orders** (totalOrders), **Total spent** (totalSpent + currency, `formatMoney`, `tabular-nums`), **Member since** (user `createdAt`), **Last order** mini-card (orderNumber, placedAt, status `Badge`, grandTotal) linking to its detail page — fields exactly as returned by `GET /api/customer/analytics` (`packages/backend/src/endpoints/customer-analytics.ts`).
- **Recent orders**: last 5 via `GET /api/orders?limit=5&sort=-placedAt&depth=1`; compact `Table` (desktop) / card list (mobile); "View all" → `/account/orders`.
- **Quick links**: `Card` grid — Address book, Wishlist, Reviews, Profile, Password (each with count badge where cheap: addresses/wishlist totals from their list endpoints).
- **Recommended for you**: `GET /api/customer/recommendations` rendered as the shared `<ProductCard />` grid; hide the section entirely on error/empty (no hollow state).

### 3. Orders list (`/account/orders`)

- `PageHeader` ("Orders"). `Table` columns: **Order** (orderNumber, mono), **Placed** (placedAt, `Intl.DateTimeFormat(locale)`), **Status** (Badge, mapping below), **Payment** (paymentStatus Badge), **Total** (grandTotal + currency), row action **View**. < `sm`: stacked cards with the same fields.
- `Pagination` from Payload's `totalPages`/`page` (`?limit=10&page=N&sort=-placedAt`); deep-link `?page=`.
- `Skeleton` table mirror while loading; `Empty` ("No orders yet" + **Start shopping** → `/{locale}/products`); fetch error → destructive `Alert` + retry.
- Access note: the customer simply calls `/api/orders` — `isOrderOwnerOrAdmin` scopes results to `customer = me` (`packages/backend/src/access/is-order-owner-or-admin.ts`). Never render an order the API didn't return.

**Order status → Badge mapping (values quoted verbatim from the enum in `packages/backend/src/plugins/orders/collections/orders.ts:80-89`):**

| Status value | Label | Badge variant | Icon |
| :--- | :--- | :--- | :--- |
| `pending` | Pending | `secondary` | `Clock` |
| `processing` | Processing | `default` | `LoaderCircle` |
| `partially-shipped` | Partially shipped | `secondary` | `PackageOpen` |
| `shipped` | Shipped | `outline` | `Truck` |
| `delivered` | Delivered | `default` | `CircleCheck` |
| `completed` | Completed | `default` | `BadgeCheck` |
| `cancelled` | Cancelled | `destructive` | `CircleX` |
| `refunded` | Refunded | `outline` | `RotateCcw` |

If the chosen preset ships `success`/`warning` Badge variants, prefer: `pending`/`partially-shipped` → `warning`, `delivered`/`completed` → `success` (keep `destructive` for `cancelled`).

**Payment status → Badge** (enum from the same file): `unpaid` → `outline`, `paid` → `default`, `partially-refunded` → `secondary`, `refunded` → `destructive`. `checkoutPaymentChannel` renders as a muted chip: `online` → "Online", `cash_on_delivery` → "COD".

### 4. Order detail (`/account/orders/[id]`)

- Header row: orderNumber + status Badge + paymentStatus Badge + channel chip + placedAt.
- **Items** `Table` from `order-items` (populated via `depth`): snapshot image (`productImage`), `productName`, `variantName`, `sku`, `quantity`, line `totalPrice` (unitPrice struck if discounted into total — plain `unitPrice × quantity` otherwise). `productSlug` links to the PDP; a 404/missing slug renders plain text (snapshots are historical). In multivendor mode each row also carries `vendorNameSnapshot` shown as `text-muted-foreground`.
- **Sub-order split — only when `MULTIVENDOR_ENABLED=true`:** a `Card` per sub-order (`GET /api/sub-orders?where=parentOrder[equals]={id}`; customer read is owner-scoped — `packages/backend/src/plugins/orders/collections/sub-orders.ts`). Show `subOrderNumber`, `tenantNameSnapshot`, status Badge (same mapping — sub-order enum adds `confirmed` → `default` + `CircleCheckBig`), `trackingNumber` with `trackingUrl` as an external link, `shippedAt`/`deliveredAt`. Items are grouped under their vendor card via `item.subOrder`. **Never render** `commissionAmount`, `commissionRate`, `vendorEarnings` — vendor/platform accounting, not customer-facing.
- **Totals** card: subtotal, shippingTotal, taxTotal, discountTotal (with `couponCodeSnapshot` as a small `Badge` when present), grandTotal (`text-lg font-semibold tabular-nums`), currency.
- **Addresses** block: `shippingAddress` / `billingAddress` groups rendered read-only (both are checkout snapshots; the customer has no update access — `orders.update` is admin-only).
- **Status timeline:** vertical `Timeline` fed from `order-status-history` entries (`fromStatus` → `toStatus`, `timestamp`, `reason`). **Backend gap, handle explicitly:** that collection is `read: isAdmin` (`packages/backend/src/plugins/orders/collections/order-status-history.ts`) — customers get `403` from REST. Required wiring: a storefront proxy `GET /api/storefront/orders/{id}/history` returning only the caller's entries. Until it exists, render the **computed fallback**: steps `placed → processing → shipped → delivered → completed` (multivendor inserts `partially-shipped`), timestamps from `placedAt` and sub-order `shippedAt`/`deliveredAt`; done steps `CircleCheck text-primary`, current step `LoaderCircle animate-spin`, future steps `text-muted-foreground`. Flagged for the coordinator either way.
- **Actions:**
  - **Reorder** (always): for each item push `{ product, variant, quantity }` into the active cart (`carts` REST; `unitPrice` is auto-set server-side — never send it, `packages/backend/src/plugins/ecommerce/collections/carts.ts`); skip failed lines with a warning toast, then route to `/{locale}/cart`. Pending state per button conventions.
  - **Cancel** (only while `status ∈ {pending, processing}` — `ORDER_TRANSITIONS` allows cancel solely from those, `packages/backend/src/lib/order-status-transitions.ts`): `AlertDialog` ("Cancel this order? Inventory will be released.") with destructive confirm. **Backend gap:** `orders.update` is admin-only and no customer cancel endpoint exists today, so the button ships **disabled with a tooltip** ("Contact support to cancel") until the backend adds `POST /api/storefront/orders/{id}/cancel`; the status gating logic above is implemented now and stays once the endpoint lands.
- Loading = skeleton mirror; unknown id / 403 → `Empty` ("Order not found") + back link.

### 5. Addresses (`/account/addresses`)

- `Card` grid: label (mono chip), name, `street1`/`street2`, city, state, postalCode, country, phone; default address shows `Badge` "Default" and sits first.
- Card menu (`DropdownMenu`): Edit, Set as default (hidden when already default), Delete.
- **Form** (`Dialog` from header button + card Edit) — fields exactly matching `packages/backend/src/plugins/ecommerce/collections/addresses.ts`:

| Field | Required | Notes |
| :--- | :--- | :--- |
| `label` | ✓ | e.g. Home, Office |
| `firstName` / `lastName` | ✓ | |
| `street1` | ✓ | street address |
| `street2` | — | |
| `city` | ✓ | city / local area |
| `state` | — | region |
| `postalCode` | — | |
| `country` | ✓ | 2-letter ISO code, uppercased server-side |
| `geoCountryId` / `geoSubdivisionId` / `geoLocalityId` | — | set via geography selects below |
| `preferredStoreId` | — | inside a collapsed "Advanced" `Collapsible` |
| `phone` | — | optional recipient phone |
| `isDefault` | — | `Checkbox`, default false |

- **`GEOGRAPHY_ENABLED=true`**: country/state/postal become linked `Select`s fed by `GET /api/storefront/geography?resource=countries`, `…subdivisions&countryId=`, `…localities&subdivisionId=` (`packages/backend/src/endpoints/storefront-geography.ts`); selections write `geoCountryId`/`geoSubdivisionId`/`geoLocalityId` and mirror `country` ISO + `state` text. Flag `false` (default): plain inputs, no geo fields rendered.
- **Default switching is client-side two-phase** — no server hook un-sets the previous default (`isDefault` is a plain checkbox): `PATCH /api/addresses/{old} { isDefault: false }` then `PATCH /api/addresses/{new} { isDefault: true }`; on step-2 failure roll back step 1 and toast the error.
- Server validation strings surface verbatim on the matching `Field` (hook messages): "Address label is required.", "First name is required.", "Last name is required.", "Street address is required.", "City/local area is required.", "Country is required.", "Country must be a valid 2-letter ISO code.", "Postal code looks invalid.", "Phone number looks invalid."
- Delete → `AlertDialog` confirm → `DELETE /api/addresses/{id}`; optimistic removal with rollback on failure.

### 6. Wishlist (`/account/wishlist`)

- `GET /api/wishlist-items?where=user[equals]=me&depth=2&sort=-createdAt` → `<ProductCard />` grid (product populated); `next/image` from Payload media sizes.
- Card overlay actions: **Move to cart** (add `{ product }` to cart, then `DELETE /api/wishlist-items/{id}`, `toast.success`; a `400` *"This product is already in your wishlist."* means a duplicate add — toast the message and drop the row) and **Remove** (`AlertDialog` confirm, per the destructive-confirmation rule).
- ProductCard's own add-to-cart respects stock state per `00-design-system.md` (`INVENTORY_ENABLED`).
- `Empty` ("Your wishlist is empty" → browse products); `Skeleton` grid while loading.

### 7. My reviews (`/account/reviews`)

- `Tabs`: **Products** (`product-reviews`) and **Vendors** (`vendor-reviews`) — vendor tab only when `MULTIVENDOR_ENABLED=true` and the reviews plugin runs with `vendorReviews` enabled (`packages/backend/src/plugins/reviews/index.ts`).
- List entries: product/vendor link, `<RatingStars />`, title, comment, `createdAt`, status `Badge` — `pending` → `secondary`, `approved` → `default`, `rejected` → `destructive` (enum from `packages/backend/src/plugins/reviews/collections/product-reviews.ts`).
- **Edit** (`Dialog`): rating (1–5), title, comment (`Textarea`) → `PATCH /api/product-reviews/{id}`. Owner-only, and the server rejects author/status changes for non-admins (`403 "Forbidden: only admin can change review status."`) — the dialog never renders those controls.
- **No delete button**: `delete` access is admin-only for both review collections — the customer cannot delete a review. Show nothing rather than a disabled fake; rejected/pending entries explain their state inline.
- New reviews are created from delivered orders / PDPs (see 04) — purchase + one-review-per-product rules live server-side (`hooks.beforeChange`).
- With `REVIEW_REQUIRES_APPROVAL=false` (default) all own reviews are visible; with `true`, the read rule still returns the customer's own pending reviews (`packages/backend/src/plugins/reviews/collections/vendor-reviews.ts` mirrors this) — badge them "Pending review".

### 8. Profile (`/account/profile`)

- **Profile form:** `firstName`, `lastName`, `displayName`, `avatar` (media upload → `next/image Avatar`), locale `Select` (`en`/`bn` — mirrors the Preferences page). `PATCH /api/users/{id}`; `role`, `status`, `username` render read-only (server-side admin-only updates return `403`).
- **Identifiers card:** rows for email and phone — value + verified state `Badge` (`emailVerified`/`phoneVerified`: "Verified" `default` / "Not verified" `secondary` + **Verify** button → `POST /api/auth/send-verification` → `/auth/verify?identifier=…&value=…`).
- **Identifier change** (Edit dialog): `PATCH /api/users/{id} { email | phone }`. The hook clears the corresponding verified flag when the value changes (`packages/backend/src/lib/user-verification-reset.ts`), so after a successful change the row immediately flips to "Not verified", the page shows `Alert` "Verify your new {email/phone}", and the UI auto-fires `send-verification` (respecting the 60 s cooldown) and routes to `/auth/verify`. Same behavior powers the checkout gate banner.
- Omitting a required identifier under `AUTH_REQUIRED_IDENTIFIER` surfaces the hook message ("Email is required." / "Phone is required." / "At least one of email or phone is required.") on the field.

### 9. Password (`/account/password`)

- Fields: current password, new password, confirm. Verify current credentials first via `POST /api/auth/login { identifier, password }` (the real check — no fake endpoint); a failure marks the current-password `Field` invalid.
- Then `PATCH /api/users/{id} { password }`; `toast.success`; note under the form: "Other sessions stay signed in until their 2-hour token expires" (`tokenExpiration: 7200`).

### 10. Preferences (`/account/preferences`)

- **Locale:** `ToggleGroup` (`English` / `বাংলা`) → `PATCH /api/users/{id} { locale }` + refresh the cookie/local preference and re-render; matches the `users.locale` enum.
- **Theme:** Light / Dark / System toggle — client-side only (class strategy per `00-design-system.md`); the `users` collection has **no** theme field, so nothing is persisted to the API.
- Save is immediate per control (pending `Spinner` in the control row), no form-level submit.

## shadcn components

```bash
npx shadcn@latest add sidebar tabs card badge table pagination dialog \
  alert-dialog dropdown-menu select checkbox input textarea label field \
  toggle-group empty skeleton spinner alert sonner separator breadcrumb avatar
```

| Need | Component |
| :--- | :--- |
| Account chrome | `Sidebar` (`SidebarProvider`, inset) / mobile `Tabs` strip |
| Stats, order cards, address cards | `Card` composition |
| Status/payment chips | `Badge` (mapping tables above) |
| Orders, items | `Table` |
| List paging | `Pagination` |
| Address form, review edit, identifier edit | `Dialog` + `Field`/`FieldGroup` (`data-invalid`/`aria-invalid`) |
| Delete/cancel confirmations | `AlertDialog` |
| Card row menus | `DropdownMenu` |
| Geography / country selects | `Select` |
| Default-flag | `Checkbox`; identifier picker | `ToggleGroup` |
| Empty wishlist/orders/reviews | `Empty` |
| Loading | `Skeleton`; pending buttons `Spinner` + `disabled` + `data-icon` |
| Banners/errors | `Alert` (+`destructive`) | 

## Interactions & states

- **Loading:** every list shows a `Skeleton` mirror (table rows / card grid); detail pages skeleton the header, items, and timeline independently.
- **Empty:** orders, wishlist, reviews, addresses → `Empty` with exactly one primary action each; dashboard hides sections whose data is empty.
- **Error:** fetch failures → `Alert variant="destructive"` + retry; mutation failures → `toast.error` with the API message (dupe wishlist, review 403s, address validation).
- **Pending:** all mutating buttons disable + `Spinner` + `data-icon="inline-start"`; dialogs disable submit while pending and stay open on failure.
- **Optimistic updates:** address delete and wishlist remove roll back on failure; default-address two-phase switch rolls back step 1 if step 2 fails.
- **Guard reactions:** `401` anywhere → login redirect with `next`; `403` on order detail → "Order not found" empty state (never a raw error).

## Data & API

| Call | Purpose | Source |
| :--- | :--- | :--- |
| `GET /api/customer/analytics` | Dashboard stats, favorite categories/brands, lastOrder | `packages/backend/src/endpoints/customer-analytics.ts` |
| `GET /api/customer/recommendations` | Dashboard recommendations | `packages/backend/src/endpoints/customer-analytics.ts` |
| `GET /api/orders?where=…&sort=-placedAt&limit=&page=&depth=1`, `GET /api/orders/{id}` | Order list/detail (owner-scoped) | `packages/backend/src/plugins/orders/collections/orders.ts`, `packages/backend/src/access/is-order-owner-or-admin.ts` |
| `GET /api/sub-orders?where=parentOrder[equals]=…` | Per-vendor split (owner-scoped read) | `packages/backend/src/plugins/orders/collections/sub-orders.ts` |
| `GET /api/order-items?where=order[equals]=…` (or via `depth`) | Line-item snapshots (owner-scoped read) | `packages/backend/src/plugins/orders/collections/order-items.ts` |
| `GET /api/storefront/orders/{id}/history` *(required addition)* | Timeline entries proxied from `order-status-history` (admin-only read today) | `packages/backend/src/plugins/orders/collections/order-status-history.ts` |
| `POST /api/storefront/orders/{id}/cancel` *(required addition)* | Customer cancel within `ORDER_TRANSITIONS` window | `packages/backend/src/lib/order-status-transitions.ts`, `orders.ts` hook releases inventory on `cancelled` |
| `POST`/`PATCH`/`DELETE /api/carts(/{id})` | Reorder + move-to-cart (authed cart; `unitPrice` never sent) | `packages/backend/src/plugins/ecommerce/collections/carts.ts` |
| `POST`/`PATCH`/`DELETE /api/addresses(/{id})` | Address book CRUD + default switching | `packages/backend/src/plugins/ecommerce/collections/addresses.ts` |
| `GET /api/storefront/geography?resource=countries\|subdivisions\|localities` | Geo selects when `GEOGRAPHY_ENABLED=true` | `packages/backend/src/endpoints/storefront-geography.ts` |
| `GET`/`DELETE /api/wishlist-items(/{id})` | Wishlist (owner-scoped; duplicate add → 400) | `packages/backend/src/plugins/ecommerce/collections/wishlist-items.ts` |
| `GET`/`PATCH /api/product-reviews(/{id})`, `…/vendor-reviews` | My reviews; owner edit; no customer delete | `packages/backend/src/plugins/reviews/collections/product-reviews.ts`, `…/vendor-reviews.ts`, `…/index.ts` |
| `GET /api/users/me`, `PATCH /api/users/{id}`, `POST /api/users/logout` | Session user, profile/password/preferences, sign-out | `packages/backend/src/collections/users/index.ts` |
| `POST /api/auth/login`, `POST /api/auth/send-verification` | Password re-check, identifier re-verification | `packages/backend/src/endpoints/auth-login.ts`, `packages/backend/src/plugins/verification/endpoints/send-verification.ts` |

Flags honored: `MULTIVENDOR_ENABLED` (sub-order section), `GEOGRAPHY_ENABLED` (geo selects), `INVENTORY_ENABLED` (stock-aware add-to-cart), `AUTH_REQUIRED_IDENTIFIER` (identifier rows), `REQUIRE_VERIFIED_FOR_CHECKOUT` (verify banner) — `packages/backend/.env.example`.

## i18n keys

| key | en | bn |
| :--- | :--- | :--- |
| `account.nav.dashboard` | Dashboard | ড্যাশবোর্ড |
| `account.nav.orders` | Orders | অর্ডারসমূহ |
| `account.nav.addresses` | Addresses | ঠিকানাসমূহ |
| `account.nav.wishlist` | Wishlist | পছন্দের তালিকা |
| `account.nav.reviews` | Reviews | রিভিউ |
| `account.nav.profile` | Profile | প্রোফাইল |
| `account.nav.password` | Password | পাসওয়ার্ড |
| `account.nav.preferences` | Preferences | পছন্দসমূহ |
| `account.dashboard.totalOrders` | Total orders | মোট অর্ডার |
| `account.dashboard.totalSpent` | Total spent | মোট খরচ |
| `account.dashboard.memberSince` | Member since | সদস্য হয়েছেন |
| `account.dashboard.lastOrder` | Last order | সর্বশেষ অর্ডার |
| `account.dashboard.recentOrders` | Recent orders | সাম্প্রতিক অর্ডার |
| `account.dashboard.recommended` | Recommended for you | আপনার জন্য প্রস্তাবিত |
| `account.dashboard.viewAll` | View all | সব দেখুন |
| `account.orders.title` | My orders | আমার অর্ডার |
| `account.orders.empty` | No orders yet | এখনও কোনো অর্ডার নেই |
| `account.orders.startShopping` | Start shopping | কেনাকাটা শুরু করুন |
| `account.orders.column.order` | Order | অর্ডার |
| `account.orders.column.placed` | Placed | স্থাপিত |
| `account.orders.column.status` | Status | অবস্থা |
| `account.orders.column.payment` | Payment | পেমেন্ট |
| `account.orders.column.total` | Total | মোট |
| `account.order.detail.title` | Order {{orderNumber}} | অর্ডার {{orderNumber}} |
| `account.order.items` | Items | আইটেম |
| `account.order.totals.subtotal` | Subtotal | উপমোট |
| `account.order.totals.shipping` | Shipping | শিপিং |
| `account.order.totals.tax` | Tax | কর |
| `account.order.totals.discount` | Discount | ছাড় |
| `account.order.totals.grandTotal` | Grand total | সর্বমোট |
| `account.order.shippingAddress` | Shipping address | শিপিং ঠিকানা |
| `account.order.billingAddress` | Billing address | বিলিং ঠিকানা |
| `account.order.tracking` | Tracking | ট্র্যাকিং |
| `account.order.timeline` | Status timeline | অবস্থার টাইমলাইন |
| `account.order.reorder` | Reorder | পুনরায় অর্ডার |
| `account.order.cancel` | Cancel order | অর্ডার বাতিল করুন |
| `account.order.cancelConfirm` | Cancel this order? Inventory will be released. | এই অর্ডার বাতিল করবেন? স্টক ছেড়ে দেওয়া হবে। |
| `account.order.cancelDisabled` | Contact support to cancel | বাতিল করতে সাপোর্টে যোগাযোগ করুন |
| `account.order.notFound` | Order not found | অর্ডার পাওয়া যায়নি |
| `account.order.vendor` | Sold by {{vendor}} | বিক্রেতা {{vendor}} |
| `account.addresses.title` | Address book | ঠিকানা বই |
| `account.addresses.add` | Add address | ঠিকানা যোগ করুন |
| `account.addresses.default` | Default | ডিফল্ট |
| `account.addresses.setDefault` | Set as default | ডিফল্ট করুন |
| `account.addresses.deleteConfirm` | Delete this address? | এই ঠিকানা মুছে ফেলবেন? |
| `account.addresses.field.label` | Label | লেবেল |
| `account.addresses.field.street1` | Street address | রাস্তার ঠিকানা |
| `account.addresses.field.street2` | Street address line 2 | রাস্তার ঠিকানা (লাইন ২) |
| `account.addresses.field.city` | City / local area | শহর / এলাকা |
| `account.addresses.field.state` | Region | অঞ্চল |
| `account.addresses.field.postalCode` | Postal code | পোস্টাল কোড |
| `account.addresses.field.country` | Country | দেশ |
| `account.addresses.field.phone` | Phone | ফোন |
| `account.addresses.field.isDefault` | Use as my default address | আমার ডিফল্ট ঠিকানা হিসেবে ব্যবহার করুন |
| `account.addresses.advanced` | Advanced | উন্নত |
| `account.wishlist.title` | Wishlist | পছন্দের তালিকা |
| `account.wishlist.empty` | Your wishlist is empty | আপনার পছন্দের তালিকা খালি |
| `account.wishlist.moveToCart` | Move to cart | কার্টে যোগ করুন |
| `account.wishlist.remove` | Remove | সরান |
| `account.wishlist.removeConfirm` | Remove this item from your wishlist? | পছন্দের তালিকা থেকে এটি সরাবেন? |
| `account.reviews.title` | My reviews | আমার রিভিউ |
| `account.reviews.tabProducts` | Products | পণ্য |
| `account.reviews.tabVendors` | Vendors | বিক্রেতা |
| `account.reviews.edit` | Edit review | রিভিউ সম্পাদনা |
| `account.reviews.empty` | You haven't written any reviews yet | আপনি এখনও কোনো রিভিউ লেখেননি |
| `account.reviews.status.pending` | Pending review | অপেক্ষমাণ |
| `account.reviews.status.approved` | Published | প্রকাশিত |
| `account.reviews.status.rejected` | Not published | প্রকাশিত হয়নি |
| `account.profile.title` | Profile | প্রোফাইল |
| `account.profile.identifiers` | Sign-in details | সাইন-ইন তথ্য |
| `account.profile.verified` | Verified | যাচাইকৃত |
| `account.profile.notVerified` | Not verified | যাচাই করা হয়নি |
| `account.profile.verify` | Verify | যাচাই করুন |
| `account.profile.changeIdentifier` | Change | পরিবর্তন করুন |
| `account.profile.reverifyNotice` | Verify your new {{identifierType}} to keep full access. | পূর্ণ অ্যাক্সেস বজায় রাখতে আপনার নতুন {{identifierType}} যাচাই করুন। |
| `account.profile.displayName` | Display name | প্রদর্শন নাম |
| `account.profile.avatar` | Profile photo | প্রোফাইল ছবি |
| `account.profile.save` | Save changes | পরিবর্তন সংরক্ষণ |
| `account.password.title` | Change password | পাসওয়ার্ড পরিবর্তন |
| `account.password.current` | Current password | বর্তমান পাসওয়ার্ড |
| `account.password.new` | New password | নতুন পাসওয়ার্ড |
| `account.password.confirm` | Confirm new password | নতুন পাসওয়ার্ড নিশ্চিত করুন |
| `account.password.submit` | Update password | পাসওয়ার্ড হালনাগাদ |
| `account.password.sessionNote` | Other sessions stay signed in until their 2-hour token expires. | অন্য সেশনগুলো ২ ঘণ্টার টোকেন শেষ হওয়া পর্যন্ত সাইন ইন থাকবে। |
| `account.preferences.title` | Preferences | পছন্দসমূহ |
| `account.preferences.language` | Language | ভাষা |
| `account.preferences.theme` | Theme | থিম |
| `account.preferences.theme.light` | Light | লাইট |
| `account.preferences.theme.dark` | Dark | ডার্ক |
| `account.preferences.theme.system` | System | সিস্টেম |
| `common.signOut` | Sign out | সাইন আউট |
| `common.verifyBanner` | Verify your email or phone to check out faster. | দ্রুত চেকআউটের জন্য আপনার ইমেইল বা ফোন যাচাই করুন। |

## Acceptance checklist

- [ ] Every `/en/account/*` and `/bn/account/*` route redirects a signed-out visitor to `/auth/login?next=…`, and any `401` mid-session does the same; header/footer auth links match `01-app-shell.md`.
- [ ] Dashboard stats render the exact fields from `GET /api/customer/analytics`; the last-order card links to the order detail page.
- [ ] Orders list paginates via `?page=` and shows status/payment Badges matching the mapping tables; the status values rendered are exactly `pending, processing, partially-shipped, shipped, delivered, completed, cancelled, refunded`.
- [ ] With `MULTIVENDOR_ENABLED=true`, a split order renders one card per sub-order (subOrderNumber, vendor snapshot name, tracking link, dates) and groups items by vendor; with the flag `false` no sub-order UI exists anywhere.
- [ ] Sub-order vendor accounting fields (`commissionAmount`, `commissionRate`, `vendorEarnings`) never appear in the customer UI.
- [ ] Order detail totals include coupon snapshot; addresses render from the `shippingAddress`/`billingAddress` groups read-only.
- [ ] Timeline renders from `order-status-history` proxy data when available, otherwise the computed fallback with correct done/current/future states; the admin-only access constraint is not worked around by client calls that 403.
- [ ] Cancel is only rendered/enabled for `pending` or `processing` orders (AlertDialog copy as specced) and is disabled with the support tooltip until the storefront cancel endpoint exists; reorder rebuilds the cart without sending `unitPrice` and lands on `/cart`.
- [ ] Address form fields match the table exactly (including optional `state`, `postalCode`, `phone`, `isDefault`, collapsed `preferredStoreId`); validation errors quote the backend hook messages; `GEOGRAPHY_ENABLED=true` swaps in cascading geo selects writing `geoCountryId`/`geoSubdivisionId`/`geoLocalityId`.
- [ ] Setting a default address issues the two-phase PATCH and the previous default visibly clears; failure of phase 2 rolls back phase 1.
- [ ] Wishlist move-to-cart removes the row only after a successful cart add; duplicate-add surfaces "This product is already in your wishlist." as a toast.
- [ ] My reviews lists own reviews (including pending when moderation is on), edit dialog offers rating/title/comment only, PATCH succeeds, and no delete control exists (server `delete` is admin-only).
- [ ] Changing the email or phone in profile clears the verified badge and auto-launches `/auth/verify` with the new identifier (re-verification hook honored); `username`/`role`/`status` are visibly read-only.
- [ ] Password change verifies the current password through `POST /api/auth/login` before `PATCH /api/users/{id}`; wrong current password marks that field invalid.
- [ ] Preferences locale toggle persists to `users.locale` and re-renders; theme toggle works with light/dark/system and writes nothing to the API.
- [ ] No `space-y-*`, raw colors, `dark:` overrides, or hardcoded strings anywhere; all copy resolves through the key table above.
