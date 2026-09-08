# 06 — Checkout Flow & Order Confirmation

Single-page checkout (contact → address → delivery → payment → review) plus the gateway return pages. Grounded in `POST /api/checkout/process` (`packages/backend/src/endpoints/checkout-process.ts` → `packages/backend/src/lib/process-checkout.ts`), the `orders`/`sub-orders`/`order-items`/`order-status-history` collections, shipping methods/zones, and the SSLCommerz redirect + IPN endpoints.

## Purpose & routes

| Route | Surface |
| :--- | :--- |
| `/en/checkout`, `/bn/checkout` | Checkout (client component tree; guard: non-empty cart) |
| `/en/checkout/success?orderNumber=…`, `/bn/…` | Payment success / order confirmation |
| `/en/checkout/failed?orderNumber=…`, `/bn/…` | Gateway-reported payment failure |
| `/en/checkout/cancel?orderNumber=…`, `/bn/…` | Gateway-reported user cancel |

- **Exact gateway return URLs** (query string, not path segments — `process-checkout.ts:780-784`): `{NEXT_PUBLIC_STOREFRONT_URL}/{locale}/checkout/{success|failed|cancel}?orderNumber={orderNumber}`. SSLCommerz appends its own params (`val_id`, `tran_id`, …) on the browser redirect — the success page consumes `val_id` for reconciliation.
- The checkout page requires a cart id (from the cart context, `05-cart.md`); empty cart redirects to `/[locale]/cart`.

## Wireframe

Desktop checkout — form column left, sticky summary right:

```
┌──────────────────────────────────────────────────────────────────┐
│ Checkout                    ① Contact ─ ② Address ─ ③ Delivery   │
│                             ─ ④ Payment ─ ⑤ Review               │
├──────────────────────────────────────┬───────────────────────────┤
│ ① CONTACT                            │ ORDER SUMMARY (sticky)    │
│ ● Guest email [ana@example.com    ]  │ 3 items                   │
│ ● Guest phone [+880 …            ]   │ ─────────────────────── │
│   Have an account? [Log in]          │ Subtotal          ৳4,500  │
│ ② SHIPPING ADDRESS                   │ Discount          −৳450   │
│ First name* [    ] Last name* [   ]  │ Shipping  arranged after  │
│ Street1* [    ]  Street2 [      ]    │            checkout       │
│ Country* [Bangladesh ▾]              │ ─────────────────────── │
│ Division ▾  District ▾  (geo mode)   │ Total (online)    ৳4,050  │
│ City* [    ] State [  ] Postal [  ]  │ [ Review & place order ]  │
│ Phone [    ]  ☐ Billing same as ship │                           │
│ ③ DELIVERY METHOD  (RadioGroup)      │                           │
│ ○ Standard Dhaka — flat ৳60          │                           │
│   ● COD eligible · ○ Inside Dhaka …  │                           │
│ ④ PAYMENT  (RadioGroup)              │                           │
│ ○ Pay online — SSLCommerz            │                           │
│   (bKash / Nagad / cards)            │                           │
│ ○ Cash on delivery                   │                           │
│                                      │                           │
│ ⑤ REVIEW  [Place order ৳4,050]       │                           │
└──────────────────────────────────────┴───────────────────────────┘
```

Mobile: single column, step rail collapses to "Step n of 5"; summary becomes an expandable `Collapsible` above the place-order button.

Success / confirmation:

```
┌──────────────────────────────────────────────┐
│ ✓ Order confirmed                            │
│ Order ORD-20260908-K3XQ   [Badge: pending]   │
│ [Badge: unpaid → confirming payment…]        │
├──────────────────────────────────────────────┤
│ ITEMS (per vendor when MULTIVENDOR)          │
│ Vendor: Acme — SUB ORD-…-K3XQ-A [pending]    │
│   [img] Title × 2           ৳3,000           │
│ Vendor: Beta — SUB ORD-…-K3XQ-B [pending]    │
│   [img] Title × 1           ৳1,500           │
├──────────────────────────────────────────────┤
│ Totals · Shipping address · Note             │
│ [Continue shopping]  [View orders]           │
└──────────────────────────────────────────────┘
```

## Sections

1. **Step rail** — numbered indicator (custom, semantic tokens; completed = primary, active = ring, todo = muted). Sections 2–6 below render in order; mobile shows one section at a time with Continue/Back. Nothing is submitted until **Place order** (step 5) except the cart PATCHes already covered in `05-cart.md`.
2. **Contact** — three variants, by flags:
   - Authenticated: read-only row with session email/phone + "Not you? Log out". If `REQUIRE_VERIFIED_FOR_CHECKOUT=true` and neither identifier verified, show `Alert variant="destructive"` with a link to verification (`07-auth.md`) — the backend rejects checkout with 403 `Account identifiers are not verified…` (`process-checkout.ts:256-270`).
   - Guest, `GUEST_CHECKOUT_ENABLED=true`: identifier fields per `AUTH_REQUIRED_IDENTIFIER` (`auth-config.ts`): `email` → guestEmail `Field` only; `phone` → guestPhone `Field` only (validated against the shipping country, E.164-friendly); `either` → both fields, "at least one required" hint, live validation so exactly one minimum is filled. Include "Have an account? Log in" `Button variant="link"` → `/[locale]/auth/login?redirect=/[locale]/checkout`.
   - Guest, `GUEST_CHECKOUT_ENABLED=false`: login wall `Card` + `Alert` + login `Button` (no form fields).
3. **Shipping address** — `FieldGroup` form bound to the checkout payload: `firstName*`, `lastName*`, `street1*`, `street2`, `city*`, `state`, `postalCode`, `country*`, `phone` (optional; national numbers validated with the selected country). Required set mirrors the server (`firstName,lastName,street1,city,country` for **both** addresses, `checkout-process.ts:76-84`).
   - **`GEOGRAPHY_ENABLED=true`**: replace state/city with cascading `Select`s fed by `GET /api/storefront/geography` — countries → subdivisions (`countryId=`) → localities (`subdivisionId=`), optionally `onlyWithPublicStoreCoverage=true`. Names arrive localized. On subdivision/locality change, fetch `resource=delivery-context` and render the returned policy: tier `standard` (no note), `extended` (`extendedFeeNote`/`extendedLeadTimeNote` as `Alert`), `unserved` (`unservedCustomerMessage` + block progression). Send the chosen ids as `serviceArea: {countryId, subdivisionId, localityId}` **and** mirror the textual `city`/`state` into the address group (address fields are required free text; geo ids are additional).
   - **`GEOGRAPHY_ENABLED=false`**: plain `Select` for `country` populated from active `shipping-zones` country codes (public read) falling back to free text, plus plain `state`/`city` inputs.
   - **Billing**: `Checkbox` "Billing address same as shipping" (default on) → expands a second identical `FieldGroup` for `billingAddress` when off.
   - Store picker: none here — `storeId` comes from `cart.store` (set on PDP/cart via store selection, `04`/`05`); the backend resolves `cart.store` → `storeId` automatically (`process-checkout.ts:309-313`).
4. **Delivery method** — `RadioGroup` of `GET /api/shipping-methods?where[isActive][equals]=true` filtered to zones whose `countries[]` contains the chosen `country` (or `countries` empty = rest of world; `GET /api/shipping-zones` is public). Radio label: method `name` + rate (`type` qualified: `flat` → amount, `per-item` → amount × item count, `weight-based` → "per kg"); disable options when `subtotal` is outside `minOrderValue`/`maxOrderValue` with a muted reason. Methods with `collectPaymentOnDelivery=true` show a `Badge` "Cash on delivery". **The backend does not add shipping to the online total** (`shippingTotal = 0`, `process-checkout.ts:474-497`) — the summary shows it as "arranged after checkout", never as an added charge.
5. **Payment** — `RadioGroup` driven by `PAYMENT_PROVIDER`:
   - `sslcommerz`: options "Pay online (SSLCommerz — bKash / Nagad / cards, hosted page)" and "Cash on delivery". COD is selectable **only** when every active delivery-method selection is COD-capable; selecting it requires `shippingMethodIds` (the endpoint enforces: `cashOnDelivery is only allowed when every selected shipping method has collect-on-delivery enabled in admin`).
   - `stripe`: the gateway path returns 501 `Stripe checkout is not implemented.` (`process-checkout.ts:199-204`) — render the online option as a **disabled variant** with `Alert` "Online card payments are temporarily unavailable"; only COD is offered (or a support notice when no COD method exists).
   - When `PAYMENT_PROVIDER=sslcommerz` but `SSLCOMMERZ_SESSION_ENABLED=false`, placing an online order fails 503 — surface the server message verbatim in the payment section.
6. **Review + Place order** — `Card` recap: contact identifier, shipping/billing addresses, chosen methods, items grouped by `item.vendor` when `MULTIVENDOR_ENABLED=true` (vendor display name as `CardTitle`, per-vendor subtotal), totals (Subtotal / Discount / Shipping-arranged note / **Total** = `cart.grandTotal`, since online total excludes shipping). `Button size="lg"` "Place order" — generates `idempotencyKey = crypto.randomUUID()` once per attempt (backend returns the existing order on retry, `process-checkout.ts:216-252`). While pending: `disabled` + `Spinner` + `data-icon="inline-start"`.
7. **Result handling after 201** (`process-checkout.ts:957-983`):
   - `paymentRedirectUrl` present (SSLCommerz hosted) → `window.location.assign(paymentRedirectUrl)`. Gateway then redirects the browser to `/{locale}/checkout/success|failed|cancel?orderNumber=…`; independently, the server receives the IPN at `POST /api/payments/sslcommerz/ipn` and marks the transaction `succeeded` + order `paid`.
   - COD (`checkoutPaymentChannel: 'cash_on_delivery'`) → client routes to `/{locale}/checkout/success?orderNumber=…` (order stays `unpaid`/`pending` by design; confirmation email/SMS fire server-side).
   - Either way the backend **deleted the cart** (`process-checkout.ts:918-923`) — the client clears cart state immediately after 201.
8. **Success page** — reads `orderNumber` from the query:
   - **Authenticated**: `GET /api/orders?where[orderNumber][equals]=…&depth=2&limit=1` (orders are readable by their owner). **Guest**: `POST /api/guest/order-lookup` with `{orderNumber, guestEmail|guestPhone}` kept in `sessionStorage` from the checkout response (`ProcessCheckoutResult.order`), with an inline lookup form fallback (`05`/`07` link).
   - **Payment reconciliation (SSLCommerz)**: if the URL carries `val_id`, call `GET /api/payments/sslcommerz/sync-paid?val_id=…&tran_id=…` (browser-callable, idempotent with IPN, `sslcommerz-sync-paid.ts`). Then render by `paymentStatus`: `paid` → success content; still `unpaid` → "Confirming payment" `Alert` + poll the order every 5s (max ~60s) because IPN can lag; if still unpaid, show the pending state with a manual Refresh — never claim failure here (the IPN may still land).
   - Content: check icon, "Order confirmed", `orderNumber` (`font-mono`), order-status `Badge` + payment-status `Badge`, payment-channel chip ("Cash on delivery" when `checkoutPaymentChannel === 'cash_on_delivery'`), item list (server snapshots: `productName`, `variantName`, `sku`, `quantity`, `unitPrice`, `totalPrice`, `productImage`), totals (incl. `discountTotal`, `couponCodeSnapshot`), `shippingAddress`, order `notes` (the customer note copied from the cart), placed date.
   - **`MULTIVENDOR_ENABLED=true`**: render one `Card` per populated `order.subOrders[]`: `tenantNameSnapshot` as title, `subOrderNumber` (`font-mono`), per-vendor status `Badge`, its `items`. Note "Vendors fulfill their segments independently" (`sub-orders.ts` description).
   - CTAs: "Continue shopping" (→ `/[locale]`), "View orders" (auth → `/[locale]/account/orders`, guest → save-orderNumber hint / lookup).
9. **Failed / cancel pages** — `Alert variant="destructive"` with `orderNumber`. The order **exists and is unpaid** (created before the gateway hop) and the cart is gone; CTAs: "Return to home", "Contact support". Do **not** offer resubmitting the same form — the idempotency key would return the existing unpaid order. Copy states plainly: payment failed / was cancelled; pay-on-delivery alternative is available by starting a new order.

## shadcn components

`Button`, `Card` (+ full composition), `Badge`, `Field` + `FieldGroup` (+ `FieldDescription` as error slot), `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup` (+ `RadioGroupItem`), `Separator`, `Collapsible` (mobile summary), `Alert`, `Skeleton`, `Spinner`, `Empty` (edge: cart emptied mid-checkout), `Breadcrumb`; shared `<Price />`, `<PageHeader />`. Icons: `CheckCircle2`, `CreditCard`, `Banknote`, `MapPin`, `Truck`.

## Interactions & states

- **Per-step validation** — client-side zod per section; invalid `Field` gets `data-invalid` + control `aria-invalid` + `FieldDescription` message. Place order stays disabled until contact + address (+ method when COD) are valid.
- **Loading** — shipping methods and geo cascades: `Select` shows a `Skeleton` row while fetching; success page: `Skeleton` confirmation card while looking the order up / reconciling.
- **Server validation errors on place order** — `Alert variant="destructive"` above the review card, mapped from `POST /api/checkout/process` responses:

  | Status | Condition (source) | UX |
  | :--- | :--- | :--- |
  | 400 | missing `cartId`/addresses/address fields; invalid `idempotencyKey`; guest identifier per `AUTH_REQUIRED_IDENTIFIER` | inline `Field` errors where mappable, `Alert` otherwise |
  | 400 | COD rules: missing/non-COD/inactive `shippingMethodIds` (`cash-on-delivery.ts`) | message on the delivery/payment section |
  | 400 | unserved area / address-store mismatch in `enforce` mode (`address-store-validation`) | `Alert` on address section |
  | 403 | cart ownership; unverified account (`REQUIRE_VERIFIED_FOR_CHECKOUT`) | link to login / verification |
  | 404 | cart not found (expired/guest rotated) | `Empty` + link back to products |
  | 409 | guest email/phone already registered → "…Please log in to continue checkout…" (`checkout-process.ts:139-144`) | `Alert` + `Button` "Log in" (pre-fill identifier) |
  | 409 | `idempotencyKey` reuse across contexts | route to the existing order's success page when ownership matches |
  | 429 | checkout rate limit (5/min/IP) | `Alert` "Too many attempts — try again in a minute" |
  | 501 | `PAYMENT_PROVIDER=stripe` online path not implemented | payment section disabled variant (also pre-empted client-side) |
  | 503 | `SSLCOMMERZ_SESSION_ENABLED=false` | server message verbatim in payment section |
  | 5xx/other | unexpected | generic `Alert` + Retry; cart untouched |
- **Non-blocking warnings** — 201 with `warnings[]`/`warningCodes[]` (warn-mode address/store mismatch) → dismissible `Alert` on the success page; order stands.
- **Toasts (`sonner`)** — `toast.success` on COD order placed; `toast.error` on failed place-order attempts (detail lives in the `Alert`).
- **Geo cascade resets** — changing country clears subdivision → locality selections and the delivery-context note; changing locality refetches delivery-context.
- **Success-page poll** — stops on `paymentStatus: 'paid'`; after the poll window the page stays "confirming" (IPN is the source of truth; sync-paid is idempotent, safe to re-run).

## Data & API

| Concern | Detail |
| :--- | :--- |
| Checkout endpoint | `POST /api/checkout/process` — `packages/backend/src/endpoints/checkout-process.ts`; orchestrator `packages/backend/src/lib/process-checkout.ts`. Body: `cartId`, `shippingAddress`, `billingAddress`, `storeId?`, `serviceArea? {countryId,subdivisionId,localityId}`, `guestEmail?`, `guestPhone?`, `idempotencyKey?` (UUID), `shippingMethodIds?`, `cashOnDelivery?`, `simulatePayment?` (admin/dev only). Response 201: `order {id, orderNumber, items[], subtotal, grandTotal, currency, guestEmail?, guestPhone?, shippingAddress, checkoutPaymentChannel, paymentStatus}`, `transaction? {id}`, `paymentRedirectUrl?`, `warnings?` |
| Order model | `orders` — `packages/backend/src/plugins/orders/collections/orders.ts`: `orderNumber` (`ORD-YYYYMMDD-XXXX`, `orders.ts:313-317`), `customer`/`guestEmail`/`guestPhone`, `buyerSnapshot {email,name,phone,locale}`, `idempotencyKey`, `status`, `items[]`, (`subOrders[]` when multivendor), `shippingAddress`/`billingAddress` groups, `subtotal/shippingTotal/taxTotal/discountTotal`, `appliedCoupon`, `couponCodeSnapshot`, `grandTotal`, `currency`, `paymentStatus`, `checkoutPaymentChannel`, `transaction`, `store`, `notes`, `deviceTracking` |
| Status enums (exact) | `orders.status` (`orders.ts:80-89`): `pending, processing, partially-shipped, shipped, delivered, completed, cancelled, refunded` · `orders.paymentStatus` (`orders.ts:145-150`): `unpaid, paid, partially-refunded, refunded` · `checkoutPaymentChannel` (`orders.ts:163-166`): `online, cash_on_delivery` · sub-order status (`sub-orders.ts:9-18`): `pending, confirmed, processing, shipped, delivered, completed, cancelled, refunded` · transaction status (`transactions.ts:53-59`): `pending, processing, succeeded, failed, cancelled` |
| Line snapshots | `order-items` — `packages/backend/src/plugins/orders/collections/order-items.ts`: `productName`, `productSlug`, `variantName`, `sku`, `quantity`, `unitPrice`, `totalPrice`, `productImage`, (`subOrder`, `tenant`, `vendorNameSnapshot` when multivendor); snapshots immutable after create |
| Sub-orders | `sub-orders` — `packages/backend/src/plugins/orders/collections/sub-orders.ts`: `subOrderNumber` (`{orderNumber}-A/B/…`, `process-checkout.ts:626`), `tenant`, `tenantNameSnapshot`, per-segment `subtotal`/`commissionAmount`/`vendorEarnings`; parent status derives from segments |
| Guest order access | `POST /api/guest/order-lookup` — `packages/backend/src/endpoints/guest-order-lookup.ts` (`{orderNumber, guestEmail|guestPhone}` → `{order}` depth 2; uniform 404; 10 req/15 min/IP) |
| Status history | `order-status-history` — `packages/backend/src/plugins/orders/collections/order-status-history.ts` (admin-read audit; not rendered to customers) |
| Shipping | `GET /api/shipping-methods`, `GET /api/shipping-zones` (public read) — `packages/backend/src/plugins/shipping/collections/shipping-methods.ts` (`type: flat|per-item|weight-based`, `rate`, `minOrderValue`, `maxOrderValue`, `collectPaymentOnDelivery`, `isActive`), `.../shipping-zones.ts` (`countries[] {code}`, empty = rest of world) |
| Payments | `transactions` — `packages/backend/src/plugins/payments/collections/transactions.ts`; SSLCommerz IPN `POST /api/payments/sslcommerz/ipn` — `packages/backend/src/endpoints/sslcommerz-ipn.ts`; browser sync `GET /api/payments/sslcommerz/sync-paid?val_id&tran_id` — `packages/backend/src/endpoints/sslcommerz-sync-paid.ts` |
| Geography | `GET /api/storefront/geography?resource=countries|subdivisions|localities|delivery-context` — `packages/backend/src/endpoints/storefront-geography.ts` (404 when `GEOGRAPHY_ENABLED≠true`); collections `packages/backend/src/plugins/geography/collections/geo-{countries,subdivisions,localities}.ts` (localized `name`) |
| Currency | Carts carry **no** currency field — checkout totals format from line products' `currency`; the placed order persists its own `currency` (`orders.ts:135`, default via `getDefaultCurrency()`) and the confirmation always formats with the order's value. `platform-settings` global is auth-gated — never fetch it anonymously | `packages/backend/src/plugins/orders/collections/orders.ts:134-138`, `globals/platform-settings.ts` |
| Coupons at checkout | Carried from the cart (`appliedCoupon`, `couponCodeSnapshot`, `discountTotal`); `totalUses` increments server-side on success (`process-checkout.ts:862-878`) |

## Acceptance checklist

- [ ] `/[locale]/checkout` guards: empty/no cart → redirect to cart; `GUEST_CHECKOUT_ENABLED=false` + anonymous → login wall, never the guest form.
- [ ] Contact step renders exactly the identifier fields `AUTH_REQUIRED_IDENTIFIER` demands and enforces "at least one" for `either`; guest identifiers already registered return the 409 alert with a working login shortcut.
- [ ] Address form requires `firstName, lastName, street1, city, country` for shipping and billing; invalid fields show `data-invalid`/`aria-invalid` and block place-order.
- [ ] With `GEOGRAPHY_ENABLED=true`, country → subdivision → locality cascade loads from `/api/storefront/geography`, sends `serviceArea` ids, shows standard/extended/unserved tier messaging, and blocks unserved areas; with it off, plain state/city inputs render and no geo calls are made.
- [ ] Delivery methods list active methods whose zone covers the shipping country with type-aware rate labels; out-of-range `minOrderValue`/`maxOrderValue` options are disabled; COD-capable methods are badged.
- [ ] Payment step: `sslcommerz` offers online + COD (COD only with all-COD methods and sends `shippingMethodIds`); `stripe` shows the online option disabled with an availability alert and never sends a gateway request.
- [ ] Place order sends a UUID `idempotencyKey`; double-click/network retry never creates duplicate orders (server dedupe); button is `disabled` + `Spinner` while pending.
- [ ] SSLCommerz: 201 → redirect to `paymentRedirectUrl`; browser returns to `/{locale}/checkout/{success|failed|cancel}?orderNumber=…` exactly as built by `process-checkout.ts:780-784`; success page calls `sync-paid` with `val_id`, shows paid content on `paymentStatus: 'paid'`, and keeps an honest "confirming payment" state (poll, then manual refresh) while the IPN is in flight — it never fabricates success or failure.
- [ ] COD path lands on the success page with `checkoutPaymentChannel: 'cash_on_delivery'`, order `unpaid`/`pending`, and a "pay on delivery" chip; cart state is cleared after 201 (backend deletes the cart).
- [ ] Confirmation shows order number, exact enum-driven `Badge`s (order status, payment status), item snapshots (`productName`, `variantName`, `sku`, qty, unit/total price, image), totals incl. discount, shipping address, and the customer note carried from the cart.
- [ ] With `MULTIVENDOR_ENABLED=true`, confirmation groups items into per-vendor cards using `subOrders` (`subOrderNumber`, `tenantNameSnapshot`, per-vendor status `Badge`); with it off, no vendor grouping renders.
- [ ] Failed/cancel pages show the order number, state plainly that the order exists unpaid, and never offer a resubmit that would silently reuse the idempotency key.
- [ ] Every step has loading (`Skeleton`), error (`Alert variant="destructive"`), and validation states; no raw error JSON reaches the user.

## i18n keys

| key | en | bn |
| :--- | :--- | :--- |
| checkout.title | Checkout | চেকআউট |
| checkout.step.contact | Contact | যোগাযোগ |
| checkout.step.address | Address | ঠিকানা |
| checkout.step.delivery | Delivery | ডেলিভারি |
| checkout.step.payment | Payment | পেমেন্ট |
| checkout.step.review | Review | পর্যালোচনা |
| checkout.contact.guestEmail | Email | ইমেইল |
| checkout.contact.guestPhone | Phone | ফোন |
| checkout.contact.eitherHint | Provide email or phone — at least one is required. | ইমেইল অথবা ফোন দিন — অন্তত একটি আবশ্যক। |
| checkout.contact.loginPrompt | Have an account? Log in | অ্যাকাউন্ট আছে? লগ ইন করুন |
| checkout.contact.loginWall | Create an account or log in to complete your order. | অর্ডার সম্পন্ন করতে অ্যাকাউন্ট তৈরি করুন বা লগ ইন করুন। |
| checkout.contact.unverified | Verify your email or phone before checking out. | চেকআউটের আগে আপনার ইমেইল বা ফোন যাচাই করুন। |
| checkout.address.shipping | Shipping address | শিপিং ঠিকানা |
| checkout.address.billing | Billing address | বিলিং ঠিকানা |
| checkout.address.sameAsShipping | Billing address same as shipping | বিলিং ঠিকানা শিপিং এর মতোই |
| checkout.address.firstName / lastName / street1 / street2 / city / state / postalCode / country / phone | First name / Last name / Address / Apartment, suite (optional) / City / State / Postal code / Country / Phone | নাম / পদবি / ঠিকানা / অ্যাপার্টমেন্ট (ঐচ্ছিক) / শহর / রাজ্য / পোস্ট কোড / দেশ / ফোন |
| checkout.address.geo.subdivision | Division / State | বিভাগ / রাজ্য |
| checkout.address.geo.locality | District / City | জেলা / শহর |
| checkout.address.unserved | We don't deliver to this area yet. | এই এলাকায় এখনো ডেলিভারি নেই। |
| checkout.delivery.title | Delivery method | ডেলিভারি পদ্ধতি |
| checkout.delivery.codBadge | Cash on delivery | ক্যাশ অন ডেলিভারি |
| checkout.delivery.outOfRange | Order value outside this method's range | অর্ডারের মান এই পদ্ধতির সীমার বাইরে |
| checkout.payment.title | Payment | পেমেন্ট |
| checkout.payment.onlineSsl | Pay online — SSLCommerz (bKash / Nagad / cards) | অনলাইনে পেমেন্ট — এসএসএলকমার্জ (বিকাশ / নগদ / কার্ড) |
| checkout.payment.cod | Cash on delivery | ক্যাশ অন ডেলিভারি |
| checkout.payment.codHint | Pay in cash when your order arrives. | অর্ডার পৌঁছালে নগদে পরিশোধ করুন। |
| checkout.payment.unavailable | Online payments are temporarily unavailable. | অনলাইন পেমেন্ট সাময়িকভাবে অনুপলব্ধ। |
| checkout.review.title | Review order | অর্ডার পর্যালোচনা |
| checkout.review.place | Place order | অর্ডার করুন |
| checkout.review.placing | Placing order… | অর্ডার হচ্ছে… |
| checkout.summary.items | {count} items | {count}টি আইটেম |
| checkout.summary.subtotal / discount / total | Subtotal / Discount / Total | সাবটোটাল / ছাড় / মোট |
| checkout.summary.shippingNote | Arranged after checkout — not charged online. | চেকআউটের পরে ব্যবস্থা করা হবে — অনলাইনে চার্জ হয় না। |
| checkout.error.generic | Checkout failed. Please try again. | চেকআউট ব্যর্থ হয়েছে। আবার চেষ্টা করুন। |
| checkout.error.exists | This email or phone is already registered. Please log in. | এই ইমেইল বা ফোন ইতিমধ্যে নিবন্ধিত। লগ ইন করুন। |
| checkout.error.rateLimited | Too many attempts. Try again in a minute. | অনেক বেশি চেষ্টা। এক মিনিট পরে চেষ্টা করুন। |
| checkout.success.title | Order confirmed | অর্ডার নিশ্চিত হয়েছে |
| checkout.success.confirming | Confirming payment… | পেমেন্ট নিশ্চিত হচ্ছে… |
| checkout.success.confirmingHint | This can take a few moments. | এতে কিছুক্ষণ সময় লাগতে পারে। |
| checkout.success.refresh | I've paid — refresh | আমি পেমেন্ট করেছি — রিফ্রেশ |
| checkout.success.channel.online | Paid online | অনলাইনে পরিশোধিত |
| checkout.success.channel.cod | Pay on delivery | ডেলিভারিতে পরিশোধ |
| checkout.success.viewOrders | View orders | অর্ডার দেখুন |
| checkout.success.continue | Continue shopping | কেনাকাটা চালিয়ে যান |
| checkout.success.vendorNote | Each vendor fulfills their part of your order. | প্রতিটি বিক্রেতা তাদের অংশ পূরণ করে। |
| checkout.failed.title | Payment failed | পেমেন্ট ব্যর্থ হয়েছে |
| checkout.cancel.title | Payment cancelled | পেমেন্ট বাতিল হয়েছে |
| checkout.failed.body | Your order {orderNumber} exists and is unpaid. Start a new order to try again, or contact support. | আপনার অর্ডার {orderNumber} রয়েছে এবং অপরিশোধিত। আবার চেষ্টা করতে নতুন অর্ডার করুন বা সাপোর্টে যোগাযোগ করুন। |
| checkout.error.contactSupport | Contact support | সাপোর্টে যোগাযোগ করুন |
