// Types for the generated schema (packages/admin/src/generated/schema.json),
// which is derived from packages/backend/src/payload.config.ts by
// scripts/generate-schemas.ts.

export interface SelectOption {
  label: string;
  value: string;
}

export interface NormField {
  name?: string;
  type:
    | "text"
    | "textarea"
    | "email"
    | "password"
    | "number"
    | "select"
    | "radio"
    | "checkbox"
    | "date"
    | "relationship"
    | "upload"
    | "array"
    | "group"
    | "blocks"
    | "tabs"
    | "collapsible"
    | "json"
    | "richtext"
    // Payload may emit exotic types; the renderer falls back to JSON editing.
    | string;
  label?: string;
  required?: boolean;
  unique?: boolean;
  localized?: boolean;
  defaultValue?: unknown;
  description?: string;
  readOnly?: boolean;
  hidden?: boolean;
  /** Payload admin.position === "sidebar" → rendered in the edit view's right rail. */
  sidebar?: boolean;
  options?: SelectOption[];
  relationTo?: string | string[];
  hasMany?: boolean;
  min?: number;
  max?: number;
  fields?: NormField[];
  tabs?: Array<{ label?: string; name?: string; fields: NormField[] }>;
  blocks?: Array<{ slug: string; label: string; fields: NormField[] }>;
}

export interface NormVersions {
  drafts: boolean;
  max?: number;
}

export interface NormCollection {
  slug: string;
  label: string;
  group?: string;
  useAsTitle: string;
  defaultColumns?: string[];
  description?: string;
  auth: boolean;
  upload: boolean;
  versions: NormVersions | null;
  timestamps: boolean;
  hasLocalized: boolean;
  /** True when the local env disables this plugin; rendered only if the live backend exposes it. */
  conditional?: boolean;
  fields: NormField[];
}

export interface NormGlobal {
  slug: string;
  label: string;
  group?: string;
  hasLocalized: boolean;
  conditional?: boolean;
  fields: NormField[];
}

export interface LocalizationConfig {
  locales: Array<{ code: string; label: string }>;
  defaultLocale: string;
  fallback: boolean;
}

import schemaJson from "@/generated/schema.json";

const data = schemaJson as unknown as {
  generatedAt: string;
  localization: LocalizationConfig | null;
  collections: NormCollection[];
  globals: NormGlobal[];
};

export const localization: LocalizationConfig = data.localization ?? {
  locales: [{ code: "en", label: "English" }],
  defaultLocale: "en",
  fallback: false,
};

export const collections: NormCollection[] = data.collections;
export const globals: NormGlobal[] = data.globals;

export function getCollectionSchema(slug: string): NormCollection | undefined {
  return collections.find((c) => c.slug === slug);
}

export function getGlobalSchema(slug: string): NormGlobal | undefined {
  return globals.find((g) => g.slug === slug);
}

/** Doc title helper mirroring Payload's useAsTitle behavior for plain data. */
export function docTitle(
  doc: Record<string, unknown>,
  schema?: NormCollection,
): string {
  if (!doc) return "";
  const candidates = schema
    ? [schema.useAsTitle]
    : ["name", "title", "username", "email", "id"];
  for (const key of candidates) {
    const v = doc[key];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return String(doc.id ?? "");
}
