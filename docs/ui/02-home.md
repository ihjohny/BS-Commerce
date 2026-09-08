# 02 — Home Page (CMS-driven blocks + curated catalog sections)

`/{locale}` renders the published CMS page whose `layout` block list drives the top of the page, followed by two storefront-curated sections (featured categories, newest products) fetched from REST. All visuals below are derived from the real block schema (`packages/backend/src/collections/pages/blocks.ts`) and the seeded content — the schema has **8 block types** and **no product-grid or category-tile block**, which is exactly why the two catalog sections are REST-driven storefront sections instead.

## Purpose & routes

- Route: `/[locale]` (`app/[locale]/page.tsx`); `/` redirects to `/en` (shell, `01-app-shell.md`).
- Home content = `pages` collection doc with slug `home-hero-banners` (the seeded home doc; see Data & API). Public read is restricted to `status === 'published'` (`packages/backend/src/collections/pages/index.ts`); `versions.drafts` means unpublished edits are admin-only — the storefront never sees them, so there is no draft-preview state here.
- Page order: **Hero carousel** → **CMS layout blocks in array order** → **Featured categories** → **Newest products**. If no published page resolves → **fallback mode** (§5) still shows the two catalog sections.
- `layout` is localized: request with `?locale=bn`; `fallback: true` (`packages/backend/src/payload.config.ts`) renders `en` content for untranslated fields.

## Wireframe

### Desktop

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ⟵  ┌──────────────────────────────────────────────────────────────┐  ⟶    │ ← Hero carousel:
│     │  backgroundImage (media `tablet` size, full-bleed, object-cover)  │  │ ← 1 block = 1 slide
│     │                                                                  │  │   consecutive `hero`
│     │   Heading (text-4xl font-semibold)                               │  │   blocks
│     │   Subheading (text-lg text-foreground/80)                        │  │
│     │   [ ctaLabel → ctaUrl  Button size lg ]                          │  │
│     └──────────────────────────────────────────────────────────────┘      │
│                        ● ○ ○   (slide indicators)                          │
├────────────────────────────────────────────────────────────────────────────┤
│  … CMS layout blocks in order: richText | image | splitSection |           │
│     videoEmbed | faq | callout | spacer  (renderers in §2) …               │
├────────────────────────────────────────────────────────────────────────────┤
│  Featured categories                              [View all →]             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                               │
│  │  img   │ │  img   │ │  img   │ │  img   │   ← category.image square     │
│  │  name  │ │  name  │ │  name  │ │  name  │                               │
│  └────────┘ └────────┘ └────────┘ └────────┘                               │
├────────────────────────────────────────────────────────────────────────────┤
│  Newest products                                  [View all →]             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │  img    │ │  img    │ │  img    │ │  img    │   ← <ProductCard>            │
│  │ name    │ │ name    │ │ name    │ │ name    │     ৳ 89,900 ৳99,900 -10%     │
│  │ ★4.6(12)│ │ [Add]   │ │         │ │         │                              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                           │
└────────────────────────────────────────────────────────────────────────────┘
```

### Mobile

```
┌──────────────────────┐
│ ┌──────────────────┐ │  hero: h-[60vh], same slide content,
│ │   bg image       │ │  swipe left/right, ● ○ ○
│ │  Heading         │ │
│ │  Subheading      │ │
│ │  [ ctaLabel ]    │ │
│ └──────────────────┘ │
│  rich text           │
│  [ image full ]      │
│  splitSection stacks │  imagePosition ignored < md: image on top
│  ┌────┐ ┌────┐       │  categories: 2-col grid
│  │img │ │img │       │
│  └────┘ └────┘       │
│  Newest products     │  products: 2-col grid
│  ┌────┐ ┌────┐       │
│  │card│ │card│       │
│  └────┘ └────┘       │
└──────────────────────┘
```

## Sections

### 1. Hero carousel (block `hero`, consecutive = slides)

Schema per block: `heading` (text, localized), `subheading` (textarea, localized), `backgroundImage` (upload → `media`), `ctaLabel` (text, localized), `ctaUrl` (text). Renderer contract comment in `blocks.ts`: *mirror rendering in storefront `components/cms/page-layout-blocks.tsx`*.

- All `blockType: 'hero'` blocks in `layout` are grouped into one carousel (seeded homes are exactly this: 4 slides in `packages/backend/src/lib/seed-electronics-data.ts`, 3 slides in `data/farm-greens.storefront.json` `heroCopyByLocale`); a single hero block renders as a 1-slide carousel with indicators hidden.
- Slide visual: full-bleed container `h-[60vh] min-h-[420px]`, `next/image` from the media `tablet` size with `object-cover`; overlay `bg-gradient-to-t from-background/80` for text legibility (opacity tokens, not raw colors). Content bottom-left in an `max-w-7xl` container: `heading` `text-3xl md:text-4xl font-semibold`, `subheading` `text-base md:text-lg text-muted-foreground max-w-xl`, then CTA `Button size="lg"` navigating to `ctaUrl` (locale-prefixed in seeds, e.g. `/en/categories/fresh-fruits`; render as-is when it starts with `/`, else `target="_blank"`). No `backgroundImage` → `bg-secondary` surface, text stays readable.
- Behavior: autoplay every 6 s, paused on hover/focus/reduced-motion; prev/next `Button variant="ghost" size="icon"` (`ChevronLeft/Right`) at the edges `md+` only; dot indicators (`Button size="icon" aria-label="Go to slide n"`) clickable; keyboard ←/→ when focused; touch swipe via pointer events. Announce as `role="region" aria-roledescription="carousel"`, slides `aria-roledescription="slide"`, active dot `aria-current`.
- Optional polish only if trivial: none — no slide name/link schema exists, so no thumbnails or captions.

### 2. CMS layout blocks (renderer per schema block)

Render blocks in `layout` array order; each maps to one component in `components/cms/page-layout-blocks.tsx`:

| blockType | Schema fields (`collections/pages/blocks.ts`) | Renderer |
| :--- | :--- | :--- |
| `richText` | `content` (richText) | Prose container `max-w-3xl mx-auto`: headings `tracking-tight`, links `text-primary underline-offset-4`, lists/lists-spacing per shadcn prose defaults; embedded images lazy-loaded via `next/image`. |
| `image` | `image` (upload, required), `alt`, `caption`, `variant` (`rounded`\|`full`) | `figure`: `next/image` from `tablet` size. `variant=rounded` → `rounded-lg` inside `max-w-5xl mx-auto`; `variant=full` → `w-full` full-bleed. `alt` fallback = media `alt`; `caption` → `figcaption text-sm text-muted-foreground mt-2 text-center`. |
| `splitSection` | `image` (required), `imagePosition` (`left`\|`right`), `body` (richText) | `grid md:grid-cols-2 gap-8 items-center` in `max-w-6xl mx-auto`; `imagePosition=right` → `md:order-2` on the image. Mobile: image stacks above text regardless of position. Image uses `card` media size, `rounded-lg`. |
| `videoEmbed` | `title`, `embedUrl` (required) | `aspect-video w-full rounded-lg overflow-hidden` wrapper, lazy `<iframe src={embedUrl} title={title ?? 'Video'} loading="lazy" allowFullScreen>`. Normalize URL for the iframe: YouTube `watch?v=`/`youtu.be` → `youtube.com/embed/ID`; Vimeo `vimeo.com/ID` → `player.vimeo.com/video/ID`; unparseable → render as-is. |
| `faq` | `heading`, `items[] { question (required), answer (richText, required) }` | `Accordion type="single" collapsible`: optional `h2` heading, each item = `AccordionItem` with `AccordionTrigger` = question, `AccordionContent` = answer prose. |
| `callout` | `tone` (`muted`\|`primary`\|`warning`), `content` (richText) | `muted` → `Alert` (default variant); `warning` → `Alert` warning variant; `primary` → bordered box `bg-primary/10 text-primary border-primary/20` with an `Info` icon. Content rendered inline (AlertTitle/AlertDescription not used — schema has no title field). |
| `spacer` | `size` (`sm`\|`md`\|`lg`) | `<div aria-hidden>` with `h-8` / `h-16` / `h-32`. |

Unknown `blockType` (future schema additions) → render nothing in production, `console.warn` in dev. Never crash the page on one bad block — wrap each block render in an error boundary that hides the block and logs.

### 3. Featured categories (REST-driven storefront section)

- Heading `h2` = key `home.categories.title` + "View all" `Button variant="link"` → `/{locale}/categories`.
- Query: top-level active categories (`isActive`, `parent` empty — filtered client-side), ordered by `displayOrder` (lower first), limit 8, `depth=1` to hydrate `image`. Fields: `name` (localized), `slug`, `image` (upload → media), `description`.
- Tile: `Card` — square image (`media.thumbnail`), `CardTitle` `name` `text-sm font-medium text-center`, whole tile is a `Link` to `/{locale}/categories/{slug}`. Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`.
- Categories without `image` → `AspectRatio` placeholder with `ImageIcon` on `bg-muted`. Section hidden entirely if zero active top-level categories (no empty-state box on the home page).

### 4. Newest products (REST-driven storefront section)

- Heading `h2` = key `home.products.title` + "View all" → `/{locale}/products`.
- Query: `status=published`, `sort=-publishedAt`, `limit=8`, `depth=1`, `locale`. (A merchandised variant may add `where[featured][equals]=true` — the `featured` checkbox exists on products — but the default home shows newest.)
- Each result renders the shared `<ProductCard />` (`00-design-system.md`): image (`media.thumbnail`, square, object-cover), `name` (localized, truncate 2 lines), vendor name from `tenant` only when `MULTIVENDOR_ENABLED`, `<RatingStars>` from `rating`/`totalReviews`, `<Price>` from `basePrice`/`compareAtPrice` (+ `-N%` `Badge variant="destructive"` per product `saleDisplayMode`), quick *Add to cart* `Button size="sm"`.
- Quick add: client `POST/PATCH` to the cart with `X-Guest-Id` header for guests (`collections/carts.ts` identity model) → emit `cart:changed` (mini-cart badge updates, `01-app-shell.md` §4) + `toast.success`. Availability for products with variants comes from `GET /api/storefront/variant-availability`; when it reports none in stock → disabled button + `Badge variant="secondary"` "Out of stock" (`INVENTORY_ENABLED`; always disabled without inventory tracking data). Whole card links to `/{locale}/products/{slug}`; the add button stops propagation.
- Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6`.

### 5. Fallback mode (no published page)

- If the page query returns zero docs (never published, or all drafts), render: a static hero band on `bg-secondary` — `home.fallback.title`, `home.fallback.subtitle`, `Button` → `/{locale}/products` (key `home.fallback.cta`) — then §3 + §4 as normal. No error UI: an unpublished home is a valid state, not a failure.
- During initial page load the hero band area shows a `Skeleton` of the same height; catalog sections show their skeleton grids (below).

## shadcn components

```bash
# per 00-design-system.md inventory, the subset used here:
# card badge button separator skeleton spinner alert accordion aspect-ratio(empty) alert-dialog
# (aspect-ratio ships with card demos; use the pattern from 00's <ProductCard />)
```

| UI need | Component |
| :--- | :--- |
| Category tiles, product cards | `Card` + `CardTitle/Content` |
| Hero CTAs, view-all, quick add | `Button` (`lg`, `link`, `sm`) |
| Sale badge, out-of-stock | `Badge` (`destructive`, `secondary`) |
| FAQ block | `Accordion` |
| Callout block | `Alert` (+ custom primary box with semantic tokens) |
| Loading | `Skeleton` per section; `Spinner` + `disabled` + `data-icon` on pending add-to-cart |
| Empty products | `Empty` with one action |
| Errors | `Alert variant="destructive"` + retry |
| Feedback | `sonner` toasts on add-to-cart |
| Custom locals | `<Price>`, `<RatingStars>`, `<QuantityStepper>` (00 shared patterns), `components/cms/page-layout-blocks.tsx` block renderer map |

## Interactions & states

| Area | Loading | Empty | Error |
| :--- | :--- | :--- | :--- |
| CMS page fetch | hero-height `Skeleton` + section skeletons | zero published docs → fallback mode (§5) | `Alert variant="destructive"` + Retry in the hero band position; catalog sections still fetch independently |
| Hero carousel | slide `Skeleton` until media resolves | single block = 1 slide, dots hidden | slide without image → `bg-secondary`; broken URL → `next/image` fallback treatment, no crash |
| Featured categories | 4–8 `Skeleton` tiles | section omitted (zero rows is a content state, not an empty state) | `Alert` destructive in-section + Retry |
| Newest products | 8 `Skeleton` `<ProductCard>` grids | `Empty` ("No products yet") + *Browse categories* action | `Alert` destructive in-section + Retry |
| Quick add-to-cart | pending button: `Spinner` + `disabled` + `data-icon="inline-start"` | — | `toast.error` with retry via the cart sheet (01 §4) |
| FAQ / accordion | none (static content) | no `items` → block renders heading only, or skipped when heading also empty | — |

Reduced motion: carousel autoplay disabled (`prefers-reduced-motion`), transitions become instant. All section boundaries use `gap-*`/`py-*`, never `space-y-*`; sizes use `size-*` where width = height.

## Data & API

| Concern | Call | Source |
| :--- | :--- | :--- |
| Home CMS page (layout blocks) | `GET /api/pages?where[slug][equals]=home-hero-banners&locale={locale}&depth=2` (public read constrained to `status=published`) | `packages/backend/src/collections/pages/index.ts` (slug via `slugField('title')`, `layout` blocks, `meta` SEO group for `generateMetadata`, reserved-slug hook `packages/backend/src/lib/cms-reserved-route-segments.ts`) |
| Block schema (renderer contract) | — | `packages/backend/src/collections/pages/blocks.ts` (8 blocks: `richText`, `hero`, `image`, `splitSection`, `videoEmbed`, `faq`, `callout`, `spacer` — no product/category blocks exist) |
| Seeded home content | `home-hero-banners` page: 1 hero block (`data/storefront-config.seed.json` `.pages[0]`), 4 hero slides (`packages/backend/src/lib/seed-electronics-data.ts`), 3-slide hero copy + static pages (`data/farm-greens.storefront.json`) | seed data files |
| Featured categories | `GET /api/categories?where[isActive][equals]=true&sort=displayOrder&limit=8&depth=1&locale={locale}` → filter `parent` empty client-side | `packages/backend/src/collections/categories.ts` (`name`, `slug`, `image`, `parent`, `displayOrder`, `isActive`) |
| Newest products | `GET /api/products?where[status][equals]=published&sort=-publishedAt&limit=8&depth=1&locale={locale}` (optional `&where[featured][equals]=true`) | `packages/backend/src/plugins/ecommerce/collections/products.ts` (`createProductsConfig`: `name`, `slug`, `images[].image`, `basePrice`, `compareAtPrice`, `saleDisplayMode`, `currency`, `rating`, `totalReviews`, `featured`, `tenant`, `status`; public read = published only) |
| Search-indexed variant of the same filters | `GET /api/storefront/store-products?…` (published-only, `search`, `featured`, `limit` 1–100) — the header search and section queries stay consistent | `packages/backend/src/endpoints/storefront-store-products.ts` |
| Variant availability (out-of-stock) | `GET /api/storefront/variant-availability` | `packages/backend/src/endpoints/storefront-variant-availability.ts` |
| Quick add-to-cart | `POST /api/carts` (+items) / `PATCH /api/carts/{id}`, `X-Guest-Id` header for guests | `packages/backend/src/plugins/ecommerce/collections/carts.ts` |
| Image sizes (`thumbnail` 400×300, `card` 768×1024, `tablet` 1024w) | media URLs | `packages/backend/src/collections/media.ts` |
| Currency for `<Price>` | Per-product `currency` field on product payloads | `packages/backend/src/plugins/ecommerce/collections/products.ts:617` |

## Acceptance checklist

- [ ] `/en` and `/bn` resolve the published `home-hero-banners` page; `bn` shows localized copy with `en` fallback for untranslated fields.
- [ ] Every seeded `hero` block becomes a carousel slide (4 slides from the electronics seed); a single-hero page renders without dots/controls; sliding works via dots, arrows, keyboard, and swipe; autoplay pauses on hover and under `prefers-reduced-motion`.
- [ ] A hero without `backgroundImage` renders on `bg-secondary` and stays legible; `ctaLabel`/`ctaUrl` produce one working CTA per slide.
- [ ] Each of the 8 block types renders per §2 — spot-check `image` `variant=full` full-bleed vs `rounded`, `splitSection` `imagePosition=right` order swap on md+, `videoEmbed` normalized YouTube/Vimeo iframe with `title`, `faq` accordion, `callout` tones, `spacer` heights, `richText` prose.
- [ ] An unknown/garbage block does not crash the page.
- [ ] Featured categories grid shows active top-level categories in `displayOrder` with image or placeholder, linking to `/{locale}/categories/{slug}`; empty result hides the section.
- [ ] Newest products shows 8 newest published products using the shared `<ProductCard>` (price + compare-at strike + `-N%` badge, rating, vendor name only when `MULTIVENDOR_ENABLED`); quick add updates the mini-cart badge and toasts; out-of-stock renders the disabled variant; empty shows `Empty`; fetch failure shows `Alert` destructive with Retry.
- [ ] With no published home page, the page still renders: fallback hero band + both catalog sections (no error screen).
- [ ] SEO: `generateMetadata` uses the page `meta` group (title/description/image, localized) when present.
- [ ] Loading states mirror layout (hero-height skeleton, tile/card skeletons); no raw colors, no `dark:` overrides, no `space-y-*`, no hardcoded visible strings.

## Copy keys (i18n)

| key | en | bn |
| :--- | :--- | :--- |
| `home.fallback.title` | Welcome to {siteName} | {siteName}-এ স্বাগতম |
| `home.fallback.subtitle` | Shop the latest products, delivered across Bangladesh. | সর্বশেষ পণ্য কিনুন, সারা বাংলাদেশে ডেলিভারি। |
| `home.fallback.cta` | Browse products | পণ্য দেখুন |
| `home.categories.title` | Featured categories | বিশেষ ক্যাটাগরি |
| `home.categories.viewAll` | View all | সব দেখুন |
| `home.products.title` | Newest products | নতুন পণ্য |
| `home.products.viewAll` | View all | সব দেখুন |
| `home.products.addToCart` | Add to cart | কার্টে যোগ করুন |
| `home.products.added` | Added to cart | কার্টে যোগ হয়েছে |
| `home.products.outOfStock` | Out of stock | স্টকে নেই |
| `home.products.empty` | No products yet | এখনো কোনো পণ্য নেই |
| `home.products.browseCategories` | Browse categories | ক্যাটাগরি দেখুন |
| `home.error.retry` | Retry | আবার চেষ্টা করুন |
| `home.error.loadFailed` | Couldn't load this section | এই অংশটি লোড করা যায়নি |
| `home.video.title` | Video | ভিডিও |
| `home.goToSlide` | Go to slide {n} | স্লাইড {n}-এ যান |
| `home.previousSlide` | Previous slide | আগের স্লাইড |
| `home.nextSlide` | Next slide | পরের স্লাইড |

(Block-internal copy — headings, questions, answers, callouts — is CMS content, not keys. Only chrome/section headings and states are dictionary keys; consolidated in `10-states-and-data.md`.)
