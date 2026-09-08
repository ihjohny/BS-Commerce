REBUILD FULL ADMIN BACKOFFICE — ONLY USE `C:\Users\BS00861\Documents\GitHub\BS-Commerce\source of components`

CONSTRAINTS (hard rules):
- ONLY import components from `source of components/ui/` (accordion, alert-dialog, button, card, calendar, dialog, dropdown-menu, input, select, table, tabs, etc.), `source of components/calendar/`, `date-range-picker.tsx`, `simple-icon.tsx`. NO external shadcn installs, NO raw Tailwind-only builds.
- KEEP `packages/backend/` untouched (collections, globals, plugins, access, endpoints, payload.config.ts, auth, DB). Only modify `packages/backend/src/components/admin/`.
- RETAIN ALL ORIGINAL FEATURES: collection CRUD (Users/Media/Pages/Categories), globals editing (Header/Footer/PlatformSettings), custom Dashboard (KPIs, charts, fulfillment pipeline, orders, inventory, bestsellers, low stock, new customers), Reports (filters, charts, CSV export, date range), admin branding/logo/icon, create-first-user flow, auth/login, file uploads, plugin admin (orders/payments/inventory/notifications/reviews/discounts/commissions/payouts/reports/geography/verification/shipping), access control enforcement.
- USE Tailwind v4 + shadcn design tokens from `docs/ui/00-design-system.md`. Replace ALL inline `style={{...}}` props with shadcn components + Tailwind utilities.
- PRESERVE all data fetching: `/api/dashboard-stats`, `/api/reports`, `/api/admin-branding`, `/api/reports?format=csv`, etc.
- Maintain loading (`Skeleton`), error (`Alert`), empty (`Empty`), and transition states.
- Keep `'use client'` where required.

DELIVER: fully restyled `DashboardHome/` and `ReportsHome/` using ONLY the provided shadcn component library, with zero feature loss.
