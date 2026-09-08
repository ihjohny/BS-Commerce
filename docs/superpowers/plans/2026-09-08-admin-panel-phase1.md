# Admin Panel (Vite React) — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standalone Vite + React + TS admin panel at `packages/admin` that logs into the existing Payload backend and renders an authenticated app shell (login, create-first-user, sidebar shell, dashboard with live KPIs) using ONLY the components from `source of components/`.

**Architecture:** Vite SPA consuming Payload REST via a dev proxy (`/api` → `localhost:3000`), cookie-based JWT auth (`credentials: include`), React Router 7 routes, React Query for data, Tailwind v4 with the design tokens from `docs/ui/00-design-system.md`. Component library is copied verbatim from `source of components/ui/` (Base UI-based shadcn). Backend stays 100% untouched.

**Tech Stack:** Vite 7, React 19, TypeScript 5.7, Tailwind v4 (`@tailwindcss/vite`), `@base-ui/react`, react-router 7, @tanstack/react-query, recharts 3, lucide-react.

**Phases after this one:** Phase 2 full Dashboard widgets → Phase 3 Reports → Phase 4 Collections CRUD + Globals + Media.

---

### Task 1: Scaffold `packages/admin`

**Files:** Create `packages/admin/package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `src/vite-env.d.ts`

- [ ] **Step 1: package.json** — workspace `@bs-commerce/admin`, scripts `dev/build/preview/typecheck`. Deps: `@base-ui/react`, `@tanstack/react-query`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `lucide-react`, `react`, `react-day-picker`, `react-dom`, `react-resizable-panels`, `react-router-dom`, `recharts`, `simple-icons`, `tailwind-merge`. DevDeps: `@tailwindcss/vite`, `tailwindcss@^4.1`, `tw-animate-css`, `vite@^7`, `@vitejs/plugin-react@^5`, `typescript@^5.7.3`, `@types/react`, `@types/react-dom`, `@types/node`.
- [ ] **Step 2: index.html** — root div + `/src/main.tsx`, title "BS-Commerce Admin".
- [ ] **Step 3: vite.config.ts** — plugins `react()` + `tailwindcss()`; aliases `@` → `src`, `cn` → `src/lib/cn.ts` (components import `cn` from package-style specifier); dev proxy `/api`, `/media`, `/uploads` → `BACKEND_URL || http://localhost:3000`. Use `fileURLToPath(import.meta.url)` for paths (ESM).
- [ ] **Step 4: tsconfig.json** — `moduleResolution: bundler`, `jsx: react-jsx`, strict, `noEmit`, paths `@/*` + `cn`; include `src`. `tsconfig.node.json` for `vite.config.ts`.

### Task 2: Design tokens + utils

**Files:** Create `src/index.css`, `src/lib/cn.ts`, `src/hooks/use-mobile.ts`

- [ ] **Step 1: index.css** — `@import "tailwindcss"; @import "tw-animate-css"; @custom-variant dark (&:is(.dark *));` `@theme inline` mapping all shadcn semantic colors (incl. `--sidebar-*`, `--chart-1..5`), `:root` light + `.dark` values; `--primary` = emerald `oklch(0.596 0.145 163.2)` per design doc; `@layer base` sets `border-border`, `bg-background text-foreground`.
- [ ] **Step 2: cn.ts** — `clsx` + `tailwind-merge` standard `cn()`.
- [ ] **Step 3: use-mobile.ts** — shadcn `useIsMobile` hook (required by `ui/sidebar.tsx`).

### Task 3: Copy component library

- [ ] **Step 1:** `copy_path` `source of components/ui` → `packages/admin/src/components/ui`
- [ ] **Step 2:** `copy_path` `source of components/date-range-picker.tsx` and `simple-icon.tsx` → `packages/admin/src/components/`
- [ ] **Step 3:** Skip `calendar/event-calendar-views.tsx` (needs @fullcalendar — deferred; not required by any admin surface yet).

### Task 4: API client + auth

**Files:** Create `src/lib/api.ts`, `src/contexts/AuthContext.tsx`

- [ ] **Step 1: api.ts** — `request<T>()` wrapper: `credentials: 'include'`, JSON headers, error normalization from Payload `{errors:[{message}]}` → `ApiError(message, status)`. Expose `api.get/post/patch/delete`. Types: `PayloadUser` (id, email?, phone?, username, firstName?, lastName?, role, status, tenant?), `DashboardStats` mirroring backend `AdminDashboardStats` (discriminated union on `role: 'admin' | 'vendor'`, kpis revenue/orders/customers/aov as `{value, previousValue, changePercentage}`, salesChart, recentOrders, salesSummary, orderStatusBreakdown).
- [ ] **Step 2: AuthContext.tsx** — bootstrap `GET /api/users/me` (user null → unauth); `login(identifier, password)` → `POST /api/users/login` with `{ username: identifier, password }` (collection uses `loginWithUsername.allowEmailLogin`; backend hook normalizes email/phone from username); `registerFirst(data)` → `POST /api/users/first-register` with `{email, password, firstName, lastName, role:'admin'}`; `logout()` → `POST /api/users/logout`. Expose `{user, loading, login, logout, registerFirst}` + `useAuth()`.

### Task 5: App shell + routing

**Files:** Create `src/components/layout/AdminShell.tsx`, `src/components/RequireAuth.tsx`, `src/App.tsx`, `src/main.tsx`; pages `src/pages/Login.tsx`, `src/pages/CreateFirstUser.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Placeholder.tsx`

- [ ] **Step 1: AdminShell** — shadcn `SidebarProvider/Sidebar` (nav: Dashboard `/`, Reports `/reports`; group Platform: Users/Media/Pages/Categories; group Settings: Header/Footer/Platform Settings), header row with `SidebarTrigger` + Separator + theme toggle (toggles `.dark` on `<html>`), user `DropdownMenu` (name, role Badge, logout). Content in `SidebarInset` → `<Outlet/>`.
- [ ] **Step 2: RequireAuth** — `loading` → centered `Spinner`; no user → `<Navigate to="/login" replace/>`; else `<Outlet/>`.
- [ ] **Step 3: Login** — centered `Card`, `Field` layout: identifier `Input`, password `Input`, submit `Button`, error `Alert` (destructive), link to `/create-first-user`. On success navigate to `location.state.from ?? '/'`.
- [ ] **Step 4: CreateFirstUser** — Card form: email, password, confirm, firstName, lastName → `registerFirst` → navigate `/`. Show `Alert` on error.
- [ ] **Step 5: Dashboard (phase-1 slice)** — React Query `GET /api/dashboard-stats`; loading → `Skeleton` grid; error → `Alert` + retry `Button`; success → 4 KPI `Card`s (Revenue/Orders/Customers/AOV with change% badge), `Card` with `Table` of recent orders (orderNumber, customer, items, total, status `Badge`, date), vendor-scope notice when `role === 'vendor' && !tenantId`.
- [ ] **Step 6: Placeholder** — `Card` + `Empty` ("ships in the next phase") for Reports/collections/globals routes until their phases.
- [ ] **Step 7: App.tsx routes** — public: `/login`, `/create-first-user`; protected under `RequireAuth` + `AdminShell`: `index` Dashboard, `reports`, `collections/users|media|pages|categories`, `globals/:slug`; `*` → Navigate `/`. **main.tsx** — StrictMode, QueryClientProvider, BrowserRouter, AuthProvider.

### Task 6: Install, typecheck, build

- [ ] **Step 1:** `yarn install` at repo root (needs network approval; workspace picks up `packages/admin`).
- [ ] **Step 2:** `yarn workspace @bs-commerce/admin typecheck` → 0 errors (fix copied-component issues as they surface).
- [ ] **Step 3:** `yarn workspace @bs-commerce/admin build` → `dist/` emitted.
- [ ] **Step 4:** README.md in `packages/admin`: run instructions (`yarn workspace @bs-commerce/admin dev` + backend on :3000), CORS/CSRF note (`http://localhost:5173` origin must be in backend trusted origins via `NEXT_PUBLIC_APP_URL`/`SERVER_PUBLIC_URL` — dev proxy keeps API same-origin so cookies work), env `BACKEND_URL`.

## Self-review

- Spec coverage: only-specified-components ✓ (Task 3), backend untouched ✓ (no edits outside `packages/admin`), all features → phased; Phase 1 covers auth + shell + dashboard slice ✓.
- No placeholders: Placeholder page is a deliberate route stub for later phases, not missing plan content.
- Type consistency: `PayloadUser`/`DashboardStats` defined once in `api.ts`, consumed by AuthContext/Dashboard.
