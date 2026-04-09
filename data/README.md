# Demo data (client showcase)

## `client-demo-showcase.manifest.json`

Single source of truth for **categories**, **multivendor vendors** (profiles + products), **single-vendor** extras, and the **image library** (Unsplash URLs). `scripts/seed-frontend-demo.mjs` loads this file on every run (override path with `DEMO_MANIFEST_PATH`).

- Bump `version` when you make a breaking layout change to the JSON shape.
- Add or change products by editing `multivendor.vendors[].products` or `singleVendor`.
- Each product lists `categorySlugs` that must match entries in `categories`.
- `imageKey` must exist under `imageLibrary`.

## Demo password (not in git)

Scripts read **`DEMO_UNIFIED_PASSWORD`** from:

1. Your shell environment (highest priority), or  
2. **`.env.demo-seed`** / **`.env.demo-seed.local`** in the BS-Commerce repo root (gitignored).

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

| Script | Purpose |
|--------|---------|
| `yarn demo:sync-passwords` | Only step 1 (all users → same password). |
| `yarn seed:frontend-demo` | Only catalog/media seed (needs `SEED_ADMIN_*`). |
| `yarn reset:local-admin-password` | Reset one admin; respects `RESET_ADMIN_PASSWORD` or `DEMO_UNIFIED_PASSWORD`. |
