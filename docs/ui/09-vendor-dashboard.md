# 09 — Vendor Application & Vendor Panel

Vendor onboarding (application wizard + status tracking) and the full vendor panel (dashboard, products, sub-order fulfillment, inventory, payouts, settings).

**Flag scope:** this entire surface exists only when `MULTIVENDOR_ENABLED=true` (`packages/backend/src/payload.config.ts:216`). When false, `multivendorPlugin` registers no collections and adds no tenant fields (`packages/backend/src/plugins/multivendor/index.ts:38-39`): `/[locale]/vendor/*` returns 404 for public routes and redirects to `/{locale}` for authenticated users; the store link to `/store/[slug]` is never rendered. `INVENTORY_ENABLED=false` hides the Inventory nav item and the dashboard low-stock card. Payouts plugin is also gated by `MULTIVENDOR_ENABLED` (`packages/backend/src/payload.config.ts:268-273`).

## Purpose & routes

| Route | Purpose |
| :--- | :--- |
| `/[locale]/vendor/apply` | Multi-step vendor application wizard (any logged-in user) |
| `/[locale]/vendor/application` | Application status tracking (pending / under-review / approved / rejected) |
| `/[locale]/vendor` | Panel dashboard (KPIs, chart, low stock, recent orders) |
| `/[locale]/vendor/products` · `/new` · `/[id]` | Product list, create, edit |
| `/[locale]/vendor/orders` · `/[id]` | Sub-order list, fulfillment detail |
| `/[locale]/vendor/inventory` | Stock locations + stock levels + adjustments |
| `/[locale]/vendor/payouts` | Balance, ledger, schedule/hold explainer |
| `/[locale]/vendor/settings` | Vendor profile + vendor settings |

Guards: panel routes require session user with `role='vendor'` and `tenant` set (set on approval, `vendor-applications.ts:178-187`); others redirect to `/[locale]/vendor/apply` (logged in) or `/[locale]/auth/login`. `status='suspended'` users and `vendor-settings.isActive=false` vendors see a read-only panel with a destructive `Alert` banner showing `suspensionReason` (`vendor-settings.ts:91-97`, `collections/users/index.ts:106-119`).

## Wireframe

Application wizard (`/vendor/apply`):

```
┌──────────────────────────────────────────────────────────┐
│  logo                          [en|bn]        dark toggle │
├──────────────────────────────────────────────────────────┤
│  Become a seller                                          │
│  ●───●───○   Business → Documents (KYC) → Review          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Business name*      [________________________]       │ │
│ │ Business type       ( Individual | Company | Partner )│ │
│ │ Tax ID              [________________________]       │ │
│ │                                                      │ │
│ │ KYC documents*      [ Upload ] [ Upload ] [ Upload ] │ │
│ │                     doc-nid.pdf            [x]       │ │
│ │                                                      │ │
│ │                              [Back]  [Continue]      │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Panel desktop — `Sidebar` + content:

```
┌──────────┬───────────────────────────────────────────────┐
│ ▣ Store  │ Breadcrumb  Dashboard            [Store ▾][en]│
│          │ ┌─────────┬─────────┬─────────┬─────────┐     │
│ Dashboard│ │Revenue  │ Orders  │Customers│  AOV    │     │
│ Products │ │$12,400  │  318    │  205    │ $39.00  │     │
│ Orders   │ │ ▲ 8.2%  │ ▲ 4.1%  │ ▲ 1.0%  │ ▼ 0.4%  │     │
│ Inventory│ └─────────┴─────────┴─────────┴─────────┘     │
│ Payouts  │ [Today|24h|7d|30d|MTD|YTD|All]  Range picker  │
│ Settings │ ┌───────────────────────┬───────────────────┐ │
│          │ │ Revenue & orders      │ Fulfillment       │ │
│ ──────── │ │  ~ Chart (line/bar) ~ │ pending       12  │ │
│ ⌂ Store  │ │                       │ processing    30  │ │
│          │ └───────────────────────┤ shipped       44  │ │
│          │ ┌───────────────────────┤ delivered     90  │ │
│          │ │ Low stock (3)    View │ completed    140  │ │
│          │ │ "SKU-1" 2 left ⚠      │───────────────────│ │
│          │ └───────────────────────┘ │ Recent orders     │ │
│          │                           │ SUB-…-A  shipped  │ │
└──────────┴───────────────────────────┴───────────────────┘
```

Mobile: top bar with hamburger (`Sheet` nav, left) + store name + locale; KPI cards stack 1-col; chart full width; sections in order KPIs → chart → pipeline → low stock → recent orders.

## Sections

1. **Gating & guards.** Server components read session; non-vendor redirect per Purpose & routes. When flag off: apply/status/panel all 404 (`not-found.tsx`), and header/footer never link `/vendor/*` or `/store/*`. All data fetching relies on Payload access filters — the UI never passes `tenant` manually; every query is server-scoped to the vendor's own rows (`packages/backend/src/access/is-admin-or-vendor-owner.ts:15-22`).

2. **Application wizard** (`vendor-applications` fields, `packages/backend/src/plugins/multivendor/collections/vendor-applications.ts:36-92`). `Stepper`-style 3 steps, state in client component, single `POST /api/vendor-applications` on submit.
   - Step 1 Business: `businessName` (Input, required — the only required field), `businessType` (`ToggleGroup` single: individual/company/partnership), `taxId` (Input, optional).
   - Step 2 KYC documents: `documents` array — repeatable rows each an upload to `POST /api/media` (multipart); vendors' media get `tenant` auto-assigned (`plugins/multivendor/index.ts:94-104`). Rows show filename + size + remove. When `platform-settings.vendorDefaults.requireKYC` is true, require ≥1 document client-side (backend does NOT enforce this) and label the step required.
   - Step 3 Review: read-only summary + submit. `applicant` and `submittedAt` are set server-side by hook (`vendor-applications.ts:94-107`) — never rendered as inputs.
   - Submit success → redirect `/[locale]/vendor/application`; `toast.success`. When `VENDOR_AUTO_APPROVE=true` the application is created `approved` and the tenant/profile/settings are provisioned synchronously (`vendor-applications.ts:102-104`, `109-196`) — show success state linking straight to the dashboard.

3. **Application status page.** `GET /api/vendor-applications?where=applicant equals {me}` — access filter returns only the user's own rows (`vendor-applications.ts:19-24`). Renders latest application: status `Badge` (pending → secondary, under-review → default, approved → default w/ check, rejected → destructive), timeline `Card` with `submittedAt`/`reviewedAt`, reviewer line "Reviewed by {reviewedBy} · {reviewNotes}" when present (read-only display; the applicant's read access returns the full doc), and:
   - `rejected`: `Alert variant="destructive"` with `rejectionReason`; CTA "Apply again" (new application; no resubmit endpoint).
   - `pending`: "Edit application" back to wizard pre-filled — update access allows editing own rows only while `status=pending` (`vendor-applications.ts:25-33`). There is no withdraw status; omit any withdraw action.
   - `approved`: success panel — store name/slug (`tenants` created from `businessName`, `vendor-applications.ts:131-152`), CTA "Go to dashboard".

4. **Panel chrome.** `SidebarProvider` + `Sidebar` (collapsible icon mode), `SidebarHeader` = store avatar + `displayName` (`vendor-profiles`), items: Dashboard (LayoutDashboard), Products (Package), Orders (ShoppingBag), Inventory (Boxes; hidden when `INVENTORY_ENABLED=false`), Payouts (Wallet), Settings (Settings); `SidebarFooter` link "View storefront" → `/[locale]/store/[slug]` and `Dialog`-triggered sign-out. Active item = `data-active=true` primary background. Mobile: `Sheet` via `SidebarTrigger`. Content on `SidebarInset`, `PageHeader` (`Breadcrumb` + `h1`) per page.

5. **Dashboard.** `GET /api/dashboard-stats?timeRange=7d[&storeId][&startDate&endDate]` (`packages/backend/src/endpoints/dashboard-stats.ts:52-56`; vendor role allowed, tenant-scoped). Response is the `role:'vendor'` variant of `AdminDashboardStats` (`packages/backend/src/lib/admin-dashboard-stats.ts:171-203`). Sections in order:
   - **KPI cards** (`Card` grid 4-col → 2-col → 1-col): `kpis.revenue`, `kpis.orders`, `kpis.customers`, `kpis.aov` — each value + delta `Badge` from `changePercentage` (hide when `null`; `admin-dashboard-stats.ts:24-28`).
   - **Range controls:** `ToggleGroup` timeRange (`today|24h|7d|30d|mtd|ytd|all` — exactly the supported set, `admin-dashboard-stats.ts:205-207`); `custom` reveals two date Inputs (startDate/endDate); store filter `Select` fed by `stores[]` (vendor's own `stock-locations` with `isPublicStore`).
   - **Chart:** `ChartContainer` line/area of `salesChart[]` (`date`, `revenue`, `orders`; two series). Skeleton mirror while fetching.
   - **Fulfillment pipeline:** `orderStatusBreakdown` rendered as `Badge` count rows (pending→refunded) linking to filtered `/vendor/orders?status=…`; `subOrdersTotal`/`subOrdersOpen` as summary caption. Cards for products/stock totals gated by `vendorUi.showSubOrders`/`showStockLevels`.
   - **Low stock** (`Card`): `lowStockProducts[]` — product, variant, location, `quantity`, status `Badge` (`low_stock` warning-colored via secondary, `out_of_stock` destructive), link to Inventory.
   - **Recent orders** (`Table`): `recentOrders[]` — `subOrderNumber`-style order ref, customer name, items count, grandTotal (formatted with panel currency), status `Badge`; row link to order detail. **Bestsellers** (`Table`): `bestsellingProducts[]` name/SKU/unitsSold/revenue.
   - Note: customers KPI and `newCustomers`/`reviews`/`coupons` cards from the admin view are platform-wide aggregates — render only `kpis`, chart, pipeline, low stock, recent orders, bestsellers vendor-side.

6. **Products.** List: `InputGroup` search (debounced `where[name][like]`) + status filter `Select` (draft/pending-review/published/archived) + `Table` (thumb, name, status `Badge`, basePrice+currency, SKU, updatedAt) + `Pagination`; row `DropdownMenu` (Edit, View on storefront when published, Delete w/ `AlertDialog`). Create limit: when `vendor-settings.maxProducts > 0` and count reached, disable "New product" + `Alert`. Empty → `Empty` with CTA.
   Create/edit form (`POST/PATCH /api/products`, tenant auto-assigned server-side, `plugins/ecommerce/collections/products.ts:98-105`; vendor create/update/delete allowed on own rows, `:697-707`). `Tabs`:
   - **Basics:** `name`* (Input, localized en/bn tabs), `slug` (auto from name, editable), `shortDescription` (Textarea, localized), `description` (rich text editor, localized), `images` array (media uploads, first = primary, drag-sort), `sku` (optional; autofilled from slug/name on publish unless `SKU_AUTOFILL=never` — `products.ts:107-152`).
   - **Pricing:** `basePrice`* (number ≥0), `compareAtPrice` (≥0; must be > basePrice for strike display), `saleDisplayMode` (`Select`: none/strike_through/badge_percent/badge_amount/strike_and_badge), `costPrice`, `currency` (`Select`, defaults from currency global), `taxable` (`Checkbox`), `weight`, `dimensions` group (length/width/height).
   - **Organization:** `categories` (multi `Select`/command), `brand` (Select), `productClass` (Select; when set, `specifications` rows render from the class template — key/label/value/unit), `tags` (array of Inputs), `productType` (`ToggleGroup`: standard/bundle).
   - **Bundle builder** (visible when `productType=bundle`): `bundleItems` rows (product `Select` limited to the vendor's own products + optional variant + qty ≥1); published bundles require ≥1 item, same-tenant items only, no nested bundles (`products.ts:154-252`).
   - **Status bar (top):** current status `Badge` + actions — Save draft (`status=draft`), Publish (`status=published`), Archive. When `PRODUCT_REQUIRES_APPROVAL=true` (env, `payload.config.ts:219`) or `vendor-settings.autoPublishProducts=false`, the Publish button submits `status='pending-review'` and shows "Awaiting review" instead (the `pending-review` status exists for this flow, `products.ts:507-517`; no server hook switches it automatically — gating is UI-side per flag). SEO tab: `meta.title/description/image`.

7. **Orders (sub-orders).** List: `GET /api/sub-orders` — vendor reads own rows via tenant filter (`plugins/orders/collections/sub-orders.ts:170-174`). `Table`: `subOrderNumber`, `parentOrderNumber`, items count, `subtotal`, `commissionAmount`, `vendorEarnings` (tabular-nums), status `Badge`, placed date. Filters: status `Select` (mirror of dashboard pipeline), search by number (`InputGroup`). Empty → `Empty`.
   Detail (`GET /api/sub-orders/{id}` + `GET /api/order-items?where=subOrder equals {id}`): snapshot item table (productName, variantName, sku, qty, unitPrice, totalPrice, productImage) — read-only, snapshots immutable (`order-items.ts:171-199`); vendors may change only `stockLevel` (fulfillment warehouse `Select` of own locations; PATCH moves the reservation, `order-items.ts:202-227`). Money summary Card: subtotal, shippingTotal, commissionAmount (`commissionRate` caption), **vendorEarnings = subtotal − commissionAmount** (`lib/process-checkout.ts:620-640`).
   **Fulfillment — only legal transitions offered** (`packages/backend/src/lib/order-status-transitions.ts:13-22`, enforced server-side by `validateSubOrderStatusTransition`, `sub-orders.ts:43-47`):

   | Current | Allowed next (exact) |
   | :--- | :--- |
   | `pending` | `confirmed`, `processing`, `cancelled` |
   | `confirmed` | `processing`, `cancelled` |
   | `processing` | `shipped`, `cancelled` |
   | `shipped` | `delivered` |
   | `delivered` | `completed` |
   | `completed` / `cancelled` / `refunded` | none (terminal) |

   UI renders one action button per allowed target: Confirm, Start processing, Ship, Mark delivered, Complete; Cancel order (`AlertDialog` confirm) only in the three cancelable states. `refunded` is admin-only — never rendered. Side effects shown as hint text: cancel releases reserved stock, ship consumes stock (`sub-orders.ts:63-95`). Ship form (required before status `shipped`): `shippingMethod` (Input), `trackingNumber`, `trackingUrl`; sets `shippedAt=now`, `fulfilledBy={me}`. Delivered sets `deliveredAt=now`. `store` (fulfilling location) editable via `Select` of own locations. Parent-order status is derived server-side from all sub-orders — display only, never editable.

8. **Inventory** (`INVENTORY_ENABLED=true`; `packages/backend/src/plugins/inventory/index.ts:13-26`). Two tabs.
   - **Locations** (`stock-locations`, vendor may create/update/delete own tenant's rows, `access/is-admin-or-vendor-stock-tenant.ts:46-64`): `Table`/cards (name, code, isPublicStore `Badge`, isActive). "Add location" `Dialog` (Title "Add location"): `name`*, `code`* (unique), `address` group (street/city/state/country/postalCode), `isActive`, `isPublicStore` (`Switch`); when on, reveal `storeDetails` group (description rich text, logo/banner uploads, contactEmail, contactPhone, operatingHours, coverageArea rows) and optional `slug`/`sortPriority` (`stock-locations.ts:22-83`). `tenant` is force-set server-side (`:112-123`) — not an input.
   - **Stock levels** (`stock-levels`): vendor reads rows whose `location.tenant` is own (`is-admin-or-vendor-stock-tenant.ts:67-78`); creates rows for own location+product (`:85-131`); **update/delete allowed on own rows** (`stock-levels.ts:60-65` — same tenant filter). `Table`: product, variant, location, `quantity`, `reservedQuantity` (read-only — moves only via orders), auto `title` hidden. "Adjust stock" `Dialog`: product (Select of own products), variant (optional), location (Select of own locations), `quantity` (number ≥0; full set, not delta — PATCH). Cross-vendor guard: product tenant must match location tenant or the request 400s (`stock-levels.ts:96-143`) — mirror the error inline. Search + low-stock filter: rows with `quantity <= platform-settings.inventory.lowStockThreshold` (default 10) get a `Badge` "Low" (`destructive` at 0); banner `Alert` when any out-of-stock row exists. Deep link "Low stock report" opens `/api/reports?category=inventory&reportType=low-stock-alert` JSON/CSV.

9. **Payouts.** Read-only ledger — **vendors cannot create or request payouts** (`payouts.create=isAdmin`, `update=isAdmin`, `plugins/payouts/collections/payouts.ts:16-28`); admin disburses per period.
   - **Balance cards:** `Paid out` = Σ `netAmount` of payouts with `status='completed'`; `In transit` = Σ `netAmount` of `pending|processing|on-hold`; `Unsettled earnings (est.)` = Σ `vendorEarnings` of delivered/completed sub-orders (estimate until the admin attaches them to a payout; note this in `FieldDescription`).
   - **Schedule explainer** (`Accordion`): `payoutSchedule` (weekly|biweekly|monthly, default biweekly) and `payoutHoldDays` (default 7) from `GET /api/globals/platform-settings` → `vendorDefaults` (`globals/platform-settings.ts:156-219`). Copy states earnings are held N days after delivery, then disbursed per schedule. Also render `payout-items.status` semantics: included / held / disputed.
   - **Payout `Table`:** `GET /api/payouts` (tenant-scoped, `payouts.ts:18-26`) — periodStart→periodEnd, totalEarnings, totalCommission, netAmount (emphasized), status `Badge` (pending/processing/completed/failed/on-hold → destructive), method, processedAt. Expandable row (or `Drawer`, Title "Payout {id}") lists line items: `GET /api/payout-items` is tenant-filtered via `isAdminOrVendorOwner`, but payout-items defines **no `tenant` field** (`payout-items.ts:21-47`), so expect empty results — render items from `payout.items` ids if the payout doc populates them, else fall back to linking sub-orders in the period; never block the table on it.
   - No request/payout-initiation UI of any kind.

10. **Settings.** Two cards.
    - **Store profile** (`vendor-profiles`; create is admin-only but approval provisioned the row — vendor `update` allowed on own, `vendor-profiles.ts:17-28`): `displayName`* (localized), `description` (rich text, localized), `logo`/`banner` uploads, `contactEmail` (email Input), `contactPhone`, `website`, `socialLinks` rows (platform, url), `address` group (street/city/state/country/zip), SEO `meta` group. Read-only stats row: `rating`, `totalSales`, `joinedAt` (readOnly fields, `:77-89`). Public page note: profile renders at `/store/[slug]`.
    - **Vendor settings** (`vendor-settings`; vendor read+update own row, `vendor-settings.ts:17-22`): **Payout method** (`ToggleGroup` single: stripe / bank-transfer / manual); when `stripe` → `stripeConnectAccountId` Input; when `bank-transfer` → `bankDetails` group (bankName, accountNumber, routingNumber, iban). **Shipping model** (`ToggleGroup`: platform/vendor/hybrid). **Read-only commission card:** `commissionType` + `commissionRate` from vendor-settings; caption explains precedence — vendor-settings overrides platform default `defaultCommissionRate` at checkout, `commission = round(subtotal × rate%)`, snapshotted per sub-order (`lib/commission.ts:11-41`, `process-checkout.ts:620-640`); when `commissionType=tiered` or a category-based rule applies, list matching `commission-rules` rows (any authenticated user may read, `commission-rules.ts:18`) with `tiers` (minAmount/maxAmount/rate) or `categories`+`categoryRate`. **Policy (read-only):** `autoPublishProducts`, `maxProducts`, `isActive`, `suspensionReason` — platform policy fields shown as description text only; commission fields are display-only in the UI even though the API would accept writes.

## shadcn components

```bash
npx shadcn@latest add sidebar card badge table tabs chart button input textarea select \
  checkbox switch separator skeleton spinner alert alert-dialog dialog sheet drawer \
  dropdown-menu popover tooltip avatar breadcrumb pagination scroll-area sonner \
  toggle-group field input-group empty accordion command form stepper
```

Usage notes: `Sidebar` chrome (`SidebarProvider/Inset/Trigger`); `Chart` for revenue/orders; `ToggleGroup` for businessType (3), payoutMethod (3), shippingModel (3), timeRange (7); `InputGroup`+`InputGroupAddon` for list search inputs; every `Dialog`/`Sheet`/`Drawer` includes `DialogTitle`/`SheetTitle`; forms via `Field`/`FieldGroup` with `data-invalid`/`aria-invalid`; pending submits `disabled` + `Spinner` + `data-icon="inline-start"`.

## Interactions & states

- **Loading:** every page renders `Skeleton` mirrors (KPI grid, chart block, table rows) during fetch; chart uses `ChartContainer` skeleton; no spinners for page loads.
- **Empty:** no application → wizard; no products/orders/locations/levels/payouts → `Empty` with one CTA each.
- **Error:** fetch failure → `Alert variant="destructive"` + Retry; 403/404 responses from tenant-scoped REST render the same empty/error states, never raw status text.
- **Toasts (sonner):** application submitted, profile/settings saved, product saved/published, stock adjusted, sub-order transition applied (`toast.success`); transition rejected (e.g. illegal status) surfaces server message via `toast.error` + inline `Alert`.
- **Confirmations:** `AlertDialog` for product delete, location delete, and sub-order `cancelled` transition.
- **Money/numbers:** tabular-nums everywhere; currency from `/api/globals/platform-settings` `currency` group; use reports `formattedValue` when present. Dates via `Intl.DateTimeFormat(locale)`.
- **Optimistic-free policy:** all mutations refetch or `router.refresh()` after success; badges/totals never update optimistically.

## Data & API

| Concern | Call | Source of truth |
| :--- | :--- | :--- |
| Feature flag / plugins | env `MULTIVENDOR_ENABLED`, `VENDOR_AUTO_APPROVE`, `PRODUCT_REQUIRES_APPROVAL` | `packages/backend/src/payload.config.ts:214-301` |
| Application CRUD | `/api/vendor-applications` (POST own, GET own, PATCH own pending) | `packages/backend/src/plugins/multivendor/collections/vendor-applications.ts` |
| Approval provisioning | tenant + profile + settings + role flip | `vendor-applications.ts:109-196` |
| Vendor identity | `users.role='vendor'`, `users.tenant`, `status` | `packages/backend/src/collections/users/index.ts:91-119` |
| Tenant isolation | `isAdminOrVendorOwner` Where `{tenant equals}` | `packages/backend/src/access/is-admin-or-vendor-owner.ts` |
| Store profile | `/api/vendor-profiles/{id}` (PATCH own) | `packages/backend/src/plugins/multivendor/collections/vendor-profiles.ts` |
| Vendor settings | `/api/vendor-settings/{id}` (PATCH own) | `packages/backend/src/plugins/multivendor/collections/vendor-settings.ts` |
| Dashboard metrics | `GET /api/dashboard-stats` (vendor-scoped) | `packages/backend/src/endpoints/dashboard-stats.ts`; shapes `packages/backend/src/lib/admin-dashboard-stats.ts:5-211` |
| Reports (JSON/CSV) | `GET /api/reports?category&reportType&period&format` | `packages/backend/src/endpoints/admin-reports.ts`; `packages/backend/src/plugins/reports/index.ts`; types `packages/backend/src/lib/admin-reports.ts:29-94` |
| Products (own rows) | `/api/products` CRUD + facets | `packages/backend/src/plugins/ecommerce/collections/products.ts:481-721` |
| Sub-orders + transitions | `/api/sub-orders` GET/PATCH | `packages/backend/src/plugins/orders/collections/sub-orders.ts`; transitions `packages/backend/src/lib/order-status-transitions.ts:13-22` |
| Order items (snapshots, stockLevel) | `/api/order-items` GET/PATCH | `packages/backend/src/plugins/orders/collections/order-items.ts:152-248` |
| Locations / stock levels | `/api/stock-locations`, `/api/stock-levels` | `packages/backend/src/plugins/inventory/collections/stock-locations.ts`, `stock-levels.ts`; access `packages/backend/src/access/is-admin-or-vendor-stock-tenant.ts` |
| Payouts / payout items | `/api/payouts`, `/api/payout-items` (read-only) | `packages/backend/src/plugins/payouts/collections/payouts.ts`, `payout-items.ts` |
| Commission engine | vendor-settings override → env default → 0 | `packages/backend/src/lib/commission.ts`; strategies `packages/backend/src/plugins/commissions/strategies/index.ts`; rules `packages/backend/src/plugins/commissions/collections/commission-rules.ts` |
| Checkout snapshot | commissionRate/vendorEarnings on sub-order | `packages/backend/src/lib/process-checkout.ts:619-643` |
| Platform knobs | `vendorDefaults.{payoutSchedule,payoutHoldDays,requireKYC,requireProductApproval,defaultCommissionRate,defaultCommissionType}`, `inventory.lowStockThreshold`, `currency` | `packages/backend/src/globals/platform-settings.ts:111-236` |
| KYC/product media | `/api/media` POST (tenant auto-assigned) | `packages/backend/src/plugins/multivendor/index.ts:56-108` |

## Acceptance checklist

- [ ] With `MULTIVENDOR_ENABLED=false`: `/en/vendor/*` 404s (or redirects home) and no vendor links render anywhere.
- [ ] Logged-in customer can submit the 3-step application; `businessName` empty blocks submit; KYC step enforces ≥1 file only when `vendorDefaults.requireKYC=true`.
- [ ] `applicant`/`submittedAt` are never editable inputs; `GET` returns only the user's own applications.
- [ ] Status page shows correct `Badge` per status; `rejected` renders `rejectionReason`; `pending` allows edit; `approved` links to dashboard; no withdraw action exists.
- [ ] With `VENDOR_AUTO_APPROVE=true`, submitting the wizard lands the user on an approved state and the dashboard with tenant provisioned.
- [ ] Panel renders `Sidebar` with exactly Dashboard/Products/Orders/Inventory/Payouts/Settings (+ storefront link); Inventory hidden when `INVENTORY_ENABLED=false`; suspended vendor sees read-only banner with `suspensionReason`.
- [ ] Dashboard KPIs match `/api/dashboard-stats` `kpis` values incl. hidden delta when `changePercentage=null`; chart plots `salesChart` revenue+orders; timeRange offers exactly today/24h/7d/30d/mtd/ytd/all (+custom dates).
- [ ] Low-stock card shows `lowStockProducts` with correct low/out badges; pipeline counts equal `orderStatusBreakdown`.
- [ ] Product create with `maxProducts` reached is blocked; publish submits `pending-review` when approval required, `published` otherwise; bundle publish without items or with cross-tenant items surfaces the server error.
- [ ] Product list/detail only ever shows the vendor's own rows (server-scoped; spot-check that a second vendor's product id URL 403s/404s).
- [ ] Sub-order detail offers exactly the legal transition buttons for the current status (table above); `refunded` never offered; cancel shows `AlertDialog`; illegal PATCH via API is rejected and the UI surfaces "Allowed next: …".
- [ ] Ship requires shippingMethod/tracking; after ship the stock is consumed; after cancel it is released; item snapshots are read-only and only `stockLevel` is editable.
- [ ] Stock level create with a foreign product/location fails with the cross-vendor message; quantity adjust PATCHes `quantity` and leaves `reservedQuantity` untouched.
- [ ] Payouts page shows paid/pending/unsettled cards computed exactly as specified, schedule/hold copy matches `vendorDefaults`, and contains no payout-request control.
- [ ] Settings saves profile (localized displayName/description persist per locale) and payout method/bank fields; commission card is read-only and cites rate/type (incl. tiered/category rules when applicable).
- [ ] All strings render from dictionaries in en and bn; no raw colors; no `space-y-*`; every overlay has a Title; loading/empty/error states follow this spec.

## i18n keys

| key | en | bn |
| :--- | :--- | :--- |
| vendor.apply.title | Become a seller | বিক্রেতা হোন |
| vendor.apply.step.business | Business | ব্যবসা |
| vendor.apply.step.documents | Documents (KYC) | ডকুমেন্ট (কেওয়াইসি) |
| vendor.apply.step.review | Review | পর্যালোচনা |
| vendor.apply.businessName | Business name | ব্যবসার নাম |
| vendor.apply.businessType | Business type | ব্যবসার ধরন |
| vendor.apply.businessType.individual | Individual | একলগ্নী |
| vendor.apply.businessType.company | Company | কোম্পানি |
| vendor.apply.businessType.partnership | Partnership | অংশীদারিত্ব |
| vendor.apply.taxId | Tax ID | ট্যাক্স আইডি |
| vendor.apply.documents | KYC documents | কেওয়াইসি ডকুমেন্ট |
| vendor.apply.documents.required | At least one document is required | অন্তত একটি ডকুমেন্ট প্রয়োজন |
| vendor.apply.submit | Submit application | আবেদন জমা দিন |
| vendor.apply.submitted | Application submitted | আবেদন জমা হয়েছে |
| vendor.status.title | Application status | আবেদনের অবস্থা |
| vendor.status.pending | Pending review | পর্যালোচনার অপেক্ষায় |
| vendor.status.under-review | Under review | পর্যালোচনাধীন |
| vendor.status.approved | Approved | অনুমোদিত |
| vendor.status.rejected | Rejected | প্রত্যাখ্যাত |
| vendor.status.rejectionReason | Rejection reason | প্রত্যাখ্যানের কারণ |
| vendor.status.applyAgain | Apply again | আবার আবেদন করুন |
| vendor.status.goToDashboard | Go to dashboard | ড্যাশবোর্ডে যান |
| vendor.nav.dashboard | Dashboard | ড্যাশবোর্ড |
| vendor.nav.products | Products | পণ্য |
| vendor.nav.orders | Orders | অর্ডার |
| vendor.nav.inventory | Inventory | ইনভেন্টরি |
| vendor.nav.payouts | Payouts | পেআউট |
| vendor.nav.settings | Settings | সেটিংস |
| vendor.nav.viewStore | View storefront | স্টোরফ্রন্ট দেখুন |
| vendor.kpi.revenue | Revenue | আয় |
| vendor.kpi.orders | Orders | অর্ডার |
| vendor.kpi.customers | Customers | ক্রেতা |
| vendor.kpi.aov | Avg. order value | গড় অর্ডার মূল্য |
| vendor.dashboard.pipeline | Fulfillment pipeline | ফুলফিলমেন্ট অবস্থা |
| vendor.dashboard.lowStock | Low stock | স্টক কম |
| vendor.dashboard.recentOrders | Recent orders | সাম্প্রতিক অর্ডার |
| vendor.dashboard.bestsellers | Bestsellers | সর্বাধিক বিক্রিত |
| vendor.dashboard.range.custom | Custom | কাস্টম |
| vendor.products.new | New product | নতুন পণ্য |
| vendor.products.status.draft | Draft | খসড়া |
| vendor.products.status.pending-review | Awaiting review | পর্যালোচনার অপেক্ষায় |
| vendor.products.status.published | Published | প্রকাশিত |
| vendor.products.status.archived | Archived | আর্কাইভড |
| vendor.products.publish | Publish | প্রকাশ করুন |
| vendor.products.limit | Product limit reached ({max}) | পণ্যের সীমা পূর্ণ ({max}) |
| vendor.products.bundle | Bundle | বান্ডেল |
| vendor.orders.fulfill | Fulfillment | ফুলফিলমেন্ট |
| vendor.orders.confirm | Confirm | নিশ্চিত করুন |
| vendor.orders.processing | Start processing | প্রক্রিয়াকরণ শুরু |
| vendor.orders.ship | Ship | পাঠান |
| vendor.orders.delivered | Mark delivered | ডেলিভার্ড করুন |
| vendor.orders.complete | Complete | সম্পন্ন |
| vendor.orders.cancel | Cancel order | অর্ডার বাতিল |
| vendor.orders.trackingNumber | Tracking number | ট্র্যাকিং নম্বর |
| vendor.orders.trackingUrl | Tracking link | ট্র্যাকিং লিংক |
| vendor.orders.shippingMethod | Shipping method | শিপিং পদ্ধতি |
| vendor.orders.earnings | Your earnings | আপনার আয় |
| vendor.orders.commission | Platform commission | প্ল্যাটফর্ম কমিশন |
| vendor.orders.fulfillingStore | Fulfilling location | ফুলফিলমেন্ট স্থান |
| vendor.inventory.locations | Locations | লোকেশন |
| vendor.inventory.stockLevels | Stock levels | স্টক লেভেল |
| vendor.inventory.adjust | Adjust stock | স্টক সমন্বয় |
| vendor.inventory.quantity | Quantity | পরিমাণ |
| vendor.inventory.reserved | Reserved | সংরক্ষিত |
| vendor.inventory.low | Low | কম |
| vendor.inventory.outOfStock | Out of stock | স্টক শেষ |
| vendor.payouts.paidOut | Paid out | পরিশোধিত |
| vendor.payouts.inTransit | In transit | প্রক্রিয়াধীন |
| vendor.payouts.unsettled | Unsettled earnings (est.) | অনিষ্কৃত আয় (আনুমানিক) |
| vendor.payouts.schedule | Payout schedule | পেআউট সময়সূচি |
| vendor.payouts.holdDays | Earnings are held for {days} days after delivery | ডেলিভারির পর {days} দিন আয় ধরে রাখা হয় |
| vendor.payouts.period | Period | সময়কাল |
| vendor.payouts.net | Net amount | নিট পরিমাণ |
| vendor.payouts.status.on-hold | On hold | স্থগিত |
| vendor.settings.profile | Store profile | স্টোর প্রোফাইল |
| vendor.settings.payoutMethod | Payout method | পেআউট পদ্ধতি |
| vendor.settings.bankDetails | Bank details | ব্যাংক তথ্য |
| vendor.settings.commission | Commission | কমিশন |
| vendor.settings.commission.readonly | Set by the platform; applied when an order is placed | প্ল্যাটফর্ম নির্ধারিত; অর্ডারের সময় প্রযোজ্য |
| vendor.settings.suspended | Your store is suspended | আপনার স্টোর স্থগিত |
| vendor.settings.shippingModel | Shipping model | শিপিং মডেল |
