# BS-Commerce Admin Panel

Standalone React admin panel for the BS-Commerce Payload backend — built
exclusively with the shadcn-style components in `BS-Commerce/source of components`
(Base UI + Tailwind v4). Feature-complete replacement for the Payload admin UI.

## Run

```bash
# from repo root
yarn install

# development (expects backend at BACKEND_URL, see packages/admin/.env)
yarn workspace @bs-commerce/admin dev
```

Open http://localhost:5173 (or the next free port Vite picks).

## Configuration — `packages/admin/.env`

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Target of the dev-server proxy for `/api`, `/media`, `/uploads`. Keep `VITE_API_BASE_URL` empty in dev — the proxy keeps requests same-origin (no CORS/CSRF issues; Payload's CSRF check is satisfied by an Origin header rewrite in `vite.config.ts`). |
| `VITE_API_BASE_URL` | Direct browser→API base URL for production builds served from a *different* origin than the API. When set, the backend must trust this admin origin (CORS + CSRF whitelist). |
| `VITE_STOREFRONT_URL` | Optional storefront origin used for "Preview" links on documents (e.g. pages → `/en/<slug>`). |

## Features (1:1 with the Payload admin)

- **Auth** — login (email or phone + password), create-first-user, logout, session via `/api/users/me`
- **Dashboard** — KPIs, sales chart, fulfillment pipeline, bestsellers, new customers, low stock, reviews/coupons (mirrors `/api/dashboard-stats` with store/date/currency filters)
- **Reports** — all report categories/types, period & custom ranges, store/currency filters, KPI cards, charts, table, CSV export
- **All collections** — nav generated from the backend config; list view with Payload's default columns, click-to-sort, search, pagination, bulk delete; document forms for every field type (text, number, select/radio, date, relationship with search combobox, upload/media picker, arrays, groups, blocks, tabs, collapsible, JSON/Lexical rich text)
- **Drafts & versions** — Save draft / Publish on drafts-enabled collections, version history with view + restore
- **Localization** — en/বাংলা locale switcher; localized fields are read and written per-locale (`?locale=…&fallback-locale=null`)
- **Permissions** — nav and actions follow the live `/api/access` map for the logged-in user
- **Globals** — header, footer, platform-settings rendered from their real field configs

## Schema generation (stays in sync with the backend)

The admin's collection/global schemas are **generated from the backend's own
Payload config** — not hand-written:

```bash
# 1) bundle the codegen with esbuild (resolves the backend's TS imports)
node_modules/.bin/esbuild packages/admin/scripts/generate-schemas.ts \
  --bundle --platform=node --format=esm --packages=external \
  --alias:@bs-commerce/shared=./packages/shared/src/index.ts \
  --outfile=packages/admin/scripts/.gen.mjs

# 2) run it with the backend's env (matches enabled plugins)
node --env-file=packages/backend/.env packages/admin/scripts/.gen.mjs
```

Output: `src/generated/schema.json`. Re-run whenever backend collection or field
configs change. Collections from locally-disabled plugins (e.g. multivendor,
geography) are still generated and marked `conditional`; they appear in the nav
only if the live backend exposes them via `/api/access`.

## Notes

- Lexical rich text (`richText` fields) is edited as validated JSON — the exact
  Lexical document is preserved; a visual editor can be added later.
- Media, categories, users, etc. are served by the backend; media files render
  through `assetUrl()` which prefixes the API origin when remote.
