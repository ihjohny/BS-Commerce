# BS-Commerce Storefront & Vendor UI Specification

Complete UI specification for building the BS-Commerce customer storefront and vendor dashboard with **Next.js 15 (App Router) + shadcn/ui + Tailwind CSS**, on top of the existing Payload CMS 3 backend in `packages/backend`.

> The current `(app)` route group only renders a placeholder page. Everything in these documents is the **target UI**, derived from the real Payload collections, globals, endpoints, and feature flags in `packages/backend/src`. No UI exists yet — these files are the build contract.

## How to use these files

1. Read `00-design-system.md` first — it defines tokens, theming, and the shadcn component inventory every other file references.
2. Build surfaces in the order below. Each file is self-contained: routes, wireframe, section-by-section breakdown, exact shadcn components, interactions/states, and the backing API.
3. Every data reference (collection, field, endpoint, flag) is grounded in the backend. When implementing, verify against the cited source file listed in each spec's **Data & API** section.

## Documents

| File | Surface | Route(s) |
| :--- | :--- | :--- |
| `00-design-system.md` | Foundation: tokens, theming, shadcn setup, shared patterns | — |
| `01-app-shell.md` | Announcement bar, header, nav, mobile drawer, footer, locale switcher | all routes |
| `02-home.md` | Home page (CMS-driven blocks) | `/[locale]` |
| `03-catalog.md` | Category listing, product listing (PLP), search | `/[locale]/products`, `/[locale]/categories` |
| `04-product-detail.md` | Product detail page (PDP): gallery, variants, specs, reviews | `/[locale]/products/[slug]` |
| `05-cart.md` | Cart page + mini-cart drawer | `/[locale]/cart` |
| `06-checkout.md` | Checkout flow: contact, address, shipping, payment, confirmation | `/[locale]/checkout` |
| `07-auth.md` | Login, register, OTP, email/phone verification, password reset | `/[locale]/auth/*` |
| `08-account.md` | Customer dashboard, orders, addresses, wishlist, reviews, profile | `/[locale]/account/*` |
| `09-vendor-dashboard.md` | Vendor application + vendor panel (products, sub-orders, payouts) | `/[locale]/vendor/*` |
| `10-states-and-data.md` | Global loading/empty/error states, API mapping table, i18n keys | cross-cutting |

## Build order

```
00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09
                (10 is applied continuously: states live in every surface)
```

Minimum viable storefront: **00, 01, 02, 03, 04, 05, 06, 07** (guest checkout + auth).
Full experience adds **08, 09** (account + vendor).

## Conventions used in every spec

Each surface document follows this structure:

- **Purpose & routes** — what the page does, exact URL patterns.
- **Wireframe** — ASCII layout, desktop and mobile where they differ.
- **Sections** — ordered breakdown with component-level detail.
- **shadcn components** — exact component names to `npx shadcn@latest add`.
- **Interactions & states** — loading (`Skeleton`), empty (`Empty`), error (`Alert`), success (`sonner`).
- **Data & API** — Payload collections/globals/endpoints with source paths.
- **Acceptance checklist** — observable criteria for "done".

Feature flags respected everywhere: `MULTIVENDOR_ENABLED`, `GUEST_CHECKOUT_ENABLED`, `AUTH_REQUIRED_IDENTIFIER` (`email|phone|either`), `PAYMENT_PROVIDER` (`sslcommerz|stripe`), `INVENTORY_ENABLED`, `GEOGRAPHY_ENABLED` — see `packages/backend/.env.example` and `globals/platform-settings.ts`.

## Out of scope (intentionally)

- **Payload Admin Panel** (`/admin`) — Payload's own React admin; do not rebuild in shadcn. Custom admin views (`src/components/admin/*`) stay as-is.
- **API implementation** — the backend already exists; specs only consume it.
