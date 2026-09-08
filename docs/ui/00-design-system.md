# 00 — Design System Foundation

Applies to every surface in this spec. Anything not overridden here is standard shadcn/ui behavior.

## Stack & project setup

```bash
# New Next.js 15 app (App Router, TS, Tailwind v4)
npx create-next-app@latest bs-commerce-storefront --typescript --tailwind --app
cd bs-commerce-storefront
npx shadcn@latest init --preset nova        # base style, semantic tokens
```

- **Framework:** Next.js 15 App Router, React 19, TypeScript. Server Components by default; `"use client"` only for interactive subtrees.
- **Icons:** `lucide-react`.
- **Forms:** `react-hook-form` + `zod` + shadcn `Field`/`FieldGroup` layout (never raw `div` + `Label` stacks).
- **Toasts:** `sonner` — `toast.success(...)`, `toast.error(...)`.
- **Data:** Payload REST (`/api`) — read-only pages are Server Components fetching REST; cart/auth/checkout are client-side with fetch.

## Locales & routing

- Locales: `en`, `bn` (localized Payload fields exist on header/footer/products/etc.). All storefront routes are locale-prefixed: `/en/products`, `/bn/products`.
- Root `/` redirects to `/en` (or saved preference). Locale stored per user/session; switcher in header + footer.
- `bn` is LTR — no RTL handling needed.
- Never hardcode strings in components; every label lives in a dictionary (keys listed per surface, consolidated in `10-states-and-data.md`).

```tsx
// app/[locale]/layout.tsx
const locales = ['en', 'bn'] as const
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}
```

## Theming

Two levels:

1. **Platform theme (these tokens)** — the default look of BS-Commerce storefronts.
2. **Tenant branding** — announcement bar colors already come from CMS (`globals/header.ts` → `announcementBar.backgroundColor/textColor`, seeded `#0F172A`/`#FFFFFF`). Tenant theming is applied by overriding the same CSS variables — never raw Tailwind colors in components.

### CSS variables (globals.css, Tailwind v4 `@theme inline`)

| Token | Light | Dark | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | page background |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | body text |
| `--primary` | emerald `oklch(0.596 0.145 163.2)` | lighter emerald | CTAs, active states, prices emphasis |
| `--primary-foreground` | white | dark | text on primary |
| `--secondary` | slate `oklch(0.968 0.007 247.9)` | slate-900 | secondary surfaces |
| `--muted` / `--muted-foreground` | slate-100 / slate-500 | — | hints, meta text |
| `--accent` | slate-100 | slate-800 | hover surfaces |
| `--destructive` | red-600 | red-400 | errors, remove actions |
| `--border` / `--input` / `--ring` | slate-200 | slate-700 | borders, focus ring |
| `--radius` | `0.625rem` | — | global radius |

Rules enforced everywhere:

- Semantic tokens only (`bg-primary`, `text-muted-foreground`) — **no** raw `bg-blue-500`-style classes, no manual `dark:` overrides.
- Layout via `className` + `gap-*`/`size-*`/`truncate`/`cn()` — no `space-y-*`, no `w-X h-X` for equal dims.
- Dark mode: `class` strategy, toggle in header (`01-app-shell.md`).

### Typography

- `en`: Inter via `next/font/google`.
- `bn`: Noto Sans Bengali via `next/font/google`, applied when `locale === 'bn'` on `<html lang>`.
- Scale = shadcn defaults. Product titles `text-base font-medium`; page titles `text-2xl font-semibold tracking-tight`; prices `text-lg font-semibold tabular-nums`.

## Currency, numbers, dates

- Prices are plain decimal numbers in **major units** (e.g. `250.00`) — `products.basePrice`/`compareAtPrice`, `product-variants.price`, cart and order line fields (`products.ts:596-597`, `product-variants.ts:174-175`). Every product carries its own `currency` select (`products.ts:617`); carts/orders echo the applied currency in their payloads.
- `/api/globals/platform-settings` requires a logged-in user (`platform-settings.ts` read: `Boolean(req.user)`) — never bootstrap anonymous currency from it. Anonymous pages use the currency field on the product/cart/order payload itself; logged-in views may fall back to the PlatformSettings `currency` default.
- Format with a single helper — never inline:

```ts
export function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
```

- Dates via `Intl.DateTimeFormat(locale)`; all money uses `tabular-nums`.
- Prices are displayed with **compare-at strike-through** when `comparePrice > price` (sale badge: `Badge` variant `destructive`, e.g. `-20%`).

## Component inventory (install once)

```bash
npx shadcn@latest add button card badge input textarea label select checkbox radio-group \
  switch separator skeleton spinner alert dialog sheet drawer dropdown-menu popover tooltip \
  avatar breadcrumb tabs accordion collapsible command pagination scroll-area table sonner \
  input-otp toggle-group field input-group empty alert-dialog progress chart sidebar form
```

| UI need | Component |
| :--- | :--- |
| Primary/secondary/buy actions | `Button` (`default`, `outline`, `ghost`, `link`; `size="sm|lg|icon"`) |
| Product tiles, summary cards | `Card` with full composition (`CardHeader/Title/Description/Content/Footer`) |
| Sale / stock / order status | `Badge` (variants; order-status color mapping in `08-account.md`) |
| Filters, checkout, auth forms | `Field` + `FieldGroup` + `Input`/`Select`/`Checkbox`/`RadioGroup` |
| Search with suggestions | `Command` inside `Popover` (header) / `Dialog` (mobile) |
| Mobile nav + mini-cart | `Sheet` (side) |
| Filter drawer on mobile | `Sheet` (bottom) or `Drawer` |
| Destructive confirmations (remove from cart, cancel order) | `AlertDialog` |
| OTP entry | `InputOTP` (6 digits — matches backend OTP length) |
| Tables (orders, payouts, vendor lists) | `Table` |
| Vendor panel chrome | `Sidebar` (collapsible, `SidebarProvider`) |
| Vendor analytics | `Chart` (Recharts wrapper) |
| Empty cart / no orders / no results | `Empty` — never hand-rolled empty states |
| Loading | `Skeleton` per layout block; `Spinner` + `disabled` + `data-icon` for pending buttons |
| Feedback | `sonner` toasts, `Alert` (info/success/warning/destructive) |
| Images | `next/image`, all product/media URLs from Payload `media` collection sizes |

## Shared patterns (defined once, reused everywhere)

### `<ProductCard />`
`Card` with square `next/image` (Payload media `sizes`), title (`truncate`, 2-line clamp), vendor name (`text-muted-foreground`, multivendor only), `RatingStars`, price row (price + compare-at strike + sale `Badge`), quick add-to-cart `Button size="sm"`. Whole card links to PDP; add-to-cart stops propagation. States: skeleton grid while loading; out-of-stock shows disabled button + `Badge variant="secondary"` "Out of stock".

### `<RatingStars />`
Read-only stars from `reviews` aggregate rating (0–5, half-star precision via fill percentage); count in `text-muted-foreground` when > 0.

### `<QuantityStepper />`
`ToggleGroup`-free custom: `Button variant="outline" size="icon"` − / value / + , clamped to `stockQuantity`, min 1. Used in PDP, cart, mini-cart.

### `<Price />`
Props: `price`, `comparePrice?`. Renders formatted pair + optional `-N%` `Badge`.

### `<PageHeader />`
`Breadcrumb` + `h1` + optional description; used on PLP, account, vendor pages.

### Form conventions
- `FieldGroup` per form; `Field` per control; validation = `data-invalid` on `Field` + `aria-invalid` on control + `FieldDescription` as error slot.
- Submit button: `disabled` + `Spinner` + `data-icon="inline-start"` while pending.
- Server errors surface as `Alert variant="destructive"` above the form + `toast.error` for transient actions.

### Global states
Loading = `Skeleton` mirrors of the section. Empty = `Empty` component with one action. Error = `Alert variant="destructive"` with retry. Details and copy keys: `10-states-and-data.md`.
