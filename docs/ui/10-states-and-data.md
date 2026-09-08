# 10 — Global States, Error Handling, API Map & i18n

Cross-cutting contract applied by every surface spec (`01`–`09`). Written from the backend side: every endpoint, status code, and rate limit below is verified against `packages/backend/src`. When a surface spec and this file disagree, this file wins for states, fetching, and copy keys.

## Purpose & routes

No routes of its own. Defines:

1. Canonical loading (Skeleton), empty, and error states per layout block.
2. Optimistic-update and rollback rules for client mutations.
3. The complete API map: custom endpoints (`packages/backend/src/endpoints/*`, plugin endpoints) + Payload REST patterns used by the storefront (`packages/backend/docs/REST-API-DOCS.md`, `packages/backend/src/payload.config.ts`).
4. Fetch-layer conventions (server components vs client mutations, error envelope, revalidation).
5. SEO/metadata conventions (Payload `meta` groups → Next.js `generateMetadata`).
6. The default i18n dictionary (`nav.*`, `product.*`, `cart.*`, `checkout.*`, `auth.*`, `account.*`, `vendor.*`, `common.*`, `errors.*`).

## shadcn components (state surface)

| Need | Component |
| :--- | :--- |
| Loading placeholders | `Skeleton` (never spinners for layout blocks) |
| Pending buttons | `Button` with `disabled` + `Spinner` + `data-icon="inline-start"` |
| No-data states | `Empty` + one `Button` action |
| Inline/rendered errors | `Alert` (`destructive`; `warning` for checkout warnings) |
| Transient feedback | `sonner` (`toast.success` / `toast.error` / `toast.warning`) |
| Destructive confirms | `AlertDialog` (remove from cart, cancel order) |
| OTP entry | `InputOTP` (6 digits, `maxLength={6}`) |
| Error banners with action | `Alert` + `Button variant="outline" size="sm"` retry |

## Loading states (Skeleton)

Each section renders its own skeleton mirror; never block the whole page on one slow block. Route-level `loading.tsx` covers first paint of a segment only; in-section fetches render skeletons inline. Keep aspect ratios fixed (`aspect-square`, `h-10`) so swap-in causes no layout shift.

```
Header            Product grid (PLP/related)     Table (orders/payouts)        Detail (PDP/account)
┌──────────────┐  ┌─────┐ ┌─────┐ ┌─────┐       ┌──────────────────────┐      ┌────────┐ ┌──────────────┐
│▓▓░ ▓▓▓▓▓▓▓ ░▓│  │ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │       │▓▓▓▓ ▓▓▓▓▓ ▓▓▓ ▓▓▓▓▓▓│      │  ▓▓▓▓  │ │ ▓▓▓▓▓▓▓▓▓▓▓▓ │
│ (bar row)    │  │aspect│ │     │ │     │       │░░░░ ░░░░░ ░░░ ░░░░░░░│  ×N  │ square │ │ ▓▓▓▓▓ ▓▓▓    │
│▓▓▓▓▓▓▓▓▓▓▓▓▓│  └─────┘ └─────┘ └─────┘       └──────────────────────┘      │        │ │ ▓▓▓▓▓▓▓      │
└──────────────┘  2 text bars + price bar per card                            └────────┘ └──────────────┘
```

- **Header**: announcement bar strip, logo circle, full-width search bar, 3 icon circles (see `01-app-shell.md`).
- **Product grid**: `grid gap-4 grid-cols-2 lg:grid-cols-4` of `Card` skeletons — square media block, 2-line title, price bar (mirrors `<ProductCard />`).
- **Table**: `Table` header row + 8 rows × column bars; use for account orders, vendor products/sub-orders/payouts.
- **Detail**: two-column — square gallery block + stacked title/price/button bars; account/vendor dashboards use the same shape with a stat-card row.
- **Buttons**: pending mutation buttons swap label for `Spinner` + `disabled`; the label never disappears (keep width stable with `min-w-`).

## Empty states

`Empty` component with media slot (icon), one-line title, one-line description, and exactly one action.

| Surface | Title key | Action key |
| :--- | :--- | :--- |
| Cart page / mini-cart | `cart.empty` | `cart.emptyAction` → `/[locale]/products` |
| Search with 0 hits | `product.noResults` | `product.clearFilters` → reset URL params |
| Account orders | `account.noOrders` | `account.noOrdersAction` → `/[locale]/products` |
| Wishlist | `account.noWishlist` | `account.emptyAction` → `/[locale]/products` |
| Addresses | `account.noAddresses` | `account.addAddress` → opens dialog |
| My reviews | `account.noReviews` | `account.noReviewsAction` → order history |
| Vendor products / sub-orders | `vendor.noProducts` / `vendor.noSubOrders` | `vendor.addProduct` / none (read-only) |
| Delivery-context with no coverage | backend `emptyReason` (`unserved_area` / `no_public_stores_for_area`) → `checkout.unservedArea` / `checkout.noStoreCoverage` | none (info Alert instead) |

Guest-cart surfaces only appear when `GUEST_CHECKOUT_ENABLED=true`; when false, unauthenticated visitors are redirected to login instead of seeing an empty cart.

## Error taxonomy

Two response envelopes exist in the backend — the fetch helper (`apiFetch`, below) normalizes both:

- Payload-style: `{ "errors": [{ "message": "...", ... }] }` (auth-login, dashboard-stats, admin-reports, all Payload REST validation) — `packages/backend/src/endpoints/auth-login.ts`.
- Custom-style: `{ "error": "...", "errorCode?": "..." }` (checkout-process, guest-order-lookup, storefront endpoints) — `packages/backend/src/endpoints/checkout-process.ts`.

| Status | Real backend triggers | UI pattern |
| :--- | :--- | :--- |
| network / offline / timeout | fetch rejects or `AbortSignal` fires | `toast.error(t('errors.network'))`; block shows `Alert` + `common.retry` |
| `400` validation | Payload field validation (`errors[]` entries carry `label`/`path`); coupon rejected in cart hook (`packages/backend/src/plugins/ecommerce/collections/carts.ts` → `APIError(reason, 400)`); missing checkout fields | Client zod catches most pre-submit (`data-invalid` + `aria-invalid`, 422-style inline UX); server messages map onto `Field` error slots, unknown ones → `Alert variant="destructive"` above the form |
| `401` | expired/missing token on `me`, orders, addresses, wishlist, customer endpoints | Clear session → redirect `/{locale}/auth/login?next={path}` + `toast.error(t('errors.unauthorized'))` |
| `403` | unverified email login (`AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN=true`, auth-login.ts); cart not owned by user/guest (process-checkout.ts); role-gated endpoints (dashboard-stats, reports, coupon-usage, admin verify) | `Alert variant="destructive"`; unverified case adds `auth.sendCode` action → `/[locale]/auth/verify` |
| `404` | unknown slug/route; unpublished product (anon `products` read is filtered to `status=published`); `storefront/geography` when `GEOGRAPHY_ENABLED=false`; `storefront/variant-availability` when `STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED=false` | Route `not-found.tsx`: `Empty` + `errors.notFoundAction`; block-level: `Alert` + retry |
| `409` | guest checkout with existing account's email/phone (checkout-process.ts: "already associated with an account"); reused `idempotencyKey` from another context | `Alert` + CTA button → login (`checkout.accountExists`); do not offer "try again" |
| `429` rate-limited | Redis limiter (`packages/backend/src/lib/rate-limiter.ts`): checkout 5 req/60 s/IP (`CHECKOUT_RATE_LIMIT_POINTS/DURATION`), guest lookup 10 req/15 min/IP, `send-verification` 60 s cooldown (body `{ error, retryAfter: 60 }`) + 10 req/10 min per identifier and per IP. Responses carry a `Retry-After` header when the limiter is enforced | Never silent. Submit button → `disabled` + countdown from `Retry-After`; `toast.warning(t('errors.rateLimited', { seconds }))`. Reads: retry with exponential backoff + jitter (500 ms → 1 s → 2 s, max 3 tries, wait at least `Retry-After`). Mutations: no auto-retry (except checkout, which reuses the same `idempotencyKey` so the server dedupes) |
| `501` / `503` | Stripe adapter not implemented (process-checkout.ts); SSLCommerz hosted checkout disabled (`SSLCOMMERZ_SESSION_ENABLED=false`) | Checkout `Alert variant="destructive"` with the exact backend message; disable pay button |
| `5xx` | unhandled server errors | `toast.error(t('errors.server'))`; block `Alert` + retry |

### Envelope parsing + retry helper (normative)

```ts
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: 'include', ...init })
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '5')
    throw new RateLimitError(retryAfter) // caller shows countdown / schedules backoff
  }
  if (res.status === 401) { session.clear(); redirect(loginPath()) }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.error ?? body?.errors?.[0]?.message ?? null
    throw new ApiError(res.status, message, body?.errors ?? [], body?.errorCode)
  }
  return body as T
}
```

Optimistic-yet-idempotent GETs may wrap `apiFetch` in a backoff loop honoring `RateLimitError.retryAfter`. Checkout always generates `idempotencyKey = crypto.randomUUID()` once per checkout attempt and reuses it across retries (server returns the existing order for a repeat, `process-checkout.ts`).

## Optimistic updates & rollback

| Mutation | Optimistic? | Rules |
| :--- | :--- | :--- |
| Cart quantity | Yes | Update local line + totals instantly; debounce 500 ms; `PATCH /api/carts/:id`. On failure: rollback to snapshot, `toast.error`, restore stepper value. Server recomputes `unitPrice`/totals — replace local numbers with the response doc |
| Remove cart line | No | `AlertDialog` confirm, then `PATCH` with the item removed; pending spinner on row |
| Wishlist add/remove | Yes | Toggle heart instantly; `POST` / `DELETE /api/wishlist-items` on `next` tick. Rollback + toast on failure; `401` → login redirect (wishlist is owner-only, `wishlist-items.ts` access). Server rejects duplicates with `400` "This product is already in your wishlist." — treat as success (idempotent UX) |
| Apply coupon | No | Server-validated on cart save (`validateCouponForSubtotal`); send `couponCode`, render returned `discountTotal`/`grandTotal`; on `400` show `cart.couponInvalid` in the Field error slot |
| Checkout | No | Full pending state on the pay button; navigation only on `201` (`paymentRedirectUrl` → `location.assign`, else → confirmation route) |

## API map

Auth column: **Public** = no auth; **Guest** = `X-Guest-Id: <uuid>` header (client-generated UUID, carts.ts rejects create without it when guest checkout enabled); **Token** = `Authorization: Bearer <jwt>` (jwtOrder `['Bearer','JWT','cookie']`, `payload.config.ts`) or session cookie for same-origin; **Admin/Vendor/Customer** = Token + role. All paths below live under the API base (`/api` prefix included). Locale-sensitive reads append `&locale=en|bn`.

### Custom endpoints — `packages/backend/src/endpoints/*`

| UI need | Method + path | Auth | Notes |
| :--- | :--- | :--- | :--- |
| Login (email **or** phone + password) | `POST /api/auth/login` | Public | Body `{identifier, password}`; returns `{user, token, exp}`; `403` when `AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN=true` and email unverified (`auth-login.ts`) |
| Guest order tracking | `POST /api/guest/order-lookup` | Public | `{orderNumber, guestEmail|guestPhone}`; guest orders only; uniform `404`; 10 req/15 min/IP (`guest-order-lookup.ts`) |
| Place order | `POST /api/checkout/process` | Public/Guest or Token | `{cartId, shippingAddress, billingAddress, …}`; 5 req/60 s/IP; `201` → `{order{id,orderNumber,items,grandTotal,…}, paymentRedirectUrl?, warnings?}`; `400` field errors, `403` cart-ownership/unverified, `409` existing account (`checkout-process.ts`, `lib/process-checkout.ts`) |
| SSLCommerz IPN | `POST /api/payments/sslcommerz/ipn` | Gateway | Server-to-server; always `200` text OK; never called from UI (`sslcommerz-ipn.ts`) |
| SSLCommerz return-sync | `GET /api/payments/sslcommerz/sync-paid?val_id=&tran_id=` | Public | Browser-callable reconciliation on redirect-back; idempotent with IPN (`sslcommerz-sync-paid.ts`) |
| Admin/vendor reports (+CSV) | `GET /api/reports` | Admin or Vendor (token) | Query `category,reportType,period,startDate,endDate,storeId,currency,format=json|csv`; `csv` returns a `text/csv` attachment; vendor scoped to own tenant (`admin-reports.ts`) |
| Admin/vendor dashboard metrics | `GET /api/dashboard-stats` | Admin or Vendor (token) | Query `timeRange|startDate|endDate|storeId|currency`; vendor scoped to own tenant (`dashboard-stats.ts`) |
| Admin branding (logo/favicon) | `GET /api/admin-branding` | Public | Non-sensitive branding from `platform-settings` (`admin-branding.ts`) |
| PLP with store-stock filter | `GET /api/storefront/store-products` | Public | Params `store,page,limit,sort,category,brand,search,featured,tenant,productType,minPrice,maxPrice,class,spec-*,locale,depth`; published only (`storefront-store-products.ts`) |
| PDP variant purchasability | `GET /api/storefront/variant-availability?product=&store=` | Public | `{inventoryEnabled,productId,lines:[{variantId,purchasable}]}`; `404` when `STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED=false` (`storefront-variant-availability.ts`) |
| Catalog facets (filters) | `GET /api/storefront/facets` (alias `GET /api/products/facets`) | Public | `category|class|store|locale`; cached `max-age=60` (`storefront-facets.ts`) |
| Geography / delivery context | `GET /api/storefront/geography?resource=countries|subdivisions|localities|delivery-context` | Public | `404` when `GEOGRAPHY_ENABLED=false`; `delivery-context` returns `{policy{tier,extendedFeeNote,…},subdivision,locality,stores[],emptyReason}` (`storefront-geography.ts`) |
| Customer stats | `GET /api/customer/analytics` | Customer (token) | Totals, spend, favorite categories/brands (`customer-analytics.ts`) |
| Recommendations | `GET /api/customer/recommendations?limit=` | Public (personalized with token) | Order-history based when authed, trending/featured otherwise; `limit` ≤ 24 (`customer-analytics.ts`) |
| Dev seed | `GET|POST /api/seed/electronics?secret=` | Secret/Admin | Demo-data reset — never call from storefront UI (`seed-electronics.ts`) |
| OpenAPI/docs | `GET /api/openapi-custom.json`, `GET /api/openapi-all.json`, `GET /api/docs-index` | Public | Dev-facing contracts (`custom-endpoints-openapi.ts`, `openapi-all.ts`, `docs-index.ts`) |

### Plugin endpoints — `packages/backend/src/plugins/*`

| UI need | Method + path | Auth | Notes |
| :--- | :--- | :--- | :--- |
| Send verification (email link/OTP, phone OTP) | `POST /api/auth/send-verification` | Public (403 mismatch when authed) | `{identifierType:'email'|'phone', identifier}`; 60 s cooldown → `429 {retryAfter:60}`; 10 req/10 min per identifier & IP; `502` when adapter fails (`verification/endpoints/send-verification.ts`) |
| Verify email | `POST /api/auth/verify-email` | Public | Link strategy: `{token}`; OTP strategy: `{code, email}`; sets `emailVerified` (`verify-email-post.ts`) |
| Verify email (one-click link) | `GET /api/auth/verify-email/:token` | Public | Deep-link target of the emailed link (`verify-email-link-get.ts`) |
| Verify phone | `POST /api/auth/verify-phone` | Public | `{phone, code}`; sets `phoneVerified` (`verify-phone.ts`) |
| Manual verify (support) | `POST /api/auth/admin/verify-identifier` | Admin | Admin-only fallback (`verify-identifier-admin.ts`) |
| Coupon usage report | `GET /api/discounts/coupons/:id/usage` | Admin | Admin panel only (`discounts/endpoints/coupon-usage.ts`) |

### Payload REST patterns (generated; see `/api/docs`, `REST-API-DOCS.md`)

| UI need | Method + path | Auth | Notes |
| :--- | :--- | :--- | :--- |
| List/filter products | `GET /api/products?locale=&where=&sort=&page=&limit=&depth=` | Public (published only) | Spec filters: `where[basePrice][greater_than_equal]`, `where[categories][in]=…`, search via custom endpoint's `search` param |
| PDP by slug | `GET /api/products?where[slug][equals]=&locale=&depth=2` | Public | Take `docs[0]`; `404` UI when empty |
| Categories / brands tree | `GET /api/categories`, `GET /api/brands?where[featured][equals]=true` | Public | `categories` access: anon reads active rows |
| CMS pages (FAQ, policy) | `GET /api/pages?where[slug][equals]=&locale=` | Public | Blocks rendered per `02-home.md` |
| Header / footer globals | `GET /api/globals/header`, `GET /api/globals/footer` | Public | Announcement bar, nav, footer columns (`globals/header.ts`, `globals/footer.ts`) |
| Platform settings | `GET /api/globals/platform-settings` | **Authenticated (any user)** | `read: Boolean(req.user)` — currency/vendorDefaults only for logged-in views; anonymous branding via `GET /api/admin-branding` (logo/favicon/tagline only, no currency) (`globals/platform-settings.ts`, `endpoints/admin-branding.ts`) |
| Media | `GET /api/media/:id` | Public | Sizes `thumbnail 400×300`, `card 768×1024`, `tablet 1024w` (`collections/media.ts`) |
| Register | `POST /api/users` | Public | `access.create: () => true`; send `email`/`phone` + `password`; `username` auto-set (`collections/users/index.ts`) |
| Session | `GET /api/users/me`, `POST /api/users/logout`, `POST /api/users/refresh`, `POST /api/users/forgot-password`, `POST /api/users/reset-password` | Token / Public | Storefront login uses custom `/api/auth/login`; `me` drives `AuthProvider` |
| Cart CRUD | `GET|POST /api/carts`, `PATCH|DELETE /api/carts/:id` | Guest (`X-Guest-Id` uuid) or Token | `couponCode` accepted on save, validated server-side; `unitPrice`/totals are server-computed — never send (`ecommerce/collections/carts.ts`) |
| Orders (customer) | `GET /api/orders?where[customer][equals]=&sort=-createdAt` | Customer (token) | Owner-or-admin access (`orders/collections/orders.ts`); no client create/cancel — cancel is admin-side per current access |
| Sub-orders | `GET /api/sub-orders` | Customer (own) / Vendor (own tenant) / Admin | Multivendor splits (`MULTIVENDOR_ENABLED`), `sub-orders.ts` |
| Addresses | `GET|POST /api/addresses`, `PATCH|DELETE /api/addresses/:id` | Customer (token) | Owner-or-admin (`ecommerce/collections/addresses.ts`) |
| Wishlist | `GET|POST /api/wishlist-items`, `DELETE /api/wishlist-items/:id` | Customer (token) | Duplicate → `400` already-in-wishlist (`ecommerce/collections/wishlist-items.ts`) |
| Reviews | `GET /api/product-reviews?where[product][equals]=`, `POST /api/product-reviews` | Read Public / Create Customer | Create gated to customers + purchase check (`reviews/collections/product-reviews.ts`) |
| Shipping methods | `GET /api/shipping-methods?where[isActive][equals]=true` | Public | Read-only for checkout method list (`shipping/collections/shipping-methods.ts`) |
| Vendor onboarding | `POST /api/vendor-applications`, `GET /api/vendor-applications` | Token (applicant) | Own-application read/update-while-pending (`multivendor/collections/vendor-applications.ts`) |
| Vendor catalog | `POST /api/products` (vendor), `GET /api/stock-locations?where[isPublicStore][equals]=true`, `GET /api/stock-levels` | Vendor/Admin | Public store list drives store selector |
| Payouts | `GET /api/payouts`, `GET /api/payout-items` | Vendor (own tenant) / Admin | Read-only in panel (`payouts/collections/payouts.ts`) |
| Vendor profile (public) | `GET /api/vendor-profiles?where[tenant][equals]=` | Public | Published profiles readable by anon (`multivendor/collections/vendor-profiles.ts`) |
| Transactions | `GET /api/transactions` | Admin | Payment audit; not used by storefront |

**Does not exist:** a standalone shipping-cost estimate endpoint. Delivery capability/cost context comes from `GET /api/storefront/geography?resource=delivery-context` (policy tier + serving stores) and `GET /api/shipping-methods`; final `shippingTotal` is computed server-side at checkout. Do not spec a shipping-calculator UI.

## Fetch layer conventions

- **Base URL**: backend origin from env (`NEXT_PUBLIC_APP_URL` of the API host / `SERVER_PUBLIC_URL`); CORS/CSRF trusted origins already include storefront origins (`payload.config.ts` → `getPayloadTrustedOrigins()`).
- **Server Components**: `fetch` REST with `{ next: { tags, revalidate } }` — never `payload` Local API from the frontend app (separate deployment).
- **Locale**: every read passes `?locale=${locale}`; Payload `fallback: true` returns `en` when a `bn` field is empty (`payload.config.ts` localization). Never send `fallback-locale=null` for storefront reads.
- **Client mutations**: `fetch` with `credentials: 'include'`, `Authorization: Bearer` when a token exists, `X-Guest-Id` for guest carts. Content-Type `application/json` except SSLCommerz redirect flows.
- **Revalidation tags** (use with `revalidateTag` after mutations or `router.refresh()`):

| Tag | Used by | revalidate |
| :--- | :--- | :--- |
| `products` | PLP/PDP/home grids | 300 s |
| `categories` / `brands` | nav menus, PLP filters | 3600 s |
| `globals` (header/footer/platform-settings) | app shell | 3600 s |
| `pages` | CMS pages | 3600 s |
| no-store | `users/me`, carts, orders, checkout, analytics | — |

- **Timeouts**: reads `AbortSignal.timeout(10_000)`, checkout `20_000`; abort on unmount in client hooks.
- **Mutations after success**: cart/auth mutations call `router.refresh()` so server-rendered cart badge/header counts re-sync.
- **Tokens**: store JWT in an httpOnly, scoped cookie set by the storefront app; never `localStorage` (XSS). `/api/auth/login` deliberately does not set a backend cookie (`auth-login.ts` comment) — the storefront owns its session cookie.

## SEO & metadata conventions

- **`generateMetadata`** per route reads localized Payload `meta { title, description, image }` — present on `products`, `pages`, `categories`, `brands`, `vendor-profiles` (e.g. `plugins/ecommerce/collections/products.ts` `meta` group). Fallback chain: `meta.title` → product/category name → site default from `globals/header` `siteName`.
- **Canonical + hreflang** on every locale-prefixed route: `alternates: { canonical: '/{locale}{path}', languages: { en: '/en{path}', bn: '/bn{path}', 'x-default': '/en{path}' } }`. Root `/` redirects to `/en`.
- **Open Graph**: `og:title`/`og:description` from `meta`; `og:image` from `meta.image` (media `card`/`tablet` size) else PDP first gallery image; `og:locale` = `en_US` / `bn_BD` with `alternateLocale`. Twitter `summary_large_image`.
- **JSON-LD** on PDP: `Product` schema — `name`, `image` (media URLs), `description`, `offers{price, priceCurrency, availability}` from `basePrice`/stock, `aggregateRating{ratingValue, reviewCount}` from server-computed `rating`/`totalReviews`; `BreadcrumbList` from the PDP breadcrumb.
- **noindex**: `/cart`, `/checkout/**`, `/account/**`, `/vendor/**` (behind auth), `/auth/**`; auth pages also skip index via `robots: { index: false }`.
- `metadataBase` from the storefront public URL env; never absolute-URL media by hand — use Payload-returned URLs.

## i18n key dictionary

Files: `dictionaries/en.json`, `dictionaries/bn.json`; loaded per locale in `[locale]/layout.tsx`. Access via `t('cart.empty')`; `{var}` = ICU interpolation. This table is the seed dictionary — surface specs add keys beneath the same namespaces; never hardcode visible strings.

| key | en | bn |
| :--- | :--- | :--- |
| `nav.home` | Home | হোম |
| `nav.products` | All Products | সকল পণ্য |
| `nav.categories` | Categories | ক্যাটাগরিসমূহ |
| `nav.brands` | Brands | ব্র্যান্ডসমূহ |
| `nav.searchPlaceholder` | Search products… | পণ্য খুঁজুন… |
| `nav.cart` | Cart | কার্ট |
| `nav.wishlist` | Wishlist | পছন্দের তালিকা |
| `nav.account` | My Account | আমার অ্যাকাউন্ট |
| `nav.vendorPanel` | Vendor Panel | বিক্রেতা প্যানেল |
| `nav.trackOrder` | Track Order | অর্ডার ট্র্যাক করুন |
| `nav.login` | Log In | লগ ইন |
| `nav.logout` | Log Out | লগ আউট |
| `nav.language` | Language | ভাষা |
| `common.addToCart` | Add to Cart | কার্টে যোগ করুন |
| `common.buyNow` | Buy Now | এখনই কিনুন |
| `common.viewAll` | View All | সব দেখুন |
| `common.apply` | Apply | প্রয়োগ করুন |
| `common.remove` | Remove | সরিয়ে ফেলুন |
| `common.cancel` | Cancel | বাতিল করুন |
| `common.confirm` | Confirm | নিশ্চিত করুন |
| `common.save` | Save | সংরক্ষণ করুন |
| `common.retry` | Try Again | আবার চেষ্টা করুন |
| `common.loading` | Loading… | লোড হচ্ছে… |
| `common.outOfStock` | Out of Stock | স্টকে নেই |
| `common.quantity` | Quantity | পরিমাণ |
| `common.subtotal` | Subtotal | উপমোট |
| `common.discount` | Discount | ছাড় |
| `common.shipping` | Shipping | ডেলিভারি চার্জ |
| `common.total` | Total | সর্বমোট |
| `common.free` | Free | বিনামূল্যে |
| `common.sale` | Sale | ছাড় |
| `common.new` | New | নতুন |
| `common.optional` | Optional | ঐচ্ছিক |
| `product.addedToCart` | Added to cart | কার্টে যোগ হয়েছে |
| `product.description` | Description | বিবরণ |
| `product.specifications` | Specifications | কারিগরি বিবরণ |
| `product.reviews` | Reviews | রিভিউ |
| `product.writeReview` | Write a review | রিভিউ লিখুন |
| `product.relatedProducts` | You may also like | এগুলোও দেখতে পারেন |
| `product.selectVariant` | Choose an option | অপশন বেছে নিন |
| `product.soldBy` | Sold by | বিক্রেতা |
| `product.noResults` | No products found | কোনো পণ্য পাওয়া যায়নি |
| `product.clearFilters` | Clear filters | ফিল্টার মুছুন |
| `cart.title` | Shopping Cart | কেনাকাটার কার্ট |
| `cart.empty` | Your cart is empty | আপনার কার্ট এখনো খালি |
| `cart.emptyAction` | Start shopping | কেনাকাটা শুরু করুন |
| `cart.couponLabel` | Coupon code | কুপন কোড |
| `cart.couponApplied` | Coupon applied | কুপন প্রয়োগ হয়েছে |
| `cart.couponInvalid` | This coupon cannot be applied | এই কুপনটি প্রযোজ্য নয় |
| `cart.removed` | Item removed | পণ্যটি সরানো হয়েছে |
| `cart.checkoutButton` | Proceed to Checkout | চেকআউট করুন |
| `cart.summary` | Order Summary | অর্ডারের সারসংক্ষেপ |
| `checkout.title` | Checkout | চেকআউট |
| `checkout.contact` | Contact info | যোগাযোগের তথ্য |
| `checkout.shippingAddress` | Delivery address | ডেলিভারি ঠিকানা |
| `checkout.billingAddress` | Billing address | বিলিং ঠিকানা |
| `checkout.deliveryArea` | Delivery area | ডেলিভারি এলাকা |
| `checkout.paymentMethod` | Payment method | পেমেন্ট পদ্ধতি |
| `checkout.cod` | Cash on Delivery | ক্যাশ অন ডেলিভারি |
| `checkout.online` | Online payment | অনলাইন পেমেন্ট |
| `checkout.placeOrder` | Place Order | অর্ডার নিশ্চিত করুন |
| `checkout.guestTitle` | Guest checkout | অ্যাকাউন্ট ছাড়া চেকআউট |
| `checkout.redirecting` | Redirecting to payment… | পেমেন্ট পৃষ্ঠায় নেওয়া হচ্ছে… |
| `checkout.successTitle` | Order placed successfully! | অর্ডার সফলভাবে সম্পন্ন হয়েছে! |
| `checkout.failedTitle` | Order could not be completed | অর্ডারটি সম্পন্ন করা যায়নি |
| `checkout.accountExists` | An account with this email or phone already exists. Please log in. | এই ইমেইল বা ফোন নম্বরে একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগ ইন করুন। |
| `checkout.unservedArea` | Delivery is not available in this area yet | এই এলাকায় এখনো ডেলিভারি সেবা নেই |
| `checkout.noStoreCoverage` | No store currently delivers here | এখানে বর্তমানে কোনো শোরুম ডেলিভারি দেয় না |
| `auth.loginTitle` | Welcome back | আবার স্বাগতম |
| `auth.identifierLabel` | Email or phone | ইমেইল বা ফোন নম্বর |
| `auth.passwordLabel` | Password | পাসওয়ার্ড |
| `auth.loginButton` | Log In | লগ ইন |
| `auth.registerTitle` | Create your account | আপনার অ্যাকাউন্ট খুলুন |
| `auth.forgotPassword` | Forgot password? | পাসওয়ার্ড ভুলে গেছেন? |
| `auth.sendCode` | Send code | কোড পাঠান |
| `auth.otpTitle` | Enter verification code | যাচাইকরণ কোড দিন |
| `auth.otpHint` | Enter the 6-digit code sent to {target} | {target}-এ পাঠানো ৬ সংখ্যার কোডটি লিখুন |
| `auth.resend` | Resend code | আবার কোড পাঠান |
| `auth.resendIn` | Resend available in {seconds}s | আবার পাঠানো যাবে {seconds} সেকেন্ড পর |
| `auth.verified` | Verified successfully | যাচাই সফল হয়েছে |
| `auth.invalidCode` | The code is invalid or has expired | কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে |
| `auth.magicLinkSent` | Check your email for the verification link | যাচাইকরণ লিংক আপনার ইমেইলে পাঠানো হয়েছে |
| `auth.haveAccount` | Already have an account? | অ্যাকাউন্ট আছে? |
| `auth.noAccount` | Don't have an account? | অ্যাকাউন্ট নেই? |
| `account.title` | My Account | আমার অ্যাকাউন্ট |
| `account.orders` | My Orders | আমার অর্ডার |
| `account.addresses` | Addresses | ঠিকানাসমূহ |
| `account.wishlist` | Wishlist | পছন্দের তালিকা |
| `account.profile` | Profile | প্রোফাইল |
| `account.reviews` | My Reviews | আমার রিভিউ |
| `account.noOrders` | No orders yet | এখনো কোনো অর্ডার নেই |
| `account.noOrdersAction` | Start shopping | কেনাকাটা শুরু করুন |
| `account.noWishlist` | Your wishlist is empty | পছন্দের তালিকা খালি |
| `account.emptyAction` | Browse products | পণ্য দেখুন |
| `account.noAddresses` | No saved addresses | কোনো সংরক্ষিত ঠিকানা নেই |
| `account.addAddress` | Add new address | নতুন ঠিকানা যোগ করুন |
| `account.noReviews` | No reviews yet | এখনো কোনো রিভিউ নেই |
| `account.addedToWishlist` | Saved to wishlist | পছন্দের তালিকায় যোগ হয়েছে |
| `account.removedFromWishlist` | Removed from wishlist | পছন্দের তালিকা থেকে সরানো হয়েছে |
| `account.orderNumber` | Order | অর্ডার |
| `account.cancelOrder` | Cancel order | অর্ডার বাতিল করুন |
| `account.cancelConfirm` | Cancel this order? This cannot be undone. | অর্ডারটি বাতিল করবেন? এটি আর ফিরিয়ে আনা যাবে না। |
| `account.status.pending` | Pending | অপেক্ষমাণ |
| `account.status.processing` | Processing | প্রক্রিয়াধীন |
| `account.status.partially-shipped` | Partially shipped | আংশিক পাঠানো হয়েছে |
| `account.status.shipped` | Shipped | পাঠানো হয়েছে |
| `account.status.delivered` | Delivered | ডেলিভারি সম্পন্ন |
| `account.status.completed` | Completed | সম্পন্ন |
| `account.status.cancelled` | Cancelled | বাতিল |
| `account.status.refunded` | Refunded | ফেরত দেওয়া হয়েছে |
| `account.payment.unpaid` | Unpaid | অপরিশোধিত |
| `account.payment.paid` | Paid | পরিশোধিত |
| `account.payment.partially-refunded` | Partially refunded | আংশিক ফেরত |
| `account.payment.refunded` | Refunded | ফেরত দেওয়া হয়েছে |
| `vendor.apply` | Become a Vendor | বিক্রেতা হিসেবে যোগ দিন |
| `vendor.applicationPending` | Your application is under review | আপনার আবেদন পর্যালোচনাধীন রয়েছে |
| `vendor.dashboard` | Dashboard | ড্যাশবোর্ড |
| `vendor.products` | Products | পণ্যসমূহ |
| `vendor.subOrders` | Sub-orders | সাব-অর্ডারসমূহ |
| `vendor.payouts` | Payouts | উত্তোলন |
| `vendor.earnings` | Earnings | আয় |
| `vendor.commission` | Commission | কমিশন |
| `vendor.addProduct` | Add product | নতুন পণ্য |
| `vendor.noProducts` | No products yet | এখনো কোনো পণ্য নেই |
| `vendor.noSubOrders` | No sub-orders yet | এখনো কোনো সাব-অর্ডার নেই |
| `vendor.holdNote` | Payouts are released {days} days after delivery | ডেলিভারির {days} দিন পর উত্তোলনের জন্য মুক্ত হয় |
| `errors.network` | Network error. Check your connection and try again. | নেটওয়ার্ক সমস্যা। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন। |
| `errors.generic` | Something went wrong. Please try again. | কিছু একটা ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। |
| `errors.notFound` | Page not found | পৃষ্ঠাটি খুঁজে পাওয়া যায়নি |
| `errors.notFoundAction` | Back to home | হোমে ফিরে যান |
| `errors.unauthorized` | Please log in to continue | চালিয়ে যেতে অনুগ্রহ করে লগ ইন করুন |
| `errors.forbidden` | You do not have permission for this action | এই কাজটির অনুমতি আপনার নেই |
| `errors.validation` | Some fields need attention | কিছু ঘর সঠিকভাবে পূরণ করা হয়নি |
| `errors.rateLimited` | Too many requests. Try again in {seconds}s. | অনেক বেশি অনুরোধ। {seconds} সেকেন্ড পর আবার চেষ্টা করুন। |
| `errors.timeout` | The request took too long. Please try again. | অনুরোধে বেশি সময় লেগেছে। আবার চেষ্টা করুন। |
| `errors.server` | Server error. Please try again shortly. | সার্ভারে সমস্যা। কিছুক্ষণ পর আবার চেষ্টা করুন। |
| `errors.unverified` | Please verify your email or phone before continuing | চালিয়ে যাওয়ার আগে ইমেইল বা ফোন যাচাই করুন |

## Acceptance checklist

- [ ] Every async section renders a `Skeleton` mirror (header, grid, table, detail shapes present); no full-page spinners; no layout shift on swap-in.
- [ ] Every zero-data surface uses `Empty` with exactly one action from the table above; no hand-rolled empty states.
- [ ] `apiFetch` normalizes both error envelopes; every surface handles network/400/401/403/404/409/429/5xx per the taxonomy (401 → login redirect with `next`, 409 → login CTA, never bare console errors).
- [ ] `429` responses surface a countdown honoring `Retry-After` (checkout 5/min/IP, guest lookup 10/15 min/IP, send-verification 60 s cooldown); reads back off with jitter; checkout retries reuse one `idempotencyKey`.
- [ ] Cart quantity + wishlist are optimistic with snapshot rollback and error toasts; coupon apply and checkout are never optimistic.
- [ ] API map matches the backend: every endpoint in `packages/backend/src/endpoints/*` and both verification/discount plugin endpoints appear with correct method/path/auth; flag-disabled endpoints (`geography`, `variant-availability`) spec the 404 variant; no shipping-estimate endpoint is speced.
- [ ] Server reads pass `?locale=`; revalidation tags match the table; mutations refresh server-rendered counts.
- [ ] `generateMetadata` emits localized title/description, canonical + `hreflang` en/bn + `x-default`, OG image from Payload media; cart/checkout/account/vendor/auth routes are `noindex`.
- [ ] No hardcoded visible strings; all copy resolves from the dictionary; `bn` strings render in Noto Sans Bengali and are real translations; interpolation keys (`{seconds}`, `{target}`, `{days}`) documented per row.
- [ ] Order/payment status badges use exactly the `account.status.*` / `account.payment.*` values from the backend enums (no invented statuses).
