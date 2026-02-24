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

## Modes

| Mode | Setting |
|------|---------|
| Single-vendor | `MULTIVENDOR_ENABLED=false` |
| Marketplace | `MULTIVENDOR_ENABLED=true` |

## License

MIT
