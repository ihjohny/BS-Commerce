# Admin Comparison — Local (5174) vs Template (10.112.185.133:3010)

Local = our Vite+React+shadcn admin. Template = the layout we're matching (Next.js + Payload).
Compared: login, dashboard, products list, product edit. No code changed.

---

## 1. Global chrome

| Area | Template | Local | Gap |
|---|---|---|---|
| Sidebar nav | Groups are **collapsible** (chevron per group): GLOBALS, PLATFORM, CONTENT, CATALOG, ECOMMERCE, INVENTORY, SHIPPING, PAYMENTS, ORDERS, DISCOUNTS, REVIEWS, REPORTS & ANALYTICS | Groups flat/always-open (Overview, Platform, Content, Catalog, Ecommerce…) | **Add collapse/expand per group**; align group labels + plural naming ("Product Variants", "Stock Levels", "Order Status Histories") |
| Dark mode | Defaults to dark, toggle in header | Toggle exists, defaults light | Optional: default theme match |
| Language selector | Header dropdown "English ▾" | Per-edit-page locale select only | Move locale switcher to global header |
| Account | Avatar → Account page, Log out | Workspace-name button only | **Account page + logout menu** |
| API tab | Doc header has **Edit / API** tabs (raw JSON view of doc) | None | Add read-only API/JSON view tab per doc |
| Breadcrumbs | Home icon / Products / doc title | Present on edit, not on list | Add breadcrumb to list pages |

## 2. Dashboard — biggest functional gap

Template has a full commerce dashboard; local is bare:
- **KPI cards with trend**: Total Revenue ৳2,012,080 `+27.3% vs prev: ৳1,580,510`, Total Orders, Total Customers (+context line "Registered accounts"), Average Order Value — each card links to its list.
- **Order pipeline chips**: Pending 2 / Processing 2 / Shipped 0 / Delivered 6 / Cancelled 0 / Refunded 0 → link to filtered order views. **Missing locally.**
- **Revenue/Orders chart** with toggle between the two series.
- **Recent Orders panel**: status tab filters (All/Pending/Processing/Delivered/Refunded), inline search "Search orders…", per-row View links, "View All →".
- **Date presets**: Today / 24h / 7 Days / 30 Days / MTD / YTD / All Time / Custom (local: single "7d" dropdown).
- **Store View**: named locations ("Agrabad Commercial Hub Outlet (OUT-CTG-AGR)"); local shows raw `__all__`.
- Header extras: **Refresh**, **Seed Catalog** (reseed action), language, theme, account.

## 3. Collection list pages

| Feature | Template | Local | Gap |
|---|---|---|---|
| Column sorting | Every header sortable (▲▼) | None | **Add server-side sort** (`?sort=`) |
| Relation columns | Rendered as **clickable links** (Sony, DJI → brand doc) | Plain text | Make relation cells link to the related doc |
| Currency | "Bangladeshi Taka (BDT)" full label | "BDT" chip | Cosmetic; optional |
| Row actions | No per-row icon actions (uses bulk select + detail page) | Duplicate/Delete icon buttons per row | Keep ours (it's a feature), low priority |
| List URL state | `?depth=1&limit=10` in URL | Not in URL | Put search/sort/page/filters in URL params |
| Filters | "Filters" dropdown present both | Present | Verify ours supports real filter clauses, not just UI |

## 4. Document edit pages

| Feature | Template | Local | Gap |
|---|---|---|---|
| Layout | 2-col: main + **right sidebar** (Slug w/ "Auto-generated from name" hint) | Single-column sections (peer round-3 decision) | Intentional divergence — keep unless peer reverses; slug hint text is cheap to add |
| Locale display | Per-field label suffix "— English"; localized fields marked inline | Small "L" badge on localized fields | Add locale suffix to localized field labels |
| Rich text | Lexical with **slash commands**, drag-to-move blocks, "Add block", inline link editor | Custom toolbar + "Edit as text" toggle | Consider Lexical toolbar parity: slash-command menu is the notable missing piece |
| Relations | Combobox with inline **"Edit {label}"** button (opens related doc), **"Add new {Collection}"** quick-create, selected chips w/ Edit + Remove | Combobox + Remove chip only | **Add Edit-link on selected relation + quick-create ("Add new Brand/Category/Class")** |
| Doc header | Title, Last Modified / Created timestamps (linked), Edit/API tabs, Save + kebab | Title, timestamps text, Save + kebab | Minor: make timestamps visually distinct |
| Save | Save button always visible in header | Same ✅ | — |

## 5. Pages/collections missing entirely in local

- **Reports & Analytics** (4 pages): Sales Analytics, Product & Catalog, Customer Engagement, Inventory & Operations — local has a "Reports" stub only.
- **Account page** (profile, password).
- **API doc view** (per-document raw JSON).
- **Platform Settings** (global) — verify globals/:slug covers it.
- **Seed Catalog** action button.

## 6. Priority order (fastest path to parity)

1. **Dashboard build-out** — KPI deltas + pipeline chips + recent-orders panel + date presets (biggest visible gap).
2. **List sorting + URL state** (`sort`, `page`, `search` in query params).
3. **Relation UX** — inline Edit + quick-create in RelationCombobox; relation cells as links in tables.
4. **Collapsible sidebar groups** + plural naming.
5. Localized label suffix + global locale switcher.
6. Reports pages (can start with Sales Analytics since dashboard chart infra is shared).
7. Account page + API tab.

## Verified working already (no action)
- Login flow, auth redirect (both apps, same seed creds).
- Products list: search, Columns, Filters, select-all/bulk, pagination, status badges.
- Product edit: sections, rich text round-trip, arrays (specs/tags/images panels), save flow.
