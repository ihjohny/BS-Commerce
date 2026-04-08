# Demo data (client showcase)

## `client-demo-showcase.manifest.json`

Single source of truth for **categories**, **multivendor vendors** (profiles + products), **single-vendor** extras, and the **image library** (Unsplash URLs). `scripts/seed-frontend-demo.mjs` loads this file on every run (override path with `DEMO_MANIFEST_PATH`).

- Bump `version` when you make a breaking layout change to the JSON shape.
- Add or change products by editing `multivendor.vendors[].products` or `singleVendor`.
- Each product lists `categorySlugs` that must match entries in `categories`.
- `imageKey` must exist under `imageLibrary`.

## One-command client demo

From the **BS-Commerce** repo root (Postgres reachable, MV API on 3010 recommended):

```bash
yarn demo:bootstrap
```

This will:

1. Set **every user’s password** to the same value (`DEMO_UNIFIED_PASSWORD`, default `Asd@1234`).
2. Pick the first admin email from the database (or set `DEMO_ADMIN_EMAIL`).
3. Run `seed:frontend-demo` against single-vendor (3000) and multivendor (3010) APIs when they are up.

Override the shared password:

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
