# 🛍️ BS-Commerce: Comprehensive Project & Setup Guide

Welcome to **BS-Commerce**! This document provides a complete, easy-to-understand breakdown of what this project is, its architectural design, prerequisites, and a step-by-step guideline to set up and run it on macOS.

---

## 📌 Table of Contents

1. [Project Overview](#-1-project-overview)
2. [Tech Stack](#-2-tech-stack)
3. [Architecture & Features Breakdown](#-3-architecture--features-breakdown)
4. [Project Directory Structure](#-4-project-directory-structure)
5. [Prerequisites & macOS Software Installation](#-5-prerequisites--macos-software-installation)
6. [Step-by-Step Setup & Running Guide](#-6-step-by-step-setup--running-guide)
7. [Environment Variables Reference](#-7-environment-variables-reference)
8. [Database Migrations & Demo Data Seeding](#-8-database-migrations--demo-data-seeding)
9. [Available NPM / Yarn Scripts](#-9-available-npm--yarn-scripts)
10. [Key Endpoints & URLs](#-10-key-endpoints--urls)
11. [Troubleshooting & Common Pitfalls](#-11-troubleshooting--common-pitfalls)

---

## 📖 1. Project Overview

**BS-Commerce** is a modern, headless, composable ecommerce platform built by **Brain Station 23**. It is powered by **Payload CMS 3** and **Next.js 15 (App Router)**.

### Key Highlights:
- **Dual Mode (Single-Vendor & Multi-Vendor):** Can operate either as a dedicated single-brand direct-to-consumer (D2C) store or as a multi-tenant marketplace with independent vendor dashboards and commission splitting.
- **Tailored for Regional & Global Commerce:** Features built-in support for Bangladeshi payments (SSLCommerz with IPN) and localization (English `en` & Bengali `bn`), as well as global services like Stripe.
- **Full Headless & Composable Architecture:** Modular Payload plugins manage everything from products and inventory to shipping, geography, payouts, and order state machines.
- **Enterprise-Grade Auth & Security:** Dual-identifier authentication (Email or Phone number + OTP / Magic Links), Guest checkout, and Redis-backed rate limiting.

---

## 💻 2. Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, React 19) | Application server & admin frontend |
| **CMS / Backend Engine** | [Payload CMS v3](https://payloadcms.com/) | Schema definitions, Admin Panel, REST/GraphQL APIs, Auth |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (via Drizzle ORM adapter) | Primary relational datastore (UUID keys) |
| **Cache & Rate Limiting**| [Redis](https://redis.io/) (`ioredis`, `rate-limiter-flexible`) | Query caching, rate limiting, session storage |
| **API Documentation** | [Swagger UI & OpenAPI 3.0](https://swagger.io/) (`payload-oapi`) | Interactive API documentation at `/docs` |
| **Image Processing** | [Sharp](https://sharp.pixelplumbing.com/) | Media uploads and thumbnail transformations |
| **Rich Text Editor** | Lexical Editor (`@payloadcms/richtext-lexical`) | Product/category descriptions & page content |
| **Process Manager** | PM2 | Background daemon management for staging/production |

---

## 🧩 3. Architecture & Features Breakdown

BS-Commerce is organized into a modular plugin architecture located under `packages/backend/src/plugins/`:

```
┌────────────────────────────────────────────────────────┐
│                   Payload CMS Admin                    │
│      (http://localhost:3000/admin — React 19 / Next.js)│
├────────────────────────────────────────────────────────┤
│                 Custom REST & GraphQL APIs             │
│        (/api/graphql, /api/checkout/process, etc.)     │
├────────────────────────────────────────────────────────┤
│                     Plugin Layer                       │
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│ │   Ecommerce   │ │  Multivendor  │ │   Inventory    │ │
│ └───────────────┘ └───────────────┘ └────────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│ │   Shipping    │ │   Payments    │ │     Orders     │ │
│ └───────────────┘ └───────────────┘ └────────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│ │  Commissions  │ │    Payouts    │ │ Notifications  │ │
│ └───────────────┘ └───────────────┘ └────────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│ │ Verification  │ │   Geography   │ │    Reviews     │ │
│ └───────────────┘ └───────────────┘ └────────────────┘ │
├────────────────────────────────────────────────────────┤
│                    Database & Cache                    │
│        PostgreSQL 16 (Drizzle)   +   Redis 7           │
└────────────────────────────────────────────────────────┘
```

### Core Plugins & Capabilities:

1. **`ecommercePlugin`**:
   - Products (localized titles, rich description, SEO metadata, base & compare prices, sale display).
   - Product Variants (SKU tracking, options like size/color, pricing).
   - Carts & Guest Checkout support.
2. **`multivendorPlugin`**:
   - Vendor onboarding, KYC verification, and product approval workflows.
   - Multitenancy linking users, products, and sub-orders to specific vendors.
3. **`inventoryPlugin`**:
   - Stock Locations (warehouses, physical stores, pickup outlets).
   - Stock Levels & inventory movements tracking with low-stock alerts.
4. **`geographyPlugin`**:
   - Hierarchical geographic data: Country → Subdivision (Division/State) → Locality (City/District/Thana).
   - Stock Location Service Areas and address matching during checkout.
5. **`shippingPlugin`**:
   - Shipping Zones & Methods (flat rate, per-item, weight-based, free-shipping thresholds).
   - Service tier routing (e.g. green/express vs standard delivery).
6. **`paymentsPlugin`**:
   - **SSLCommerz:** Primary gateway for Bangladeshi debit/credit cards, bKash, Nagad, with Instant Payment Notification (IPN).
   - **Stripe:** Alternative gateway adapter for global credit card payments.
7. **`ordersPlugin`**:
   - Multi-vendor order splitting into vendor sub-orders.
   - Comprehensive order status state machine (Pending, Paid, Processing, Shipped, Delivered, Cancelled).
8. **`commissionsPlugin` & `payoutsPlugin`**:
   - Dynamic vendor commission rates (percentage, flat, tiered, category-based).
   - Vendor payouts ledger and payout scheduling (bi-weekly, monthly, hold periods).
9. **`verificationPlugin`**:
   - Email verification via magic link or 6-digit OTP.
   - Phone number OTP verification (supports console log, Twilio, or SSL Wireless adapters).
10. **`reviewsPlugin` & `discountsPlugin`**:
    - Customer reviews with moderation and vendor rating calculation.
    - Coupon codes, promotional discounts, and rules engine.

---

## 📂 4. Project Directory Structure

```
BS-Commerce/
├── packages/
│   ├── backend/                      # Main Payload CMS + Next.js App
│   │   ├── src/
│   │   │   ├── payload.config.ts     # Central configuration & plugin registry
│   │   │   ├── app/                  # Next.js App router (Admin UI & Custom routes)
│   │   │   ├── collections/          # Users, Media, Pages, Categories
│   │   │   ├── globals/              # Header, Footer, PlatformSettings
│   │   │   ├── plugins/              # Composable modular feature plugins
│   │   │   ├── endpoints/            # Custom API handlers (checkout, auth, SSLCommerz)
│   │   │   ├── access/               # Role-based access control helpers
│   │   │   ├── fields/               # Reusable field compositions (slugs, SEO, etc.)
│   │   │   └── lib/                  # Redis client, server URLs, inventory helpers
│   │   ├── migrations/               # Drizzle/Payload database migration files
│   │   ├── tests/                    # Unit, security, and E2E integration test suites
│   │   ├── docker-compose.test.yml   # Lightweight Postgres & Redis for testing
│   │   ├── package.json              # Backend scripts and dependencies
│   │   └── .env.example              # Sample environment configuration
│   └── shared/                       # Shared TypeScript types and utility helpers
├── data/                             # Demo seed manifests (Produce BD, Farm Greens, etc.)
├── docs/                             # Architecture notes, CLI resolution, collection schemas
├── pm2/                              # Ecosystem configurations for production runs
├── scripts/                          # Seeding, image downloading, and admin reset scripts
├── package.json                      # Monorepo root workspace configuration
└── README.md                         # Quick start documentation
```

---

## 🛠️ 5. Prerequisites & macOS Software Installation

To run BS-Commerce on macOS, you need **Node.js (>= 24)**, **Yarn (>= 1.22)**, **PostgreSQL 16+**, and **Redis 7+**.

### Step 1: Install Homebrew (if not already installed)
Open your Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Ensure Node.js >= 24 is installed
Verify your current Node version:
```bash
node -v
# Output should be >= v24.0.0 (e.g., v24.15.0)
```
If you need to install or update Node:
```bash
brew install node@24
brew link node@24
```

### Step 3: Enable Yarn
Since Node comes with `corepack`, enable Yarn by running:
```bash
corepack enable
corepack prepare yarn@stable --activate
# Verify yarn
yarn -v
```
*(Alternatively, install via npm: `npm install -g yarn`)*

### Step 4: Install & Start Database Services

You can choose between **Option A (Docker - Recommended)** or **Option B (Homebrew Native)**:

#### Option A: Using Docker (Fastest & Cleanest)
If you have Docker Desktop installed on your Mac:
```bash
# Start a local PostgreSQL and Redis instance using the test compose file:
cd packages/backend
docker compose -f docker-compose.test.yml up -d
cd ../..
```
*This starts Postgres on port `5433` and Redis on port `6380`.*

#### Option B: Using Homebrew (Native Services)
If you prefer running services directly on macOS:
```bash
# Install PostgreSQL and Redis
brew install postgresql@16 redis

# Start services in the background
brew services start postgresql@16
brew services start redis

# Create the default database
createdb bs_commerce_sv
```
*This runs Postgres on port `5432` and Redis on port `6379`.*

---

## 🚀 6. Step-by-Step Setup & Running Guide

Follow these steps from the root directory (`/Users/bs0650/BS-23-Pro/bs-com/BS-Commerce`):

### Step 1: Install Dependencies
```bash
yarn install
```

### Step 2: Configure Environment Variables
Copy the example environment file:
```bash
cp packages/backend/.env.example packages/backend/.env
```

Open `packages/backend/.env` in your editor and configure your database and Redis credentials:
```env
# If using Native Postgres (Homebrew port 5432):
DATABASE_URI=postgres://postgres:postgres@localhost:5432/bs_commerce_sv
REDIS_URL=redis://localhost:6379

# OR if using Docker compose (port 5433 / 6380):
# DATABASE_URI=postgres://postgres:postgres@localhost:5433/bs_commerce_test
# REDIS_URL=redis://localhost:6380

# Application configuration
PAYLOAD_SECRET=your-random-secret-key-at-least-32-characters-long
NEXT_PUBLIC_APP_URL=http://localhost:3000
MULTIVENDOR_ENABLED=false
```

### Step 3: Run Database Migrations
Initialize the schema and create tables in PostgreSQL:
```bash
yarn db:migrate
```

### Step 4: (Optional) Seed Demo Data
To populate sample products, categories, shipping zones, and store locations:
```bash
# Seed initial storefront configuration
yarn seed:storefront-config

# Seed Farm Greens / Bangladesh Produce catalog
yarn seed:farm-greens
```

### Step 5: Start the Development Server
```bash
yarn dev
```

The application will start at:
- **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **API Base:** [http://localhost:3000/api](http://localhost:3000/api)
- **Swagger Documentation:** [http://localhost:3000/docs](http://localhost:3000/docs)
- **GraphQL Playground / Endpoint:** [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql)

---

## ⚙️ 7. Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URI` | `postgres://postgres:postgres@localhost:5432/bs_commerce_sv` | PostgreSQL database connection string |
| `DATABASE_ID_TYPE` | `uuid` | Database ID format (`uuid` or `serial`) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `PAYLOAD_SECRET` | `change-this-secret...` | Secret key for JWT signing and encryption |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public backend URL (used for CORS and admin links) |
| `MULTIVENDOR_ENABLED` | `false` | `false` for Single Vendor, `true` for Multi-vendor marketplace |
| `GUEST_CHECKOUT_ENABLED` | `true` | Allows unauthenticated guest shopping carts & checkout |
| `AUTH_REQUIRED_IDENTIFIER` | `either` | Allowed login identifier (`email`, `phone`, or `either`) |
| `PAYMENT_PROVIDER` | `sslcommerz` | Active payment gateway (`sslcommerz` or `stripe`) |
| `SSLCOMMERZ_SANDBOX` | `true` | Enables sandbox/test mode for SSLCommerz transactions |
| `INVENTORY_ENABLED` | `true` | Activates stock levels and warehouse management |
| `GEOGRAPHY_ENABLED` | `false` | Enables country/subdivision/locality address validations |

---

## 📊 8. Database Migrations & Demo Data Seeding

### Managing Migrations
When modifying collection fields or adding new models in `packages/backend/src`:
- **Create a new migration:**
  ```bash
  yarn workspace @bs-commerce/backend db:migrate:create
  ```
- **Apply pending migrations:**
  ```bash
  yarn db:migrate
  ```

### Seeding Profiles
The `data/` directory contains rich JSON manifests for testing:
- **Client Showcase Manifest:** `data/client-demo-showcase.manifest.json`
- **Bangladesh Produce (Fruits/Veggies):** `data/client-demo-produce-bd.manifest.json`
- **Farm Greens:** `data/farm-greens.manifest.json`

To reset an admin password on your local instance:
```bash
RESET_ADMIN_EMAIL=admin@example.com RESET_ADMIN_PASSWORD=Password123! yarn reset:local-admin-password
```

---

## 📜 9. Available NPM / Yarn Scripts

| Command | Action |
| :--- | :--- |
| `yarn dev` | Starts the Next.js / Payload development server on port 3000 |
| `yarn build` | Compiles both backend and shared workspaces for production |
| `yarn start` | Runs the compiled production Next.js server |
| `yarn typecheck` | Runs TypeScript type checking without emitting files |
| `yarn lint` | Runs ESLint across all workspaces |
| `yarn db:migrate` | Runs all pending database migrations |
| `yarn seed:storefront-config` | Seeds basic navigation, headers, footers, and storefront configurations |
| `yarn seed:farm-greens` | Seeds full farm greens catalog with categories, variants, and stock |
| `yarn reset:local-admin-password` | Resets a local administrator user password |
| `yarn dev:host:sv` | Runs single-vendor backend on port 3000 with dedicated SV env |
| `yarn dev:host:mv` | Runs multi-vendor backend on port 3004 with dedicated MV env |
| `yarn pm2:start` | Starts background backend process via PM2 daemon |

---

## 🌐 10. Key Endpoints & URLs

Once your server is running (`yarn dev`):

- 🛠️ **Payload Admin UI:** [http://localhost:3000/admin](http://localhost:3000/admin)
- 📑 **Swagger REST Documentation:** [http://localhost:3000/docs](http://localhost:3000/docs)
- 📑 **Custom REST Docs:** [http://localhost:3000/docs-custom](http://localhost:3000/docs-custom)
- ⚡ **GraphQL Endpoint:** [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql)
- 🛒 **Checkout Processing API:** [http://localhost:3000/api/checkout/process](http://localhost:3000/api/checkout/process)
- 💳 **SSLCommerz IPN Webhook:** [http://localhost:3000/api/payments/sslcommerz/ipn](http://localhost:3000/api/payments/sslcommerz/ipn)
- 📦 **Guest Order Tracking:** [http://localhost:3000/api/guest/order-lookup](http://localhost:3000/api/guest/order-lookup)

---

## 💡 11. Troubleshooting & Common Pitfalls

### 1. Payload CLI vs Next.js Import Resolution
- **Issue:** Running `payload migrate` or `generate:types` directly may throw `ERR_UNSUPPORTED_DIR_IMPORT` or `ERR_REQUIRE_ASYNC_MODULE`.
- **Solution:** Always run migration and CLI commands using the npm scripts (`yarn db:migrate`), which utilize `--disable-transpile` and the custom Node module resolver (`register-ts-resolve.mjs`).

### 2. Redis Connection Errors (`ECONNREFUSED 127.0.0.1:6379`)
- **Issue:** The backend requires Redis for caching and rate limiting.
- **Solution:** Ensure Redis is running via Homebrew (`brew services start redis`) or Docker (`docker compose -f packages/backend/docker-compose.test.yml up -d`).

### 3. Server Actions Encryption Key in Production Builds
- **Issue:** In production/staging with PM2 or multi-instance deployment, users see `"Failed to find Server Action"`.
- **Solution:** Generate a consistent key with `openssl rand -base64 32` and set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=...` in your `.env`.

---

✨ *You are now ready to build, customize, and extend BS-Commerce!*
