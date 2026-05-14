# BS-Commerce

An open-source, composable, multivendor ecommerce platform.

## Prerequisites

- Node.js >= 24.0.0
- yarn >= 1.22.0
- Postgres (or MongoDB — swap adapter in `payload.config.ts`)
- Redis

## Quick Start

```bash
yarn install
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env with your values
yarn dev
```

Admin panel: `http://localhost:3000/admin`

## Project Structure

```
bs-commerce/
├── packages/
│   ├── backend/              ← Payload CMS app
│   │   └── src/
│   │       ├── payload.config.ts   ← Single source of truth
│   │       ├── collections/        ← Users, Media, Pages, Categories
│   │       ├── globals/            ← Header, Footer, PlatformSettings
│   │       ├── plugins/            ← Composable feature plugins (Phase 2+)
│   │       ├── access/             ← Access control helpers
│   │       ├── fields/             ← Reusable field compositions
│   │       └── lib/                ← Utilities, Redis config, constants
│   └── shared/               ← Shared types & utilities
├── package.json              ← Yarn workspaces root
└── README.md
```

## Key Environment Variables

See `packages/backend/.env.example` for the full list.

| Variable | Description |
|----------|-------------|
| `DATABASE_URI` | Postgres connection string (default) |
| `REDIS_URL` | Redis URL — required |
| `PAYLOAD_SECRET` | Auth token secret |
| `MULTIVENDOR_ENABLED` | `true` = marketplace, `false` = single-vendor |
| `GUEST_CHECKOUT_ENABLED` | Enables guest cart + guest checkout flow |
| `SKU_AUTOFILL_POLICY` | Product SKU generation policy: `always`, `on-publish` (default), `never` |
| `CHECKOUT_RATE_LIMIT_POINTS` | Max checkout requests per rate-limit window |
| `CHECKOUT_RATE_LIMIT_DURATION_SECONDS` | Checkout rate-limit window in seconds |
| `GUEST_LOOKUP_RATE_LIMIT_POINTS` | Max guest order-lookup requests per window |
| `GUEST_LOOKUP_RATE_LIMIT_DURATION_SECONDS` | Guest lookup rate-limit window in seconds |

### SKU policy behavior

- `always`: generate SKU whenever missing.
- `on-publish` (recommended default): keep SKU optional in draft, generate only when publishing.
- `never`: keep SKU optional and never auto-generate.

Data integrity note: the backend keeps SKU optional (`NULL` allowed), and enforces uniqueness only for non-null values via a partial unique index.

## Modes

| Mode | Setting |
|------|---------|
| Single-vendor | `MULTIVENDOR_ENABLED=false` |
| Marketplace | `MULTIVENDOR_ENABLED=true` |

## Guest Checkout Testing

From `packages/backend`, run:

```bash
yarn test:guest
```

Optional flags:

- `RUN_RATE_LIMIT=true` to include rate-limit assertions
- `PRODUCT_ID=<id>` to pin a specific product (otherwise the first published product is used)
- `AUTH_TOKEN=<jwt>` to run authenticated abuse checks when login policy blocks auto-created test users

## License

MIT
