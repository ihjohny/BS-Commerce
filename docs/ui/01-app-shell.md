# 01 — App Shell: Announcement Bar, Header, Nav, Mobile Drawer, Footer

Renders on every storefront route. Driven by the Payload globals `header` and `footer`; identity comes from `users`; cart comes from `carts`. Every field below exists in the backend source — each one maps to a visible UI consequence.

## Purpose & routes

- Wraps all pages under `/[locale]/...` (`app/[locale]/layout.tsx`); root `/` redirects to `/en` (or the saved/preferred locale). Locales: `en`, `bn` (`packages/backend/src/payload.config.ts` localization block, `fallback: true` — missing `bn` copy falls back to `en`).
- Composed of: announcement bar → sticky header (logo, search, actions) → desktop nav bar / mobile drawer → page content → footer.
- Client state needed shell-wide: current locale, theme (`light|dark`), auth user (`GET /api/users/me`), active cart summary.

## Wireframe

### Desktop (md and up)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▓ announcementBar (enabled, message, backgroundColor/textColor from CMS) ▓▓  │  ← static, scrolls away
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─ sticky top-0 z-50, border-b, bg-background ─────────────────────────────┐ │
│ │ [logo/img] SITE   ┌ InputGroup: 🔍 Search products…  [Button Search] ┐   │ │
│ │                   └─ Popover + Command suggestions ────────────────┘   │ │
│ │                                     [en|bn] ◐ ☰? 👤 □ ↳ Cart (2)       │ │
│ │                                        ^locale ^theme ^account ^mini-cart│ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ │ Home   Products   Categories                          ← showInDesktopNav  │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │                            page content                                  │ │
└──────────────────────────────────────────────────────────────────────────────┘
┌ Footer ──────────────────────────────────────────────────────────────────────┐
│  Shop            Service               Account          [f] [in] [X] [▶]     │
│  All products    Track your order      Login (guest)    ← socialLinks        │
│  Categories      About Farm Greens     Register (guest)                      │
│                  Dhaka delivery        Dashboard (auth)                      │
│  ─────────────── Separator ────────────────────────────────────────────────  │
│  About · Delivery · Terms                    ← bottomLinks                   │
│  © 2026 Farm Greens. Fresh produce…          ← copyrightText                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile (< md)

```
┌──────────────────────────────┐   Sheet (right) — drawer      ┌──────────────┐
│ [logo] SITE        🔍 👤 ☰ □ │   │ Home                   │   │  ☰ opens     │
└──────────────────────────────┘   │ Products               │   └──────────────┘
                                   │ Categories             │
  Dialog — search                  │ ── Track order ──      │ ← desktop-hidden row
  ┌──────────────────────────────┐ │ [en | bn] ToggleGroup  │
  │ ⌕ Search products…           │ │ ◐ Light/Dark item      │
  ├──────────────────────────────┤ │ 👤 Account group       │
  │ ⟳ Skeleton row               │ │ □ Cart (2)             │
  │ ○ No results found           │ └────────────────────────┘
  └──────────────────────────────┘   Sheet (right) — mini-cart
┌ Footer: columns stacked ──────┐  ┌──────────────┐
│ ▸ Shop                        │  │ Cart    (2) ✕│ SheetTitle
│ ▸ Service                     │  │ [img] Item ⿲ │ ScrollArea
│ ▸ Account                     │  │  − 1 +  ৳150 │
│  [f][in][X]                   │  │ Subtotal ৳.. │
│  About · Delivery · Terms     │  │ [View cart]  │
│  © 2026 Farm Greens…          │  │ [Checkout]   │
└───────────────────────────────┘  └──────────────┘
```

## Sections

### 1. Announcement bar

- Data: `header.announcementBar` group — `enabled` (default `false`), `message` (localized), `backgroundColor` (hex), `textColor` (hex). Source: `packages/backend/src/globals/header.ts`.
- `enabled === false` → bar not rendered at all (no reserved space).
- Colors: applied as inline `style={{ backgroundColor, color }}` — this is the one sanctioned raw-color exception (tenant branding, see `00-design-system.md` Theming). Validate with `/^#[0-9a-f]{6}$/i`; invalid → fall back to `bg-primary text-primary-foreground` tokens. Do not add a dismiss button — the schema has no persisted dismissed flag.
- `message` is localized: request `?locale=<current>`; with `fallback: true` missing `bn` copy renders the `en` message.

### 2. Header (sticky)

- Container: `sticky top-0 z-50 bg-background border-b`; on scroll > 4px add `shadow-sm`. Announcement bar is NOT sticky.
- Left — logo: `header.logo` is an upload to `media` (`packages/backend/src/collections/media.ts`, sizes `thumbnail` 400×300 / `card` 768×1024 / `tablet` 1024w). Render `next/image` at `h-9 w-auto` from the `thumbnail` URL; `alt` = `header.siteName`. If `logo` is empty → render `siteName` as `text-lg font-semibold tracking-tight`. Logo links to `/{locale}`.
- `siteName`: localized text, default `'BS-Commerce'`; also used as the app `<title>` suffix and `aria-label` for the home link.
- Center (desktop only) — search field, see §3.
- Right — actions row, `gap-1`, all `Button variant="ghost" size="icon"` with `Tooltip` (side bottom):
  1. **Locale switcher**: `ToggleGroup type="single"` with two items `EN | বাৎস` — a 2-choice set, hence ToggleGroup. Mobile drawer instead shows the same choice as menu items. On change: swap the leading `/(en|bn)` segment of the current pathname (or prepend if missing), persist — guest: `NEXT_LOCALE` cookie; authenticated: `PATCH /api/users/{me.id}` `{ locale }` (field exists on `users`, self-writable). Loading = `Spinner` in the trigger; failure = `toast.error` and no navigation.
  2. **Dark toggle**: sun/moon `Button`; toggles `class="dark"` on `<html>`, persists `localStorage('bs-theme')`, initial = saved → `prefers-color-scheme`. Inline script in `<head>` to avoid flash. Theme is client-only — no API.
  3. **Account menu**: `DropdownMenu`, guest vs authenticated variants:
     - **Guest** (`GET /api/users/me` → no user): trigger `User` icon. Items: *Sign in* → `/{locale}/auth/login`, *Create account* → `/{locale}/auth/register`, *Track order* → `/{locale}/track-order`.
     - **Authenticated**: trigger `Avatar` with initials from `displayName ?? firstName ?? username` (`AvatarFallback`; `avatar` upload if set). `DropdownMenuLabel` shows name + email-or-phone (`username` holds the login identifier). Items: Dashboard `/{locale}/account`, Orders, Addresses, Wishlist, `Separator`, **Sign out** (destructive styling, `POST /api/users/logout`, clears client user state, toast success). If `user.role === 'vendor'` and `MULTIVENDOR_ENABLED` → add *Vendor panel* → `/{locale}/vendor`; if `role === 'admin'` → link to `/admin`.
  4. **Mini-cart trigger**: `Button` with `ShoppingCart` icon + `Badge` count = Σ `items[].quantity` of the active cart; count > 9 renders `9+`. Opens the mini-cart `Sheet` (§4). Count badge is `aria-live="polite"`.

### 3. Search (Command + InputGroup)

- Desktop: `InputGroup` (per shadcn rule for inputs with inner buttons): `InputGroupInput placeholder=Search products…` + `InputGroupAddon` leading `Search` icon + `InputGroupAddon align="inline-end"` containing `Button size="sm"` *Search*. Typing (debounce 300 ms) or focusing opens a `Popover` hosting a `Command` list.
- Mobile: the search icon opens a `CommandDialog` (full-screen `Dialog` with `DialogTitle` "Search" — overlays must always have a Title).
- Suggestions = published products matching `search` (`name like`): `CommandGroup heading="Products"`, each `CommandItem` = thumbnail (`media.thumbnail`) + `name` + `<Price>`; `onSelect` navigates to `/{locale}/products/{slug}`. Footer item "See all results for “q”" → `/{locale}/products?search={q}`.
- Global hotkeys: `Ctrl/⌘+K` or `/` (outside inputs) focuses/opens search; `Esc` closes.
- States: **loading** → 3 `Skeleton` `CommandItem` rows; **empty** → `CommandEmpty` "No products found"; **error** → `Alert variant="destructive"` inside the popover with a Retry `Button`; **degraded** — if the suggestion request fails, pressing the inner *Search* button still performs the full-results navigation.

### 4. Mini-cart `Sheet`

- `Sheet` side `right`, `sm:max-w-md`. `SheetHeader` contains `SheetTitle` "Cart" and `SheetDescription` "{n} items" — mandatory Title. Body = `ScrollArea`.
- Cart resolution: authenticated → cart where `user = me`; guest → UUID `X-Guest-Id` header (generated + stored in cookie on first add; `packages/backend/src/plugins/ecommerce/collections/carts.ts` guest access model). Summary refetched on `cart:changed` event emitted by add-to-cart actions.
- Item row: image (`thumbnail`), `product.name` + variant label, `<QuantityStepper>` (clamped ≥ 1), line price, remove icon-button → `AlertDialog` confirm ("Remove this item?" / Cancel / Remove). Mutations go through the same cart endpoint with `X-Guest-Id` when guest; pending stepper/remove = `Spinner` + `disabled`.
- Footer: `Separator`, Subtotal row (`subtotal`), compare-at savings hint when applicable, `Button` *View cart* → `/{locale}/cart` (outline) and *Checkout* → `/{locale}/checkout` (default). Checkout link rendered regardless; gating happens at checkout (`GUEST_CHECKOUT_ENABLED`, spec 06).
- States: **loading** → 3 skeleton rows + skeleton footer; **empty** → `Empty` ("Your cart is empty") with one action *Browse products* → `/{locale}/products`; **error** → `Alert variant="destructive"` + Retry.

### 5. Desktop nav bar

- Second row inside the sticky header, `hidden md:flex`, gap-6. Rows of `header.navLinks` (localized array) where `enabled && showInDesktopNav`. Ordering = array order.
- Row flags (`packages/backend/src/globals/header.ts`): `enabled: false` → omitted everywhere; `showInDesktopNav: false` (e.g. seeded *Track order*) → desktop-hidden, still in mobile drawer; `openInNewTab` → `target="_blank" rel="noopener noreferrer"`.
- Link style: `text-sm font-medium text-muted-foreground hover:text-foreground`; active route (pathname startsWith url) → `text-primary`. URLs are stored locale-prefixed in the seed (`/en/products`); render as-is when they start with `/`, externalize with `Link`/`a` accordingly.

### 6. Mobile drawer (`Sheet`, side right)

- Trigger: hamburger `Menu` icon, `md:hidden`. `SheetHeader` + `SheetTitle` (siteName) — mandatory.
- Body: `navLinks` where `enabled && showInMobileDrawer` as large tappable rows (`Separator` between), then a group with locale choice (ToggleGroup, full-width), theme item, account items (guest/auth variant mirroring §2.3), and cart row showing count.
- `openInNewTab` honored; active route rows get `text-primary`.
- `SheetContent` gets `aria-controls`/focus-trap per default shadcn behavior; closing returns focus to the hamburger.

### 7. Footer

- Data: `footer` global (`packages/backend/src/globals/footer.ts`). Layout: `grid gap-8 md:grid-cols-{min(columns,4)}` inside `max-w-7xl mx-auto px-4 py-12` on `bg-secondary` (or `bg-muted`) — `columns` is `maxRows: 4`, so at most 4 grid tracks; <4 columns leave remaining tracks empty (do not stretch).
- Per column: `heading` (`text-sm font-semibold uppercase tracking-wide`) + link list (`text-sm text-muted-foreground hover:text-foreground`).
- Per link: `enabled: false` → omitted (seeded *Vendors* example); `visibility` select filters by session — `public` always, `guest` only when `user` is null (*Login/Register*), `authenticated` only when `user` exists (*Dashboard*). After sign-in/out re-filter. A column whose links all filter out is hidden.
- **socialLinks**: array of `{ platform, url }`; platform → `lucide-react` icon (`Facebook`, `Instagram`, `Twitter`, `Youtube`, `Linkedin`; `tiktok` has no lucide glyph → inline `Music2` SVG placeholder with `aria-label="TikTok"`). Render as `Button variant="ghost" size="icon"`, `aria-label={platform}`, `target="_blank" rel="noopener noreferrer"`, aligned right on desktop / after columns on mobile.
- **bottomLinks**: single row `text-sm text-muted-foreground` separated by `·`, above the copyright.
- **copyrightText**: localized; bottom line `text-xs text-muted-foreground`.
- Mobile: columns stack in a plain flow (no accordion needed at ≤4 short columns).

## shadcn components

```bash
npx shadcn@latest add button badge separator skeleton spinner alert dropdown-menu \
  popover command dialog sheet avatar tooltip toggle-group input-group scroll-area \
  alert-dialog empty sonner
```

`Command`, `Sheet`, `DropdownMenu`, `AlertDialog`, `Popover`, `Tooltip`, `ToggleGroup`, `InputGroup` are the interactive core; `Skeleton`/`Spinner`/`Alert`/`Empty`/`Badge`/`sonner` cover every state. Custom (tiny, local): `<QuantityStepper>` (per `00-design-system.md`), `<Price>`.

## Interactions & states

| Behavior | Loading | Empty | Error | Success |
| :--- | :--- | :--- | :--- | :--- |
| Shell globals (`header`, `footer`) | block-level `Skeleton` bars (announcement, nav row, footer columns); header chrome renders immediately with `siteName` fallback | `enabled:false` / empty arrays → section omitted (never a hand-rolled placeholder) | `Alert variant="destructive"` in place of the section + Retry | — |
| Search suggestions | 3 skeleton `CommandItem`s | `CommandEmpty` "No products found" | `Alert` destructive in popover + Retry; Enter still navigates to results | — |
| Locale switch | `Spinner` in trigger, UI frozen | — | `toast.error` + no navigation | instant `bn` copy via re-fetch with `?locale=bn` (fallback→`en` for gaps) |
| Dark toggle | none (instant, class swap) | — | — | preference persisted `localStorage` |
| `users/me` | actions row renders guest variant until resolved | — | stay guest silently (retry on next navigation) | account variant + Avatar initials |
| Mini-cart open | skeleton rows + footer | `Empty` + *Browse products* | `Alert` destructive + Retry | toast on qty/remove success |
| Sign out | `Spinner` + `disabled` on item | — | `toast.error` | `toast.success`, back to guest variant, footer `guest` links reappear |

## Data & API

| Concern | Call | Source |
| :--- | :--- | :--- |
| Announcement, logo, siteName, navLinks | `GET /api/globals/header?locale={locale}&depth=1` | `packages/backend/src/globals/header.ts` |
| Footer columns/links/social/bottom/copyright | `GET /api/globals/footer?locale={locale}` | `packages/backend/src/globals/footer.ts` |
| Locale list, fallback behavior | `localization: { locales: [en, bn], defaultLocale: 'en', fallback: true }` | `packages/backend/src/payload.config.ts` |
| Auth state / sign-out | `GET /api/users/me`, `POST /api/users/logout` | `packages/backend/src/collections/users/index.ts` (auth config, `loginWithUsername: { allowEmailLogin: true }`, roles `admin|vendor|customer`, preference field `locale`) |
| Locale preference persist | `PATCH /api/users/{id}` `{ locale }` | `packages/backend/src/collections/users/index.ts` (Preferences fields) |
| Search suggestions / results | `GET /api/storefront/store-products?search={q}&limit=6&locale={locale}` (`name like`, published-only, `limit` 1–100) | `packages/backend/src/endpoints/storefront-store-products.ts` |
| Cart summary + mutations | `GET/POST/PATCH /api/carts` (+ `X-Guest-Id` header for guests) | `packages/backend/src/plugins/ecommerce/collections/carts.ts` |
| Logo / thumbnails / hero images | media URLs `…/media/{filename}?w=…` via sizes `thumbnail`/`card`/`tablet` | `packages/backend/src/collections/media.ts` |
| Currency for `<Price>` | Per-product `currency` field on product payloads; mini-cart totals resolve to line products' currency (carts carry no currency field) | `packages/backend/src/plugins/ecommerce/collections/products.ts:617`, `collections/carts.ts` |

Feature flags touching the shell: `MULTIVENDOR_ENABLED` (vendor-panel account item, vendor names in suggestions).

## Acceptance checklist

- [ ] `announcementBar.enabled=false` removes the bar; enabled bar uses the exact CMS hex colors and localized message; invalid hex falls back to tokens.
- [ ] Header renders CMS logo (`thumbnail` size) or falls back to `siteName`; siteName is localized.
- [ ] Seeded nav proves every flag: *Vendors* (`enabled:false`) appears nowhere; *Track order* (`showInDesktopNav:false`) is desktop-hidden but present in the mobile drawer.
- [ ] A nav row with `openInNewTab` opens a new tab with `rel="noopener noreferrer"`.
- [ ] Desktop search: typing ≥1 char shows debounced product suggestions; Enter/button navigates to `/[locale]/products?search=`; Cmd/Ctrl+K and `/` open it; Esc closes.
- [ ] Search has distinct loading (skeleton), empty (`CommandEmpty`), and error (`Alert` destructive) states.
- [ ] Locale switch rewrites the URL locale segment, refetches localized globals, persists (cookie for guests, `PATCH /api/users` for signed-in), and `bn` copy falls back to `en` where untranslated.
- [ ] Dark toggle switches `class="dark"` with no flash on reload and survives navigation.
- [ ] Account menu: guest shows Sign in/Register; authenticated shows Avatar initials, name, Dashboard, Sign out; vendor role additionally sees Vendor panel only when `MULTIVENDOR_ENABLED`.
- [ ] Mini-cart Sheet always has a Title; count badge equals Σ item quantities; qty stepper and remove (AlertDialog confirm) work for guest and authenticated carts; empty state uses `Empty`.
- [ ] Sticky header stays pinned while the announcement bar scrolls away; shadow appears on scroll.
- [ ] Footer renders ≤4 columns from `maxRows:4`; *Login/Register* links only appear signed-out and *Dashboard* only signed-in (seeded `visibility` values); disabled *Vendors* link hidden; social icons have `aria-label`s; bottomLinks and localized copyright render.
- [ ] No raw Tailwind colors anywhere except the CMS-driven announcement inline style; no `dark:` overrides; `gap-*` not `space-y-*`; no hardcoded visible strings.

## Copy keys (i18n)

| key | en | bn |
| :--- | :--- | :--- |
| `shell.search.placeholder` | Search products… | পণ্য খুঁজুন… |
| `shell.search.submit` | Search | খুঁজুন |
| `shell.search.seeAll` | See all results for “{q}” | “{q}”-এর সব ফলাফল দেখুন |
| `shell.search.noResults` | No products found | কোনো পণ্য পাওয়া যায়নি |
| `shell.search.error` | Search is unavailable right now | এই মুহূর্তে সার্চ কাজ করছে না |
| `shell.cart.title` | Cart | কার্ট |
| `shell.cart.items` | {n} items | {n}টি আইটেম |
| `shell.cart.empty` | Your cart is empty | আপনার কার্ট খালি |
| `shell.cart.browse` | Browse products | পণ্য দেখুন |
| `shell.cart.subtotal` | Subtotal | সাবটোটাল |
| `shell.cart.viewCart` | View cart | কার্ট দেখুন |
| `shell.cart.checkout` | Checkout | চেকআউট |
| `shell.cart.removeConfirm` | Remove this item? | এই আইটেম সরাবেন? |
| `shell.account.signIn` | Sign in | লগইন |
| `shell.account.register` | Create account | অ্যাকাউন্ট খুলুন |
| `shell.account.dashboard` | Dashboard | ড্যাশবোর্ড |
| `shell.account.orders` | Orders | অর্ডার |
| `shell.account.addresses` | Addresses | ঠিকানা |
| `shell.account.wishlist` | Wishlist | উইশলিস্ট |
| `shell.account.vendorPanel` | Vendor panel | ভেন্ডর প্যানেল |
| `shell.account.signOut` | Sign out | লগআউট |
| `shell.account.trackOrder` | Track order | অর্ডার ট্র্যাক |
| `shell.footer.heading` | — (CMS `footer.columns[].heading`, not a key) | — |
