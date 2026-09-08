/**
 * Codegen: derive the admin panel's collection/global schemas from the real
 * backend Payload config (packages/backend/src/payload.config.ts).
 *
 * Run:
 *   1) node_modules/.bin/esbuild packages/admin/scripts/generate-schemas.ts \
 *        --bundle --platform=node --format=esm --packages=external \
 *        --alias:@bs-commerce/shared=./packages/shared/src/index.ts \
 *        --outfile=packages/admin/scripts/.gen.mjs
 *   2) node --env-file=packages/backend/.env packages/admin/scripts/.gen.mjs
 *
 * Output: packages/admin/src/generated/schema.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(dirname, "../src/generated/schema.json");

// ─── Load the backend config (bundled to .gen.mjs; imports below are relative) ─
// buildConfig returns a Promise<SanitizedConfig> and ALREADY applies the plugin
// chain, so the awaited config contains every enabled collection.
// @ts-expect-error — TS file imported via esbuild bundle
const configModule = await import("../../backend/src/payload.config.ts");
const raw = (await (configModule.default ?? configModule)) as Any;

// "Extended" set: raw core collections + all plugins force-enabled, so schemas
// exist even for plugins the local env disables but the hosted backend may run
// (e.g. geography, multivendor). These are emitted with conditional: true and
// the app intersects them with the live /api/access map at runtime.
// @ts-expect-error — TS imports resolved by esbuild
const [
  { Users },
  { Media },
  { Pages },
  { Categories },
  { Header },
  { Footer },
  { PlatformSettings },
  { ecommercePlugin },
  { multivendorPlugin },
  { inventoryPlugin },
  { shippingPlugin },
  { paymentsPlugin },
  { ordersPlugin },
  { commissionsPlugin },
  { payoutsPlugin },
  { notificationsPlugin },
  { verificationPlugin },
  { reviewsPlugin },
  { discountsPlugin },
  { geographyPlugin },
  { reportsPlugin },
] = await Promise.all([
  import("../../backend/src/collections/users"),
  import("../../backend/src/collections/media"),
  import("../../backend/src/collections/pages"),
  import("../../backend/src/collections/categories"),
  import("../../backend/src/globals/header"),
  import("../../backend/src/globals/footer"),
  import("../../backend/src/globals/platform-settings"),
  import("../../backend/src/plugins/ecommerce"),
  import("../../backend/src/plugins/multivendor"),
  import("../../backend/src/plugins/inventory"),
  import("../../backend/src/plugins/shipping"),
  import("../../backend/src/plugins/payments"),
  import("../../backend/src/plugins/orders"),
  import("../../backend/src/plugins/commissions"),
  import("../../backend/src/plugins/payouts"),
  import("../../backend/src/plugins/notifications"),
  import("../../backend/src/plugins/verification"),
  import("../../backend/src/plugins/reviews"),
  import("../../backend/src/plugins/discounts"),
  import("../../backend/src/plugins/geography"),
  import("../../backend/src/plugins/reports"),
]);

let extended: Any = {
  collections: [Users, Media, Pages, Categories],
  globals: [Header, Footer, PlatformSettings],
};
const forceEnabled: Array<[string, Any]> = [
  ["multivendorPlugin", multivendorPlugin({ enabled: true })],
  ["ecommercePlugin", ecommercePlugin({ enabled: true })],
  ["inventoryPlugin", inventoryPlugin({ enabled: true })],
  ["geographyPlugin", geographyPlugin({ enabled: true })],
  ["shippingPlugin", shippingPlugin({ enabled: true })],
  ["paymentsPlugin", paymentsPlugin({ enabled: true })],
  ["ordersPlugin", ordersPlugin({ enabled: true, splitByVendor: true })],
  ["commissionsPlugin", commissionsPlugin({ enabled: true })],
  ["payoutsPlugin", payoutsPlugin({ enabled: true })],
  ["notificationsPlugin", notificationsPlugin({ enabled: true })],
  ["verificationPlugin", verificationPlugin({ enabled: true })],
  ["discountsPlugin", discountsPlugin({ enabled: true })],
  ["reviewsPlugin", reviewsPlugin({ enabled: true, vendorReviews: true })],
  ["reportsPlugin", reportsPlugin({ enabled: true })],
];
for (const [, plugin] of forceEnabled) {
  extended = plugin(extended);
}

// Apply the plugin chain the same way Payload does at init time.

// ─── Normalization helpers ──────────────────────────────────────────────────────

function prettify(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function normLabel(label: Any): string | undefined {
  if (!label) return undefined;
  if (typeof label === "string") return label;
  if (typeof label === "object") return label.singular ?? label.plural;
  return undefined;
}

function normOptions(
  options: Any,
): Array<{ label: string; value: string }> | undefined {
  if (!Array.isArray(options)) return undefined;
  return options.map((o) =>
    typeof o === "string"
      ? { label: prettify(o), value: o }
      : { label: normLabel(o) ?? String(o.value), value: String(o.value) },
  );
}

interface NormField {
  name?: string;
  type: string;
  label?: string;
  required?: boolean;
  localized?: boolean;
  defaultValue?: unknown;
  description?: string;
  readOnly?: boolean;
  hidden?: boolean;
  options?: Array<{ label: string; value: string }>;
  relationTo?: string | string[];
  hasMany?: boolean;
  min?: number;
  max?: number;
  fields?: NormField[];
  tabs?: Array<{ label?: string; name?: string; fields: NormField[] }>;
  blocks?: Array<{ slug: string; label: string; fields: NormField[] }>;
}

function normFields(fields: Any | undefined): NormField[] {
  if (!Array.isArray(fields)) return [];
  const out: NormField[] = [];
  for (const f of fields) {
    const normalized = normField(f);
    if (normalized) out.push(...normalized);
  }
  return out;
}

function normField(f: Any): NormField[] | null {
  if (!f || typeof f !== "object") return null;
  const type = String(f.type ?? "text");

  // UI-only fields carry no data.
  if (type === "ui") return null;
  // Field entirely hidden in admin.
  if (f.hidden === true) return null;

  // Rows flatten inline.
  if (type === "row") return normFields(f.fields);

  const base: NormField = {
    type,
  };
  if (f.name) base.name = String(f.name);
  const label =
    normLabel(f.label) ?? (f.name ? prettify(String(f.name)) : undefined);
  if (label) base.label = label;
  if (f.required === true) base.required = true;
  if (f.localized === true) base.localized = true;
  if (f.unique === true) base.unique = true;
  if (
    f.defaultValue !== undefined &&
    typeof f.defaultValue !== "function" &&
    f.defaultValue !== null
  ) {
    base.defaultValue = f.defaultValue;
  }
  const description = f.admin?.description ?? f.description;
  if (typeof description === "string") base.description = description;
  if (f.admin?.readOnly === true || f.readOnly === true) base.readOnly = true;
  if (f.admin?.hidden === true) base.hidden = true;

  switch (type) {
    case "collapsible":
      base.label = normLabel(f.label) ?? f.admin?.title ?? base.label;
      base.fields = normFields(f.fields);
      break;
    case "tabs":
      base.tabs = (f.tabs ?? []).map((t: Any) => ({
        label: normLabel(t.label) ?? (t.name ? prettify(t.name) : undefined),
        name: t.name ? String(t.name) : undefined,
        fields: normFields(t.fields),
      }));
      break;
    case "array":
    case "group":
      base.fields = normFields(f.fields);
      if (normLabel(f.labels)) base.label = normLabel(f.labels);
      break;
    case "blocks":
      base.blocks = (f.blocks ?? []).map((b: Any) => ({
        slug: String(b.slug),
        label:
          normLabel(b.labels) ?? normLabel(b.label) ?? prettify(String(b.slug)),
        fields: normFields(b.fields),
      }));
      if (normLabel(f.labels)) base.label = normLabel(f.labels);
      break;
    case "select":
    case "radio":
      base.options = normOptions(f.options);
      if (f.hasMany === true) base.hasMany = true;
      break;
    case "relationship":
    case "upload":
      if (f.relationTo) base.relationTo = f.relationTo;
      if (f.hasMany === true) base.hasMany = true;
      break;
    case "number":
      if (typeof f.min === "number") base.min = f.min;
      if (typeof f.max === "number") base.max = f.max;
      break;
    case "textarea":
      if (f.maxLength) base.max = f.maxLength;
      break;
    default:
      break;
  }
  return [base];
}

function titleizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function fieldTreeHasLocalized(f: NormField): boolean {
  if (f.localized) return true;
  if (f.fields?.some(fieldTreeHasLocalized)) return true;
  if (f.tabs?.some((t) => t.fields.some(fieldTreeHasLocalized))) return true;
  if (f.blocks?.some((b) => b.fields.some(fieldTreeHasLocalized))) return true;
  return false;
}

function normCollection(c: Any) {
  const useAsTitle = c.admin?.useAsTitle ?? (c.auth ? "email" : "id");
  const fields = normFields(c.fields);
  const versions = c.versions
    ? {
        drafts: Boolean(c.versions.drafts),
        max:
          typeof c.versions.maxPerDoc === "number"
            ? c.versions.maxPerDoc
            : undefined,
      }
    : null;
  return {
    slug: String(c.slug),
    label: normLabel(c.labels) ?? titleizeSlug(String(c.slug)),
    group: c.admin?.group ? String(c.admin.group) : undefined,
    useAsTitle: String(useAsTitle),
    defaultColumns: Array.isArray(c.admin?.defaultColumns)
      ? c.admin.defaultColumns.map(String)
      : undefined,
    description:
      typeof c.admin?.description === "string"
        ? c.admin.description
        : undefined,
    auth: Boolean(c.auth),
    upload: Boolean(c.upload),
    versions,
    timestamps: c.timestamps !== false,
    hasLocalized: fields.some((fl) => fieldTreeHasLocalized(fl)),
    fields,
  };
}

function normGlobal(g: Any) {
  const fields = normFields(g.fields);
  return {
    slug: String(g.slug),
    label:
      normLabel(g.label) ?? normLabel(g.labels) ?? titleizeSlug(String(g.slug)),
    group: g.admin?.group ? String(g.admin.group) : undefined,
    hasLocalized: fields.some((fl) => fieldTreeHasLocalized(fl)),
    fields,
  };
}

function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}

// Payload's internal collections — hidden in its own admin too.
const INTERNAL_SLUGS = new Set([
  "payload-kv",
  "payload-locked-documents",
  "payload-preferences",
  "payload-migrations",
]);

const liveCols = (raw.collections ?? []).filter(
  (c: Any) => !INTERNAL_SLUGS.has(String(c.slug)),
);
const extendedCols = (extended.collections ?? []).filter(
  (c: Any) => !INTERNAL_SLUGS.has(String(c.slug)),
);

const liveNorm = dedupeBySlug(liveCols.map(normCollection));
const liveSlugs = new Set(liveNorm.map((c) => c.slug));
const conditionalNorm = dedupeBySlug(extendedCols.map(normCollection))
  .filter((c) => !liveSlugs.has(c.slug))
  .map((c) => ({ ...c, conditional: true }));

const collections = [...liveNorm, ...conditionalNorm];
const liveGlobalSlugs = new Set(
  (raw.globals ?? []).map((g: Any) => String(g.slug)),
);
const globals = dedupeBySlug((extended.globals ?? []).map(normGlobal)).map(
  (g) => (liveGlobalSlugs.has(g.slug) ? g : { ...g, conditional: true }),
);

const localization = raw.localization
  ? {
      locales: (raw.localization.locales ?? []).map((l: Any) =>
        typeof l === "string"
          ? { code: l, label: l }
          : {
              code: String(l.code),
              label: normLabel(l.label) ?? String(l.code),
            },
      ),
      defaultLocale: String(raw.localization.defaultLocale ?? "en"),
      fallback: Boolean(raw.localization.fallback),
    }
  : null;

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(
  OUT_PATH,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localization,
      collections,
      globals,
    },
    null,
    2,
  ),
);

const lines = collections.map(
  (c: Any) =>
    `  ${c.slug.padEnd(28)} group=${(c.group ?? "—").padEnd(14)} auth=${c.auth ? "Y" : "n"} upload=${c.upload ? "Y" : "n"} versions=${c.versions ? (c.versions.drafts ? "drafts" : "Y") : "-"}${c.conditional ? " CONDITIONAL" : ""} fields=${c.fields.length}`,
);
console.log(`collections (${collections.length}):`);
console.log(lines.join("\n"));
console.log(
  `globals (${globals.length}): ${globals.map((g: Any) => g.slug).join(", ")}`,
);
console.log(`localization: ${JSON.stringify(localization)}`);
console.log(`wrote ${OUT_PATH}`);
