# Demo data (client showcase)

## `client-demo-showcase.manifest.json`

Single source of truth for **categories**, **multivendor vendors** (profiles + products), **single-vendor** extras, and the **image library** (Unsplash URLs). `scripts/seed-frontend-demo.mjs` loads this file on every run (override path with `DEMO_MANIFEST_PATH`).

- Bump `version` when you make a breaking layout change to the JSON shape.
- Add or change products by editing `multivendor.vendors[].products` or `singleVendor`.
- Each product lists `categorySlugs` that must match entries in `categories`.
- `imageKey` must exist under `imageLibrary`.

## `client-demo-produce-bd.manifest.json`

Dedicated Bangladesh produce demo profile:

- Fruits/vegetables catalog only.
- Single tenant profile (`Shobuj Agro Foods`) for marketplace-free demo UX.
- BDT shipping defaults for Bangladesh.
- Designed for multivendor backend + multivendor storefront runtime with vendor listing disabled by env profile.

## Demo password (not in git)

Scripts read `**DEMO_UNIFIED_PASSWORD`** from:

1. Your shell environment (highest priority), or
2. `**.env.demo-seed**` / `**.env.demo-seed.local**` in the BS-Commerce repo root (gitignored).

Copy the template once:

```bash
cp .env.demo-seed.example .env.demo-seed
# edit .env.demo-seed and set DEMO_UNIFIED_PASSWORD=...
```

Do not commit `.env.demo-seed`. Loader paths are fixed in `scripts/lib/load-demo-unified-password.mjs` (repo root only).

## One-command client demo

From the **BS-Commerce** repo root (Postgres reachable, MV API on 3010 recommended), after `.env.demo-seed` exists **or** `DEMO_UNIFIED_PASSWORD` is exported:

```bash
yarn demo:bootstrap
```

This will:

1. Set **every user’s password** to `DEMO_UNIFIED_PASSWORD`.
2. Pick the first admin email from the database (or set `DEMO_ADMIN_EMAIL`).
3. Run `seed:frontend-demo` against single-vendor (3000) and multivendor (3010) APIs when they are up.

Override for a single run:

```bash
DEMO_UNIFIED_PASSWORD='YourSecret' yarn demo:bootstrap
```

**Use only on local or disposable demo databases** — never against production.

## Related scripts


| Script                            | Purpose                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `yarn demo:sync-passwords`        | Only step 1 (all users → same password).                                     |
| `yarn seed:frontend-demo`         | Only catalog/media seed (needs `SEED_ADMIN_`*).                              |
| `yarn seed:frontend-demo:produce-bd` | Bangladesh produce demo seed (manifest override + multivendor stack only). |
| `yarn reset:local-admin-password` | Reset one admin; respects `RESET_ADMIN_PASSWORD` or `DEMO_UNIFIED_PASSWORD`. |

## Bangladesh produce demo runbook

1. Start multivendor backend (`yarn dev:host:mv` in `BS-Commerce`).
2. Seed produce profile:

```bash
yarn seed:frontend-demo:produce-bd:images
yarn seed:frontend-demo:produce-bd
```

`seed:frontend-demo:produce-bd:images` uses overrides-first downloading:

- Add explicit URLs per image key in `scripts/produce-image-overrides.json` (recommended; e.g. curated Google-found image URLs).
- Optional fallback search can be enabled with `PRODUCE_IMAGE_ENABLE_FALLBACK=true`.
- Downloaded files are written into `BS-Commerce/.local-seed-images/produce-bd` (gitignored), so local demo assets are not committed to GitHub.

3. For storefront runtime, use env profile `docker/.env.multivendor-storefront.produce` in `multivendor-storefront/.env.local`.


