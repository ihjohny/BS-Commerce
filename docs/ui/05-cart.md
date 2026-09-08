# 05 — Cart Page & Mini-Cart

Cart line-item management, coupon application, and checkout entry. Grounded in the `carts` collection (`packages/backend/src/plugins/ecommerce/collections/carts.ts`) — the server derives every price and validates every coupon; the UI never sends money values.

## Purpose & routes

| Route | Surface |
| :--- | :--- |
| `/en/cart`, `/bn/cart` | Full cart page |
| global (header trigger, `01-app-shell.md`) | Mini-cart `Sheet` — same cart context, compact layout |

- Cart is a **client-side context** (`CartProvider`) backed by Payload REST `/api/carts`; page and mini-cart consume the same state so both stay in sync.
- **Authenticated users**: one cart per user (`carts.user`); requests carry the session cookie.
- **Guests** (only when `GUEST_CHECKOUT_ENABLED=true`): a UUID generated client-side and stored in a first-party cookie; sent as the `X-Guest-Id` header on every cart request. Guest carts have `user: null`, are keyed by `carts.guestId`, and **expire after 7 days** (`expiresAt`, auto-set server-side on create, `carts.ts:98-101`). If `GUEST_CHECKOUT_ENABLED=false`, unauthenticated cart CRUD returns 403 — header shows a Sign-in-prompted cart icon instead.
- **Login transition**: no server-side merge endpoint exists. On login, stop sending `X-Guest-Id`, fetch the user cart (create if none), and re-add guest items client-side via normal `POST /api/carts/:id` item patches if desired (prices are re-derived server-side, so re-adding is safe). The abandoned guest cart expires on its own.

## Wireframe

Desktop (`lg:` and up — two columns):

```
┌────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home / Cart                     Cart (3 items)     │
├───────────────────────────────────────┬────────────────────────┤
│ LINE ITEMS                    │ ORDER SUMMARY (sticky)  │
│ ┌───────────────────────────┐ │ ┌─────────────────────┐ │
│ │ [img] Product Title       │ │ │ Subtotal      ৳4,500│ │
│ │       Size: L · Red       │ │ │ Discount   −৳450    │ │
│ │       Vendor: Acme (MV)   │ │ │ Shipping  At next   │ │
│ │ [−] 2 [+]     ৳1,500 ✕    │ │ │           step      │ │
│ │                  [Delete] │ │ ├─────────────────────┤ │
│ └───────────────────────────┘ │ │ Total         ৳4,050│ │
│ ┌───────────────────────────┐ │ │ [Proceed to checkout]│
│ │ [img] Product Title 2 …   │ │ └─────────────────────┘ │
│ └───────────────────────────┘ │ COUPON                  │
│                               │ ┌─────────────┬───────┐ │
│ CUSTOMER NOTE                 │ │ SAVE10    │ Apply │ │
│ ┌───────────────────────────┐ │ └─────────────┴───────┘ │
│ │ Message to seller…        │ │                         │
│ └───────────────────────────┘ │                         │
└───────────────────────────────┴────────────────────────┘
```

Mobile: single column — summary Card moves above the note, below items; `Proceed to checkout` is a full-width sticky footer bar.

Mini-cart `Sheet` (side="right" desktop, full-width mobile):

```
┌──────────────────────────────┐
│ Your cart (3)          [✕]   │
├──────────────────────────────┤
│ [img] Title            [✕]   │
│       Variant · [−] 1 [+]    │
│       ৳1,500                 │
│ …                            │
├──────────────────────────────┤
│ Subtotal            ৳4,500   │
│ [      View cart          ]  │
│ [   Proceed to checkout   ]  │
└──────────────────────────────┘
```

## Sections

1. **PageHeader** — `Breadcrumb` (Home / Cart) + `h1` + item count (`text-muted-foreground`). Count = `items.length` from the cart doc.
2. **Line items** — ordered list, `gap-4`, one row per `carts.items[]` entry. Each row:
   - Thumbnail: `next/image`, square `size-20` (mobile `size-16`), `product.image` (Payload media sizes URL), links to `/{locale}/products/{product.slug}`.
   - Title: populated `product.title` (localized — request cart with `?locale={locale}`), `text-base font-medium truncate`, links to PDP.
   - Variant line: populated `variant.name` + `variant.sku` (`text-sm text-muted-foreground`). Skip when `variant` is null.
   - Vendor line (only `MULTIVENDOR_ENABLED=true` and `item.vendor` set): populated `tenants` display name, `text-sm text-muted-foreground` — items arrive grouped; render vendor sub-headers when > 1 distinct vendor.
   - `<QuantityStepper />` (shared, `00-design-system.md`): min 1, max = available stock from `GET /api/storefront/variant-availability` (PDP contract, `04-product-detail.md`); disabled while the PATCH is in flight.
   - Unit price: `item.unitPrice` (server-derived from `variant.price` or `product.basePrice` — the client never sends it), `<Price />` with compare-at strike when the populated product shows `comparePrice > price`.
   - Line total: `unitPrice × quantity`, `font-semibold tabular-nums`.
   - Remove: ghost icon `Button` (`Trash2`) → `AlertDialog` confirm ("Remove this item?" / cancel / destructive confirm) → `DELETE` of the item from the `items` array via `PATCH /api/carts/:id`.
3. **Coupon** — only when `DISCOUNTS_ENABLED=true`. `InputGroup` + `InputGroupAddon`: uppercase `Input` (placeholder "Coupon code") + Apply `Button`. On success: replace with an applied row — `Badge` with the code, discount amount `-৳450`, and a remove (`X`) `Button` that PATCHes `couponCode: null`. Validation is **server-side only** (`validateCouponForSubtotal` runs in the cart `beforeChange` hook); there is no separate validate endpoint — see failure states below.
4. **Order summary** — sticky `Card` (`lg:sticky top-24`): rows `Subtotal` (`cart.subtotal`), `Discount` (negative, only when `discountTotal > 0`), `Shipping` — muted placeholder row "Calculated at checkout" (the cart total explicitly excludes shipping/tax, `carts.ts:346`), `Total` (`cart.grandTotal`, `text-lg font-semibold tabular-nums`). `Button size="lg" class="w-full"` → `/{locale}/checkout`; disabled + `Spinner` + `data-icon` while the cart is being mutated. If `GUEST_CHECKOUT_ENABLED=false` and no session, the button routes to `/{locale}/auth/login?redirect=/{locale}/checkout` instead.
5. **Customer note** — `Textarea` bound to `carts.customerNote`, `maxLength={2000}`, live counter `text-xs text-muted-foreground`; saved with a debounced PATCH (server trims and strips NULs; empty string is stored as null, `carts.ts:84-87`). Copied to the order at checkout (`process-checkout.ts:569`) — label it "Message for the seller / fulfillment team".
6. **Empty cart** — `Empty` component: icon, title, description, one `Button` → `/{locale}/products`. Rendered whenever `items.length === 0` (the API keeps empty carts — `items` defaults to `[]` — but after a successful checkout the backend **deletes** the cart entirely, `process-checkout.ts:918-923`, so the client clears local state and shows this section; mini-cart resets to the empty badge).
7. **Mini-cart Sheet** — trigger lives in the header (`01-app-shell.md`, cart icon + count `Badge`). Content: compact rows (thumb `size-14`, title 1-line truncate, variant line, QuantityStepper `size="sm"`, remove icon), `Separator`, subtotal, `View cart` (outline) + `Proceed to checkout` (default). `SheetHeader` always renders `SheetTitle` ("Your cart"). Checkout button inside the Sheet routes to the cart page route when `GUEST_CHECKOUT_ENABLED=false` and unauthenticated (login wall), otherwise to checkout.

## shadcn components

`Button`, `Card` (+ `CardHeader/Title/Content/Footer`), `Badge`, `Input`, `Textarea`, `Separator`, `Sheet` (+ `SheetContent/Header/Title/Footer`), `AlertDialog` (+ `AlertDialogTitle/Cancel/Action`), `Empty` (+ `EmptyHeader/Title/Description/Content`), `Skeleton`, `Spinner`, `Alert`, `InputGroup` + `InputGroupAddon`, `Breadcrumb`; shared `<QuantityStepper />`, `<Price />`, `<PageHeader />`. Icons: `Trash2`, `ShoppingBag`, `Tag`.

## Interactions & states

- **Loading (first paint)** — full-section `Skeleton` mirrors: 2–3 item rows + summary card; mini-cart shows 2 compact skeleton rows.
- **Mutating** — the affected row dims (`opacity-60 pointer-events-none`); the trigger button gets `disabled` + `Spinner` + `data-icon="inline-start"`.
- **Coupon failures** — the server rejects the cart PATCH with HTTP 400 and the exact reason string from `packages/backend/src/plugins/discounts/lib/coupon.ts`. Map 1:1 to copy keys, render as `Alert variant="destructive"` inside the coupon section + `toast.error`; clear only on user edit:

  | Server `discountReason` | UI |
  | :--- | :--- |
  | `Coupon not found` | "That code doesn't exist" |
  | `Coupon is inactive` | "This coupon is no longer active" |
  | `Coupon has expired` | "This coupon has expired" |
  | `Minimum order value is {X}` | "Spend at least {X} to use this coupon" |
  | `Coupon usage limit reached` | "This coupon has hit its usage limit" |
  | `Coupon already used by this user` | "You've already used this coupon" |
- **Coupon success** — `toast.success` + summary re-renders from the updated `discountTotal`/`appliedCoupon` returned by the PATCH.
- **Stock conflicts** — when `INVENTORY_ENABLED` and cart-line validation is on (`INVENTORY_VALIDATE_CART_LINES`), quantity PATCHes can fail 400 with e.g. `Insufficient stock for "X" at the selected store (available: N)` or `Product "X" is not available at the selected store` (`carts.ts:243-255`). Revert the stepper to the server value, show the message as `Alert variant="destructive"` on the row.
- **Guest expiry** — guest requests with an expired/unknown `guestId` simply return a different cart or none; if `GET /api/carts/:id` 404s, generate a fresh UUID cookie and treat the cart as empty (never surface a raw 404 error).
- **Network/server error** — `Alert variant="destructive"` above the item list with a Retry `Button`; `toast.error` for transient actions.
- **Remove confirmation** — `AlertDialog` is mandatory (rule: destructive confirmations); cancelling must leave state untouched.

## Data & API

| Concern | Detail |
| :--- | :--- |
| Collection | `carts` — `packages/backend/src/plugins/ecommerce/collections/carts.ts` |
| Fields used | `items[]` (`product`, `variant`, `vendor`*, `quantity`, `unitPrice`), `subtotal`, `couponCode`, `appliedCoupon`, `discountTotal`, `grandTotal`, `customerNote`, `store`, `guestId`, `expiresAt` (*`vendor` exists only when `MULTIVENDOR_ENABLED=true`, auto-set from `product.tenant`) |
| Create cart | `POST /api/carts` — guests must send `X-Guest-Id: <uuid>` header (body `guestId` is ignored/overwritten); auth users get `user` stamped server-side |
| Read/update | `GET|PATCH /api/carts/:id?depth=2&locale={locale}` — PATCH `items` array for quantity/add/remove, `couponCode` for coupons, `customerNote` for notes; read access is owner-only (guest: matching `X-Guest-Id` + `user=null`) |
| Delete | `DELETE /api/carts/:id` — owner/guest scoped; also what the backend does to the cart after successful checkout |
| Coupon validation | Server-side in the carts hook — `packages/backend/src/plugins/discounts/lib/coupon.ts` (`validateCouponForSubtotal`); coupon model `packages/backend/src/plugins/discounts/collections/coupons.ts` (`percentage`/`fixed`, `minOrderValue`, `expiresAt`, `maxTotalUses`, `maxUsesPerUser`). The `GET /api/discounts/coupons/:id/usage` endpoint (`.../discounts/endpoints/coupon-usage.ts`) is admin-only — never called from the storefront |
| Stock hint | `GET /api/storefront/variant-availability` (`packages/backend/src/endpoints/storefront-variant-availability.ts`) for stepper ceilings |
| Money | `cart.grandTotal = subtotal − discountTotal`; shipping/tax excluded by design (`carts.ts:346`) — never render them as included in the cart total |

## Acceptance checklist

- [ ] `/en/cart` and `/bn/cart` render line items with image, localized title, variant info, unit price, editable quantity, and remove-with-confirmation; totals are `tabular-nums`.
- [ ] Quantity +/− and remove PATCH `/api/carts/:id`; subtotal/discount/total update from the server response, never from client math.
- [ ] Client never transmits `unitPrice`; tampering is impossible from the UI (server derives it — `carts.ts:126-156`).
- [ ] Coupon apply success shows code `Badge` + discount row; each server failure reason maps to its copy key and shows `Alert variant="destructive"`; removing the coupon restores `discountTotal = 0`.
- [ ] Summary shows Shipping as "calculated at checkout" (no fake shipping number in the cart).
- [ ] Customer note saves debounced, capped at 2000 chars, and survives page reloads.
- [ ] Guest with `GUEST_CHECKOUT_ENABLED=true`: cart works end-to-end with only the `X-Guest-Id` cookie/header; `GUEST_CHECKOUT_ENABLED=false`: cart icon routes to login and unauthenticated API calls aren't attempted.
- [ ] With `MULTIVENDOR_ENABLED=true`, items from different vendors render under vendor sub-headers.
- [ ] Empty cart renders the `Empty` component with a continue-shopping CTA; mini-cart `Sheet` (with `SheetTitle`) opens from the header, shares state, and its checkout CTA lands on `/[locale]/checkout` (or login when required).
- [ ] Every pending mutation disables its control and shows `Spinner`; failures show `Alert variant="destructive"` with retry; no raw HTTP errors reach the user.

## i18n keys

| key | en | bn |
| :--- | :--- | :--- |
| cart.title | Your cart | আপনার কার্ট |
| cart.itemsCount | {count} items | {count}টি আইটেম |
| cart.empty.title | Your cart is empty | আপনার কার্ট খালি |
| cart.empty.description | Browse the catalog and add products to get started. | ক্যাটালগ ব্রাউজ করুন এবং শুরু করতে পণ্য যোগ করুন। |
| cart.empty.cta | Continue shopping | কেনাকাটা চালিয়ে যান |
| cart.item.remove | Remove | সরান |
| cart.remove.title | Remove this item? | এই আইটেমটি সরাবেন? |
| cart.remove.description | It will be removed from your cart. | এটি আপনার কার্ট থেকে সরানো হবে। |
| cart.remove.confirm | Remove | সরান |
| cart.remove.cancel | Keep | রাখুন |
| cart.coupon.placeholder | Coupon code | কুপন কোড |
| cart.coupon.apply | Apply | প্রয়োগ করুন |
| cart.coupon.applied | Coupon applied | কুপন প্রয়োগ হয়েছে |
| cart.coupon.removed | Coupon removed | কুপন সরানো হয়েছে |
| cart.coupon.error.notFound | That code doesn't exist | এই কোডটি নেই |
| cart.coupon.error.inactive | This coupon is no longer active | এই কুপনটি আর সক্রিয় নয় |
| cart.coupon.error.expired | This coupon has expired | এই কুপনের মেয়াদ শেষ |
| cart.coupon.error.minOrder | Spend at least {amount} to use this coupon | এই কুপন ব্যবহারে ন্যূনতম {amount} প্রয়োজন |
| cart.coupon.error.limit | This coupon has hit its usage limit | এই কুপনের ব্যবহার সীমা শেষ |
| cart.coupon.error.perUser | You've already used this coupon | আপনি ইতিমধ্যে এই কুপন ব্যবহার করেছেন |
| cart.summary.subtotal | Subtotal | সাবটোটাল |
| cart.summary.discount | Discount | ছাড় |
| cart.summary.shippingPlaceholder | Calculated at checkout | চেকআউটে হিসাব করা হবে |
| cart.summary.total | Total | মোট |
| cart.note.label | Message for the seller (optional) | বিক্রেতার জন্য বার্তা (ঐচ্ছিক) |
| cart.checkout | Proceed to checkout | চেকআউট করুন |
| cart.viewCart | View cart | কার্ট দেখুন |
| cart.miniCart.title | Your cart | আপনার কার্ট |
| cart.error.generic | Something went wrong updating your cart. | আপনার কার্ট আপডেট করতে সমস্যা হয়েছে। |
| cart.error.stock | {message} | {message} |
| cart.loginRequired | Log in to see your cart | কার্ট দেখতে লগ ইন করুন |
