CREATE A VITE REACT ADMIN PANEL FOR BS-COMMERCE USING ONLY PROVIDED SHADCN COMPONENTS

GOAL: Build a standalone Vite React + TypeScript admin panel that consumes the existing Payload CMS 3 backend (packages/backend) API, using EXCLUSIVELY the UI components from `C:\Users\BS00861\Documents\GitHub\BS-Commerce\source of components` and `source of components/ui/`.

NON-NEGOTIABLE CONSTRAINTS:
1. ONLY use components from:
   - `source of components/ui/` (all 50+ components: button, card, table, tabs, select, input, dialog, etc.)
   - `source of components/calendar/` (if needed for date pickers)
   - `source of components/date-range-picker.tsx`
   - `source of components/simple-icon.tsx`
2. NO external UI libraries (no shadcn/ui install, no headlessui, no radix-ui, no material-ui, etc.)
3. KEEP `packages/backend/` 100% untouched - no modifications to collections, globals, plugins, access, endpoints, payload.config.ts
4. RETAIN ALL ORIGINAL ADMIN FEATURES:
   - Auth/login flow
   - Create-first-user flow
   - Dashboard (KPIs, charts, fulfillment pipeline, recent orders, bestsellers, low stock, new customers)
   - Reports (filters, charts, CSV export, date range picker)
   - Collection CRUD for Users, Media, Pages, Categories (list, create, edit, delete views)
   - Globals editing (Header, Footer, PlatformSettings)
   - Plugin admin interfaces (orders, payments, inventory, notifications, reviews, discounts, commissions, payouts, reports, geography, verification, shipping) - where applicable via API
   - File uploads (media library)
   - Admin branding/logo/icon customization
   - Access control reflection in UI (hide/show elements based on role)
5. USE Tailwind CSS v4 + design tokens from `docs/ui/00-design-system.md`
6. REPLACE ALL inline styles with shadcn components + Tailwind utilities
7. PRESERVE all data fetching patterns (REST API endpoints: /api/dashboard-stats, /api/reports, /api/admin-branding, etc.)
8. MAINTAIN loading (Skeleton), error (Alert), empty (Empty) states
9. HANDLE authentication (JWT) via cookies or localStorage with refresh logic
10. KEEP all existing API contracts and data structures

PROJECT SETUP:
- Create new Vite + React + TypeScript project
- Install: vite, react, react-dom, @types/react, @types/react-dom, typescript
- Setup Tailwind CSS v4 (follow Tailwind v4 installation guide)
- Configure Vite to proxy /api requests to http://localhost:3000 (backend) during dev
- Create src/components/ui/ and copy ALL components from source of components/ui/ there
- Copy date-range-picker.tsx and simple-icon.tsx to src/components/
- Set up path aliases if needed (@/components/*)

CORE PAGES TO BUILD:
1. /login - email/password form, remember me, forgot password link
2. /create-first-user - shown when no admin exists
3. /dashboard - replica of current DashboardHome with all widgets
4. /reports - replica of current ReportsHome with filters and export
5. /collections/:collection - list view with search, filters, bulk actions, create button
6. /collections/:collection/create - create form
7. /collections/:collection/:id/edit - edit form
8. /globals/:global - edit form for Header/Footer/PlatformSettings
9. /media - media library with upload, folder view, image preview
10. Plugin-specific pages as needed (orders, payouts, etc.) - build based on API endpoints

IMPLEMENTATION GUIDELINES:
- Use React Query or SWR for data fetching and caching
- Implement auth wrapper that checks /api/users/me or similar endpoint
- For collection forms, use react-hook-form + zod validation (mirroring Payload's field definitions)
- Map Payload field types to shadcn components:
  - text -> Input
  - textarea -> Textarea
  - select -> Select
  - checkbox -> Checkbox
  - radio -> RadioGroup
  - date -> Input type="date" or Calendar
  - relationship -> Select or Combobox (for single/multiple)
  - upload -> custom dropzone with preview
  - blocks -> TBD based on usage
- Use shadcn Dialog for modals, Drawer for sidebars
- Use shadcn Table for list views with pagination
- Use shadcn Tabs for organizing settings
- Use shadcn Alert for feedback, Skeleton for loading states
- Use shadcn Button for all actions (primary, secondary, destructive, outline)
- Use shadcn InputGroup for inputs with buttons (like search)
- Use shadcn Badge for status indicators
- Use shadcn Accordion for collapsible sections
- Use shadcn ScrollArea for overflow containers
- Use shadcn Separator for dividers
- Use shadcn Tooltip for helper text
- Use shadcn Command for command palettes (if needed)
- Use shadcn Popover for dropdowns, tooltips
- Use shadcn Slider for numeric ranges
- Use shadcn Switch for toggles
- Use shadcn ToggleGroup for button groups
- Use shadcn Toaster (sonner equivalent) for toast notifications - if not available, implement simple toast with Alert

DATA FLOW:
- All data comes from Payload REST API
- Auth: POST /api/auth/login, GET /api/users/me, POST /api/auth/logout
- Collections: GET /api/:collection, POST /api/:collection, GET /api/:collection/:id, PATCH /api/:collection/:id, DELETE /api/:collection/:id
- Globals: GET /api/globals/:global, PATCH /api/globals/:global
- Special endpoints: /api/dashboard-stats, /api/reports, /api/admin-branding, etc.
- File upload: POST to /api/upload with multipart/form-data

STYLE SYSTEM:
- Use Tailwind v4 utility classes exclusively
- Reference design tokens from docs/ui/00-design-system.md for colors, spacing, typography
- Do NOT use arbitrary values - stick to the design system
- Use CSS variables where provided in the design system
- Maintain dark mode support if present in original

QUALITY CHECKS:
- Run tsc --noEmit for type safety
- Run eslint (if configured) - fix all errors
- Ensure responsive design works on mobile/tablet
- Verify all original admin flows work identically
- Confirm no feature regression compared to original admin

DELIVERABLE:
Complete Vite React project structure with:
- src/
  - components/
    - ui/ (all shadcn components from source)
    - layout/ (AdminLayout, AuthLayout)
    - pages/ (Login, CreateFirstUser, Dashboard, Reports, etc.)
    - hooks/ (custom hooks for auth, data fetching)
    - utils/ (api client, formatters, constants)
    - contexts/ (AuthContext, etc.)
  - App.tsx
  - main.tsx
  - index.css (Tailwind imports)
  - vite.config.ts
  - tsconfig.json
  - package.json
  - README.md with setup instructions