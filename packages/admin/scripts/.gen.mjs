var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// packages/backend/src/access/is-admin.ts
var isAdmin;
var init_is_admin = __esm({
  "packages/backend/src/access/is-admin.ts"() {
    "use strict";
    isAdmin = ({ req }) => {
      return req.user?.role === "admin";
    };
  }
});

// packages/backend/src/access/is-self-or-admin.ts
var isSelfOrAdmin;
var init_is_self_or_admin = __esm({
  "packages/backend/src/access/is-self-or-admin.ts"() {
    "use strict";
    isSelfOrAdmin = ({ req }) => {
      const user = req.user;
      if (!user) return false;
      if (user.role === "admin") return true;
      return {
        id: {
          equals: user.id
        }
      };
    };
  }
});

// packages/backend/src/lib/validation/email-format.ts
var LOOSE_EMAIL_FORMAT_RE;
var init_email_format = __esm({
  "packages/backend/src/lib/validation/email-format.ts"() {
    "use strict";
    LOOSE_EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }
});

// packages/backend/src/lib/auth-config.ts
function getAuthRequiredIdentifier() {
  const v = process.env.AUTH_REQUIRED_IDENTIFIER?.toLowerCase();
  if (v === "email" || v === "phone" || v === "either") return v;
  return "either";
}
function validateAuthIdentifier(identifier, data) {
  let email = (data.email ?? "").toString().trim();
  let phone = (data.phone ?? "").toString().trim();
  const username = (data.username ?? "").toString().trim();
  if (!email && username && LOOSE_EMAIL_FORMAT_RE.test(username)) email = username;
  if (!phone && username && !LOOSE_EMAIL_FORMAT_RE.test(username) && username.length > 0) phone = username;
  if (identifier === "email" && !email) {
    throw new Error("Email is required.");
  }
  if (identifier === "phone" && !phone) {
    throw new Error("Phone is required.");
  }
  if (identifier === "either" && !email && !phone) {
    throw new Error("At least one of email or phone is required.");
  }
}
function toLoginIdentifier(email, phone, username) {
  let e = (email ?? "").toString().trim().toLowerCase();
  let p = (phone ?? "").toString().trim();
  const u = (username ?? "").toString().trim();
  if (!e && u && LOOSE_EMAIL_FORMAT_RE.test(u)) e = u.toLowerCase();
  if (!p && u && !LOOSE_EMAIL_FORMAT_RE.test(u)) p = u;
  return p || e;
}
var init_auth_config = __esm({
  "packages/backend/src/lib/auth-config.ts"() {
    "use strict";
    init_email_format();
  }
});

// packages/backend/src/lib/user-verification-reset.ts
function shouldResetEmailVerified(originalDoc, data) {
  if (!originalDoc || data.email === void 0) return false;
  return String(data.email || "").trim() !== String(originalDoc.email || "").trim();
}
function shouldResetPhoneVerified(originalDoc, data) {
  if (!originalDoc || data.phone === void 0) return false;
  return String(data.phone || "").trim() !== String(originalDoc.phone || "").trim();
}
var init_user_verification_reset = __esm({
  "packages/backend/src/lib/user-verification-reset.ts"() {
    "use strict";
  }
});

// packages/backend/src/collections/users/index.ts
var users_exports = {};
__export(users_exports, {
  Users: () => Users
});
var adminOnly, canAccessAdmin, Users;
var init_users = __esm({
  "packages/backend/src/collections/users/index.ts"() {
    "use strict";
    init_is_admin();
    init_is_self_or_admin();
    init_auth_config();
    init_user_verification_reset();
    adminOnly = ({ req }) => req.user?.role === "admin";
    canAccessAdmin = ({ req }) => req.user?.role === "admin" || req.user?.role === "vendor";
    Users = {
      slug: "users",
      auth: {
        tokenExpiration: 7200,
        // 2 hours
        verify: false,
        maxLoginAttempts: 5,
        lockTime: 600 * 1e3,
        // 10 minutes
        // Decision #18: login with email OR phone. username stores the login identifier (email or phone).
        loginWithUsername: { allowEmailLogin: true }
      },
      admin: {
        useAsTitle: "username",
        defaultColumns: ["username", "email", "phone", "role", "status", "createdAt"],
        group: "Platform"
      },
      access: {
        admin: canAccessAdmin,
        // Only admins can access the admin panel (create-first-user allows when no users exist)
        create: () => true,
        // Public registration
        read: isSelfOrAdmin,
        update: isSelfOrAdmin,
        delete: isAdmin
      },
      fields: [
        // ─── Identity: email OR phone required ────────────────────────────────────
        {
          name: "email",
          type: "email",
          unique: true,
          admin: {
            description: "Required if phone is not provided (configurable via AUTH_REQUIRED_IDENTIFIER)."
          }
        },
        {
          name: "phone",
          type: "text",
          unique: true,
          admin: {
            description: "Required if email is not provided (configurable via AUTH_REQUIRED_IDENTIFIER)."
          }
        },
        {
          name: "username",
          type: "text",
          unique: true,
          admin: {
            description: "Login identifier \u2014 auto-set from email or phone. Do not edit.",
            readOnly: true,
            condition: (_, __, { operation }) => operation !== "create"
            // Hide on create (auto-populated); show on edit
          },
          validate: (val) => val && typeof val === "string" && val.trim().length > 0 ? true : "Required"
        },
        // ─── Profile ──────────────────────────────────────────────────────────────
        {
          name: "firstName",
          type: "text"
        },
        {
          name: "lastName",
          type: "text"
        },
        {
          name: "displayName",
          type: "text"
        },
        {
          name: "avatar",
          type: "upload",
          relationTo: "media"
        },
        // ─── Role & Status ────────────────────────────────────────────────────────
        {
          name: "role",
          type: "select",
          required: true,
          defaultValue: "customer",
          options: [
            { label: "Admin", value: "admin" },
            { label: "Vendor", value: "vendor" },
            { label: "Customer", value: "customer" }
          ],
          access: {
            update: adminOnly
          }
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "active",
          options: [
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
            { label: "Banned", value: "banned" }
          ],
          access: {
            update: adminOnly
          }
        },
        // ─── Verification ─────────────────────────────────────────────────────────
        {
          name: "emailVerified",
          type: "checkbox",
          defaultValue: false,
          access: {
            update: adminOnly
          }
        },
        {
          name: "phoneVerified",
          type: "checkbox",
          defaultValue: false,
          access: {
            update: adminOnly
          }
        },
        // ─── Preferences ─────────────────────────────────────────────────────────
        {
          name: "locale",
          type: "select",
          defaultValue: "en",
          options: [
            { label: "English", value: "en" },
            { label: "\u09AC\u09BE\u0982\u09B2\u09BE", value: "bn" }
          ]
        },
        // tenant field added by multivendor plugin when MULTIVENDOR_ENABLED=true
        {
          name: "addresses",
          type: "relationship",
          relationTo: "addresses",
          hasMany: true
        }
      ],
      hooks: {
        beforeValidate: [
          ({ data, originalDoc }) => {
            if (!data) return data;
            const identifier = getAuthRequiredIdentifier();
            validateAuthIdentifier(identifier, data);
            const rawEmail = data.email ?? originalDoc?.email;
            const rawPhone = data.phone ?? originalDoc?.phone;
            const rawUsername = data.username;
            if (!rawEmail && rawUsername && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawUsername).trim())) {
              data.email = String(rawUsername).trim().toLowerCase();
            }
            if (!rawPhone && rawUsername && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawUsername).trim()) && String(rawUsername).trim()) {
              data.phone = String(rawUsername).trim();
            }
            const email = data.email ?? originalDoc?.email;
            const phone = data.phone ?? originalDoc?.phone;
            const loginId = toLoginIdentifier(email, phone, data.username);
            if (loginId) {
              data.username = loginId.toLowerCase();
            }
            if (shouldResetEmailVerified(originalDoc, data)) {
              data.emailVerified = false;
            }
            if (shouldResetPhoneVerified(originalDoc, data)) {
              data.phoneVerified = false;
            }
            return data;
          }
        ]
      },
      timestamps: true
    };
  }
});

// packages/backend/src/lib/media-upload-dir.ts
import path from "node:path";
function getMediaStaticDir() {
  const fromEnv = process.env.PAYLOAD_MEDIA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "media");
}
var init_media_upload_dir = __esm({
  "packages/backend/src/lib/media-upload-dir.ts"() {
    "use strict";
  }
});

// packages/backend/src/collections/media.ts
var media_exports = {};
__export(media_exports, {
  Media: () => Media
});
var Media;
var init_media = __esm({
  "packages/backend/src/collections/media.ts"() {
    "use strict";
    init_is_admin();
    init_media_upload_dir();
    Media = {
      slug: "media",
      upload: {
        staticDir: getMediaStaticDir(),
        imageSizes: [
          {
            name: "thumbnail",
            width: 400,
            height: 300,
            position: "centre"
          },
          {
            name: "card",
            width: 768,
            height: 1024,
            position: "centre"
          },
          {
            name: "tablet",
            width: 1024,
            height: void 0,
            position: "centre"
          }
        ],
        adminThumbnail: "thumbnail",
        mimeTypes: ["image/*", "application/pdf"]
      },
      admin: {
        group: "Platform"
      },
      access: {
        create: ({ req }) => Boolean(req.user),
        read: () => true,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        {
          name: "alt",
          type: "text",
          localized: true
        },
        {
          name: "caption",
          type: "text",
          localized: true
        }
      ]
    };
  }
});

// packages/backend/src/lib/cms-reserved-route-segments.ts
var RESERVED_STOREFRONT_ROUTE_SEGMENTS;
var init_cms_reserved_route_segments = __esm({
  "packages/backend/src/lib/cms-reserved-route-segments.ts"() {
    "use strict";
    RESERVED_STOREFRONT_ROUTE_SEGMENTS = new Set(
      [
        "account",
        "auth",
        "cart",
        "categories",
        "checkout",
        "order",
        "products",
        "track-order",
        "contact",
        "about",
        "compare",
        "bundles",
        // multivendor storefront
        "store",
        "vendors",
        "become-a-vendor"
      ].map((s) => s.toLowerCase())
    );
  }
});

// packages/shared/src/types/index.ts
var init_types = __esm({
  "packages/shared/src/types/index.ts"() {
    "use strict";
  }
});

// packages/shared/src/utils/index.ts
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var init_utils = __esm({
  "packages/shared/src/utils/index.ts"() {
    "use strict";
  }
});

// packages/shared/src/index.ts
var init_src = __esm({
  "packages/shared/src/index.ts"() {
    "use strict";
    init_types();
    init_utils();
  }
});

// packages/backend/src/fields/slug.ts
function stringForSlugify(sourceField, data) {
  const raw2 = data?.[sourceField];
  if (raw2 == null) return void 0;
  if (typeof raw2 === "string") {
    return raw2.trim() || void 0;
  }
  if (typeof raw2 === "object" && !Array.isArray(raw2)) {
    const o = raw2;
    const en2 = o.en;
    if (typeof en2 === "string" && en2.trim()) return en2;
    const bn = o.bn;
    if (typeof bn === "string" && bn.trim()) return bn;
    for (const v of Object.values(o)) {
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return void 0;
}
var slugField;
var init_slug = __esm({
  "packages/backend/src/fields/slug.ts"() {
    "use strict";
    init_src();
    slugField = (sourceField = "title") => ({
      name: "slug",
      type: "text",
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description: `Auto-generated from ${sourceField}. Customize if needed.`
      },
      hooks: {
        beforeValidate: [
          ({
            value,
            data
          }) => {
            if (value) return value;
            const source = stringForSlugify(sourceField, data ?? void 0);
            if (!source) return value;
            return slugify(source);
          }
        ]
      }
    });
  }
});

// packages/backend/src/collections/pages/blocks.ts
var pageLayoutBlocks;
var init_blocks = __esm({
  "packages/backend/src/collections/pages/blocks.ts"() {
    "use strict";
    pageLayoutBlocks = [
      {
        slug: "richText",
        labels: { singular: "Rich Text", plural: "Rich Text" },
        fields: [
          {
            name: "content",
            type: "richText"
          }
        ]
      },
      {
        slug: "hero",
        labels: { singular: "Hero", plural: "Hero sections" },
        fields: [
          {
            name: "heading",
            type: "text",
            localized: true
          },
          {
            name: "subheading",
            type: "textarea",
            localized: true
          },
          {
            name: "backgroundImage",
            type: "upload",
            relationTo: "media"
          },
          {
            name: "ctaLabel",
            type: "text",
            localized: true
          },
          {
            name: "ctaUrl",
            type: "text"
          }
        ]
      },
      {
        slug: "image",
        labels: { singular: "Image", plural: "Images" },
        fields: [
          {
            name: "image",
            type: "upload",
            relationTo: "media",
            required: true
          },
          {
            name: "alt",
            type: "text"
          },
          {
            name: "caption",
            type: "text"
          },
          {
            name: "variant",
            type: "select",
            defaultValue: "rounded",
            options: [
              { label: "Rounded", value: "rounded" },
              { label: "Full width", value: "full" }
            ]
          }
        ]
      },
      {
        slug: "splitSection",
        labels: { singular: "Image + text", plural: "Image + text" },
        fields: [
          {
            name: "image",
            type: "upload",
            relationTo: "media",
            required: true
          },
          {
            name: "imagePosition",
            type: "select",
            defaultValue: "left",
            options: [
              { label: "Image left", value: "left" },
              { label: "Image right", value: "right" }
            ]
          },
          {
            name: "body",
            type: "richText"
          }
        ]
      },
      {
        slug: "videoEmbed",
        labels: { singular: "Video embed", plural: "Video embeds" },
        fields: [
          {
            name: "title",
            type: "text"
          },
          {
            name: "embedUrl",
            type: "text",
            required: true,
            admin: {
              description: "YouTube or Vimeo watch/embed URL"
            }
          }
        ]
      },
      {
        slug: "faq",
        labels: { singular: "FAQ", plural: "FAQs" },
        fields: [
          {
            name: "heading",
            type: "text"
          },
          {
            name: "items",
            type: "array",
            labels: { singular: "Item", plural: "Items" },
            fields: [
              {
                name: "question",
                type: "text",
                required: true
              },
              {
                name: "answer",
                type: "richText",
                required: true
              }
            ]
          }
        ]
      },
      {
        slug: "callout",
        labels: { singular: "Callout", plural: "Callouts" },
        fields: [
          {
            name: "tone",
            type: "select",
            defaultValue: "muted",
            options: [
              { label: "Muted", value: "muted" },
              { label: "Primary", value: "primary" },
              { label: "Warning", value: "warning" }
            ]
          },
          {
            name: "content",
            type: "richText"
          }
        ]
      },
      {
        slug: "spacer",
        labels: { singular: "Spacer", plural: "Spacers" },
        fields: [
          {
            name: "size",
            type: "select",
            defaultValue: "md",
            options: [
              { label: "Small", value: "sm" },
              { label: "Medium", value: "md" },
              { label: "Large", value: "lg" }
            ]
          }
        ]
      }
    ];
  }
});

// packages/backend/src/collections/pages/index.ts
var pages_exports = {};
__export(pages_exports, {
  Pages: () => Pages
});
var Pages;
var init_pages = __esm({
  "packages/backend/src/collections/pages/index.ts"() {
    "use strict";
    init_is_admin();
    init_cms_reserved_route_segments();
    init_slug();
    init_blocks();
    Pages = {
      slug: "pages",
      admin: {
        useAsTitle: "title",
        defaultColumns: ["title", "slug", "status", "updatedAt"],
        preview: (doc) => {
          const slug = doc?.slug;
          if (!slug) return null;
          const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001";
          return `${baseUrl}/en/${slug}`;
        },
        group: "Content"
      },
      access: {
        create: isAdmin,
        read: ({ req }) => {
          if (req.user?.role === "admin") return true;
          return {
            status: {
              equals: "published"
            }
          };
        },
        update: isAdmin,
        delete: isAdmin
      },
      versions: {
        drafts: true
      },
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
          localized: true
        },
        slugField("title"),
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" }
          ],
          admin: {
            position: "sidebar"
          }
        },
        {
          name: "layout",
          type: "blocks",
          localized: true,
          blocks: pageLayoutBlocks
        },
        // SEO
        {
          name: "meta",
          type: "group",
          label: "SEO",
          fields: [
            {
              name: "title",
              type: "text",
              localized: true
            },
            {
              name: "description",
              type: "textarea",
              localized: true
            },
            {
              name: "image",
              type: "upload",
              relationTo: "media"
            }
          ]
        },
        {
          name: "publishedAt",
          type: "date",
          admin: {
            position: "sidebar",
            date: {
              pickerAppearance: "dayAndTime"
            }
          }
        }
      ],
      hooks: {
        beforeValidate: [
          ({ data }) => {
            const raw2 = data?.slug;
            if (typeof raw2 === "string" && raw2.trim()) {
              const slug = raw2.trim().toLowerCase();
              if (RESERVED_STOREFRONT_ROUTE_SEGMENTS.has(slug)) {
                throw new Error(
                  `Slug "${raw2.trim()}" is reserved for a storefront route. Use a different path (e.g. "about-us" instead of a conflicting single segment).`
                );
              }
            }
            return data;
          }
        ],
        beforeChange: [
          ({ data }) => {
            if (data.status === "published" && !data.publishedAt) {
              return { ...data, publishedAt: (/* @__PURE__ */ new Date()).toISOString() };
            }
            return data;
          }
        ]
      }
    };
  }
});

// packages/backend/src/collections/categories.ts
var categories_exports = {};
__export(categories_exports, {
  Categories: () => Categories
});
var Categories;
var init_categories = __esm({
  "packages/backend/src/collections/categories.ts"() {
    "use strict";
    init_is_admin();
    init_slug();
    Categories = {
      slug: "categories",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "slug", "parent", "isActive", "displayOrder"],
        group: "Catalog"
      },
      access: {
        create: isAdmin,
        read: () => true,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          localized: true
        },
        slugField("name"),
        {
          name: "description",
          type: "richText",
          localized: true
        },
        {
          name: "image",
          type: "upload",
          relationTo: "media"
        },
        {
          name: "parent",
          type: "relationship",
          relationTo: "categories",
          hasMany: false,
          admin: {
            description: "Leave empty for top-level categories."
          }
        },
        {
          name: "displayOrder",
          type: "number",
          defaultValue: 0,
          admin: {
            description: "Lower numbers appear first."
          }
        },
        {
          name: "isActive",
          type: "checkbox",
          defaultValue: true
        },
        {
          name: "commissionOverride",
          type: "number",
          min: 0,
          max: 100,
          admin: {
            description: "Optional: override default platform commission % for products in this category.",
            step: 0.01
          }
        },
        // SEO fields (inline — SEO plugin will be added later)
        {
          name: "meta",
          type: "group",
          label: "SEO",
          fields: [
            {
              name: "title",
              type: "text",
              localized: true
            },
            {
              name: "description",
              type: "textarea",
              localized: true
            },
            {
              name: "image",
              type: "upload",
              relationTo: "media"
            }
          ]
        }
      ]
    };
  }
});

// packages/backend/src/plugins/ecommerce/collections/brands.ts
var Brands;
var init_brands = __esm({
  "packages/backend/src/plugins/ecommerce/collections/brands.ts"() {
    "use strict";
    init_is_admin();
    init_slug();
    Brands = {
      slug: "brands",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "slug", "featured", "displayOrder", "website", "updatedAt"],
        group: "Catalog",
        description: "Manage product brands and manufacturers (logos, hero banners, websites, and official brand profiles)."
      },
      access: {
        read: () => true,
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          localized: true,
          admin: {
            description: 'Brand or manufacturer name (e.g. "Apple", "Samsung", "Dyson")'
          }
        },
        slugField("name"),
        {
          name: "description",
          type: "textarea",
          localized: true,
          admin: {
            description: "Brief description shown on brand landing pages."
          }
        },
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          admin: {
            description: "Brand or manufacturer logo / icon."
          }
        },
        {
          name: "bannerImage",
          type: "upload",
          relationTo: "media",
          admin: {
            description: "Hero banner image displayed on brand showcase pages."
          }
        },
        {
          name: "website",
          type: "text",
          admin: {
            description: "Official brand website URL (e.g. https://www.apple.com)."
          }
        },
        {
          name: "featured",
          type: "checkbox",
          defaultValue: false,
          admin: {
            description: "Show in featured brands sections and home carousels."
          }
        },
        {
          name: "displayOrder",
          type: "number",
          defaultValue: 0,
          admin: {
            description: "Sort weight (lower numbers appear first)."
          }
        },
        {
          name: "meta",
          type: "group",
          label: "SEO",
          fields: [
            {
              name: "title",
              type: "text",
              localized: true
            },
            {
              name: "description",
              type: "textarea",
              localized: true
            },
            {
              name: "image",
              type: "upload",
              relationTo: "media"
            }
          ]
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/ecommerce/collections/attributes.ts
var Attributes;
var init_attributes = __esm({
  "packages/backend/src/plugins/ecommerce/collections/attributes.ts"() {
    "use strict";
    init_is_admin();
    init_slug();
    Attributes = {
      slug: "attributes",
      admin: {
        useAsTitle: "label",
        defaultColumns: ["label", "key", "dataType", "category", "unit", "defaultGroup", "isFilterable", "displayOrder"],
        group: "Catalog",
        description: "Manage reusable product specifications, series, features, and dynamic filter facets with predefined standardized values."
      },
      access: {
        read: () => true,
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          localized: true,
          admin: {
            description: 'Display name (e.g. "Screen Refresh Rate", "Battery Capacity", "RAM", "Water Resistance", "Series")'
          }
        },
        {
          name: "key",
          type: "text",
          required: true,
          unique: true,
          index: true,
          admin: {
            description: 'Unique internal code (e.g. "refresh_rate", "battery_capacity", "ram", "water_resistance", "series")'
          }
        },
        slugField("label"),
        {
          name: "dataType",
          type: "select",
          required: true,
          defaultValue: "select",
          index: true,
          options: [
            { label: "Select (Predefined Options - Single Choice)", value: "select" },
            { label: "Multi-Select (Predefined Options - Multiple Choices)", value: "multiselect" },
            { label: "Text (Freeform Text)", value: "text" },
            { label: "Number (Numeric Value with Unit)", value: "number" },
            { label: "Boolean (Yes / No Toggle)", value: "boolean" },
            { label: "Color Swatch", value: "color" }
          ],
          admin: {
            description: "Data input type. Use Select or Multi-Select to provide standardized predefined values for fast one-click assignment and clean facet filters."
          }
        },
        {
          name: "category",
          type: "select",
          required: true,
          defaultValue: "specification",
          index: true,
          options: [
            { label: "Technical Specification", value: "specification" },
            { label: "Product Series / Line", value: "series" },
            { label: "Feature", value: "feature" },
            { label: "Material & Build", value: "material" },
            { label: "Connectivity & Network", value: "connectivity" },
            { label: "Compatibility", value: "compatibility" },
            { label: "Certification & Durability", value: "certification" },
            { label: "Dimensions & Weight", value: "dimensions" },
            { label: "General / Miscellaneous", value: "general" }
          ],
          admin: {
            description: "High-level attribute category for grouping and facet classification."
          }
        },
        {
          name: "unit",
          type: "text",
          admin: {
            description: 'Measurement unit suffix (e.g. "mAh", "W", "GB", "inch", "Hz", "kg", "V").'
          }
        },
        {
          name: "defaultGroup",
          type: "text",
          admin: {
            description: 'Default specification section group on PDP (e.g. "Display", "Performance", "Battery & Charging", "Connectivity", "General").'
          }
        },
        {
          name: "options",
          type: "array",
          labels: {
            singular: "Predefined Option / Value",
            plural: "Predefined Options / Values"
          },
          admin: {
            description: "Standardized predefined values for one-click assignment to any product without manual typing.",
            condition: (data) => data?.dataType === "select" || data?.dataType === "multiselect" || data?.dataType === "color"
          },
          fields: [
            {
              name: "label",
              type: "text",
              required: true,
              localized: true,
              admin: {
                description: 'Option label (e.g. "120Hz LTPO OLED", "IP68 Water Resistant", "16 GB", "Natural Titanium")'
              }
            },
            {
              name: "value",
              type: "text",
              required: true,
              admin: {
                description: 'Stored filter key/value (e.g. "120hz-ltpo-oled", "ip68", "16gb", "natural-titanium")'
              }
            },
            {
              name: "hexColor",
              type: "text",
              admin: {
                description: 'Optional hex color code for visual swatches (e.g. "#A2AAAD" for Silver).'
              }
            }
          ]
        },
        {
          name: "isFilterable",
          type: "checkbox",
          defaultValue: true,
          admin: {
            description: "Enable catalog facet filtering for this attribute."
          }
        },
        {
          name: "isComparable",
          type: "checkbox",
          defaultValue: true,
          admin: {
            description: "Include this attribute in product comparison tables."
          }
        },
        {
          name: "featured",
          type: "checkbox",
          defaultValue: false,
          admin: {
            description: "Show in featured specifications/facets sections on the storefront."
          }
        },
        {
          name: "displayOrder",
          type: "number",
          defaultValue: 0,
          admin: {
            description: "Sort weight (lower numbers appear first)."
          }
        },
        {
          name: "description",
          type: "textarea",
          localized: true,
          admin: {
            description: "Brief description shown on attribute or facet landing pages."
          }
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/ecommerce/collections/classes.ts
var Classes;
var init_classes = __esm({
  "packages/backend/src/plugins/ecommerce/collections/classes.ts"() {
    "use strict";
    init_is_admin();
    init_slug();
    Classes = {
      slug: "classes",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "slug", "icon", "updatedAt"],
        group: "Catalog",
        description: "Manage dynamic Product Classes (Specification Templates / Attribute Sets) composed of reusable Attributes organized into logical groups."
      },
      access: {
        read: () => true,
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          localized: true,
          admin: {
            description: 'Class / Template name (e.g. "Smartphone", "Laptop", "Power Bank", "Audio & Headphones")'
          }
        },
        slugField("name"),
        {
          name: "description",
          type: "textarea",
          localized: true,
          admin: {
            description: "Optional description of this product class and its specification template."
          }
        },
        {
          name: "icon",
          type: "text",
          admin: {
            description: 'Optional icon identifier (e.g. "smartphone", "laptop", "battery", "headphones", "camera").'
          }
        },
        {
          name: "groups",
          type: "array",
          labels: {
            singular: "Attribute Group",
            plural: "Attribute Groups"
          },
          admin: {
            description: 'Curated specification sections (e.g. "Display & Screen", "Performance & Memory", "Battery & Charging").'
          },
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
              localized: true,
              admin: {
                description: 'Group header name (e.g. "Display & Screen", "Battery & Charging", "Connectivity").'
              }
            },
            {
              name: "displayOrder",
              type: "number",
              defaultValue: 0,
              admin: {
                description: "Section display sort order (lower numbers appear first)."
              }
            },
            {
              name: "attributes",
              type: "array",
              labels: {
                singular: "Attribute Item",
                plural: "Attribute Items"
              },
              admin: {
                description: "Reusable global attributes included in this template group."
              },
              fields: [
                {
                  name: "attribute",
                  type: "relationship",
                  relationTo: "attributes",
                  required: true,
                  admin: {
                    description: "Global attribute definition from the catalog."
                  }
                },
                {
                  name: "isRequired",
                  type: "checkbox",
                  defaultValue: false,
                  admin: {
                    description: "Whether this attribute must be filled in for products in this class."
                  }
                },
                {
                  name: "displayOrder",
                  type: "number",
                  defaultValue: 0,
                  admin: {
                    description: "Sort order of this attribute within this group."
                  }
                },
                {
                  name: "helpText",
                  type: "text",
                  localized: true,
                  admin: {
                    description: "Optional guidance or tooltip for admin content managers."
                  }
                }
              ]
            }
          ]
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/access/is-admin-or-vendor-owner.ts
var isAdminOrVendorOwner;
var init_is_admin_or_vendor_owner = __esm({
  "packages/backend/src/access/is-admin-or-vendor-owner.ts"() {
    "use strict";
    isAdminOrVendorOwner = ({ req }) => {
      const user = req.user;
      if (!user) return false;
      if (user.role === "admin") return true;
      if (user.role === "vendor" && user.tenant) {
        const tenantId = typeof user.tenant === "object" ? user.tenant.id : user.tenant;
        return {
          tenant: {
            equals: tenantId
          }
        };
      }
      return false;
    };
  }
});

// packages/backend/src/lib/currencies.ts
function getSupportedCurrencyCodes() {
  return (process.env.SUPPORTED_CURRENCIES || "USD,BDT").split(",").map((c) => c.trim()).filter(Boolean);
}
function getCurrencyOptions() {
  return getSupportedCurrencyCodes().map((code) => ({
    label: LABELS[code] ?? code,
    value: code
  }));
}
function getDefaultCurrency() {
  const supported = getSupportedCurrencyCodes();
  const preferred = (process.env.DEFAULT_CURRENCY || "USD").trim();
  if (supported.length === 0) return preferred || "USD";
  if (supported.includes(preferred)) return preferred;
  return supported[0];
}
var LABELS;
var init_currencies = __esm({
  "packages/backend/src/lib/currencies.ts"() {
    "use strict";
    LABELS = {
      USD: "US Dollar (USD)",
      BDT: "Bangladeshi Taka (BDT)"
    };
  }
});

// packages/backend/src/lib/specifications-query.ts
function parseSpecsFromSearchParams(searchParams) {
  const specs = {};
  let productClass;
  const entries = searchParams instanceof URLSearchParams ? Array.from(searchParams.entries()) : Object.entries(searchParams);
  for (const [rawKey, rawVal] of entries) {
    if (rawVal === void 0 || rawVal === null) continue;
    const key = rawKey.trim();
    if (key === "class" || key === "productClass") {
      const v = Array.isArray(rawVal) ? rawVal[0] : rawVal;
      if (v?.trim()) productClass = v.trim();
      continue;
    }
    if (key === "specs" && typeof rawVal === "object" && rawVal !== null && !Array.isArray(rawVal)) {
      for (const [subKey, subVal] of Object.entries(rawVal)) {
        if (!subKey || subVal === void 0 || subVal === null) continue;
        const paramKey2 = subKey.trim();
        const valuesArray = Array.isArray(subVal) ? subVal : [subVal];
        const values = [];
        for (const item of valuesArray) {
          if (typeof item === "string") {
            item.split(",").forEach((val) => {
              const clean = val.trim();
              if (clean && !values.includes(clean)) {
                values.push(clean);
              }
            });
          }
        }
        if (values.length > 0) {
          if (!specs[paramKey2]) specs[paramKey2] = [];
          for (const v of values) {
            if (!specs[paramKey2].includes(v)) specs[paramKey2].push(v);
          }
        }
      }
      continue;
    }
    let paramKey = null;
    const bracketMatch = key.match(/^specs\[([^\]]+)\](?:\[\])?$/);
    if (bracketMatch) {
      paramKey = bracketMatch[1].trim();
    } else if (key.startsWith("specs.")) {
      paramKey = key.slice(6).trim();
    }
    if (paramKey) {
      const valuesArray = Array.isArray(rawVal) ? rawVal : [rawVal];
      const values = [];
      for (const item of valuesArray) {
        if (typeof item === "string") {
          item.split(",").forEach((val) => {
            const clean = val.trim();
            if (clean && !values.includes(clean)) {
              values.push(clean);
            }
          });
        }
      }
      if (values.length > 0) {
        if (!specs[paramKey]) {
          specs[paramKey] = [];
        }
        for (const v of values) {
          if (!specs[paramKey].includes(v)) {
            specs[paramKey].push(v);
          }
        }
      }
    }
  }
  return { productClass, specs };
}
async function getMatchingProductIdsForSpecs(payload, specsFilter, productClassIdOrSlug) {
  const specKeys = Object.keys(specsFilter).filter((k) => specsFilter[k].length > 0);
  if (specKeys.length === 0 && !productClassIdOrSlug) {
    return void 0;
  }
  let resolvedClassId = productClassIdOrSlug;
  if (productClassIdOrSlug) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productClassIdOrSlug);
      if (!isUUID) {
        const { docs } = await payload.find({
          collection: "classes",
          where: { slug: { equals: productClassIdOrSlug } },
          limit: 1,
          depth: 0,
          overrideAccess: true
        });
        if (docs.length > 0) {
          resolvedClassId = String(docs[0].id);
        }
      }
    } catch {
    }
  }
  const db = payload.db?.drizzle || payload.db;
  if (db && typeof db.execute === "function") {
    try {
      const { sql: sql11 } = await import("@payloadcms/db-postgres");
      let candidateIds = null;
      if (resolvedClassId) {
        const classRows = await db.execute(sql11`
          SELECT id FROM "products" WHERE "product_class_id" = ${resolvedClassId}::uuid
        `);
        const classIds = /* @__PURE__ */ new Set();
        const rows = classRows.rows || classRows;
        for (const r of rows) {
          classIds.add(String(r.id));
        }
        candidateIds = classIds;
        if (candidateIds.size === 0) return [];
      }
      for (const key of specKeys) {
        const vals = specsFilter[key];
        if (vals.length === 0) continue;
        const valSqls = vals.map((v) => sql11`${v}`);
        const specRows = await db.execute(sql11`
          SELECT DISTINCT "_parent_id" AS id
          FROM "products_specifications"
          WHERE "key" = ${key} AND "value" = ANY(ARRAY[${sql11.join(valSqls, sql11`, `)}])
        `);
        const matchingForThisKey = /* @__PURE__ */ new Set();
        const rows = specRows.rows || specRows;
        for (const r of rows) {
          matchingForThisKey.add(String(r.id));
        }
        if (candidateIds === null) {
          candidateIds = matchingForThisKey;
        } else {
          const next = /* @__PURE__ */ new Set();
          for (const id of Array.from(candidateIds)) {
            if (matchingForThisKey.has(id)) next.add(id);
          }
          candidateIds = next;
        }
        if (candidateIds.size === 0) return [];
      }
      return candidateIds !== null ? Array.from(candidateIds) : void 0;
    } catch (e) {
      payload.logger?.warn?.(`[SpecificationsQuery] SQL query notice: ${e?.message || e}. Using fallback.`);
    }
  }
  try {
    const where = {};
    if (resolvedClassId) {
      where.productClass = { equals: resolvedClassId };
    }
    const { docs } = await payload.find({
      collection: "products",
      where,
      limit: 5e3,
      depth: 0,
      overrideAccess: true
    });
    const matchingIds = [];
    for (const doc of docs) {
      const specs = doc.specifications;
      if (!specs || !Array.isArray(specs)) continue;
      let allKeysMatch = true;
      for (const key of specKeys) {
        const vals = specsFilter[key];
        const hasMatch = specs.some(
          (s) => s.key === key && vals.some((v) => v.toLowerCase() === String(s.value).toLowerCase())
        );
        if (!hasMatch) {
          allKeysMatch = false;
          break;
        }
      }
      if (allKeysMatch) {
        matchingIds.push(String(doc.id));
      }
    }
    return matchingIds;
  } catch {
    return void 0;
  }
}
var init_specifications_query = __esm({
  "packages/backend/src/lib/specifications-query.ts"() {
    "use strict";
  }
});

// packages/backend/src/endpoints/storefront-facets.ts
async function aggregateCatalogFacets(payload, options) {
  const { category, productClass, storeId, locale = "en" } = options;
  let storeProductIds;
  if (storeId) {
    const { docs: stockRows } = await payload.find({
      collection: "stock-levels",
      where: { location: { equals: storeId } },
      limit: 1e4,
      depth: 0,
      overrideAccess: true
    });
    const availableIds = /* @__PURE__ */ new Set();
    for (const row of stockRows) {
      const qty = Number(row.quantity) || 0;
      const reserved = Number(row.reservedQuantity) || 0;
      if (qty - reserved > 0) {
        const pRef = row.product;
        const pid = typeof pRef === "object" && pRef !== null ? pRef.id : String(pRef);
        if (pid) availableIds.add(pid);
      }
    }
    storeProductIds = Array.from(availableIds);
    if (storeProductIds.length === 0) {
      return { classes: [], facets: [] };
    }
  }
  let resolvedCategoryId = category;
  if (category) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
    if (!isUUID) {
      const { docs: catDocs } = await payload.find({
        collection: "categories",
        where: { slug: { equals: category } },
        limit: 1,
        depth: 0,
        overrideAccess: true
      });
      if (catDocs.length > 0) {
        resolvedCategoryId = String(catDocs[0].id);
      }
    }
  }
  let resolvedClassId = productClass;
  if (productClass) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productClass);
    if (!isUUID) {
      const { docs: classDocs } = await payload.find({
        collection: "classes",
        where: { slug: { equals: productClass } },
        limit: 1,
        depth: 0,
        overrideAccess: true
      });
      if (classDocs.length > 0) {
        resolvedClassId = String(classDocs[0].id);
      }
    }
  }
  const andClauses = [{ status: { equals: "published" } }];
  if (storeProductIds) {
    andClauses.push({ id: { in: storeProductIds } });
  }
  if (resolvedCategoryId) {
    andClauses.push({ categories: { in: [resolvedCategoryId] } });
  }
  if (resolvedClassId) {
    andClauses.push({ productClass: { equals: resolvedClassId } });
  }
  const where = andClauses.length === 1 ? andClauses[0] : { and: andClauses };
  const { docs: products } = await payload.find({
    collection: "products",
    where,
    limit: 5e3,
    depth: 0,
    overrideAccess: true,
    locale
  });
  const classIdsInScope = /* @__PURE__ */ new Set();
  for (const prod of products) {
    const pClass = prod.productClass;
    const cid = typeof pClass === "object" && pClass !== null ? pClass.id : pClass;
    if (cid) classIdsInScope.add(String(cid));
  }
  if (classIdsInScope.size === 0) {
    if (resolvedClassId) {
      classIdsInScope.add(resolvedClassId);
    } else {
      return { classes: [], facets: [] };
    }
  }
  const { docs: classesDocs } = await payload.find({
    collection: "classes",
    where: { id: { in: Array.from(classIdsInScope) } },
    limit: 100,
    depth: 2,
    overrideAccess: true,
    locale
  });
  const classMap = /* @__PURE__ */ new Map();
  for (const c of classesDocs) {
    classMap.set(String(c.id), c);
  }
  const countsMap = /* @__PURE__ */ new Map();
  for (const prod of products) {
    const pClass = prod.productClass;
    const cid = String(typeof pClass === "object" && pClass !== null ? pClass.id : pClass);
    if (!cid || !classMap.has(cid)) continue;
    if (!countsMap.has(cid)) {
      countsMap.set(cid, /* @__PURE__ */ new Map());
    }
    const classCounts = countsMap.get(cid);
    const specs = prod.specifications;
    if (specs && Array.isArray(specs)) {
      for (const spec of specs) {
        if (!spec.key || spec.value === void 0 || spec.value === null) continue;
        const k = spec.key;
        const v = String(spec.value).trim();
        if (!v) continue;
        if (!classCounts.has(k)) {
          classCounts.set(k, /* @__PURE__ */ new Map());
        }
        const valMap = classCounts.get(k);
        valMap.set(v, (valMap.get(v) || 0) + 1);
      }
    }
  }
  const classesResult = [];
  const facetsResult = [];
  for (const c of classesDocs) {
    const cid = String(c.id);
    const classCounts = countsMap.get(cid) || /* @__PURE__ */ new Map();
    const rawParamsMap = /* @__PURE__ */ new Map();
    if (Array.isArray(c.groups)) {
      for (const grp of c.groups) {
        if (Array.isArray(grp.attributes)) {
          for (const item of grp.attributes) {
            const a = typeof item.attribute === "object" && item.attribute !== null ? item.attribute : null;
            if (a && a.key && !rawParamsMap.has(a.key)) {
              rawParamsMap.set(a.key, {
                key: a.key,
                label: a.label,
                type: a.dataType || "select",
                options: a.options,
                unit: a.unit,
                isFilterable: a.isFilterable !== false,
                isRequired: Boolean(item.isRequired),
                displayOrder: Number(item.displayOrder) || Number(a.displayOrder) || 0
              });
            }
          }
        }
      }
    }
    if (Array.isArray(c.parameters)) {
      for (const param of c.parameters) {
        if (param && param.key && !rawParamsMap.has(param.key)) {
          rawParamsMap.set(param.key, param);
        }
      }
    }
    const rawParams = Array.from(rawParamsMap.values());
    const formattedParams = [];
    for (const param of rawParams) {
      if (param.isFilterable === false) continue;
      const paramKey = param.key;
      const valCounts = classCounts.get(paramKey) || /* @__PURE__ */ new Map();
      let optionsList = [];
      if ((param.type === "select" || param.type === "multiselect") && Array.isArray(param.options)) {
        for (const opt of param.options) {
          const optVal = String(opt.value);
          const optLabel = typeof opt.label === "object" ? opt.label?.[locale] || opt.label?.en || optVal : String(opt.label || optVal);
          const count = valCounts.get(optVal) || 0;
          optionsList.push({
            value: optVal,
            label: optLabel,
            count
          });
        }
      } else {
        for (const [val, count] of valCounts.entries()) {
          optionsList.push({
            value: val,
            label: val,
            count
          });
        }
        optionsList.sort((a, b) => b.count - a.count);
      }
      if (!resolvedClassId) {
        optionsList = optionsList.filter((o) => o.count > 0);
      }
      if (optionsList.length > 0) {
        const paramLabel = typeof param.label === "object" ? param.label?.[locale] || param.label?.en || paramKey : String(param.label || paramKey);
        formattedParams.push({
          key: paramKey,
          label: paramLabel,
          type: param.type || "text",
          unit: param.unit || null,
          isFilterable: true,
          isRequired: Boolean(param.isRequired),
          displayOrder: Number(param.displayOrder) || 0,
          options: optionsList
        });
        facetsResult.push({
          classId: cid,
          className: typeof c.name === "object" ? c.name?.[locale] || c.name?.en || c.slug : String(c.name || c.slug),
          classSlug: c.slug,
          key: paramKey,
          label: paramLabel,
          type: param.type || "text",
          unit: param.unit || null,
          displayOrder: Number(param.displayOrder) || 0,
          options: optionsList
        });
      }
    }
    if (formattedParams.length > 0 || resolvedClassId === cid) {
      classesResult.push({
        id: cid,
        name: typeof c.name === "object" ? c.name?.[locale] || c.name?.en || c.slug : String(c.name || c.slug),
        slug: c.slug,
        description: typeof c.description === "object" ? c.description?.[locale] || c.description?.en : c.description,
        parameters: formattedParams
      });
    }
  }
  facetsResult.sort((a, b) => a.displayOrder - b.displayOrder);
  return { classes: classesResult, facets: facetsResult };
}
var storefrontFacetsEndpoint, productsFacetsEndpoint, productsCollectionFacetsEndpoint;
var init_storefront_facets = __esm({
  "packages/backend/src/endpoints/storefront-facets.ts"() {
    "use strict";
    storefrontFacetsEndpoint = {
      path: "/storefront/facets",
      method: "get",
      handler: async (req) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const qs = url.searchParams;
        const category = qs.get("category") ?? void 0;
        const productClass = qs.get("class") ?? qs.get("productClass") ?? void 0;
        const storeId = qs.get("store") ?? void 0;
        const locale = qs.get("locale") ?? "en";
        try {
          const data = await aggregateCatalogFacets(req.payload, {
            category,
            productClass,
            storeId,
            locale
          });
          return Response.json(data, {
            status: 200,
            headers: {
              "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
            }
          });
        } catch (err) {
          req.payload.logger?.error(`[Storefront Facets Endpoint] ${err?.message || err}`);
          return Response.json({ error: "Failed to aggregate facets" }, { status: 500 });
        }
      }
    };
    productsFacetsEndpoint = {
      path: "/products/facets",
      method: "get",
      handler: storefrontFacetsEndpoint.handler
    };
    productsCollectionFacetsEndpoint = {
      path: "/facets",
      method: "get",
      handler: storefrontFacetsEndpoint.handler
    };
  }
});

// packages/backend/src/plugins/ecommerce/collections/products.ts
import {
  APIError
} from "payload";
import { randomBytes } from "node:crypto";
function sanitizeSkuPart(raw2, maxLen) {
  const s = raw2.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, maxLen);
  return s.length > 0 ? s.toUpperCase() : "X";
}
async function isProductSkuTaken(payload, sku, excludeProductId) {
  const { docs } = await payload.find({
    collection: "products",
    where: { sku: { equals: sku } },
    limit: 5,
    depth: 0,
    overrideAccess: true
  });
  if (docs.length === 0) return false;
  if (docs.length === 1 && excludeProductId != null && String(docs[0].id) === String(excludeProductId)) {
    return false;
  }
  return true;
}
async function generateUniqueProductSku(args) {
  const { payload, source, excludeProductId } = args;
  const base = sanitizeSkuPart(source, 64);
  for (let attempt = 0; attempt < 16; attempt++) {
    const entropy = attempt === 0 ? "" : `-${randomBytes(3).toString("hex").toUpperCase()}`;
    const candidate = `${base}${entropy}`.replace(/-+/g, "-").slice(0, 96);
    if (!await isProductSkuTaken(payload, candidate, excludeProductId)) {
      return candidate;
    }
  }
  return `${base}-${randomBytes(8).toString("hex").toUpperCase()}`.slice(0, 96);
}
function getSkuAutofillPolicy() {
  const raw2 = process.env.SKU_AUTOFILL_POLICY?.trim().toLowerCase();
  if (raw2 === "always" || raw2 === "on-publish" || raw2 === "never") {
    return raw2;
  }
  return "on-publish";
}
function toId(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = value.id;
    return id == null ? null : String(id);
  }
  return String(value);
}
function normalizeTenantId(value) {
  const id = toId(value);
  if (!id) return null;
  return id;
}
function enforceBundleRules(multivendorEnabled) {
  return async ({ data, req }) => {
    if (!data || typeof data !== "object") {
      return data;
    }
    const productTypeRaw = data.productType;
    const productType = productTypeRaw === "bundle" ? "bundle" : "standard";
    if (productType !== "bundle") {
      return data;
    }
    ;
    data.hasVariants = false;
    const status = String(data.status ?? "draft");
    const rawItems = data.bundleItems;
    const bundleItems = Array.isArray(rawItems) ? rawItems : [];
    if (status === "published" && bundleItems.length === 0) {
      throw new Error("Published bundle products require at least one bundle item.");
    }
    if (!req.payload) {
      return data;
    }
    const bundleOwnerTenantId = normalizeTenantId(data.tenant);
    const isPlatformBundle = bundleOwnerTenantId == null;
    for (const row of bundleItems) {
      if (!row || typeof row !== "object") {
        throw new Error("Each bundle item must be a valid object.");
      }
      const item = row;
      const childProductId = toId(item.product);
      if (!childProductId) {
        throw new Error("Each bundle item requires a product.");
      }
      const childProduct = await req.payload.findByID({
        collection: "products",
        id: childProductId,
        depth: 0,
        overrideAccess: true
      });
      if (!childProduct) {
        throw new Error(`Bundle item product not found: ${childProductId}`);
      }
      const childType = String(childProduct.productType ?? "standard");
      if (childType === "bundle") {
        throw new Error("Nested bundles are not allowed in bundle items.");
      }
      if (status === "published" && String(childProduct.status ?? "draft") !== "published") {
        throw new Error(`Published bundles can only include published products (item: ${childProductId}).`);
      }
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error("Each bundle item quantity must be at least 1.");
      }
      if (multivendorEnabled) {
        const childTenantId = normalizeTenantId(childProduct.tenant);
        if (isPlatformBundle) {
          if (childTenantId != null) {
            throw new Error("Platform-owned bundles can only include platform-owned products.");
          }
        } else if (childTenantId !== bundleOwnerTenantId) {
          throw new Error("Bundle items must belong to the same vendor as the bundle product.");
        }
      }
      const variantId = toId(item.variant);
      if (variantId) {
        const variant = await req.payload.findByID({
          collection: "product-variants",
          id: variantId,
          depth: 0,
          overrideAccess: true
        });
        if (!variant) {
          throw new Error(`Bundle item variant not found: ${variantId}`);
        }
        const variantProductId = toId(variant.product);
        if (variantProductId !== childProductId) {
          throw new Error(`Bundle item variant ${variantId} does not belong to product ${childProductId}.`);
        }
        if (status === "published" && variant.isActive === false) {
          throw new Error(`Published bundles can only include active variants (item variant: ${variantId}).`);
        }
      }
    }
    return data;
  };
}
function createProductsConfig(multivendorEnabled = false) {
  const fields = [
    { name: "name", type: "text", required: true, localized: true },
    slugField("name"),
    {
      name: "description",
      type: "richText",
      localized: true
    },
    {
      name: "shortDescription",
      type: "textarea",
      localized: true
    },
    { name: "sku", type: "text" },
    {
      name: "productType",
      type: "select",
      required: true,
      defaultValue: "standard",
      options: [
        { label: "Standard", value: "standard" },
        { label: "Bundle", value: "bundle" }
      ]
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Pending Review", value: "pending-review" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" }
      ]
    },
    { name: "featured", type: "checkbox", defaultValue: false },
    {
      name: "brand",
      type: "relationship",
      relationTo: "brands",
      hasMany: false,
      admin: {
        description: "The brand or manufacturer for this product."
      }
    },
    {
      name: "categories",
      type: "relationship",
      relationTo: "categories",
      hasMany: true
    },
    {
      name: "productClass",
      type: "relationship",
      relationTo: "classes",
      hasMany: false,
      admin: {
        description: 'Dynamic Specification Template / Class (e.g., "Power Bank", "Smartphone", "Headphones"). Products inherit defined parameters.'
      }
    },
    {
      name: "specifications",
      type: "array",
      labels: {
        singular: "Specification",
        plural: "Specifications"
      },
      admin: {
        description: "Structured technical specifications inherited from the assigned Product Class.",
        components: {
          Field: "/components/admin/ProductSpecificationsField"
        }
      },
      fields: [
        {
          name: "attribute",
          type: "relationship",
          relationTo: "attributes",
          hasMany: false,
          admin: {
            description: "Associated global attribute definition if linked."
          }
        },
        { name: "key", type: "text", required: true },
        { name: "label", type: "text", required: true },
        { name: "value", type: "text", required: true },
        { name: "values", type: "json" },
        { name: "unit", type: "text" },
        { name: "group", type: "text" },
        { name: "isCustom", type: "checkbox", defaultValue: false },
        { name: "isAdHoc", type: "checkbox", defaultValue: false },
        { name: "displayOrder", type: "number", defaultValue: 0 }
      ]
    },
    {
      name: "tags",
      type: "array",
      fields: [{ name: "tag", type: "text" }]
    },
    {
      name: "images",
      type: "array",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true
        }
      ]
    },
    { name: "basePrice", type: "number", required: true, min: 0 },
    { name: "compareAtPrice", type: "number", min: 0 },
    {
      name: "saleDisplayMode",
      type: "select",
      required: true,
      defaultValue: "strike_through",
      options: [
        { label: "None (hide compare-at & badges)", value: "none" },
        { label: "Strikethrough compare-at only", value: "strike_through" },
        { label: "Badge: % off", value: "badge_percent" },
        { label: "Badge: amount saved", value: "badge_amount" },
        { label: "Strikethrough + badge", value: "strike_and_badge" }
      ],
      admin: {
        description: "How to show savings when compare-at price is higher than selling price. Variants can override."
      }
    },
    { name: "costPrice", type: "number", min: 0 },
    {
      name: "currency",
      type: "select",
      required: true,
      defaultValue: getDefaultCurrency(),
      options: getCurrencyOptions()
    },
    { name: "taxable", type: "checkbox", defaultValue: true },
    { name: "weight", type: "number", min: 0 },
    {
      name: "dimensions",
      type: "group",
      fields: [
        { name: "length", type: "number", min: 0 },
        { name: "width", type: "number", min: 0 },
        { name: "height", type: "number", min: 0 }
      ]
    },
    { name: "hasVariants", type: "checkbox", defaultValue: false },
    {
      name: "bundleItems",
      type: "array",
      fields: [
        {
          name: "product",
          type: "relationship",
          relationTo: "products",
          required: true
        },
        {
          name: "variant",
          type: "relationship",
          relationTo: "product-variants"
        },
        { name: "quantity", type: "number", required: true, min: 1, defaultValue: 1 }
      ]
    },
    {
      name: "meta",
      type: "group",
      label: "SEO",
      fields: [
        { name: "title", type: "text", localized: true },
        { name: "description", type: "textarea", localized: true },
        { name: "image", type: "upload", relationTo: "media" }
      ]
    },
    { name: "publishedAt", type: "date" },
    {
      name: "rating",
      type: "number",
      defaultValue: 0,
      admin: { readOnly: true, description: "Aggregated from approved product reviews." }
    },
    {
      name: "totalReviews",
      type: "number",
      defaultValue: 0,
      admin: { readOnly: true, description: "Total approved product reviews." }
    }
  ];
  if (multivendorEnabled) {
    fields.unshift({
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      admin: { description: "Vendor (tenant) who owns this product." }
    });
  }
  return {
    slug: "products",
    admin: {
      useAsTitle: "name",
      defaultColumns: multivendorEnabled ? ["name", "brand", "slug", "tenant", "status", "basePrice", "currency", "publishedAt"] : ["name", "brand", "slug", "status", "basePrice", "currency", "publishedAt"],
      group: "Ecommerce"
    },
    access: {
      create: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      read: ({ req }) => {
        if (!req.user) return { status: { equals: "published" } };
        if (req.user.role === "admin") return true;
        if (multivendorEnabled && req.user.role === "vendor") return isAdminOrVendorOwner({ req });
        return { status: { equals: "published" } };
      },
      update: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      delete: multivendorEnabled ? isAdminOrVendorOwner : isAdmin
    },
    hooks: {
      beforeValidate: [
        ...multivendorEnabled ? [autoAssignTenantForVendor] : [],
        ensureProductSkuAutofill,
        validateClassSpecifications,
        enforceBundleRules(multivendorEnabled)
      ],
      beforeOperation: [applySpecificationFacetFilters]
    },
    endpoints: [productsCollectionFacetsEndpoint],
    fields,
    timestamps: true
  };
}
var autoAssignTenantForVendor, ensureProductSkuAutofill, validateClassSpecifications, applySpecificationFacetFilters, Products;
var init_products = __esm({
  "packages/backend/src/plugins/ecommerce/collections/products.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_owner();
    init_slug();
    init_currencies();
    init_specifications_query();
    init_storefront_facets();
    autoAssignTenantForVendor = ({ data, req }) => {
      if (!data) return data;
      if (req.user?.role === "vendor" && req.user.tenant && !data.tenant) {
        const tenantId = typeof req.user.tenant === "object" ? req.user.tenant.id : req.user.tenant;
        data.tenant = tenantId;
      }
      return data;
    };
    ensureProductSkuAutofill = async ({
      data,
      req,
      originalDoc
    }) => {
      if (!data || typeof data !== "object") {
        return data;
      }
      const d = data;
      const skuVal = d.sku;
      const skuMissing = skuVal == null || typeof skuVal === "string" && skuVal.trim() === "";
      if (skuMissing && d.sku == null) {
        d.sku = null;
      }
      if (typeof skuVal === "string" && skuVal.trim() === "") {
        d.sku = null;
      }
      if (!skuMissing) {
        return data;
      }
      if (!req.payload) {
        return data;
      }
      const policy = getSkuAutofillPolicy();
      if (policy === "never") {
        return data;
      }
      const nextStatus = String(d.status ?? originalDoc?.status ?? "draft");
      if (policy === "on-publish" && nextStatus !== "published") {
        return data;
      }
      const fromSlug = typeof d.slug === "string" && d.slug.trim() ? d.slug.trim() : "";
      const fromName = typeof d.name === "string" && d.name.trim() ? d.name.trim() : "";
      const source = fromSlug || fromName || "product";
      d.sku = await generateUniqueProductSku({
        payload: req.payload,
        source,
        excludeProductId: originalDoc?.id ?? null
      });
      return data;
    };
    validateClassSpecifications = async ({ data, req }) => {
      if (!data || typeof data !== "object") return data;
      const d = data;
      const productClassId = toId(d.productClass);
      const specs = Array.isArray(d.specifications) ? d.specifications : [];
      if (!req?.payload) return data;
      try {
        let templateAttrMap = /* @__PURE__ */ new Map();
        if (productClassId) {
          const classDoc = await req.payload.findByID({
            collection: "classes",
            id: productClassId,
            depth: 2,
            overrideAccess: true
          });
          if (classDoc) {
            if (Array.isArray(classDoc.groups)) {
              for (const group of classDoc.groups) {
                const groupName = typeof group.name === "object" && group.name !== null ? group.name.en || Object.values(group.name)[0] || "General" : String(group.name || "General");
                if (Array.isArray(group.attributes)) {
                  for (const item of group.attributes) {
                    const attrObj = typeof item.attribute === "object" && item.attribute !== null ? item.attribute : null;
                    const attrKey = attrObj ? String(attrObj.key || "") : "";
                    if (attrKey) {
                      templateAttrMap.set(attrKey, {
                        ...attrObj,
                        group: groupName,
                        isRequired: item.isRequired,
                        displayOrder: item.displayOrder
                      });
                    }
                  }
                }
              }
            }
            if (Array.isArray(classDoc.parameters)) {
              for (const param of classDoc.parameters) {
                if (param && param.key && !templateAttrMap.has(String(param.key))) {
                  templateAttrMap.set(String(param.key), {
                    ...param,
                    group: "General"
                  });
                }
              }
            }
          }
        }
        const cleanedSpecs = [];
        const linkedAttrIds = /* @__PURE__ */ new Set();
        for (const s of specs) {
          if (!s || typeof s !== "object") continue;
          const k = String(s.key || "").trim();
          const val = s.value !== void 0 && s.value !== null ? String(s.value).trim() : "";
          if (!k || val === "") continue;
          const isCustom = Boolean(s.isCustom);
          const attrId = toId(s.attribute);
          if (attrId) {
            linkedAttrIds.add(String(attrId));
          }
          if (isCustom) {
            cleanedSpecs.push({
              ...s,
              key: k,
              label: s.label ? String(s.label) : k,
              value: val,
              unit: s.unit ? String(s.unit) : "",
              group: s.group ? String(s.group) : "Additional Specifications",
              isCustom: true,
              isAdHoc: false
            });
          } else if (templateAttrMap.has(k)) {
            const tDef = templateAttrMap.get(k);
            const tLabel = typeof tDef.label === "object" && tDef.label !== null ? tDef.label.en || Object.values(tDef.label)[0] || k : String(tDef.label || k);
            const tUnit = s.unit !== void 0 && s.unit !== null && String(s.unit).trim() !== "" ? String(s.unit) : String(tDef.unit || "");
            const tGroup = s.group ? String(s.group) : String(tDef.group || "General");
            cleanedSpecs.push({
              ...s,
              key: k,
              label: s.label ? String(s.label) : tLabel,
              value: val,
              unit: tUnit,
              group: tGroup,
              isCustom: false,
              isAdHoc: false
            });
          } else {
            cleanedSpecs.push({
              ...s,
              key: k,
              label: s.label ? String(s.label) : k,
              value: val,
              unit: s.unit ? String(s.unit) : "",
              group: s.group ? String(s.group) : "Additional Specifications",
              isCustom: false,
              isAdHoc: true
            });
          }
        }
        d.specifications = cleanedSpecs;
        const status = String(d.status ?? "draft");
        const specValueMap = /* @__PURE__ */ new Map();
        for (const s of cleanedSpecs) {
          if (s.key) specValueMap.set(String(s.key), String(s.value || ""));
        }
        for (const [attrKey, attrDef] of templateAttrMap.entries()) {
          const val = specValueMap.get(attrKey) || "";
          if (status === "published" && attrDef.isRequired && !val) {
            const paramLabel = typeof attrDef.label === "object" && attrDef.label !== null ? attrDef.label.en || Object.values(attrDef.label)[0] || attrKey : String(attrDef.label || attrKey);
            throw new APIError(`Required specification "${paramLabel}" is missing.`, 400);
          }
          const isSelect = attrDef.type === "select" || attrDef.dataType === "select";
          if (val && isSelect && Array.isArray(attrDef.options) && attrDef.options.length > 0) {
            const allowed = attrDef.options.map(
              (o) => String(o.value).toLowerCase()
            );
            if (!allowed.includes(val.toLowerCase())) {
              const paramLabel = typeof attrDef.label === "object" && attrDef.label !== null ? attrDef.label.en || Object.values(attrDef.label)[0] || attrKey : String(attrDef.label || attrKey);
              throw new APIError(
                `Invalid value "${val}" for specification "${paramLabel}". Allowed: ${allowed.join(", ")}`,
                400
              );
            }
          }
        }
      } catch (err) {
        if (err instanceof APIError || err?.message && err.message.includes("specification")) {
          throw err;
        }
        req.payload.logger?.warn?.(`[Products beforeValidate] Notice validating specifications: ${err?.message || err}`);
      }
      return data;
    };
    applySpecificationFacetFilters = async ({
      args,
      operation,
      req
    }) => {
      if (operation === "read" || operation === "count" || operation === "find") {
        try {
          const rawParams = req?.query || req?.searchParams || (req?.url ? new URL(req.url, "http://localhost").searchParams : void 0);
          if (rawParams) {
            const { productClass, specs } = parseSpecsFromSearchParams(rawParams);
            if (productClass || Object.keys(specs).length > 0) {
              const matchingIds = await getMatchingProductIdsForSpecs(req.payload, specs, productClass);
              if (matchingIds !== void 0) {
                const idFilter = matchingIds.length > 0 ? { id: { in: matchingIds } } : { id: { equals: "00000000-0000-0000-0000-000000000000" } };
                if (args.where) {
                  args.where = { and: [args.where, idFilter] };
                } else {
                  args.where = idFilter;
                }
              }
            }
          }
        } catch (e) {
          req.payload.logger?.warn(`[applySpecificationFacetFilters] Error: ${e?.message || e}`);
        }
      }
      return args;
    };
    Products = createProductsConfig(false);
  }
});

// packages/backend/src/plugins/ecommerce/collections/product-variants.ts
import { randomBytes as randomBytes2 } from "node:crypto";
function sanitizeSkuPart2(raw2, maxLen) {
  const s = raw2.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, maxLen);
  return s.length > 0 ? s.toUpperCase() : "X";
}
async function isVariantSkuTaken(payload, sku, excludeVariantId) {
  const { docs } = await payload.find({
    collection: "product-variants",
    where: { sku: { equals: sku } },
    limit: 5,
    depth: 0,
    overrideAccess: true
  });
  if (docs.length === 0) return false;
  if (docs.length === 1 && excludeVariantId != null && String(docs[0].id) === String(excludeVariantId)) {
    return false;
  }
  return true;
}
async function generateUniqueVariantSku(args) {
  const { payload, productId, variantName, excludeVariantId } = args;
  const product = await payload.findByID({
    collection: "products",
    id: productId,
    depth: 0,
    overrideAccess: true
  });
  const slugFromProduct = product && typeof product === "object" && product !== null && "slug" in product && typeof product.slug === "string" ? String(product.slug).trim() : "";
  const slugRaw = slugFromProduct.length > 0 ? slugFromProduct : String(productId);
  const base = sanitizeSkuPart2(slugRaw, 48);
  const namePart = sanitizeSkuPart2(variantName || "V", 32);
  for (let attempt = 0; attempt < 16; attempt++) {
    const entropy = attempt === 0 ? "" : `-${randomBytes2(3).toString("hex").toUpperCase()}`;
    const candidate = `${base}-${namePart}${entropy}`.replace(/-+/g, "-").slice(0, 96);
    if (!await isVariantSkuTaken(payload, candidate, excludeVariantId)) {
      return candidate;
    }
  }
  return `${base}-${randomBytes2(8).toString("hex").toUpperCase()}`.slice(0, 96);
}
function createProductVariantsConfig(multivendorEnabled = false) {
  const fields = [
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true
    },
    { name: "name", type: "text", required: true },
    { name: "sku", type: "text", unique: true, admin: { description: "Unique per variant. Leave empty for auto-generated." } },
    { name: "price", type: "number", required: true, min: 0 },
    { name: "compareAtPrice", type: "number", min: 0 },
    {
      name: "saleDisplayMode",
      type: "select",
      required: false,
      defaultValue: "inherit",
      options: [
        { label: "Inherit from product", value: "inherit" },
        { label: "None (hide compare-at & badges)", value: "none" },
        { label: "Strikethrough compare-at only", value: "strike_through" },
        { label: "Badge: % off", value: "badge_percent" },
        { label: "Badge: amount saved", value: "badge_amount" },
        { label: "Strikethrough + badge", value: "strike_and_badge" }
      ],
      admin: {
        description: "Leave empty to use the product\u2019s sale display mode. Set to override for this SKU only."
      }
    },
    {
      name: "options",
      type: "array",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "value", type: "text", required: true }
      ]
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media"
    },
    { name: "weight", type: "number", min: 0 },
    { name: "isActive", type: "checkbox", defaultValue: true }
  ];
  if (multivendorEnabled) {
    fields.splice(1, 0, {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      admin: { description: "Inherited from product. Auto-set on save." }
    });
  }
  return {
    slug: "product-variants",
    admin: {
      useAsTitle: "name",
      defaultColumns: multivendorEnabled ? ["name", "sku", "price", "product", "tenant", "isActive"] : ["name", "sku", "price", "product", "isActive"],
      group: "Ecommerce"
    },
    access: {
      create: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      read: ({ req }) => {
        if (!req.user) return { isActive: { equals: true } };
        if (req.user.role === "admin") return true;
        if (multivendorEnabled && req.user.role === "vendor") return isAdminOrVendorOwner({ req });
        return { isActive: { equals: true } };
      },
      update: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      delete: multivendorEnabled ? isAdminOrVendorOwner : isAdmin
    },
    hooks: {
      beforeValidate: [
        ensureVariantSaleDisplayMode,
        ensureVariantSkuAutofill,
        ...multivendorEnabled ? [inheritTenantFromProductOnVariant] : [],
        preventVariantsForBundleProducts
      ]
    },
    fields,
    timestamps: true
  };
}
var ensureVariantSkuAutofill, ensureVariantSaleDisplayMode, preventVariantsForBundleProducts, inheritTenantFromProductOnVariant, ProductVariants;
var init_product_variants = __esm({
  "packages/backend/src/plugins/ecommerce/collections/product-variants.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_owner();
    ensureVariantSkuAutofill = async ({
      data,
      req,
      originalDoc
    }) => {
      if (!data || typeof data !== "object") return data;
      const d = data;
      const skuVal = d.sku;
      const skuMissing = skuVal == null || typeof skuVal === "string" && skuVal.trim() === "";
      if (!skuMissing) return data;
      const productRef = d.product;
      const productId = typeof productRef === "object" && productRef && "id" in productRef ? String(productRef.id) : productRef != null ? String(productRef) : null;
      if (!productId || !req.payload) return data;
      const name = typeof d.name === "string" && d.name.trim() ? d.name.trim() : "Variant";
      d.sku = await generateUniqueVariantSku({
        payload: req.payload,
        productId,
        variantName: name,
        excludeVariantId: originalDoc?.id ?? null
      });
      return data;
    };
    ensureVariantSaleDisplayMode = ({ data }) => {
      if (!data || typeof data !== "object") {
        return data;
      }
      const d = data;
      if (d.saleDisplayMode == null || d.saleDisplayMode === "") {
        d.saleDisplayMode = "inherit";
      }
      return data;
    };
    preventVariantsForBundleProducts = async ({ data, req }) => {
      if (!data?.product || !req.payload) {
        return data;
      }
      const productId = typeof data.product === "object" ? data.product.id : data.product;
      if (!productId) {
        return data;
      }
      const product = await req.payload.findByID({
        collection: "products",
        id: productId,
        depth: 0,
        overrideAccess: true
      });
      if (product?.productType === "bundle") {
        throw new Error("Product variants are not allowed for bundle products.");
      }
      return data;
    };
    inheritTenantFromProductOnVariant = async ({ data, req }) => {
      if (!data) return data;
      if (!data.tenant && data.product) {
        const productId = typeof data.product === "object" ? data.product.id : data.product;
        if (productId && req.payload) {
          const p = await req.payload.findByID({ collection: "products", id: productId, depth: 0 });
          if (p?.tenant)
            data.tenant = typeof p.tenant === "object" ? p.tenant.id : p.tenant;
        }
      }
      if (req.user?.role === "vendor" && req.user.tenant && !data.tenant) {
        const tenantId = typeof req.user.tenant === "object" ? req.user.tenant.id : req.user.tenant;
        data.tenant = tenantId;
      }
      return data;
    };
    ProductVariants = createProductVariantsConfig(false);
  }
});

// packages/backend/src/lib/allocate-stock-level.ts
function locationTenantId(loc) {
  if (!loc || typeof loc !== "object") return null;
  const t = loc.tenant;
  if (t == null) return null;
  return typeof t === "object" ? t.id : String(t);
}
function matchesProductVariant(sl, productId, variantId) {
  const slProduct = typeof sl.product === "object" ? sl.product?.id : sl.product;
  const slVariant = typeof sl.variant === "object" ? sl.variant?.id : sl.variant;
  if (slProduct !== productId) return false;
  if (variantId) return slVariant === variantId;
  return slVariant == null || slVariant === void 0;
}
function rowMatchesTenantFilter(location, productTenantId, multivendor) {
  const locTenant = locationTenantId(location);
  if (!multivendor) {
    return locTenant == null;
  }
  if (productTenantId == null) {
    return locTenant == null;
  }
  return locTenant === productTenantId;
}
async function allocateStockLevelForLine(payload, args, _req) {
  const { productId, variantId, quantity, tenantId, storeLocationId } = args;
  if (quantity < 1) {
    return { error: "Invalid quantity for stock allocation" };
  }
  const multivendor = process.env.MULTIVENDOR_ENABLED === "true";
  const { docs: rawDocs } = await payload.find({
    collection: "stock-levels",
    where: { product: { equals: productId } },
    limit: 500,
    depth: 2,
    overrideAccess: true
  });
  const docs = rawDocs.filter((sl) => matchesProductVariant(sl, productId, variantId));
  const candidates = docs.filter((sl) => {
    const loc = sl.location;
    if (!rowMatchesTenantFilter(loc, tenantId, multivendor)) return false;
    if (storeLocationId) {
      const locId = loc && typeof loc === "object" ? loc.id : String(loc);
      if (locId !== storeLocationId) return false;
    }
    return true;
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const sl of candidates) {
    const q = Number(sl.quantity) || 0;
    const r = Number(sl.reservedQuantity) || 0;
    const available = q - r;
    if (available >= quantity) {
      return { stockLevelId: String(sl.id) };
    }
  }
  const totalAvailable = candidates.reduce((sum, sl) => {
    const q = Number(sl.quantity) || 0;
    const r = Number(sl.reservedQuantity) || 0;
    return sum + (q - r);
  }, 0);
  if (candidates.length === 0) {
    return {
      error: "No stock configured for this product at a warehouse for your seller."
    };
  }
  if (totalAvailable < quantity) {
    return {
      error: "Insufficient stock across warehouses for this line."
    };
  }
  return {
    error: "Insufficient stock in a single warehouse for this quantity. Split the line or reduce quantity."
  };
}
var init_allocate_stock_level = __esm({
  "packages/backend/src/lib/allocate-stock-level.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/inventory-policy.ts
function isInventoryEnabled() {
  return process.env.INVENTORY_ENABLED !== "false";
}
function parseEnvBool(raw2, defaultValue) {
  if (raw2 === void 0 || raw2.trim() === "") return defaultValue;
  const v = raw2.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  return defaultValue;
}
function shouldValidateCartWarehouseAllocation() {
  if (!isInventoryEnabled()) return false;
  return parseEnvBool(process.env.INVENTORY_VALIDATE_CART_LINES, false);
}
function isSingleStoreCartEnabled() {
  return process.env.SINGLE_STORE_CART_ENABLED === "true";
}
function isStorefrontVariantAvailabilityEndpointEnabled() {
  return parseEnvBool(process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED, true);
}
var init_inventory_policy = __esm({
  "packages/backend/src/lib/inventory-policy.ts"() {
    "use strict";
  }
});

// packages/backend/src/plugins/discounts/lib/coupon.ts
function round2(value) {
  return Math.round(value * 100) / 100;
}
async function validateCouponForSubtotal(args) {
  const { payload, couponCode, subtotal, userId } = args;
  const normalizedCode = typeof couponCode === "string" ? couponCode.trim().toUpperCase() : "";
  if (!normalizedCode) {
    return { valid: false, discountTotal: 0, discountReason: "No coupon code provided" };
  }
  const found = await payload.find({
    collection: "coupons",
    where: { code: { equals: normalizedCode } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req: args.req
  });
  const coupon = found.docs?.[0];
  if (!coupon) {
    return { valid: false, discountTotal: 0, discountReason: "Coupon not found" };
  }
  if (coupon.isActive === false) {
    return { valid: false, discountTotal: 0, coupon, discountReason: "Coupon is inactive" };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, discountTotal: 0, coupon, discountReason: "Coupon has expired" };
  }
  const minOrderValue = Number(coupon.minOrderValue || 0);
  if (subtotal < minOrderValue) {
    return {
      valid: false,
      discountTotal: 0,
      coupon,
      discountReason: `Minimum order value is ${minOrderValue}`
    };
  }
  const totalUses = Number(coupon.totalUses || 0);
  if (coupon.maxTotalUses != null && totalUses >= Number(coupon.maxTotalUses)) {
    return { valid: false, discountTotal: 0, coupon, discountReason: "Coupon usage limit reached" };
  }
  if (coupon.maxUsesPerUser != null && userId != null) {
    const usedByUser = await payload.find({
      collection: "orders",
      where: {
        and: [{ customer: { equals: userId } }, { appliedCoupon: { equals: coupon.id } }]
      },
      limit: 0,
      depth: 0,
      overrideAccess: true,
      req: args.req
    });
    if (usedByUser.totalDocs >= Number(coupon.maxUsesPerUser)) {
      return { valid: false, discountTotal: 0, coupon, discountReason: "Coupon already used by this user" };
    }
  }
  const rawDiscount = coupon.type === "percentage" ? subtotal * Number(coupon.value || 0) / 100 : Number(coupon.value || 0);
  const discountTotal = round2(Math.max(0, Math.min(rawDiscount, subtotal)));
  return { valid: true, coupon, discountTotal };
}
var init_coupon = __esm({
  "packages/backend/src/plugins/discounts/lib/coupon.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/utils.ts
function isValidUUID(value) {
  return UUID_RE.test(value);
}
var UUID_RE;
var init_utils2 = __esm({
  "packages/backend/src/lib/utils.ts"() {
    "use strict";
    UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  }
});

// packages/backend/src/plugins/ecommerce/collections/carts.ts
import { APIError as APIError2 } from "payload";
function createCartsConfig(multivendorEnabled, allowGuestCheckout = false) {
  const itemFields = [
    ...itemFieldsBase.slice(0, 2),
    ...multivendorEnabled ? [
      {
        name: "vendor",
        type: "relationship",
        relationTo: "tenants",
        admin: { description: "Denormalized vendor for cart grouping. Auto-set from product." }
      }
    ] : [],
    ...itemFieldsBase.slice(2)
  ];
  function guestReadFilter(req) {
    if (req.user?.role === "admin") return true;
    if (req.user) return { user: { equals: req.user.id } };
    if (!allowGuestCheckout) return false;
    const guestId = req.headers.get("x-guest-id");
    if (!guestId || !isValidUUID(guestId)) return false;
    return {
      and: [
        { guestId: { equals: guestId } },
        { user: { equals: null } }
      ]
    };
  }
  return {
    slug: "carts",
    admin: {
      useAsTitle: "id",
      defaultColumns: ["user", "guestId", "subtotal", "expiresAt"],
      group: "Ecommerce"
    },
    hooks: {
      beforeChange: [
        async ({ data, req, operation }) => {
          if (!data) return data;
          if (typeof data.customerNote === "string") {
            const trimmed = data.customerNote.replace(/\0/g, "").trim().slice(0, 2e3);
            data.customerNote = trimmed.length > 0 ? trimmed : null;
          }
          if (!req.user) {
            if (operation === "create") {
              const headerGuestId = req.headers.get("x-guest-id");
              if (!headerGuestId || !isValidUUID(headerGuestId)) {
                throw new APIError2("X-Guest-Id header with a valid UUID is required for guest cart creation", 400);
              }
              data.guestId = headerGuestId;
              data.user = void 0;
              if (!data.expiresAt) {
                data.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
              }
            }
          }
          if (req.user?.id != null) {
            if (req.user.role !== "admin") {
              data.user = req.user.id;
            } else if (operation === "create" && data.user == null) {
              data.user = req.user.id;
            }
          }
          if (!data.items || !Array.isArray(data.items)) return data;
          const validateWarehouseOnCart = shouldValidateCartWarehouseAllocation();
          const warehouseStockLines = [];
          for (const item of data.items) {
            const variantId = typeof item.variant === "object" ? item.variant?.id : item.variant;
            const productId = typeof item.product === "object" ? item.product?.id : item.product;
            if (!productId) continue;
            const product = await req.payload.findByID({
              collection: "products",
              id: productId,
              depth: 1
            });
            if (!product) throw new Error(`Product ${productId} not found`);
            let unitPrice;
            if (variantId) {
              const variant = await req.payload.findByID({
                collection: "product-variants",
                id: variantId,
                depth: 0
              });
              const vProductId = typeof variant?.product === "object" ? variant?.product?.id : variant?.product;
              if (!variant || vProductId !== productId) {
                throw new Error(`Variant ${variantId} does not belong to product ${productId}`);
              }
              unitPrice = Number(variant.price);
              if (isNaN(unitPrice) || unitPrice < 0) throw new Error(`Invalid variant price for ${variantId}`);
            } else {
              unitPrice = Number(product.basePrice);
              if (isNaN(unitPrice) || unitPrice < 0) throw new Error(`Invalid product basePrice for ${productId}`);
            }
            item.unitPrice = Math.round(unitPrice * 100) / 100;
            if (process.env.MULTIVENDOR_ENABLED === "true") {
              const tenant = product.tenant;
              if (tenant != null) {
                item.vendor = typeof tenant === "object" ? tenant?.id : tenant;
              }
            }
            if (validateWarehouseOnCart) {
              const multivendor = process.env.MULTIVENDOR_ENABLED === "true";
              const tenantRaw = product.tenant;
              let tenantId = null;
              if (multivendor && tenantRaw != null) {
                tenantId = typeof tenantRaw === "object" ? tenantRaw?.id ?? null : String(tenantRaw);
              }
              warehouseStockLines.push({
                productId: String(productId),
                variantId: variantId ? String(variantId) : null,
                tenantId,
                quantity: Number(item.quantity) || 1
              });
            }
          }
          const inventoryEnabled = isInventoryEnabled();
          const singleStoreEnabled = isSingleStoreCartEnabled();
          const storeId = typeof data.store === "object" ? data.store?.id : data.store;
          if (validateWarehouseOnCart) {
            const storeLocationId = storeId ?? void 0;
            for (const line of warehouseStockLines) {
              const alloc = await allocateStockLevelForLine(
                req.payload,
                {
                  productId: line.productId,
                  variantId: line.variantId,
                  quantity: line.quantity,
                  tenantId: line.tenantId,
                  storeLocationId: storeLocationId ?? null
                },
                req
              );
              if ("error" in alloc) {
                throw new APIError2(alloc.error, 400);
              }
            }
          }
          if (!validateWarehouseOnCart && singleStoreEnabled && inventoryEnabled && storeId) {
            for (const item of data.items) {
              const pId = typeof item.product === "object" ? item.product?.id : item.product;
              const vId = item.variant ? typeof item.variant === "object" ? item.variant?.id : item.variant : null;
              if (!pId) continue;
              const baseAnd = [
                { location: { equals: storeId } },
                { product: { equals: pId } }
              ];
              const fetchStockDoc = async (extra) => {
                const and = extra ? [...baseAnd, extra] : [...baseAnd];
                const { docs } = await req.payload.find({
                  collection: "stock-levels",
                  where: { and },
                  limit: 1,
                  depth: 0,
                  overrideAccess: true
                });
                return docs[0];
              };
              let stockRow;
              if (vId) {
                stockRow = await fetchStockDoc({ variant: { equals: vId } });
                if (!stockRow) {
                  stockRow = await fetchStockDoc({ variant: { equals: null } });
                }
              } else {
                stockRow = await fetchStockDoc({ variant: { equals: null } });
                if (!stockRow) {
                  stockRow = await fetchStockDoc(null);
                }
              }
              if (!stockRow) {
                const productName = typeof item.product === "object" ? item.product.name || pId : pId;
                throw new APIError2(`Product "${productName}" is not available at the selected store`, 400);
              }
              const sl = stockRow;
              const available = (Number(sl.quantity) || 0) - (Number(sl.reservedQuantity) || 0);
              const qty = Number(item.quantity) || 1;
              if (available < qty) {
                const productName = typeof item.product === "object" ? item.product.name || pId : pId;
                throw new APIError2(`Insufficient stock for "${productName}" at the selected store (available: ${available})`, 400);
              }
            }
          }
          const subtotal = data.items.reduce(
            (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
            0
          );
          data.subtotal = Math.round(subtotal * 100) / 100;
          data.discountTotal = 0;
          data.appliedCoupon = null;
          if (typeof data.couponCode === "string" && data.couponCode.trim()) {
            const couponResult = await validateCouponForSubtotal({
              payload: req.payload,
              req,
              couponCode: data.couponCode,
              subtotal: data.subtotal,
              userId: req.user?.id
            });
            if (!couponResult.valid) {
              throw new APIError2(couponResult.discountReason, 400);
            }
            data.couponCode = couponResult.coupon.code;
            data.appliedCoupon = couponResult.coupon.id;
            data.discountTotal = couponResult.discountTotal;
          }
          data.grandTotal = Math.round((Number(data.subtotal || 0) - Number(data.discountTotal || 0)) * 100) / 100;
          return data;
        }
      ]
    },
    access: {
      create: ({ req }) => {
        if (req.user) return true;
        if (!allowGuestCheckout) return false;
        const guestId = req.headers.get("x-guest-id");
        return Boolean(guestId && isValidUUID(guestId));
      },
      read: ({ req }) => guestReadFilter(req),
      update: ({ req }) => guestReadFilter(req),
      delete: ({ req }) => guestReadFilter(req)
    },
    fields: [
      {
        name: "user",
        type: "relationship",
        relationTo: "users",
        admin: { description: "Null for guest carts." }
      },
      {
        name: "guestId",
        type: "text",
        index: true,
        admin: { description: "UUID for guest identification. Set from X-Guest-Id header; never from body." }
      },
      {
        name: "items",
        type: "array",
        required: false,
        // Allow empty cart after checkout; required=true would reject []
        defaultValue: [],
        fields: itemFields
      },
      {
        name: "subtotal",
        type: "number",
        defaultValue: 0,
        admin: { readOnly: true, description: "Auto-calculated from items." }
      },
      {
        name: "couponCode",
        type: "text",
        admin: { description: "Optional coupon code. Validated server-side." }
      },
      {
        name: "appliedCoupon",
        type: "relationship",
        relationTo: "coupons",
        admin: { readOnly: true, description: "Resolved coupon from couponCode." }
      },
      {
        name: "discountTotal",
        type: "number",
        defaultValue: 0,
        admin: { readOnly: true, description: "Discount amount from applied coupon." }
      },
      {
        name: "grandTotal",
        type: "number",
        defaultValue: 0,
        admin: { readOnly: true, description: "subtotal - discountTotal (shipping/tax excluded in cart)." }
      },
      {
        name: "store",
        type: "relationship",
        relationTo: "stock-locations",
        admin: {
          description: "Selected store/outlet for this shopping session. Set by storefront when customer picks a store."
        }
      },
      {
        name: "expiresAt",
        type: "date",
        admin: { description: "Guest carts expire. Auto-set to 7 days on guest create." }
      },
      {
        name: "customerNote",
        type: "textarea",
        maxLength: 2e3,
        admin: {
          description: "Optional message for the seller / fulfillment team. Copied to the order at checkout."
        }
      }
    ],
    timestamps: true
  };
}
var itemFieldsBase, Carts;
var init_carts = __esm({
  "packages/backend/src/plugins/ecommerce/collections/carts.ts"() {
    "use strict";
    init_allocate_stock_level();
    init_inventory_policy();
    init_coupon();
    init_utils2();
    itemFieldsBase = [
      {
        name: "product",
        type: "relationship",
        relationTo: "products",
        required: true
      },
      {
        name: "variant",
        type: "relationship",
        relationTo: "product-variants"
      },
      { name: "quantity", type: "number", required: true, min: 1 },
      {
        name: "unitPrice",
        type: "number",
        required: false,
        min: 0,
        admin: { description: "Auto-set from product basePrice or variant price. Do not send." }
      }
    ];
    Carts = createCartsConfig(false);
  }
});

// packages/backend/src/access/is-owner-or-admin.ts
var isOwnerOrAdmin;
var init_is_owner_or_admin = __esm({
  "packages/backend/src/access/is-owner-or-admin.ts"() {
    "use strict";
    isOwnerOrAdmin = (userField = "user") => ({ req }) => {
      const user = req.user;
      if (!user) return false;
      if (user.role === "admin") return true;
      return {
        [userField]: {
          equals: user.id
        }
      };
    };
  }
});

// packages/backend/src/lib/validation/address-format.ts
var ADDRESS_LABEL_RE, ADDRESS_PERSON_NAME_RE, ADDRESS_STREET_RE, ADDRESS_PLACE_RE, ADDRESS_POSTAL_RE, ADDRESS_ISO_COUNTRY_RE, ADDRESS_PHONE_RE;
var init_address_format = __esm({
  "packages/backend/src/lib/validation/address-format.ts"() {
    "use strict";
    ADDRESS_LABEL_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.'()/#,&-]{1,39}$/u;
    ADDRESS_PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,62}$/u;
    ADDRESS_STREET_RE = /^[\p{L}\p{M}0-9#][\p{L}\p{M}0-9\s.,'()/#-]{2,119}$/u;
    ADDRESS_PLACE_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.'()/#,-]{1,79}$/u;
    ADDRESS_POSTAL_RE = /^(?=.{3,12}$)[A-Za-z0-9][A-Za-z0-9 -]*$/;
    ADDRESS_ISO_COUNTRY_RE = /^[A-Za-z]{2}$/;
    ADDRESS_PHONE_RE = /^[0-9+()\-\s]{5,20}$/;
  }
});

// packages/backend/src/plugins/ecommerce/collections/addresses.ts
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function isValidOptionalPhone(value) {
  if (!value) return true;
  if (!ADDRESS_PHONE_RE.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 5 && digits <= 15;
}
function assertMatches(value, pattern, message) {
  if (!pattern.test(value)) {
    throw new Error(message);
  }
}
var Addresses;
var init_addresses = __esm({
  "packages/backend/src/plugins/ecommerce/collections/addresses.ts"() {
    "use strict";
    init_is_owner_or_admin();
    init_address_format();
    Addresses = {
      slug: "addresses",
      admin: {
        useAsTitle: "label",
        defaultColumns: ["label", "firstName", "lastName", "city", "country", "user"],
        group: "Ecommerce"
      },
      access: {
        create: ({ req }) => Boolean(req.user),
        read: isOwnerOrAdmin(),
        update: isOwnerOrAdmin(),
        delete: isOwnerOrAdmin()
      },
      hooks: {
        beforeValidate: [
          ({ data, originalDoc }) => {
            if (!data) return data;
            const label = normalizeText(data.label ?? originalDoc?.label);
            const firstName = normalizeText(data.firstName ?? originalDoc?.firstName);
            const lastName = normalizeText(data.lastName ?? originalDoc?.lastName);
            const street1 = normalizeText(data.street1 ?? originalDoc?.street1);
            const street2 = normalizeText(data.street2 ?? originalDoc?.street2);
            const city = normalizeText(data.city ?? originalDoc?.city);
            const state = normalizeText(data.state ?? originalDoc?.state);
            const postalCode = normalizeText(data.postalCode ?? originalDoc?.postalCode);
            const country = normalizeText(data.country ?? originalDoc?.country).toUpperCase();
            const phone = normalizeText(data.phone ?? originalDoc?.phone);
            if (!label) throw new Error("Address label is required.");
            if (!firstName) throw new Error("First name is required.");
            if (!lastName) throw new Error("Last name is required.");
            if (!street1) throw new Error("Street address is required.");
            if (!city) throw new Error("City/local area is required.");
            if (!country) throw new Error("Country is required.");
            assertMatches(label, ADDRESS_LABEL_RE, "Address label contains invalid characters.");
            assertMatches(firstName, ADDRESS_PERSON_NAME_RE, "First name contains invalid characters.");
            assertMatches(lastName, ADDRESS_PERSON_NAME_RE, "Last name contains invalid characters.");
            assertMatches(street1, ADDRESS_STREET_RE, "Street address looks invalid.");
            assertMatches(city, ADDRESS_PLACE_RE, "City/local area looks invalid.");
            if (state) assertMatches(state, ADDRESS_PLACE_RE, "Region looks invalid.");
            if (street2) assertMatches(street2, ADDRESS_STREET_RE, "Street line 2 looks invalid.");
            if (postalCode && !ADDRESS_POSTAL_RE.test(postalCode)) {
              throw new Error("Postal code looks invalid.");
            }
            if (!ADDRESS_ISO_COUNTRY_RE.test(country)) {
              throw new Error("Country must be a valid 2-letter ISO code.");
            }
            if (!isValidOptionalPhone(phone)) {
              throw new Error("Phone number looks invalid.");
            }
            if (data.label !== void 0) data.label = label;
            if (data.firstName !== void 0) data.firstName = firstName;
            if (data.lastName !== void 0) data.lastName = lastName;
            if (data.street1 !== void 0) data.street1 = street1;
            if (data.street2 !== void 0) data.street2 = street2 || null;
            if (data.city !== void 0) data.city = city;
            if (data.state !== void 0) data.state = state || null;
            if (data.postalCode !== void 0) data.postalCode = postalCode || null;
            if (data.country !== void 0) data.country = country;
            if (data.phone !== void 0) data.phone = phone || null;
            return data;
          }
        ],
        beforeChange: [
          ({ data, req }) => {
            if (req.user?.role !== "admin" && data) {
              data.user = req.user.id;
            }
            return data;
          }
        ]
      },
      fields: [
        {
          name: "user",
          type: "relationship",
          relationTo: "users",
          required: true
        },
        { name: "label", type: "text", required: true },
        { name: "firstName", type: "text", required: true },
        { name: "lastName", type: "text", required: true },
        { name: "street1", type: "text", required: true },
        { name: "street2", type: "text" },
        { name: "city", type: "text", required: true },
        { name: "state", type: "text" },
        { name: "postalCode", type: "text" },
        { name: "country", type: "text", required: true },
        {
          name: "geoCountryId",
          type: "text",
          index: true,
          admin: {
            description: "Optional geography country id (for store/service-area compatibility checks)."
          }
        },
        {
          name: "geoSubdivisionId",
          type: "text",
          index: true,
          admin: {
            description: "Optional geography subdivision id (for store/service-area compatibility checks)."
          }
        },
        {
          name: "geoLocalityId",
          type: "text",
          index: true,
          admin: {
            description: "Optional geography locality id. Leave empty when the address is subdivision-level only."
          }
        },
        {
          name: "preferredStoreId",
          type: "text",
          index: true,
          admin: {
            description: "Optional preferred store/outlet id used for compatibility hints in storefront."
          }
        },
        { name: "phone", type: "text" },
        { name: "isDefault", type: "checkbox", defaultValue: false }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/ecommerce/collections/wishlist-items.ts
import { APIError as APIError3 } from "payload";
function relationId(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const t = String(value).trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === "object" && "id" in value) {
    const id = value.id;
    if (id == null) return null;
    const t = String(id).trim();
    return t.length > 0 ? t : null;
  }
  return null;
}
var WishlistItems;
var init_wishlist_items = __esm({
  "packages/backend/src/plugins/ecommerce/collections/wishlist-items.ts"() {
    "use strict";
    init_is_owner_or_admin();
    WishlistItems = {
      slug: "wishlist-items",
      admin: {
        useAsTitle: "id",
        defaultColumns: ["user", "product", "createdAt"],
        group: "Ecommerce"
      },
      access: {
        create: ({ req }) => Boolean(req.user),
        read: isOwnerOrAdmin(),
        update: isOwnerOrAdmin(),
        delete: isOwnerOrAdmin()
      },
      hooks: {
        beforeChange: [
          async ({ data, originalDoc, operation, req }) => {
            if (!data) return data;
            if (req.user?.role !== "admin" && req.user?.id != null) {
              data.user = req.user.id;
            }
            const userId = relationId(data.user ?? originalDoc?.user);
            const productId = relationId(data.product ?? originalDoc?.product);
            if (!userId || !productId) return data;
            const selfId = operation === "update" ? relationId(originalDoc?.id) : null;
            const where = {
              and: [
                { user: { equals: userId } },
                { product: { equals: productId } },
                ...selfId ? [{ id: { not_equals: selfId } }] : []
              ]
            };
            const existing = await req.payload.find({
              collection: "wishlist-items",
              where,
              depth: 0,
              limit: 1,
              overrideAccess: true
            });
            if ((existing.docs?.length || 0) > 0) {
              throw new APIError3("This product is already in your wishlist.", 400);
            }
            return data;
          }
        ]
      },
      fields: [
        {
          name: "user",
          type: "relationship",
          relationTo: "users",
          required: true
        },
        {
          name: "product",
          type: "relationship",
          relationTo: "products",
          required: true
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/ecommerce/index.ts
var ecommerce_exports = {};
__export(ecommerce_exports, {
  Attributes: () => Attributes,
  Brands: () => Brands,
  Classes: () => Classes,
  ecommercePlugin: () => ecommercePlugin
});
var ecommercePlugin;
var init_ecommerce = __esm({
  "packages/backend/src/plugins/ecommerce/index.ts"() {
    "use strict";
    init_brands();
    init_attributes();
    init_classes();
    init_products();
    init_product_variants();
    init_carts();
    init_addresses();
    init_wishlist_items();
    init_brands();
    init_attributes();
    init_classes();
    ecommercePlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true, multivendorEnabled = false, allowGuestCheckout = false } = options;
      if (!enabled) return incomingConfig;
      return {
        ...incomingConfig,
        collections: [
          ...incomingConfig.collections || [],
          Brands,
          Attributes,
          Classes,
          createProductsConfig(multivendorEnabled),
          createProductVariantsConfig(multivendorEnabled),
          createCartsConfig(multivendorEnabled, allowGuestCheckout),
          Addresses,
          WishlistItems
        ]
      };
    };
  }
});

// packages/backend/src/plugins/multivendor/collections/tenants.ts
var Tenants;
var init_tenants = __esm({
  "packages/backend/src/plugins/multivendor/collections/tenants.ts"() {
    "use strict";
    init_is_admin();
    init_slug();
    Tenants = {
      slug: "tenants",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "slug", "type", "createdAt"],
        group: "Multivendor",
        description: "Platform stores and vendor tenants. Each tenant isolates products, orders, and inventory."
      },
      access: {
        create: isAdmin,
        read: ({ req }) => {
          if (!req.user) return true;
          if (req.user.role === "admin") return true;
          if (req.user.role === "vendor" && req.user.tenant) {
            const tenantId = typeof req.user.tenant === "object" ? req.user.tenant.id : req.user.tenant;
            return { id: { equals: tenantId } };
          }
          return true;
        },
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        { name: "name", type: "text", required: true },
        slugField("name"),
        {
          name: "type",
          type: "select",
          required: true,
          defaultValue: "vendor",
          options: [
            { label: "Platform Store", value: "platform-store" },
            { label: "Vendor", value: "vendor" }
          ],
          admin: {
            description: "platform-store = internal outlet/branch. vendor = independent marketplace seller."
          }
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/multivendor/collections/vendor-profiles.ts
var VendorProfiles;
var init_vendor_profiles = __esm({
  "packages/backend/src/plugins/multivendor/collections/vendor-profiles.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_owner();
    VendorProfiles = {
      slug: "vendor-profiles",
      admin: {
        useAsTitle: "displayName",
        defaultColumns: ["displayName", "tenant", "rating", "totalSales", "joinedAt"],
        group: "Multivendor",
        description: "Public vendor store profiles. Shown at /store/[vendor-slug]."
      },
      access: {
        create: isAdmin,
        read: ({ req }) => {
          if (!req.user) return true;
          if (req.user.role === "admin") return true;
          if (req.user.role === "vendor") return isAdminOrVendorOwner({ req });
          return true;
        },
        update: isAdminOrVendorOwner,
        delete: isAdmin
      },
      fields: [
        {
          name: "tenant",
          type: "relationship",
          relationTo: "tenants",
          required: true,
          unique: true,
          admin: { description: "The vendor (tenant) this profile belongs to." }
        },
        { name: "displayName", type: "text", required: true, localized: true },
        {
          name: "description",
          type: "richText",
          localized: true
        },
        {
          name: "logo",
          type: "upload",
          relationTo: "media"
        },
        {
          name: "banner",
          type: "upload",
          relationTo: "media"
        },
        { name: "contactEmail", type: "email" },
        { name: "contactPhone", type: "text" },
        { name: "website", type: "text" },
        {
          name: "socialLinks",
          type: "array",
          fields: [
            { name: "platform", type: "text", required: true },
            { name: "url", type: "text", required: true }
          ]
        },
        {
          name: "address",
          type: "group",
          fields: [
            { name: "street", type: "text" },
            { name: "city", type: "text" },
            { name: "state", type: "text" },
            { name: "country", type: "text" },
            { name: "zip", type: "text" }
          ]
        },
        {
          name: "rating",
          type: "number",
          admin: { description: "Aggregated from approved vendor reviews.", readOnly: true },
          defaultValue: 0
        },
        {
          name: "totalSales",
          type: "number",
          admin: { description: "Denormalized sales counter.", readOnly: true },
          defaultValue: 0
        },
        { name: "joinedAt", type: "date" },
        {
          name: "meta",
          type: "group",
          label: "SEO",
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "description", type: "textarea", localized: true },
            { name: "image", type: "upload", relationTo: "media" }
          ]
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/multivendor/collections/vendor-settings.ts
var VendorSettings;
var init_vendor_settings = __esm({
  "packages/backend/src/plugins/multivendor/collections/vendor-settings.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_owner();
    VendorSettings = {
      slug: "vendor-settings",
      admin: {
        useAsTitle: "tenant",
        defaultColumns: ["tenant", "commissionRate", "isActive", "updatedAt"],
        group: "Multivendor",
        description: "Per-vendor settings. One record per tenant."
      },
      access: {
        create: isAdmin,
        read: isAdminOrVendorOwner,
        update: isAdminOrVendorOwner,
        delete: isAdmin
      },
      fields: [
        {
          name: "tenant",
          type: "relationship",
          relationTo: "tenants",
          required: true,
          unique: true,
          admin: { description: "One settings record per vendor." }
        },
        {
          name: "commissionRate",
          type: "number",
          min: 0,
          max: 100,
          admin: { description: "Override default platform commission %." }
        },
        {
          name: "commissionType",
          type: "select",
          options: [
            { label: "Percentage", value: "percentage" },
            { label: "Flat", value: "flat" },
            { label: "Tiered", value: "tiered" }
          ],
          admin: { description: "Override default strategy." }
        },
        {
          name: "payoutMethod",
          type: "select",
          options: [
            { label: "Stripe", value: "stripe" },
            { label: "Bank Transfer", value: "bank-transfer" },
            { label: "Manual", value: "manual" }
          ]
        },
        { name: "stripeConnectAccountId", type: "text" },
        {
          name: "bankDetails",
          type: "group",
          fields: [
            { name: "bankName", type: "text" },
            { name: "accountNumber", type: "text" },
            { name: "routingNumber", type: "text" },
            { name: "iban", type: "text" }
          ]
        },
        {
          name: "shippingModel",
          type: "select",
          options: [
            { label: "Platform", value: "platform" },
            { label: "Vendor", value: "vendor" },
            { label: "Hybrid", value: "hybrid" }
          ],
          admin: { description: "Override default shipping model." }
        },
        {
          name: "autoPublishProducts",
          type: "checkbox",
          defaultValue: true,
          admin: { description: "If false, products start as draft." }
        },
        {
          name: "maxProducts",
          type: "number",
          min: 0,
          admin: { description: "0 = unlimited." }
        },
        {
          name: "isActive",
          type: "checkbox",
          defaultValue: true,
          admin: { description: "Admin can deactivate vendor." }
        },
        { name: "suspensionReason", type: "textarea" }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/multivendor/collections/vendor-applications.ts
var VendorApplications;
var init_vendor_applications = __esm({
  "packages/backend/src/plugins/multivendor/collections/vendor-applications.ts"() {
    "use strict";
    init_is_admin();
    init_src();
    VendorApplications = {
      slug: "vendor-applications",
      admin: {
        useAsTitle: "businessName",
        defaultColumns: ["businessName", "applicant", "status", "submittedAt", "reviewedAt"],
        group: "Multivendor",
        description: "Vendor onboarding applications. Approve to create vendor tenant."
      },
      access: {
        create: ({ req }) => Boolean(req.user),
        read: ({ req }) => {
          if (!req.user) return false;
          if (req.user.role === "admin") return true;
          return { applicant: { equals: req.user.id } };
        },
        update: ({ req }) => {
          if (!req.user) return false;
          if (req.user.role === "admin") return true;
          return {
            applicant: { equals: req.user.id },
            status: { equals: "pending" }
          };
        },
        delete: isAdmin
      },
      fields: [
        {
          name: "applicant",
          type: "relationship",
          relationTo: "users",
          required: true,
          admin: {
            description: "Auto-set when customer applies. Admin selects when creating on behalf of a customer.",
            condition: (_, __, { user }) => user?.role === "admin"
          }
        },
        { name: "businessName", type: "text", required: true },
        {
          name: "businessType",
          type: "select",
          options: [
            { label: "Individual", value: "individual" },
            { label: "Company", value: "company" },
            { label: "Partnership", value: "partnership" }
          ]
        },
        { name: "taxId", type: "text" },
        {
          name: "documents",
          type: "array",
          fields: [
            {
              name: "document",
              type: "upload",
              relationTo: "media",
              required: true
            }
          ],
          admin: { description: "KYC documents for verification." }
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "pending",
          options: [
            { label: "Pending", value: "pending" },
            { label: "Under Review", value: "under-review" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" }
          ]
        },
        {
          name: "reviewedBy",
          type: "relationship",
          relationTo: "users"
        },
        { name: "reviewNotes", type: "textarea" },
        { name: "rejectionReason", type: "text" },
        { name: "submittedAt", type: "date" },
        { name: "reviewedAt", type: "date" }
      ],
      hooks: {
        beforeValidate: [
          ({ data, operation, req }) => {
            if (!data) return data;
            if (operation === "create" && req.user) {
              if (req.user.role !== "admin") {
                data.applicant = req.user.id;
              }
              data.submittedAt = data.submittedAt ?? /* @__PURE__ */ new Date();
              if (process.env.VENDOR_AUTO_APPROVE === "true") {
                data.status = "approved";
              }
            }
            return data;
          }
        ],
        afterChange: [
          async ({ doc, previousDoc, operation, req }) => {
            if (!req.payload) return;
            const status = typeof doc.status === "string" ? doc.status : doc.status?.value ?? doc.status;
            const prevStatus = previousDoc && (typeof previousDoc.status === "string" ? previousDoc.status : previousDoc.status?.value ?? previousDoc.status);
            if (status !== "approved" || operation === "update" && prevStatus === "approved") {
              return;
            }
            const applicantId = typeof doc.applicant === "object" ? doc.applicant?.id : doc.applicant;
            if (!applicantId) return;
            const businessName = typeof doc.businessName === "string" ? doc.businessName : String(doc.businessName ?? "");
            if (!businessName.trim()) return;
            const baseSlug = slugify(businessName) || "vendor";
            let slug = baseSlug;
            let suffix = 0;
            while (true) {
              const { docs } = await req.payload.find({
                collection: "tenants",
                where: { slug: { equals: slug } },
                limit: 1
              });
              if (docs.length === 0) break;
              suffix += 1;
              slug = `${baseSlug}-${suffix}`;
            }
            const tenant = await req.payload.create({
              collection: "tenants",
              data: { name: businessName.trim(), slug },
              req,
              overrideAccess: true
            });
            const tenantId = typeof tenant.id === "string" ? tenant.id : String(tenant.id);
            await req.payload.create({
              collection: "vendor-profiles",
              data: {
                tenant: tenantId,
                displayName: businessName.trim(),
                joinedAt: /* @__PURE__ */ new Date()
              },
              req,
              overrideAccess: true
            });
            await req.payload.create({
              collection: "vendor-settings",
              data: {
                tenant: tenantId,
                isActive: true,
                autoPublishProducts: true
              },
              req,
              overrideAccess: true
            });
            await req.payload.update({
              collection: "users",
              id: applicantId,
              data: {
                role: "vendor",
                tenant: tenantId
              },
              req,
              overrideAccess: true
            });
            await req.payload.update({
              collection: "vendor-applications",
              id: doc.id,
              data: { reviewedAt: /* @__PURE__ */ new Date() },
              req,
              overrideAccess: true
            });
          }
        ]
      },
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/multivendor/index.ts
var multivendor_exports = {};
__export(multivendor_exports, {
  multivendorPlugin: () => multivendorPlugin
});
function fieldHasName(f, name) {
  return f != null && typeof f === "object" && "name" in f && f.name === name;
}
var tenantField, multivendorPlugin;
var init_multivendor = __esm({
  "packages/backend/src/plugins/multivendor/index.ts"() {
    "use strict";
    init_is_admin_or_vendor_owner();
    init_tenants();
    init_vendor_profiles();
    init_vendor_settings();
    init_vendor_applications();
    tenantField = {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      admin: {
        description: "Vendor tenant. Set when user becomes a vendor (approved application)."
      }
    };
    multivendorPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = false } = options;
      if (!enabled) return incomingConfig;
      const collections2 = [...incomingConfig.collections || []];
      const usersIdx = collections2.findIndex((c) => c.slug === "users");
      if (usersIdx >= 0) {
        const users = collections2[usersIdx];
        const fields = [...users.fields || []];
        if (!fields.some((f) => fieldHasName(f, "tenant"))) {
          const localeIdx = fields.findIndex((f) => fieldHasName(f, "locale"));
          const insertIdx = localeIdx >= 0 ? localeIdx + 1 : fields.length;
          fields.splice(insertIdx, 0, tenantField);
          collections2[usersIdx] = { ...users, fields };
        }
      }
      const mediaIdx = collections2.findIndex((c) => c.slug === "media");
      if (mediaIdx >= 0) {
        const media = collections2[mediaIdx];
        const mediaFields = [...media.fields || []];
        if (!mediaFields.some((f) => fieldHasName(f, "tenant"))) {
          mediaFields.unshift({
            name: "tenant",
            type: "relationship",
            relationTo: "tenants",
            admin: {
              description: "Vendor tenant. Null = platform media (admin-uploaded)."
            }
          });
          collections2[mediaIdx] = {
            ...media,
            fields: mediaFields,
            access: {
              create: ({ req }) => Boolean(req.user),
              read: ({ req }) => {
                if (!req.user) return true;
                if (req.user.role === "admin") return true;
                if (req.user.role === "vendor") return isAdminOrVendorOwner({ req });
                return true;
              },
              update: ({ req }) => {
                if (!req.user) return false;
                if (req.user.role === "admin") return true;
                if (req.user.role === "vendor") return isAdminOrVendorOwner({ req });
                return false;
              },
              delete: ({ req }) => {
                if (!req.user) return false;
                if (req.user.role === "admin") return true;
                if (req.user.role === "vendor") return isAdminOrVendorOwner({ req });
                return false;
              }
            },
            hooks: {
              ...media.hooks || {},
              beforeValidate: [
                ...Array.isArray(media.hooks?.beforeValidate) ? media.hooks.beforeValidate : [],
                ({ data, req }) => {
                  if (!data || req.user?.role !== "vendor") return data;
                  if (req.user?.tenant && !data.tenant) {
                    const t = req.user.tenant;
                    data.tenant = typeof t === "object" && t && "id" in t ? t.id : t;
                  }
                  return data;
                }
              ]
            }
          };
        }
      }
      return {
        ...incomingConfig,
        collections: [
          ...collections2,
          Tenants,
          VendorProfiles,
          VendorSettings,
          VendorApplications
        ]
      };
    };
  }
});

// packages/backend/src/access/is-admin-or-vendor-stock-tenant.ts
function tenantIdFromUser(user) {
  const u = user;
  if (!u?.tenant) return null;
  return typeof u.tenant === "object" ? String(u.tenant.id || "") : String(u.tenant);
}
function relationId2(value) {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const id = value.id;
    return id == null ? null : String(id);
  }
  return null;
}
var stockLocationTenantRead, stockLocationTenantCreate, stockLocationTenantMutate, stockLevelTenantRead, stockLevelTenantCreate;
var init_is_admin_or_vendor_stock_tenant = __esm({
  "packages/backend/src/access/is-admin-or-vendor-stock-tenant.ts"() {
    "use strict";
    stockLocationTenantRead = ({ req }) => {
      if (!req.user) {
        return { isPublicStore: { equals: true } };
      }
      if (req.user.role === "admin") return true;
      if (req.user.role === "vendor" && req.user.tenant) {
        const tid = tenantIdFromUser(req.user);
        if (!tid) return false;
        return {
          tenant: {
            equals: tid
          }
        };
      }
      if (req.user.role === "customer") {
        return { isPublicStore: { equals: true } };
      }
      return false;
    };
    stockLocationTenantCreate = ({ req }) => {
      if (!req.user) return false;
      if (req.user.role === "admin") return true;
      if (req.user.role === "vendor") return !!tenantIdFromUser(req.user);
      return false;
    };
    stockLocationTenantMutate = ({ req }) => {
      if (!req.user) return false;
      if (req.user.role === "admin") return true;
      if (req.user.role === "vendor") {
        const tid = tenantIdFromUser(req.user);
        if (!tid) return false;
        return { tenant: { equals: tid } };
      }
      return false;
    };
    stockLevelTenantRead = ({ req }) => {
      if (!req.user) return false;
      if (req.user.role === "admin") return true;
      if (req.user.role === "vendor" && req.user.tenant) {
        const tid = tenantIdFromUser(req.user);
        if (!tid) return false;
        return {
          "location.tenant": { equals: tid }
        };
      }
      return false;
    };
    stockLevelTenantCreate = async ({ req, data }) => {
      if (!req.user) return false;
      if (req.user.role === "admin") return true;
      if (req.user.role !== "vendor") return false;
      const tid = tenantIdFromUser(req.user);
      if (!tid) return false;
      const createData = data;
      if (!createData || typeof createData !== "object") return true;
      if (createData.location == null && createData.product == null) return true;
      const locationId = relationId2(createData.location);
      if (!locationId) return false;
      try {
        const location = await req.payload.findByID({
          collection: "stock-locations",
          id: locationId,
          depth: 0,
          overrideAccess: true,
          req
        });
        const locationTenant = relationId2(location?.tenant);
        if (!locationTenant || locationTenant !== tid) return false;
        const productId = relationId2(createData.product);
        if (productId) {
          const product = await req.payload.findByID({
            collection: "products",
            id: productId,
            depth: 0,
            overrideAccess: true,
            req
          });
          const productTenant = relationId2(product?.tenant);
          if (!productTenant || productTenant !== tid) return false;
        }
        return true;
      } catch {
        return false;
      }
    };
  }
});

// packages/backend/src/plugins/inventory/collections/stock-locations.ts
function createStockLocationsConfig(multivendorEnabled) {
  const fields = [
    { name: "name", type: "text", required: true },
    { name: "code", type: "text", required: true, unique: true },
    {
      name: "slug",
      type: "text",
      unique: true,
      index: true,
      admin: {
        description: "URL-friendly identifier for public store pages (e.g. /store/dhaka-north). Leave empty for non-public warehouses."
      }
    },
    {
      name: "address",
      type: "group",
      fields: [
        { name: "street", type: "text" },
        { name: "city", type: "text" },
        { name: "state", type: "text" },
        { name: "country", type: "text" },
        { name: "postalCode", type: "text" }
      ]
    },
    { name: "isActive", type: "checkbox", defaultValue: true },
    {
      name: "isPublicStore",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "When true, this location is a customer-facing store/outlet visible on the storefront."
      }
    },
    {
      name: "sortPriority",
      type: "number",
      defaultValue: 0,
      admin: {
        description: "Lower numbers appear first when listing public stores (e.g. service-area resolution). Default 0."
      }
    },
    {
      name: "storeDetails",
      type: "group",
      label: "Store / Outlet Details",
      admin: {
        description: "Additional fields for customer-facing stores. Only relevant when isPublicStore is true.",
        condition: (data) => Boolean(data?.isPublicStore)
      },
      fields: [
        { name: "description", type: "richText", localized: true },
        {
          name: "logo",
          type: "upload",
          relationTo: "media"
        },
        {
          name: "banner",
          type: "upload",
          relationTo: "media"
        },
        { name: "contactEmail", type: "email" },
        { name: "contactPhone", type: "text" },
        { name: "operatingHours", type: "text", localized: true, admin: { description: 'Display string, e.g. "Mon-Sat 9am-9pm".' } },
        {
          name: "coverageArea",
          type: "array",
          admin: { description: "Postal codes, city names, or zone identifiers this store serves." },
          fields: [
            { name: "value", type: "text", required: true }
          ]
        }
      ]
    }
  ];
  if (multivendorEnabled) {
    fields.splice(1, 0, {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      admin: {
        description: "Vendor owning this warehouse. Leave empty for platform-managed warehouses."
      }
    });
  }
  return {
    slug: "stock-locations",
    admin: {
      useAsTitle: "name",
      defaultColumns: multivendorEnabled ? ["name", "code", "tenant", "isPublicStore", "isActive"] : ["name", "code", "isPublicStore", "isActive"],
      group: "Inventory"
    },
    access: {
      create: multivendorEnabled ? stockLocationTenantCreate : isAdmin,
      read: stockLocationTenantRead,
      update: multivendorEnabled ? stockLocationTenantMutate : isAdmin,
      delete: multivendorEnabled ? stockLocationTenantMutate : isAdmin
    },
    hooks: multivendorEnabled ? {
      beforeValidate: [
        ({ req, data }) => {
          if (req.user?.role !== "vendor" || !req.user?.tenant) return data;
          const tid = typeof req.user.tenant === "object" ? req.user.tenant.id : req.user.tenant;
          if (!tid) return data;
          return { ...data || {}, tenant: tid };
        }
      ]
    } : void 0,
    fields,
    timestamps: true
  };
}
var StockLocations;
var init_stock_locations = __esm({
  "packages/backend/src/plugins/inventory/collections/stock-locations.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_stock_tenant();
    StockLocations = createStockLocationsConfig(false);
  }
});

// packages/backend/src/plugins/inventory/collections/stock-levels.ts
function relationId3(value) {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const id = value.id;
    return id == null ? null : String(id);
  }
  return null;
}
async function buildStockLevelTitle(req, data) {
  const locationRaw = data.location;
  if (!locationRaw) return null;
  let locationName = null;
  if (typeof locationRaw === "object" && locationRaw && "name" in locationRaw) {
    const maybeName = locationRaw.name;
    if (typeof maybeName === "string" && maybeName.trim()) {
      locationName = maybeName.trim();
    }
  }
  const locationId = relationId3(locationRaw);
  if (!locationName && locationId && req?.payload?.findByID) {
    try {
      const location = await req.payload.findByID({
        collection: "stock-locations",
        id: locationId,
        depth: 0,
        overrideAccess: true,
        req
      });
      const name = location?.name;
      if (typeof name === "string" && name.trim()) locationName = name.trim();
    } catch {
    }
  }
  const quantity = Number(data.quantity ?? 0);
  const reserved = Number(data.reservedQuantity ?? 0);
  const where = locationName || locationId;
  if (!where) return null;
  return `${where} | qty:${Number.isFinite(quantity) ? quantity : 0} | res:${Number.isFinite(reserved) ? reserved : 0}`;
}
function createStockLevelsConfig() {
  return {
    slug: "stock-levels",
    admin: {
      useAsTitle: "title",
      defaultColumns: ["product", "variant", "location", "quantity", "reservedQuantity"],
      group: "Inventory"
    },
    access: {
      create: stockLevelTenantCreate,
      read: stockLevelTenantRead,
      update: stockLevelTenantRead,
      delete: stockLevelTenantRead
    },
    fields: [
      {
        name: "title",
        type: "text",
        admin: {
          readOnly: true
        }
      },
      {
        name: "product",
        type: "relationship",
        relationTo: "products",
        required: true
      },
      {
        name: "variant",
        type: "relationship",
        relationTo: "product-variants",
        admin: { description: "Optional. Leave empty for product-level stock (no variants)." }
      },
      {
        name: "location",
        type: "relationship",
        relationTo: "stock-locations",
        required: true
      },
      { name: "quantity", type: "number", required: true, min: 0 },
      { name: "reservedQuantity", type: "number", defaultValue: 0, min: 0 }
    ],
    hooks: {
      beforeValidate: [
        async ({ data, originalDoc, req, operation }) => {
          if (process.env.MULTIVENDOR_ENABLED !== "true") return data;
          if (!data) return data;
          const merged = { ...originalDoc || {}, ...data };
          const productRef = merged.product;
          const locationRef = merged.location;
          if (!productRef || !locationRef) return data;
          const productId = relationId3(productRef);
          const locationId = relationId3(locationRef);
          if (!productId || !locationId) return data;
          try {
            const [product, location] = await Promise.all([
              req.payload.findByID({
                collection: "products",
                id: productId,
                depth: 0,
                overrideAccess: true,
                req
              }),
              req.payload.findByID({
                collection: "stock-locations",
                id: locationId,
                depth: 0,
                overrideAccess: true,
                req
              })
            ]);
            const prodTenant = relationId3(product?.tenant);
            const locTenant = relationId3(location?.tenant);
            if (prodTenant && locTenant && prodTenant !== locTenant) {
              const err = new Error(
                `Cross-vendor stock forbidden: product tenant (${prodTenant}) does not match location tenant (${locTenant}).`
              );
              err.status = 400;
              throw err;
            }
          } catch (e) {
            if (e?.status === 400) throw e;
          }
          return data;
        }
      ],
      beforeChange: [
        async ({ data, originalDoc, req }) => {
          if (!data) return data;
          const merged = { ...originalDoc || {}, ...data };
          const title = await buildStockLevelTitle(req, merged);
          if (title) {
            ;
            data.title = title;
          }
          return data;
        }
      ],
      afterRead: [
        async ({ doc, req }) => {
          if (!doc) return doc;
          if (doc.title) return doc;
          let source = doc;
          if (!source.location && source.id && req?.payload?.findByID) {
            try {
              const hydrated = await req.payload.findByID({
                collection: "stock-levels",
                id: String(source.id),
                depth: 1,
                overrideAccess: true,
                req
              });
              if (hydrated && typeof hydrated === "object") {
                source = hydrated;
              }
            } catch {
            }
          }
          const title = await buildStockLevelTitle(req, source);
          if (title) doc.title = title;
          return doc;
        }
      ]
    },
    timestamps: true
  };
}
var StockLevels;
var init_stock_levels = __esm({
  "packages/backend/src/plugins/inventory/collections/stock-levels.ts"() {
    "use strict";
    init_is_admin_or_vendor_stock_tenant();
    StockLevels = createStockLevelsConfig();
  }
});

// packages/backend/src/plugins/inventory/index.ts
var inventory_exports = {};
__export(inventory_exports, {
  inventoryPlugin: () => inventoryPlugin
});
var inventoryPlugin;
var init_inventory = __esm({
  "packages/backend/src/plugins/inventory/index.ts"() {
    "use strict";
    init_stock_locations();
    init_stock_levels();
    inventoryPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true, multivendorEnabled = false } = options;
      if (!enabled) return incomingConfig;
      const StockLocations2 = createStockLocationsConfig(multivendorEnabled);
      const StockLevels2 = createStockLevelsConfig();
      return {
        ...incomingConfig,
        collections: [...incomingConfig.collections || [], StockLocations2, StockLevels2]
      };
    };
  }
});

// packages/backend/src/plugins/shipping/collections/shipping-zones.ts
var ShippingZones;
var init_shipping_zones = __esm({
  "packages/backend/src/plugins/shipping/collections/shipping-zones.ts"() {
    "use strict";
    init_is_admin();
    ShippingZones = {
      slug: "shipping-zones",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "countries", "isActive"],
        group: "Shipping"
      },
      access: {
        create: isAdmin,
        read: () => true,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        { name: "name", type: "text", required: true },
        {
          name: "countries",
          type: "array",
          fields: [{ name: "code", type: "text", required: true }],
          admin: { description: "ISO country codes (e.g. BD, US). Empty = rest of world." }
        },
        { name: "isActive", type: "checkbox", defaultValue: true }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/shipping/collections/shipping-methods.ts
var ShippingMethods;
var init_shipping_methods = __esm({
  "packages/backend/src/plugins/shipping/collections/shipping-methods.ts"() {
    "use strict";
    init_is_admin();
    init_currencies();
    ShippingMethods = {
      slug: "shipping-methods",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "zone", "collectPaymentOnDelivery", "type", "rate", "currency"],
        group: "Shipping"
      },
      access: {
        create: isAdmin,
        read: () => true,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        { name: "name", type: "text", required: true },
        {
          name: "zone",
          type: "relationship",
          relationTo: "shipping-zones",
          required: true
        },
        {
          name: "type",
          type: "select",
          required: true,
          options: [
            { label: "Flat Rate", value: "flat" },
            { label: "Per Item", value: "per-item" },
            { label: "Weight Based", value: "weight-based" }
          ]
        },
        { name: "rate", type: "number", required: true, min: 0 },
        {
          name: "currency",
          type: "select",
          required: true,
          defaultValue: getDefaultCurrency(),
          options: getCurrencyOptions()
        },
        { name: "minOrderValue", type: "number", min: 0 },
        { name: "maxOrderValue", type: "number", min: 0 },
        {
          name: "collectPaymentOnDelivery",
          type: "checkbox",
          defaultValue: false,
          label: "Collect payment on delivery (COD)",
          admin: {
            description: "When enabled, this method means the customer pays on delivery (cash or agreed offline). Checkout uses this flag \u2014 not the method name \u2014 to allow COD flow and to record it on the order. Online gateway payment applies when this is off."
          }
        },
        { name: "isActive", type: "checkbox", defaultValue: true }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/shipping/index.ts
var shipping_exports = {};
__export(shipping_exports, {
  shippingPlugin: () => shippingPlugin
});
var shippingPlugin;
var init_shipping = __esm({
  "packages/backend/src/plugins/shipping/index.ts"() {
    "use strict";
    init_shipping_zones();
    init_shipping_methods();
    shippingPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true } = options;
      if (!enabled) return incomingConfig;
      return {
        ...incomingConfig,
        collections: [
          ...incomingConfig.collections || [],
          ShippingZones,
          ShippingMethods
        ]
      };
    };
  }
});

// packages/backend/src/plugins/payments/collections/transactions.ts
var Transactions;
var init_transactions = __esm({
  "packages/backend/src/plugins/payments/collections/transactions.ts"() {
    "use strict";
    init_is_admin();
    Transactions = {
      slug: "transactions",
      admin: {
        useAsTitle: "id",
        defaultColumns: ["order", "type", "provider", "amount", "currency", "status", "createdAt"],
        group: "Payments",
        description: "Payment transactions. Created at checkout or refund."
      },
      access: {
        create: isAdmin,
        // Only via process-checkout or webhook
        read: isAdmin,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        {
          name: "order",
          type: "relationship",
          relationTo: "orders",
          required: true
        },
        {
          name: "type",
          type: "select",
          required: true,
          options: [
            { label: "Charge", value: "charge" },
            { label: "Refund", value: "refund" },
            { label: "Partial Refund", value: "partial-refund" }
          ]
        },
        {
          name: "provider",
          type: "text",
          required: true,
          admin: { description: "e.g. sslcommerz, stripe." }
        },
        {
          name: "providerTransactionId",
          type: "text",
          admin: { description: "Gateway transaction ID." }
        },
        { name: "amount", type: "number", required: true, min: 0 },
        { name: "currency", type: "text", required: true },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "pending",
          options: [
            { label: "Pending", value: "pending" },
            { label: "Processing", value: "processing" },
            { label: "Succeeded", value: "succeeded" },
            { label: "Failed", value: "failed" },
            { label: "Cancelled", value: "cancelled" }
          ]
        },
        {
          name: "platformFee",
          type: "number",
          admin: { description: "Platform commission (multivendor)." }
        },
        {
          name: "metadata",
          type: "json",
          admin: { description: "Provider-specific data." }
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/payments/index.ts
var payments_exports = {};
__export(payments_exports, {
  paymentsPlugin: () => paymentsPlugin
});
var paymentsPlugin;
var init_payments = __esm({
  "packages/backend/src/plugins/payments/index.ts"() {
    "use strict";
    init_transactions();
    paymentsPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true } = options;
      if (!enabled) return incomingConfig;
      return {
        ...incomingConfig,
        collections: [
          ...incomingConfig.collections || [],
          Transactions
        ]
      };
    };
  }
});

// packages/backend/src/access/is-order-owner-or-admin.ts
var isOrderOwnerOrAdmin;
var init_is_order_owner_or_admin = __esm({
  "packages/backend/src/access/is-order-owner-or-admin.ts"() {
    "use strict";
    isOrderOwnerOrAdmin = async ({ req }) => {
      const user = req.user;
      if (!user) return false;
      if (user.role === "admin") return true;
      if (user.role === "customer") {
        return { customer: { equals: user.id } };
      }
      if (user.role === "vendor" && user.tenant) {
        try {
          const tenantId = typeof user.tenant === "object" ? user.tenant.id : user.tenant;
          const { docs } = await req.payload.find({
            collection: "sub-orders",
            where: { tenant: { equals: tenantId } },
            limit: 5e3,
            depth: 0
          });
          const orderIds = [...new Set(docs.map((d) => typeof d.parentOrder === "object" ? d.parentOrder?.id : d.parentOrder).filter(Boolean))];
          if (orderIds.length === 0) return false;
          return { id: { in: orderIds } };
        } catch {
          return false;
        }
      }
      return false;
    };
  }
});

// packages/backend/src/lib/release-order-inventory.ts
function stockLevelIdFromItem(item) {
  const sl = item.stockLevel;
  if (sl == null) return null;
  return typeof sl === "object" ? sl.id : String(sl);
}
async function releaseOrderInventory(payload, items, req) {
  if (!items?.length) return;
  const legacyItems = items.filter((i) => !stockLevelIdFromItem(i));
  const productIds = [
    ...new Set(legacyItems.map((i) => typeof i.product === "object" ? i.product?.id : i.product).filter(Boolean))
  ];
  const stockLevels = productIds.length > 0 ? await payload.find({
    collection: "stock-levels",
    where: { product: { in: productIds } },
    limit: 100,
    depth: 1
  }) : { docs: [] };
  for (const item of items) {
    const directId = stockLevelIdFromItem(item);
    if (directId) {
      const quantity2 = Number(item.quantity) || 1;
      const levelDoc = await payload.findByID({
        collection: "stock-levels",
        id: directId,
        depth: 0,
        overrideAccess: true
      });
      if (!levelDoc) continue;
      const reserved = Number(levelDoc.reservedQuantity) || 0;
      const newReserved = Math.max(0, reserved - quantity2);
      await payload.update({
        collection: "stock-levels",
        id: directId,
        overrideAccess: true,
        data: { reservedQuantity: newReserved },
        ...req && { req }
      });
      continue;
    }
    if (!item.product) continue;
    const productId = typeof item.product === "object" ? item.product?.id : item.product;
    const variantId = item.variant ? typeof item.variant === "object" ? item.variant?.id : item.variant : null;
    const quantity = Number(item.quantity) || 1;
    const level = stockLevels.docs.find((sl) => {
      const slProduct = typeof sl.product === "object" ? sl.product?.id : sl.product;
      const slVariant = typeof sl.variant === "object" ? sl.variant?.id : sl.variant;
      return slProduct === productId && (variantId ? slVariant === variantId : !slVariant);
    });
    if (level) {
      const reserved = Number(level.reservedQuantity) || 0;
      const newReserved = Math.max(0, reserved - quantity);
      await payload.update({
        collection: "stock-levels",
        id: level.id,
        overrideAccess: true,
        data: { reservedQuantity: newReserved },
        ...req && { req }
      });
    }
  }
}
var init_release_order_inventory = __esm({
  "packages/backend/src/lib/release-order-inventory.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/consume-order-inventory.ts
async function consumeOrderInventory(payload, items, req) {
  if (!items?.length) return;
  const legacyItems = items.filter((i) => !stockLevelIdFromItem(i));
  const productIds = [
    ...new Set(legacyItems.map((i) => typeof i.product === "object" ? i.product?.id : i.product).filter(Boolean))
  ];
  const stockLevels = productIds.length > 0 ? await payload.find({
    collection: "stock-levels",
    where: { product: { in: productIds } },
    limit: 100,
    depth: 1
  }) : { docs: [] };
  for (const item of items) {
    const directId = stockLevelIdFromItem(item);
    if (directId) {
      const quantity2 = Number(item.quantity) || 1;
      const levelDoc = await payload.findByID({
        collection: "stock-levels",
        id: directId,
        depth: 0,
        overrideAccess: true
      });
      if (!levelDoc) continue;
      const currentQty = Number(levelDoc.quantity) || 0;
      const reserved = Number(levelDoc.reservedQuantity) || 0;
      const newQuantity = Math.max(0, currentQty - quantity2);
      const newReserved = Math.max(0, reserved - quantity2);
      await payload.update({
        collection: "stock-levels",
        id: directId,
        overrideAccess: true,
        data: { quantity: newQuantity, reservedQuantity: newReserved },
        ...req && { req }
      });
      continue;
    }
    if (!item.product) continue;
    const productId = typeof item.product === "object" ? item.product?.id : item.product;
    const variantId = item.variant ? typeof item.variant === "object" ? item.variant?.id : item.variant : null;
    const quantity = Number(item.quantity) || 1;
    const level = stockLevels.docs.find((sl) => {
      const slProduct = typeof sl.product === "object" ? sl.product?.id : sl.product;
      const slVariant = typeof sl.variant === "object" ? sl.variant?.id : sl.variant;
      return slProduct === productId && (variantId ? slVariant === variantId : !slVariant);
    });
    if (level) {
      const currentQty = Number(level.quantity) || 0;
      const reserved = Number(level.reservedQuantity) || 0;
      const newQuantity = Math.max(0, currentQty - quantity);
      const newReserved = Math.max(0, reserved - quantity);
      await payload.update({
        collection: "stock-levels",
        id: level.id,
        overrideAccess: true,
        data: { quantity: newQuantity, reservedQuantity: newReserved },
        ...req && { req }
      });
    }
  }
}
var init_consume_order_inventory = __esm({
  "packages/backend/src/lib/consume-order-inventory.ts"() {
    "use strict";
    init_release_order_inventory();
  }
});

// packages/backend/src/lib/order-status-transitions.ts
import { APIError as APIError4 } from "payload";
function getAllowedNext(current, transitions) {
  return transitions[current] ?? [];
}
function isAllowedSubOrderStatusTransition(from, to) {
  if (!from || !to || from === to) return true;
  return getAllowedNext(from, SUB_ORDER_TRANSITIONS).includes(to);
}
function isAllowedOrderStatusTransition(from, to) {
  if (!from || !to || from === to) return true;
  return getAllowedNext(from, ORDER_TRANSITIONS).includes(to);
}
function validateSubOrderStatusTransition(from, to) {
  if (to == null) return;
  const fromStatus = from ?? "pending";
  if (!isAllowedSubOrderStatusTransition(fromStatus, to)) {
    const allowed = getAllowedNext(fromStatus, SUB_ORDER_TRANSITIONS);
    const allowedText = allowed.length ? allowed.join(", ") : "none (terminal)";
    throw new APIError4(
      `Allowed next: ${allowedText}. Cannot change "${fromStatus}" \u2192 "${to}".`,
      400
    );
  }
}
function validateOrderStatusTransition(from, to) {
  if (to == null) return;
  const fromStatus = from ?? "pending";
  if (!isAllowedOrderStatusTransition(fromStatus, to)) {
    const allowed = getAllowedNext(fromStatus, ORDER_TRANSITIONS);
    const allowedText = allowed.length ? allowed.join(", ") : "none (terminal)";
    throw new APIError4(
      `Allowed next: ${allowedText}. Cannot change "${fromStatus}" \u2192 "${to}".`,
      400
    );
  }
}
var SUB_ORDER_TRANSITIONS, ORDER_TRANSITIONS;
var init_order_status_transitions = __esm({
  "packages/backend/src/lib/order-status-transitions.ts"() {
    "use strict";
    SUB_ORDER_TRANSITIONS = {
      pending: ["confirmed", "processing", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: ["completed"],
      completed: [],
      cancelled: [],
      refunded: []
    };
    ORDER_TRANSITIONS = {
      pending: ["processing", "cancelled"],
      processing: ["partially-shipped", "shipped", "cancelled"],
      "partially-shipped": ["shipped"],
      // no cancel once any sub-order has shipped
      shipped: ["delivered"],
      delivered: ["completed"],
      completed: [],
      cancelled: [],
      refunded: []
    };
  }
});

// packages/backend/src/plugins/orders/collections/orders.ts
function createOrdersConfig(splitByVendor) {
  const baseFields = [
    {
      name: "orderNumber",
      type: "text",
      required: true,
      unique: true,
      admin: { readOnly: true, description: "Auto-generated e.g. ORD-20260225-XXXX." }
    },
    {
      name: "customer",
      type: "relationship",
      relationTo: "users",
      admin: { description: "Null for guest checkout." }
    },
    {
      name: "guestEmail",
      type: "email",
      admin: { description: "For guest checkout." }
    },
    {
      name: "guestPhone",
      type: "text",
      admin: { description: "For guest checkout with phone identity." }
    },
    {
      name: "buyerSnapshot",
      type: "group",
      admin: {
        description: "Immutable buyer identity at checkout (support/fulfillment). No payment credentials. Do not edit after create."
      },
      fields: [
        { name: "email", type: "email", admin: { readOnly: true } },
        { name: "name", type: "text", admin: { readOnly: true } },
        { name: "phone", type: "text", admin: { readOnly: true } },
        {
          name: "locale",
          type: "text",
          admin: { readOnly: true, description: "Locale used for product title snapshots at checkout." }
        }
      ]
    },
    {
      name: "idempotencyKey",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
        description: "Client-supplied UUID for idempotent checkout. If an order with this key already exists, the existing order is returned without creating a duplicate."
      }
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Partially Shipped", value: "partially-shipped" },
        { label: "Shipped", value: "shipped" },
        { label: "Delivered", value: "delivered" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" }
      ]
    },
    {
      name: "items",
      type: "relationship",
      relationTo: "order-items",
      hasMany: true,
      admin: { description: "Order line items." }
    },
    {
      name: "shippingAddress",
      type: "group",
      required: true,
      admin: {
        description: "Ship-to address captured at checkout. Admins may update this for fulfillment corrections (unit number, contact phone, re-ship). Independent of buyerSnapshot."
      },
      fields: addressGroupFields
    },
    {
      name: "billingAddress",
      type: "group",
      required: true,
      admin: {
        description: "Billing address at checkout. Admins may update when billing details were entered incorrectly."
      },
      fields: addressGroupFields
    },
    { name: "subtotal", type: "number", required: true, defaultValue: 0 },
    { name: "shippingTotal", type: "number", required: true, defaultValue: 0 },
    { name: "taxTotal", type: "number", required: true, defaultValue: 0 },
    { name: "discountTotal", type: "number", required: true, defaultValue: 0 },
    {
      name: "appliedCoupon",
      type: "relationship",
      relationTo: "coupons",
      admin: { description: "Coupon used at checkout (if any)." }
    },
    {
      name: "couponCodeSnapshot",
      type: "text",
      admin: { readOnly: true, description: "Coupon code snapshot at checkout time." }
    },
    { name: "grandTotal", type: "number", required: true, defaultValue: 0 },
    {
      name: "currency",
      type: "text",
      required: true,
      defaultValue: () => getDefaultCurrency()
    },
    {
      name: "paymentStatus",
      type: "select",
      required: true,
      defaultValue: "unpaid",
      options: [
        { label: "Unpaid", value: "unpaid" },
        { label: "Paid", value: "paid" },
        { label: "Partially Refunded", value: "partially-refunded" },
        { label: "Refunded", value: "refunded" }
      ]
    },
    {
      name: "checkoutPaymentChannel",
      type: "select",
      required: true,
      defaultValue: "online",
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Recorded at checkout: online gateway vs cash on delivery. Do not change (audit / fulfillment)."
      },
      options: [
        { label: "Online (gateway)", value: "online" },
        { label: "Cash on delivery", value: "cash_on_delivery" }
      ]
    },
    {
      name: "transaction",
      type: "relationship",
      relationTo: "transactions",
      admin: { description: "Primary payment transaction." }
    },
    {
      name: "store",
      type: "relationship",
      relationTo: "stock-locations",
      admin: {
        description: "Store/outlet for this order (checkout default: cart.store). Admins may reassign for routing, warehouse changes, or corrections."
      }
    },
    { name: "notes", type: "textarea", admin: { description: "Customer notes." } },
    { name: "placedAt", type: "date", admin: { description: "When order was placed." } },
    {
      name: "deviceTracking",
      type: "group",
      admin: {
        description: "Client device, browser, OS, and IP address recorded at checkout."
      },
      fields: [
        { name: "ipAddress", type: "text", admin: { readOnly: true } },
        { name: "userAgent", type: "text", admin: { readOnly: true } },
        {
          name: "deviceType",
          type: "select",
          admin: { readOnly: true },
          options: [
            { label: "Desktop", value: "desktop" },
            { label: "Mobile", value: "mobile" },
            { label: "Tablet", value: "tablet" },
            { label: "Bot / Automated", value: "bot" },
            { label: "Unknown", value: "unknown" }
          ]
        },
        { name: "browser", type: "text", admin: { readOnly: true } },
        { name: "os", type: "text", admin: { readOnly: true } },
        { name: "referrer", type: "text", admin: { readOnly: true } }
      ]
    }
  ];
  if (splitByVendor) {
    baseFields.splice(
      baseFields.findIndex((f) => typeof f === "object" && "name" in f && f.name === "items") + 1,
      0,
      {
        name: "subOrders",
        type: "relationship",
        relationTo: "sub-orders",
        hasMany: true,
        admin: { description: "Per-vendor segments. Vendors fulfill their sub-orders." }
      }
    );
  }
  return {
    slug: "orders",
    admin: {
      useAsTitle: "orderNumber",
      defaultColumns: [
        "orderNumber",
        "customer",
        "checkoutPaymentChannel",
        "status",
        "paymentStatus",
        "grandTotal",
        "currency",
        "placedAt"
      ],
      group: "Orders",
      description: "Customer orders. Use status=Cancelled to cancel (releases inventory). Orders are never deleted (audit/tax)."
    },
    hooks: {
      beforeDelete: [
        async ({ id, req }) => {
          const payload = req.payload;
          const orderId = id;
          const { docs: itemDocs } = await payload.find({
            collection: "order-items",
            where: { order: { equals: orderId } },
            limit: 1e3,
            depth: 1
          });
          await releaseOrderInventory(payload, itemDocs, req);
          const { docs: historyDocs } = await payload.find({
            collection: "order-status-history",
            where: { order: { equals: orderId } },
            limit: 1e3,
            depth: 0
          });
          for (const h of historyDocs) {
            await payload.delete({ collection: "order-status-history", id: h.id, overrideAccess: true, req });
          }
          if (splitByVendor) {
            const { docs: subOrderDocs } = await payload.find({
              collection: "sub-orders",
              where: { parentOrder: { equals: orderId } },
              limit: 100,
              depth: 0
            });
            for (const so of subOrderDocs) {
              await payload.delete({ collection: "sub-orders", id: so.id, overrideAccess: true, req });
            }
          }
          const { docs: txDocs } = await payload.find({
            collection: "transactions",
            where: { order: { equals: orderId } },
            limit: 100,
            depth: 0
          });
          for (const tx of txDocs) {
            await payload.delete({ collection: "transactions", id: tx.id, overrideAccess: true, req });
          }
          for (const item of itemDocs) {
            await payload.delete({ collection: "order-items", id: item.id, overrideAccess: true, req });
          }
        }
      ],
      beforeChange: [
        ({ data, operation, originalDoc }) => {
          if (operation === "update" && data && "buyerSnapshot" in data) {
            delete data.buyerSnapshot;
          }
          if (operation === "update" && data && originalDoc?.checkoutPaymentChannel != null) {
            data.checkoutPaymentChannel = originalDoc.checkoutPaymentChannel;
          }
          if (operation === "update" && data?.status != null) {
            const from = originalDoc?.status;
            validateOrderStatusTransition(from, data.status);
          }
          if (operation === "create" && data && !data.orderNumber) {
            const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
            const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            data.orderNumber = `ORD-${date}-${suffix}`;
          }
          return data;
        }
      ],
      afterChange: [
        async ({ doc, previousDoc, operation, req }) => {
          if (operation === "create") return doc;
          const payload = req.payload;
          const orderId = doc.id;
          const fromStatus = previousDoc?.status ?? null;
          const toStatus = doc.status;
          if (toStatus === "cancelled") {
            const { docs: itemDocs } = await payload.find({
              collection: "order-items",
              where: { order: { equals: orderId } },
              limit: 1e3,
              depth: 1
            });
            await releaseOrderInventory(payload, itemDocs, req);
          }
          const alreadyShipped = ["shipped", "delivered", "completed"].includes(fromStatus ?? "");
          if (!splitByVendor && toStatus === "shipped" && !alreadyShipped) {
            const { docs: itemDocs } = await payload.find({
              collection: "order-items",
              where: { order: { equals: orderId } },
              limit: 1e3,
              depth: 1
            });
            await consumeOrderInventory(payload, itemDocs, req);
          }
          if (req?.context?.skipOrderStatusHistory)
            return doc;
          if (fromStatus && toStatus && fromStatus !== toStatus) {
            const historyData = {
              order: orderId,
              fromStatus,
              toStatus,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
            if (req.user?.id != null) historyData.changedBy = req.user.id;
            await payload.create({
              collection: "order-status-history",
              overrideAccess: true,
              data: historyData,
              req
            });
          }
          return doc;
        }
      ]
    },
    access: {
      create: isAdmin,
      read: isOrderOwnerOrAdmin,
      update: isAdmin,
      delete: () => false
    },
    fields: baseFields,
    timestamps: true
  };
}
var addressGroupFields;
var init_orders = __esm({
  "packages/backend/src/plugins/orders/collections/orders.ts"() {
    "use strict";
    init_is_admin();
    init_is_order_owner_or_admin();
    init_currencies();
    init_consume_order_inventory();
    init_order_status_transitions();
    init_release_order_inventory();
    addressGroupFields = [
      { name: "firstName", type: "text", required: true },
      { name: "lastName", type: "text", required: true },
      { name: "street1", type: "text", required: true },
      { name: "street2", type: "text" },
      { name: "city", type: "text", required: true },
      { name: "state", type: "text" },
      { name: "postalCode", type: "text" },
      { name: "country", type: "text", required: true },
      { name: "phone", type: "text" }
    ];
  }
});

// packages/backend/src/lib/order-item-relation-id.ts
function orderItemRelationId(val) {
  if (val == null) return null;
  if (typeof val === "object" && val !== null && "id" in val) {
    return String(val.id);
  }
  return String(val);
}
var init_order_item_relation_id = __esm({
  "packages/backend/src/lib/order-item-relation-id.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/transfer-stock-reservation.ts
async function transferStockReservation(payload, args, req) {
  const { fromStockLevelId, toStockLevelId, quantity } = args;
  if (quantity < 1) return;
  if (fromStockLevelId === toStockLevelId) return;
  const fromDoc = await payload.findByID({
    collection: "stock-levels",
    id: fromStockLevelId,
    depth: 0,
    overrideAccess: true
  });
  const toDoc = await payload.findByID({
    collection: "stock-levels",
    id: toStockLevelId,
    depth: 0,
    overrideAccess: true
  });
  if (!fromDoc || !toDoc) {
    throw new Error("Stock level not found");
  }
  const fromR = Number(fromDoc.reservedQuantity) || 0;
  if (fromR < quantity) {
    throw new Error("Source warehouse does not hold enough reserved quantity to transfer");
  }
  const toQ = Number(toDoc.quantity) || 0;
  const toR = Number(toDoc.reservedQuantity) || 0;
  const availableAtTarget = toQ - toR;
  if (availableAtTarget < quantity) {
    throw new Error("Insufficient available capacity at target warehouse");
  }
  await payload.update({
    collection: "stock-levels",
    id: fromStockLevelId,
    overrideAccess: true,
    data: { reservedQuantity: fromR - quantity },
    ...req && { req }
  });
  await payload.update({
    collection: "stock-levels",
    id: toStockLevelId,
    overrideAccess: true,
    data: { reservedQuantity: toR + quantity },
    ...req && { req }
  });
}
var init_transfer_stock_reservation = __esm({
  "packages/backend/src/lib/transfer-stock-reservation.ts"() {
    "use strict";
  }
});

// packages/backend/src/plugins/orders/collections/order-items.ts
function snapshotScalarEqual(incoming, previous) {
  if (incoming === previous) return true;
  if (typeof incoming === "number" && typeof previous === "number") {
    return Math.abs(incoming - previous) < 1e-9;
  }
  return false;
}
function vendorPatchValueUnchanged(incoming, previous) {
  if (incoming === previous) return true;
  const inc = orderItemRelationId(incoming);
  const prev = orderItemRelationId(previous);
  if (inc != null && prev != null) return inc === prev;
  if (inc == null && prev == null) return true;
  return false;
}
function orderItemsReadAccess(splitByVendor) {
  return (args) => {
    const user = args.req.user;
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "customer") {
      return {
        order: {
          customer: {
            equals: user.id
          }
        }
      };
    }
    if (splitByVendor) {
      return isAdminOrVendorOwner(args);
    }
    return false;
  };
}
function createOrderItemsConfig(splitByVendor) {
  const fields = [
    {
      name: "order",
      type: "relationship",
      relationTo: "orders",
      required: true,
      admin: { description: "Parent order." }
    },
    ...splitByVendor ? [
      {
        name: "subOrder",
        type: "relationship",
        relationTo: "sub-orders",
        admin: { description: "Vendor sub-order this item belongs to." }
      },
      {
        name: "tenant",
        type: "relationship",
        relationTo: "tenants",
        admin: { description: "Vendor who owns this item." }
      }
    ] : [],
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      admin: { description: "Snapshot reference. Product may change later." }
    },
    {
      name: "variant",
      type: "relationship",
      relationTo: "product-variants",
      admin: { description: "Variant if applicable." }
    },
    {
      name: "stockLevel",
      type: "relationship",
      relationTo: "stock-levels",
      admin: {
        description: "Warehouse stock row used for fulfillment (Phase 12). Changes move reservation between warehouses."
      }
    },
    {
      name: "productName",
      type: "text",
      required: true,
      admin: { description: "Snapshot at time of purchase." }
    },
    {
      name: "productSlug",
      type: "text",
      admin: {
        description: "Product URL slug at checkout (immutable). Used for PDP links when the live product slug changes."
      }
    },
    {
      name: "itemLabel",
      type: "text",
      admin: {
        description: 'Display label for admin (e.g. "Product Name \xD7 2"). Set automatically.',
        readOnly: true,
        hidden: true
        // used only for useAsTitle in relationship pills
      }
    },
    {
      name: "variantName",
      type: "text",
      admin: { description: "Snapshot at time of purchase." }
    },
    {
      name: "sku",
      type: "text",
      admin: { description: "Snapshot at time of purchase." }
    },
    { name: "quantity", type: "number", required: true, min: 1 },
    { name: "unitPrice", type: "number", required: true, min: 0 },
    { name: "totalPrice", type: "number", required: true, min: 0 },
    {
      name: "productImage",
      type: "text",
      admin: { description: "Snapshot URL at time of purchase." }
    },
    ...splitByVendor ? [
      {
        name: "vendorNameSnapshot",
        type: "text",
        admin: { description: "Vendor display name at checkout (immutable)." }
      }
    ] : []
  ];
  return {
    slug: "order-items",
    admin: {
      useAsTitle: "itemLabel",
      defaultColumns: splitByVendor ? ["order", "subOrder", "productName", "variantName", "stockLevel", "quantity", "unitPrice", "totalPrice"] : ["order", "productName", "variantName", "stockLevel", "quantity", "unitPrice", "totalPrice"],
      group: "Orders",
      description: "Line items for an order. Created at checkout from cart. Commercial snapshots (title, product slug at checkout, SKU, price, qty) are immutable after create; admins may still change stock level for fulfillment routing. Shipping address, store, and totals live on the parent order / sub-order."
    },
    access: {
      create: isAdmin,
      read: orderItemsReadAccess(splitByVendor),
      update: splitByVendor ? isAdminOrVendorOwner : isAdmin,
      delete: isAdmin
    },
    fields,
    timestamps: true,
    hooks: {
      beforeChange: [
        ({ data, operation, originalDoc }) => {
          if (operation !== "update" || !data || !originalDoc) return data;
          const snapFields = [
            "productName",
            "productSlug",
            "variantName",
            "sku",
            "unitPrice",
            "totalPrice",
            "productImage",
            "quantity",
            "itemLabel"
          ];
          if (splitByVendor) snapFields.push("vendorNameSnapshot");
          const orig = originalDoc;
          const patch = data;
          for (const key of snapFields) {
            if (!(key in patch)) continue;
            if (snapshotScalarEqual(patch[key], orig[key])) continue;
            throw new Error(`Order line snapshots cannot be changed after creation (${key}).`);
          }
          const relKeys = ["order", "subOrder", "tenant", "product", "variant"];
          for (const key of relKeys) {
            if (!(key in patch)) continue;
            if (vendorPatchValueUnchanged(patch[key], orig[key])) continue;
            throw new Error(`Cannot change ${key} after order item creation.`);
          }
          return data;
        },
        ({ data, originalDoc, req, operation }) => {
          if (operation === "update" && req.user?.role === "vendor" && data && originalDoc) {
            const orig = originalDoc;
            const patch = data;
            for (const key of Object.keys(patch)) {
              if (key === "updatedAt") continue;
              if (key === "stockLevel") continue;
              if (vendorPatchValueUnchanged(patch[key], orig[key])) continue;
              throw new Error("Vendors may only update fulfillment warehouse (stock level).");
            }
          }
          return data;
        },
        async ({ data, originalDoc, req, operation }) => {
          if (operation !== "update" || !data || data.stockLevel === void 0 || !originalDoc) {
            return data;
          }
          const oldId = orderItemRelationId(originalDoc.stockLevel);
          const newId = orderItemRelationId(data.stockLevel);
          if (!oldId || !newId || oldId === newId) {
            return data;
          }
          const qty = Number(originalDoc.quantity) || 1;
          await transferStockReservation(req.payload, { fromStockLevelId: oldId, toStockLevelId: newId, quantity: qty }, req);
          return data;
        },
        ({ data }) => {
          if (data?.productName != null) {
            const qty = Number(data.quantity) ?? 1;
            data.itemLabel = `${data.productName} \xD7 ${qty}`;
          }
          return data;
        }
      ],
      afterRead: [
        ({ doc }) => {
          if (doc && !doc.itemLabel && doc.productName) {
            const qty = Number(doc.quantity) ?? 1;
            doc.itemLabel = `${doc.productName} \xD7 ${qty}`;
          }
          return doc;
        }
      ]
    }
  };
}
var init_order_items = __esm({
  "packages/backend/src/plugins/orders/collections/order-items.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_owner();
    init_order_item_relation_id();
    init_transfer_stock_reservation();
  }
});

// packages/backend/src/plugins/orders/collections/order-status-history.ts
var OrderStatusHistory;
var init_order_status_history = __esm({
  "packages/backend/src/plugins/orders/collections/order-status-history.ts"() {
    "use strict";
    init_is_admin();
    OrderStatusHistory = {
      slug: "order-status-history",
      admin: {
        useAsTitle: "id",
        defaultColumns: ["order", "fromStatus", "toStatus", "changedBy", "timestamp"],
        group: "Orders",
        description: "Audit log of order status changes."
      },
      access: {
        create: isAdmin,
        // Only via hooks
        read: isAdmin,
        update: () => false,
        // Immutable
        delete: isAdmin
      },
      fields: [
        {
          name: "order",
          type: "relationship",
          relationTo: "orders",
          required: true
        },
        { name: "fromStatus", type: "text", admin: { description: "Previous status." } },
        { name: "toStatus", type: "text", required: true },
        {
          name: "changedBy",
          type: "relationship",
          relationTo: "users",
          admin: { description: "User who changed the status." }
        },
        { name: "reason", type: "textarea" },
        { name: "timestamp", type: "date", required: true, defaultValue: () => (/* @__PURE__ */ new Date()).toISOString() }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/orders/collections/sub-orders.ts
var subOrderStatusOptions, SubOrders;
var init_sub_orders = __esm({
  "packages/backend/src/plugins/orders/collections/sub-orders.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_owner();
    init_consume_order_inventory();
    init_order_status_transitions();
    init_release_order_inventory();
    subOrderStatusOptions = [
      { label: "Pending", value: "pending" },
      { label: "Confirmed", value: "confirmed" },
      { label: "Processing", value: "processing" },
      { label: "Shipped", value: "shipped" },
      { label: "Delivered", value: "delivered" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" },
      { label: "Refunded", value: "refunded" }
    ];
    SubOrders = {
      slug: "sub-orders",
      admin: {
        useAsTitle: "subOrderNumber",
        defaultColumns: ["subOrderNumber", "parentOrderNumber", "tenant", "status", "subtotal", "vendorEarnings", "commissionAmount"],
        group: "Orders",
        description: "Per-vendor order segments. Vendors fulfill their own sub-orders. Shipping method, tracking, dates, and store may be updated by admins or vendors during fulfillment; tenantNameSnapshot stays fixed."
      },
      hooks: {
        beforeChange: [
          ({ data, operation, originalDoc }) => {
            if (operation === "update" && originalDoc && data?.tenantNameSnapshot != null) {
              const prev = originalDoc.tenantNameSnapshot;
              if (prev != null && data.tenantNameSnapshot !== prev) {
                throw new Error("tenantNameSnapshot is immutable after sub-order creation.");
              }
            }
            if (operation !== "update" || data?.status == null) return data;
            const from = originalDoc?.status;
            validateSubOrderStatusTransition(from, data.status);
            return data;
          }
        ],
        afterRead: [
          async ({ doc, req }) => {
            if (!doc || !doc.parentOrder) return doc;
            if (doc.parentOrderNumber) return doc;
            try {
              const orderId = typeof doc.parentOrder === "object" ? doc.parentOrder.id : doc.parentOrder;
              const order = await req.payload.findByID({ collection: "orders", id: orderId, depth: 0 });
              doc.parentOrderNumber = order.orderNumber;
            } catch {
            }
            return doc;
          }
        ],
        afterChange: [
          async ({ doc, previousDoc, operation, req }) => {
            if (operation === "create") return doc;
            const fromStatus = previousDoc?.status;
            const toStatus = doc.status;
            if (toStatus === "cancelled") {
              const payload = req.payload;
              const subOrderId = doc.id;
              const { docs: itemDocs } = await payload.find({
                collection: "order-items",
                where: { subOrder: { equals: subOrderId } },
                limit: 1e3,
                depth: 1
              });
              await releaseOrderInventory(payload, itemDocs, req);
            }
            const alreadyShipped = ["shipped", "delivered", "completed"].includes(fromStatus ?? "");
            if (toStatus === "shipped" && !alreadyShipped) {
              const payload = req.payload;
              const subOrderId = doc.id;
              const { docs: itemDocs } = await payload.find({
                collection: "order-items",
                where: { subOrder: { equals: subOrderId } },
                limit: 1e3,
                depth: 1
              });
              await consumeOrderInventory(payload, itemDocs, req);
            }
          },
          async ({ doc, previousDoc, operation, req }) => {
            if (operation === "create") return doc;
            const fromStatus = previousDoc?.status;
            const toStatus = doc.status;
            if (!fromStatus || !toStatus || fromStatus === toStatus) return doc;
            const payload = req.payload;
            const parentOrderId = typeof doc.parentOrder === "object" ? doc.parentOrder.id : doc.parentOrder;
            if (!parentOrderId) return doc;
            const { docs: subOrders } = await payload.find({
              collection: "sub-orders",
              where: { parentOrder: { equals: parentOrderId } },
              limit: 100,
              depth: 0
            });
            const statuses = subOrders.map(
              (so) => so.id === doc.id ? doc.status : so.status
            ).filter(Boolean);
            const strategy = (process.env.PARENT_ORDER_STATUS_STRATEGY ?? "fulfillment-only").toLowerCase();
            const fulfillmentOnly = strategy !== "strict";
            const active = statuses.filter((s) => s !== "cancelled" && s !== "refunded");
            const hasCancelledOrRefunded = statuses.some((s) => s === "cancelled" || s === "refunded");
            let newParentStatus;
            if (statuses.length && statuses.every((s) => s === "cancelled" || s === "refunded")) {
              newParentStatus = "cancelled";
            } else if (active.length === 0) {
            } else if (!fulfillmentOnly && hasCancelledOrRefunded) {
              newParentStatus = "partially-shipped";
            } else if (active.every((s) => s === "completed")) {
              newParentStatus = "completed";
            } else if (active.every((s) => s === "delivered" || s === "completed")) {
              newParentStatus = "delivered";
            } else if (active.every((s) => ["shipped", "delivered", "completed"].includes(s))) {
              newParentStatus = "shipped";
            } else if (active.some((s) => ["shipped", "delivered", "completed"].includes(s))) {
              newParentStatus = "partially-shipped";
            }
            if (newParentStatus) {
              await payload.update({
                collection: "orders",
                id: parentOrderId,
                overrideAccess: true,
                data: { status: newParentStatus },
                req
              });
            }
            return doc;
          }
        ]
      },
      access: {
        create: isAdmin,
        // Only created via process-checkout
        read: ({ req }) => {
          if (!req.user) return false;
          if (req.user.role === "admin") return true;
          if (req.user.role === "customer") {
            return {
              parentOrder: {
                customer: {
                  equals: req.user.id
                }
              }
            };
          }
          if (req.user.role === "vendor" && req.user.tenant) {
            const tenantId = typeof req.user.tenant === "object" ? req.user.tenant.id : req.user.tenant;
            return { tenant: { equals: tenantId } };
          }
          return false;
        },
        update: isAdminOrVendorOwner,
        delete: () => false
        // Sub-orders follow parent order lifecycle
      },
      fields: [
        {
          name: "parentOrder",
          type: "relationship",
          relationTo: "orders",
          required: true,
          admin: {
            description: "Parent customer order.",
            readOnly: true
          }
        },
        {
          name: "parentOrderNumber",
          type: "text",
          admin: {
            description: "Parent order number for display (e.g. ORD-20260302-ABCD). Auto-set on create.",
            readOnly: true
          }
        },
        {
          name: "tenant",
          type: "relationship",
          relationTo: "tenants",
          required: true,
          admin: { description: "Vendor fulfilling this segment." }
        },
        {
          name: "tenantNameSnapshot",
          type: "text",
          admin: {
            readOnly: true,
            description: "Vendor display name at checkout. Immutable after create."
          }
        },
        {
          name: "subOrderNumber",
          type: "text",
          required: true,
          unique: true,
          admin: { description: "e.g. ORD-20260217-XXXX-A" }
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "pending",
          options: subOrderStatusOptions
        },
        {
          name: "items",
          type: "relationship",
          relationTo: "order-items",
          hasMany: true,
          admin: { description: "Order items for this vendor." }
        },
        { name: "subtotal", type: "number", required: true, defaultValue: 0 },
        { name: "shippingTotal", type: "number", required: true, defaultValue: 0 },
        { name: "taxTotal", type: "number", required: true, defaultValue: 0 },
        {
          name: "commissionAmount",
          type: "number",
          required: true,
          defaultValue: 0,
          admin: { description: "Platform fee for this sub-order." }
        },
        {
          name: "commissionRate",
          type: "number",
          admin: { description: "Snapshot of rate at order time." }
        },
        {
          name: "vendorEarnings",
          type: "number",
          required: true,
          defaultValue: 0,
          admin: { description: "subtotal - commissionAmount." }
        },
        {
          name: "shippingMethod",
          type: "text",
          admin: { description: "Carrier or method label. Editable during fulfillment." }
        },
        {
          name: "trackingNumber",
          type: "text",
          admin: { description: "Tracking ID. Editable when the carrier assigns or corrects it." }
        },
        {
          name: "trackingUrl",
          type: "text",
          admin: { description: "Customer-facing tracking link." }
        },
        { name: "shippedAt", type: "date", admin: { description: "When the segment shipped." } },
        { name: "deliveredAt", type: "date", admin: { description: "When delivery was confirmed." } },
        {
          name: "fulfilledBy",
          type: "relationship",
          relationTo: "users",
          admin: { description: "Vendor user who processed shipment." }
        },
        {
          name: "store",
          type: "relationship",
          relationTo: "stock-locations",
          admin: {
            description: "Fulfilling store/outlet (checkout default from cart). Admins or vendors may reassign if fulfillment is routed differently."
          }
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/orders/index.ts
var orders_exports = {};
__export(orders_exports, {
  ordersPlugin: () => ordersPlugin
});
var ordersPlugin;
var init_orders2 = __esm({
  "packages/backend/src/plugins/orders/index.ts"() {
    "use strict";
    init_orders();
    init_order_items();
    init_order_status_history();
    init_sub_orders();
    ordersPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true, splitByVendor = false } = options;
      if (!enabled) return incomingConfig;
      const collections2 = [
        ...incomingConfig.collections || [],
        createOrderItemsConfig(splitByVendor),
        OrderStatusHistory,
        createOrdersConfig(splitByVendor)
      ];
      if (splitByVendor) {
        collections2.push(SubOrders);
      }
      return {
        ...incomingConfig,
        collections: collections2
      };
    };
  }
});

// packages/backend/src/plugins/commissions/collections/commission-rules.ts
var CommissionRules;
var init_commission_rules = __esm({
  "packages/backend/src/plugins/commissions/collections/commission-rules.ts"() {
    "use strict";
    init_is_admin();
    CommissionRules = {
      slug: "commission-rules",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "type", "rate", "priority", "isActive"],
        group: "Commissions",
        description: "Platform commission rules. Higher priority wins when multiple rules apply."
      },
      access: {
        create: isAdmin,
        read: ({ req }) => Boolean(req.user),
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        { name: "name", type: "text", required: true, admin: { description: "Human-readable rule name." } },
        {
          name: "type",
          type: "select",
          required: true,
          options: [
            { label: "Percentage", value: "percentage" },
            { label: "Flat", value: "flat" },
            { label: "Tiered", value: "tiered" },
            { label: "Category-based", value: "category-based" }
          ]
        },
        {
          name: "rate",
          type: "number",
          min: 0,
          admin: { description: "For percentage: rate %. For flat: fixed amount." }
        },
        {
          name: "tiers",
          type: "array",
          admin: { description: "For tiered: minAmount, maxAmount, rate." },
          fields: [
            { name: "minAmount", type: "number", required: true },
            { name: "maxAmount", type: "number" },
            { name: "rate", type: "number", required: true }
          ]
        },
        {
          name: "categories",
          type: "relationship",
          relationTo: "categories",
          hasMany: true,
          admin: { description: "For category-based: applies to these categories." }
        },
        {
          name: "categoryRate",
          type: "number",
          min: 0,
          admin: { description: "Rate for category-based rule." }
        },
        {
          name: "tenant",
          type: "relationship",
          relationTo: "tenants",
          admin: { description: "Null = global default. Set for vendor override." }
        },
        {
          name: "priority",
          type: "number",
          defaultValue: 0,
          admin: { description: "Higher priority wins. Default 0." }
        },
        {
          name: "isActive",
          type: "checkbox",
          defaultValue: true
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/commissions/index.ts
var commissions_exports = {};
__export(commissions_exports, {
  commissionsPlugin: () => commissionsPlugin
});
var commissionsPlugin;
var init_commissions = __esm({
  "packages/backend/src/plugins/commissions/index.ts"() {
    "use strict";
    init_commission_rules();
    commissionsPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = false } = options;
      if (!enabled) return incomingConfig;
      return {
        ...incomingConfig,
        collections: [...incomingConfig.collections || [], CommissionRules]
      };
    };
  }
});

// packages/backend/src/plugins/payouts/collections/payouts.ts
var Payouts;
var init_payouts = __esm({
  "packages/backend/src/plugins/payouts/collections/payouts.ts"() {
    "use strict";
    init_is_admin();
    Payouts = {
      slug: "payouts",
      admin: {
        useAsTitle: "id",
        defaultColumns: ["tenant", "periodStart", "periodEnd", "netAmount", "status", "processedAt"],
        group: "Payouts",
        description: "Vendor payout records. Admin disburses manually or via bank transfer."
      },
      access: {
        create: isAdmin,
        read: ({ req }) => {
          if (!req.user) return false;
          if (req.user.role === "admin") return true;
          if (req.user.role === "vendor" && req.user.tenant) {
            const tenantId = typeof req.user.tenant === "object" ? req.user.tenant.id : req.user.tenant;
            return { tenant: { equals: tenantId } };
          }
          return false;
        },
        update: isAdmin,
        delete: () => false
      },
      fields: [
        {
          name: "tenant",
          type: "relationship",
          relationTo: "tenants",
          required: true
        },
        { name: "periodStart", type: "date", required: true },
        { name: "periodEnd", type: "date", required: true },
        { name: "totalEarnings", type: "number", required: true, defaultValue: 0 },
        { name: "totalCommission", type: "number", required: true, defaultValue: 0 },
        { name: "netAmount", type: "number", required: true, defaultValue: 0 },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "pending",
          options: [
            { label: "Pending", value: "pending" },
            { label: "Processing", value: "processing" },
            { label: "Completed", value: "completed" },
            { label: "Failed", value: "failed" },
            { label: "On Hold", value: "on-hold" }
          ]
        },
        {
          name: "method",
          type: "text",
          admin: { description: "e.g. stripe-transfer, bank-transfer, manual" }
        },
        { name: "providerPayoutId", type: "text" },
        {
          name: "items",
          type: "relationship",
          relationTo: "payout-items",
          hasMany: true
        },
        { name: "processedAt", type: "date" },
        { name: "notes", type: "textarea" }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/payouts/collections/payout-items.ts
var PayoutItems;
var init_payout_items = __esm({
  "packages/backend/src/plugins/payouts/collections/payout-items.ts"() {
    "use strict";
    init_is_admin();
    init_is_admin_or_vendor_owner();
    PayoutItems = {
      slug: "payout-items",
      admin: {
        useAsTitle: "orderNumber",
        defaultColumns: ["payout", "subOrder", "orderNumber", "amount", "commission", "status"],
        group: "Payouts"
      },
      access: {
        create: isAdmin,
        read: isAdminOrVendorOwner,
        update: isAdmin,
        delete: isAdmin
      },
      fields: [
        {
          name: "payout",
          type: "relationship",
          relationTo: "payouts",
          required: true
        },
        {
          name: "subOrder",
          type: "relationship",
          relationTo: "sub-orders",
          required: true
        },
        { name: "orderNumber", type: "text", admin: { description: "For reference." } },
        { name: "amount", type: "number", required: true },
        { name: "commission", type: "number", required: true, defaultValue: 0 },
        {
          name: "status",
          type: "select",
          defaultValue: "included",
          options: [
            { label: "Included", value: "included" },
            { label: "Held", value: "held" },
            { label: "Disputed", value: "disputed" }
          ]
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/payouts/index.ts
var payouts_exports = {};
__export(payouts_exports, {
  payoutsPlugin: () => payoutsPlugin
});
var payoutsPlugin;
var init_payouts2 = __esm({
  "packages/backend/src/plugins/payouts/index.ts"() {
    "use strict";
    init_payouts();
    init_payout_items();
    payoutsPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = false } = options;
      if (!enabled) return incomingConfig;
      return {
        ...incomingConfig,
        collections: [
          ...incomingConfig.collections || [],
          PayoutItems,
          // Must be before Payouts (relationship)
          Payouts
        ]
      };
    };
  }
});

// packages/backend/src/plugins/notifications/index.ts
var notifications_exports = {};
__export(notifications_exports, {
  notificationsPlugin: () => notificationsPlugin
});
var notificationsPlugin;
var init_notifications = __esm({
  "packages/backend/src/plugins/notifications/index.ts"() {
    "use strict";
    notificationsPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true } = options;
      if (!enabled) return incomingConfig;
      return incomingConfig;
    };
  }
});

// packages/backend/src/plugins/verification/collections/verification-codes.ts
var VerificationCodes;
var init_verification_codes = __esm({
  "packages/backend/src/plugins/verification/collections/verification-codes.ts"() {
    "use strict";
    init_is_admin();
    VerificationCodes = {
      slug: "verification-codes",
      admin: {
        useAsTitle: "id",
        defaultColumns: ["identifier", "type", "used", "expiresAt", "createdAt"],
        group: "Platform",
        description: "Email/phone verification codes and tokens. Single-use, auto-expire."
      },
      access: {
        create: () => false,
        // Only created by verification endpoints
        read: isAdmin,
        update: () => false,
        delete: isAdmin
      },
      fields: [
        {
          name: "identifier",
          type: "text",
          required: true,
          admin: { description: "Email address or phone number." }
        },
        {
          name: "type",
          type: "select",
          required: true,
          options: [
            { label: "Email", value: "email" },
            { label: "Phone", value: "phone" }
          ]
        },
        {
          name: "code",
          type: "text",
          required: true,
          admin: { description: "OTP code or link token (hashed or plain per strategy)." }
        },
        {
          name: "expiresAt",
          type: "date",
          required: true,
          admin: { description: "After this time the code is invalid." }
        },
        {
          name: "used",
          type: "checkbox",
          defaultValue: false
        },
        {
          name: "usedAt",
          type: "date",
          admin: { description: "When the code was consumed." }
        },
        {
          name: "ip",
          type: "text",
          admin: {
            description: "Origin IP address when the code was created (for rate limiting / audit)."
          }
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/notifications/lib/send-email.ts
var send_email_exports = {};
__export(send_email_exports, {
  sendEmail: () => sendEmail,
  sendGuestPaymentNotConfirmedEmail: () => sendGuestPaymentNotConfirmedEmail,
  sendOrderConfirmationEmail: () => sendOrderConfirmationEmail
});
async function sendEmail(options) {
  const { to, subject, html, text } = options;
  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (smtpConfigured) {
    console.log("[Notifications] SMTP configured but nodemailer not yet integrated. Logging email:");
  }
  const content = text || html || "";
  const previewLength = content.includes("verify-email/") ? 200 : 100;
  console.log("[Notifications] Email:", { to, subject, preview: content.slice(0, previewLength) });
  return true;
}
async function sendOrderConfirmationEmail(orderNumber, recipientEmail, grandTotal, currency) {
  if (process.env.BS_TEST_ORDER_EMAIL_REJECT === "true") {
    return Promise.reject(new Error("simulated order email failure"));
  }
  const subject = `Order Confirmation: ${orderNumber}`;
  const text = `Thank you for your order ${orderNumber}. Total: ${currency} ${grandTotal}.`;
  const html = `<p>Thank you for your order <strong>${orderNumber}</strong>.</p><p>Total: ${currency} ${grandTotal}</p>`;
  return sendEmail({ to: recipientEmail, subject, html, text });
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function sendGuestPaymentNotConfirmedEmail(orderNumber, guestEmail, gatewayStatus) {
  if (process.env.BS_TEST_PAYMENT_FAILURE_EMAIL_REJECT === "true") {
    return Promise.reject(new Error("simulated payment failure email reject"));
  }
  const subject = `Payment not completed \u2014 order ${orderNumber} not confirmed`;
  const safeStatus = (gatewayStatus.trim() || "FAILED").slice(0, 120);
  const text = [
    `Your checkout for order ${orderNumber} did not complete successfully.`,
    `Our payment partner reported status: ${safeStatus}.`,
    `This order is not confirmed and has not been paid.`,
    `You can return to the store and place your order again if you still want these items.`,
    `Keep this order number (${orderNumber}) if you contact support.`
  ].join("\n\n");
  const esc = escapeHtml(safeStatus);
  const html = `<p>Your checkout for order <strong>${escapeHtml(orderNumber)}</strong> did not complete successfully.</p><p>The payment gateway reported: <strong>${esc}</strong>.</p><p>This order is <strong>not confirmed</strong> and has not been paid.</p><p>You can return to the store and place your order again if you wish.</p><p>If you need help, contact support and mention order number <strong>${escapeHtml(orderNumber)}</strong>.</p>`;
  return sendEmail({ to: guestEmail.trim().toLowerCase(), subject, html, text });
}
var init_send_email = __esm({
  "packages/backend/src/plugins/notifications/lib/send-email.ts"() {
    "use strict";
  }
});

// packages/backend/src/plugins/verification/adapters/email-link.ts
async function sendVerificationLink(email, token, expiryMinutes = DEFAULT_EXPIRY_MINUTES) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERIFICATION_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/api/auth/verify-email/${token}`;
  const subject = "Verify your email address";
  const html = `
    <p>Please verify your email by clicking the link below.</p>
    <p><a href="${verifyUrl}">Verify email</a></p>
    <p>This link expires in ${expiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>
  `;
  const text = `Verify your email: ${verifyUrl}

This link expires in ${expiryMinutes} minutes.`;
  if (process.env.NODE_ENV !== "production") {
    console.log("[Verification] Full link \u2014 copy the token (after the last /) for POST /api/auth/verify-email:", verifyUrl);
    console.log("[Verification] Token only:", token);
  }
  return sendEmail({ to: email, subject, html, text });
}
var DEFAULT_EXPIRY_MINUTES;
var init_email_link = __esm({
  "packages/backend/src/plugins/verification/adapters/email-link.ts"() {
    "use strict";
    init_send_email();
    DEFAULT_EXPIRY_MINUTES = 30;
  }
});

// packages/backend/src/plugins/verification/adapters/email-otp.ts
async function sendVerificationOTP(email, code, expirySeconds) {
  const subject = "Your verification code";
  const html = `
    <p>Your verification code is: <strong>${code}</strong></p>
    <p>It expires in ${Math.ceil(expirySeconds / 60)} minutes. Do not share this code.</p>
  `;
  const text = `Your verification code is: ${code}. It expires in ${Math.ceil(expirySeconds / 60)} minutes.`;
  return sendEmail({ to: email, subject, html, text });
}
var init_email_otp = __esm({
  "packages/backend/src/plugins/verification/adapters/email-otp.ts"() {
    "use strict";
    init_send_email();
  }
});

// packages/backend/src/plugins/verification/adapters/phone-console.ts
var phoneConsoleAdapter;
var init_phone_console = __esm({
  "packages/backend/src/plugins/verification/adapters/phone-console.ts"() {
    "use strict";
    phoneConsoleAdapter = {
      async sendOTP(phone, code, expirySeconds) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[Verification] Phone OTP (console only):", { phone, code, expirySeconds });
        }
        return true;
      }
    };
  }
});

// packages/backend/src/plugins/verification/adapters/phone-twilio.ts
function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}
var phoneTwilioAdapter;
var init_phone_twilio = __esm({
  "packages/backend/src/plugins/verification/adapters/phone-twilio.ts"() {
    "use strict";
    phoneTwilioAdapter = {
      async sendOTP(phone, code, expirySeconds) {
        const config = getTwilioConfig();
        if (!config) {
          console.warn("[Verification] Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER). Logging OTP.");
          if (process.env.NODE_ENV !== "production") {
            console.log("[Verification] Phone OTP:", { phone, code, expirySeconds });
          }
          return true;
        }
        const body = new URLSearchParams({
          To: phone.startsWith("+") ? phone : `+${phone}`,
          From: config.fromNumber,
          Body: `Your verification code is: ${code}. It expires in ${Math.ceil(expirySeconds / 60)} minutes.`
        });
        const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
        const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
          });
          if (!res.ok) {
            const err = await res.text();
            console.error("[Verification] Twilio error:", res.status, err);
            return false;
          }
          return true;
        } catch (err) {
          console.error("[Verification] Twilio request failed:", err);
          return false;
        }
      }
    };
  }
});

// packages/backend/src/plugins/verification/adapters/phone-sslwireless.ts
var phoneSSLWirelessAdapter;
var init_phone_sslwireless = __esm({
  "packages/backend/src/plugins/verification/adapters/phone-sslwireless.ts"() {
    "use strict";
    phoneSSLWirelessAdapter = {
      async sendOTP(phone, code, expirySeconds) {
        const apiKey = process.env.SSLWIRELESS_API_KEY;
        const sender = process.env.SSLWIRELESS_SENDER;
        if (!apiKey || !sender) {
          if (process.env.NODE_ENV !== "production") {
            console.log("[Verification] SSL Wireless not configured. Phone OTP (console):", { phone, code, expirySeconds });
          }
          return true;
        }
        if (process.env.NODE_ENV !== "production") {
          console.log("[Verification] SSL Wireless stub \u2014 OTP:", { phone, code, expirySeconds });
        }
        return true;
      }
    };
  }
});

// packages/backend/src/plugins/verification/adapters/get-phone-adapter.ts
import path2 from "node:path";
import { pathToFileURL } from "node:url";
function isAdapter(obj) {
  return typeof obj === "object" && obj !== null && typeof obj.sendOTP === "function";
}
async function loadCustomAdapter() {
  if (customAdapterCache) return customAdapterCache;
  const adapterPath = process.env.VERIFICATION_PHONE_ADAPTER_PATH;
  if (!adapterPath?.trim()) {
    console.warn("[Verification] PHONE_VERIFICATION_PROVIDER=custom but VERIFICATION_PHONE_ADAPTER_PATH not set. Using console adapter.");
    return phoneConsoleAdapter;
  }
  try {
    const resolved = path2.resolve(process.cwd(), adapterPath.trim());
    const fileUrl = pathToFileURL(resolved).href;
    const mod = await import(
      /* webpackIgnore: true */
      fileUrl
    );
    const adapter = mod?.default ?? mod;
    if (!isAdapter(adapter)) {
      console.error("[Verification] Custom adapter must export default or named object with sendOTP(phone, code, expirySeconds). Using console adapter.");
      return phoneConsoleAdapter;
    }
    customAdapterCache = adapter;
    return adapter;
  } catch (err) {
    console.error("[Verification] Failed to load custom phone adapter:", err);
    return phoneConsoleAdapter;
  }
}
function getPhoneAdapterSync() {
  const provider = (process.env.PHONE_VERIFICATION_PROVIDER || "console").toLowerCase();
  switch (provider) {
    case "twilio":
      return phoneTwilioAdapter;
    case "sslwireless":
      return phoneSSLWirelessAdapter;
    case "custom":
      return phoneConsoleAdapter;
    case "console":
    default:
      return phoneConsoleAdapter;
  }
}
async function getPhoneAdapter() {
  const provider = (process.env.PHONE_VERIFICATION_PROVIDER || "console").toLowerCase();
  if (provider !== "custom") return getPhoneAdapterSync();
  return loadCustomAdapter();
}
var customAdapterCache;
var init_get_phone_adapter = __esm({
  "packages/backend/src/plugins/verification/adapters/get-phone-adapter.ts"() {
    "use strict";
    init_phone_console();
    init_phone_twilio();
    init_phone_sslwireless();
    customAdapterCache = null;
  }
});

// packages/backend/src/plugins/verification/lib/generate-code.ts
import crypto from "node:crypto";
function generateVerificationToken() {
  return crypto.randomBytes(EMAIL_LINK_TOKEN_BYTES).toString("base64url");
}
function generateOTP(length = OTP_DIGITS) {
  const max = 10 ** length - 1;
  const n = crypto.randomInt(0, max + 1);
  return n.toString().padStart(length, "0");
}
var EMAIL_LINK_TOKEN_BYTES, OTP_DIGITS;
var init_generate_code = __esm({
  "packages/backend/src/plugins/verification/lib/generate-code.ts"() {
    "use strict";
    EMAIL_LINK_TOKEN_BYTES = 32;
    OTP_DIGITS = 6;
  }
});

// packages/backend/src/plugins/verification/endpoints/send-verification.ts
function parsePositiveInt(raw2, fallback) {
  if (!raw2) return fallback;
  const parsed = Number.parseInt(raw2, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parseBoundedPositiveInt(raw2, fallback, min, max) {
  const parsed = parsePositiveInt(raw2, fallback);
  return Math.min(max, Math.max(min, parsed));
}
function getEmailStrategy() {
  const v = process.env.EMAIL_VERIFICATION_STRATEGY?.toLowerCase();
  return v === "otp" ? "otp" : "link";
}
function getOTPLength() {
  const n = parseInt(process.env.EMAIL_VERIFICATION_OTP_LENGTH || "6", 10);
  return Number.isFinite(n) && n >= 4 && n <= 8 ? n : 6;
}
async function sendVerificationHandler(req, deps) {
  const sendLink = deps?.sendVerificationLink ?? sendVerificationLink;
  const sendOtpEmail = deps?.sendVerificationOTP ?? sendVerificationOTP;
  const resolvePhoneAdapter = deps?.getPhoneAdapter ?? getPhoneAdapter;
  const data = await req.json?.().catch(() => ({})) || {};
  const { identifierType, identifier } = data;
  if (!identifierType || !identifier || typeof identifier !== "string") {
    return Response.json(
      { error: "identifierType (email|phone) and identifier are required." },
      { status: 400 }
    );
  }
  const idType = String(identifierType).toLowerCase();
  if (idType !== "email" && idType !== "phone") {
    return Response.json(
      { error: "identifierType must be email or phone." },
      { status: 400 }
    );
  }
  const trimmed = String(identifier).trim();
  if (idType === "email") {
    if (!LOOSE_EMAIL_FORMAT_RE.test(trimmed)) {
      return Response.json({ error: "Invalid email address." }, { status: 400 });
    }
  }
  if (idType === "phone") {
    if (trimmed.length < 10) {
      return Response.json({ error: "Invalid phone number." }, { status: 400 });
    }
  }
  const user = req.user;
  if (idType === "email" && user?.email && trimmed.toLowerCase() !== String(user.email).trim().toLowerCase()) {
    return Response.json(
      { error: "Identifier does not match the authenticated user." },
      { status: 403 }
    );
  }
  if (idType === "phone" && user?.phone && trimmed !== String(user.phone).trim()) {
    return Response.json(
      { error: "Identifier does not match the authenticated user." },
      { status: 403 }
    );
  }
  const payload = req.payload;
  const ip = (
    // PayloadRequest has ip on Node; fall back to header for edge adapters
    req.ip || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || void 0
  );
  const { docs } = await payload.find({
    collection: "verification-codes",
    where: {
      identifier: { equals: trimmed },
      type: { equals: idType }
    },
    limit: 1,
    sort: "-createdAt",
    req,
    overrideAccess: true
  });
  const last = docs[0];
  if (last?.createdAt) {
    const created = new Date(last.createdAt).getTime();
    if (Date.now() - created < COOLDOWN_MS) {
      return Response.json(
        { error: "Please wait before requesting another code.", retryAfter: 60 },
        { status: 429 }
      );
    }
  }
  const windowMinutes = parsePositiveInt(
    process.env.VERIFICATION_RATE_LIMIT_WINDOW_MINUTES,
    DEFAULT_RATE_LIMIT_WINDOW_MINUTES
  );
  const maxRequests = parsePositiveInt(
    process.env.VERIFICATION_RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_RATE_LIMIT_MAX_REQUESTS
  );
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1e3).toISOString();
  const windowForIdentifier = await payload.find({
    collection: "verification-codes",
    where: {
      identifier: { equals: trimmed },
      createdAt: { greater_than_equal: windowStart }
    },
    limit: maxRequests + 1,
    req,
    overrideAccess: true
  });
  if (windowForIdentifier.totalDocs >= maxRequests) {
    return Response.json(
      {
        error: "Too many verification requests for this identifier. Please try again later."
      },
      { status: 429 }
    );
  }
  if (ip) {
    const windowForIp = await payload.find({
      collection: "verification-codes",
      where: {
        ip: { equals: ip },
        createdAt: { greater_than_equal: windowStart }
      },
      limit: maxRequests + 1,
      req,
      overrideAccess: true
    });
    if (windowForIp.totalDocs >= maxRequests) {
      return Response.json(
        {
          error: "Too many verification requests from this IP. Please try again later."
        },
        { status: 429 }
      );
    }
  }
  if (idType === "phone") {
    const otpLength = parseBoundedPositiveInt(
      process.env.PHONE_VERIFICATION_OTP_LENGTH,
      DEFAULT_PHONE_OTP_LENGTH,
      4,
      8
    );
    const code2 = generateOTP(otpLength);
    const expirySeconds2 = parsePositiveInt(
      process.env.PHONE_VERIFICATION_OTP_EXPIRY,
      DEFAULT_PHONE_OTP_EXPIRY_SECONDS
    );
    const expiresAt2 = /* @__PURE__ */ new Date();
    expiresAt2.setSeconds(expiresAt2.getSeconds() + expirySeconds2);
    await payload.create({
      collection: "verification-codes",
      data: {
        identifier: trimmed,
        type: "phone",
        code: code2,
        expiresAt: expiresAt2.toISOString(),
        ip
      },
      req,
      overrideAccess: true
    });
    const adapter = await resolvePhoneAdapter();
    const sent2 = await adapter.sendOTP(trimmed, code2, expirySeconds2);
    if (!sent2) {
      return Response.json({ error: "Failed to send verification code." }, { status: 502 });
    }
    return Response.json({ success: true, message: "Verification code sent to your phone." });
  }
  const strategy = getEmailStrategy();
  const expiresAt = /* @__PURE__ */ new Date();
  if (strategy === "link") {
    const token = generateVerificationToken();
    const expiryMinutes = parsePositiveInt(
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES,
      DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES
    );
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    await payload.create({
      collection: "verification-codes",
      data: {
        identifier: trimmed,
        type: "email",
        code: token,
        expiresAt: expiresAt.toISOString(),
        ip
      },
      req,
      overrideAccess: true
    });
    const sent2 = await sendLink(trimmed, token, expiryMinutes);
    if (!sent2) {
      return Response.json({ error: "Failed to send verification email." }, { status: 502 });
    }
    return Response.json({ success: true, message: "Verification link sent to your email." });
  }
  const code = generateOTP(getOTPLength());
  const expirySeconds = parsePositiveInt(
    process.env.EMAIL_VERIFICATION_OTP_EXPIRY,
    DEFAULT_OTP_EXPIRY_SECONDS
  );
  expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds);
  await payload.create({
    collection: "verification-codes",
    data: {
      identifier: trimmed,
      type: "email",
      code,
      expiresAt: expiresAt.toISOString(),
      ip
    },
    req,
    overrideAccess: true
  });
  const sent = await sendOtpEmail(trimmed, code, expirySeconds);
  if (!sent) {
    return Response.json({ error: "Failed to send verification code." }, { status: 502 });
  }
  return Response.json({ success: true, message: "Verification code sent to your email." });
}
var COOLDOWN_MS, DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES, DEFAULT_OTP_EXPIRY_SECONDS, DEFAULT_PHONE_OTP_EXPIRY_SECONDS, DEFAULT_PHONE_OTP_LENGTH, DEFAULT_RATE_LIMIT_WINDOW_MINUTES, DEFAULT_RATE_LIMIT_MAX_REQUESTS, sendVerificationEndpoint;
var init_send_verification = __esm({
  "packages/backend/src/plugins/verification/endpoints/send-verification.ts"() {
    "use strict";
    init_email_format();
    init_email_link();
    init_email_otp();
    init_get_phone_adapter();
    init_generate_code();
    COOLDOWN_MS = 60 * 1e3;
    DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES = 30;
    DEFAULT_OTP_EXPIRY_SECONDS = 300;
    DEFAULT_PHONE_OTP_EXPIRY_SECONDS = 300;
    DEFAULT_PHONE_OTP_LENGTH = 6;
    DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 10;
    DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;
    sendVerificationEndpoint = {
      path: "/auth/send-verification",
      method: "post",
      handler: async (req) => sendVerificationHandler(req)
    };
  }
});

// packages/backend/src/plugins/verification/lib/verify-email-token.ts
async function consumeEmailVerificationToken({
  token,
  req
}) {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { success: false, error: "Verification token is required." };
  }
  const payload = req.payload;
  const { docs } = await payload.find({
    collection: "verification-codes",
    where: {
      type: { equals: "email" },
      code: { equals: trimmedToken },
      used: { equals: false }
    },
    limit: 1,
    req,
    overrideAccess: true
  });
  const record = docs[0];
  if (!record) {
    return { success: false, error: INVALID_LINK_ERROR };
  }
  const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0;
  if (Date.now() > expiresAt) {
    return { success: false, error: INVALID_LINK_ERROR };
  }
  await payload.update({
    collection: "verification-codes",
    id: record.id,
    data: { used: true, usedAt: (/* @__PURE__ */ new Date()).toISOString() },
    req,
    overrideAccess: true
  });
  const identifier = String(record.identifier || "").trim().toLowerCase();
  if (LOOSE_EMAIL_FORMAT_RE.test(identifier)) {
    const { docs: users } = await payload.find({
      collection: "users",
      where: { email: { equals: identifier } },
      limit: 1,
      req,
      overrideAccess: true
    });
    const user = users[0];
    if (user) {
      await payload.update({
        collection: "users",
        id: user.id,
        data: { emailVerified: true },
        req,
        overrideAccess: true
      });
    }
  }
  return { success: true };
}
var INVALID_LINK_ERROR;
var init_verify_email_token = __esm({
  "packages/backend/src/plugins/verification/lib/verify-email-token.ts"() {
    "use strict";
    init_email_format();
    INVALID_LINK_ERROR = "Invalid or expired verification link.";
  }
});

// packages/backend/src/plugins/verification/endpoints/verify-email-post.ts
var verifyEmailPostEndpoint;
var init_verify_email_post = __esm({
  "packages/backend/src/plugins/verification/endpoints/verify-email-post.ts"() {
    "use strict";
    init_email_format();
    init_verify_email_token();
    verifyEmailPostEndpoint = {
      path: "/auth/verify-email",
      method: "post",
      handler: async (req) => {
        const data = await req.json?.().catch(() => ({})) || {};
        const { token, code, email } = data;
        if (token && typeof token === "string" && token.trim()) {
          const result = await consumeEmailVerificationToken({ token, req });
          if (!result.success) return Response.json({ error: result.error }, { status: 400 });
          return Response.json({ success: true, message: "Email verified." });
        }
        const payload = req.payload;
        if (code && email && typeof code === "string" && typeof email === "string") {
          const emailTrimmed = email.trim().toLowerCase();
          if (!LOOSE_EMAIL_FORMAT_RE.test(emailTrimmed)) {
            return Response.json({ error: "Invalid email address." }, { status: 400 });
          }
          const codeTrimmed = code.trim();
          const { docs } = await payload.find({
            collection: "verification-codes",
            where: {
              type: { equals: "email" },
              identifier: { equals: emailTrimmed },
              code: { equals: codeTrimmed },
              used: { equals: false }
            },
            limit: 1,
            req,
            overrideAccess: true
          });
          const record = docs[0];
          if (!record) {
            return Response.json(
              { error: "Invalid or expired verification code." },
              { status: 400 }
            );
          }
          const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0;
          if (Date.now() > expiresAt) {
            return Response.json(
              { error: "Verification code has expired. Please request a new one." },
              { status: 400 }
            );
          }
          await payload.update({
            collection: "verification-codes",
            id: record.id,
            data: { used: true, usedAt: (/* @__PURE__ */ new Date()).toISOString() },
            req,
            overrideAccess: true
          });
          const { docs: users } = await payload.find({
            collection: "users",
            where: { email: { equals: emailTrimmed } },
            limit: 1
          });
          const user = users[0];
          if (user) {
            await payload.update({
              collection: "users",
              id: user.id,
              data: { emailVerified: true },
              req,
              overrideAccess: true
            });
          }
          return Response.json({ success: true, message: "Email verified." });
        }
        return Response.json(
          { error: "Provide either token (link) or code and email (OTP)." },
          { status: 400 }
        );
      }
    };
  }
});

// packages/backend/src/plugins/verification/endpoints/verify-phone.ts
var verifyPhoneEndpoint;
var init_verify_phone = __esm({
  "packages/backend/src/plugins/verification/endpoints/verify-phone.ts"() {
    "use strict";
    verifyPhoneEndpoint = {
      path: "/auth/verify-phone",
      method: "post",
      handler: async (req) => {
        const data = await req.json?.().catch(() => ({})) || {};
        const { code, phone } = data;
        if (!code || !phone || typeof code !== "string" || typeof phone !== "string") {
          return Response.json(
            { error: "code and phone are required." },
            { status: 400 }
          );
        }
        const phoneTrimmed = String(phone).trim();
        const codeTrimmed = code.trim();
        if (!phoneTrimmed || !codeTrimmed) {
          return Response.json(
            { error: "code and phone are required." },
            { status: 400 }
          );
        }
        const payload = req.payload;
        const { docs } = await payload.find({
          collection: "verification-codes",
          where: {
            type: { equals: "phone" },
            identifier: { equals: phoneTrimmed },
            code: { equals: codeTrimmed },
            used: { equals: false }
          },
          limit: 1,
          req,
          overrideAccess: true
        });
        const record = docs[0];
        if (!record) {
          return Response.json(
            { error: "Invalid or expired verification code." },
            { status: 400 }
          );
        }
        const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0;
        if (Date.now() > expiresAt) {
          return Response.json(
            { error: "Verification code has expired. Please request a new one." },
            { status: 400 }
          );
        }
        await payload.update({
          collection: "verification-codes",
          id: record.id,
          data: { used: true, usedAt: (/* @__PURE__ */ new Date()).toISOString() },
          req,
          overrideAccess: true
        });
        const { docs: users } = await payload.find({
          collection: "users",
          where: { phone: { equals: phoneTrimmed } },
          limit: 1
        });
        const user = users[0];
        if (user) {
          await payload.update({
            collection: "users",
            id: user.id,
            data: { phoneVerified: true },
            req,
            overrideAccess: true
          });
        }
        return Response.json({ success: true, message: "Phone verified." });
      }
    };
  }
});

// packages/backend/src/plugins/verification/endpoints/verify-email-link-get.ts
var verifyEmailLinkGetEndpoint;
var init_verify_email_link_get = __esm({
  "packages/backend/src/plugins/verification/endpoints/verify-email-link-get.ts"() {
    "use strict";
    init_verify_email_token();
    verifyEmailLinkGetEndpoint = {
      path: "/auth/verify-email/:token",
      method: "get",
      handler: async (req) => {
        const token = req.routeParams?.token || "";
        const result = await consumeEmailVerificationToken({
          token: typeof token === "string" ? token : "",
          req
        });
        if (!result.success) return Response.json({ error: result.error }, { status: 400 });
        return Response.json({ success: true, message: "Email verified." });
      }
    };
  }
});

// packages/backend/src/plugins/verification/endpoints/verify-identifier-admin.ts
var verifyIdentifierAdminEndpoint;
var init_verify_identifier_admin = __esm({
  "packages/backend/src/plugins/verification/endpoints/verify-identifier-admin.ts"() {
    "use strict";
    init_is_admin();
    verifyIdentifierAdminEndpoint = {
      path: "/auth/admin/verify-identifier",
      method: "post",
      handler: async (req) => {
        const payload = req.payload;
        if (!isAdmin({ req })) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        const data = await req.json?.().catch(() => ({})) || {};
        const { identifierType, identifier } = data;
        if (!identifierType || !identifier || typeof identifier !== "string") {
          return Response.json(
            { error: "identifierType (email|phone) and identifier are required." },
            { status: 400 }
          );
        }
        const idType = String(identifierType).toLowerCase();
        if (idType !== "email" && idType !== "phone") {
          return Response.json(
            { error: "identifierType must be email or phone." },
            { status: 400 }
          );
        }
        const trimmed = identifier.trim();
        const field = idType === "email" ? "email" : "phone";
        const value = idType === "email" ? trimmed.toLowerCase() : trimmed;
        const where = { [field]: { equals: value } };
        const { docs: users } = await payload.find({
          collection: "users",
          // Payload Where typing is index-based; use a computed key object here.
          where,
          limit: 1,
          req,
          overrideAccess: true
        });
        const user = users[0];
        if (!user) {
          return Response.json({ error: "User not found for given identifier." }, { status: 404 });
        }
        const update = idType === "email" ? { emailVerified: true } : { phoneVerified: true };
        await payload.update({
          collection: "users",
          id: user.id,
          data: update,
          req,
          overrideAccess: true
        });
        const { docs: codes } = await payload.find({
          collection: "verification-codes",
          where: {
            identifier: { equals: trimmed.toLowerCase() },
            type: { equals: idType },
            used: { equals: false }
          },
          limit: 100,
          req,
          overrideAccess: true
        });
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        for (const code of codes) {
          await payload.update({
            collection: "verification-codes",
            id: code.id,
            data: { used: true, usedAt: nowIso },
            req,
            overrideAccess: true
          });
        }
        return Response.json({ success: true, message: "Identifier marked as verified." });
      }
    };
  }
});

// packages/backend/src/plugins/verification/index.ts
var verification_exports = {};
__export(verification_exports, {
  verificationPlugin: () => verificationPlugin
});
var verificationPlugin;
var init_verification = __esm({
  "packages/backend/src/plugins/verification/index.ts"() {
    "use strict";
    init_verification_codes();
    init_send_verification();
    init_verify_email_post();
    init_verify_phone();
    init_verify_email_link_get();
    init_verify_identifier_admin();
    verificationPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true } = options;
      if (!enabled) return incomingConfig;
      const existingCollections = incomingConfig.collections || [];
      const hasVerificationCodes = existingCollections.some((c) => c?.slug === VerificationCodes.slug);
      const collections2 = hasVerificationCodes ? existingCollections : [...existingCollections, VerificationCodes];
      const pluginEndpoints = [
        sendVerificationEndpoint,
        verifyEmailPostEndpoint,
        verifyPhoneEndpoint,
        verifyEmailLinkGetEndpoint,
        verifyIdentifierAdminEndpoint
      ];
      const existingEndpoints = incomingConfig.endpoints || [];
      const existingEndpointPaths = new Set(existingEndpoints.map((e) => e?.path));
      const dedupedPluginEndpoints = pluginEndpoints.filter((e) => !existingEndpointPaths.has(e.path));
      const endpoints = [...existingEndpoints, ...dedupedPluginEndpoints];
      return {
        ...incomingConfig,
        collections: collections2,
        endpoints
      };
    };
  }
});

// packages/backend/src/lib/relation-id.ts
function toStringId(value) {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}
function relationId4(value) {
  if (value == null) return "";
  if (typeof value === "object") return toStringId(value.id);
  return toStringId(value);
}
var init_relation_id = __esm({
  "packages/backend/src/lib/relation-id.ts"() {
    "use strict";
  }
});

// packages/backend/src/plugins/reviews/lib/purchase-checks.ts
async function getProductTenantId(payload, productId, req) {
  const product = await payload.findByID({
    collection: "products",
    id: productId,
    depth: 0,
    overrideAccess: true,
    ...req ? { req } : {}
  });
  const tenant = product?.tenant;
  const tenantId = tenant && typeof tenant === "object" ? tenant.id : tenant;
  return toStringId(tenantId);
}
async function userPurchasedProduct(args) {
  const { payload, userId, productId, req } = args;
  const tenantId = await getProductTenantId(payload, productId, req);
  if (process.env.MULTIVENDOR_ENABLED === "true" && tenantId) {
    const customerOrders = await payload.find({
      collection: "orders",
      where: { customer: { equals: userId } },
      limit: 5e3,
      depth: 0,
      req,
      overrideAccess: true
    });
    const parentOrderIds = customerOrders.docs.map((o) => String(o.id)).filter(Boolean);
    if (!parentOrderIds.length) return false;
    const fulfilledSubOrders = await payload.find({
      collection: "sub-orders",
      where: {
        tenant: { equals: tenantId },
        status: { in: RELEVANT_SUBORDER_STATUSES },
        parentOrder: { in: parentOrderIds }
      },
      limit: 5e3,
      depth: 0,
      req,
      overrideAccess: true
    });
    const fulfilledSubOrderIds = fulfilledSubOrders.docs.map((d) => String(d.id)).filter(Boolean);
    if (!fulfilledSubOrderIds.length) return false;
    const orderItemResult2 = await payload.find({
      collection: "order-items",
      where: {
        product: { equals: productId },
        subOrder: { in: fulfilledSubOrderIds }
      },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true
    });
    return orderItemResult2.totalDocs > 0;
  }
  const fulfilledOrders = await payload.find({
    collection: "orders",
    where: {
      customer: { equals: userId },
      status: { in: RELEVANT_PARENT_ORDER_STATUSES_SINGLE_VS_PLATFORM }
    },
    limit: 5e3,
    depth: 0,
    req,
    overrideAccess: true
  });
  const orderIds = fulfilledOrders.docs.map((o) => String(o.id)).filter(Boolean);
  if (!orderIds.length) return false;
  const orderItemResult = await payload.find({
    collection: "order-items",
    where: {
      order: { in: orderIds },
      product: { equals: productId }
    },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true
  });
  return orderItemResult.totalDocs > 0;
}
async function userPurchasedTenant(args) {
  const { payload, userId, tenantId, req } = args;
  const customerOrders = await payload.find({
    collection: "orders",
    where: {
      customer: { equals: userId },
      status: { in: RELEVANT_PARENT_ORDER_STATUSES_VENDOR }
    },
    limit: 5e3,
    depth: 0,
    req,
    overrideAccess: true
  });
  const parentOrderIds = customerOrders.docs.map((o) => String(o.id)).filter(Boolean);
  if (!parentOrderIds.length) return false;
  const fulfilledSubOrders = await payload.find({
    collection: "sub-orders",
    where: {
      tenant: { equals: tenantId },
      status: { in: RELEVANT_SUBORDER_STATUSES },
      parentOrder: { in: parentOrderIds }
    },
    limit: 5e3,
    depth: 0,
    req,
    overrideAccess: true
  });
  return fulfilledSubOrders.totalDocs > 0;
}
var RELEVANT_SUBORDER_STATUSES, RELEVANT_PARENT_ORDER_STATUSES_SINGLE_VS_PLATFORM, RELEVANT_PARENT_ORDER_STATUSES_VENDOR;
var init_purchase_checks = __esm({
  "packages/backend/src/plugins/reviews/lib/purchase-checks.ts"() {
    "use strict";
    init_relation_id();
    RELEVANT_SUBORDER_STATUSES = ["shipped", "delivered", "completed"];
    RELEVANT_PARENT_ORDER_STATUSES_SINGLE_VS_PLATFORM = ["shipped", "delivered", "completed"];
    RELEVANT_PARENT_ORDER_STATUSES_VENDOR = ["partially-shipped", "shipped", "delivered", "completed"];
  }
});

// packages/backend/src/plugins/reviews/lib/aggregate-ratings.ts
function round22(value) {
  return Math.round(value * 100) / 100;
}
async function recomputeProductRating(payload, args) {
  const { productId, req } = args;
  const { docs } = await payload.find({
    collection: "product-reviews",
    where: { product: { equals: productId }, status: { equals: "approved" } },
    limit: 5e3,
    depth: 0,
    req,
    overrideAccess: true
  });
  const ratings = docs.map((d) => Number(d.rating) || 0);
  const count = ratings.length;
  const avg = count ? ratings.reduce((s, r) => s + r, 0) / count : 0;
  await payload.update({
    collection: "products",
    id: productId,
    overrideAccess: true,
    data: {
      rating: round22(avg),
      totalReviews: count
    },
    req
  });
}
async function recomputeVendorRating(payload, args) {
  const { tenantId, req } = args;
  const { docs } = await payload.find({
    collection: "vendor-reviews",
    where: { tenant: { equals: tenantId }, status: { equals: "approved" } },
    limit: 5e3,
    depth: 0,
    req,
    overrideAccess: true
  });
  const ratings = docs.map((d) => Number(d.rating) || 0);
  const count = ratings.length;
  const avg = count ? ratings.reduce((s, r) => s + r, 0) / count : 0;
  const { docs: profiles } = await payload.find({
    collection: "vendor-profiles",
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true
  });
  const profile = profiles[0];
  if (!profile) return;
  await payload.update({
    collection: "vendor-profiles",
    id: profile.id,
    overrideAccess: true,
    data: { rating: round22(avg) },
    req
  });
}
var init_aggregate_ratings = __esm({
  "packages/backend/src/plugins/reviews/lib/aggregate-ratings.ts"() {
    "use strict";
  }
});

// packages/backend/src/plugins/reviews/collections/product-reviews.ts
import { APIError as APIError5 } from "payload";
function createProductReviewsConfig(args) {
  const { requireApproval } = args;
  return {
    slug: "product-reviews",
    admin: {
      useAsTitle: "id",
      defaultColumns: ["product", "author", "rating", "status", "createdAt"],
      group: "Reviews",
      description: "Customer product reviews. Public read (approved only if moderation enabled)."
    },
    access: {
      create: ({ req }) => req.user?.role === "customer",
      read: ({ req }) => {
        if (req.user?.role === "admin") return true;
        if (requireApproval) return { status: { equals: ReviewStatus.Approved } };
        return true;
      },
      update: ({ req }) => {
        if (!req.user) return false;
        if (req.user.role === "admin") return true;
        return req.user.role === "customer";
      },
      delete: ({ req }) => req.user?.role === "admin"
    },
    fields: [
      {
        name: "product",
        type: "relationship",
        relationTo: "products",
        required: true,
        admin: { description: "Reviewed product." }
      },
      {
        name: "author",
        type: "relationship",
        relationTo: "users",
        required: true,
        admin: { description: "Review author (customer)." }
      },
      { name: "rating", type: "number", required: true, min: 1, max: 5, admin: { step: 1 } },
      { name: "title", type: "text", required: false },
      { name: "comment", type: "textarea", localized: true },
      {
        name: "status",
        type: "select",
        required: true,
        defaultValue: requireApproval ? ReviewStatus.Pending : ReviewStatus.Approved,
        options: [
          { label: "Pending", value: ReviewStatus.Pending },
          { label: "Approved", value: ReviewStatus.Approved },
          { label: "Rejected", value: ReviewStatus.Rejected }
        ]
      }
    ],
    hooks: {
      beforeChange: [
        async ({ data, operation, req, originalDoc }) => {
          if (!req.user) throw new APIError5("Forbidden", 403);
          const userId = String(req.user.id);
          if (operation === "create") {
            if (req.user.role !== "customer") throw new APIError5("Forbidden", 403);
            const productId = relationId4(data.product);
            if (!productId) throw new APIError5("product is required", 400);
            const canReview = await userPurchasedProduct({
              payload: req.payload,
              userId,
              productId,
              req
            });
            if (!canReview) {
              throw new APIError5("You can only review products you have purchased.", 400);
            }
            const existing = await req.payload.find({
              collection: "product-reviews",
              where: {
                product: { equals: productId },
                author: { equals: userId }
              },
              limit: 1,
              depth: 0,
              req,
              overrideAccess: true
            });
            if (existing.totalDocs > 0) {
              throw new APIError5("You already reviewed this product.", 400);
            }
            data.author = userId;
            data.status = requireApproval ? ReviewStatus.Pending : ReviewStatus.Approved;
            return data;
          }
          if (operation === "update") {
            const prev = originalDoc;
            const prevAuthor = relationId4(prev?.author);
            const incomingAuthor = relationId4(data.author);
            if (req.user.role !== "admin") {
              if (prevAuthor && prevAuthor !== userId) throw new APIError5("Forbidden", 403);
              if (incomingAuthor && prevAuthor && incomingAuthor !== prevAuthor) {
                throw new APIError5("Forbidden: author cannot be changed.", 403);
              }
              if (data.status != null && data.status !== prev.status) {
                throw new APIError5("Forbidden: only admin can change review status.", 403);
              }
            }
            if (req.user.role !== "admin" && prevAuthor) {
              data.author = prevAuthor;
            }
          }
          return data;
        }
      ],
      afterChange: [
        async ({ doc, req }) => {
          if (!doc) return doc;
          const productId = relationId4(doc.product);
          if (!productId) return doc;
          await recomputeProductRating(req.payload, { productId, req });
          return doc;
        }
      ]
    },
    timestamps: true
  };
}
var ReviewStatus;
var init_product_reviews = __esm({
  "packages/backend/src/plugins/reviews/collections/product-reviews.ts"() {
    "use strict";
    init_relation_id();
    init_purchase_checks();
    init_aggregate_ratings();
    ReviewStatus = {
      Pending: "pending",
      Approved: "approved",
      Rejected: "rejected"
    };
  }
});

// packages/backend/src/plugins/reviews/collections/vendor-reviews.ts
import { APIError as APIError6 } from "payload";
function createVendorReviewsConfig(args) {
  const { requireApproval } = args;
  return {
    slug: "vendor-reviews",
    admin: {
      useAsTitle: "id",
      defaultColumns: ["tenant", "author", "rating", "status", "createdAt"],
      group: "Reviews",
      description: "Customer vendor reviews (multivendor). Public read (approved only if moderation enabled)."
    },
    access: {
      create: ({ req }) => req.user?.role === "customer",
      read: ({ req }) => {
        if (req.user?.role === "admin") return true;
        const statusApproved = { status: { equals: ReviewStatus2.Approved } };
        if (req.user?.role === "vendor" && req.user.tenant) {
          const tenantId = relationId4(req.user.tenant);
          return tenantId ? { tenant: { equals: tenantId } } : false;
        }
        if (req.user?.role === "customer") {
          if (!requireApproval) return true;
          return {
            or: [statusApproved, { author: { equals: String(req.user.id) } }]
          };
        }
        return requireApproval ? statusApproved : true;
      },
      update: ({ req }) => {
        if (!req.user) return false;
        if (req.user.role === "admin") return true;
        return req.user.role === "customer";
      },
      delete: ({ req }) => req.user?.role === "admin"
    },
    fields: [
      {
        name: "tenant",
        type: "relationship",
        relationTo: "tenants",
        required: true,
        admin: { description: "Vendor (tenant) being reviewed." }
      },
      {
        name: "author",
        type: "relationship",
        relationTo: "users",
        required: true,
        admin: { description: "Review author (customer)." }
      },
      { name: "rating", type: "number", required: true, min: 1, max: 5, admin: { step: 1 } },
      { name: "title", type: "text", required: false },
      { name: "comment", type: "textarea", localized: true },
      {
        name: "status",
        type: "select",
        required: true,
        defaultValue: requireApproval ? ReviewStatus2.Pending : ReviewStatus2.Approved,
        options: [
          { label: "Pending", value: ReviewStatus2.Pending },
          { label: "Approved", value: ReviewStatus2.Approved },
          { label: "Rejected", value: ReviewStatus2.Rejected }
        ]
      }
    ],
    hooks: {
      beforeChange: [
        async ({ data, operation, req, originalDoc }) => {
          if (!req.user) throw new APIError6("Forbidden", 403);
          const userId = String(req.user.id);
          if (operation === "create") {
            if (req.user.role !== "customer") throw new APIError6("Forbidden", 403);
            const tenantId = relationId4(data.tenant);
            if (!tenantId) throw new APIError6("tenant is required", 400);
            const canReview = await userPurchasedTenant({
              payload: req.payload,
              userId,
              tenantId,
              req
            });
            if (!canReview) throw new APIError6("You can only review vendors you have purchased from.", 400);
            const existing = await req.payload.find({
              collection: "vendor-reviews",
              where: { tenant: { equals: tenantId }, author: { equals: userId } },
              limit: 1,
              depth: 0,
              req,
              overrideAccess: true
            });
            if (existing.totalDocs > 0) throw new APIError6("You already reviewed this vendor.", 400);
            data.author = userId;
            data.status = requireApproval ? ReviewStatus2.Pending : ReviewStatus2.Approved;
            return data;
          }
          if (operation === "update") {
            const prev = originalDoc ?? {};
            const prevAuthor = relationId4(prev.author);
            const incomingAuthor = relationId4(data.author);
            if (req.user.role !== "admin") {
              if (prevAuthor && prevAuthor !== userId) throw new APIError6("Forbidden", 403);
              if (incomingAuthor) {
                if (prevAuthor) {
                  if (incomingAuthor !== prevAuthor) {
                    throw new APIError6("Forbidden: author cannot be changed.", 403);
                  }
                }
              }
              if (data.status != null && data.status !== prev.status) {
                throw new APIError6("Forbidden: only admin can change review status.", 403);
              }
            }
            if (req.user.role !== "admin" && prevAuthor) {
              data.author = prevAuthor;
            }
          }
          return data;
        }
      ],
      afterChange: [
        async ({ doc, req }) => {
          if (!doc) return doc;
          const tenantId = relationId4(doc.tenant);
          if (!tenantId) return doc;
          await recomputeVendorRating(req.payload, { tenantId, req });
          return doc;
        }
      ]
    },
    timestamps: true
  };
}
var ReviewStatus2;
var init_vendor_reviews = __esm({
  "packages/backend/src/plugins/reviews/collections/vendor-reviews.ts"() {
    "use strict";
    init_relation_id();
    init_purchase_checks();
    init_aggregate_ratings();
    ReviewStatus2 = {
      Pending: "pending",
      Approved: "approved",
      Rejected: "rejected"
    };
  }
});

// packages/backend/src/plugins/reviews/index.ts
var reviews_exports = {};
__export(reviews_exports, {
  reviewsPlugin: () => reviewsPlugin
});
var reviewsPlugin;
var init_reviews = __esm({
  "packages/backend/src/plugins/reviews/index.ts"() {
    "use strict";
    init_product_reviews();
    init_vendor_reviews();
    reviewsPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true, requireApproval = false, vendorReviews = false } = options;
      if (!enabled) return incomingConfig;
      const collections2 = [
        createProductReviewsConfig({ requireApproval }),
        ...vendorReviews ? [createVendorReviewsConfig({ requireApproval })] : []
      ];
      return {
        ...incomingConfig,
        collections: [...incomingConfig.collections || [], ...collections2]
      };
    };
  }
});

// packages/backend/src/plugins/discounts/collections/coupons.ts
var Coupons;
var init_coupons = __esm({
  "packages/backend/src/plugins/discounts/collections/coupons.ts"() {
    "use strict";
    init_is_admin();
    Coupons = {
      slug: "coupons",
      admin: {
        useAsTitle: "code",
        defaultColumns: ["code", "type", "value", "isActive", "expiresAt", "totalUses", "updatedAt"],
        group: "Discounts",
        description: "Cart-level coupons. Validation always runs server-side."
      },
      access: {
        create: isAdmin,
        read: isAdmin,
        update: isAdmin,
        delete: isAdmin
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (!data) return data;
            if (typeof data.code === "string") {
              data.code = data.code.trim().toUpperCase();
            }
            return data;
          }
        ]
      },
      fields: [
        { name: "code", type: "text", required: true, unique: true, index: true },
        {
          name: "type",
          type: "select",
          required: true,
          defaultValue: "percentage",
          options: [
            { label: "Percentage", value: "percentage" },
            { label: "Fixed", value: "fixed" }
          ]
        },
        { name: "value", type: "number", required: true, min: 0 },
        { name: "minOrderValue", type: "number", defaultValue: 0, min: 0 },
        { name: "expiresAt", type: "date" },
        { name: "maxTotalUses", type: "number", min: 1 },
        { name: "maxUsesPerUser", type: "number", min: 1 },
        { name: "isActive", type: "checkbox", defaultValue: true },
        {
          name: "totalUses",
          type: "number",
          defaultValue: 0,
          min: 0,
          admin: { readOnly: true, description: "Auto-incremented after successful checkout." }
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/discounts/endpoints/coupon-usage.ts
var couponUsageEndpoint;
var init_coupon_usage = __esm({
  "packages/backend/src/plugins/discounts/endpoints/coupon-usage.ts"() {
    "use strict";
    init_is_admin();
    couponUsageEndpoint = {
      path: "/discounts/coupons/:id/usage",
      method: "get",
      handler: async (req) => {
        if (!isAdmin({ req })) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        const couponId = req.routeParams?.id;
        if (!couponId) {
          return Response.json({ error: "Coupon ID is required." }, { status: 400 });
        }
        let coupon;
        try {
          coupon = await req.payload.findByID({
            collection: "coupons",
            id: couponId,
            depth: 0,
            req,
            overrideAccess: true
          });
        } catch {
          return Response.json({ error: "Coupon not found." }, { status: 404 });
        }
        const usageQuery = await req.payload.find({
          collection: "orders",
          where: { appliedCoupon: { equals: couponId } },
          sort: "-createdAt",
          limit: 100,
          depth: 1,
          req,
          overrideAccess: true
        });
        const totalRedemptions = usageQuery.totalDocs;
        const totalDiscountGiven = usageQuery.docs.reduce((sum, order) => {
          return sum + Number(order.discountTotal || 0);
        }, 0);
        const recentOrders = usageQuery.docs.slice(0, 20).map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: typeof order.customer === "object" ? order.customer?.id : order.customer || null,
          discountTotal: Number(order.discountTotal || 0),
          grandTotal: Number(order.grandTotal || 0),
          createdAt: order.createdAt
        }));
        return Response.json({
          coupon: {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: Number(coupon.value || 0),
            isActive: Boolean(coupon.isActive),
            totalUses: Number(coupon.totalUses || 0),
            maxTotalUses: coupon.maxTotalUses ?? null,
            maxUsesPerUser: coupon.maxUsesPerUser ?? null,
            expiresAt: coupon.expiresAt ?? null
          },
          usage: {
            totalRedemptions,
            totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
            sampledOrders: recentOrders
          }
        });
      }
    };
  }
});

// packages/backend/src/plugins/discounts/index.ts
var discounts_exports = {};
__export(discounts_exports, {
  discountsPlugin: () => discountsPlugin
});
var discountsPlugin;
var init_discounts = __esm({
  "packages/backend/src/plugins/discounts/index.ts"() {
    "use strict";
    init_coupons();
    init_coupon_usage();
    discountsPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true } = options;
      if (!enabled) return incomingConfig;
      return {
        ...incomingConfig,
        collections: [...incomingConfig.collections || [], Coupons],
        endpoints: [...incomingConfig.endpoints || [], couponUsageEndpoint]
      };
    };
  }
});

// packages/backend/src/globals/header.ts
var header_exports = {};
__export(header_exports, {
  Header: () => Header
});
var Header;
var init_header = __esm({
  "packages/backend/src/globals/header.ts"() {
    "use strict";
    init_is_admin();
    Header = {
      slug: "header",
      admin: {
        group: "Globals"
      },
      access: {
        read: () => true,
        update: isAdmin
      },
      fields: [
        {
          name: "logo",
          type: "upload",
          relationTo: "media"
        },
        {
          name: "siteName",
          type: "text",
          localized: true,
          defaultValue: "BS-Commerce"
        },
        {
          name: "navLinks",
          type: "array",
          localized: true,
          admin: {
            description: "Primary nav: same ordered list feeds the horizontal bar (tablet/desktop) and the mobile slide-out menu, unless you turn off visibility per row below."
          },
          fields: [
            {
              name: "enabled",
              type: "checkbox",
              defaultValue: true,
              admin: {
                description: "Uncheck to hide this link on the storefront without deleting it."
              }
            },
            {
              name: "label",
              type: "text",
              required: true
            },
            {
              name: "url",
              type: "text",
              required: true
            },
            {
              name: "openInNewTab",
              type: "checkbox",
              defaultValue: false
            },
            {
              name: "showInDesktopNav",
              type: "checkbox",
              defaultValue: true,
              admin: {
                description: "Horizontal primary nav (md breakpoint and up). Uncheck to show this link only in the mobile menu (e.g. long labels)."
              }
            },
            {
              name: "showInMobileDrawer",
              type: "checkbox",
              defaultValue: true,
              admin: {
                description: "Slide-out menu on small screens (below md). Uncheck to show only in the top bar on larger screens."
              }
            }
          ]
        },
        {
          name: "announcementBar",
          type: "group",
          fields: [
            {
              name: "enabled",
              type: "checkbox",
              defaultValue: false
            },
            {
              name: "message",
              type: "text",
              localized: true
            },
            {
              name: "backgroundColor",
              type: "text",
              defaultValue: "#000000",
              admin: {
                description: "Hex color code, e.g. #000000"
              }
            },
            {
              name: "textColor",
              type: "text",
              defaultValue: "#ffffff"
            }
          ]
        }
      ]
    };
  }
});

// packages/backend/src/globals/footer.ts
var footer_exports = {};
__export(footer_exports, {
  Footer: () => Footer
});
var Footer;
var init_footer = __esm({
  "packages/backend/src/globals/footer.ts"() {
    "use strict";
    init_is_admin();
    Footer = {
      slug: "footer",
      admin: {
        group: "Globals"
      },
      access: {
        read: () => true,
        update: isAdmin
      },
      fields: [
        {
          name: "copyrightText",
          type: "text",
          localized: true,
          defaultValue: "\xA9 2026 BS-Commerce. All rights reserved."
        },
        {
          name: "columns",
          type: "array",
          localized: true,
          maxRows: 4,
          fields: [
            {
              name: "heading",
              type: "text",
              required: true
            },
            {
              name: "links",
              type: "array",
              fields: [
                {
                  name: "label",
                  type: "text",
                  required: true
                },
                {
                  name: "url",
                  type: "text",
                  required: true
                },
                {
                  name: "enabled",
                  type: "checkbox",
                  defaultValue: true,
                  admin: {
                    description: "Uncheck to hide this link on the storefront without deleting it (same idea as header primary nav)."
                  }
                },
                {
                  name: "visibility",
                  type: "select",
                  defaultValue: "public",
                  options: [
                    { label: "Everyone", value: "public" },
                    { label: "Guests only (signed out)", value: "guest" },
                    { label: "Signed-in only", value: "authenticated" }
                  ],
                  admin: {
                    description: "Storefront footer: who should see this link. Default is everyone."
                  }
                }
              ]
            }
          ]
        },
        {
          name: "socialLinks",
          type: "array",
          fields: [
            {
              name: "platform",
              type: "select",
              options: [
                { label: "Facebook", value: "facebook" },
                { label: "Instagram", value: "instagram" },
                { label: "Twitter / X", value: "twitter" },
                { label: "YouTube", value: "youtube" },
                { label: "LinkedIn", value: "linkedin" },
                { label: "TikTok", value: "tiktok" }
              ],
              required: true
            },
            {
              name: "url",
              type: "text",
              required: true
            }
          ]
        },
        {
          name: "bottomLinks",
          type: "array",
          localized: true,
          fields: [
            {
              name: "label",
              type: "text",
              required: true
            },
            {
              name: "url",
              type: "text",
              required: true
            }
          ]
        }
      ]
    };
  }
});

// packages/backend/src/globals/platform-settings.ts
var platform_settings_exports = {};
__export(platform_settings_exports, {
  PlatformSettings: () => PlatformSettings
});
var PlatformSettings;
var init_platform_settings = __esm({
  "packages/backend/src/globals/platform-settings.ts"() {
    "use strict";
    init_is_admin();
    PlatformSettings = {
      slug: "platform-settings",
      label: "Platform Settings",
      admin: {
        group: "Globals",
        description: "Global platform configuration, feature flags, and currency settings."
      },
      access: {
        read: ({ req }) => Boolean(req.user),
        update: isAdmin
      },
      fields: [
        // ─── General ──────────────────────────────────────────────────────────────
        {
          name: "platformName",
          type: "text",
          defaultValue: "BS-Commerce"
        },
        {
          name: "supportEmail",
          type: "email"
        },
        {
          name: "supportPhone",
          type: "text"
        },
        // ─── Admin UI branding (Payload admin login + nav) ────────────────────────
        {
          name: "adminBranding",
          type: "group",
          label: "Admin panel branding",
          admin: {
            description: "Custom logo and favicon for the Payload admin (login screen and sidebar). Upload files in Media first, then select them here. Leave empty to use the built-in default marks."
          },
          fields: [
            {
              name: "logo",
              type: "upload",
              relationTo: "media",
              admin: {
                description: "Main logo or wordmark (PNG, WebP, or SVG)."
              }
            },
            {
              name: "favicon",
              type: "upload",
              relationTo: "media",
              admin: {
                description: "Browser tab icon \u2014 square PNG or ICO, at least 32\xD732."
              }
            },
            {
              name: "loginTagline",
              type: "text",
              admin: {
                description: 'Optional line under the logo on the login screen (e.g. "My Store \xB7 Admin"). Leave empty for the default tagline.'
              }
            }
          ]
        },
        // ─── Feature Flags ────────────────────────────────────────────────────────
        {
          name: "features",
          type: "group",
          label: "Feature Flags",
          fields: [
            {
              name: "multivendorEnabled",
              type: "checkbox",
              defaultValue: false,
              admin: {
                description: "Enable marketplace mode. Also requires MULTIVENDOR_ENABLED env var. Env var takes precedence."
              }
            },
            {
              name: "guestCheckoutEnabled",
              type: "checkbox",
              defaultValue: true
            },
            {
              name: "reviewsEnabled",
              type: "checkbox",
              defaultValue: true
            },
            {
              name: "reviewRequiresApproval",
              type: "checkbox",
              defaultValue: false
            },
            {
              name: "inventoryTrackingEnabled",
              type: "checkbox",
              defaultValue: true
            },
            {
              name: "socialLoginEnabled",
              type: "checkbox",
              defaultValue: true
            }
          ]
        },
        // ─── Currency ─────────────────────────────────────────────────────────────
        {
          name: "currency",
          type: "group",
          label: "Currency Settings",
          fields: [
            {
              name: "defaultCurrency",
              type: "select",
              defaultValue: "USD",
              options: [
                { label: "US Dollar (USD)", value: "USD" },
                { label: "Bangladeshi Taka (BDT)", value: "BDT" }
              ]
            },
            {
              name: "supportedCurrencies",
              type: "select",
              hasMany: true,
              defaultValue: ["USD", "BDT"],
              options: [
                { label: "US Dollar (USD)", value: "USD" },
                { label: "Bangladeshi Taka (BDT)", value: "BDT" }
              ]
            },
            {
              name: "usdToBdtRate",
              type: "number",
              defaultValue: 110,
              admin: {
                description: "Exchange rate: 1 USD = ? BDT. Update periodically.",
                step: 0.01
              }
            },
            {
              name: "lastRateUpdated",
              type: "date",
              admin: {
                readOnly: true
              }
            }
          ]
        },
        // ─── Multivendor Defaults ─────────────────────────────────────────────────
        {
          name: "vendorDefaults",
          type: "group",
          label: "Vendor Defaults",
          admin: {
            condition: (data) => data?.features?.multivendorEnabled
          },
          fields: [
            {
              name: "defaultCommissionRate",
              type: "number",
              defaultValue: 0,
              min: 0,
              max: 100,
              admin: {
                description: "Default commission % applied to all vendors unless overridden. 0 = no commission (business sets their rate).",
                step: 0.01
              }
            },
            {
              name: "defaultCommissionType",
              type: "select",
              defaultValue: "percentage",
              options: [
                { label: "Percentage", value: "percentage" },
                { label: "Flat Fee", value: "flat" },
                { label: "Tiered", value: "tiered" }
              ]
            },
            {
              name: "autoApproveVendors",
              type: "checkbox",
              defaultValue: false
            },
            {
              name: "requireKYC",
              type: "checkbox",
              defaultValue: false
            },
            {
              name: "requireProductApproval",
              type: "checkbox",
              defaultValue: false
            },
            {
              name: "payoutSchedule",
              type: "select",
              defaultValue: "biweekly",
              options: [
                { label: "Weekly", value: "weekly" },
                { label: "Biweekly", value: "biweekly" },
                { label: "Monthly", value: "monthly" }
              ]
            },
            {
              name: "payoutHoldDays",
              type: "number",
              defaultValue: 7,
              min: 0,
              admin: {
                description: "Days to hold vendor earnings after order delivery before releasing for payout."
              }
            }
          ]
        },
        // ─── Inventory ────────────────────────────────────────────────────────────
        {
          name: "inventory",
          type: "group",
          label: "Inventory Settings",
          fields: [
            {
              name: "lowStockThreshold",
              type: "number",
              defaultValue: 10,
              admin: {
                description: "Alert when stock falls below this number."
              }
            }
          ]
        },
        // ─── Shipping ─────────────────────────────────────────────────────────────
        {
          name: "shipping",
          type: "group",
          label: "Shipping Settings",
          fields: [
            {
              name: "defaultModel",
              type: "select",
              defaultValue: "platform",
              options: [
                { label: "Platform Managed", value: "platform" },
                { label: "Vendor Managed", value: "vendor" },
                { label: "Hybrid", value: "hybrid" }
              ]
            }
          ]
        }
      ]
    };
  }
});

// packages/backend/src/lib/redis.ts
var redisConfig, cachedCollections;
var init_redis = __esm({
  "packages/backend/src/lib/redis.ts"() {
    "use strict";
    redisConfig = {
      url: process.env.REDIS_URL || "redis://localhost:6379"
    };
    cachedCollections = {
      categories: true,
      pages: true,
      media: true
    };
  }
});

// packages/backend/src/lib/payload-server-url.ts
function normalizeBase(url) {
  return url.replace(/\/$/, "");
}
function getPayloadServerUrl() {
  return normalizeBase(
    process.env.SERVER_PUBLIC_URL || process.env.PAYLOAD_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  );
}
function getSslCommerzIpnPublicBaseUrl() {
  const override = process.env.SSLCOMMERZ_IPN_PUBLIC_URL?.trim();
  if (override) return normalizeBase(override);
  return getPayloadServerUrl();
}
function getPayloadTrustedOrigins() {
  const fromExtra = (process.env.PAYLOAD_TRUSTED_ORIGINS || "").split(",").map((s) => normalizeBase(s.trim())).filter(Boolean);
  return [
    ...new Set(
      [
        getPayloadServerUrl(),
        process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001",
        process.env.NEXT_PUBLIC_MULTIVENDOR_STOREFRONT_URL,
        ...fromExtra
      ].filter((x) => Boolean(x) && x !== "null").map((o) => normalizeBase(o))
    )
  ];
}
var init_payload_server_url = __esm({
  "packages/backend/src/lib/payload-server-url.ts"() {
    "use strict";
  }
});

// packages/backend/src/endpoints/auth-login.ts
var authLoginEndpoint;
var init_auth_login = __esm({
  "packages/backend/src/endpoints/auth-login.ts"() {
    "use strict";
    init_email_format();
    authLoginEndpoint = {
      path: "/auth/login",
      method: "post",
      handler: async (req) => {
        const data = await req.json?.().catch(() => ({})) || {};
        const { identifier, password } = data;
        if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
          return Response.json({ errors: [{ message: "Identifier (email or phone) is required." }] }, { status: 400 });
        }
        if (!password || typeof password !== "string") {
          return Response.json({ errors: [{ message: "Password is required." }] }, { status: 400 });
        }
        const trimmed = identifier.trim().toLowerCase();
        const isEmail = LOOSE_EMAIL_FORMAT_RE.test(trimmed);
        const payload = req.payload;
        const loginData = isEmail ? { email: trimmed, password } : { username: identifier.trim(), password };
        try {
          const result = await payload.login({
            collection: "users",
            // loginWithUsername accepts email or username; Payload's generated types expect email
            data: loginData,
            req
          });
          const requireVerified = process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN === "true";
          if (requireVerified) {
            const user = result?.user;
            if (user?.email && user.emailVerified === false) {
              return Response.json(
                {
                  errors: [
                    {
                      message: "Email address is not verified. Please verify your email before logging in."
                    }
                  ]
                },
                { status: 403 }
              );
            }
          }
          return Response.json(result, { status: 200 });
        } catch (err) {
          const status = err?.status ?? 401;
          const message = err instanceof Error ? err.message : "Authentication failed";
          return Response.json({ errors: [{ message }] }, { status });
        }
      }
    };
  }
});

// packages/backend/src/lib/rate-limiter.ts
import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
function parsePositiveEnvInt(name, fallback) {
  const raw2 = process.env[name];
  if (!raw2) return fallback;
  const parsed = Number.parseInt(raw2, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function createRedisConnection() {
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true
  });
  redis.connect().catch((err) => {
    console.warn("[rate-limiter] Redis connection failed \u2014 rate limiting disabled:", err.message);
  });
  return redis;
}
function getRedisClient() {
  if (!_redis) {
    _redis = _redisFactory();
  }
  return _redis;
}
function createRateLimiter(config, options) {
  const storeClient = options?.storeClient ?? getRedisClient();
  return new RateLimiterRedis({
    storeClient,
    points: config.points,
    duration: config.duration,
    keyPrefix: config.keyPrefix
  });
}
async function enforceRateLimit(limiter, key) {
  try {
    await limiter.consume(key);
    return null;
  } catch (err) {
    if (err && typeof err === "object" && "msBeforeNext" in err) {
      const retryAfter = Math.ceil(Number(err.msBeforeNext) / 1e3);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter)
          }
        }
      );
    }
    console.warn("[rate-limiter] Redis error \u2014 allowing request through:", err?.message);
    return null;
  }
}
function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
var _redis, _redisFactory, CHECKOUT_RATE_LIMIT, GUEST_LOOKUP_RATE_LIMIT;
var init_rate_limiter = __esm({
  "packages/backend/src/lib/rate-limiter.ts"() {
    "use strict";
    _redis = null;
    _redisFactory = createRedisConnection;
    CHECKOUT_RATE_LIMIT = {
      points: parsePositiveEnvInt("CHECKOUT_RATE_LIMIT_POINTS", 5),
      duration: parsePositiveEnvInt("CHECKOUT_RATE_LIMIT_DURATION_SECONDS", 60)
    };
    GUEST_LOOKUP_RATE_LIMIT = {
      points: parsePositiveEnvInt("GUEST_LOOKUP_RATE_LIMIT_POINTS", 10),
      duration: parsePositiveEnvInt("GUEST_LOOKUP_RATE_LIMIT_DURATION_SECONDS", 900)
    };
  }
});

// packages/backend/src/lib/validation/phone-format.ts
import {
  isSupportedCountry,
  isValidPhoneNumber,
  parsePhoneNumber
} from "libphonenumber-js";
function readOptionalValidationRegex() {
  if (cachedOptionalRegex !== void 0) return cachedOptionalRegex;
  const raw2 = process.env.PHONE_VALIDATION_REGEX?.trim();
  if (!raw2) {
    cachedOptionalRegex = null;
    return null;
  }
  try {
    const slash = raw2.match(/^\/(.+)\/([gimsuy]*)$/);
    cachedOptionalRegex = slash ? new RegExp(slash[1], slash[2] || "") : new RegExp(raw2);
  } catch {
    cachedOptionalRegex = null;
  }
  return cachedOptionalRegex;
}
function defaultRegionFromEnv() {
  const raw2 = process.env.DEFAULT_PHONE_REGION?.trim().toUpperCase();
  if (!raw2 || raw2.length !== 2) return void 0;
  return isSupportedCountry(raw2) ? raw2 : void 0;
}
function resolvePhoneValidationRegion(shippingCountryIso) {
  if (shippingCountryIso && typeof shippingCountryIso === "string") {
    const code = shippingCountryIso.trim().toUpperCase();
    if (code.length === 2 && isSupportedCountry(code)) {
      return code;
    }
  }
  return defaultRegionFromEnv();
}
function isValidCheckoutPhone(raw2, shippingCountryIso) {
  const trimmed = typeof raw2 === "string" ? raw2.trim() : "";
  if (!trimmed) return false;
  const extra = readOptionalValidationRegex();
  if (extra && !extra.test(trimmed)) return false;
  if (isValidPhoneNumber(trimmed)) return true;
  const region = resolvePhoneValidationRegion(shippingCountryIso);
  if (region && isValidPhoneNumber(trimmed, region)) return true;
  return false;
}
function normalizeCheckoutPhoneToE164(raw2, shippingCountryIso) {
  const trimmed = typeof raw2 === "string" ? raw2.trim() : "";
  if (!trimmed) return null;
  if (!isValidCheckoutPhone(trimmed, shippingCountryIso)) return null;
  const region = resolvePhoneValidationRegion(shippingCountryIso);
  try {
    if (trimmed.startsWith("+")) {
      return parsePhoneNumber(trimmed).format("E.164");
    }
    if (region) {
      return parsePhoneNumber(trimmed, region).format("E.164");
    }
    return parsePhoneNumber(trimmed).format("E.164");
  } catch {
    return null;
  }
}
function normalizeOptionalCheckoutPhone(raw2, countryIso) {
  if (raw2 == null || !String(raw2).trim()) return void 0;
  const t = String(raw2).trim();
  return normalizeCheckoutPhoneToE164(t, countryIso) ?? t;
}
function collectGuestPhoneLookupVariants(raw2) {
  const trimmed = typeof raw2 === "string" ? raw2.trim() : "";
  if (!trimmed) return [];
  const set = /* @__PURE__ */ new Set();
  set.add(trimmed);
  const addParsed = (parsed) => {
    set.add(parsed.format("E.164"));
    set.add(parsed.formatNational().replace(/\D/g, ""));
  };
  try {
    if (trimmed.startsWith("+")) {
      if (isValidPhoneNumber(trimmed)) {
        addParsed(parsePhoneNumber(trimmed));
      }
    } else {
      const region = resolvePhoneValidationRegion(void 0);
      if (region && isValidPhoneNumber(trimmed, region)) {
        addParsed(parsePhoneNumber(trimmed, region));
      }
    }
  } catch {
  }
  return [...set].slice(0, 8);
}
var cachedOptionalRegex;
var init_phone_format = __esm({
  "packages/backend/src/lib/validation/phone-format.ts"() {
    "use strict";
  }
});

// packages/backend/src/endpoints/guest-order-lookup.ts
function getGuestLookupLimiter() {
  if (!guestLookupLimiter) {
    guestLookupLimiter = createRateLimiter({
      ...GUEST_LOOKUP_RATE_LIMIT,
      keyPrefix: "rl:guest-lookup"
    });
  }
  return guestLookupLimiter;
}
async function guestOrderLookupHandler(req, deps) {
  const clientIp = getClientIp(req);
  const limitResponse = deps?.enforceRateLimit ? await deps.enforceRateLimit(null, clientIp) : await enforceRateLimit(getGuestLookupLimiter(), clientIp);
  if (limitResponse) return limitResponse;
  const data = await req.json?.().catch(() => ({})) || {};
  const { orderNumber, guestEmail, guestPhone } = data;
  if (!orderNumber || typeof orderNumber !== "string" || !orderNumber.trim()) {
    return Response.json({ error: "orderNumber is required" }, { status: 400 });
  }
  const hasEmail = typeof guestEmail === "string" && guestEmail.trim().length > 0;
  const hasPhone = typeof guestPhone === "string" && guestPhone.trim().length > 0;
  if (!hasEmail && !hasPhone) {
    return Response.json({ error: "guestEmail or guestPhone is required" }, { status: 400 });
  }
  const identifierConditions = [];
  if (hasEmail) {
    identifierConditions.push({ guestEmail: { equals: guestEmail.trim().toLowerCase() } });
  }
  if (hasPhone) {
    const variants = collectGuestPhoneLookupVariants(guestPhone);
    if (variants.length === 1) {
      identifierConditions.push({ guestPhone: { equals: variants[0] } });
    } else {
      identifierConditions.push({
        or: variants.map((v) => ({ guestPhone: { equals: v } }))
      });
    }
  }
  const result = await req.payload.find({
    collection: "orders",
    where: {
      and: [
        { orderNumber: { equals: orderNumber.trim() } },
        { customer: { equals: null } },
        ...identifierConditions.length === 1 ? identifierConditions : [{ or: identifierConditions }]
      ]
    },
    limit: 1,
    depth: 2,
    overrideAccess: true
  });
  if (!result.docs.length) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  return Response.json({ order: result.docs[0] }, { status: 200 });
}
var guestLookupLimiter, guestOrderLookupEndpoint;
var init_guest_order_lookup = __esm({
  "packages/backend/src/endpoints/guest-order-lookup.ts"() {
    "use strict";
    init_rate_limiter();
    init_phone_format();
    guestOrderLookupEndpoint = {
      path: "/guest/order-lookup",
      method: "post",
      handler: async (req) => guestOrderLookupHandler(req)
    };
  }
});

// packages/backend/src/plugins/orders/strategies/order-splitter.ts
function getPlatformItems(items) {
  return items.filter((i) => !i.tenantId);
}
var DefaultOrderSplitter;
var init_order_splitter = __esm({
  "packages/backend/src/plugins/orders/strategies/order-splitter.ts"() {
    "use strict";
    DefaultOrderSplitter = class {
      /** Items with this tenantId are excluded from sub-orders (platform-owned). */
      static PLATFORM_TENANT_ID = "__platform__";
      split(items) {
        const byTenant = /* @__PURE__ */ new Map();
        for (const item of items) {
          if (!item.tenantId) continue;
          const tid = item.tenantId;
          const existing = byTenant.get(tid);
          if (existing) {
            existing.items.push(item);
            existing.subtotal += item.totalPrice;
          } else {
            byTenant.set(tid, { items: [item], subtotal: item.totalPrice });
          }
        }
        return Array.from(byTenant.entries()).map(([tenantId, { items: segItems, subtotal }]) => ({
          tenantId,
          items: segItems,
          subtotal: Math.round(subtotal * 100) / 100
        }));
      }
    };
  }
});

// packages/backend/src/lib/commission.ts
async function getCommissionRateForTenant(payload, tenantId) {
  const defaultRate = Number(process.env.DEFAULT_COMMISSION_RATE ?? "0");
  if (tenantId === "__platform__") return 0;
  try {
    const { docs } = await payload.find({
      collection: "vendor-settings",
      where: { tenant: { equals: tenantId } },
      limit: 1,
      depth: 0
    });
    const settings = docs[0];
    if (settings?.commissionRate != null && !isNaN(settings.commissionRate)) {
      return Math.min(100, Math.max(0, settings.commissionRate));
    }
  } catch {
  }
  return defaultRate;
}
function calculateCommission(subtotal, ratePercent) {
  const amount = Math.round(subtotal * (ratePercent / 100) * 100) / 100;
  return { amount, rate: ratePercent };
}
var init_commission = __esm({
  "packages/backend/src/lib/commission.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/build-reserve-quantities-by-stock-level.ts
function buildReserveQuantitiesByStockLevel(orderItemData) {
  const reserveByLevel = /* @__PURE__ */ new Map();
  for (const d of orderItemData) {
    if (!d.stockLevelId) continue;
    reserveByLevel.set(d.stockLevelId, (reserveByLevel.get(d.stockLevelId) || 0) + d.quantity);
  }
  return reserveByLevel;
}
var init_build_reserve_quantities_by_stock_level = __esm({
  "packages/backend/src/lib/build-reserve-quantities-by-stock-level.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/order-checkout-snapshots.ts
function parsePreferredLocale(req) {
  const h = req?.headers?.get?.("accept-language");
  if (!h) return "en";
  const first = h.split(",")[0]?.trim().split("-")[0];
  return first && /^[a-z]{2}$/i.test(first) ? first.toLowerCase() : "en";
}
function resolveLocalizedText(value, locale) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const o = value;
    if (typeof o[locale] === "string" && o[locale].length) return o[locale];
    if (typeof o.en === "string" && o.en.length) return o.en;
    const first = Object.values(o).find((v) => typeof v === "string" && v.length);
    return first ? String(first) : "";
  }
  return String(value);
}
function snapshotProductImageUrl(product) {
  const images = product.images;
  if (!images?.length) return "";
  const first = images[0]?.image;
  if (typeof first === "object" && first !== null && "url" in first) {
    const u = first.url;
    return typeof u === "string" ? u : "";
  }
  return "";
}
var init_order_checkout_snapshots = __esm({
  "packages/backend/src/lib/order-checkout-snapshots.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/sslcommerz-initiate-session.ts
function sslCommerzHostedCheckoutEnabled() {
  if ((process.env.PAYMENT_PROVIDER || "").trim().toLowerCase() !== "sslcommerz") return false;
  const id = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const pw = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  return Boolean(id && pw && process.env.SSLCOMMERZ_SESSION_ENABLED === "true");
}
function gatewayApiBase(sandbox) {
  return sandbox ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php" : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
}
function safeCustomerEmail(email) {
  const e = email.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e;
  return "customer@invalid.invalid";
}
function safeCustomerPhone(phone) {
  const p = phone.replace(/\s+/g, "").trim();
  if (p.length >= 5) return p.slice(0, 20);
  return "01700000000";
}
function clipField(value, maxLen, fallback) {
  const s = (value ?? "").trim().slice(0, maxLen);
  return s.length > 0 ? s : fallback;
}
async function initiateSslCommerzHostedSession(args, fetchImpl = fetch) {
  const url = gatewayApiBase(args.sandbox);
  const amountStr = Number.isFinite(args.totalAmount) && args.totalAmount >= 0 ? args.totalAmount.toFixed(2) : "0.00";
  const shipName = clipField(args.shipName ?? args.customerName, 50, "Customer");
  const shipAdd1 = clipField(args.shipAdd1 ?? args.customerAddress, 50, "N/A");
  const shipCity = clipField(args.shipCity ?? args.customerCity, 50, "Dhaka");
  const shipState = clipField(args.shipState ?? args.customerState, 50, shipCity);
  const shipPost = clipField(args.shipPostcode ?? args.customerPostcode, 50, "1200");
  const shipCountry = clipField(args.shipCountry ?? args.customerCountry, 50, "Bangladesh");
  const cusState = clipField(args.customerState, 50, shipState);
  const cusPost = clipField(args.customerPostcode, 50, shipPost);
  const body = new URLSearchParams();
  body.set("store_id", args.storeId);
  body.set("store_passwd", args.storePassword);
  body.set("total_amount", amountStr);
  body.set("currency", args.currency || "BDT");
  body.set("tran_id", args.tranId);
  body.set("success_url", args.successUrl);
  body.set("fail_url", args.failUrl);
  body.set("cancel_url", args.cancelUrl);
  if (args.ipnUrl) {
    body.set("ipn_url", args.ipnUrl);
  }
  const name = args.customerName.trim() || "Customer";
  body.set("cus_name", name.slice(0, 120));
  body.set("cus_email", safeCustomerEmail(args.customerEmail));
  body.set("cus_phone", safeCustomerPhone(args.customerPhone));
  body.set("cus_add1", args.customerAddress.trim().slice(0, 200) || "N/A");
  body.set("cus_city", args.customerCity.trim().slice(0, 80) || "City");
  body.set("cus_country", args.customerCountry.trim().slice(0, 80) || "Bangladesh");
  body.set("cus_state", cusState);
  body.set("cus_postcode", cusPost);
  body.set("shipping_method", "YES");
  body.set("num_of_item", String(Math.max(1, args.numOfItems ?? 1)));
  body.set("ship_name", shipName);
  body.set("ship_add1", shipAdd1);
  const ship2 = args.shipAdd2?.trim();
  if (ship2) body.set("ship_add2", ship2.slice(0, 50));
  body.set("ship_city", shipCity);
  body.set("ship_state", shipState);
  body.set("ship_postcode", shipPost);
  body.set("ship_country", shipCountry);
  body.set("product_name", "Order");
  body.set("product_category", "general");
  body.set("product_profile", "general");
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`SSL Commerz returned non-JSON (${res.status})`);
  }
  const status = typeof json.status === "string" ? json.status : "";
  const gw = typeof json.GatewayPageURL === "string" ? json.GatewayPageURL : typeof json.gateway_url === "string" ? json.gateway_url : "";
  if (!res.ok || status !== "SUCCESS" || !gw) {
    const failed = typeof json.failedreason === "string" ? json.failedreason : typeof json.message === "string" ? json.message : `SSL Commerz session failed (${res.status})`;
    console.warn(
      "[sslcommerz-session] Session API rejected (no secrets logged):",
      JSON.stringify({
        httpStatus: res.status,
        sslStatus: status || null,
        failedreason: typeof json.failedreason === "string" ? json.failedreason : null,
        message: typeof json.message === "string" ? json.message : null
      })
    );
    throw new Error(failed);
  }
  const sessionKey = typeof json.sessionkey === "string" ? json.sessionkey : void 0;
  return { gatewayPageUrl: gw, sessionKey };
}
var init_sslcommerz_initiate_session = __esm({
  "packages/backend/src/lib/sslcommerz-initiate-session.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/guest-checkout-identifiers.ts
function normalizeGuestEmail(raw2) {
  return raw2 ? raw2.trim().toLowerCase() : "";
}
function normalizeGuestPhone(raw2) {
  return raw2 ? raw2.trim() : "";
}
function guestCheckoutIdentifiersError(mode, guestEmail, guestPhone, shippingCountryIso) {
  const ge = normalizeGuestEmail(guestEmail);
  const gp = normalizeGuestPhone(guestPhone);
  const emailOk = ge.length > 0 && LOOSE_EMAIL_FORMAT_RE.test(ge);
  const phoneOkNonEmpty = gp.length > 0 && isValidCheckoutPhone(gp, shippingCountryIso);
  if (mode === "email") {
    if (!emailOk) return "Guest checkout requires a valid guestEmail";
    return null;
  }
  if (mode === "phone") {
    if (!phoneOkNonEmpty) return "Guest checkout requires a valid guestPhone for the shipping country";
    return null;
  }
  const eitherOk = emailOk || phoneOkNonEmpty;
  if (!eitherOk) {
    return "Guest checkout requires a valid guestEmail or guestPhone for the shipping country";
  }
  if (ge.length > 0 && !emailOk) {
    return "guestEmail must be a valid email address";
  }
  if (gp.length > 0 && !phoneOkNonEmpty) {
    return "guestPhone must be a valid phone number for the shipping country";
  }
  return null;
}
var init_guest_checkout_identifiers = __esm({
  "packages/backend/src/lib/guest-checkout-identifiers.ts"() {
    "use strict";
    init_email_format();
    init_phone_format();
  }
});

// packages/backend/src/lib/shipping/cash-on-delivery.ts
function isCollectPaymentOnDeliveryShippingMethod(doc) {
  return doc.collectPaymentOnDelivery === true;
}
async function validateCashOnDeliveryShippingMethods(payload, shippingMethodIds) {
  if (!shippingMethodIds.length) {
    return "cashOnDelivery requires a non-empty shippingMethodIds array";
  }
  for (const id of shippingMethodIds) {
    if (typeof id !== "string" || !id.trim()) {
      return "Each shippingMethodId must be a non-empty string";
    }
    try {
      const doc = await payload.findByID({
        collection: "shipping-methods",
        id: id.trim(),
        depth: 0,
        overrideAccess: true
      });
      if (!doc) {
        return `Shipping method not found: ${id}`;
      }
      const row = doc;
      if (!row.isActive) {
        return `Shipping method is not active: ${id}`;
      }
      if (!isCollectPaymentOnDeliveryShippingMethod(row)) {
        return "cashOnDelivery is only allowed when every selected shipping method has collect-on-delivery enabled in admin";
      }
    } catch {
      return `Shipping method not found: ${id}`;
    }
  }
  return null;
}
var init_cash_on_delivery = __esm({
  "packages/backend/src/lib/shipping/cash-on-delivery.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/address-store-validation.ts
function normalizeText2(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeUpper(value) {
  return normalizeText2(value).toUpperCase();
}
function normalizeId(value) {
  const v = normalizeText2(value);
  return v ? v : null;
}
function relationId5(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const v = String(value).trim();
    return v ? v : null;
  }
  if (typeof value === "object" && "id" in value) {
    const id = value.id;
    if (id == null) return null;
    const v = String(id).trim();
    return v ? v : null;
  }
  return null;
}
function getAddressStoreValidationMode() {
  const raw2 = (process.env.ADDRESS_STORE_VALIDATION_MODE || "").trim().toLowerCase();
  if (raw2 === "off" || raw2 === "warn" || raw2 === "enforce") return raw2;
  return "warn";
}
function buildViolationMessage(code, base, mode, storeId) {
  if (mode === "enforce") return { error: base, errorCode: code, resolvedStoreId: storeId };
  return { warning: base, warningCode: code, resolvedStoreId: storeId };
}
async function validateCountryAlignment(payload, storeId, shippingAddress, mode) {
  let store = null;
  try {
    store = await payload.findByID({
      collection: "stock-locations",
      id: storeId,
      depth: 0,
      overrideAccess: true
    });
  } catch {
    return buildViolationMessage(
      "ADDRESS_STORE_NOT_FOUND",
      "Selected store is not available. Please choose a valid store and retry checkout.",
      mode,
      storeId
    );
  }
  if (!store) {
    return buildViolationMessage(
      "ADDRESS_STORE_NOT_FOUND",
      "Selected store is not available. Please choose a valid store and retry checkout.",
      mode,
      storeId
    );
  }
  const storeCountry = normalizeUpper(store?.address?.country);
  const addressCountry = normalizeUpper(shippingAddress.country);
  if (storeCountry && addressCountry && storeCountry !== addressCountry) {
    return buildViolationMessage(
      "ADDRESS_STORE_COUNTRY_MISMATCH",
      "Shipping address country does not match the selected store service country.",
      mode,
      storeId
    );
  }
  return null;
}
function isGeographyEnabled() {
  return process.env.GEOGRAPHY_ENABLED === "true";
}
async function validateGeographyCoverage(payload, storeId, serviceArea, mode) {
  const subdivisionId = normalizeId(serviceArea.subdivisionId);
  const localityId = normalizeId(serviceArea.localityId);
  if (!subdivisionId) {
    return buildViolationMessage(
      "ADDRESS_STORE_AREA_MISSING",
      "Delivery area mapping is missing. Please select your delivery area again before checkout.",
      mode,
      storeId
    );
  }
  const rows = await payload.find({
    collection: "stock-location-service-areas",
    where: {
      and: [
        { stockLocation: { equals: storeId } },
        { subdivision: { equals: subdivisionId } }
      ]
    },
    depth: 0,
    limit: 1e3,
    overrideAccess: true
  });
  if (rows.docs.length === 0) {
    return buildViolationMessage(
      "ADDRESS_STORE_SUBDIVISION_UNSERVED",
      "Selected store does not serve the address region.",
      mode,
      storeId
    );
  }
  const localityRows = rows.docs.map((row) => relationId5(row.locality));
  const hasSubdivisionWideCoverage = localityRows.some((id) => id == null);
  if (localityId) {
    if (hasSubdivisionWideCoverage || localityRows.includes(localityId)) {
      return null;
    }
    return buildViolationMessage(
      "ADDRESS_STORE_LOCALITY_UNSERVED",
      "Selected store does not serve the selected local area.",
      mode,
      storeId
    );
  }
  if (hasSubdivisionWideCoverage) {
    return null;
  }
  return buildViolationMessage(
    "ADDRESS_STORE_LOCALITY_REQUIRED",
    "Selected store requires a more specific local delivery area for this address.",
    mode,
    storeId
  );
}
async function validateAddressStoreAlignment(input) {
  const mode = getAddressStoreValidationMode();
  if (mode === "off") return {};
  const storeId = normalizeId(input.storeLocationId);
  if (!storeId) return {};
  const countryViolation = await validateCountryAlignment(
    input.payload,
    storeId,
    input.shippingAddress,
    mode
  );
  if (countryViolation) return countryViolation;
  if (!isGeographyEnabled()) {
    if (mode === "enforce") {
      return buildViolationMessage(
        "ADDRESS_STORE_GEOGRAPHY_REQUIRED",
        "Strict address-store validation requires geography data. Enable GEOGRAPHY_ENABLED or switch ADDRESS_STORE_VALIDATION_MODE to warn/off.",
        mode,
        storeId
      );
    }
    return { resolvedStoreId: storeId };
  }
  return await validateGeographyCoverage(
    input.payload,
    storeId,
    input.serviceArea ?? {},
    mode
  ) ?? { resolvedStoreId: storeId };
}
var init_address_store_validation = __esm({
  "packages/backend/src/lib/address-store-validation.ts"() {
    "use strict";
  }
});

// packages/backend/src/plugins/notifications/lib/send-sms.ts
var send_sms_exports = {};
__export(send_sms_exports, {
  sendGuestPaymentNotConfirmedSms: () => sendGuestPaymentNotConfirmedSms,
  sendOrderConfirmationSms: () => sendOrderConfirmationSms,
  sendSms: () => sendSms
});
async function sendSms(options) {
  const { to, body } = options;
  const smsConfigured = process.env.SMS_PROVIDER && process.env.SMS_API_KEY;
  if (smsConfigured) {
    console.log("[Notifications] SMS provider configured but adapter not yet integrated. Logging SMS:");
  }
  console.log("[Notifications] SMS:", { to, body: body.slice(0, 160) });
  return true;
}
async function sendOrderConfirmationSms(orderNumber, phone, grandTotal, currency) {
  const body = `Your order ${orderNumber} has been placed. Total: ${currency} ${grandTotal}. Track your order using this order number.`;
  return sendSms({ to: phone, body });
}
async function sendGuestPaymentNotConfirmedSms(orderNumber, phone, gatewayStatus) {
  if (process.env.BS_TEST_PAYMENT_FAILURE_SMS_REJECT === "true") {
    return Promise.reject(new Error("simulated payment failure sms reject"));
  }
  const st = (gatewayStatus.trim() || "FAILED").slice(0, 32);
  const body = [
    `Payment not completed for ${orderNumber}.`,
    `Gateway: ${st}.`,
    `Order not confirmed \u2014 try checkout again.`,
    `Keep this order # for support.`
  ].join(" ");
  return sendSms({ to: phone.trim(), body });
}
var init_send_sms = __esm({
  "packages/backend/src/plugins/notifications/lib/send-sms.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/process-checkout.ts
import { NotFound } from "payload";
function sanitizeOrderNotesFromCart(raw2) {
  if (typeof raw2 !== "string") return "";
  return raw2.replace(/\0/g, "").trim().slice(0, 2e3);
}
function reqWithTransaction(req, transactionID) {
  if (transactionID == null) return req ?? {};
  const base = req ?? {};
  return { ...base, transactionID };
}
async function processCheckout(payload, input, userId, req) {
  const splitByVendor = process.env.MULTIVENDOR_ENABLED === "true" && process.env.SINGLE_STORE_CART_ENABLED !== "true";
  const {
    cartId,
    shippingAddress,
    billingAddress,
    simulatePayment = false,
    idempotencyKey,
    shippingMethodIds,
    cashOnDelivery = false
  } = input;
  const guestEmail = input.guestEmail ? input.guestEmail.trim().toLowerCase() : void 0;
  let guestPhone = input.guestPhone ? input.guestPhone.trim() : void 0;
  const isAdminUser = req?.user?.role === "admin";
  if (!userId) {
    const guestErr = guestCheckoutIdentifiersError(
      getAuthRequiredIdentifier(),
      input.guestEmail,
      input.guestPhone,
      shippingAddress.country
    );
    if (guestErr) {
      return { order: { id: "", orderNumber: "" }, error: guestErr, statusCode: 400 };
    }
  }
  const persistShippingAddress = {
    ...shippingAddress,
    phone: normalizeOptionalCheckoutPhone(shippingAddress.phone, shippingAddress.country)
  };
  const persistBillingAddress = {
    ...billingAddress,
    phone: normalizeOptionalCheckoutPhone(billingAddress.phone, billingAddress.country)
  };
  if (guestPhone) {
    guestPhone = normalizeCheckoutPhoneToE164(guestPhone, shippingAddress.country) ?? guestPhone;
  }
  let codCheckout = false;
  if (cashOnDelivery === true) {
    const ids = Array.isArray(shippingMethodIds) ? shippingMethodIds : [];
    const codErr = await validateCashOnDeliveryShippingMethods(payload, ids);
    if (codErr) {
      return { order: { id: "", orderNumber: "" }, error: codErr, statusCode: 400 };
    }
    codCheckout = true;
  }
  if (!simulatePayment && !codCheckout) {
    const provider = (process.env.PAYMENT_PROVIDER || "").trim().toLowerCase();
    if (provider === "stripe") {
      return {
        order: { id: "", orderNumber: "" },
        error: "Stripe checkout is not implemented.",
        statusCode: 501
      };
    }
    if (provider === "sslcommerz" && !sslCommerzHostedCheckoutEnabled()) {
      return {
        order: { id: "", orderNumber: "" },
        error: "SSL Commerz hosted checkout is not enabled. Set SSLCOMMERZ_SESSION_ENABLED=true with SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.",
        statusCode: 503
      };
    }
  }
  if (idempotencyKey) {
    const existing = await payload.find({
      collection: "orders",
      where: { idempotencyKey: { equals: idempotencyKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true
    });
    if (existing.docs.length > 0) {
      const existingOrder = existing.docs[0];
      const existingCustomerId = existingOrder.customer != null ? typeof existingOrder.customer === "object" ? existingOrder.customer.id : String(existingOrder.customer) : null;
      const existingGuestEmail = existingOrder.guestEmail ? String(existingOrder.guestEmail).trim().toLowerCase() : null;
      if (userId) {
        if (isAdminUser || existingCustomerId === String(userId)) {
          return { order: { id: existingOrder.id, orderNumber: existingOrder.orderNumber } };
        }
      } else if (!existingCustomerId && existingGuestEmail && existingGuestEmail === guestEmail) {
        return { order: { id: existingOrder.id, orderNumber: existingOrder.orderNumber } };
      }
      return {
        order: { id: "", orderNumber: "" },
        error: "idempotencyKey is already used by another checkout context",
        statusCode: 409
      };
    }
  }
  const requireVerifiedForCheckout = process.env.REQUIRE_VERIFIED_FOR_CHECKOUT === "true";
  if (requireVerifiedForCheckout && userId && !isAdminUser) {
    const user = await payload.findByID({
      collection: "users",
      id: userId,
      depth: 0
    });
    const u = user;
    if (!u.emailVerified && !u.phoneVerified) {
      return {
        order: { id: "", orderNumber: "" },
        error: "Account identifiers are not verified. Please verify your email or phone before checkout.",
        statusCode: 403
      };
    }
  }
  let cart;
  try {
    cart = await payload.findByID({
      collection: "carts",
      id: cartId,
      depth: 2,
      overrideAccess: true
      // Access enforced below via ownership check
    });
  } catch (err) {
    if (err instanceof NotFound) {
      return { order: { id: "", orderNumber: "" }, error: "Cart not found", statusCode: 404 };
    }
    const e = err;
    if (e?.status === 404 || e?.name === "NotFound") {
      return { order: { id: "", orderNumber: "" }, error: "Cart not found", statusCode: 404 };
    }
    throw err;
  }
  const cartDoc = cart;
  if (!userId) {
    const headerGuestId = req?.headers?.get?.("x-guest-id");
    if (!headerGuestId || cartDoc.guestId !== headerGuestId) {
      return { order: { id: "", orderNumber: "" }, error: "Cart does not belong to this guest", statusCode: 403 };
    }
  } else {
    const cartUserId = typeof cartDoc.user === "object" ? cartDoc.user?.id : cartDoc.user;
    if (!isAdminUser && (!cartUserId || cartUserId !== String(userId))) {
      return { order: { id: "", orderNumber: "" }, error: "Cart does not belong to this user", statusCode: 403 };
    }
  }
  const cartStore = cart.store;
  const storeLocationId = input.storeId || (cartStore ? typeof cartStore === "object" ? cartStore?.id : cartStore : null) || null;
  const addressStoreValidation = await validateAddressStoreAlignment({
    payload,
    shippingAddress: persistShippingAddress,
    storeLocationId,
    serviceArea: input.serviceArea
  });
  if (addressStoreValidation.error) {
    return {
      order: { id: "", orderNumber: "" },
      error: addressStoreValidation.error,
      errorCode: addressStoreValidation.errorCode,
      statusCode: 400
    };
  }
  if (addressStoreValidation.warning) {
    console.warn("[checkout/address-store-validation]", {
      mode: process.env.ADDRESS_STORE_VALIDATION_MODE || "warn",
      code: addressStoreValidation.warningCode ?? "UNKNOWN_WARNING",
      storeId: addressStoreValidation.resolvedStoreId ?? storeLocationId
    });
  }
  const items = cart.items;
  if (!items?.length) {
    return { order: { id: "", orderNumber: "" }, error: "Cart is empty" };
  }
  const currency = input.currency || getDefaultCurrency();
  const checkoutLocale = parsePreferredLocale(req);
  const tenantNameCache = /* @__PURE__ */ new Map();
  async function resolveTenantName(tenantId) {
    const hit = tenantNameCache.get(tenantId);
    if (hit) return hit;
    try {
      const t = await payload.findByID({
        collection: "tenants",
        id: tenantId,
        depth: 0,
        overrideAccess: true
      });
      const name = t?.name?.trim() || "Vendor";
      tenantNameCache.set(tenantId, name);
      return name;
    } catch {
      tenantNameCache.set(tenantId, "Vendor");
      return "Vendor";
    }
  }
  const orderItemData = [];
  for (const item of items) {
    const productId = typeof item.product === "object" ? item.product?.id : item.product;
    const variantId = item.variant ? typeof item.variant === "object" ? item.variant?.id : item.variant : null;
    const product = await payload.findByID({
      collection: "products",
      id: productId,
      depth: 2
    });
    if (!product) {
      return { order: { id: "", orderNumber: "" }, error: `Product ${productId} not found` };
    }
    const productAny = product;
    const tenantId = productAny.tenant ? typeof productAny.tenant === "object" ? productAny.tenant?.id ?? null : productAny.tenant : null;
    let variantName = "";
    let sku = productAny.sku || "";
    let unitPrice = item.unitPrice;
    if (variantId) {
      const variant = await payload.findByID({
        collection: "product-variants",
        id: variantId,
        depth: 0
      });
      if (variant) {
        const v = variant;
        variantName = v.name || "";
        sku = v.sku || sku;
        unitPrice = v.price ?? unitPrice;
      }
    } else {
      unitPrice = productAny.basePrice ?? unitPrice;
    }
    const quantity = Number(item.quantity) || 1;
    const totalPrice = Math.round(quantity * unitPrice * 100) / 100;
    const productNameSnapshot = resolveLocalizedText(productAny.name, checkoutLocale) || "Product";
    const slugRaw = product.slug;
    const productSlugSnapshot = typeof slugRaw === "string" ? slugRaw.trim() : "";
    let productImage = snapshotProductImageUrl(productAny);
    if (!productImage && productAny.images?.[0]?.image) {
      const imgRef = productAny.images[0].image;
      const mid = typeof imgRef === "object" && imgRef !== null && "id" in imgRef ? String(imgRef.id) : typeof imgRef === "string" ? imgRef : null;
      if (mid) {
        try {
          const m = await payload.findByID({
            collection: "media",
            id: mid,
            depth: 0,
            overrideAccess: true
          });
          productImage = m?.url || "";
        } catch {
          productImage = "";
        }
      }
    }
    let tenantName;
    if (tenantId) {
      tenantName = await resolveTenantName(tenantId);
    }
    orderItemData.push({
      productId,
      productSlug: productSlugSnapshot,
      variantId,
      productName: productNameSnapshot,
      variantName,
      sku,
      quantity,
      unitPrice,
      totalPrice,
      productImage,
      tenantId,
      tenantName
    });
  }
  const shippingTotal = 0;
  const taxTotal = 0;
  const subtotalCalc = orderItemData.reduce((s, i) => s + i.totalPrice, 0);
  let discountTotal = 0;
  let appliedCouponId = null;
  let couponCodeSnapshot = null;
  const rawCouponCode = cart.couponCode;
  if (typeof rawCouponCode === "string" && rawCouponCode.trim()) {
    const couponResult = await validateCouponForSubtotal({
      payload,
      req,
      couponCode: rawCouponCode,
      subtotal: subtotalCalc,
      userId
    });
    if (!couponResult.valid) {
      return { order: { id: "", orderNumber: "" }, error: couponResult.discountReason, statusCode: 400 };
    }
    appliedCouponId = couponResult.coupon.id;
    couponCodeSnapshot = couponResult.coupon.code;
    discountTotal = couponResult.discountTotal;
  }
  const grandTotal = Math.round((subtotalCalc + shippingTotal + taxTotal - discountTotal) * 100) / 100;
  const inventoryEnabled = process.env.INVENTORY_ENABLED !== "false";
  if (inventoryEnabled) {
    for (const d of orderItemData) {
      const alloc = await allocateStockLevelForLine(
        payload,
        {
          productId: d.productId,
          variantId: d.variantId,
          quantity: d.quantity,
          tenantId: d.tenantId,
          storeLocationId
        },
        req
      );
      if ("error" in alloc) {
        return {
          order: { id: "", orderNumber: "" },
          error: alloc.error,
          statusCode: 400
        };
      }
      d.stockLevelId = alloc.stockLevelId;
    }
  }
  const orderNumber = `ORD-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  let buyerEmail = "";
  let buyerName = "";
  let buyerPhone = "";
  if (userId) {
    const u = await payload.findByID({
      collection: "users",
      id: userId,
      depth: 0,
      overrideAccess: true
    });
    buyerEmail = String(u?.email || "");
    buyerName = String(u?.name || "").trim();
    buyerPhone = String(u?.phone || "").trim();
  } else {
    buyerEmail = guestEmail || "";
    buyerPhone = guestPhone || "";
  }
  const transactionID = await payload.db.beginTransaction();
  const reqTx = reqWithTransaction(req, transactionID);
  let order;
  let paymentTransactionId;
  let paymentRedirectUrl;
  try {
    const subtotal = orderItemData.reduce((s, i) => s + i.totalPrice, 0);
    const orderData = {
      orderNumber,
      status: "pending",
      items: [],
      shippingAddress: persistShippingAddress,
      billingAddress: persistBillingAddress,
      subtotal,
      shippingTotal,
      taxTotal,
      discountTotal,
      appliedCoupon: appliedCouponId,
      couponCodeSnapshot,
      grandTotal,
      currency,
      paymentStatus: "unpaid",
      checkoutPaymentChannel: codCheckout ? "cash_on_delivery" : "online",
      notes: sanitizeOrderNotesFromCart(cart.customerNote),
      placedAt: (/* @__PURE__ */ new Date()).toISOString(),
      buyerSnapshot: {
        email: buyerEmail || null,
        name: buyerName || null,
        phone: buyerPhone || null,
        locale: checkoutLocale
      }
    };
    if (userId) orderData.customer = userId;
    if (guestEmail) orderData.guestEmail = guestEmail;
    if (guestPhone) orderData.guestPhone = guestPhone;
    if (idempotencyKey) orderData.idempotencyKey = idempotencyKey;
    if (storeLocationId) orderData.store = storeLocationId;
    if (splitByVendor) orderData.subOrders = [];
    if (input.deviceTracking) orderData.deviceTracking = input.deviceTracking;
    order = await payload.create({
      collection: "orders",
      overrideAccess: true,
      data: orderData,
      req: reqTx
    });
    const orderId = order.id;
    const historyData = {
      order: orderId,
      fromStatus: null,
      toStatus: order.status || "pending",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (userId != null) historyData.changedBy = userId;
    await payload.create({
      collection: "order-status-history",
      overrideAccess: true,
      data: historyData,
      req: reqTx
    });
    const orderItemIds = [];
    const subOrderIds = [];
    if (splitByVendor) {
      const platformItems = getPlatformItems(orderItemData);
      const splitter = new DefaultOrderSplitter();
      const segments = splitter.split(orderItemData);
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const { amount: commissionAmount, rate: commissionRate } = await (async () => {
          const rate = await getCommissionRateForTenant(payload, seg.tenantId);
          return calculateCommission(seg.subtotal, rate);
        })();
        const vendorEarnings = Math.round((seg.subtotal - commissionAmount) * 100) / 100;
        const subOrderNumber = `${orderNumber}-${String.fromCharCode(65 + i)}`;
        const subOrderData = {
          parentOrder: orderId,
          parentOrderNumber: orderNumber,
          tenant: seg.tenantId,
          tenantNameSnapshot: seg.items[0]?.tenantName?.trim() || null,
          subOrderNumber,
          status: "pending",
          items: [],
          subtotal: seg.subtotal,
          shippingTotal: 0,
          taxTotal: 0,
          commissionAmount,
          commissionRate,
          vendorEarnings
        };
        if (storeLocationId) subOrderData.store = storeLocationId;
        const subOrder = await payload.create({
          collection: "sub-orders",
          overrideAccess: true,
          data: subOrderData,
          req: reqTx
        });
        subOrderIds.push(subOrder.id);
        for (const d of seg.items) {
          const itemData = {
            order: orderId,
            subOrder: subOrder.id,
            tenant: seg.tenantId,
            product: d.productId,
            productSlug: d.productSlug,
            productName: d.productName,
            variantName: d.variantName,
            sku: d.sku,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            totalPrice: d.totalPrice,
            productImage: d.productImage
          };
          if (d.tenantName) itemData.vendorNameSnapshot = d.tenantName;
          if (d.variantId != null) itemData.variant = d.variantId;
          if (inventoryEnabled && d.stockLevelId) itemData.stockLevel = d.stockLevelId;
          const orderItem = await payload.create({
            collection: "order-items",
            overrideAccess: true,
            data: itemData,
            req: reqTx
          });
          orderItemIds.push(orderItem.id);
        }
        const segItemIds = orderItemIds.slice(-seg.items.length);
        await payload.update({
          collection: "sub-orders",
          id: subOrder.id,
          overrideAccess: true,
          data: { items: segItemIds },
          req: reqTx
        });
      }
      for (const d of platformItems) {
        const itemData = {
          order: orderId,
          product: d.productId,
          productSlug: d.productSlug,
          productName: d.productName,
          variantName: d.variantName,
          sku: d.sku,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          totalPrice: d.totalPrice,
          productImage: d.productImage
        };
        if (d.variantId != null) itemData.variant = d.variantId;
        if (inventoryEnabled && d.stockLevelId) itemData.stockLevel = d.stockLevelId;
        const orderItem = await payload.create({
          collection: "order-items",
          overrideAccess: true,
          data: itemData,
          req: reqTx
        });
        orderItemIds.push(orderItem.id);
      }
    } else {
      for (const d of orderItemData) {
        const itemData = {
          order: orderId,
          product: d.productId,
          productSlug: d.productSlug,
          productName: d.productName,
          variantName: d.variantName,
          sku: d.sku,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          totalPrice: d.totalPrice,
          productImage: d.productImage
        };
        if (d.variantId != null) itemData.variant = d.variantId;
        if (inventoryEnabled && d.stockLevelId) itemData.stockLevel = d.stockLevelId;
        const orderItem = await payload.create({
          collection: "order-items",
          overrideAccess: true,
          data: itemData,
          req: reqTx
        });
        orderItemIds.push(orderItem.id);
      }
    }
    const orderUpdateData = { items: orderItemIds };
    if (splitByVendor && subOrderIds.length) orderUpdateData.subOrders = subOrderIds;
    const updateReq = { ...reqTx, context: { ...reqTx.context || {}, skipOrderStatusHistory: simulatePayment } };
    if (simulatePayment) {
      const transaction = await payload.create({
        collection: "transactions",
        overrideAccess: true,
        data: {
          order: order.id,
          type: "charge",
          provider: "test",
          providerTransactionId: `test-${Date.now()}`,
          amount: grandTotal,
          currency,
          status: "succeeded",
          metadata: { simulated: true }
        },
        req: reqTx
      });
      paymentTransactionId = transaction.id;
      orderUpdateData.transaction = transaction.id;
      orderUpdateData.paymentStatus = "paid";
      orderUpdateData.status = "processing";
    } else if (codCheckout) {
      orderUpdateData.paymentStatus = "unpaid";
      orderUpdateData.status = "pending";
    } else if (sslCommerzHostedCheckoutEnabled()) {
      const storefrontBase = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_PUBLIC_URL || "").replace(/\/$/, "");
      if (!storefrontBase) {
        throw new Error("NEXT_PUBLIC_STOREFRONT_URL is required for SSL Commerz checkout redirects");
      }
      const localeSeg = checkoutLocale === "bn" ? "bn" : "en";
      const q = `orderNumber=${encodeURIComponent(orderNumber)}`;
      const successUrl = `${storefrontBase}/${localeSeg}/checkout/success?${q}`;
      const failUrl = `${storefrontBase}/${localeSeg}/checkout/failed?${q}`;
      const cancelUrl = `${storefrontBase}/${localeSeg}/checkout/cancel?${q}`;
      const ipnUrl = `${getSslCommerzIpnPublicBaseUrl()}/api/payments/sslcommerz/ipn`;
      const tranId = `${orderNumber}-${Date.now().toString(36)}`;
      const pendingTx = await payload.create({
        collection: "transactions",
        overrideAccess: true,
        data: {
          order: order.id,
          type: "charge",
          provider: "sslcommerz",
          providerTransactionId: tranId,
          amount: grandTotal,
          currency,
          status: "pending",
          metadata: { initiatedAt: (/* @__PURE__ */ new Date()).toISOString() }
        },
        req: reqTx
      });
      paymentTransactionId = pendingTx.id;
      orderUpdateData.transaction = pendingTx.id;
      const sandbox = process.env.SSLCOMMERZ_SANDBOX !== "false";
      const customerEmail = buyerEmail || guestEmail || `${guestPhone || "guest"}@checkout.invalid`;
      const customerPhone = persistShippingAddress.phone?.trim() || buyerPhone || guestPhone || "";
      const customerName = `${persistShippingAddress.firstName} ${persistShippingAddress.lastName}`.trim() || buyerName || "Customer";
      const session = await initiateSslCommerzHostedSession({
        storeId: process.env.SSLCOMMERZ_STORE_ID.trim(),
        storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD.trim(),
        sandbox,
        tranId,
        totalAmount: grandTotal,
        currency,
        successUrl,
        failUrl,
        cancelUrl,
        ipnUrl,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress: persistShippingAddress.street1,
        customerCity: persistShippingAddress.city,
        customerCountry: persistShippingAddress.country,
        customerState: persistShippingAddress.state,
        customerPostcode: persistShippingAddress.postalCode,
        shipAdd2: persistShippingAddress.street2,
        numOfItems: Math.max(1, orderItemData.length)
      });
      paymentRedirectUrl = session.gatewayPageUrl;
      await payload.update({
        collection: "transactions",
        id: pendingTx.id,
        overrideAccess: true,
        data: {
          metadata: {
            sessionKey: session.sessionKey,
            tranId
          }
        },
        req: reqTx
      });
    }
    await payload.update({
      collection: "orders",
      id: order.id,
      overrideAccess: true,
      data: orderUpdateData,
      req: updateReq
    });
    if (appliedCouponId) {
      const couponDoc = await payload.findByID({
        collection: "coupons",
        id: appliedCouponId,
        depth: 0,
        overrideAccess: true,
        req: reqTx
      });
      const currentUses = Number(couponDoc?.totalUses || 0);
      await payload.update({
        collection: "coupons",
        id: appliedCouponId,
        overrideAccess: true,
        data: { totalUses: currentUses + 1 },
        req: reqTx
      });
    }
    if (simulatePayment) {
      const statusHistoryData = {
        order: orderId,
        fromStatus: "pending",
        toStatus: "processing",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (userId != null) statusHistoryData.changedBy = userId;
      await payload.create({
        collection: "order-status-history",
        overrideAccess: true,
        data: statusHistoryData,
        req: reqTx
      });
    }
    if (inventoryEnabled) {
      const reserveByLevel = buildReserveQuantitiesByStockLevel(orderItemData);
      for (const [stockLevelId, qty] of reserveByLevel) {
        const levelDoc = await payload.findByID({
          collection: "stock-levels",
          id: stockLevelId,
          depth: 0,
          overrideAccess: true
        });
        if (!levelDoc) continue;
        const reserved = Number(levelDoc.reservedQuantity) || 0;
        await payload.update({
          collection: "stock-levels",
          id: stockLevelId,
          overrideAccess: true,
          data: { reservedQuantity: reserved + qty },
          req: reqTx
        });
      }
    }
    await payload.delete({
      collection: "carts",
      id: cartId,
      overrideAccess: true,
      req: reqTx
    });
    if (transactionID != null) {
      await payload.db.commitTransaction(transactionID);
    }
  } catch (err) {
    if (transactionID != null) {
      await payload.db.rollbackTransaction(transactionID);
    }
    throw err;
  }
  let recipientEmail;
  if (guestEmail) recipientEmail = guestEmail;
  else if (userId) {
    const user = await payload.findByID({ collection: "users", id: userId, depth: 0 });
    recipientEmail = user?.email;
  }
  if ((simulatePayment || codCheckout) && recipientEmail) {
    const { sendOrderConfirmationEmail: sendOrderConfirmationEmail2 } = await Promise.resolve().then(() => (init_send_email(), send_email_exports));
    sendOrderConfirmationEmail2(orderNumber, recipientEmail, grandTotal, currency).catch(
      (e) => console.error("[processCheckout] Failed to send order email:", e)
    );
  }
  if ((simulatePayment || codCheckout) && guestPhone) {
    const { sendOrderConfirmationSms: sendOrderConfirmationSms2 } = await Promise.resolve().then(() => (init_send_sms(), send_sms_exports));
    sendOrderConfirmationSms2(orderNumber, guestPhone, grandTotal, currency).catch(
      (e) => console.error("[processCheckout] Failed to send order SMS:", e)
    );
  }
  const paymentStatusAfterCreate = simulatePayment ? "paid" : "unpaid";
  return {
    order: {
      id: order.id,
      orderNumber,
      items: orderItemData.map((d) => ({
        productName: d.productName,
        variantName: d.variantName || void 0,
        sku: d.sku,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        totalPrice: d.totalPrice
      })),
      grandTotal,
      subtotal: subtotalCalc,
      currency,
      guestEmail,
      guestPhone,
      shippingAddress: persistShippingAddress,
      checkoutPaymentChannel: codCheckout ? "cash_on_delivery" : "online",
      paymentStatus: paymentStatusAfterCreate
    },
    transaction: paymentTransactionId ? { id: paymentTransactionId } : void 0,
    paymentRedirectUrl,
    warnings: addressStoreValidation.warning ? [addressStoreValidation.warning] : void 0,
    warningCodes: addressStoreValidation.warningCode ? [addressStoreValidation.warningCode] : void 0,
    resolvedStoreId: addressStoreValidation.resolvedStoreId ?? void 0
  };
}
var init_process_checkout = __esm({
  "packages/backend/src/lib/process-checkout.ts"() {
    "use strict";
    init_currencies();
    init_order_splitter();
    init_commission();
    init_coupon();
    init_allocate_stock_level();
    init_build_reserve_quantities_by_stock_level();
    init_order_checkout_snapshots();
    init_payload_server_url();
    init_sslcommerz_initiate_session();
    init_auth_config();
    init_guest_checkout_identifiers();
    init_cash_on_delivery();
    init_phone_format();
    init_address_store_validation();
  }
});

// packages/backend/src/lib/device-detector.ts
function detectDeviceFromUserAgent(ua) {
  if (!ua || typeof ua !== "string") {
    return {
      deviceType: "unknown",
      browser: "Unknown",
      os: "Unknown"
    };
  }
  const uaLower = ua.toLowerCase();
  if (uaLower.includes("bot") || uaLower.includes("crawler") || uaLower.includes("spider") || uaLower.includes("curl") || uaLower.includes("wget") || uaLower.includes("python-requests")) {
    return {
      deviceType: "bot",
      browser: "Bot/Crawler",
      os: "Automated"
    };
  }
  let os = "Unknown OS";
  if (ua.includes("iPhone")) {
    os = "iOS (iPhone)";
  } else if (ua.includes("iPad")) {
    os = "iPadOS";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) {
    os = "macOS";
  } else if (ua.includes("Windows NT 10.0")) {
    os = "Windows 10/11";
  } else if (ua.includes("Windows NT 6.3")) {
    os = "Windows 8.1";
  } else if (ua.includes("Windows NT 6.1")) {
    os = "Windows 7";
  } else if (ua.includes("Windows NT")) {
    os = "Windows";
  } else if (ua.includes("CrOS")) {
    os = "ChromeOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }
  let deviceType = "desktop";
  if (ua.includes("iPad") || ua.includes("Android") && !uaLower.includes("mobile") || uaLower.includes("tablet")) {
    deviceType = "tablet";
  } else if (uaLower.includes("mobile") || ua.includes("iPhone") || ua.includes("iPod") || ua.includes("Android") && uaLower.includes("mobile")) {
    deviceType = "mobile";
  }
  let browser = "Unknown Browser";
  if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = `Edge ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
    browser = `Opera ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = `Safari ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("Firefox/")) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (ua.includes("SamsungBrowser/")) {
    const match = ua.match(/SamsungBrowser\/([\d.]+)/);
    browser = `Samsung Internet ${match ? match[1].split(".")[0] : ""}`.trim();
  }
  return {
    deviceType,
    browser,
    os
  };
}
var init_device_detector = __esm({
  "packages/backend/src/lib/device-detector.ts"() {
    "use strict";
  }
});

// packages/backend/src/endpoints/checkout-process.ts
function getCheckoutLimiter() {
  if (!checkoutLimiter) {
    checkoutLimiter = createRateLimiter({ ...CHECKOUT_RATE_LIMIT, keyPrefix: "rl:checkout" });
  }
  return checkoutLimiter;
}
async function checkoutProcessHandler(req, deps) {
  const pc = deps?.processCheckout ?? processCheckout;
  const clientIp = getClientIp(req);
  const limitResponse = deps?.enforceRateLimit ? await deps.enforceRateLimit(null, clientIp) : await enforceRateLimit(getCheckoutLimiter(), clientIp);
  if (limitResponse) return limitResponse;
  const data = await req.json?.().catch(() => ({})) || {};
  const {
    cartId,
    shippingAddress,
    billingAddress,
    storeId,
    serviceArea,
    guestEmail,
    guestPhone,
    simulatePayment = false,
    idempotencyKey,
    shippingMethodIds,
    cashOnDelivery
  } = data;
  if (!cartId || !shippingAddress || !billingAddress) {
    return Response.json(
      { error: "Missing required fields: cartId, shippingAddress, billingAddress" },
      { status: 400 }
    );
  }
  if (idempotencyKey !== void 0 && (typeof idempotencyKey !== "string" || !isValidUUID(idempotencyKey))) {
    return Response.json({ error: "idempotencyKey must be a valid UUID string" }, { status: 400 });
  }
  const requiredAddressFields = ["firstName", "lastName", "street1", "city", "country"];
  for (const field of requiredAddressFields) {
    if (!shippingAddress[field]) {
      return Response.json({ error: `shippingAddress.${field} is required` }, { status: 400 });
    }
    if (!billingAddress[field]) {
      return Response.json({ error: `billingAddress.${field} is required` }, { status: 400 });
    }
  }
  const userId = req.user?.id ?? void 0;
  if (!userId) {
    const identErr = guestCheckoutIdentifiersError(
      getAuthRequiredIdentifier(),
      guestEmail,
      guestPhone,
      shippingAddress.country
    );
    if (identErr) {
      return Response.json({ error: identErr }, { status: 400 });
    }
  }
  if (cashOnDelivery === true) {
    if (!Array.isArray(shippingMethodIds) || shippingMethodIds.length === 0) {
      return Response.json(
        { error: "cashOnDelivery requires shippingMethodIds as a non-empty array of method ids" },
        { status: 400 }
      );
    }
    if (!shippingMethodIds.every((id) => typeof id === "string" && id.trim().length > 0)) {
      return Response.json({ error: "Each shippingMethodId must be a non-empty string" }, { status: 400 });
    }
  }
  if (shippingMethodIds !== void 0 && !Array.isArray(shippingMethodIds)) {
    return Response.json({ error: "shippingMethodIds must be an array when provided" }, { status: 400 });
  }
  if (!userId) {
    const orConditions = [];
    if (guestEmail) {
      orConditions.push({ email: { equals: guestEmail.trim().toLowerCase() } });
    }
    if (guestPhone) {
      const phoneVariants = collectGuestPhoneLookupVariants(guestPhone);
      if (phoneVariants.length === 1) {
        orConditions.push({ phone: { equals: phoneVariants[0] } });
      } else {
        orConditions.push({
          or: phoneVariants.map((v) => ({ phone: { equals: v } }))
        });
      }
    }
    if (orConditions.length > 0) {
      const existing = await req.payload.find({
        collection: "users",
        where: orConditions.length === 1 ? orConditions[0] : { or: orConditions },
        limit: 1,
        depth: 0,
        overrideAccess: true
      });
      if (existing.totalDocs > 0) {
        return Response.json(
          { error: "This email or phone number is already associated with an account. Please log in to continue checkout, or use a different email/phone." },
          { status: 409 }
        );
      }
    }
  }
  const isAdminUser = req.user?.role === "admin";
  const isDev = process.env.NODE_ENV === "development";
  const safeSimulatePayment = isAdminUser || isDev ? simulatePayment === true : false;
  const reqHeaders = req?.headers instanceof Headers ? req.headers : req?.headers && typeof req.headers.get === "function" ? req.headers : new Headers(req?.headers || {});
  const userAgent = reqHeaders.get("user-agent") || "";
  const referrer = reqHeaders.get("referer") || reqHeaders.get("referrer") || "";
  const detected = detectDeviceFromUserAgent(userAgent);
  const deviceTracking = {
    ipAddress: clientIp,
    userAgent: userAgent ? userAgent.slice(0, 500) : "",
    deviceType: detected.deviceType,
    browser: detected.browser,
    os: detected.os,
    referrer: referrer ? referrer.slice(0, 500) : ""
  };
  try {
    const result = await pc(
      req.payload,
      {
        cartId,
        shippingAddress,
        billingAddress,
        storeId: typeof storeId === "string" && storeId.trim() ? storeId.trim() : void 0,
        serviceArea: serviceArea && typeof serviceArea === "object" ? {
          countryId: typeof serviceArea.countryId === "string" ? serviceArea.countryId : void 0,
          subdivisionId: typeof serviceArea.subdivisionId === "string" ? serviceArea.subdivisionId : void 0,
          localityId: typeof serviceArea.localityId === "string" ? serviceArea.localityId : void 0
        } : void 0,
        guestEmail,
        guestPhone,
        simulatePayment: safeSimulatePayment,
        idempotencyKey,
        shippingMethodIds,
        cashOnDelivery: cashOnDelivery === true,
        deviceTracking
      },
      userId,
      req
    );
    if (result.error) {
      const status = result.statusCode ?? 400;
      return Response.json(
        { error: result.error, errorCode: result.errorCode },
        { status }
      );
    }
    return Response.json(result, { status: 201 });
  } catch (err) {
    console.error("[checkout/process]", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
var checkoutLimiter, checkoutProcessEndpoint;
var init_checkout_process = __esm({
  "packages/backend/src/endpoints/checkout-process.ts"() {
    "use strict";
    init_process_checkout();
    init_rate_limiter();
    init_utils2();
    init_auth_config();
    init_guest_checkout_identifiers();
    init_phone_format();
    init_device_detector();
    checkoutProcessEndpoint = {
      path: "/checkout/process",
      method: "post",
      handler: async (req) => checkoutProcessHandler(req)
    };
  }
});

// packages/backend/src/lib/guest-order-notify.ts
function parseGuestOrderNotifyMode(raw2) {
  const v = (raw2 ?? "email").trim().toLowerCase();
  if (v === "sms" || v === "both" || v === "email") return v;
  console.warn(
    `[guest-order-notify] Invalid GUEST_ORDER_NOTIFY_MODE="${raw2 ?? ""}", defaulting to email`
  );
  return "email";
}
function getGuestOrderNotifyMode() {
  return parseGuestOrderNotifyMode(process.env.GUEST_ORDER_NOTIFY_MODE);
}
function resolveGuestOrderNotifyChannels(mode, hasEmail, hasPhone) {
  if (!hasEmail && !hasPhone) return { email: false, sms: false };
  if (hasEmail && !hasPhone) return { email: true, sms: false };
  if (!hasEmail && hasPhone) return { email: false, sms: true };
  switch (mode) {
    case "both":
      return { email: true, sms: true };
    case "sms":
      return { email: false, sms: true };
    case "email":
    default:
      return { email: true, sms: false };
  }
}
async function deliverGuestOrderNotifications(params) {
  const logPrefix = params.logPrefix ?? "[guest-order-notify]";
  const { mode, channels, hasEmail, hasPhone, sendEmail: sendEmail2, sendSms: sendSms2 } = params;
  const logFail = (channel, err) => console.error(`${logPrefix} ${channel} delivery failed:`, err);
  const logFallbackFail = (channel, err) => console.error(`${logPrefix} fallback ${channel} failed:`, err);
  if (mode === "both" && channels.email && channels.sms && hasEmail && hasPhone) {
    await sendSms2().catch((e) => logFail("SMS", e));
    await sendEmail2().catch((e) => logFail("Email", e));
    return;
  }
  if (channels.email && hasEmail) {
    try {
      await sendEmail2();
    } catch (e) {
      logFail("Email", e);
      if (hasPhone) {
        await sendSms2().catch((e2) => logFallbackFail("SMS", e2));
      }
    }
    return;
  }
  if (channels.sms && hasPhone) {
    try {
      await sendSms2();
    } catch (e) {
      logFail("SMS", e);
      if (hasEmail) {
        await sendEmail2().catch((e2) => logFallbackFail("Email", e2));
      }
    }
  }
}
var init_guest_order_notify = __esm({
  "packages/backend/src/lib/guest-order-notify.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/resolve-checkout-notify-contacts.ts
function normalizeNotifyEmail(raw2) {
  if (typeof raw2 !== "string" || !raw2.trim()) return "";
  const e = raw2.trim().toLowerCase();
  if (!e.includes("@")) return "";
  if (e.endsWith("@checkout.invalid")) return "";
  return e;
}
function normalizeNotifyPhone(raw2, shippingCountryIso) {
  if (typeof raw2 !== "string" || !raw2.trim()) return "";
  const p = raw2.trim();
  return isValidCheckoutPhone(p, shippingCountryIso) ? p : "";
}
function customerUserId(order) {
  const cust = order.customer;
  if (typeof cust === "object" && cust !== null && "id" in cust) {
    return String(cust.id);
  }
  if (typeof cust === "string") return cust;
  return null;
}
async function resolveCheckoutNotifyContacts(payload, order) {
  const shipCountry = typeof order.shippingAddress === "object" && order.shippingAddress !== null && typeof order.shippingAddress.country === "string" ? String(order.shippingAddress.country) : void 0;
  let email = normalizeNotifyEmail(order.guestEmail);
  if (!email) {
    const snap = order.buyerSnapshot;
    if (typeof snap === "object" && snap !== null) {
      email = normalizeNotifyEmail(snap.email);
    }
  }
  let phone = normalizeNotifyPhone(order.guestPhone, shipCountry);
  if (!phone) {
    const snap = order.buyerSnapshot;
    if (typeof snap === "object" && snap !== null) {
      phone = normalizeNotifyPhone(snap.phone, shipCountry);
    }
  }
  if (!phone) {
    const addr = order.shippingAddress;
    if (typeof addr === "object" && addr !== null) {
      phone = normalizeNotifyPhone(addr.phone, shipCountry);
    }
  }
  const uid = customerUserId(order);
  let cachedUser;
  const loadCustomer = async () => {
    if (!uid) return null;
    if (cachedUser !== void 0) return cachedUser;
    cachedUser = await payload.findByID({
      collection: "users",
      id: uid,
      depth: 0,
      overrideAccess: true
    });
    return cachedUser;
  };
  if (!email) {
    const user = await loadCustomer();
    email = normalizeNotifyEmail(user?.email);
  }
  if (!phone) {
    const user = await loadCustomer();
    phone = normalizeNotifyPhone(user?.phone, shipCountry);
  }
  return { email, phone };
}
var init_resolve_checkout_notify_contacts = __esm({
  "packages/backend/src/lib/resolve-checkout-notify-contacts.ts"() {
    "use strict";
    init_phone_format();
  }
});

// packages/backend/src/lib/sslcommerz-validate-val-id.ts
function validatorBaseUrl() {
  const sandbox = process.env.SSLCOMMERZ_SANDBOX !== "false";
  return sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
}
async function validateSslCommerzValId(valId, fetchImpl = fetch) {
  const trimmed = valId.trim();
  if (!trimmed) {
    return { ok: false, error: "val_id is empty" };
  }
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  if (!storeId || !storePasswd) {
    return { ok: false, error: "SSL store credentials not configured" };
  }
  const qs = new URLSearchParams({
    val_id: trimmed,
    store_id: storeId,
    store_passwd: storePasswd,
    format: "json"
  });
  const url = `${validatorBaseUrl()}/validator/api/validationserverAPI.php?${qs.toString()}`;
  const res = await fetchImpl(url, { method: "GET" });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: `Validation response not JSON (${res.status})` };
  }
  const status = typeof json.status === "string" ? json.status : "";
  if (status !== "VALID" && status !== "VALIDATED") {
    const errMsg = typeof json.failedreason === "string" ? json.failedreason : typeof json.message === "string" ? json.message : status || "validation rejected";
    return { ok: false, error: errMsg };
  }
  const tran_id = typeof json.tran_id === "string" ? json.tran_id.trim() : "";
  const amount = typeof json.amount === "string" ? json.amount : String(json.amount ?? "");
  const currency = typeof json.currency === "string" ? json.currency.trim() : "";
  if (!tran_id) {
    return { ok: false, error: "validation missing tran_id" };
  }
  return { ok: true, tran_id, amount, currency, status };
}
var init_sslcommerz_validate_val_id = __esm({
  "packages/backend/src/lib/sslcommerz-validate-val-id.ts"() {
    "use strict";
  }
});

// packages/backend/src/lib/sslcommerz-ipn-process.ts
function mergeTxnMetadata(existing, valId, params) {
  const base = typeof existing === "object" && existing !== null ? { ...existing } : {};
  base.val_id = valId;
  const bankId = params.get("bank_tran_id");
  if (bankId) base.bank_tran_id = bankId;
  const tranDate = params.get("tran_date");
  if (tranDate) base.tran_date = tranDate;
  return base;
}
function amountsMatch(expected, paidStr) {
  const paid = Number.parseFloat(paidStr);
  if (!Number.isFinite(paid) || !Number.isFinite(expected)) return false;
  return Math.abs(paid - expected) <= 0.05;
}
function orderIdFromRelation(orderRel) {
  if (typeof orderRel === "object" && orderRel !== null && "id" in orderRel) {
    return String(orderRel.id);
  }
  if (typeof orderRel === "string") return orderRel;
  return null;
}
async function markTransactionByIpnFailure(payload, tranId, ipnStatus, deps) {
  const txResult = await payload.find({
    collection: "transactions",
    where: {
      and: [{ provider: { equals: "sslcommerz" } }, { providerTransactionId: { equals: tranId } }]
    },
    limit: 1,
    depth: 0,
    overrideAccess: true
  });
  const tx = txResult.docs[0];
  if (!tx || tx.status !== "pending") return;
  const terminal = ipnStatus === "CANCELLED" || ipnStatus === "EXPIRED" || ipnStatus === "UNATTEMPTED" ? "cancelled" : "failed";
  await payload.update({
    collection: "transactions",
    id: tx.id,
    overrideAccess: true,
    data: {
      status: terminal,
      metadata: {
        ...typeof tx.metadata === "object" && tx.metadata !== null ? tx.metadata : {},
        ipn_status: ipnStatus
      }
    }
  });
  const orderId = orderIdFromRelation(tx.order);
  if (!orderId) return;
  const orderDoc = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true
  });
  if (!orderDoc) return;
  const order = orderDoc;
  if (order.paymentStatus === "paid") return;
  const orderNumber = String(order.orderNumber ?? "").trim();
  if (!orderNumber) return;
  const contacts = await resolveCheckoutNotifyContacts(payload, order);
  const notifyMode = deps?.getGuestOrderNotifyMode?.() ?? getGuestOrderNotifyMode();
  const channels = resolveGuestOrderNotifyChannels(
    notifyMode,
    Boolean(contacts.email),
    Boolean(contacts.phone)
  );
  const sendGuestFailureEmail = deps?.sendGuestPaymentNotConfirmedEmail ?? (async (num, email, status) => {
    const { sendGuestPaymentNotConfirmedEmail: sendGuestPaymentNotConfirmedEmail2 } = await Promise.resolve().then(() => (init_send_email(), send_email_exports));
    await sendGuestPaymentNotConfirmedEmail2(num, email, status);
  });
  const sendGuestFailureSms = deps?.sendGuestPaymentNotConfirmedSms ?? (async (num, phone, status) => {
    const { sendGuestPaymentNotConfirmedSms: sendGuestPaymentNotConfirmedSms2 } = await Promise.resolve().then(() => (init_send_sms(), send_sms_exports));
    await sendGuestPaymentNotConfirmedSms2(num, phone, status);
  });
  await deliverGuestOrderNotifications({
    mode: notifyMode,
    channels,
    hasEmail: Boolean(contacts.email),
    hasPhone: Boolean(contacts.phone),
    sendEmail: () => sendGuestFailureEmail(orderNumber, contacts.email, ipnStatus),
    sendSms: () => sendGuestFailureSms(orderNumber, contacts.phone, ipnStatus),
    logPrefix: "[sslcommerz-ipn] payment-not-confirmed"
  });
}
async function processSslCommerzIpnNotification(payload, bodyText, deps) {
  const validateValId = deps?.validateValId ?? validateSslCommerzValId;
  const params = new URLSearchParams(bodyText.trim());
  const tranIdParam = params.get("tran_id")?.trim();
  const valId = params.get("val_id")?.trim();
  const ipnStatusRaw = params.get("status")?.trim().toUpperCase() ?? "";
  if (ipnStatusRaw && ipnStatusRaw !== "VALID") {
    if (tranIdParam) {
      await markTransactionByIpnFailure(payload, tranIdParam, ipnStatusRaw, deps);
    } else {
      console.warn("[sslcommerz-ipn] Non-VALID IPN without tran_id");
    }
    return;
  }
  if (!valId) {
    console.warn("[sslcommerz-ipn] Missing val_id; skipping");
    return;
  }
  const validated = await validateValId(valId);
  if (!validated.ok) {
    console.error("[sslcommerz-ipn] Validation API failed:", validated.error);
    return;
  }
  const tranId = tranIdParam || validated.tran_id;
  if (tranIdParam && validated.tran_id !== tranIdParam) {
    console.error("[sslcommerz-ipn] tran_id mismatch between IPN and validation API");
    return;
  }
  const txResult = await payload.find({
    collection: "transactions",
    where: {
      and: [{ provider: { equals: "sslcommerz" } }, { providerTransactionId: { equals: tranId } }]
    },
    limit: 1,
    depth: 0,
    overrideAccess: true
  });
  const tx = txResult.docs[0];
  if (!tx) {
    console.warn("[sslcommerz-ipn] No sslcommerz transaction for tran_id", tranId);
    return;
  }
  if (tx.status === "succeeded") {
    return;
  }
  const amountExpected = Number(tx.amount);
  if (!amountsMatch(amountExpected, validated.amount)) {
    console.error("[sslcommerz-ipn] Amount mismatch", {
      expected: amountExpected,
      paid: validated.amount,
      tranId
    });
    return;
  }
  const currencyExpected = String(tx.currency || "").toUpperCase();
  const currencyPaid = String(validated.currency || "").toUpperCase();
  if (currencyPaid && currencyExpected && currencyPaid !== currencyExpected) {
    console.error("[sslcommerz-ipn] Currency mismatch", {
      currencyPaid,
      currencyExpected,
      tranId
    });
    return;
  }
  const orderRel = tx.order;
  const orderId = typeof orderRel === "object" && orderRel !== null && "id" in orderRel ? String(orderRel.id) : typeof orderRel === "string" ? orderRel : null;
  if (!orderId) {
    console.error("[sslcommerz-ipn] Transaction has no order relation");
    return;
  }
  const orderDoc = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true
  });
  if (!orderDoc) {
    console.error("[sslcommerz-ipn] Order not found", orderId);
    return;
  }
  const order = orderDoc;
  const alreadyPaid = order.paymentStatus === "paid";
  await payload.update({
    collection: "transactions",
    id: tx.id,
    overrideAccess: true,
    data: {
      status: "succeeded",
      metadata: mergeTxnMetadata(tx.metadata, valId, params)
    }
  });
  if (!alreadyPaid) {
    await payload.update({
      collection: "orders",
      id: orderId,
      overrideAccess: true,
      data: {
        paymentStatus: "paid",
        status: "processing"
      }
    });
    const historyData = {
      order: orderId,
      fromStatus: "pending",
      toStatus: "processing",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const cust = order.customer;
    const userId = typeof cust === "object" && cust !== null && "id" in cust ? cust.id : typeof cust === "string" ? cust : void 0;
    if (userId != null) historyData.changedBy = userId;
    await payload.create({
      collection: "order-status-history",
      overrideAccess: true,
      data: historyData
    });
    const contacts = await resolveCheckoutNotifyContacts(payload, order);
    const orderNumber = String(order.orderNumber ?? "");
    const grandTotal = Number(order.grandTotal ?? amountExpected);
    const currency = String(order.currency ?? currencyExpected);
    const notifyMode = deps?.getGuestOrderNotifyMode?.() ?? getGuestOrderNotifyMode();
    const channels = resolveGuestOrderNotifyChannels(
      notifyMode,
      Boolean(contacts.email),
      Boolean(contacts.phone)
    );
    const sendPaidEmail = deps?.sendOrderPaidConfirmationEmail ?? (async (num, email, total, cur) => {
      const { sendOrderConfirmationEmail: sendOrderConfirmationEmail2 } = await Promise.resolve().then(() => (init_send_email(), send_email_exports));
      await sendOrderConfirmationEmail2(num, email, total, cur);
    });
    const sendPaidSms = deps?.sendOrderPaidConfirmationSms ?? (async (num, phone, total, cur) => {
      const { sendOrderConfirmationSms: sendOrderConfirmationSms2 } = await Promise.resolve().then(() => (init_send_sms(), send_sms_exports));
      await sendOrderConfirmationSms2(num, phone, total, cur);
    });
    if (orderNumber.trim()) {
      await deliverGuestOrderNotifications({
        mode: notifyMode,
        channels,
        hasEmail: Boolean(contacts.email),
        hasPhone: Boolean(contacts.phone),
        sendEmail: () => sendPaidEmail(orderNumber, contacts.email, grandTotal, currency),
        sendSms: () => sendPaidSms(orderNumber, contacts.phone, grandTotal, currency),
        logPrefix: "[sslcommerz-ipn] order-confirmation"
      });
    }
  }
}
var init_sslcommerz_ipn_process = __esm({
  "packages/backend/src/lib/sslcommerz-ipn-process.ts"() {
    "use strict";
    init_guest_order_notify();
    init_resolve_checkout_notify_contacts();
    init_sslcommerz_validate_val_id();
  }
});

// packages/backend/src/endpoints/sslcommerz-ipn.ts
async function readIpnBody(req) {
  const r = req;
  if (typeof r.text === "function") {
    return r.text();
  }
  return "";
}
var sslcommerzIpnEndpoint;
var init_sslcommerz_ipn = __esm({
  "packages/backend/src/endpoints/sslcommerz-ipn.ts"() {
    "use strict";
    init_sslcommerz_ipn_process();
    sslcommerzIpnEndpoint = {
      path: "/payments/sslcommerz/ipn",
      method: "post",
      handler: async (req) => {
        try {
          const bodyText = await readIpnBody(req);
          try {
            const p = new URLSearchParams(bodyText);
            console.log(
              "[sslcommerz-ipn] inbound",
              JSON.stringify({
                tran_id: p.get("tran_id") || void 0,
                status: p.get("status") || void 0,
                has_val_id: Boolean(p.get("val_id")?.trim())
              })
            );
          } catch {
            console.log("[sslcommerz-ipn] inbound (body parse skipped)");
          }
          await processSslCommerzIpnNotification(req.payload, bodyText);
        } catch (e) {
          console.error("[sslcommerz-ipn]", e);
        }
        return new Response("OK", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    };
  }
});

// packages/backend/src/endpoints/sslcommerz-sync-paid.ts
var sslcommerzSyncPaidEndpoint;
var init_sslcommerz_sync_paid = __esm({
  "packages/backend/src/endpoints/sslcommerz-sync-paid.ts"() {
    "use strict";
    init_sslcommerz_ipn_process();
    sslcommerzSyncPaidEndpoint = {
      path: "/payments/sslcommerz/sync-paid",
      method: "get",
      handler: async (req) => {
        try {
          const url = new URL(req.url ?? "", "http://localhost");
          const valId = url.searchParams.get("val_id")?.trim();
          if (!valId) {
            return Response.json({ error: "val_id is required" }, { status: 400 });
          }
          const tranId = url.searchParams.get("tran_id")?.trim();
          const body = new URLSearchParams();
          if (tranId) body.set("tran_id", tranId);
          body.set("val_id", valId);
          body.set("status", "VALID");
          await processSslCommerzIpnNotification(req.payload, body.toString());
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[sslcommerz-sync-paid]", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      }
    };
  }
});

// packages/backend/src/lib/admin-dashboard-stats.ts
function collectionExists(payload, slug) {
  return slug in (payload.collections || {});
}
async function safeCount(payload, collection, where) {
  if (!collectionExists(payload, collection)) return 0;
  try {
    const { totalDocs } = await payload.count({
      collection,
      where: where ?? {}
    });
    return totalDocs;
  } catch {
    return 0;
  }
}
function tenantIdFromUser2(user) {
  const t = user.tenant;
  if (t == null) return null;
  if (typeof t === "object" && t !== null && "id" in t && typeof t.id === "string") {
    return t.id;
  }
  if (typeof t === "string") return t;
  return String(t);
}
function resolveDateRanges(options, now = /* @__PURE__ */ new Date()) {
  const timeRange = options?.timeRange || "7d";
  let startDate;
  let endDate = new Date(now.getTime());
  let prevStartDate;
  let prevEndDate;
  if (timeRange === "custom" && options?.startDate && options?.endDate) {
    startDate = new Date(options.startDate);
    endDate = new Date(options.endDate);
    const duration = Math.max(1, endDate.getTime() - startDate.getTime());
    prevEndDate = new Date(startDate.getTime());
    prevStartDate = new Date(prevEndDate.getTime() - duration);
  } else if (timeRange === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1e3);
    prevEndDate = new Date(startDate.getTime());
  } else if (timeRange === "24h") {
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
    prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1e3);
    prevEndDate = new Date(startDate.getTime());
  } else if (timeRange === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1e3);
    prevEndDate = new Date(startDate.getTime());
  } else if (timeRange === "mtd") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), prevMonthDays), 23, 59, 59, 999);
  } else if (timeRange === "ytd") {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (timeRange === "all") {
    startDate = new Date(2020, 0, 1);
    prevStartDate = new Date(2010, 0, 1);
    prevEndDate = new Date(2019, 11, 31);
  } else {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1e3);
    prevEndDate = new Date(startDate.getTime());
  }
  return {
    timeRange,
    start: startDate,
    end: endDate,
    prevStart: prevStartDate,
    prevEnd: prevEndDate
  };
}
function calculateChangePercentage(current, previous) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Number(((current - previous) / previous * 100).toFixed(1));
}
function formatDateLabel(date, isMonthly = false) {
  if (isMonthly) {
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
  }
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}
function toRelationId(val) {
  if (val == null) return null;
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (typeof val === "object" && "id" in val) {
    const id = val.id;
    return id != null ? String(id) : null;
  }
  return null;
}
async function loadDashboardStats(payload, user, options) {
  let defaultCurrency = getDefaultCurrency();
  let supportedCurrencies = ["USD", "BDT"];
  if (typeof payload.findGlobal === "function") {
    try {
      const settings = await payload.findGlobal({
        slug: "platform-settings",
        depth: 0,
        overrideAccess: true
      });
      const curr = settings?.currency;
      if (curr) {
        if (typeof curr.defaultCurrency === "string" && curr.defaultCurrency.trim()) {
          defaultCurrency = curr.defaultCurrency.trim().toUpperCase();
        }
        if (Array.isArray(curr.supportedCurrencies) && curr.supportedCurrencies.length > 0) {
          supportedCurrencies = curr.supportedCurrencies.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
        }
      }
    } catch {
    }
  }
  if (!supportedCurrencies.includes(defaultCurrency)) {
    supportedCurrencies.unshift(defaultCurrency);
  }
  const requestedCurrency = options?.currency ? options.currency.trim().toUpperCase() : null;
  const currency = requestedCurrency && supportedCurrencies.includes(requestedCurrency) ? requestedCurrency : defaultCurrency;
  const dates = resolveDateRanges(options);
  const storeId = options?.storeId?.trim() || null;
  const isVendor = user.role === "vendor";
  const tenantId = isVendor ? tenantIdFromUser2(user) : null;
  let storeOptions = [];
  if (collectionExists(payload, "stock-locations")) {
    try {
      const storeWhere = isVendor && tenantId ? { tenant: { equals: tenantId } } : {};
      const { docs } = await payload.find({
        collection: "stock-locations",
        where: storeWhere,
        limit: 100,
        depth: 0,
        overrideAccess: true
      });
      storeOptions = docs.map((doc) => ({
        id: String(doc.id),
        name: String(doc.name || "Store"),
        code: String(doc.code || ""),
        isPublicStore: Boolean(doc.isPublicStore)
      }));
    } catch {
      storeOptions = [];
    }
  }
  const orderWhereClauses = [];
  if (storeId) {
    orderWhereClauses.push({ store: { equals: storeId } });
  }
  const currentOrderWhere = {
    and: [
      ...orderWhereClauses,
      { createdAt: { greater_than_equal: dates.start.toISOString() } },
      { createdAt: { less_than_equal: dates.end.toISOString() } }
    ]
  };
  const prevOrderWhere = {
    and: [
      ...orderWhereClauses,
      { createdAt: { greater_than_equal: dates.prevStart.toISOString() } },
      { createdAt: { less_than_equal: dates.prevEnd.toISOString() } }
    ]
  };
  let currentOrders = [];
  let prevOrders = [];
  let allRecentOrders = [];
  if (collectionExists(payload, "orders")) {
    try {
      const [currentRes, prevRes, recentRes] = await Promise.all([
        payload.find({
          collection: "orders",
          where: currentOrderWhere,
          limit: 1e3,
          depth: 1,
          overrideAccess: true
        }),
        payload.find({
          collection: "orders",
          where: prevOrderWhere,
          limit: 1e3,
          depth: 0,
          overrideAccess: true
        }),
        payload.find({
          collection: "orders",
          where: storeId ? { store: { equals: storeId } } : {},
          limit: 10,
          sort: "-createdAt",
          depth: 1,
          overrideAccess: true
        })
      ]);
      currentOrders = currentRes.docs || [];
      prevOrders = prevRes.docs || [];
      allRecentOrders = recentRes.docs || [];
    } catch {
      currentOrders = [];
      prevOrders = [];
      allRecentOrders = [];
    }
  }
  let currentSubOrders = [];
  let prevSubOrders = [];
  if (isVendor && tenantId && collectionExists(payload, "sub-orders")) {
    try {
      const [soCur, soPrev] = await Promise.all([
        payload.find({
          collection: "sub-orders",
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { createdAt: { greater_than_equal: dates.start.toISOString() } },
              { createdAt: { less_than_equal: dates.end.toISOString() } }
            ]
          },
          limit: 1e3,
          depth: 1,
          overrideAccess: true
        }),
        payload.find({
          collection: "sub-orders",
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { createdAt: { greater_than_equal: dates.prevStart.toISOString() } },
              { createdAt: { less_than_equal: dates.prevEnd.toISOString() } }
            ]
          },
          limit: 1e3,
          depth: 0,
          overrideAccess: true
        })
      ]);
      currentSubOrders = soCur.docs || [];
      prevSubOrders = soPrev.docs || [];
    } catch {
      currentSubOrders = [];
      prevSubOrders = [];
    }
  }
  const activeOrders = isVendor && tenantId && collectionExists(payload, "sub-orders") ? currentSubOrders : currentOrders;
  const activePrevOrders = isVendor && tenantId && collectionExists(payload, "sub-orders") ? prevSubOrders : prevOrders;
  let currentRevenue = 0;
  let currentSubtotal = 0;
  let currentTax = 0;
  let currentShipping = 0;
  let currentDiscounts = 0;
  let currentRefunds = 0;
  for (const order of activeOrders) {
    const isCancelledOrRefunded = order.status === "cancelled" || order.status === "refunded";
    const isRefunded = order.status === "refunded" || order.paymentStatus === "refunded";
    const grand = Number(order.grandTotal) || 0;
    const sub = Number(order.subtotal) || 0;
    const tax = Number(order.taxTotal) || 0;
    const ship = Number(order.shippingTotal) || 0;
    const disc = Number(order.discountTotal) || 0;
    if (isRefunded) {
      currentRefunds += grand;
    }
    if (!isCancelledOrRefunded) {
      currentRevenue += grand;
      currentSubtotal += sub;
      currentTax += tax;
      currentShipping += ship;
      currentDiscounts += disc;
    }
  }
  const orderStatusBreakdown = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0
  };
  for (const order of activeOrders) {
    const st = String(order.status || "pending").toLowerCase();
    if (st in orderStatusBreakdown) {
      orderStatusBreakdown[st] += 1;
    } else if (st === "partially-shipped") {
      orderStatusBreakdown.shipped += 1;
    }
  }
  let prevRevenue = 0;
  for (const order of activePrevOrders) {
    if (order.status !== "cancelled" && order.status !== "refunded") {
      prevRevenue += Number(order.grandTotal) || 0;
    }
  }
  const currentOrdersCount = activeOrders.filter((o) => o.status !== "cancelled").length;
  const prevOrdersCount = activePrevOrders.filter((o) => o.status !== "cancelled").length;
  const currentAov = currentOrdersCount > 0 ? Number((currentRevenue / currentOrdersCount).toFixed(2)) : 0;
  const prevAov = prevOrdersCount > 0 ? Number((prevRevenue / prevOrdersCount).toFixed(2)) : 0;
  let totalCustomers = 0;
  let currentPeriodCustomers = 0;
  let prevPeriodCustomers = 0;
  let recentCustomersDocs = [];
  if (collectionExists(payload, "users")) {
    try {
      const [totalCustRes, curCustRes, prevCustRes, recentCustRes] = await Promise.all([
        payload.count({
          collection: "users",
          where: { role: { equals: "customer" } }
        }),
        payload.count({
          collection: "users",
          where: {
            and: [
              { role: { equals: "customer" } },
              { createdAt: { greater_than_equal: dates.start.toISOString() } },
              { createdAt: { less_than_equal: dates.end.toISOString() } }
            ]
          }
        }),
        payload.count({
          collection: "users",
          where: {
            and: [
              { role: { equals: "customer" } },
              { createdAt: { greater_than_equal: dates.prevStart.toISOString() } },
              { createdAt: { less_than_equal: dates.prevEnd.toISOString() } }
            ]
          }
        }),
        payload.find({
          collection: "users",
          where: { role: { equals: "customer" } },
          limit: 10,
          sort: "-createdAt",
          depth: 0,
          overrideAccess: true
        })
      ]);
      totalCustomers = totalCustRes.totalDocs;
      currentPeriodCustomers = curCustRes.totalDocs;
      prevPeriodCustomers = prevCustRes.totalDocs;
      recentCustomersDocs = recentCustRes.docs || [];
    } catch {
      totalCustomers = 0;
    }
  }
  const daysDiff = Math.max(1, Math.round((dates.end.getTime() - dates.start.getTime()) / (24 * 60 * 60 * 1e3)));
  const isMonthly = daysDiff > 60;
  const chartBuckets = {};
  if (!isMonthly) {
    for (let i = 0; i <= Math.min(daysDiff, 60); i++) {
      const d = new Date(dates.start.getTime() + i * 24 * 60 * 60 * 1e3);
      if (d > dates.end) break;
      const key = d.toISOString().slice(0, 10);
      chartBuckets[key] = {
        label: formatDateLabel(d, false),
        fullDate: key,
        revenue: 0,
        orders: 0
      };
    }
  } else {
    let cur = new Date(dates.start.getFullYear(), dates.start.getMonth(), 1);
    while (cur <= dates.end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      chartBuckets[key] = {
        label: formatDateLabel(cur, true),
        fullDate: cur.toISOString().slice(0, 7),
        revenue: 0,
        orders: 0
      };
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  for (const order of activeOrders) {
    if (order.status === "cancelled") continue;
    const dateStr = String(order.createdAt || "");
    if (!dateStr) continue;
    const d = new Date(dateStr);
    const key = isMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : dateStr.slice(0, 10);
    if (chartBuckets[key]) {
      chartBuckets[key].revenue += Number(order.grandTotal) || 0;
      chartBuckets[key].orders += 1;
    }
  }
  const salesChart = Object.values(chartBuckets).map((b) => ({
    date: b.label,
    fullDate: b.fullDate,
    revenue: Number(b.revenue.toFixed(2)),
    orders: b.orders
  }));
  const recentOrders = allRecentOrders.map((o) => {
    let customerName = "Guest";
    let customerEmail = o.guestEmail || "";
    if (o.buyerSnapshot?.name) {
      customerName = o.buyerSnapshot.name;
    } else if (o.customer && typeof o.customer === "object") {
      customerName = o.customer.displayName || [o.customer.firstName, o.customer.lastName].filter(Boolean).join(" ") || o.customer.username || "Customer";
      if (!customerEmail) customerEmail = o.customer.email || "";
    }
    if (o.buyerSnapshot?.email) {
      customerEmail = o.buyerSnapshot.email;
    }
    const storeName = o.store && typeof o.store === "object" ? String(o.store.name || "") : null;
    const itemsCount = Array.isArray(o.items) ? o.items.length : 0;
    return {
      id: String(o.id),
      orderNumber: String(o.orderNumber || `ORD-${o.id}`),
      customerName,
      customerEmail,
      itemsCount,
      grandTotal: Number(o.grandTotal) || 0,
      currency: String(o.currency || currency),
      status: String(o.status || "pending"),
      paymentStatus: String(o.paymentStatus || "unpaid"),
      createdAt: String(o.createdAt || (/* @__PURE__ */ new Date()).toISOString()),
      storeName
    };
  });
  const bestsellingMap = {};
  if (collectionExists(payload, "order-items")) {
    try {
      const itemWhere = isVendor && tenantId ? { tenant: { equals: tenantId } } : {};
      const { docs: itemDocs } = await payload.find({
        collection: "order-items",
        where: itemWhere,
        limit: 1e3,
        depth: 1,
        overrideAccess: true
      });
      for (const item of itemDocs) {
        const prodId = toRelationId(item.product) || item.productName || "unknown";
        const qty = Number(item.quantity) || 1;
        const total = Number(item.totalPrice) || Number(item.unitPrice) * qty || 0;
        const price = Number(item.unitPrice) || 0;
        const sku = String(item.sku || "");
        const name = String(item.productName || (item.product && typeof item.product === "object" ? item.product.name : "Product"));
        let imageUrl = item.productImage || null;
        if (!imageUrl && item.product && typeof item.product === "object" && Array.isArray(item.product.images) && item.product.images[0]?.image) {
          const img = item.product.images[0].image;
          imageUrl = typeof img === "object" ? img.url : null;
        }
        if (!bestsellingMap[prodId]) {
          bestsellingMap[prodId] = {
            id: prodId,
            name,
            sku,
            imageUrl,
            unitsSold: 0,
            revenue: 0,
            price
          };
        }
        bestsellingMap[prodId].unitsSold += qty;
        bestsellingMap[prodId].revenue += total;
      }
    } catch {
    }
  }
  const bestsellingProducts = Object.values(bestsellingMap).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5).map((p) => ({
    ...p,
    revenue: Number(p.revenue.toFixed(2))
  }));
  const wishlistCounts = {};
  if (collectionExists(payload, "wishlist-items")) {
    try {
      const { docs: wishDocs } = await payload.find({
        collection: "wishlist-items",
        limit: 500,
        depth: 0,
        overrideAccess: true
      });
      for (const w of wishDocs) {
        const pid = toRelationId(w.product);
        if (pid) {
          wishlistCounts[pid] = (wishlistCounts[pid] || 0) + 1;
        }
      }
    } catch {
    }
  }
  let topEngagedProducts = [];
  if (collectionExists(payload, "products")) {
    try {
      const prodWhere = isVendor && tenantId ? { tenant: { equals: tenantId } } : { status: { equals: "published" } };
      const { docs: prods } = await payload.find({
        collection: "products",
        where: prodWhere,
        limit: 50,
        depth: 1,
        overrideAccess: true
      });
      topEngagedProducts = prods.map((p) => {
        const pid = String(p.id);
        const wishCount = wishlistCounts[pid] || 0;
        const rating = Number(p.rating) || 0;
        const totalReviews = Number(p.totalReviews) || 0;
        let imageUrl = null;
        if (Array.isArray(p.images) && p.images[0]?.image) {
          const img = p.images[0].image;
          imageUrl = typeof img === "object" ? img.url : null;
        }
        return {
          id: pid,
          name: typeof p.name === "string" ? p.name : String(p.name?.en || "Product"),
          sku: String(p.sku || ""),
          imageUrl,
          price: Number(p.basePrice) || 0,
          wishlistCount: wishCount,
          rating,
          totalReviews
        };
      }).sort((a, b) => b.wishlistCount * 3 + b.rating * b.totalReviews - (a.wishlistCount * 3 + a.rating * a.totalReviews)).slice(0, 5);
    } catch {
      topEngagedProducts = [];
    }
  }
  const newCustomers = recentCustomersDocs.map((c) => {
    const name = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.username || "Customer";
    return {
      id: String(c.id),
      name,
      email: String(c.email || ""),
      phone: c.phone ? String(c.phone) : null,
      status: String(c.status || "active"),
      ordersCount: 0,
      totalSpent: 0,
      createdAt: String(c.createdAt || (/* @__PURE__ */ new Date()).toISOString())
    };
  });
  let lowStockProducts = [];
  if (collectionExists(payload, "stock-levels")) {
    try {
      const stockWhere = isVendor && tenantId ? { "location.tenant": { equals: tenantId } } : {};
      const { docs: stockDocs } = await payload.find({
        collection: "stock-levels",
        where: stockWhere,
        limit: 100,
        depth: 2,
        overrideAccess: true
      });
      for (const row of stockDocs) {
        const qty = Number(row.quantity) || 0;
        const reserved = Number(row.reservedQuantity) || 0;
        const available = qty - reserved;
        if (available <= 10) {
          const prodObj = row.product && typeof row.product === "object" ? row.product : null;
          const prodName = prodObj ? typeof prodObj.name === "string" ? prodObj.name : prodObj.name?.en || "Product" : "Product";
          const sku = (row.variant && typeof row.variant === "object" ? row.variant.sku : prodObj?.sku) || "";
          const locName = row.location && typeof row.location === "object" ? String(row.location.name || "") : "Default Warehouse";
          const varName = row.variant && typeof row.variant === "object" ? String(row.variant.title || row.variant.name || "") : null;
          lowStockProducts.push({
            id: String(row.id),
            productId: toRelationId(row.product) || String(row.id),
            productName: prodName,
            variantName: varName,
            sku,
            locationName: locName,
            quantity: qty,
            reservedQuantity: reserved,
            status: available <= 0 ? "out_of_stock" : "low_stock"
          });
        }
      }
      lowStockProducts.sort((a, b) => a.quantity - b.quantity);
      lowStockProducts = lowStockProducts.slice(0, 6);
    } catch {
      lowStockProducts = [];
    }
  }
  let recentReviews = [];
  if (collectionExists(payload, "product-reviews")) {
    try {
      const { docs: revDocs } = await payload.find({
        collection: "product-reviews",
        limit: 5,
        sort: "-createdAt",
        depth: 1,
        overrideAccess: true
      });
      recentReviews = revDocs.map((r) => {
        const prod = r.product && typeof r.product === "object" ? r.product : null;
        const prodName = prod ? typeof prod.name === "string" ? prod.name : prod.name?.en || "Product" : "Product";
        const author = r.author && typeof r.author === "object" ? r.author : null;
        const authorName = author ? author.displayName || [author.firstName, author.lastName].filter(Boolean).join(" ") || author.username || "Customer" : "Customer";
        return {
          id: String(r.id),
          productName: prodName,
          productId: prod ? String(prod.id) : String(r.product || ""),
          authorName,
          rating: Number(r.rating) || 5,
          title: r.title ? String(r.title) : null,
          comment: r.comment ? String(r.comment) : null,
          status: String(r.status || "pending"),
          createdAt: String(r.createdAt || (/* @__PURE__ */ new Date()).toISOString())
        };
      });
    } catch {
      recentReviews = [];
    }
  }
  let activeCoupons = [];
  if (collectionExists(payload, "coupons")) {
    try {
      const { docs: coupDocs } = await payload.find({
        collection: "coupons",
        limit: 5,
        sort: "-createdAt",
        depth: 0,
        overrideAccess: true
      });
      activeCoupons = coupDocs.map((c) => ({
        id: String(c.id),
        code: String(c.code || ""),
        type: c.type === "fixed" ? "fixed" : "percentage",
        value: Number(c.value) || 0,
        minOrderValue: Number(c.minOrderValue) || 0,
        totalUses: Number(c.totalUses) || 0,
        isActive: Boolean(c.isActive),
        expiresAt: c.expiresAt ? String(c.expiresAt) : null
      }));
    } catch {
      activeCoupons = [];
    }
  }
  if (user.role === "admin") {
    const [ordersTotal, subOrdersTotal, tenantsTotal, productsTotal, pendingVendorApplications] = await Promise.all([
      safeCount(payload, "orders"),
      safeCount(payload, "sub-orders"),
      safeCount(payload, "tenants"),
      safeCount(payload, "products"),
      safeCount(payload, "vendor-applications", { status: { equals: "pending" } })
    ]);
    return {
      role: "admin",
      currency,
      dateRange: {
        timeRange: dates.timeRange,
        startDate: dates.start.toISOString(),
        endDate: dates.end.toISOString()
      },
      stores: storeOptions,
      selectedStoreId: storeId,
      ordersTotal,
      subOrdersTotal,
      tenantsTotal,
      productsTotal,
      pendingVendorApplications,
      kpis: {
        revenue: {
          value: Number(currentRevenue.toFixed(2)),
          previousValue: Number(prevRevenue.toFixed(2)),
          changePercentage: calculateChangePercentage(currentRevenue, prevRevenue)
        },
        orders: {
          value: currentOrdersCount,
          previousValue: prevOrdersCount,
          changePercentage: calculateChangePercentage(currentOrdersCount, prevOrdersCount)
        },
        customers: {
          value: totalCustomers,
          previousValue: totalCustomers - currentPeriodCustomers,
          changePercentage: calculateChangePercentage(currentPeriodCustomers, prevPeriodCustomers)
        },
        aov: {
          value: currentAov,
          previousValue: prevAov,
          changePercentage: calculateChangePercentage(currentAov, prevAov)
        }
      },
      salesSummary: {
        revenue: Number(currentRevenue.toFixed(2)),
        subtotal: Number(currentSubtotal.toFixed(2)),
        taxTotal: Number(currentTax.toFixed(2)),
        shippingTotal: Number(currentShipping.toFixed(2)),
        discountTotal: Number(currentDiscounts.toFixed(2)),
        refundTotal: Number(currentRefunds.toFixed(2))
      },
      orderStatusBreakdown,
      salesChart,
      recentOrders,
      bestsellingProducts,
      topEngagedProducts,
      newCustomers,
      lowStockProducts,
      recentReviews,
      activeCoupons,
      adminUi: {
        showSubOrders: collectionExists(payload, "sub-orders"),
        showTenants: collectionExists(payload, "tenants"),
        showVendorApplications: collectionExists(payload, "vendor-applications")
      }
    };
  }
  if (user.role === "vendor") {
    const vendorUi = {
      showSubOrders: collectionExists(payload, "sub-orders"),
      showStockLevels: collectionExists(payload, "stock-levels")
    };
    if (!tenantId) {
      return {
        role: "vendor",
        tenantId: null,
        currency,
        dateRange: {
          timeRange: dates.timeRange,
          startDate: dates.start.toISOString(),
          endDate: dates.end.toISOString()
        },
        stores: storeOptions,
        selectedStoreId: storeId,
        subOrdersTotal: 0,
        subOrdersOpen: 0,
        productsTotal: 0,
        stockLevelsTotal: 0,
        kpis: {
          revenue: { value: 0, previousValue: 0, changePercentage: 0 },
          orders: { value: 0, previousValue: 0, changePercentage: 0 },
          customers: { value: 0, previousValue: 0, changePercentage: 0 },
          aov: { value: 0, previousValue: 0, changePercentage: 0 }
        },
        salesSummary: { revenue: 0, subtotal: 0, taxTotal: 0, shippingTotal: 0, discountTotal: 0, refundTotal: 0 },
        orderStatusBreakdown: { pending: 0, processing: 0, shipped: 0, delivered: 0, completed: 0, cancelled: 0, refunded: 0 },
        salesChart: [],
        recentOrders: [],
        bestsellingProducts: [],
        topEngagedProducts: [],
        newCustomers: [],
        lowStockProducts: [],
        recentReviews: [],
        activeCoupons: [],
        vendorUi
      };
    }
    const tenantWhere = { tenant: { equals: tenantId } };
    const openStatuses = ["pending", "confirmed", "processing", "shipped", "delivered"];
    const openWhere = {
      and: [tenantWhere, { status: { in: [...openStatuses] } }]
    };
    const [subOrdersTotal, subOrdersOpen, productsTotal, stockLevelsTotal] = await Promise.all([
      safeCount(payload, "sub-orders", tenantWhere),
      safeCount(payload, "sub-orders", openWhere),
      safeCount(payload, "products", tenantWhere),
      safeCount(payload, "stock-levels", { "location.tenant": { equals: tenantId } })
    ]);
    return {
      role: "vendor",
      tenantId,
      currency,
      dateRange: {
        timeRange: dates.timeRange,
        startDate: dates.start.toISOString(),
        endDate: dates.end.toISOString()
      },
      stores: storeOptions,
      selectedStoreId: storeId,
      subOrdersTotal,
      subOrdersOpen,
      productsTotal,
      stockLevelsTotal,
      kpis: {
        revenue: {
          value: Number(currentRevenue.toFixed(2)),
          previousValue: Number(prevRevenue.toFixed(2)),
          changePercentage: calculateChangePercentage(currentRevenue, prevRevenue)
        },
        orders: {
          value: currentOrdersCount,
          previousValue: prevOrdersCount,
          changePercentage: calculateChangePercentage(currentOrdersCount, prevOrdersCount)
        },
        customers: {
          value: totalCustomers,
          previousValue: totalCustomers - currentPeriodCustomers,
          changePercentage: calculateChangePercentage(currentPeriodCustomers, prevPeriodCustomers)
        },
        aov: {
          value: currentAov,
          previousValue: prevAov,
          changePercentage: calculateChangePercentage(currentAov, prevAov)
        }
      },
      salesSummary: {
        revenue: Number(currentRevenue.toFixed(2)),
        subtotal: Number(currentSubtotal.toFixed(2)),
        taxTotal: Number(currentTax.toFixed(2)),
        shippingTotal: Number(currentShipping.toFixed(2)),
        discountTotal: Number(currentDiscounts.toFixed(2)),
        refundTotal: Number(currentRefunds.toFixed(2))
      },
      orderStatusBreakdown,
      salesChart,
      recentOrders,
      bestsellingProducts,
      topEngagedProducts,
      newCustomers,
      lowStockProducts,
      recentReviews,
      activeCoupons,
      vendorUi
    };
  }
  throw new Error("Dashboard stats require admin or vendor role");
}
var init_admin_dashboard_stats = __esm({
  "packages/backend/src/lib/admin-dashboard-stats.ts"() {
    "use strict";
    init_currencies();
  }
});

// packages/backend/src/endpoints/dashboard-stats.ts
function formatDashboardStatsError(err) {
  return err instanceof Error ? err.message : "Failed to load stats";
}
async function dashboardStatsHandler(req) {
  const user = req.user;
  if (!user?.id) {
    return Response.json({ errors: [{ message: "Unauthorized" }] }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "vendor") {
    return Response.json({ errors: [{ message: "Forbidden" }] }, { status: 403 });
  }
  const url = new URL(req.url ?? "", "http://localhost");
  const qs = url.searchParams;
  const options = {
    timeRange: qs.get("timeRange") ?? qs.get("range") ?? void 0,
    startDate: qs.get("startDate") ?? void 0,
    endDate: qs.get("endDate") ?? void 0,
    storeId: qs.get("storeId") ?? qs.get("store") ?? void 0,
    currency: qs.get("currency") ?? void 0
  };
  try {
    const stats = await loadDashboardStats(
      req.payload,
      {
        id: String(user.id),
        role: user.role,
        tenant: user.tenant
      },
      options
    );
    return Response.json(stats);
  } catch (err) {
    return Response.json({ errors: [{ message: formatDashboardStatsError(err) }] }, { status: 500 });
  }
}
var dashboardStatsEndpoint;
var init_dashboard_stats = __esm({
  "packages/backend/src/endpoints/dashboard-stats.ts"() {
    "use strict";
    init_admin_dashboard_stats();
    dashboardStatsEndpoint = {
      path: "/dashboard-stats",
      method: "get",
      handler: async (req) => dashboardStatsHandler(req)
    };
  }
});

// packages/backend/src/lib/brainstation-brand-assets.ts
var BRAINSTATION_LOGO_SRC, BRAINSTATION_FAVICON_SRC;
var init_brainstation_brand_assets = __esm({
  "packages/backend/src/lib/brainstation-brand-assets.ts"() {
    "use strict";
    BRAINSTATION_LOGO_SRC = "/branding/brainstation-23-symbol.png";
    BRAINSTATION_FAVICON_SRC = "/branding/brainstation-23-symbol.png";
  }
});

// packages/backend/src/lib/admin-branding.ts
function mediaUrlFromUploadField(field) {
  if (!field || typeof field !== "object") return null;
  const u = field.url;
  return typeof u === "string" && u.length > 0 ? u : null;
}
function mediaUploadFilePath(filename2, payload) {
  const apiRoute = payload.config.routes?.api || "/api";
  const path7 = `/media/file/${encodeURIComponent(filename2)}`;
  if (!apiRoute || apiRoute === "/") return path7;
  return `${apiRoute.replace(/\/$/, "")}${path7}`;
}
function resolveMediaPublicUrl(field, payload) {
  const direct = mediaUrlFromUploadField(field);
  if (direct) return direct;
  if (!field || typeof field !== "object") return null;
  const o = field;
  const sizes = o.sizes;
  if (sizes) {
    for (const key of SIZE_ORDER) {
      const u = sizes[key]?.url;
      if (typeof u === "string" && u.length > 0) return u;
    }
    for (const key of Object.keys(sizes)) {
      const u = sizes[key]?.url;
      if (typeof u === "string" && u.length > 0) return u;
    }
  }
  const filename2 = typeof o.filename === "string" ? o.filename : void 0;
  if (filename2) {
    return mediaUploadFilePath(filename2, payload);
  }
  return null;
}
function resolveAdminBrandingFromGlobal(globalDoc, payload) {
  const branding = globalDoc?.adminBranding;
  const logoUrl = resolveMediaPublicUrl(branding?.logo, payload) ?? BRAINSTATION_LOGO_SRC;
  const faviconUrl = resolveMediaPublicUrl(branding?.favicon, payload) ?? BRAINSTATION_FAVICON_SRC;
  const rawTagline = typeof branding?.loginTagline === "string" ? branding.loginTagline.trim() : "";
  const tagline = rawTagline.length > 0 ? rawTagline : DEFAULT_ADMIN_TAGLINE;
  const platformName = typeof globalDoc?.platformName === "string" ? globalDoc.platformName.trim() : "";
  const logoAlt = platformName.length > 0 ? `${platformName}` : "Admin";
  return { logoUrl, faviconUrl, tagline, logoAlt };
}
var DEFAULT_ADMIN_TAGLINE, SIZE_ORDER;
var init_admin_branding = __esm({
  "packages/backend/src/lib/admin-branding.ts"() {
    "use strict";
    init_brainstation_brand_assets();
    DEFAULT_ADMIN_TAGLINE = "BS-Commerce \xB7 Admin";
    SIZE_ORDER = ["tablet", "card", "thumbnail"];
  }
});

// packages/backend/src/endpoints/admin-branding.ts
async function adminBrandingHandler(req) {
  const doc = await req.payload.findGlobal({
    slug: "platform-settings",
    depth: 2,
    overrideAccess: true,
    req
  });
  const body = resolveAdminBrandingFromGlobal(doc, req.payload);
  return Response.json(body, { headers: NO_STORE });
}
var NO_STORE, adminBrandingEndpoint;
var init_admin_branding2 = __esm({
  "packages/backend/src/endpoints/admin-branding.ts"() {
    "use strict";
    init_admin_branding();
    NO_STORE = { "Cache-Control": "no-store, max-age=0" };
    adminBrandingEndpoint = {
      path: "/admin-branding",
      method: "get",
      handler: async (req) => adminBrandingHandler(req)
    };
  }
});

// packages/backend/src/lib/custom-endpoints-openapi.ts
var customEndpointsOpenApi;
var init_custom_endpoints_openapi = __esm({
  "packages/backend/src/lib/custom-endpoints-openapi.ts"() {
    "use strict";
    customEndpointsOpenApi = {
      openapi: "3.0.3",
      info: {
        title: "BS-Commerce Supplemental API Endpoints",
        version: "1.0.0",
        description: "Supplemental contract for routes missing from autogenerated Payload OpenAPI output."
      },
      paths: {
        "/api/users/login": {
          post: {
            summary: "Payload auth login (email/username + password)",
            description: "Use this endpoint with `email` + `password` (or `username` + `password`). For identifier-based login use `/api/auth/login`.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["password"],
                    properties: {
                      email: { type: "string", format: "email" },
                      username: { type: "string" },
                      password: { type: "string" }
                    }
                  }
                }
              }
            },
            responses: {
              200: { description: "Authenticated." },
              400: { description: "Validation error." },
              401: { description: "Invalid credentials." }
            }
          }
        },
        "/api/users/logout": {
          post: {
            summary: "Payload auth logout",
            responses: {
              200: { description: "Logged out." },
              400: { description: "Validation error." },
              401: { description: "Unauthorized." }
            }
          }
        },
        "/api/users/me": {
          get: {
            summary: "Current authenticated user profile",
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Current user payload." },
              401: { description: "Unauthorized." }
            }
          }
        },
        "/api/auth/login": {
          post: {
            summary: "Login with email or phone identifier",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["identifier", "password"],
                    properties: {
                      identifier: { type: "string", description: "Email or phone number." },
                      password: { type: "string" }
                    }
                  }
                }
              }
            },
            responses: {
              200: { description: "Authenticated successfully." },
              400: { description: "Validation error." },
              401: { description: "Invalid credentials." },
              403: { description: "Verification gate blocked login." }
            }
          }
        },
        "/api/guest/order-lookup": {
          post: {
            summary: "Lookup guest order by reference and email/phone",
            responses: {
              200: { description: "Order found." },
              400: { description: "Validation error." },
              404: { description: "Order not found." }
            }
          }
        },
        "/api/checkout/process": {
          post: {
            summary: "Process checkout payload into an order",
            description: "Guest identifiers follow AUTH_REQUIRED_IDENTIFIER (guestEmail / guestPhone). cashOnDelivery with shippingMethodIds skips hosted payment when every method has collect-on-delivery enabled; order keeps checkoutPaymentChannel=cash_on_delivery and paymentStatus unpaid. Optional `storeId` + `serviceArea` enable address-vs-store alignment checks controlled by ADDRESS_STORE_VALIDATION_MODE=off|warn|enforce.",
            responses: {
              201: {
                description: "Order created; JSON includes order.checkoutPaymentChannel (online|cash_on_delivery), paymentStatus snapshot, optional transaction id, optional paymentRedirectUrl for hosted gateway, and optional warnings/warningCodes/resolvedStoreId for address-store warn mode."
              },
              400: { description: "Invalid payload." },
              401: { description: "Unauthorized when required." },
              409: { description: "Inventory or business-rule conflict." },
              501: { description: "Payment provider not implemented." },
              503: { description: "Hosted payment not configured." }
            }
          }
        },
        "/api/payments/sslcommerz/ipn": {
          post: {
            summary: "SSL Commerz IPN webhook",
            description: "SSL Commerz POSTs form-urlencoded transaction fields. Server validates `val_id` with SSL, then marks the matching transaction succeeded and the order paid when validation succeeds.",
            responses: {
              200: { description: "Acknowledged (always 200 for SSL compatibility)." }
            }
          }
        },
        "/api/payments/sslcommerz/sync-paid": {
          get: {
            summary: "SSL Commerz success-page reconciliation",
            description: "Browser-callable alternative when IPN cannot reach the backend (e.g. localhost). Requires `val_id` from the gateway redirect query; optionally `tran_id`. Idempotent.",
            parameters: [
              { name: "val_id", in: "query", required: true, schema: { type: "string" } },
              { name: "tran_id", in: "query", required: false, schema: { type: "string" } }
            ],
            responses: {
              200: { description: "Reconciliation attempted (check admin order if errors logged)." },
              400: { description: "Missing val_id." },
              500: { description: "Server error." }
            }
          }
        },
        "/api/storefront/store-products": {
          get: {
            summary: "Storefront catalog \u2014 products with optional stock-location filter",
            description: "When `store` is set (stock location id), only products with available stock at that location are returned. Otherwise published products match filters as usual.",
            parameters: [
              { name: "store", in: "query", required: false, schema: { type: "string" } },
              { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
              { name: "limit", in: "query", required: false, schema: { type: "integer", default: 12, maximum: 100 } },
              { name: "sort", in: "query", required: false, schema: { type: "string", default: "-createdAt" } },
              { name: "locale", in: "query", required: false, schema: { type: "string" } },
              { name: "depth", in: "query", required: false, schema: { type: "integer", default: 1, maximum: 3 } },
              { name: "category", in: "query", required: false, schema: { type: "string" } },
              { name: "search", in: "query", required: false, schema: { type: "string" } },
              { name: "featured", in: "query", required: false, schema: { type: "string", enum: ["true"] } },
              { name: "tenant", in: "query", required: false, schema: { type: "string" } },
              { name: "minPrice", in: "query", required: false, schema: { type: "number" } },
              { name: "maxPrice", in: "query", required: false, schema: { type: "number" } }
            ],
            responses: {
              200: { description: "Paginated products (same shape as Payload products find)." },
              500: { description: "Server error." }
            }
          }
        },
        "/api/dashboard-stats": {
          get: {
            summary: "Role-scoped admin dashboard metrics",
            responses: {
              200: { description: "Stats response for admin or vendor role." },
              401: { description: "Unauthorized." },
              403: { description: "Forbidden for non-admin-panel roles." }
            }
          }
        },
        "/api/admin-branding": {
          get: {
            summary: "Public admin branding settings",
            responses: {
              200: { description: "Branding payload (logo, favicon, tagline)." }
            }
          }
        },
        "/api/auth/send-verification": {
          post: {
            summary: "Send verification code/link to identifier",
            responses: {
              200: { description: "Verification dispatched." },
              400: { description: "Validation error." },
              429: { description: "Rate limit exceeded." }
            }
          }
        },
        "/api/auth/verify-phone": {
          post: {
            summary: "Verify phone using OTP code",
            responses: {
              200: { description: "Phone verified." },
              400: { description: "Invalid or expired code." }
            }
          }
        },
        "/api/auth/verify-email": {
          post: {
            summary: "Verify email using OTP code",
            responses: {
              200: { description: "Email verified." },
              400: { description: "Invalid or expired code." }
            }
          }
        },
        "/api/auth/verify-email/{token}": {
          get: {
            summary: "Verify email using link token",
            parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
            responses: {
              200: { description: "Email verified." },
              400: { description: "Invalid or expired token." }
            }
          }
        },
        "/api/auth/admin/verify-identifier": {
          post: {
            summary: "Admin verification helper for identifiers",
            responses: {
              200: { description: "Verification state updated." },
              400: { description: "Validation error." },
              403: { description: "Forbidden." }
            }
          }
        },
        "/api/discounts/coupons/{id}/usage": {
          get: {
            summary: "Coupon usage analytics/details by coupon id",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
              200: { description: "Usage details." },
              403: { description: "Forbidden." },
              404: { description: "Coupon not found." }
            }
          }
        }
      }
    };
  }
});

// packages/backend/src/endpoints/custom-endpoints-openapi.ts
var customEndpointsOpenApiEndpoint;
var init_custom_endpoints_openapi2 = __esm({
  "packages/backend/src/endpoints/custom-endpoints-openapi.ts"() {
    "use strict";
    init_custom_endpoints_openapi();
    customEndpointsOpenApiEndpoint = {
      path: "/openapi-custom.json",
      method: "get",
      handler: async () => {
        return Response.json(customEndpointsOpenApi, {
          status: 200,
          headers: { "cache-control": "no-store" }
        });
      }
    };
  }
});

// packages/backend/src/endpoints/docs-index.ts
var docsIndexEndpoint;
var init_docs_index = __esm({
  "packages/backend/src/endpoints/docs-index.ts"() {
    "use strict";
    docsIndexEndpoint = {
      path: "/docs-index",
      method: "get",
      handler: async () => {
        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BS-Commerce API Docs</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; color: #0f172a; }
      h1 { margin-bottom: .5rem; }
      p { color: #475569; }
      ul { line-height: 1.9; }
      code { background: #f1f5f9; padding: .1rem .35rem; border-radius: .25rem; }
    </style>
  </head>
  <body>
    <h1>BS-Commerce API Documentation</h1>
    <p>Use the links below to explore both API surfaces.</p>
    <ul>
      <li><a href="/api/docs">Payload API docs (Swagger UI)</a> \u2014 <code>/api/openapi.json</code></li>
      <li><a href="/api/docs-custom">Custom endpoints docs (Swagger UI)</a> \u2014 <code>/api/openapi-custom.json</code></li>
    </ul>
  </body>
</html>`;
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
        });
      }
    };
  }
});

// packages/backend/src/endpoints/openapi-all.ts
import fs from "node:fs";
import path3 from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
function getBaseUrl(req) {
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}
function readLegacyOpenApi() {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const backendRoot = path3.resolve(path3.dirname(currentFile), "..", "..");
    const legacyPath = path3.resolve(backendRoot, "..", "..", "..", "docs", "openapi.yaml");
    if (!fs.existsSync(legacyPath)) return null;
    const raw2 = fs.readFileSync(legacyPath, "utf8");
    const parsed = YAML.parse(raw2);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function normalizeLegacyPaths(paths) {
  const normalized = {};
  for (const [rawPath, operations] of Object.entries(paths)) {
    const normalizedPath = rawPath.startsWith("/api/") ? rawPath : `/api${rawPath}`;
    normalized[normalizedPath] = operations;
  }
  return normalized;
}
function mergePathOperations(customPaths, legacyPaths, generatedPaths) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(customPaths), ...Object.keys(legacyPaths), ...Object.keys(generatedPaths)]);
  const merged = {};
  for (const pathKey of keys) {
    merged[pathKey] = {
      ...customPaths[pathKey] || {},
      ...legacyPaths[pathKey] || {},
      ...generatedPaths[pathKey] || {}
    };
  }
  return merged;
}
function normalizeSecurity(doc, paths) {
  const components = doc.components ||= {};
  const schemes = components.securitySchemes ||= {};
  if (!schemes.bearerAuth) {
    schemes.bearerAuth = { type: "http", scheme: "bearer", bearerFormat: "JWT" };
  }
  if (!schemes.jwt) {
    schemes.jwt = schemes.bearerAuth;
  }
  const normalizedKeys = new Set(Object.keys(schemes));
  const operationKeys = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];
  for (const operations of Object.values(paths)) {
    if (!operations || typeof operations !== "object") continue;
    for (const method of operationKeys) {
      const op = operations[method];
      if (!op || typeof op !== "object") continue;
      const security = op.security;
      if (!Array.isArray(security)) continue;
      op.security = security.map((reqObj) => {
        if (!reqObj || typeof reqObj !== "object") return reqObj;
        const entries = Object.entries(reqObj);
        if (entries.length !== 1) return reqObj;
        const [key, scopes] = entries[0];
        if (!normalizedKeys.has(key)) return { bearerAuth: Array.isArray(scopes) ? scopes : [] };
        if (key === "ApiKey" || key === "jwt") return { bearerAuth: Array.isArray(scopes) ? scopes : [] };
        return { [key]: Array.isArray(scopes) ? scopes : [] };
      });
    }
  }
  return paths;
}
var openapiAllEndpoint;
var init_openapi_all = __esm({
  "packages/backend/src/endpoints/openapi-all.ts"() {
    "use strict";
    init_custom_endpoints_openapi();
    openapiAllEndpoint = {
      path: "/openapi-all.json",
      method: "get",
      handler: async (req) => {
        const baseUrl = getBaseUrl(req);
        const generatedUrl = `${baseUrl}/api/openapi.json`;
        try {
          const generated = await fetch(generatedUrl, {
            headers: { accept: "application/json" },
            cache: "no-store"
          }).then((r) => r.json());
          const legacy = readLegacyOpenApi();
          const generatedPaths = generated.paths || {};
          const legacyRawPaths = legacy?.paths || {};
          const legacyPaths = normalizeLegacyPaths(legacyRawPaths);
          const customPaths = customEndpointsOpenApi.paths;
          const merged = {
            ...generated,
            info: {
              ...generated.info || {},
              title: generated.info?.title || "BS-Commerce Backend API"
            },
            // Priority: generated (most accurate runtime shape) > legacy yaml > custom supplemental.
            paths: mergePathOperations(customPaths, legacyPaths, generatedPaths),
            components: {
              ...legacy?.components || {},
              ...generated.components || {}
            }
          };
          merged.paths = normalizeSecurity(merged, merged.paths);
          return Response.json(merged, {
            status: 200,
            headers: { "cache-control": "no-store" }
          });
        } catch {
          return Response.json(customEndpointsOpenApi, {
            status: 200,
            headers: { "cache-control": "no-store" }
          });
        }
      }
    };
  }
});

// packages/backend/src/endpoints/storefront-store-products.ts
var storefrontStoreProductsEndpoint;
var init_storefront_store_products = __esm({
  "packages/backend/src/endpoints/storefront-store-products.ts"() {
    "use strict";
    init_specifications_query();
    storefrontStoreProductsEndpoint = {
      path: "/storefront/store-products",
      method: "get",
      handler: async (req) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const qs = url.searchParams;
        const storeId = qs.get("store") ?? void 0;
        const page = Math.max(1, Number(qs.get("page") ?? "1"));
        const limit = Math.min(100, Math.max(1, Number(qs.get("limit") ?? "12")));
        const sort = qs.get("sort") ?? "-createdAt";
        const locale = qs.get("locale") ?? void 0;
        const depth = Math.min(3, Math.max(0, Number(qs.get("depth") ?? "1")));
        const category = qs.get("category") ?? void 0;
        const search = qs.get("search") ?? void 0;
        const brand = qs.get("brand") ?? void 0;
        const featured = qs.get("featured") ?? void 0;
        const tenant = qs.get("tenant") ?? void 0;
        const productType = qs.get("productType") ?? void 0;
        const minPrice = qs.get("minPrice") ?? void 0;
        const maxPrice = qs.get("maxPrice") ?? void 0;
        const productClass = qs.get("class") ?? qs.get("productClass") ?? void 0;
        const { specs } = parseSpecsFromSearchParams(qs);
        try {
          let productIdFilter;
          if (storeId) {
            const { docs: stockRows } = await req.payload.find({
              collection: "stock-levels",
              where: {
                location: { equals: storeId }
              },
              limit: 1e4,
              depth: 0,
              overrideAccess: true
            });
            const availableIds = /* @__PURE__ */ new Set();
            for (const row of stockRows) {
              const qty = Number(row.quantity) || 0;
              const reserved = Number(row.reservedQuantity) || 0;
              if (qty - reserved > 0) {
                const productRef = row.product;
                const pid = typeof productRef === "object" && productRef !== null ? productRef.id : String(productRef);
                if (pid) availableIds.add(pid);
              }
            }
            productIdFilter = Array.from(availableIds);
            if (productIdFilter.length === 0) {
              return Response.json({
                docs: [],
                totalDocs: 0,
                totalPages: 0,
                page,
                limit,
                hasNextPage: false,
                hasPrevPage: false
              });
            }
          }
          const andClauses = [
            { status: { equals: "published" } }
          ];
          if (productIdFilter) {
            andClauses.push({ id: { in: productIdFilter } });
          }
          if (category) {
            andClauses.push({ categories: { in: [category] } });
          }
          if (brand) {
            andClauses.push({ brand: { equals: brand } });
          }
          if (search) {
            andClauses.push({ name: { like: search } });
          }
          if (featured === "true") {
            andClauses.push({ featured: { equals: true } });
          }
          if (tenant) {
            andClauses.push({ tenant: { equals: tenant } });
          }
          if (productType) {
            andClauses.push({ productType: { equals: productType } });
          }
          if (minPrice) {
            andClauses.push({ basePrice: { greater_than_equal: Number(minPrice) } });
          }
          if (maxPrice) {
            andClauses.push({ basePrice: { less_than_equal: Number(maxPrice) } });
          }
          if (productClass || Object.keys(specs).length > 0) {
            const specProductIds = await getMatchingProductIdsForSpecs(
              req.payload,
              specs,
              productClass
            );
            if (specProductIds !== void 0) {
              if (specProductIds.length === 0) {
                return Response.json({
                  docs: [],
                  totalDocs: 0,
                  totalPages: 0,
                  page,
                  limit,
                  hasNextPage: false,
                  hasPrevPage: false
                });
              }
              andClauses.push({ id: { in: specProductIds } });
            }
          }
          const where = andClauses.length === 1 ? andClauses[0] : { and: andClauses };
          const result = await req.payload.find({
            collection: "products",
            where,
            page,
            limit,
            sort,
            locale,
            depth,
            overrideAccess: true
          });
          return Response.json(result);
        } catch (err) {
          console.error("[storefront/store-products]", err);
          return Response.json({ error: "Failed to fetch products" }, { status: 500 });
        }
      }
    };
  }
});

// packages/backend/src/endpoints/storefront-variant-availability.ts
var storefrontVariantAvailabilityEndpoint;
var init_storefront_variant_availability = __esm({
  "packages/backend/src/endpoints/storefront-variant-availability.ts"() {
    "use strict";
    init_allocate_stock_level();
    init_inventory_policy();
    storefrontVariantAvailabilityEndpoint = {
      path: "/storefront/variant-availability",
      method: "get",
      handler: async (req) => {
        if (!isStorefrontVariantAvailabilityEndpointEnabled()) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        const url = new URL(req.url ?? "", "http://localhost");
        const productId = url.searchParams.get("product")?.trim();
        const storeId = url.searchParams.get("store")?.trim() || void 0;
        if (!productId) {
          return Response.json({ error: "product query parameter is required" }, { status: 400 });
        }
        try {
          const product = await req.payload.findByID({
            collection: "products",
            id: productId,
            depth: 0,
            overrideAccess: true
          });
          if (!product || product.status !== "published") {
            return Response.json({ error: "Product not found" }, { status: 404 });
          }
          const multivendor = process.env.MULTIVENDOR_ENABLED === "true";
          const tenantRaw = product.tenant;
          let tenantId = null;
          if (multivendor && tenantRaw != null) {
            tenantId = typeof tenantRaw === "object" ? tenantRaw?.id ?? null : String(tenantRaw);
          }
          const { docs: variantDocs } = await req.payload.find({
            collection: "product-variants",
            where: {
              and: [{ product: { equals: productId } }, { isActive: { equals: true } }]
            },
            limit: 200,
            depth: 0,
            overrideAccess: true
          });
          if (!isInventoryEnabled()) {
            return Response.json({
              inventoryEnabled: false,
              productId,
              storeLocationId: storeId ?? null,
              lines: variantDocs.map((v) => ({
                variantId: String(v.id),
                purchasable: true
              }))
            });
          }
          const lines2 = [];
          for (const v of variantDocs) {
            const vid = String(v.id);
            const r = await allocateStockLevelForLine(
              req.payload,
              {
                productId,
                variantId: vid,
                quantity: 1,
                tenantId,
                storeLocationId: storeId ?? null
              },
              req
            );
            lines2.push({ variantId: vid, purchasable: !("error" in r) });
          }
          if (variantDocs.length === 0) {
            const r = await allocateStockLevelForLine(
              req.payload,
              {
                productId,
                variantId: null,
                quantity: 1,
                tenantId,
                storeLocationId: storeId ?? null
              },
              req
            );
            lines2.push({ variantId: null, purchasable: !("error" in r) });
          }
          return Response.json({
            inventoryEnabled: true,
            productId,
            storeLocationId: storeId ?? null,
            lines: lines2
          });
        } catch (err) {
          console.error("[storefront/variant-availability]", err);
          return Response.json({ error: "Failed to resolve availability" }, { status: 500 });
        }
      }
    };
  }
});

// packages/backend/src/endpoints/storefront-geography.ts
function relationId6(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null && "id" in value) {
    return String(value.id);
  }
  return null;
}
async function getActivePublicStoreIds(req) {
  const { docs } = await req.payload.find({
    collection: "stock-locations",
    where: {
      and: [{ isPublicStore: { equals: true } }, { isActive: { equals: true } }]
    },
    limit: 500,
    depth: 0,
    overrideAccess: true
  });
  return docs.map((d) => String(d.id));
}
async function getSubdivisionIdsServedByPublicStores(req) {
  const stockIds = await getActivePublicStoreIds(req);
  if (stockIds.length === 0) return /* @__PURE__ */ new Set();
  const { docs: areas } = await req.payload.find({
    collection: "stock-location-service-areas",
    where: { stockLocation: { in: stockIds } },
    limit: 1e4,
    depth: 0,
    overrideAccess: true
  });
  const out = /* @__PURE__ */ new Set();
  for (const row of areas) {
    const sid = relationId6(row.subdivision);
    if (sid) out.add(sid);
  }
  return out;
}
async function getServedLocalitiesInSubdivision(req, subdivisionId, stockIds) {
  if (stockIds.length === 0) return { kind: "ids", ids: /* @__PURE__ */ new Set() };
  const { docs: areas } = await req.payload.find({
    collection: "stock-location-service-areas",
    where: {
      and: [{ stockLocation: { in: stockIds } }, { subdivision: { equals: subdivisionId } }]
    },
    limit: 1e4,
    depth: 0,
    overrideAccess: true
  });
  let wholeSubdivision = false;
  const ids = /* @__PURE__ */ new Set();
  for (const row of areas) {
    const lid = relationId6(row.locality);
    if (lid == null || lid === "") wholeSubdivision = true;
    else ids.add(lid);
  }
  if (wholeSubdivision) return { kind: "all" };
  return { kind: "ids", ids };
}
function parseOnlyServedFlag(url) {
  const v = url.searchParams.get("onlyWithPublicStoreCoverage") ?? url.searchParams.get("onlyServed");
  return v === "true" || v === "1";
}
function isGeographyFeatureEnabled() {
  return process.env.GEOGRAPHY_ENABLED === "true";
}
function policyFromSubdivision(d) {
  if (!d) {
    return {
      tier: "standard",
      extendedFeeNote: null,
      extendedLeadTimeNote: null,
      unservedCustomerMessage: null
    };
  }
  return {
    tier: d.defaultServiceTier || "standard",
    extendedFeeNote: d.extendedFeeNote || null,
    extendedLeadTimeNote: d.extendedLeadTimeNote || null,
    unservedCustomerMessage: d.unservedCustomerMessage || null
  };
}
function policyFromLocality(u) {
  if (!u) {
    return {
      tier: "standard",
      extendedFeeNote: null,
      extendedLeadTimeNote: null,
      unservedCustomerMessage: null
    };
  }
  return {
    tier: u.serviceTier || "standard",
    extendedFeeNote: u.extendedFeeNote || null,
    extendedLeadTimeNote: u.extendedLeadTimeNote || null,
    unservedCustomerMessage: u.unservedCustomerMessage || null
  };
}
function normalizeResource(raw2) {
  const r = raw2 ?? "delivery-context";
  if (r === "districts") return "subdivisions";
  if (r === "upazilas") return "localities";
  return r;
}
var storefrontGeographyEndpoint;
var init_storefront_geography = __esm({
  "packages/backend/src/endpoints/storefront-geography.ts"() {
    "use strict";
    storefrontGeographyEndpoint = {
      path: "/storefront/geography",
      method: "get",
      handler: async (req) => {
        if (!isGeographyFeatureEnabled()) {
          return Response.json({ error: "Geography feature is not enabled" }, { status: 404 });
        }
        const url = new URL(req.url ?? "", "http://localhost");
        const resource = normalizeResource(url.searchParams.get("resource"));
        const subdivisionIdParam = url.searchParams.get("subdivisionId")?.trim() || url.searchParams.get("districtId")?.trim() || void 0;
        const localityIdParam = url.searchParams.get("localityId")?.trim() || url.searchParams.get("upazilaId")?.trim() || void 0;
        try {
          if (resource === "countries") {
            const { docs } = await req.payload.find({
              collection: "geo-countries",
              where: { isActive: { equals: true } },
              sort: "name",
              limit: 200,
              depth: 0,
              overrideAccess: true
            });
            return Response.json({
              docs: docs.map((d) => ({
                id: d.id,
                name: d.name,
                isoCode: d.isoCode
              }))
            });
          }
          if (resource === "subdivisions") {
            const countryId = url.searchParams.get("countryId");
            if (!countryId?.trim()) {
              return Response.json({ error: "countryId is required" }, { status: 400 });
            }
            const onlyServed = parseOnlyServedFlag(url);
            let { docs } = await req.payload.find({
              collection: "geo-subdivisions",
              where: {
                and: [{ country: { equals: countryId.trim() } }, { isActive: { equals: true } }]
              },
              sort: "name",
              limit: 1e3,
              depth: 0,
              overrideAccess: true
            });
            if (onlyServed) {
              const served = await getSubdivisionIdsServedByPublicStores(req);
              docs = docs.filter((d) => served.has(String(d.id)));
            }
            return Response.json({
              docs: docs.map((d) => {
                const row = d;
                const geocodeMatchAliases = (row.geocodeMatchAliases ?? []).map((x) => typeof x?.alias === "string" ? x.alias.trim() : "").filter((s) => s.length > 0);
                return {
                  id: d.id,
                  name: row.name,
                  code: row.code ?? null,
                  defaultServiceTier: row.defaultServiceTier,
                  geocodeMatchAliases: geocodeMatchAliases.length > 0 ? geocodeMatchAliases : void 0
                };
              })
            });
          }
          if (resource === "localities") {
            const subId = url.searchParams.get("subdivisionId")?.trim() || url.searchParams.get("districtId")?.trim() || "";
            if (!subId) {
              return Response.json({ error: "subdivisionId is required" }, { status: 400 });
            }
            const onlyServed = parseOnlyServedFlag(url);
            let { docs } = await req.payload.find({
              collection: "geo-localities",
              where: {
                and: [{ subdivision: { equals: subId } }, { isActive: { equals: true } }]
              },
              sort: "name",
              limit: 5e3,
              depth: 0,
              overrideAccess: true
            });
            if (onlyServed) {
              const stockIds = await getActivePublicStoreIds(req);
              const served = await getServedLocalitiesInSubdivision(req, subId, stockIds);
              if (served.kind === "ids") {
                docs = docs.filter((d) => served.ids.has(String(d.id)));
              }
            }
            return Response.json({
              docs: docs.map((d) => {
                const row = d;
                const geocodeMatchAliases = (row.geocodeMatchAliases ?? []).map((x) => typeof x?.alias === "string" ? x.alias.trim() : "").filter((s) => s.length > 0);
                return {
                  id: d.id,
                  name: row.name,
                  code: row.code ?? null,
                  serviceTier: row.serviceTier,
                  geocodeMatchAliases: geocodeMatchAliases.length > 0 ? geocodeMatchAliases : void 0
                };
              })
            });
          }
          if (resource === "delivery-context") {
            if (!subdivisionIdParam) {
              return Response.json({ error: "subdivisionId is required" }, { status: 400 });
            }
            const subdivisionDoc = await req.payload.findByID({
              collection: "geo-subdivisions",
              id: subdivisionIdParam,
              depth: 0,
              overrideAccess: true
            });
            let localityDoc = null;
            if (localityIdParam) {
              localityDoc = await req.payload.findByID({
                collection: "geo-localities",
                id: localityIdParam,
                depth: 0,
                overrideAccess: true
              });
              if (localityDoc?.subdivision) {
                const sid = typeof localityDoc.subdivision === "object" && localityDoc.subdivision !== null ? localityDoc.subdivision.id : String(localityDoc.subdivision);
                if (sid !== subdivisionIdParam) {
                  return Response.json(
                    { error: "localityId does not belong to the given subdivisionId" },
                    { status: 400 }
                  );
                }
              }
            }
            const policy = localityDoc ? policyFromLocality(localityDoc) : policyFromSubdivision(subdivisionDoc);
            const serviceWhere = {
              and: [{ subdivision: { equals: subdivisionIdParam } }]
            };
            if (localityIdParam) {
              serviceWhere.and.push({
                or: [{ locality: { equals: localityIdParam } }, { locality: { exists: false } }]
              });
            }
            const { docs: areaRows } = await req.payload.find({
              collection: "stock-location-service-areas",
              where: serviceWhere,
              limit: 1e4,
              depth: 0,
              overrideAccess: true
            });
            const stockIds = /* @__PURE__ */ new Set();
            for (const row of areaRows) {
              const ref = row.stockLocation;
              const sid = typeof ref === "object" && ref !== null && "id" in ref ? String(ref.id) : ref != null ? String(ref) : null;
              if (sid) stockIds.add(sid);
            }
            let stores = [];
            if (stockIds.size > 0) {
              const { docs: locs } = await req.payload.find({
                collection: "stock-locations",
                where: {
                  and: [
                    { id: { in: Array.from(stockIds) } },
                    { isPublicStore: { equals: true } },
                    { isActive: { equals: true } }
                  ]
                },
                limit: 500,
                depth: 0,
                overrideAccess: true
              });
              stores = locs;
              stores.sort((a, b) => {
                const pa = Number(a.sortPriority) || 0;
                const pb = Number(b.sortPriority) || 0;
                if (pa !== pb) return pa - pb;
                const na = String(a.name ?? "");
                const nb = String(b.name ?? "");
                return na.localeCompare(nb);
              });
            }
            let emptyReason = "none";
            if (policy.tier === "unserved") {
              emptyReason = "unserved_area";
            } else if (stores.length === 0) {
              emptyReason = "no_public_stores_for_area";
            }
            return Response.json({
              policy: {
                tier: policy.tier,
                extendedFeeNote: policy.extendedFeeNote,
                extendedLeadTimeNote: policy.extendedLeadTimeNote,
                unservedCustomerMessage: policy.unservedCustomerMessage
              },
              subdivision: subdivisionDoc ? {
                id: subdivisionDoc.id,
                name: subdivisionDoc.name
              } : null,
              locality: localityDoc ? {
                id: localityDoc.id,
                name: localityDoc.name
              } : null,
              stores: stores.map((s) => ({
                id: s.id,
                name: s.name,
                slug: s.slug ?? null,
                code: s.code,
                sortPriority: s.sortPriority ?? 0,
                tenant: s.tenant ?? null,
                address: s.address ?? null
              })),
              emptyReason
            });
          }
          return Response.json({ error: "Unknown resource" }, { status: 400 });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Request failed";
          return Response.json({ error: msg }, { status: 500 });
        }
      }
    };
  }
});

// packages/backend/src/endpoints/customer-analytics.ts
async function customerAnalyticsHandler(req) {
  const user = req.user;
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = req.payload;
  try {
    const ordersResult = await payload.find({
      collection: "orders",
      where: {
        customer: { equals: user.id }
      },
      limit: 100,
      depth: 2,
      overrideAccess: true,
      sort: "-placedAt"
    });
    const orders = ordersResult.docs;
    const totalOrders = orders.length;
    let totalSpent = 0;
    let currency = "USD";
    const categoryCountMap = /* @__PURE__ */ new Map();
    const brandCountMap = /* @__PURE__ */ new Map();
    const devicesList = [];
    for (const order of orders) {
      totalSpent += Number(order.grandTotal ?? 0);
      if (order.currency) currency = order.currency;
      if (order.deviceTracking && typeof order.deviceTracking === "object") {
        const dt = order.deviceTracking;
        if (devicesList.length < 5) {
          devicesList.push({
            orderNumber: typeof order.orderNumber === "string" ? order.orderNumber : void 0,
            deviceType: typeof dt.deviceType === "string" ? dt.deviceType : void 0,
            browser: typeof dt.browser === "string" ? dt.browser : void 0,
            os: typeof dt.os === "string" ? dt.os : void 0,
            ipAddress: typeof dt.ipAddress === "string" ? dt.ipAddress : void 0,
            placedAt: typeof order.placedAt === "string" ? order.placedAt : void 0
          });
        }
      }
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (typeof item === "object" && item !== null) {
            const product = item.product;
            if (typeof product === "object" && product !== null) {
              const p = product;
              if (Array.isArray(p.categories)) {
                for (const cat of p.categories) {
                  const catId = typeof cat === "object" && cat !== null ? String(cat.id) : String(cat);
                  categoryCountMap.set(catId, (categoryCountMap.get(catId) ?? 0) + 1);
                }
              }
              if (Array.isArray(p.attributes)) {
                for (const attr of p.attributes) {
                  const attrObj = typeof attr === "object" && attr !== null ? attr : null;
                  if (attrObj && attrObj.type === "brand") {
                    const brandId = String(attrObj.id ?? attrObj.slug);
                    brandCountMap.set(brandId, (brandCountMap.get(brandId) ?? 0) + 1);
                  }
                }
              }
            }
          }
        }
      }
    }
    const lastOrder = orders[0] ? {
      id: orders[0].id,
      orderNumber: orders[0].orderNumber,
      placedAt: orders[0].placedAt,
      status: orders[0].status,
      grandTotal: orders[0].grandTotal
    } : null;
    return Response.json({
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      currency,
      lastOrder,
      topCategoryIds: Array.from(categoryCountMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id),
      topBrandIds: Array.from(brandCountMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id),
      recentDevices: devicesList
    });
  } catch (err) {
    console.error("[customer/analytics]", err);
    return Response.json({ error: "Failed to compute customer analytics" }, { status: 500 });
  }
}
async function customerRecommendationsHandler(req) {
  const payload = req.payload;
  const user = req.user;
  const url = new URL(req.url ?? "", "http://localhost");
  const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit") || 8)));
  const locale = url.searchParams.get("locale") || "en";
  try {
    let preferredCategoryIds = [];
    let preferredBrandIds = [];
    if (user?.id) {
      const pastOrders = await payload.find({
        collection: "orders",
        where: { customer: { equals: user.id } },
        limit: 10,
        depth: 2,
        overrideAccess: true
      });
      for (const order of pastOrders.docs) {
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            if (typeof item === "object" && item !== null) {
              const product = item.product;
              if (typeof product === "object" && product !== null) {
                const p = product;
                if (Array.isArray(p.categories)) {
                  for (const cat of p.categories) {
                    const cId = typeof cat === "object" && cat !== null ? String(cat.id) : String(cat);
                    if (!preferredCategoryIds.includes(cId)) preferredCategoryIds.push(cId);
                  }
                }
                if (Array.isArray(p.attributes)) {
                  for (const attr of p.attributes) {
                    const attrObj = typeof attr === "object" && attr !== null ? attr : null;
                    if (attrObj && attrObj.type === "brand") {
                      const bId = String(attrObj.id ?? attrObj.slug);
                      if (!preferredBrandIds.includes(bId)) preferredBrandIds.push(bId);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    let recommendedProducts = [];
    if (preferredCategoryIds.length > 0 || preferredBrandIds.length > 0) {
      const conditions = [];
      if (preferredCategoryIds.length > 0) {
        conditions.push({ categories: { in: preferredCategoryIds } });
      }
      if (preferredBrandIds.length > 0) {
        conditions.push({ attributes: { in: preferredBrandIds } });
      }
      const res = await payload.find({
        collection: "products",
        where: {
          and: [
            { status: { equals: "published" } },
            conditions.length === 1 ? conditions[0] : { or: conditions }
          ]
        },
        limit,
        depth: 2,
        locale,
        overrideAccess: true,
        sort: "-rating"
      });
      recommendedProducts = res.docs;
    }
    if (recommendedProducts.length < limit) {
      const remainingLimit = limit - recommendedProducts.length;
      const excludeIds = recommendedProducts.map((p) => p.id);
      const fallbackRes = await payload.find({
        collection: "products",
        where: {
          and: [
            { status: { equals: "published" } },
            ...excludeIds.length > 0 ? [{ id: { not_in: excludeIds } }] : []
          ]
        },
        limit: remainingLimit,
        depth: 2,
        locale,
        overrideAccess: true,
        sort: "-featured"
      });
      recommendedProducts = [...recommendedProducts, ...fallbackRes.docs];
    }
    return Response.json({
      docs: recommendedProducts,
      totalDocs: recommendedProducts.length
    });
  } catch (err) {
    console.error("[customer/recommendations]", err);
    return Response.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
var customerAnalyticsEndpoint, customerRecommendationsEndpoint;
var init_customer_analytics = __esm({
  "packages/backend/src/endpoints/customer-analytics.ts"() {
    "use strict";
    customerAnalyticsEndpoint = {
      path: "/customer/analytics",
      method: "get",
      handler: (req) => customerAnalyticsHandler(req)
    };
    customerRecommendationsEndpoint = {
      path: "/customer/recommendations",
      method: "get",
      handler: (req) => customerRecommendationsHandler(req)
    };
  }
});

// packages/backend/src/lib/seed-electronics-data.ts
import fs2 from "node:fs";
import path4 from "node:path";
function makeLexicalDoc(paragraphs) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        children: [
          {
            mode: "normal",
            text,
            type: "text",
            style: "",
            detail: 0,
            format: 0,
            version: 1
          }
        ]
      }))
    }
  };
}
async function ensureBrandCatalogSchema(payload) {
  try {
    const db = payload.db?.drizzle || payload.db;
    if (db && typeof db.execute === "function") {
      const { sql: sql11 } = await import("@payloadcms/db-postgres");
      await db.execute(sql11`
        CREATE TABLE IF NOT EXISTS "brands" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "slug" character varying,
          "logo_id" uuid,
          "banner_image_id" uuid,
          "website" character varying,
          "featured" boolean DEFAULT false,
          "display_order" numeric DEFAULT 0,
          "meta_image_id" uuid,
          "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
          "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "brands" ADD CONSTRAINT "brands_banner_image_id_media_id_fk" FOREIGN KEY ("banner_image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "brands" ADD CONSTRAINT "brands_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "brands_slug_idx" ON "brands" USING btree ("slug");
        CREATE INDEX IF NOT EXISTS "brands_logo_idx" ON "brands" USING btree ("logo_id");
        CREATE INDEX IF NOT EXISTS "brands_banner_image_idx" ON "brands" USING btree ("banner_image_id");
        CREATE INDEX IF NOT EXISTS "brands_created_at_idx" ON "brands" USING btree ("created_at");
        CREATE INDEX IF NOT EXISTS "brands_updated_at_idx" ON "brands" USING btree ("updated_at");

        CREATE TABLE IF NOT EXISTS "brands_locales" (
          "name" character varying NOT NULL,
          "description" character varying,
          "meta_title" character varying,
          "meta_description" character varying,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" uuid NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "brands_locales" ADD CONSTRAINT "brands_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "brands"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "brands_locales_locale_parent_id_unique" ON "brands_locales" USING btree ("_locale", "_parent_id");

        ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand_id" uuid;

        DO $$ BEGIN
          ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products" USING btree ("brand_id");
      `);
      payload.logger.info("[Electronics Seeder] Verified Brands & Attributes schema readiness.");
    }
  } catch (err) {
    payload.logger.warn(`[Electronics Seeder] Notice verifying database schema: ${err?.message || err}`);
  }
}
async function ensureClassesCatalogSchema(payload) {
  try {
    const db = payload.db?.drizzle || payload.db;
    if (db && typeof db.execute === "function") {
      const { sql: sql11 } = await import("@payloadcms/db-postgres");
      await db.execute(sql11`
        CREATE TABLE IF NOT EXISTS "classes" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "slug" character varying,
          "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
          "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
        );

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_slug_idx" ON "classes" USING btree ("slug");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_created_at_idx" ON "classes" USING btree ("created_at");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_updated_at_idx" ON "classes" USING btree ("updated_at");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_locales" (
          "name" character varying NOT NULL,
          "description" character varying,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" uuid NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "classes_locales" ADD CONSTRAINT "classes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_locales_locale_parent_id_unique" ON "classes_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;



        ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_product_class_id_product_classes_id_fk";
        ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_class_id" uuid;

        DO $$ BEGIN
          ALTER TABLE "products" ADD CONSTRAINT "products_product_class_id_classes_id_fk" FOREIGN KEY ("product_class_id") REFERENCES "classes"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_product_class_idx" ON "products" USING btree ("product_class_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        -- Ensure Attributes columns
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "data_type" character varying DEFAULT 'select';
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "category" character varying DEFAULT 'specification';
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "unit" character varying;
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "default_group" character varying;
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "is_filterable" boolean DEFAULT true;
        ALTER TABLE "attributes" ADD COLUMN IF NOT EXISTS "is_comparable" boolean DEFAULT true;

        -- Ensure Attributes Options tables
        CREATE TABLE IF NOT EXISTS "attributes_options" (
          "_order" integer NOT NULL,
          "_parent_id" uuid NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "value" character varying NOT NULL,
          "hex_color" character varying
        );

        DO $$ BEGIN
          ALTER TABLE "attributes_options" ADD CONSTRAINT "attributes_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "attributes_options_order_idx" ON "attributes_options" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "attributes_options_parent_id_idx" ON "attributes_options" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "attributes_options_locales" (
          "label" character varying NOT NULL,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" character varying NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "attributes_options_locales" ADD CONSTRAINT "attributes_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes_options"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "attributes_options_locales_locale_parent_id_unique" ON "attributes_options_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        -- Ensure Classes columns & groups
        ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "icon" character varying;

        CREATE TABLE IF NOT EXISTS "classes_groups" (
          "_order" integer NOT NULL,
          "_parent_id" uuid NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "display_order" numeric DEFAULT 0
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups" ADD CONSTRAINT "classes_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_order_idx" ON "classes_groups" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_parent_id_idx" ON "classes_groups" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_groups_locales" (
          "name" character varying NOT NULL,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" character varying NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups_locales" ADD CONSTRAINT "classes_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes_groups"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_groups_locales_locale_parent_id_unique" ON "classes_groups_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_groups_attributes" (
          "_order" integer NOT NULL,
          "_parent_id" character varying NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "attribute_id" uuid NOT NULL,
          "is_required" boolean DEFAULT false,
          "display_order" numeric DEFAULT 0
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups_attributes" ADD CONSTRAINT "classes_groups_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes_groups"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "classes_groups_attributes" ADD CONSTRAINT "classes_groups_attributes_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_attributes_order_idx" ON "classes_groups_attributes" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_attributes_parent_id_idx" ON "classes_groups_attributes" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "classes_groups_attributes_attribute_id_idx" ON "classes_groups_attributes" USING btree ("attribute_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "classes_groups_attributes_locales" (
          "help_text" character varying,
          "id" serial PRIMARY KEY NOT NULL,
          "_locale" "_locales" NOT NULL,
          "_parent_id" character varying NOT NULL
        );

        DO $$ BEGIN
          ALTER TABLE "classes_groups_attributes_locales" ADD CONSTRAINT "classes_groups_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "classes_groups_attributes"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE UNIQUE INDEX "classes_groups_attributes_locales_locale_parent_id_unique" ON "classes_groups_attributes_locales" USING btree ("_locale", "_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        -- Ensure Products Specifications table & unified columns
        CREATE TABLE IF NOT EXISTS "products_specifications" (
          "_order" integer NOT NULL,
          "_parent_id" uuid NOT NULL,
          "id" character varying PRIMARY KEY NOT NULL,
          "key" character varying NOT NULL,
          "value" character varying NOT NULL,
          "label" character varying,
          "unit" character varying
        );

        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "label" character varying;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "unit" character varying;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "attribute_id" uuid;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "values" jsonb;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "group" character varying;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "is_custom" boolean DEFAULT false;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "is_ad_hoc" boolean DEFAULT false;
        ALTER TABLE "products_specifications" ADD COLUMN IF NOT EXISTS "display_order" numeric DEFAULT 0;

        DO $$ BEGIN
          ALTER TABLE "products_specifications" ADD CONSTRAINT "products_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          ALTER TABLE "products_specifications" ADD CONSTRAINT "products_specifications_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_order_idx" ON "products_specifications" USING btree ("_order");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_parent_id_idx" ON "products_specifications" USING btree ("_parent_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_key_idx" ON "products_specifications" USING btree ("key");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_attribute_id_idx" ON "products_specifications" USING btree ("attribute_id");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE INDEX "products_specifications_group_idx" ON "products_specifications" USING btree ("group");
        EXCEPTION
          WHEN duplicate_table OR duplicate_object THEN null;
        END $$;

        ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "classes_id" uuid;
        DO $$ BEGIN
          ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_classes_fk" FOREIGN KEY ("classes_id") REFERENCES "classes"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_classes_id_idx" ON "payload_locked_documents_rels" USING btree ("classes_id");

        ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "attributes_id" uuid;
        DO $$ BEGIN
          ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "attributes"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
      `);
      payload.logger.info("[Electronics Seeder] Verified Classes & Specifications schema readiness.");
    }
  } catch (err) {
    payload.logger.warn(`[Electronics Seeder] Notice verifying Classes schema: ${err?.message || err}`);
  }
}
async function wipeDatabaseForElectronics(payload, keepAdminEmail = "frontend-seed-sv@bscommerce.local") {
  payload.logger.info("[Electronics Seeder] Starting clean wipe of existing data...");
  const collectionsToClear = [
    "addresses",
    "order-items",
    "orders",
    "carts",
    "wishlist-items",
    "product-reviews",
    "vendor-reviews",
    "stock-levels",
    "product-variants",
    "products",
    "classes",
    "brands",
    "attributes",
    "categories",
    "coupons",
    "shipping-methods",
    "shipping-zones",
    "stock-locations",
    "pages"
  ];
  for (const slug of collectionsToClear) {
    try {
      if (payload.collections[slug]) {
        await payload.delete({
          collection: slug,
          where: {},
          overrideAccess: true
        });
        payload.logger.info(`[Electronics Seeder] Cleared collection: ${slug}`);
      }
    } catch (e) {
      payload.logger.warn(`[Electronics Seeder] Notice while clearing ${slug}: ${e?.message || e}`);
    }
  }
  let nonAdminDeleted = 0;
  try {
    const usersRes = await payload.find({
      collection: "users",
      limit: 500,
      overrideAccess: true,
      depth: 0
    });
    for (const u of usersRes.docs) {
      const email = String(u.email || "").toLowerCase().trim();
      if (email !== keepAdminEmail.toLowerCase().trim() && u.role !== "admin") {
        try {
          await payload.delete({
            collection: "users",
            id: u.id,
            overrideAccess: true
          });
          nonAdminDeleted++;
        } catch {
        }
      }
    }
    payload.logger.info(`[Electronics Seeder] Preserved admin (${keepAdminEmail}). Removed ${nonAdminDeleted} previous users.`);
  } catch (e) {
    payload.logger.warn(`[Electronics Seeder] User cleanup note: ${e?.message || e}`);
  }
  return { collections: collectionsToClear, nonAdminUsersDeleted: nonAdminDeleted };
}
async function seedElectronicsStore(payload, options = {}) {
  const adminEmail = options.adminEmail || "frontend-seed-sv@bscommerce.local";
  let wipedInfo;
  await ensureBrandCatalogSchema(payload);
  await ensureClassesCatalogSchema(payload);
  if (options.wipeFirst !== false) {
    wipedInfo = await wipeDatabaseForElectronics(payload, adminEmail);
  }
  let adminUserDoc = null;
  try {
    const existingAdmin = await payload.find({
      collection: "users",
      where: { email: { equals: adminEmail } },
      limit: 1,
      overrideAccess: true
    });
    if (existingAdmin.totalDocs === 0) {
      adminUserDoc = await payload.create({
        collection: "users",
        data: {
          email: adminEmail,
          password: "FrontendSeed2026!",
          username: adminEmail,
          role: "admin",
          status: "active",
          emailVerified: true,
          firstName: "System",
          lastName: "Admin",
          displayName: "Electronics Store Admin"
        },
        overrideAccess: true
      });
      payload.logger.info(`[Electronics Seeder] Created primary admin account: ${adminEmail}`);
    } else {
      adminUserDoc = await payload.update({
        collection: "users",
        id: existingAdmin.docs[0].id,
        data: {
          password: "FrontendSeed2026!",
          role: "admin",
          status: "active",
          emailVerified: true,
          firstName: "System",
          lastName: "Admin",
          displayName: "Electronics Store Admin"
        },
        overrideAccess: true
      });
      payload.logger.info(`[Electronics Seeder] Refreshed credentials for admin: ${adminEmail}`);
    }
  } catch (e) {
    payload.logger.warn(`[Electronics Seeder] Admin check note: ${e?.message || e}`);
  }
  let allMediaDocs = [];
  try {
    const mediaRes = await payload.find({
      collection: "media",
      limit: 300,
      overrideAccess: true
    });
    allMediaDocs = mediaRes.docs || [];
    if (!allMediaDocs.length) {
      const mediaDir = getMediaStaticDir();
      if (fs2.existsSync(mediaDir)) {
        const files = fs2.readdirSync(mediaDir);
        for (const file of files) {
          if (/\.(jpe?g|png|webp)$/i.test(file) && !/-\d+x\d+\./.test(file)) {
            try {
              const doc = await payload.create({
                collection: "media",
                filePath: path4.join(mediaDir, file),
                data: { alt: file },
                overrideAccess: true
              });
              allMediaDocs.push(doc);
            } catch {
            }
          }
        }
      }
    }
  } catch (e) {
    payload.logger.warn(`[Electronics Seeder] Media lookup note: ${e?.message || e}`);
  }
  const findMediaId = (keyword) => {
    if (!allMediaDocs.length) return void 0;
    const doc = allMediaDocs.find(
      (m) => String(m.filename || "").toLowerCase().includes(keyword.toLowerCase())
    );
    return doc ? doc.id : allMediaDocs[0]?.id;
  };
  try {
    if (payload.updateGlobal) {
      await payload.updateGlobal({
        slug: "platform-settings",
        data: {
          storeMode: "single",
          currency: {
            defaultCurrency: "BDT",
            supportedCurrencies: ["BDT", "USD"],
            usdToBdtRate: 120
          },
          storeName: "BS Commerce",
          platformName: "BS Commerce"
        },
        overrideAccess: true
      });
      await payload.updateGlobal({
        slug: "header",
        data: {
          siteName: "BS Commerce",
          navLinks: [
            { label: "Home", url: "/en", enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: "Products", url: "/en/products", enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: "Categories", url: "/en/categories", enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: "Brands", url: "/en/brands", enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: "Track Order", url: "/en/track-order", enabled: true, showInDesktopNav: true, showInMobileDrawer: true }
          ]
        },
        overrideAccess: true
      });
      await payload.updateGlobal({
        slug: "footer",
        data: {
          copyrightText: "\xA9 2026 BS Commerce. Bangladesh\u2019s Leading Multi-Brand Electronics & Gadget Store.",
          columns: [
            {
              heading: "Featured Categories",
              links: [
                { label: "Phones & Tablets", url: "/en/categories/phones-tablets", enabled: true, visibility: "public" },
                { label: "Laptops & MacBooks", url: "/en/categories/laptops-macbooks", enabled: true, visibility: "public" },
                { label: "Watches & Wearables", url: "/en/categories/watches-wearables", enabled: true, visibility: "public" },
                { label: "Audio & Sound", url: "/en/categories/audio-sound", enabled: true, visibility: "public" },
                { label: "TV & Entertainment", url: "/en/categories/tv-entertainment", enabled: true, visibility: "public" },
                { label: "Smart Home & Appliances", url: "/en/categories/smart-home-appliances", enabled: true, visibility: "public" }
              ]
            },
            {
              heading: "Our Showrooms",
              links: [
                { label: "Bashundhara City Flagship", url: "/en/showrooms-bashundhara", enabled: true, visibility: "public" },
                { label: "Jamuna Future Park Center", url: "/en/showrooms-jamuna", enabled: true, visibility: "public" },
                { label: "Uttara Experience Hub", url: "/en/showrooms-uttara", enabled: true, visibility: "public" },
                { label: "Agrabad Hub (Chittagong)", url: "/en/showrooms-chittagong", enabled: true, visibility: "public" },
                { label: "All Showroom Locations", url: "/en/showrooms", enabled: true, visibility: "public" }
              ]
            },
            {
              heading: "Customer Care & Benefits",
              links: [
                { label: "Brand Official Warranty", url: "/en/warranty", enabled: true, visibility: "public" },
                { label: "0% EMI Facility (24+ Banks)", url: "/en/emi", enabled: true, visibility: "public" },
                { label: "Device Exchange & Trade-In", url: "/en/exchange", enabled: true, visibility: "public" },
                { label: "Track Your Order", url: "/en/track-order", enabled: true, visibility: "public" },
                { label: "Help Center & FAQ", url: "/en/faq", enabled: true, visibility: "public" },
                { label: "Contact & Support Desk", url: "/en/contact", enabled: true, visibility: "public" }
              ]
            },
            {
              heading: "Company & Policies",
              links: [
                { label: "About BS Commerce", url: "/en/about-us", enabled: true, visibility: "public" },
                { label: "7-Day Return & Replacement", url: "/en/return-refund", enabled: true, visibility: "public" },
                { label: "Privacy & Data Security", url: "/en/privacy-policy", enabled: true, visibility: "public" },
                { label: "Terms & Conditions of Sale", url: "/en/terms-conditions", enabled: true, visibility: "public" }
              ]
            }
          ],
          bottomLinks: [
            { label: "About Us", url: "/en/about-us" },
            { label: "Warranty Policy", url: "/en/warranty" },
            { label: "0% EMI", url: "/en/emi" },
            { label: "Trade-In", url: "/en/exchange" },
            { label: "Return Policy", url: "/en/return-refund" },
            { label: "Privacy Policy", url: "/en/privacy-policy" },
            { label: "Terms of Service", url: "/en/terms-conditions" }
          ],
          socialLinks: [
            { platform: "facebook", url: "https://facebook.com/applegadgetsbd" },
            { platform: "instagram", url: "https://instagram.com/applegadgetsbd" },
            { platform: "youtube", url: "https://youtube.com/@applegadgetsbd" }
          ]
        },
        overrideAccess: true
      });
    }
  } catch (e) {
    payload.logger.warn(`[Electronics Seeder] Globals note: ${e?.message || e}`);
  }
  let pagesCount = 0;
  let heroSlidesCount = 0;
  const cmsPagesToSeed = [
    // 1. Home Hero Carousel
    {
      title: "Home Hero Banners",
      slug: "home-hero-banners",
      meta: { title: "BS Commerce | Flagship Electronics Store", description: "Hero banner slides for homepage." },
      layout: [
        {
          blockType: "hero",
          heading: "Apple iPhone 16 Pro Max \u2014 Pure Titanium",
          subheading: "A18 Pro Silicon, 5x Optical Telephoto & Camera Control. 0% EMI up to 36 Months with Official AppleCare Warranty.",
          backgroundImage: findMediaId("category-electronics-1"),
          ctaLabel: "Shop iPhone 16 Pro",
          ctaUrl: "/en/products/apple-iphone-16-pro-max"
        },
        {
          blockType: "hero",
          heading: "MacBook Pro M3 Max & Creator Studio",
          subheading: "Unstoppable Apple Silicon powerhouses and RTX 4090 laptops for professional creative workflows.",
          backgroundImage: findMediaId("category-creator-studio-1"),
          ctaLabel: "Explore MacBooks",
          ctaUrl: "/en/categories/laptops-macbooks"
        },
        {
          blockType: "hero",
          heading: "Premium Audio, Drones & Smart Living",
          subheading: "AirPods Pro 2, Sony WH-1000XM5, Marshall, and DJI 4K Drones at authentic Bangladeshi prices.",
          backgroundImage: findMediaId("category-smart-home-1"),
          ctaLabel: "Browse All Gadgets",
          ctaUrl: "/en/products"
        },
        {
          blockType: "hero",
          heading: "Official Warranty Across 4 Showrooms",
          subheading: "Visit our flagship experience centers in Bashundhara City, Jamuna Future Park, Uttara & Chittagong.",
          backgroundImage: findMediaId("category-office-gear-1"),
          ctaLabel: "View Catalog",
          ctaUrl: "/en/categories"
        }
      ]
    },
    // 2. About Us
    {
      title: "About BS Commerce",
      slug: "about-us",
      meta: { title: "About Us | BS Commerce", description: "Learn about BS Commerce, our mission, values, and authenticity guarantee." },
      layout: [
        {
          blockType: "hero",
          heading: "Bangladesh\u2019s Premier Gadget Experience",
          subheading: "Connecting technology enthusiasts with 100% genuine electronics, premium computing, and world-class acoustics.",
          backgroundImage: findMediaId("category-creator-studio-1"),
          ctaLabel: "Explore Our Catalog",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Founded with a steadfast commitment to authenticity and transparency, BS Commerce has become Bangladesh\u2019s premier multi-brand retail destination. We specialize in official Apple hardware, high-performance Samsung flagships, Sony imaging & audio, and the smart IoT gadgets shaping modern lifestyles.",
            "Operating 4 flagship showrooms across Dhaka and Chittagong, we provide authentic unboxing experiences, live demo stations, and dedicated technical consultation. Every product in our inventory undergoes strict IMEI verification to guarantee original manufacturer provenance.",
            "Beyond physical retail, our nationwide express delivery network ensures customers across all 64 districts of Bangladesh receive factory-sealed electronics with authorized warranty and 0% EMI flexibility."
          ])
        },
        {
          blockType: "faq",
          heading: "Why Tech Shoppers Trust BS Commerce",
          items: [
            {
              question: "Are all products 100% authentic and original?",
              answer: makeLexicalDoc(["Yes. Every device is brand new, factory sealed, and sourced directly through authorized international distribution channels with verifiable serial numbers."])
            },
            {
              question: "Do you offer corporate or enterprise procurement?",
              answer: makeLexicalDoc(["Yes, our enterprise solutions team supports corporate bulk orders, tax invoicing, and tailored service level agreements for IT companies and institutions."])
            }
          ]
        }
      ]
    },
    // 3. Warranty Policy
    {
      title: "Brand Official Warranty & Protection Policy",
      slug: "warranty",
      meta: { title: "Official Warranty Policy | BS Commerce", description: "Comprehensive warranty details covering Apple, Samsung, Sony, Anker, and Asus products." },
      layout: [
        {
          blockType: "hero",
          heading: "Authorized Manufacturer Warranty Support",
          subheading: "Shop with total confidence. All our products carry official brand warranty and responsive local customer care.",
          backgroundImage: findMediaId("category-office-gear-1"),
          ctaLabel: "Shop With Warranty",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Apple Official Warranty: Apple devices (iPhones, MacBooks, iPads, Watches) are backed by 1-Year Apple Official International Warranty, claimable through Apple Authorized Service Providers (AASP) in Bangladesh and worldwide.",
            "Android & Audio Warranties: Samsung smartphones include 1-Year National Official Warranty. Sony headphones carry 1-Year Official Warranty. Anker GaN chargers and power banks feature our signature 18-Month Instant Replacement Guarantee.",
            "Asus ROG Gaming Laptops: Covered under 2-Year Global Hardware Warranty covering motherboards, display panels, and high-frequency cooling systems."
          ])
        },
        {
          blockType: "faq",
          heading: "Warranty Claims & Service FAQ",
          items: [
            {
              question: "How do I claim warranty for an Apple product?",
              answer: makeLexicalDoc(["Simply bring your device and the original BS Commerce invoice to any of our 4 showrooms or any Apple Authorized Service Provider in Bangladesh."])
            },
            {
              question: "What is covered under the 18-month Anker replacement guarantee?",
              answer: makeLexicalDoc(["Any hardware malfunction, power failure, or port defect occurring under normal usage is replaced with a brand new unit within 48 hours."])
            },
            {
              question: "What is NOT covered under standard warranty?",
              answer: makeLexicalDoc(["Physical damage, accidental drops, water/liquid damage (unless covered by explicit IP claims), unauthorized third-party repairs, and software rooting."])
            }
          ]
        }
      ]
    },
    // 4. EMI Facility
    {
      title: "0% Interest EMI Facility (Up to 36 Months)",
      slug: "emi",
      meta: { title: "0% EMI Facility | BS Commerce", description: "Avail up to 36 months 0% interest EMI across 24+ top Bangladeshi commercial banks." },
      layout: [
        {
          blockType: "hero",
          heading: "Own Your Dream Gadget with 0% EMI",
          subheading: "Flexible installments from 3 to 36 months across 24+ Bangladeshi banks. Available both online and at all 4 showrooms.",
          backgroundImage: findMediaId("category-electronics-1"),
          ctaLabel: "Explore EMI Products",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "We have partnered with 24+ leading commercial banks in Bangladesh to provide 0% interest Equal Monthly Installment (EMI) facilities. Now you can purchase any flagship iPhone 16 Pro, MacBook Pro, or Sony OLED TV with affordable monthly payments.",
            "Supported Banks: City Bank (American Express), Standard Chartered Bank, BRAC Bank, Eastern Bank (EBL), Dutch-Bangla Bank (DBBL), Dhaka Bank, Prime Bank, Mutual Trust Bank (MTB), Southeast Bank, Premier Bank, United Commercial Bank (UCB), Jamuna Bank, and Bank Asia.",
            "Available Tenures: 3 months, 6 months, 9 months, 12 months, 18 months, 24 months, and 36 months."
          ])
        },
        {
          blockType: "faq",
          heading: "EMI Application & Processing FAQ",
          items: [
            {
              question: "Can I purchase using EMI on the website?",
              answer: makeLexicalDoc(['Yes! During checkout, select "Online Payment" and choose your bank under the EMI tab in the secure gateway. Your card limit will convert into monthly installments automatically.'])
            },
            {
              question: "Can I process EMI in-store?",
              answer: makeLexicalDoc(["Yes! Simply swipe your credit card on our specialized POS terminals at any of our 4 showrooms for instant EMI conversion."])
            },
            {
              question: "Is a minimum purchase amount required for EMI?",
              answer: makeLexicalDoc(["A minimum cart value of \u09F310,000 is required to qualify for credit card EMI facilities."])
            }
          ]
        }
      ]
    },
    // 5. Device Exchange & Trade-In
    {
      title: "Smart Trade-In & Device Exchange Program",
      slug: "exchange",
      meta: { title: "Device Exchange & Trade-In | BS Commerce", description: "Trade in your old smartphone, iPad, or MacBook for instant credit toward a new device." },
      layout: [
        {
          blockType: "hero",
          heading: "Upgrade Smartly with Instant Trade-In",
          subheading: "Bring your pre-owned smartphone or laptop to any showroom, receive fair diagnostic evaluation in 10 minutes, and pay only the difference.",
          backgroundImage: findMediaId("category-creator-studio-1"),
          ctaLabel: "Find Nearest Showroom",
          ctaUrl: "/en/showrooms"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "How Trade-In Works in 3 Simple Steps:",
            "1. Bring Your Device: Visit any of our 4 physical showrooms with your existing device (iPhone, iPad, MacBook, or Galaxy flagship).",
            "2. Instant Computerized Valuation: Our certified technicians inspect your battery health, display integrity, and internal diagnostics to offer top market trade-in value in 10 minutes.",
            "3. Upgrade Instantly: Apply your trade-in credit directly toward any new device in store and walk out with your brand new purchase."
          ])
        },
        {
          blockType: "faq",
          heading: "Trade-In Requirements & Conditions",
          items: [
            {
              question: "What documents do I need to bring?",
              answer: makeLexicalDoc(["You must present a photocopy of your National ID Card (NID) or Passport for verification and legal ownership transfer."])
            },
            {
              question: "Can I exchange a device without its original box?",
              answer: makeLexicalDoc(["Yes. Original accessories and packaging increase the valuation, but device-only exchanges are fully accepted with proper identification."])
            }
          ]
        }
      ]
    },
    // 6. All Showrooms
    {
      title: "Our Showroom Locations & Experience Centers",
      slug: "showrooms",
      meta: { title: "Showroom Locations | BS Commerce", description: "Visit our flagship experience centers in Bashundhara City, Jamuna Future Park, Uttara & Chittagong." },
      layout: [
        {
          blockType: "hero",
          heading: "4 Flagship Showrooms Across Bangladesh",
          subheading: "Experience live unboxings, interactive gaming lounges, and audio listening booths at prime retail destinations in Dhaka & Chittagong.",
          backgroundImage: findMediaId("category-workspace-furniture-1"),
          ctaLabel: "Browse Products First",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Bashundhara City Flagship Store (Dhaka): Level 6, Block D, Shop 42\u201345, Panthapath, Dhaka 1205. Phone: +880 1711-234567. Open 10:00 AM \u2013 8:30 PM (Closed Tuesday). Featuring our full Apple ecosystem wall and dedicated DJI flight simulator.",
            "Jamuna Future Park Experience Center (Dhaka): Level 4, Zone A, Shop 18B, Kuril, Dhaka 1229. Phone: +880 1819-345678. Open 11:00 AM \u2013 9:00 PM (Closed Wednesday). Featuring high-fidelity Bose/Marshall sound booths and Asus ROG gaming test zones.",
            "Uttara Tech Hub Outlet (Dhaka): House 12, Road 7, Sector 3, Uttara, Dhaka 1230. Phone: +880 1912-456789. Open 10:00 AM \u2013 8:30 PM (Open 7 Days). Express pickup hub with rapid airport road dispatch.",
            "Agrabad Commercial Hub (Chittagong): Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000. Phone: +880 1815-789012. Open 10:00 AM \u2013 8:30 PM (Open 7 Days). Premier tech showroom serving Greater Chittagong."
          ])
        },
        {
          blockType: "faq",
          heading: "Visiting Our Showrooms FAQ",
          items: [
            {
              question: "Can I pick up an online order from any showroom?",
              answer: makeLexicalDoc(['Yes! Choose "Store Pickup" at checkout and select your preferred showroom. Your order will be packed and ready within 2 hours.'])
            },
            {
              question: "Are website prices and showroom prices the same?",
              answer: makeLexicalDoc(["Yes, our pricing, warranty packages, and 0% EMI campaigns are completely synchronized across both online and physical stores."])
            }
          ]
        }
      ]
    },
    // 7. Bashundhara City Flagship
    {
      title: "Bashundhara City Flagship Store",
      slug: "showrooms-bashundhara",
      meta: { title: "Bashundhara City Flagship | BS Commerce", description: "Visit our flagship showroom on Level 6, Block D, Bashundhara City Shopping Mall, Panthapath." },
      layout: [
        {
          blockType: "hero",
          heading: "Bashundhara City Flagship Store",
          subheading: "Level 6, Block D, Panthapath, Dhaka 1205. Our largest flagship destination with interactive Apple and DJI demo stations.",
          backgroundImage: findMediaId("category-workspace-furniture-1"),
          ctaLabel: "View In-Stock Products",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Location & Hours: Level 6, Block D, Shop 42\u201345, Bashundhara City Shopping Mall, Panthapath, Dhaka.",
            "Operating Hours: 10:00 AM \u2013 8:30 PM (Closed every Tuesday according to market schedule).",
            "Hotline: +880 1711-234567 | Email: bashundhara@bscommerce.local",
            "Highlights: Complete iPhone, iPad, and MacBook M3 experience zones; live DJI drone camera demonstration; certified trade-in counter; on-the-spot 0% EMI processing."
          ])
        }
      ]
    },
    // 8. Jamuna Future Park Center
    {
      title: "Jamuna Future Park Experience Center",
      slug: "showrooms-jamuna",
      meta: { title: "Jamuna Future Park Center | BS Commerce", description: "Visit our experience showroom on Level 4, Zone A, Jamuna Future Park, Kuril, Dhaka." },
      layout: [
        {
          blockType: "hero",
          heading: "Jamuna Future Park Experience Center",
          subheading: "Level 4, Zone A, Kuril, Dhaka 1229. Immersive gaming test stations and sound booths.",
          backgroundImage: findMediaId("category-creator-studio-1"),
          ctaLabel: "View Products",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Location & Hours: Level 4, Zone A, Shop 18B, Jamuna Future Park, Kuril, Dhaka.",
            "Operating Hours: 11:00 AM \u2013 9:00 PM (Closed every Wednesday).",
            "Hotline: +880 1819-345678 | Email: jamuna@bscommerce.local",
            "Highlights: Dedicated PlayStation 5 and Asus ROG gaming showcase; Marshall and Sony noise cancellation sound booth; high-speed checkout and express pickup counter."
          ])
        }
      ]
    },
    // 9. Uttara Tech Hub
    {
      title: "Uttara Tech Hub Outlet",
      slug: "showrooms-uttara",
      meta: { title: "Uttara Tech Hub Outlet | BS Commerce", description: "Visit our Uttara outlet at House 12, Road 7, Sector 3, Uttara, Dhaka." },
      layout: [
        {
          blockType: "hero",
          heading: "Uttara Tech Hub Outlet",
          subheading: "House 12, Road 7, Sector 3, Uttara, Dhaka 1230. Convenient North Dhaka location with fast doorstep delivery support.",
          backgroundImage: findMediaId("category-office-gear-1"),
          ctaLabel: "Shop Online",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Location & Hours: House 12, Road 7, Sector 3, Uttara, Dhaka 1230.",
            "Operating Hours: 10:00 AM \u2013 8:30 PM (Open all 7 days of the week).",
            "Hotline: +880 1912-456789 | Email: uttara@bscommerce.local",
            "Highlights: Rapid curbside pickup; specialized Apple accessories and GaN charging station; regional delivery dispatch center for Gazipur and Tongi."
          ])
        }
      ]
    },
    // 10. Agrabad Chittagong Hub
    {
      title: "Agrabad Commercial Hub (Chittagong)",
      slug: "showrooms-chittagong",
      meta: { title: "Chittagong Showroom | BS Commerce", description: "Visit our Chittagong flagship center at Central Commercial Plaza, GEC Circle." },
      layout: [
        {
          blockType: "hero",
          heading: "Chittagong Experience Center",
          subheading: "Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000. Serving tech lovers across Greater Chittagong.",
          backgroundImage: findMediaId("category-smart-home-1"),
          ctaLabel: "Browse Gadgets",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Location & Hours: Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000.",
            "Operating Hours: 10:00 AM \u2013 8:30 PM (Open 7 days a week).",
            "Hotline: +880 1815-789012 | Email: chittagong@bscommerce.local",
            "Highlights: Full product lineup of Apple, Samsung, Sony, and Anker; same-day delivery across Chittagong city; official warranty intake center."
          ])
        }
      ]
    },
    // 11. Return & Refund Policy
    {
      title: "7-Day Replacement & Return Policy",
      slug: "return-refund",
      meta: { title: "Return & Refund Policy | BS Commerce", description: "Clear, transparent 7-day replacement guarantee and refund policies." },
      layout: [
        {
          blockType: "hero",
          heading: "7-Day Hassle-Free Replacement Policy",
          subheading: "Your satisfaction is our priority. If any manufacturing defect is detected within 7 days, we replace your unit immediately.",
          backgroundImage: findMediaId("category-office-gear-1"),
          ctaLabel: "Browse Products",
          ctaUrl: "/en/products"
        },
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "7-Day Replacement Guarantee: If your purchased product develops any hardware malfunction or manufacturing defect within 7 days of delivery, visit any of our showrooms or contact our support team for an immediate replacement.",
            "Return Eligibility: Products must be in pristine condition with all original packaging, stickers, manuals, and accessories intact. Unopened items may be returned within 48 hours for store credit.",
            "Refund Processing: Online transaction refunds are credited back to the original source (bKash, Nagad, Visa/Mastercard) within 3 to 5 business days upon inspection approval."
          ])
        },
        {
          blockType: "faq",
          heading: "Return & Refund FAQ",
          items: [
            {
              question: "How do I initiate a replacement request?",
              answer: makeLexicalDoc(["Call our hotline (+880 1711-234567) or bring your invoice to any showroom. Our technical desk will inspect and process your replacement on the spot."])
            },
            {
              question: "What if a product is out of stock when requesting replacement?",
              answer: makeLexicalDoc(["You may choose an alternative model with adjusted price difference, or receive a 100% full refund immediately."])
            }
          ]
        }
      ]
    },
    // 12. Privacy Policy
    {
      title: "Privacy & Data Security Policy",
      slug: "privacy-policy",
      meta: { title: "Privacy Policy | BS Commerce", description: "How BS Commerce protects your personal data and online transactions." },
      layout: [
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "At BS Commerce, we take your privacy and data security seriously. This Privacy Policy details how we collect, handle, and protect your information when you use our website and retail services.",
            "Information Collection: We collect essential contact information (name, delivery address, phone number, email) solely for order fulfillment, courier delivery updates, and warranty registration.",
            "Payment Security: All online payments are encrypted through 256-bit SSL connections via PCI-DSS certified gateways (SSLCommerz / PortPos). We never store your credit card numbers or PINs on our servers.",
            "No Third-Party Sharing: We do not sell, trade, or disclose your personal information to unauthorized third-party marketing companies under any circumstances."
          ])
        }
      ]
    },
    // 13. Terms & Conditions
    {
      title: "Terms & Conditions of Service",
      slug: "terms-conditions",
      meta: { title: "Terms & Conditions | BS Commerce", description: "Terms of sale, pricing transparency, and service policies for BS Commerce." },
      layout: [
        {
          blockType: "richText",
          content: makeLexicalDoc([
            "Welcome to BS Commerce. By placing an order online or purchasing at our showrooms, you agree to the following terms and conditions:",
            "1. Pricing and Availability: All product prices are listed in Bangladeshi Taka (BDT) including applicable taxes. While we strive for absolute accuracy, prices and stock levels may change based on global currency fluctuations and availability.",
            "2. Delivery and Inspection: Please inspect parcel packaging before signing courier receipts. In case of exterior transit damage, please notify the delivery agent and our support hotline immediately.",
            "3. Warranty Terms: Official brand warranties are subject to manufacturer guidelines and are fulfilled through authorized service centers.",
            "4. Governing Law: These terms and conditions are governed by the laws and commercial regulations of Bangladesh."
          ])
        }
      ]
    },
    // 14. FAQ
    {
      title: "Frequently Asked Questions & Help Center",
      slug: "faq",
      meta: { title: "FAQ & Help Center | BS Commerce", description: "Answers to common questions about orders, payments, delivery, and authenticity." },
      layout: [
        {
          blockType: "hero",
          heading: "Frequently Asked Questions",
          subheading: "Find quick answers to common questions about ordering, delivery, warranty, and showroom services.",
          backgroundImage: findMediaId("category-smart-home-1"),
          ctaLabel: "Contact Support",
          ctaUrl: "/en/contact"
        },
        {
          blockType: "faq",
          heading: "General Inquiries",
          items: [
            {
              question: "How fast is nationwide delivery in Bangladesh?",
              answer: makeLexicalDoc(["Inside Dhaka: Same-day express delivery within 2 to 4 hours. Outside Dhaka: 24 to 48 hours nationwide via Steadfast and Sundarban Courier."])
            },
            {
              question: "How can I track my shipment?",
              answer: makeLexicalDoc(["Go to our Track Order page (/en/track-order) and enter your Order ID and contact number to view live courier status."])
            },
            {
              question: "What payment methods do you accept?",
              answer: makeLexicalDoc(["We accept bKash, Nagad, Visa, Mastercard, AMEX, Cash on Delivery (COD), and 0% EMI across 24+ Bangladeshi banks."])
            },
            {
              question: "Can I inspect the product before accepting delivery?",
              answer: makeLexicalDoc(["Yes, you may verify exterior seal and box condition with our delivery personnel before completing COD payment."])
            }
          ]
        }
      ]
    }
  ];
  for (const pageDef of cmsPagesToSeed) {
    try {
      const existing = await payload.find({
        collection: "pages",
        where: { slug: { equals: pageDef.slug } },
        limit: 1,
        overrideAccess: true
      });
      const pageData = {
        title: pageDef.title,
        slug: pageDef.slug,
        status: "published",
        _status: "published",
        publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        meta: pageDef.meta,
        layout: pageDef.layout
      };
      if (existing.totalDocs > 0) {
        await payload.update({
          collection: "pages",
          id: existing.docs[0].id,
          data: pageData,
          overrideAccess: true
        });
      } else {
        await payload.create({
          collection: "pages",
          data: pageData,
          overrideAccess: true
        });
      }
      pagesCount++;
      if (pageDef.slug === "home-hero-banners") {
        heroSlidesCount = pageDef.layout.length;
      }
    } catch (pageErr) {
      payload.logger.warn(`[Electronics Seeder] Page "${pageDef.slug}" note: ${pageErr?.message || pageErr}`);
    }
  }
  payload.logger.info(`[Electronics Seeder] Seeded ${pagesCount} published CMS pages with rich blocks.`);
  const outletsData = [
    {
      name: "Bashundhara City Flagship Store",
      code: "OUT-DHK-BAS",
      slug: "bashundhara-city-flagship",
      isPublicStore: true,
      address: { street: "Level 6, Block D, Panthapath", city: "Dhaka", state: "Dhaka Division", country: "BD", postalCode: "1205" }
    },
    {
      name: "Jamuna Future Park Experience Center",
      code: "OUT-DHK-JAM",
      slug: "jamuna-future-park",
      isPublicStore: true,
      address: { street: "Level 4, Zone A, Kuril", city: "Dhaka", state: "Dhaka Division", country: "BD", postalCode: "1229" }
    },
    {
      name: "Uttara Tech Hub Outlet",
      code: "OUT-DHK-UTT",
      slug: "uttara-tech-hub",
      isPublicStore: true,
      address: { street: "House 12, Road 7, Sector 3", city: "Dhaka", state: "Dhaka Division", country: "BD", postalCode: "1230" }
    },
    {
      name: "Agrabad Commercial Hub Outlet",
      code: "OUT-CTG-AGR",
      slug: "chittagong-agrabad-hub",
      isPublicStore: true,
      address: { street: "Central Commercial Plaza, GEC Circle", city: "Chittagong", state: "Chittagong Division", country: "BD", postalCode: "4000" }
    }
  ];
  const createdOutlets = [];
  for (const o of outletsData) {
    const doc = await payload.create({
      collection: "stock-locations",
      data: o,
      overrideAccess: true
    });
    createdOutlets.push(doc);
  }
  try {
    const zoneDoc = await payload.create({
      collection: "shipping-zones",
      data: {
        name: "Bangladesh Nationwide Delivery",
        countries: [{ code: "BD" }],
        isActive: true
      },
      overrideAccess: true
    });
    await payload.create({
      collection: "shipping-methods",
      data: {
        name: "Inside Dhaka Express (2-4 Hours / Same Day)",
        zone: zoneDoc.id,
        type: "flat",
        rate: 80,
        currency: "BDT",
        isActive: true
      },
      overrideAccess: true
    });
    await payload.create({
      collection: "shipping-methods",
      data: {
        name: "Nationwide Courier (Steadfast / Sundarban 24-48h)",
        zone: zoneDoc.id,
        type: "flat",
        rate: 150,
        currency: "BDT",
        isActive: true
      },
      overrideAccess: true
    });
  } catch (e) {
    payload.logger.warn(`[Electronics Seeder] Shipping note: ${e?.message || e}`);
  }
  const categoriesData = [
    { name: "Phones & Tablets", slug: "phones-tablets", imageKey: "category-electronics-1" },
    { name: "Laptops & MacBooks", slug: "laptops-macbooks", imageKey: "category-creator-studio-1" },
    { name: "Watches & Wearables", slug: "watches-wearables", imageKey: "category-office-gear-1" },
    { name: "Audio & Sound", slug: "audio-sound", imageKey: "sv-demo-earbuds" },
    { name: "Power & Accessories", slug: "power-accessories", imageKey: "sv-wall-charger-65w-pro" },
    { name: "Cameras & Drones", slug: "cameras-drones", imageKey: "sv-ring-light-10in-pro" },
    { name: "Gaming & Consoles", slug: "gaming-consoles", imageKey: "category-electronics" },
    { name: "TV & Entertainment", slug: "tv-entertainment", imageKey: "sv-dual-monitor-arm-pro" },
    { name: "Smart Home & Appliances", slug: "smart-home-appliances", imageKey: "category-smart-home-1" }
  ];
  const categoryMap = {};
  for (const c of categoriesData) {
    const imgId = findMediaId(c.imageKey);
    const doc = await payload.create({
      collection: "categories",
      data: {
        name: c.name,
        slug: c.slug,
        image: imgId || void 0
      },
      overrideAccess: true
    });
    categoryMap[c.slug] = String(doc.id);
  }
  const brandsData = [
    { name: "Apple", slug: "apple", featured: true, website: "https://www.apple.com", description: "Original Apple iPhones, MacBooks, iPads, Watches & Audio with Official Warranty." },
    { name: "Samsung", slug: "samsung", featured: true, website: "https://www.samsung.com", description: "Galaxy S-Series, Z-Fold/Flip and premium ecosystem devices." },
    { name: "Sony", slug: "sony", featured: true, website: "https://www.sony.com", description: "Industry benchmark audio gear, PlayStation 5 consoles, and Alpha imaging." },
    { name: "Google Pixel", slug: "google-pixel", featured: true, website: "https://store.google.com", description: "Pure Google Android with Tensor AI and computational photography." },
    { name: "DJI", slug: "dji", featured: true, website: "https://www.dji.com", description: "World standard aerial drones, Osmo gimbals, and stabilization systems." },
    { name: "Anker", slug: "anker", featured: true, website: "https://www.anker.com", description: "Global leader in GaN fast charging, high-capacity power banks, and cables." },
    { name: "Bose", slug: "bose", featured: true, website: "https://www.bose.com", description: "Acoustic Noise Cancelling headphones and immersive home sound." },
    { name: "Marshall", slug: "marshall", featured: true, website: "https://www.marshallheadphones.com", description: "Iconic vintage British audio amplification, home speakers, and earbuds." },
    { name: "OnePlus", slug: "oneplus", featured: true, website: "https://www.oneplus.com", description: "Fast and Smooth smartphones with Hasselblad camera systems." },
    { name: "Xiaomi", slug: "xiaomi", featured: true, website: "https://www.mi.com", description: "Smart living ecosystem, Leica camera flagships, and smart appliances." },
    { name: "Asus ROG", slug: "asus-rog", featured: true, website: "https://rog.asus.com", description: "Republic of Gamers \u2014 highest tier gaming laptops and handhelds." },
    { name: "TP-Link", slug: "tp-link", featured: true, website: "https://www.tp-link.com", description: "Deco Mesh Wi-Fi 6, smart routers, and seamless home connectivity." },
    { name: "Dyson", slug: "dyson", featured: true, website: "https://www.dyson.com", description: "Laser detect slim vacuums, air purifiers, and intelligent home appliances." }
  ];
  const brandMap = {};
  for (const b of brandsData) {
    const doc = await payload.create({
      collection: "brands",
      data: b,
      overrideAccess: true
    });
    brandMap[b.slug] = String(doc.id);
  }
  const attributesData = [
    // Standard Catalog Specifications with Predefined Options
    {
      label: "Display Screen Size",
      key: "screen_size",
      slug: "screen-size",
      dataType: "text",
      category: "specification",
      unit: "inch",
      defaultGroup: "Display",
      isFilterable: true,
      isComparable: true,
      displayOrder: 1
    },
    {
      label: "Display Panel Type",
      key: "display_tech",
      slug: "display-tech",
      dataType: "select",
      category: "specification",
      defaultGroup: "Display",
      isFilterable: true,
      isComparable: true,
      displayOrder: 2,
      options: [
        { label: "LTPO Super Retina XDR OLED", value: "ltpo-retina-xdr" },
        { label: "Dynamic AMOLED 2X", value: "dynamic-amoled-2x" },
        { label: "Super AMOLED", value: "super-amoled" },
        { label: "Liquid Retina IPS", value: "liquid-retina-ips" },
        { label: "LTPO OLED Retina", value: "ltpo-oled" }
      ]
    },
    {
      label: "Screen Refresh Rate",
      key: "refresh_rate",
      slug: "refresh-rate",
      dataType: "select",
      category: "specification",
      unit: "Hz",
      defaultGroup: "Display",
      isFilterable: true,
      isComparable: true,
      displayOrder: 3,
      options: [
        { label: "120Hz ProMotion", value: "120hz" },
        { label: "90Hz High Refresh", value: "90hz" },
        { label: "60Hz Standard", value: "60hz" }
      ]
    },
    {
      label: "Processor / Chipset",
      key: "processor",
      slug: "processor",
      dataType: "select",
      category: "specification",
      defaultGroup: "Performance",
      isFilterable: true,
      isComparable: true,
      displayOrder: 4,
      options: [
        { label: "Apple A18 Pro", value: "apple-a18-pro" },
        { label: "Apple A18", value: "apple-a18" },
        { label: "Snapdragon 8 Gen 3", value: "snapdragon-8-gen-3" },
        { label: "Google Tensor G4", value: "google-tensor-g4" },
        { label: "Apple M4", value: "apple-m4" },
        { label: "Apple M3 Max", value: "apple-m3-max" },
        { label: "Apple M3 Pro", value: "apple-m3-pro" },
        { label: "Apple M3", value: "apple-m3" },
        { label: "Apple M2", value: "apple-m2" },
        { label: "Intel Core Ultra 9", value: "intel-ultra-9" }
      ]
    },
    {
      label: "Processor (CPU)",
      key: "cpu",
      slug: "cpu",
      dataType: "select",
      category: "specification",
      defaultGroup: "Performance",
      isFilterable: true,
      isComparable: true,
      displayOrder: 5,
      options: [
        { label: "Apple M3 Max", value: "apple-m3-max" },
        { label: "Apple M3 Pro", value: "apple-m3-pro" },
        { label: "Apple M3", value: "apple-m3" },
        { label: "Intel Core Ultra 9", value: "intel-ultra-9" }
      ]
    },
    {
      label: "RAM Capacity",
      key: "ram",
      slug: "ram",
      dataType: "select",
      category: "specification",
      unit: "GB",
      defaultGroup: "Performance",
      isFilterable: true,
      isComparable: true,
      displayOrder: 6,
      options: [
        { label: "8 GB", value: "8gb" },
        { label: "12 GB", value: "12gb" },
        { label: "16 GB", value: "16gb" },
        { label: "32 GB", value: "32gb" },
        { label: "36 GB", value: "36gb" },
        { label: "64 GB", value: "64gb" }
      ]
    },
    {
      label: "Internal Storage",
      key: "storage",
      slug: "storage",
      dataType: "select",
      category: "specification",
      unit: "GB",
      defaultGroup: "Storage",
      isFilterable: true,
      isComparable: true,
      displayOrder: 7,
      options: [
        { label: "128 GB", value: "128gb" },
        { label: "256 GB", value: "256gb" },
        { label: "512 GB", value: "512gb" },
        { label: "1 TB", value: "1tb" },
        { label: "2 TB", value: "2tb" },
        { label: "512 GB SSD", value: "512gb-ssd" },
        { label: "1 TB SSD", value: "1tb-ssd" },
        { label: "2 TB SSD", value: "2tb-ssd" }
      ]
    },
    {
      label: "Battery Capacity",
      key: "battery_capacity",
      slug: "battery-capacity",
      dataType: "select",
      category: "specification",
      unit: "mAh",
      defaultGroup: "Battery & Charging",
      isFilterable: true,
      isComparable: true,
      displayOrder: 8,
      options: [
        { label: "3,561 mAh", value: "3561mah" },
        { label: "4,685 mAh", value: "4685mah" },
        { label: "5,000 mAh", value: "5000mah" },
        { label: "5,060 mAh", value: "5060mah" },
        { label: "10,000 mAh", value: "10000mah" },
        { label: "20,000 mAh", value: "20000mah" },
        { label: "24,000 mAh", value: "24000mah" },
        { label: "30,000 mAh", value: "30000mah" }
      ]
    },
    {
      label: "Battery Capacity",
      key: "capacity",
      slug: "capacity",
      dataType: "select",
      category: "specification",
      unit: "mAh",
      defaultGroup: "Battery & Charging",
      isFilterable: true,
      isComparable: true,
      displayOrder: 9,
      options: [
        { label: "10,000 mAh", value: "10000mah" },
        { label: "20,000 mAh", value: "20000mah" },
        { label: "24,000 mAh", value: "24000mah" },
        { label: "30,000 mAh", value: "30000mah" }
      ]
    },
    {
      label: "Battery Cell Type",
      key: "battery_type",
      slug: "battery-type",
      dataType: "select",
      category: "specification",
      defaultGroup: "Battery & Charging",
      isFilterable: true,
      isComparable: true,
      displayOrder: 10,
      options: [
        { label: "Lithium-Polymer", value: "lithium-polymer" },
        { label: "Lithium-Ion", value: "lithium-ion" }
      ]
    },
    {
      label: "Total Output",
      key: "total_output",
      slug: "total-output",
      dataType: "text",
      category: "specification",
      unit: "W",
      defaultGroup: "Battery & Charging",
      isFilterable: true,
      isComparable: true,
      displayOrder: 11
    },
    {
      label: "Fast Charging Standard",
      key: "fast_charging_tech",
      slug: "fast-charging-tech",
      dataType: "select",
      category: "feature",
      defaultGroup: "Battery & Charging",
      isFilterable: true,
      isComparable: true,
      displayOrder: 12,
      options: [
        { label: "Power Delivery (PD)", value: "power-delivery" },
        { label: "GaNFast / GaNPrime", value: "gan-prime" },
        { label: "Quick Charge 4.0+", value: "quick-charge" },
        { label: "Qi2 Wireless", value: "qi2-wireless" }
      ]
    },
    {
      label: "Fast Charging Wattage",
      key: "charging_wattage",
      slug: "charging-wattage",
      dataType: "text",
      category: "specification",
      unit: "W",
      defaultGroup: "Battery & Charging",
      isFilterable: true,
      isComparable: true,
      displayOrder: 13
    },
    {
      label: "Cellular Connectivity",
      key: "cellular_network",
      slug: "cellular-network",
      dataType: "select",
      category: "connectivity",
      defaultGroup: "Connectivity",
      isFilterable: true,
      isComparable: true,
      displayOrder: 14,
      options: [
        { label: "5G Sub-6 / mmWave", value: "5g" },
        { label: "4G LTE", value: "4g-lte" },
        { label: "Wi-Fi Only", value: "wifi-only" }
      ]
    },
    {
      label: "Operating System",
      key: "operating_system",
      slug: "operating-system",
      dataType: "select",
      category: "specification",
      defaultGroup: "System",
      isFilterable: true,
      isComparable: true,
      displayOrder: 15,
      options: [
        { label: "iOS 18", value: "ios-18" },
        { label: "Android 14", value: "android-14" },
        { label: "iPadOS 18", value: "ipados-18" },
        { label: "macOS Sonoma", value: "macos-sonoma" },
        { label: "Windows 11 Pro", value: "win-11-pro" }
      ]
    },
    {
      label: "Headphone Form Factor",
      key: "type",
      slug: "headphone-form-factor",
      dataType: "select",
      category: "specification",
      defaultGroup: "Audio",
      isFilterable: true,
      isComparable: true,
      displayOrder: 16,
      options: [
        { label: "In-Ear (TWS)", value: "in-ear" },
        { label: "Over-Ear", value: "over-ear" },
        { label: "On-Ear", value: "on-ear" }
      ]
    },
    {
      label: "Wireless Connectivity",
      key: "connectivity",
      slug: "wireless-connectivity",
      dataType: "select",
      category: "connectivity",
      defaultGroup: "Connectivity",
      isFilterable: true,
      isComparable: true,
      displayOrder: 17,
      options: [
        { label: "Bluetooth 5.3", value: "bluetooth-5-3" },
        { label: "Bluetooth 5.2", value: "bluetooth-5-2" },
        { label: "Wired 3.5mm", value: "wired-3-5mm" }
      ]
    },
    {
      label: "Battery Playtime",
      key: "battery_life",
      slug: "battery-life",
      dataType: "text",
      category: "specification",
      unit: "hrs",
      defaultGroup: "Battery & Power",
      isFilterable: true,
      isComparable: true,
      displayOrder: 18
    },
    {
      label: "Active Noise Cancellation",
      key: "noise_cancellation",
      slug: "noise-cancellation",
      dataType: "select",
      category: "feature",
      defaultGroup: "Audio",
      isFilterable: true,
      isComparable: true,
      displayOrder: 19,
      options: [
        { label: "Active Noise Cancellation (ANC)", value: "anc" },
        { label: "Adaptive ANC", value: "adaptive-anc" },
        { label: "Environmental Noise Cancellation (ENC)", value: "enc" },
        { label: "Passive Noise Isolation", value: "none" }
      ]
    },
    {
      label: "Water / Sweat Resistance",
      key: "water_resistance",
      slug: "water-resistance-spec",
      dataType: "select",
      category: "certification",
      defaultGroup: "Durability",
      isFilterable: true,
      isComparable: true,
      displayOrder: 20,
      options: [
        { label: "IP68 Dust/Water Resistant (6m)", value: "ip68" },
        { label: "IP54 Dust & Splash Resistant", value: "ip54" },
        { label: "IPX4 Sweat Resistant", value: "ipx4" },
        { label: "IPX5 Water Resistant", value: "ipx5" },
        { label: "100m / 10ATM (Diving)", value: "100m-dive" },
        { label: "50m / 5ATM (Swimming)", value: "50m-swim" },
        { label: "Not Rated", value: "none" }
      ]
    },
    {
      label: "Display Panel Type",
      key: "display_type",
      slug: "smartwatch-display-type",
      dataType: "select",
      category: "specification",
      defaultGroup: "Display",
      isFilterable: true,
      isComparable: true,
      displayOrder: 21,
      options: [
        { label: "LTPO OLED Retina", value: "ltpo-oled" },
        { label: "Super AMOLED", value: "super-amoled" }
      ]
    },
    {
      label: "Case Enclosure Material",
      key: "case_material",
      slug: "case-material",
      dataType: "select",
      category: "material",
      defaultGroup: "Design",
      isFilterable: true,
      isComparable: true,
      displayOrder: 22,
      options: [
        { label: "Aerospace Grade Titanium", value: "aerospace-titanium" },
        { label: "Recycled Aluminum", value: "recycled-aluminum" }
      ]
    },
    // Product Series and Strategic Tags
    { label: "Pro Max Series", key: "series-pro-max", slug: "pro-max-series", dataType: "select", category: "series", defaultGroup: "General", isFilterable: true, isComparable: true },
    { label: "Ultra Series", key: "series-ultra", slug: "ultra-series", dataType: "select", category: "series", defaultGroup: "General", isFilterable: true, isComparable: true },
    { label: "M3 Silicon Series", key: "series-m3-silicon", slug: "m3-silicon-series", dataType: "select", category: "series", defaultGroup: "General", isFilterable: true, isComparable: true },
    { label: "GaNPrime Series", key: "series-ganprime", slug: "ganprime-series", dataType: "select", category: "series", defaultGroup: "General", isFilterable: true, isComparable: true },
    { label: "Bravia XR Series", key: "series-bravia-xr", slug: "bravia-xr-series", dataType: "select", category: "series", defaultGroup: "General", isFilterable: true, isComparable: true },
    // Technical Features & Connectivity Flags
    { label: "5G Cellular", key: "conn-5g", slug: "5g-cellular", dataType: "boolean", category: "connectivity", defaultGroup: "Connectivity", isFilterable: true, isComparable: true },
    { label: "120Hz OLED Display", key: "spec-120hz-oled", slug: "120hz-oled", dataType: "boolean", category: "specification", defaultGroup: "Display", isFilterable: true, isComparable: true },
    { label: "Active Noise Cancelling", key: "feat-anc", slug: "active-noise-cancelling", dataType: "boolean", category: "feature", defaultGroup: "Audio", isFilterable: true, isComparable: true },
    { label: "Aerospace Titanium", key: "mat-titanium", slug: "aerospace-titanium", dataType: "boolean", category: "material", defaultGroup: "Design", isFilterable: true, isComparable: true },
    { label: "IP68 Water Resistant", key: "cert-ip68", slug: "ip68-water-resistant", dataType: "boolean", category: "certification", defaultGroup: "Durability", isFilterable: true, isComparable: true }
  ];
  const attributeMap = {};
  const attrLabelMap = {};
  const attrUnitMap = {};
  const attrGroupMap = {};
  for (const a of attributesData) {
    const doc = await payload.create({
      collection: "attributes",
      data: a,
      overrideAccess: true
    });
    const docId = String(doc.id);
    attributeMap[a.slug] = docId;
    if (a.key) attributeMap[a.key] = docId;
    const labelStr = typeof a.label === "string" ? a.label : a.label?.en || a.key || a.slug;
    attrLabelMap[a.key || a.slug] = labelStr;
    if (a.unit) attrUnitMap[a.key || a.slug] = a.unit;
    if (a.defaultGroup) attrGroupMap[a.key || a.slug] = a.defaultGroup;
  }
  const classesData = [
    {
      name: "Power Bank",
      slug: "power-bank",
      icon: "battery",
      description: "Portable external battery packs, MagSafe wireless chargers, and fast-charge power banks.",
      groups: [
        {
          name: "Battery & Capacity",
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap["capacity"] || attributeMap["battery_capacity"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["battery_type"], isRequired: true, displayOrder: 2 }
          ].filter((it) => Boolean(it.attribute))
        },
        {
          name: "Power & Fast Charging",
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap["total_output"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["fast_charging_tech"], isRequired: false, displayOrder: 2 }
          ].filter((it) => Boolean(it.attribute))
        }
      ]
    },
    {
      name: "Smartphone",
      slug: "smartphone",
      icon: "smartphone",
      description: "Flagship and premium smartphones, Android & iOS devices.",
      groups: [
        {
          name: "Display & Visuals",
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap["screen_size"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["display_tech"], isRequired: false, displayOrder: 2 },
            { attribute: attributeMap["refresh_rate"], isRequired: false, displayOrder: 3 }
          ].filter((it) => Boolean(it.attribute))
        },
        {
          name: "Performance & Storage",
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap["processor"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["ram"], isRequired: true, displayOrder: 2 },
            { attribute: attributeMap["storage"], isRequired: true, displayOrder: 3 }
          ].filter((it) => Boolean(it.attribute))
        },
        {
          name: "Battery & Power",
          displayOrder: 3,
          attributes: [
            { attribute: attributeMap["battery_capacity"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["charging_wattage"], isRequired: false, displayOrder: 2 }
          ].filter((it) => Boolean(it.attribute))
        },
        {
          name: "Connectivity & System",
          displayOrder: 4,
          attributes: [
            { attribute: attributeMap["cellular_network"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["operating_system"], isRequired: true, displayOrder: 2 },
            { attribute: attributeMap["water_resistance"], isRequired: false, displayOrder: 3 }
          ].filter((it) => Boolean(it.attribute))
        }
      ]
    },
    {
      name: "Headphones & Earbuds",
      slug: "headphones",
      icon: "headphones",
      description: "Over-ear headphones, noise cancelling acoustics, and true wireless stereo (TWS) earbuds.",
      groups: [
        {
          name: "Acoustics & Design",
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap["type"] || attributeMap["headphone-form-factor"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["noise_cancellation"], isRequired: true, displayOrder: 2 }
          ].filter((it) => Boolean(it.attribute))
        },
        {
          name: "Battery & Connectivity",
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap["connectivity"] || attributeMap["wireless-connectivity"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["battery_life"], isRequired: true, displayOrder: 2 },
            { attribute: attributeMap["water_resistance"], isRequired: false, displayOrder: 3 }
          ].filter((it) => Boolean(it.attribute))
        }
      ]
    },
    {
      name: "Laptop & Computer",
      slug: "laptop",
      icon: "laptop",
      description: "Pro laptops, MacBooks, and creator workstations.",
      groups: [
        {
          name: "Display & Graphics",
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap["screen_size"], isRequired: true, displayOrder: 1 }
          ].filter((it) => Boolean(it.attribute))
        },
        {
          name: "Processor & Memory",
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap["cpu"] || attributeMap["processor"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["ram"], isRequired: true, displayOrder: 2 },
            { attribute: attributeMap["storage"], isRequired: true, displayOrder: 3 }
          ].filter((it) => Boolean(it.attribute))
        }
      ]
    },
    {
      name: "Smartwatch",
      slug: "smartwatch",
      icon: "watch",
      description: "Adventure smartwatches, health trackers, and wearable tech.",
      groups: [
        {
          name: "Display & Enclosure",
          displayOrder: 1,
          attributes: [
            { attribute: attributeMap["display_type"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["case_material"], isRequired: false, displayOrder: 2 }
          ].filter((it) => Boolean(it.attribute))
        },
        {
          name: "Battery & Durability",
          displayOrder: 2,
          attributes: [
            { attribute: attributeMap["battery_life"], isRequired: true, displayOrder: 1 },
            { attribute: attributeMap["water_resistance"], isRequired: true, displayOrder: 2 }
          ].filter((it) => Boolean(it.attribute))
        }
      ]
    }
  ];
  const classMap = {};
  const classParamsMap = {};
  for (const c of classesData) {
    const doc = await payload.create({
      collection: "classes",
      data: c,
      overrideAccess: true
    });
    classMap[c.slug] = String(doc.id);
    classParamsMap[c.slug] = {};
    if (Array.isArray(c.groups)) {
      for (const g of c.groups) {
        if (Array.isArray(g.attributes)) {
          for (const item of g.attributes) {
            for (const [key, id] of Object.entries(attributeMap)) {
              if (id === item.attribute) {
                classParamsMap[c.slug][key] = {
                  label: attrLabelMap[key] || key,
                  unit: attrUnitMap[key] || "",
                  group: typeof g.name === "string" ? g.name : g.name?.en || "General"
                };
              }
            }
          }
        }
      }
    }
  }
  const productsToSeed = [
    // ── PHONES & TABLETS (Apple, Samsung, Pixel, Xiaomi, OnePlus) ──
    {
      name: "Apple iPhone 16 Pro Max",
      slug: "apple-iphone-16-pro-max",
      categorySlug: "phones-tablets",
      brandSlug: "apple",
      classSlug: "smartphone",
      specifications: [
        { key: "screen_size", value: "6.9" },
        { key: "display_tech", value: "ltpo-retina-xdr" },
        { key: "refresh_rate", value: "120hz" },
        { key: "processor", value: "apple-a18-pro" },
        { key: "ram", value: "8gb" },
        { key: "storage", value: "256gb" },
        { key: "battery_capacity", value: "4685mah" },
        { key: "charging_wattage", value: "30" },
        { key: "cellular_network", value: "5g" },
        { key: "operating_system", value: "ios-18" },
        { key: "water_resistance", value: "ip68" },
        // Ad-hoc Custom Specification
        { key: "camera_control_btn", label: "Camera Control Sensor", value: "Sapphire Crystal Capacitive Switch with Force Sensor", group: "Advanced Controls", isCustom: true },
        // Ad-hoc Global Attribute
        { key: "case_material", value: "aerospace-titanium", group: "Build & Material", isAdHoc: true }
      ],
      basePrice: 172e3,
      compareAtPrice: 185e3,
      saleDisplayMode: "strike_and_badge",
      featured: true,
      imageKey: "category-electronics-1",
      tags: ["iPhone", "Apple", "A18 Pro", "Flagship", "5G", "Titanium"],
      description: "Apple iPhone 16 Pro Max featuring grade 5 titanium design, A18 Pro chip, 48MP Fusion camera system with 5x optical telephoto, Camera Control button, and incredible battery life.",
      variants: [
        { name: "256GB / Natural Titanium (Dual eSIM)", price: 172e3, compareAtPrice: 185e3, options: [{ name: "Storage", value: "256GB" }, { name: "Color", value: "Natural Titanium" }, { name: "SIM", value: "Dual eSIM" }], stockQty: 18 },
        { name: "256GB / Desert Titanium (Dual eSIM)", price: 174e3, compareAtPrice: 188e3, options: [{ name: "Storage", value: "256GB" }, { name: "Color", value: "Desert Titanium" }, { name: "SIM", value: "Dual eSIM" }], stockQty: 22 },
        { name: "512GB / Natural Titanium (Dual eSIM)", price: 198e3, compareAtPrice: 21e4, options: [{ name: "Storage", value: "512GB" }, { name: "Color", value: "Natural Titanium" }, { name: "SIM", value: "Dual eSIM" }], stockQty: 12 },
        { name: "512GB / Black Titanium (Physical Dual SIM)", price: 204e3, compareAtPrice: 215e3, options: [{ name: "Storage", value: "512GB" }, { name: "Color", value: "Black Titanium" }, { name: "SIM", value: "Physical Dual SIM" }], stockQty: 14 },
        { name: "1TB / Desert Titanium (Physical Dual SIM)", price: 228e3, compareAtPrice: 245e3, options: [{ name: "Storage", value: "1TB" }, { name: "Color", value: "Desert Titanium" }, { name: "SIM", value: "Physical Dual SIM" }], stockQty: 8 }
      ]
    },
    {
      name: "Apple iPhone 16",
      slug: "apple-iphone-16",
      categorySlug: "phones-tablets",
      brandSlug: "apple",
      classSlug: "smartphone",
      specifications: [
        { key: "screen_size", value: "6.1" },
        { key: "processor", value: "apple-a18" },
        { key: "ram", value: "8gb" },
        { key: "storage", value: "128gb" },
        { key: "battery_capacity", value: "3561mah" },
        { key: "cellular_network", value: "5g" },
        { key: "operating_system", value: "ios-18" },
        { key: "case_material", value: "recycled-aluminum", group: "Build & Material", isAdHoc: true }
      ],
      basePrice: 112e3,
      compareAtPrice: 12e4,
      featured: true,
      imageKey: "category-electronics-1",
      tags: ["iPhone", "Apple", "A18", "5G"],
      description: "The standard iPhone 16 with Action button, 48MP 2-in-1 Fusion camera, spatial capture, and colorful infused back glass.",
      variants: [
        { name: "128GB / Ultramarine", price: 112e3, compareAtPrice: 12e4, options: [{ name: "Storage", value: "128GB" }, { name: "Color", value: "Ultramarine" }], stockQty: 20 },
        { name: "128GB / Teal", price: 112e3, compareAtPrice: 12e4, options: [{ name: "Storage", value: "128GB" }, { name: "Color", value: "Teal" }], stockQty: 15 },
        { name: "256GB / Black", price: 128e3, compareAtPrice: 136e3, options: [{ name: "Storage", value: "256GB" }, { name: "Color", value: "Black" }], stockQty: 18 }
      ]
    },
    {
      name: "Samsung Galaxy S24 Ultra 5G",
      slug: "samsung-galaxy-s24-ultra",
      categorySlug: "phones-tablets",
      brandSlug: "samsung",
      classSlug: "smartphone",
      specifications: [
        { key: "screen_size", value: "6.8" },
        { key: "display_tech", value: "dynamic-amoled-2x" },
        { key: "refresh_rate", value: "120hz" },
        { key: "processor", value: "snapdragon-8-gen-3" },
        { key: "ram", value: "12gb" },
        { key: "storage", value: "256gb" },
        { key: "battery_capacity", value: "5000mah" },
        { key: "cellular_network", value: "5g" },
        { key: "operating_system", value: "android-14" },
        { key: "water_resistance", value: "ip68" },
        // Ad-hoc Custom Specification
        { key: "spen_latency", label: "S-Pen Digitizer Latency", value: "2.8ms Ultra-Low Latency", unit: "ms", group: "Productivity & Pen", isCustom: true },
        // Ad-hoc Global Attribute
        { key: "case_material", value: "aerospace-titanium", group: "Build & Material", isAdHoc: true }
      ],
      basePrice: 148e3,
      compareAtPrice: 162e3,
      featured: true,
      imageKey: "category-electronics-1",
      tags: ["Samsung", "Galaxy AI", "Snapdragon 8 Gen 3", "S-Pen", "200MP"],
      description: "Samsung Galaxy S24 Ultra with Galaxy AI, titanium frame, flat Dynamic AMOLED 2X 120Hz display, and built-in S Pen.",
      variants: [
        { name: "12GB/256GB / Titanium Gray", price: 148e3, compareAtPrice: 162e3, options: [{ name: "RAM/Storage", value: "12GB/256GB" }, { name: "Color", value: "Titanium Gray" }], stockQty: 16 },
        { name: "12GB/256GB / Titanium Black", price: 148e3, compareAtPrice: 162e3, options: [{ name: "RAM/Storage", value: "12GB/256GB" }, { name: "Color", value: "Titanium Black" }], stockQty: 14 },
        { name: "12GB/512GB / Titanium Violet", price: 165e3, compareAtPrice: 178e3, options: [{ name: "RAM/Storage", value: "12GB/512GB" }, { name: "Color", value: "Titanium Violet" }], stockQty: 10 }
      ]
    },
    {
      name: "Google Pixel 9 Pro XL",
      slug: "google-pixel-9-pro-xl",
      categorySlug: "phones-tablets",
      brandSlug: "google-pixel",
      classSlug: "smartphone",
      specifications: [
        { key: "screen_size", value: "6.8" },
        { key: "display_tech", value: "ltpo-oled" },
        { key: "refresh_rate", value: "120hz" },
        { key: "processor", value: "google-tensor-g4" },
        { key: "ram", value: "16gb" },
        { key: "storage", value: "128gb" },
        { key: "battery_capacity", value: "5060mah" },
        { key: "cellular_network", value: "5g" },
        { key: "operating_system", value: "android-14" },
        { key: "water_resistance", value: "ip68" },
        // Ad-hoc Custom Specification
        { key: "ai_coprocessor", label: "AI Tensor Processing", value: "Gemini Nano On-Device Multimodal Engine", group: "AI & Intelligence", isCustom: true }
      ],
      basePrice: 135e3,
      compareAtPrice: 145e3,
      featured: true,
      imageKey: "category-electronics-1",
      tags: ["Google", "Pixel", "Tensor G4", "AI", "Pure Android"],
      description: "Google Pixel 9 Pro XL featuring Google Tensor G4, Super Actua display, pro triple camera system with 8K Video Boost.",
      variants: [
        { name: "16GB/128GB / Obsidian", price: 135e3, compareAtPrice: 145e3, options: [{ name: "RAM/Storage", value: "16GB/128GB" }, { name: "Color", value: "Obsidian" }], stockQty: 12 },
        { name: "16GB/256GB / Porcelain", price: 148e3, compareAtPrice: 158e3, options: [{ name: "RAM/Storage", value: "16GB/256GB" }, { name: "Color", value: "Porcelain" }], stockQty: 14 }
      ]
    },
    {
      name: "Xiaomi 14 Ultra 5G (Leica Optics)",
      slug: "xiaomi-14-ultra-5g",
      categorySlug: "phones-tablets",
      brandSlug: "xiaomi",
      classSlug: "smartphone",
      specifications: [
        { key: "screen_size", value: "6.73" },
        { key: "processor", value: "snapdragon-8-gen-3" },
        { key: "ram", value: "16gb" },
        { key: "storage", value: "512gb" },
        { key: "battery_capacity", value: "5000mah" },
        { key: "cellular_network", value: "5g" },
        { key: "operating_system", value: "android-14" }
      ],
      basePrice: 135e3,
      compareAtPrice: 148e3,
      featured: true,
      imageKey: "category-electronics-1",
      tags: ["Xiaomi", "Leica", "Snapdragon 8 Gen 3", "Photography"],
      description: "The pinnacle of mobile photography: Leica Quad 50MP optical system, stepless variable aperture, 2K AMOLED C8 display, and 90W HyperCharge.",
      variants: [
        { name: "16GB/512GB / Black Leather", price: 135e3, compareAtPrice: 148e3, options: [{ name: "RAM/Storage", value: "16GB/512GB" }, { name: "Color", value: "Black Vegan Leather" }], stockQty: 12 },
        { name: "16GB/512GB / White Ceramic", price: 138e3, compareAtPrice: 152e3, options: [{ name: "RAM/Storage", value: "16GB/512GB" }, { name: "Color", value: "White Ceramic" }], stockQty: 8 }
      ]
    },
    {
      name: "OnePlus 12 5G (Hasselblad Camera)",
      slug: "oneplus-12-5g",
      categorySlug: "phones-tablets",
      brandSlug: "oneplus",
      classSlug: "smartphone",
      specifications: [
        { key: "screen_size", value: "6.82" },
        { key: "processor", value: "snapdragon-8-gen-3" },
        { key: "ram", value: "16gb" },
        { key: "storage", value: "512gb" },
        { key: "battery_capacity", value: "5000mah" },
        { key: "cellular_network", value: "5g" },
        { key: "operating_system", value: "android-14" }
      ],
      basePrice: 92e3,
      compareAtPrice: 99e3,
      imageKey: "category-electronics-1",
      tags: ["OnePlus", "Snapdragon 8 Gen 3", "Hasselblad", "100W SuperVOOC"],
      description: "Smooth beyond belief: Snapdragon 8 Gen 3, 4th Gen Hasselblad Camera with 64MP 3x periscope, 2K 120Hz ProXDR display, and 5400mAh battery.",
      variants: [
        { name: "16GB/512GB / Flowy Emerald", price: 92e3, compareAtPrice: 99e3, options: [{ name: "RAM/Storage", value: "16GB/512GB" }, { name: "Color", value: "Flowy Emerald" }], stockQty: 15 },
        { name: "16GB/512GB / Silky Black", price: 92e3, compareAtPrice: 99e3, options: [{ name: "RAM/Storage", value: "16GB/512GB" }, { name: "Color", value: "Silky Black" }], stockQty: 18 }
      ]
    },
    {
      name: "Google Pixel 8a (AI Magic)",
      slug: "google-pixel-8a",
      categorySlug: "phones-tablets",
      brandSlug: "google-pixel",
      classSlug: "smartphone",
      specifications: [
        { key: "screen_size", value: "6.1" },
        { key: "processor", value: "google-tensor-g4" },
        { key: "ram", value: "8gb" },
        { key: "storage", value: "128gb" },
        { key: "battery_capacity", value: "4685mah" },
        { key: "cellular_network", value: "5g" },
        { key: "operating_system", value: "android-14" }
      ],
      basePrice: 58e3,
      compareAtPrice: 64e3,
      imageKey: "category-electronics-1",
      tags: ["Google Pixel", "Tensor G3", "Best Take", "Budget Flagship"],
      description: "Delightful Google AI experiences at an accessible price: Tensor G3, Actua 120Hz display, Best Take, Magic Editor, and 7 years of software support.",
      variants: [
        { name: "8GB/128GB / Bay Blue", price: 58e3, compareAtPrice: 64e3, options: [{ name: "Color", value: "Bay Blue" }], stockQty: 16 },
        { name: "8GB/128GB / Obsidian", price: 58e3, compareAtPrice: 64e3, options: [{ name: "Color", value: "Obsidian" }], stockQty: 14 }
      ]
    },
    {
      name: 'Apple iPad Pro 13" (M4 Chip)',
      slug: "apple-ipad-pro-13-m4",
      categorySlug: "phones-tablets",
      brandSlug: "apple",
      basePrice: 165e3,
      compareAtPrice: 178e3,
      featured: true,
      imageKey: "category-electronics-1",
      tags: ["iPad", "Apple M4", "OLED", "Pro"],
      description: "The impossibly thin iPad Pro with breakthrough Ultra Retina XDR Tandem OLED display and outrageous Apple M4 chip performance.",
      variants: [
        { name: "256GB Wi-Fi / Space Black", price: 165e3, compareAtPrice: 178e3, options: [{ name: "Storage", value: "256GB" }, { name: "Color", value: "Space Black" }], stockQty: 12 },
        { name: "512GB Wi-Fi + Cellular / Space Black", price: 215e3, compareAtPrice: 228e3, options: [{ name: "Storage", value: "512GB" }, { name: "Color", value: "Space Black" }], stockQty: 6 }
      ]
    },
    {
      name: 'Apple iPad Air 11" (M2 Chip)',
      slug: "apple-ipad-air-11-m2",
      categorySlug: "phones-tablets",
      brandSlug: "apple",
      basePrice: 82e3,
      compareAtPrice: 89e3,
      imageKey: "category-electronics-1",
      tags: ["iPad Air", "Apple M2", "Liquid Retina"],
      description: "Redesigned iPad Air 11-inch supercharged by the Apple M2 chip, Liquid Retina display, and landscape front camera.",
      variants: [
        { name: "128GB Wi-Fi / Space Gray", price: 82e3, compareAtPrice: 89e3, options: [{ name: "Storage", value: "128GB" }, { name: "Color", value: "Space Gray" }], stockQty: 18 },
        { name: "256GB Wi-Fi / Blue", price: 98e3, compareAtPrice: 105e3, options: [{ name: "Storage", value: "256GB" }, { name: "Color", value: "Blue" }], stockQty: 10 }
      ]
    },
    // ── LAPTOPS & MACBOOKS ──
    {
      name: 'Apple MacBook Pro 16" (M3 Max Chip)',
      slug: "apple-macbook-pro-16-m3-max",
      categorySlug: "laptops-macbooks",
      brandSlug: "apple",
      classSlug: "laptop",
      specifications: [
        { key: "screen_size", value: "16.2" },
        { key: "cpu", value: "apple-m3-max" },
        { key: "ram", value: "36gb" },
        { key: "storage", value: "512gb-ssd" }
      ],
      basePrice: 385e3,
      compareAtPrice: 415e3,
      featured: true,
      imageKey: "category-creator-studio-1",
      tags: ["MacBook Pro", "M3 Max", "Apple Silicon", "Space Black"],
      description: "The pinnacle of laptop power: Apple MacBook Pro 16-inch with M3 Max 16-core CPU, 40-core GPU, Liquid Retina XDR display and 22 hours of battery life.",
      variants: [
        { name: "36GB RAM / 512GB SSD / Space Black", price: 385e3, compareAtPrice: 415e3, options: [{ name: "Memory", value: "36GB Unified" }, { name: "Storage", value: "512GB SSD" }], stockQty: 8 },
        { name: "48GB RAM / 1TB SSD / Space Black", price: 445e3, compareAtPrice: 475e3, options: [{ name: "Memory", value: "48GB Unified" }, { name: "Storage", value: "1TB SSD" }], stockQty: 6 }
      ]
    },
    {
      name: 'Apple MacBook Air 15" (M3 Chip)',
      slug: "apple-macbook-air-15-m3",
      categorySlug: "laptops-macbooks",
      brandSlug: "apple",
      classSlug: "laptop",
      specifications: [
        { key: "screen_size", value: "15.3" },
        { key: "cpu", value: "apple-m3" },
        { key: "ram", value: "16gb" },
        { key: "storage", value: "512gb-ssd" }
      ],
      basePrice: 168e3,
      compareAtPrice: 18e4,
      featured: true,
      imageKey: "category-creator-studio-1",
      tags: ["MacBook Air", "M3", "Midnight", "Lightweight"],
      description: "Strikingly thin, fast, and spacious: MacBook Air 15-inch with M3 chip, Liquid Retina display, MagSafe 3, and silent fanless design.",
      variants: [
        { name: "8GB / 256GB / Midnight", price: 168e3, compareAtPrice: 18e4, options: [{ name: "Memory", value: "8GB" }, { name: "Color", value: "Midnight" }], stockQty: 15 },
        { name: "16GB / 512GB / Starlight", price: 198e3, compareAtPrice: 21e4, options: [{ name: "Memory", value: "16GB" }, { name: "Color", value: "Starlight" }], stockQty: 12 }
      ]
    },
    {
      name: 'Apple MacBook Air 13" (M2 Chip)',
      slug: "apple-macbook-air-13-m2",
      categorySlug: "laptops-macbooks",
      brandSlug: "apple",
      classSlug: "laptop",
      specifications: [
        { key: "screen_size", value: "13.6" },
        { key: "cpu", value: "apple-m3" },
        { key: "ram", value: "16gb" },
        { key: "storage", value: "512gb-ssd" }
      ],
      basePrice: 118e3,
      compareAtPrice: 128e3,
      imageKey: "category-creator-studio-1",
      tags: ["MacBook Air", "M2", "Apple Silicon"],
      description: "Portable, powerful everyday MacBook Air with 13.6-inch Liquid Retina display, 1080p FaceTime HD camera and all-day battery.",
      variants: [
        { name: "8GB / 256GB / Space Gray", price: 118e3, compareAtPrice: 128e3, options: [{ name: "Color", value: "Space Gray" }], stockQty: 22 },
        { name: "16GB / 512GB / Silver", price: 146e3, compareAtPrice: 156e3, options: [{ name: "Color", value: "Silver" }], stockQty: 15 }
      ]
    },
    {
      name: "Asus ROG Strix SCAR 18 (2024)",
      slug: "asus-rog-strix-scar-18",
      categorySlug: "laptops-macbooks",
      brandSlug: "asus-rog",
      classSlug: "laptop",
      specifications: [
        { key: "screen_size", value: "18.0" },
        { key: "cpu", value: "intel-ultra-9" },
        { key: "ram", value: "32gb" },
        { key: "storage", value: "2tb-ssd" }
      ],
      basePrice: 425e3,
      compareAtPrice: 46e4,
      imageKey: "category-creator-studio-1",
      tags: ["ROG", "Gaming Laptop", "RTX 4090", "Core i9"],
      description: "Dominating flagship gaming beast: Intel Core i9-14900HX, NVIDIA GeForce RTX 4090 16GB, 18-inch Mini LED 240Hz Nebula HDR display.",
      variants: [
        { name: "Core i9 / RTX 4090 / 32GB / 2TB SSD", price: 425e3, compareAtPrice: 46e4, options: [{ name: "Configuration", value: "i9-14900HX / RTX 4090 / 32GB / 2TB" }], stockQty: 6 }
      ]
    },
    // ── WATCHES & WEARABLES ──
    {
      name: "Apple Watch Ultra 2 (49mm Titanium)",
      slug: "apple-watch-ultra-2",
      categorySlug: "watches-wearables",
      brandSlug: "apple",
      classSlug: "smartwatch",
      specifications: [
        { key: "display_type", value: "ltpo-oled" },
        { key: "battery_life", value: "72" },
        { key: "water_resistance", value: "100m-dive" },
        { key: "case_material", value: "aerospace-titanium" }
      ],
      basePrice: 98e3,
      compareAtPrice: 108e3,
      featured: true,
      imageKey: "category-office-gear-1",
      tags: ["Apple Watch", "Ultra 2", "Titanium"],
      description: "The ultimate sports and adventure watch: 49mm aerospace-grade titanium case, precision dual-frequency GPS, up to 72h battery.",
      variants: [
        { name: "49mm / Natural Titanium / Orange Ocean Band", price: 98e3, compareAtPrice: 108e3, options: [{ name: "Band", value: "Orange Ocean Band" }], stockQty: 14 },
        { name: "49mm / Black Titanium / Dark Trail Loop", price: 105e3, compareAtPrice: 115e3, options: [{ name: "Band", value: "Dark Trail Loop" }], stockQty: 10 }
      ]
    },
    {
      name: "Apple Watch Series 10 (46mm)",
      slug: "apple-watch-series-10",
      categorySlug: "watches-wearables",
      brandSlug: "apple",
      classSlug: "smartwatch",
      specifications: [
        { key: "display_type", value: "ltpo-oled" },
        { key: "battery_life", value: "18" },
        { key: "water_resistance", value: "50m-swim" },
        { key: "case_material", value: "recycled-aluminum" }
      ],
      basePrice: 58e3,
      compareAtPrice: 64e3,
      featured: true,
      imageKey: "category-office-gear-1",
      tags: ["Apple Watch", "Series 10", "OLED"],
      description: "Thinnest Apple Watch ever with the biggest wide-angle OLED display, sleep apnea notifications, and fast charging.",
      variants: [
        { name: "46mm GPS / Jet Black Aluminum", price: 58e3, compareAtPrice: 64e3, options: [{ name: "Color", value: "Jet Black" }], stockQty: 20 },
        { name: "46mm GPS + Cellular / Natural Titanium", price: 88e3, compareAtPrice: 96e3, options: [{ name: "Color", value: "Natural Titanium" }], stockQty: 8 }
      ]
    },
    {
      name: "Samsung Galaxy Watch Ultra (47mm)",
      slug: "samsung-galaxy-watch-ultra",
      categorySlug: "watches-wearables",
      brandSlug: "samsung",
      classSlug: "smartwatch",
      specifications: [
        { key: "display_type", value: "super-amoled" },
        { key: "battery_life", value: "60" },
        { key: "water_resistance", value: "100m-dive" },
        { key: "case_material", value: "aerospace-titanium" }
      ],
      basePrice: 72e3,
      compareAtPrice: 79e3,
      imageKey: "category-office-gear-1",
      tags: ["Samsung", "Galaxy Watch", "Titanium"],
      description: "Galaxy Watch Ultra with cushion titanium design, 10ATM water resistance, dual-frequency GPS, and BioActive sensor.",
      variants: [
        { name: "47mm LTE / Titanium Gray", price: 72e3, compareAtPrice: 79e3, options: [{ name: "Color", value: "Titanium Gray" }], stockQty: 12 }
      ]
    },
    // ── AUDIO & SOUND ──
    {
      name: "Apple AirPods Pro (2nd Gen USB-C)",
      slug: "apple-airpods-pro-2-usb-c",
      categorySlug: "audio-sound",
      brandSlug: "apple",
      classSlug: "headphones",
      specifications: [
        { key: "type", value: "in-ear" },
        { key: "connectivity", value: "bluetooth-5-3" },
        { key: "battery_life", value: "30" },
        { key: "noise_cancellation", value: "adaptive-anc" },
        { key: "water_resistance", value: "ip54" }
      ],
      basePrice: 26500,
      compareAtPrice: 29500,
      featured: true,
      imageKey: "sv-demo-earbuds",
      tags: ["AirPods Pro", "ANC", "Spatial Audio", "USB-C"],
      description: "Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, and USB-C MagSafe case with Precision Finding.",
      variants: [
        { name: "AirPods Pro (2nd Gen with USB-C Case)", price: 26500, compareAtPrice: 29500, options: [{ name: "Model", value: "USB-C MagSafe Case" }], stockQty: 45 }
      ]
    },
    {
      name: "Apple AirPods Max (USB-C Edition)",
      slug: "apple-airpods-max-usb-c",
      categorySlug: "audio-sound",
      brandSlug: "apple",
      classSlug: "headphones",
      specifications: [
        { key: "type", value: "over-ear" },
        { key: "connectivity", value: "bluetooth-5-3" },
        { key: "battery_life", value: "20" },
        { key: "noise_cancellation", value: "anc" },
        { key: "water_resistance", value: "none" }
      ],
      basePrice: 68e3,
      compareAtPrice: 75e3,
      featured: true,
      imageKey: "sv-demo-earbuds",
      tags: ["AirPods Max", "Over-Ear", "Hi-Res", "USB-C"],
      description: "Over-ear headphones reimagined: high-fidelity audio, Pro-level Active Noise Cancellation, and USB-C lossless support.",
      variants: [
        { name: "Midnight", price: 68e3, compareAtPrice: 75e3, options: [{ name: "Color", value: "Midnight" }], stockQty: 10 },
        { name: "Starlight", price: 68e3, compareAtPrice: 75e3, options: [{ name: "Color", value: "Starlight" }], stockQty: 8 }
      ]
    },
    {
      name: "Sony WH-1000XM5 Wireless Headphones",
      slug: "sony-wh-1000xm5",
      categorySlug: "audio-sound",
      brandSlug: "sony",
      classSlug: "headphones",
      specifications: [
        { key: "type", value: "over-ear" },
        { key: "connectivity", value: "bluetooth-5-2" },
        { key: "battery_life", value: "30" },
        { key: "noise_cancellation", value: "anc" },
        { key: "water_resistance", value: "none" }
      ],
      basePrice: 38500,
      compareAtPrice: 43e3,
      featured: true,
      imageKey: "sv-demo-earbuds",
      tags: ["Sony", "Noise Cancelling", "LDAC", "Hi-Res Audio"],
      description: "Industry-leading noise cancellation with two processors and eight microphones. Exceptional sound quality with LDAC and 30h battery.",
      variants: [
        { name: "Black", price: 38500, compareAtPrice: 43e3, options: [{ name: "Color", value: "Black" }], stockQty: 22 },
        { name: "Silver", price: 38500, compareAtPrice: 43e3, options: [{ name: "Color", value: "Silver" }], stockQty: 18 }
      ]
    },
    {
      name: "Samsung Galaxy Buds3 Pro (AI Interpreter)",
      slug: "samsung-galaxy-buds3-pro",
      categorySlug: "audio-sound",
      brandSlug: "samsung",
      classSlug: "headphones",
      specifications: [
        { key: "type", value: "in-ear" },
        { key: "connectivity", value: "bluetooth-5-3" },
        { key: "battery_life", value: "30" },
        { key: "noise_cancellation", value: "adaptive-anc" },
        { key: "water_resistance", value: "ip54" }
      ],
      basePrice: 23e3,
      compareAtPrice: 26e3,
      imageKey: "sv-demo-earbuds",
      tags: ["Samsung", "Buds3 Pro", "AI", "24-bit Hi-Fi"],
      description: "Innovative blade design with iconic Blade Lights, 24-bit 96kHz Hi-Fi audio with 2-way woofer & planar tweeter, and Galaxy AI real-time voice translation.",
      variants: [
        { name: "Silver Blade", price: 23e3, compareAtPrice: 26e3, options: [{ name: "Color", value: "Silver" }], stockQty: 24 },
        { name: "White Blade", price: 23e3, compareAtPrice: 26e3, options: [{ name: "Color", value: "White" }], stockQty: 20 }
      ]
    },
    {
      name: "OnePlus Buds Pro 3 (Dynaudio Co-Created)",
      slug: "oneplus-buds-pro-3",
      categorySlug: "audio-sound",
      brandSlug: "oneplus",
      classSlug: "headphones",
      specifications: [
        { key: "type", value: "in-ear" },
        { key: "connectivity", value: "bluetooth-5-3" },
        { key: "battery_life", value: "43" },
        { key: "noise_cancellation", value: "adaptive-anc" },
        { key: "water_resistance", value: "ip54" }
      ],
      basePrice: 18500,
      compareAtPrice: 21e3,
      imageKey: "sv-demo-earbuds",
      tags: ["OnePlus", "Dynaudio", "50dB ANC", "Spatial Audio"],
      description: "Co-created with Dynaudio master acoustics: dual drivers with dual DACs, 50dB adaptive noise cancellation, leatherette charging case, and 43h playback.",
      variants: [
        { name: "Midnight Opus", price: 18500, compareAtPrice: 21e3, options: [{ name: "Color", value: "Midnight Opus" }], stockQty: 25 },
        { name: "Lunar Radiance", price: 18500, compareAtPrice: 21e3, options: [{ name: "Color", value: "Lunar Radiance" }], stockQty: 18 }
      ]
    },
    {
      name: "Bose QuietComfort Ultra Headphones",
      slug: "bose-quietcomfort-ultra",
      categorySlug: "audio-sound",
      brandSlug: "bose",
      classSlug: "headphones",
      specifications: [
        { key: "type", value: "over-ear" },
        { key: "connectivity", value: "bluetooth-5-3" },
        { key: "battery_life", value: "24" },
        { key: "noise_cancellation", value: "anc" },
        { key: "water_resistance", value: "none" }
      ],
      basePrice: 46e3,
      compareAtPrice: 52e3,
      imageKey: "sv-demo-earbuds",
      tags: ["Bose", "QuietComfort", "Immersive Audio"],
      description: "World-class noise cancellation, breakthrough spatialized audio with Bose Immersive Audio, and ultra-comfortable plush ear cushions.",
      variants: [
        { name: "Black", price: 46e3, compareAtPrice: 52e3, options: [{ name: "Color", value: "Black" }], stockQty: 14 }
      ]
    },
    {
      name: "Marshall Stanmore III Bluetooth Speaker",
      slug: "marshall-stanmore-iii",
      categorySlug: "audio-sound",
      brandSlug: "marshall",
      basePrice: 48500,
      compareAtPrice: 54e3,
      featured: true,
      imageKey: "sv-usb-condenser-mic-pro",
      tags: ["Marshall", "Home Speaker", "Vintage"],
      description: "The legendary middleweight home speaker: expansive Marshall signature sound, re-engineered soundstage, and brass control dials.",
      variants: [
        { name: "Black", price: 48500, compareAtPrice: 54e3, options: [{ name: "Color", value: "Black" }], stockQty: 16 },
        { name: "Cream", price: 49500, compareAtPrice: 55e3, options: [{ name: "Color", value: "Cream" }], stockQty: 12 }
      ]
    },
    {
      name: "Anker Soundcore Motion Boom Plus (80W)",
      slug: "anker-soundcore-motion-boom-plus",
      categorySlug: "audio-sound",
      brandSlug: "anker",
      basePrice: 16500,
      compareAtPrice: 19e3,
      imageKey: "sv-usb-condenser-mic-pro",
      tags: ["Anker", "Soundcore", "80W", "IP67 Waterproof"],
      description: "Monstrous 80W outdoor sound: titanium drivers, BassUp 2.0 technology, IP67 waterproof & dustproof rating, and 20-hour power bank playtime.",
      variants: [
        { name: "Black 80W Beast", price: 16500, compareAtPrice: 19e3, options: [{ name: "Color", value: "Black" }], stockQty: 30 }
      ]
    },
    // ── TV & HOME ENTERTAINMENT (Pickaboo & Apple Gadgets) ──
    {
      name: 'Sony BRAVIA XR 65" 4K OLED Google TV (A80L)',
      slug: "sony-bravia-xr-65-oled-a80l",
      categorySlug: "tv-entertainment",
      brandSlug: "sony",
      basePrice: 265e3,
      compareAtPrice: 295e3,
      featured: true,
      imageKey: "sv-dual-monitor-arm-pro",
      tags: ["Sony", "BRAVIA XR", "OLED", "4K120", "PlayStation 5 Ready"],
      description: "Cognitive Processor XR delivers pure OLED blacks, acoustic surface audio+ where the screen is the speaker, HDMI 2.1 4K/120Hz for PS5, and Google TV.",
      variants: [
        { name: "65-inch 4K OLED (Official Sony BD)", price: 265e3, compareAtPrice: 295e3, options: [{ name: "Screen Size", value: "65-inch" }], stockQty: 6 }
      ]
    },
    {
      name: 'Xiaomi Smart TV A Pro 55" 4K UHD Dolby Vision',
      slug: "xiaomi-smart-tv-a-pro-55",
      categorySlug: "tv-entertainment",
      brandSlug: "xiaomi",
      basePrice: 58e3,
      compareAtPrice: 65e3,
      featured: true,
      imageKey: "sv-dual-monitor-arm-plus",
      tags: ["Xiaomi", "Smart TV", "4K UHD", "Dolby Vision", "Google TV"],
      description: "Premium metallic bezel-less frame, vibrant 4K UHD display with Dolby Vision, DTS Virtual:X sound, and hands-free Google Assistant.",
      variants: [
        { name: "55-inch Metallic Bezel-less", price: 58e3, compareAtPrice: 65e3, options: [{ name: "Screen Size", value: "55-inch" }], stockQty: 14 }
      ]
    },
    {
      name: "Apple TV 4K 128GB (3rd Gen Wi-Fi + Ethernet)",
      slug: "apple-tv-4k-128gb-gen3",
      categorySlug: "tv-entertainment",
      brandSlug: "apple",
      basePrice: 24500,
      compareAtPrice: 27500,
      imageKey: "sv-router-ax3000-pro",
      tags: ["Apple TV", "A15 Bionic", "4K HDR", "Dolby Atmos"],
      description: "Cinematic experience in your living room: A15 Bionic chip, HDR10+, Dolby Vision, Dolby Atmos sound, Thread networking, and Siri Remote USB-C.",
      variants: [
        { name: "128GB Wi-Fi + Ethernet", price: 24500, compareAtPrice: 27500, options: [{ name: "Storage", value: "128GB Gigabit" }], stockQty: 20 }
      ]
    },
    // ── SMART HOME & APPLIANCES ──
    {
      name: "Xiaomi Robot Vacuum X20+ (All-in-One Station)",
      slug: "xiaomi-robot-vacuum-x20-plus",
      categorySlug: "smart-home-appliances",
      brandSlug: "xiaomi",
      basePrice: 54e3,
      compareAtPrice: 62e3,
      featured: true,
      imageKey: "sv-air-purifier-25m2-pro",
      tags: ["Xiaomi", "Robot Vacuum", "Smart Home", "LDS Navigation"],
      description: "Automated hands-free floor cleaning: 6000Pa extreme suction, dual rotating mop pads with auto-lifting, 10-second dust emptying, and auto mop washing/air drying.",
      variants: [
        { name: "All-in-One Smart Base (White)", price: 54e3, compareAtPrice: 62e3, options: [{ name: "Model", value: "Complete All-in-One" }], stockQty: 12 }
      ]
    },
    {
      name: "Dyson V12 Detect Slim Cordless Vacuum Cleaner",
      slug: "dyson-v12-detect-slim",
      categorySlug: "smart-home-appliances",
      brandSlug: "dyson",
      basePrice: 78e3,
      compareAtPrice: 88e3,
      featured: true,
      imageKey: "sv-air-purifier-25m2-plus",
      tags: ["Dyson", "V12 Detect", "Laser Slim", "Cordless"],
      description: "Dyson\u2019s lightest intelligent cordless vacuum: illuminated cleaner head reveals invisible dust, piezo sensor measures microscopic particles, single-button power control.",
      variants: [
        { name: "Nickel / Yellow Laser Slim Fluffy", price: 78e3, compareAtPrice: 88e3, options: [{ name: "Color", value: "Yellow / Iron" }], stockQty: 10 }
      ]
    },
    {
      name: "TP-Link Deco X50 AX3000 Whole Home Mesh Wi-Fi 6",
      slug: "tp-link-deco-x50-ax3000-mesh",
      categorySlug: "smart-home-appliances",
      brandSlug: "tp-link",
      basePrice: 22500,
      compareAtPrice: 26e3,
      imageKey: "sv-router-ax3000-pro",
      tags: ["TP-Link", "Deco", "Wi-Fi 6", "Mesh", "Gigabit"],
      description: "Dead-zone killer for multi-story homes and large apartments: AX3000 dual-band Wi-Fi 6, covers up to 6,500 sq ft, connects 150+ smart devices, AI-driven seamless roaming.",
      variants: [
        { name: "3-Pack Mesh System", price: 22500, compareAtPrice: 26e3, options: [{ name: "Package", value: "3-Pack Complete" }], stockQty: 18 }
      ]
    },
    // ── POWER & ACCESSORIES ──
    {
      name: "Anker Prime 27,650mAh Power Bank (250W)",
      slug: "anker-prime-27650mah-250w",
      categorySlug: "power-accessories",
      brandSlug: "anker",
      classSlug: "power-bank",
      specifications: [
        { key: "capacity", value: "30000mah" },
        { key: "battery_type", value: "lithium-ion" },
        { key: "total_output", value: "250W" },
        { key: "fast_charging_tech", value: "gan-prime" }
      ],
      basePrice: 18500,
      compareAtPrice: 21e3,
      featured: true,
      imageKey: "sv-portable-ssd-1tb-pro",
      tags: ["Anker", "Prime", "GaN", "250W", "Power Bank"],
      description: "Ultra-fast 250W multi-device fast charging power bank with smart digital display, Anker App connectivity, and airline approval.",
      variants: [
        { name: "Prime 27,650mAh 250W (Smart Display)", price: 18500, compareAtPrice: 21e3, options: [{ name: "Capacity", value: "27,650mAh / 250W" }], stockQty: 25 }
      ]
    },
    {
      name: "Anker 737 Power Bank (PowerCore 24K 140W)",
      slug: "anker-737-power-bank-24000mah",
      categorySlug: "power-accessories",
      brandSlug: "anker",
      classSlug: "power-bank",
      specifications: [
        { key: "capacity", value: "24000mah" },
        { key: "battery_type", value: "lithium-ion" },
        { key: "total_output", value: "140W" },
        { key: "fast_charging_tech", value: "power-delivery" }
      ],
      basePrice: 14500,
      compareAtPrice: 16500,
      featured: true,
      imageKey: "sv-portable-ssd-1tb-pro",
      tags: ["Anker", "Power Bank", "140W", "PD 3.1"],
      description: "Equipped with USB Power Delivery 3.1 and bi-directional technology to quickly recharge the portable charger or get a 140W ultra-powerful charge.",
      variants: [
        { name: "24,000mAh / 140W Fast Charge", price: 14500, compareAtPrice: 16500, options: [{ name: "Capacity", value: "24,000mAh" }], stockQty: 20 }
      ]
    },
    {
      name: "Baseus Blade HD 100W 20,000mAh Ultra-Slim Power Bank",
      slug: "baseus-blade-hd-100w-20000mah",
      categorySlug: "power-accessories",
      brandSlug: "anker",
      classSlug: "power-bank",
      specifications: [
        { key: "capacity", value: "20000mah" },
        { key: "battery_type", value: "lithium-polymer" },
        { key: "total_output", value: "100W" },
        { key: "fast_charging_tech", value: "power-delivery" }
      ],
      basePrice: 8900,
      compareAtPrice: 10500,
      imageKey: "sv-portable-ssd-1tb-pro",
      tags: ["Baseus", "Blade", "100W", "Ultra-Slim", "Power Bank"],
      description: "Ultra-thin 0.7-inch laptop power bank with 100W dual USB-C Power Delivery and digital status monitor.",
      variants: [
        { name: "20,000mAh / 100W Blade HD", price: 8900, compareAtPrice: 10500, options: [{ name: "Capacity", value: "20,000mAh" }], stockQty: 22 }
      ]
    },
    {
      name: "Anker 737 GaNPrime 120W Wall Charger",
      slug: "anker-737-ganprime-120w",
      categorySlug: "power-accessories",
      brandSlug: "anker",
      basePrice: 8500,
      compareAtPrice: 9800,
      imageKey: "sv-wall-charger-65w-pro",
      tags: ["Anker", "GaN", "120W", "Fast Charger"],
      description: "Power 3 devices simultaneously with 2 USB-C and 1 USB-A port using GaNPrime high efficiency architecture and ActiveShield 2.0 safety.",
      variants: [
        { name: "120W 3-Port (2C1A)", price: 8500, compareAtPrice: 9800, options: [{ name: "Ports", value: "2x USB-C + 1x USB-A" }], stockQty: 40 }
      ]
    },
    {
      name: "Apple MagSafe Battery Pack (USB-C)",
      slug: "apple-magsafe-battery-pack-usb-c",
      categorySlug: "power-accessories",
      brandSlug: "apple",
      classSlug: "power-bank",
      specifications: [
        { key: "capacity", value: "10000mah" },
        { key: "battery_type", value: "lithium-polymer" },
        { key: "total_output", value: "15W" },
        { key: "fast_charging_tech", value: "qi2-wireless" }
      ],
      basePrice: 12500,
      compareAtPrice: 14e3,
      imageKey: "sv-wall-charger-65w-pro",
      tags: ["MagSafe", "Apple", "Wireless Charger"],
      description: "Snap-on magnetic power for iPhone 12 through iPhone 16 with automatic wireless charging and iOS battery status integration.",
      variants: [
        { name: "White MagSafe", price: 12500, compareAtPrice: 14e3, options: [{ name: "Color", value: "White" }], stockQty: 30 }
      ]
    },
    {
      name: "Apple Pencil Pro",
      slug: "apple-pencil-pro",
      categorySlug: "power-accessories",
      brandSlug: "apple",
      basePrice: 17500,
      compareAtPrice: 19500,
      imageKey: "sv-notebook-set-3-pro",
      tags: ["Apple Pencil", "Pro", "Haptic", "Find My"],
      description: "Engineered for limitless creativity: squeeze gesture, barrel roll gyroscope, haptic feedback engine, and Find My tracking support.",
      variants: [
        { name: "White", price: 17500, compareAtPrice: 19500, options: [{ name: "Model", value: "Pencil Pro" }], stockQty: 25 }
      ]
    },
    // ── CAMERAS & DRONES ──
    {
      name: "DJI Mini 4 Pro Drone (Fly More Combo Plus)",
      slug: "dji-mini-4-pro-fly-more-plus",
      categorySlug: "cameras-drones",
      brandSlug: "dji",
      basePrice: 138e3,
      compareAtPrice: 152e3,
      featured: true,
      imageKey: "sv-ring-light-10in-pro",
      tags: ["DJI", "Drone", "4K60", "Omnidirectional Obstacle", "RC 2"],
      description: "Under 249g mini drone with omnidirectional active obstacle sensing, 4K/60fps HDR true vertical shooting, and 20km FHD video transmission with DJI RC 2 controller.",
      variants: [
        { name: "Fly More Combo Plus (DJI RC 2 + 3 Batteries)", price: 138e3, compareAtPrice: 152e3, options: [{ name: "Package", value: "Fly More Combo Plus with RC 2" }], stockQty: 10 }
      ]
    },
    {
      name: "DJI Osmo Pocket 3 Creator Combo",
      slug: "dji-osmo-pocket-3-creator",
      categorySlug: "cameras-drones",
      brandSlug: "dji",
      basePrice: 76500,
      compareAtPrice: 84e3,
      featured: true,
      imageKey: "sv-ring-light-10in-plus",
      tags: ["DJI", "Osmo Pocket 3", "1-inch CMOS", "4K120", "Gimbal"],
      description: "Pocket-sized gimbal camera with 1-inch CMOS sensor, 4K/120fps video, 2-inch rotatable OLED touchscreen, and DJI Mic 2 transmitter included in Creator Combo.",
      variants: [
        { name: "Creator Combo (with DJI Mic 2 & Battery Handle)", price: 76500, compareAtPrice: 84e3, options: [{ name: "Package", value: "Creator Combo" }], stockQty: 15 }
      ]
    },
    // ── GAMING & CONSOLES ──
    {
      name: "Sony PlayStation 5 Slim (1TB Disc Edition)",
      slug: "sony-playstation-5-slim-disc",
      categorySlug: "gaming-consoles",
      brandSlug: "sony",
      basePrice: 66e3,
      compareAtPrice: 72e3,
      featured: true,
      imageKey: "category-electronics",
      tags: ["PS5", "PlayStation", "4K Gaming", "DualSense", "Ray Tracing"],
      description: "Slimmer design with 1TB ultra-high speed SSD storage, 4K-TV gaming, Ray Tracing, 3D Audio, and immersive haptic feedback on DualSense Wireless Controller.",
      variants: [
        { name: "1TB Disc Edition (White)", price: 66e3, compareAtPrice: 72e3, options: [{ name: "Model", value: "1TB Disc Edition" }], stockQty: 16 },
        { name: "1TB Disc Edition + Extra DualSense Controller", price: 74e3, compareAtPrice: 81e3, options: [{ name: "Bundle", value: "1TB Disc + 2 Controllers" }], stockQty: 12 }
      ]
    },
    {
      name: "Steam Deck OLED (1TB Handheld PC)",
      slug: "steam-deck-oled-1tb",
      categorySlug: "gaming-consoles",
      brandSlug: "sony",
      basePrice: 89e3,
      compareAtPrice: 98e3,
      imageKey: "category-electronics",
      tags: ["Steam Deck", "OLED", "Handheld PC", "90Hz HDR"],
      description: "7.4-inch 90Hz HDR OLED display, premium anti-glare etched glass, 50Wh battery, 6nm AMD APU, and Wi-Fi 6E for the definitive PC gaming on the go.",
      variants: [
        { name: "1TB Anti-Glare Etched Glass OLED", price: 89e3, compareAtPrice: 98e3, options: [{ name: "Storage", value: "1TB OLED" }], stockQty: 10 }
      ]
    }
  ];
  let totalProducts = 0;
  let totalVariants = 0;
  const createdProducts = [];
  const createdVariants = [];
  for (const p of productsToSeed) {
    const catId = categoryMap[p.categorySlug];
    const brandId = brandMap[p.brandSlug];
    const imgId = findMediaId(p.imageKey);
    const productDoc = await payload.create({
      collection: "products",
      data: {
        name: p.name,
        slug: p.slug,
        status: "published",
        featured: Boolean(p.featured),
        brand: brandId || null,
        categories: catId ? [catId] : [],
        productClass: p.classSlug && classMap[p.classSlug] ? classMap[p.classSlug] : null,
        description: makeLexicalDoc([
          p.description,
          "100% authentic product with official manufacturer warranty, genuine retail packaging, and verified serial registration."
        ]),
        shortDescription: p.description,
        rating: 4.8,
        totalReviews: Math.floor(Math.random() * 15) + 6,
        specifications: (p.specifications || []).map((spec, idx) => {
          const paramInfo = p.classSlug && classParamsMap[p.classSlug] ? classParamsMap[p.classSlug][spec.key] : null;
          const attrId = attributeMap[spec.key] || null;
          const isCustom = Boolean(spec.isCustom);
          const isAdHoc = Boolean(spec.isAdHoc) || !paramInfo && !isCustom && Boolean(attrId);
          return {
            attribute: attrId,
            key: spec.key,
            value: spec.value,
            label: spec.label || paramInfo?.label || attrLabelMap[spec.key] || spec.key,
            unit: spec.unit !== void 0 ? spec.unit : paramInfo?.unit || attrUnitMap[spec.key] || "",
            group: spec.group || attrGroupMap[spec.key] || (isCustom ? "Additional Specifications" : "General"),
            isCustom,
            isAdHoc,
            displayOrder: idx + 1
          };
        }),
        images: imgId ? [{ image: imgId }] : [],
        tags: p.tags.map((t) => ({ tag: t })),
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice || Math.round(p.basePrice * 1.08),
        saleDisplayMode: p.saleDisplayMode || "strike_and_badge",
        currency: "BDT",
        hasVariants: p.variants.length > 0,
        weight: 0.5
      },
      overrideAccess: true
    });
    totalProducts++;
    createdProducts.push(productDoc);
    for (const v of p.variants) {
      const variantDoc = await payload.create({
        collection: "product-variants",
        data: {
          product: productDoc.id,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice || Math.round(v.price * 1.08),
          saleDisplayMode: "inherit",
          options: v.options,
          isActive: true
        },
        overrideAccess: true
      });
      totalVariants++;
      createdVariants.push(variantDoc);
      const qtyPerOutlet = Math.max(2, Math.floor(v.stockQty / createdOutlets.length));
      for (const outlet of createdOutlets) {
        await payload.create({
          collection: "stock-levels",
          data: {
            product: productDoc.id,
            variant: variantDoc.id,
            location: outlet.id,
            quantity: qtyPerOutlet,
            reservedQuantity: Math.min(1, Math.floor(qtyPerOutlet * 0.2))
          },
          overrideAccess: true
        });
      }
    }
  }
  const customerProfiles = [
    { firstName: "Tanvir", lastName: "Hasan", email: "tanvir.hasan@dhakamail.com", phone: "+8801711234567", city: "Dhaka", address: "House 45, Road 11, Block D, Banani" },
    { firstName: "Sadia", lastName: "Rahman", email: "sadia.rahman@bdtech.org", phone: "+8801819345678", city: "Dhaka", address: "Apartment 5B, Road 27, Dhanmondi" },
    { firstName: "Rahim", lastName: "Ahmed", email: "rahim.ahmed@cloudbd.net", phone: "+8801912456789", city: "Dhaka", address: "Plot 18, Sector 7, Uttara" },
    { firstName: "Farhan", lastName: "Kabir", email: "farhan.kabir@fintechbd.com", phone: "+8801613567890", city: "Dhaka", address: "House 8, Road 3, DOHS Baridhara" },
    { firstName: "Nusrat", lastName: "Jahan", email: "nusrat.jahan@designstudio.bd", phone: "+8801714678901", city: "Dhaka", address: "Flat 4A, Avenue 5, Mirpur DOHS" },
    { firstName: "Arif", lastName: "Hossain", email: "arif.hossain@ctgshoppers.com", phone: "+8801815789012", city: "Chittagong", address: "Hill View R/A, Nasirabad" },
    { firstName: "Mehnaz", lastName: "Haque", email: "mehnaz.haque@fashionbd.com", phone: "+8801916890123", city: "Dhaka", address: "House 22, Shantinagar Road" },
    { firstName: "Kazi", lastName: "Zubair", email: "kazi.zubair@devcorp.io", phone: "+8801717901234", city: "Sylhet", address: "Zindabazar Point, Sylhet City" },
    { firstName: "Tahmina", lastName: "Akter", email: "tahmina.akter@edu-bd.org", phone: "+8801618012345", city: "Chittagong", address: "South Khulshi R/A, Chittagong" },
    { firstName: "Shahriar", lastName: "Islam", email: "shahriar.islam@gamersbd.net", phone: "+8801819123456", city: "Dhaka", address: "Block C, Bashundhara R/A" }
  ];
  const createdCustomers = [];
  for (const c of customerProfiles) {
    const doc = await payload.create({
      collection: "users",
      data: {
        email: c.email,
        phone: c.phone,
        username: c.email,
        password: "CustomerSeed2026!",
        role: "customer",
        status: "active",
        emailVerified: true,
        firstName: c.firstName,
        lastName: c.lastName,
        displayName: `${c.firstName} ${c.lastName}`
      },
      overrideAccess: true
    });
    createdCustomers.push({ ...c, id: doc.id });
  }
  const deviceScenarios = [
    { deviceType: "mobile", browser: "Safari 18.1", os: "iOS 18.0", ip: "103.145.72.18", ref: "https://www.google.com/search?q=apple+gadgets+bd" },
    { deviceType: "mobile", browser: "Chrome Mobile 128", os: "Android 14", ip: "182.160.114.42", ref: "https://facebook.com/applegadgetsbd" },
    { deviceType: "desktop", browser: "Chrome 152", os: "macOS Sonoma", ip: "103.205.180.95", ref: "Direct" },
    { deviceType: "desktop", browser: "Edge 128", os: "Windows 11", ip: "202.4.96.12", ref: "https://www.google.com/search?q=pickaboo+electronics+bd" },
    { deviceType: "tablet", browser: "Safari 18.1", os: "iPadOS 18.0", ip: "103.145.74.88", ref: "https://instagram.com/applegadgets" }
  ];
  const paymentChannels = ["online", "online", "online", "cash_on_delivery"];
  const paymentStatuses = ["paid", "paid", "paid", "unpaid"];
  const orderStatuses = ["completed", "completed", "delivered", "processing", "pending"];
  let totalOrders = 0;
  const now = /* @__PURE__ */ new Date();
  for (let i = 0; i < 42; i++) {
    const cust = createdCustomers[i % createdCustomers.length];
    const dev = deviceScenarios[i % deviceScenarios.length];
    const prod = createdProducts[i % createdProducts.length];
    const matchingVariants = createdVariants.filter((v) => {
      const pRef = v.product;
      const pId = typeof pRef === "object" ? pRef?.id : pRef;
      return String(pId) === String(prod.id);
    });
    const variant = matchingVariants.length > 0 ? matchingVariants[i % matchingVariants.length] : null;
    const price = variant ? variant.price : prod.basePrice;
    const qty = i % 4 === 0 ? 2 : 1;
    const subtotal = price * qty;
    const shippingTotal = i % 3 === 0 ? 150 : 80;
    const discountTotal = i % 5 === 0 ? 1e3 : 0;
    const grandTotal = subtotal + shippingTotal - discountTotal;
    const daysAgo = Math.floor(i * 0.7);
    const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1e3 - i * 29 * 60 * 1e3);
    const orderNumSuffix = String(1e3 + i).padStart(4, "0");
    const orderNumber = `AG-ORD-202608${String(30 - daysAgo % 28).padStart(2, "0")}-${orderNumSuffix}`;
    const outlet = createdOutlets[i % createdOutlets.length];
    const status = orderStatuses[i % orderStatuses.length];
    const paymentStatus = status === "completed" || status === "delivered" ? "paid" : paymentStatuses[i % paymentStatuses.length];
    try {
      const orderDoc = await payload.create({
        collection: "orders",
        data: {
          orderNumber,
          customer: cust.id,
          status,
          paymentStatus,
          checkoutPaymentChannel: paymentChannels[i % paymentChannels.length],
          currency: "BDT",
          subtotal,
          shippingTotal,
          discountTotal,
          grandTotal,
          store: outlet.id,
          placedAt: orderDate.toISOString(),
          createdAt: orderDate.toISOString(),
          buyerSnapshot: {
            name: `${cust.firstName} ${cust.lastName}`,
            email: cust.email,
            phone: cust.phone,
            locale: "en"
          },
          shippingAddress: {
            firstName: cust.firstName,
            lastName: cust.lastName,
            street1: cust.address,
            city: cust.city,
            country: "BD",
            phone: cust.phone
          },
          billingAddress: {
            firstName: cust.firstName,
            lastName: cust.lastName,
            street1: cust.address,
            city: cust.city,
            country: "BD",
            phone: cust.phone
          },
          deviceTracking: {
            deviceType: dev.deviceType,
            browser: dev.browser,
            os: dev.os,
            ipAddress: dev.ip,
            referrer: dev.ref
          }
        },
        overrideAccess: true
      });
      const itemDoc = await payload.create({
        collection: "order-items",
        data: {
          order: orderDoc.id,
          product: prod.id,
          variant: variant?.id || null,
          productName: variant ? `${prod.name} (${variant.name})` : prod.name,
          productSlug: prod.slug,
          variantName: variant ? variant.name : void 0,
          sku: variant?.sku || prod.sku || `SKU-${prod.slug}`,
          unitPrice: price,
          quantity: qty,
          totalPrice: subtotal
        },
        overrideAccess: true
      });
      await payload.update({
        collection: "orders",
        id: orderDoc.id,
        data: {
          items: [itemDoc.id]
        },
        overrideAccess: true
      });
      totalOrders++;
    } catch (err) {
      payload.logger.warn(`[Electronics Seeder] Order #${i} note: ${err?.message || err}`);
    }
  }
  const reviewsData = [
    { prodIndex: 0, custIndex: 0, rating: 5, title: "100% Authentic Apple Flagship!", comment: "Received original USA spec iPhone 16 Pro Max with active AppleCare warranty. Same day delivery in Banani!" },
    { prodIndex: 1, custIndex: 1, rating: 5, title: "Gorgeous Ultramarine Color", comment: "Loving the new Camera Control button and battery life on iPhone 16. Delivered within 3 hours." },
    { prodIndex: 2, custIndex: 2, rating: 5, title: "Galaxy AI is Mindblowing", comment: "Titanium Gray Galaxy S24 Ultra. The flat display and S-Pen make note-taking so effortless." },
    { prodIndex: 3, custIndex: 3, rating: 5, title: "Clean Pixel Experience", comment: "Pixel 9 Pro XL has the best camera processing on any phone. Very premium build." },
    { prodIndex: 4, custIndex: 4, rating: 5, title: "Tandem OLED is Stunning", comment: 'iPad Pro 13" M4 is feather-light and the display brightness under sunlight is unbelievable.' },
    { prodIndex: 5, custIndex: 5, rating: 5, title: "Perfect Student & Work iPad", comment: 'iPad Air 11" M2 handles multitasking and video calls smoothly without getting warm.' },
    { prodIndex: 6, custIndex: 6, rating: 5, title: "Unreal M3 Max Rendering Power", comment: 'Bought MacBook Pro 16" for 8K DaVinci Resolve editing. Doesn\u2019t drop a single frame. Sealed box.' },
    { prodIndex: 7, custIndex: 7, rating: 5, title: "Best Travel Laptop Ever", comment: 'MacBook Air 15" Midnight. Screen is huge yet it fits easily in my backpack. Battery lasts 2 days.' },
    { prodIndex: 8, custIndex: 8, rating: 5, title: "Compact & Reliable", comment: 'MacBook Air 13" M2 is the sweetest deal for web development and productivity.' },
    { prodIndex: 9, custIndex: 9, rating: 5, title: "Absolute Gaming Monster", comment: "ROG SCAR 18 with RTX 4090 runs Cyberpunk at max settings with 120+ FPS. Insane thermal cooling." }
  ];
  let totalReviews = 0;
  for (const r of reviewsData) {
    const p = createdProducts[r.prodIndex];
    const c = createdCustomers[r.custIndex];
    if (p && c) {
      try {
        await payload.create({
          collection: "product-reviews",
          data: {
            product: p.id,
            author: c.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            status: "approved"
          },
          user: { id: c.id, role: "customer" },
          overrideAccess: true
        });
        totalReviews++;
      } catch (e) {
        payload.logger.warn(`[Electronics Seeder] Review note: ${e?.message || e}`);
      }
    }
  }
  const couponsData = [
    { code: "APPLE10", type: "percentage", value: 10, minOrderValue: 2e4, isActive: true, totalUses: 18 },
    { code: "GADGET1000", type: "fixed", value: 1e3, minOrderValue: 15e3, isActive: true, totalUses: 34 },
    { code: "TECHFEST", type: "fixed", value: 2500, minOrderValue: 5e4, isActive: true, totalUses: 12 },
    { code: "FREESHIP", type: "fixed", value: 150, minOrderValue: 3e3, isActive: true, totalUses: 65 }
  ];
  let totalCoupons = 0;
  for (const c of couponsData) {
    try {
      await payload.create({
        collection: "coupons",
        data: c,
        overrideAccess: true
      });
      totalCoupons++;
    } catch {
    }
  }
  const cartsToSeed = [
    // ── Active Carts (< 24 hours ago) ──
    {
      customerIndex: 0,
      // Tanvir Hasan
      outletIndex: 1,
      hoursAgo: 3,
      customerNote: "Please confirm if Natural Titanium is available before dispatch.",
      items: [
        { productIndex: 0, variantIndex: 0, quantity: 1 },
        // iPhone 16 Pro Max
        { productIndex: 31, quantity: 1 },
        // Anker 737 GaN 120W
        { productIndex: 32, quantity: 1 }
        // MagSafe Battery Pack
      ]
    },
    {
      customerIndex: 1,
      // Sadia Rahman
      outletIndex: 0,
      hoursAgo: 6,
      items: [
        { productIndex: 17, variantIndex: 0, quantity: 1 }
        // AirPods Max USB-C
      ]
    },
    {
      guestId: "8f3a1290-b34e-48a1-9c60-e24b8901ad45",
      outletIndex: 2,
      hoursAgo: 1,
      customerNote: "Need same day delivery in Uttara Sector 3.",
      items: [
        { productIndex: 18, variantIndex: 0, quantity: 1 },
        // Sony WH-1000XM5
        { productIndex: 30, quantity: 1 }
        // Anker Prime 250W
      ]
    },
    {
      customerIndex: 2,
      // Rahim Ahmed
      outletIndex: 0,
      hoursAgo: 8,
      items: [
        { productIndex: 13, variantIndex: 0, quantity: 1 },
        // Apple Watch Ultra 2
        { productIndex: 33, quantity: 1 }
        // Apple Pencil Pro
      ]
    },
    // ── Abandoned Carts (>= 24 hours ago) ──
    {
      customerIndex: 3,
      // Farhan Kabir
      outletIndex: 0,
      hoursAgo: 72,
      // 3 days ago
      couponCode: "APPLE10",
      customerNote: "Will pay via Card EMI once verified with bank.",
      items: [
        { productIndex: 9, variantIndex: 0, quantity: 1 }
        // MacBook Pro 16" M3 Max
      ]
    },
    {
      customerIndex: 4,
      // Nusrat Jahan
      outletIndex: 1,
      hoursAgo: 120,
      // 5 days ago
      items: [
        { productIndex: 7, variantIndex: 0, quantity: 1 },
        // iPad Pro 13" M4
        { productIndex: 33, quantity: 1 }
        // Apple Pencil Pro
      ]
    },
    {
      customerIndex: 5,
      // Arif Hossain
      outletIndex: 3,
      hoursAgo: 48,
      // 2 days ago
      couponCode: "GADGET1000",
      items: [
        { productIndex: 2, variantIndex: 0, quantity: 1 }
        // Galaxy S24 Ultra
      ]
    },
    {
      customerIndex: 6,
      // Mehnaz Haque
      outletIndex: 0,
      hoursAgo: 168,
      // 7 days ago
      items: [
        { productIndex: 22, variantIndex: 0, quantity: 1 },
        // Marshall Stanmore III
        { productIndex: 16, quantity: 1 }
        // AirPods Pro 2
      ]
    },
    {
      customerIndex: 7,
      // Kazi Zubair
      outletIndex: 2,
      hoursAgo: 96,
      // 4 days ago
      items: [
        { productIndex: 34, quantity: 1 }
        // DJI Mini 4 Pro Fly More Plus
      ]
    },
    {
      customerIndex: 8,
      // Tahmina Akter
      outletIndex: 3,
      hoursAgo: 144,
      // 6 days ago
      couponCode: "FREESHIP",
      items: [
        { productIndex: 14, variantIndex: 0, quantity: 1 }
        // Apple Watch Series 10
      ]
    },
    {
      customerIndex: 9,
      // Shahriar Islam
      outletIndex: 1,
      hoursAgo: 192,
      // 8 days ago
      items: [
        { productIndex: 12, quantity: 1 },
        // Asus ROG Strix SCAR 18
        { productIndex: 36, quantity: 1 }
        // Sony PlayStation 5 Slim
      ]
    },
    {
      guestId: "c2e4f6a8-1b3d-45f7-9a0c-e2b4d6f8a0b2",
      outletIndex: 0,
      hoursAgo: 96,
      // 4 days ago
      items: [
        { productIndex: 37, quantity: 1 }
        // Steam Deck OLED 1TB
      ]
    },
    {
      guestId: "d3f5a7b9-2c4e-46a8-0b1d-f3c5e7a9b1c3",
      outletIndex: 1,
      hoursAgo: 264,
      // 11 days ago
      items: [
        { productIndex: 21, variantIndex: 0, quantity: 1 },
        // Bose QC Ultra
        { productIndex: 30, quantity: 1 }
        // Anker Prime 250W
      ]
    },
    {
      guestId: "e4a6b8c0-3d5f-47b9-1c2e-a4d6f8b0c2d4",
      outletIndex: 2,
      hoursAgo: 192,
      // 8 days ago
      items: [
        { productIndex: 35, quantity: 1 }
        // DJI Osmo Pocket 3 Creator Combo
      ]
    },
    {
      guestId: "f5b7c9d1-4e6a-48ca-2d3f-b5e7a9c1d3e5",
      outletIndex: 0,
      hoursAgo: 120,
      // 5 days ago
      couponCode: "TECHFEST",
      items: [
        { productIndex: 24, quantity: 1 }
        // Sony BRAVIA XR 65" 4K OLED TV
      ]
    }
  ];
  let activeCartsCount = 0;
  let abandonedCartsCount = 0;
  for (const cDef of cartsToSeed) {
    const outlet = createdOutlets[cDef.outletIndex % createdOutlets.length];
    const cartDate = new Date(now.getTime() - cDef.hoursAgo * 60 * 60 * 1e3);
    const expiresDate = new Date(cartDate.getTime() + 14 * 24 * 60 * 60 * 1e3);
    const cartItems = [];
    for (const it of cDef.items) {
      const prod = createdProducts[it.productIndex % createdProducts.length];
      if (!prod) continue;
      const matchingVariants = createdVariants.filter((v) => {
        const pRef = v.product;
        const pId = typeof pRef === "object" ? pRef?.id : pRef;
        return String(pId) === String(prod.id);
      });
      const variant = it.variantIndex != null && matchingVariants[it.variantIndex] ? matchingVariants[it.variantIndex] : matchingVariants.length > 0 ? matchingVariants[0] : null;
      cartItems.push({
        product: prod.id,
        variant: variant?.id || null,
        quantity: it.quantity
      });
    }
    try {
      const isGuest = Boolean(cDef.guestId);
      const cust = cDef.customerIndex != null ? createdCustomers[cDef.customerIndex] : null;
      const cartData = {
        items: cartItems,
        store: outlet.id,
        couponCode: cDef.couponCode || void 0,
        customerNote: cDef.customerNote || void 0,
        createdAt: cartDate.toISOString(),
        updatedAt: cartDate.toISOString(),
        expiresAt: expiresDate.toISOString()
      };
      if (isGuest) {
        cartData.guestId = cDef.guestId;
        await payload.create({
          collection: "carts",
          data: cartData,
          user: null,
          req: {
            user: null,
            payload,
            headers: { get: (k) => k.toLowerCase() === "x-guest-id" ? cDef.guestId : null }
          },
          overrideAccess: true
        });
      } else if (cust) {
        cartData.user = cust.id;
        await payload.create({
          collection: "carts",
          data: cartData,
          user: adminUserDoc,
          req: { user: adminUserDoc, payload },
          overrideAccess: true
        });
      }
      if (cDef.hoursAgo < 24) {
        activeCartsCount++;
      } else {
        abandonedCartsCount++;
      }
    } catch (cartErr) {
      payload.logger.warn(`[Electronics Seeder] Cart note: ${cartErr?.message || cartErr}`);
    }
  }
  payload.logger.info("[Electronics Seeder] Completed successfully!");
  return {
    success: true,
    message: "Electronics Store demo catalog successfully seeded with clean database wipe.",
    wiped: wipedInfo,
    seeded: {
      categoriesCount: categoriesData.length,
      brandsCount: brandsData.length,
      classesCount: classesData.length,
      productsCount: totalProducts,
      variantsCount: totalVariants,
      outletsCount: createdOutlets.length,
      customersCount: createdCustomers.length,
      ordersCount: totalOrders,
      activeCartsCount,
      abandonedCartsCount,
      reviewsCount: totalReviews,
      couponsCount: totalCoupons,
      heroSlidesCount,
      pagesCount
    }
  };
}
var init_seed_electronics_data = __esm({
  "packages/backend/src/lib/seed-electronics-data.ts"() {
    "use strict";
    init_media_upload_dir();
  }
});

// packages/backend/src/endpoints/seed-electronics.ts
async function handleSeedRequest(req) {
  const url = new URL(req.url ?? "", "http://localhost");
  const secretParam = url.searchParams.get("secret") || url.searchParams.get("token");
  const allowedSecret = process.env.PAYLOAD_SECRET || "FrontendSeed2026!";
  const isAdmin2 = req.user && req.user.role === "admin";
  const hasValidSecret = secretParam === "FrontendSeed2026!" || secretParam === allowedSecret;
  if (!isAdmin2 && !hasValidSecret) {
    return Response.json(
      {
        success: false,
        error: "Unauthorized. Admin credentials or ?secret=FrontendSeed2026! is required."
      },
      { status: 401 }
    );
  }
  try {
    const result = await seedElectronicsStore(req.payload, {
      wipeFirst: true,
      adminEmail: "frontend-seed-sv@bscommerce.local"
    });
    return Response.json(result, { status: 200 });
  } catch (error) {
    req.payload.logger.error(`[Seed Electronics Endpoint Error] ${error?.message || error}`);
    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to seed electronics store",
        stack: error?.stack
      },
      { status: 500 }
    );
  }
}
var seedElectronicsEndpoint, seedElectronicsPostEndpoint;
var init_seed_electronics = __esm({
  "packages/backend/src/endpoints/seed-electronics.ts"() {
    "use strict";
    init_seed_electronics_data();
    seedElectronicsEndpoint = {
      path: "/seed/electronics",
      method: "get",
      handler: async (req) => {
        return handleSeedRequest(req);
      }
    };
    seedElectronicsPostEndpoint = {
      path: "/seed/electronics",
      method: "post",
      handler: async (req) => {
        return handleSeedRequest(req);
      }
    };
  }
});

// packages/backend/src/plugins/geography/access.ts
var geographyReferenceRead, geographyReferenceWrite, stockLocationServiceAreaRead, stockLocationServiceAreaCreate, stockLocationServiceAreaUpdateDelete;
var init_access = __esm({
  "packages/backend/src/plugins/geography/access.ts"() {
    "use strict";
    init_is_admin();
    geographyReferenceRead = () => true;
    geographyReferenceWrite = isAdmin;
    stockLocationServiceAreaRead = ({ req }) => {
      if (!req.user) return false;
      if (req.user.role === "admin") return true;
      if (req.user.role === "vendor" && req.user.tenant) {
        const tid = typeof req.user.tenant === "object" ? req.user.tenant.id : String(req.user.tenant);
        return {
          stockLocation: {
            tenant: {
              equals: tid
            }
          }
        };
      }
      return false;
    };
    stockLocationServiceAreaCreate = ({ req }) => {
      if (!req.user) return false;
      if (req.user.role === "admin") return true;
      if (req.user.role === "vendor") return !!req.user.tenant;
      return false;
    };
    stockLocationServiceAreaUpdateDelete = stockLocationServiceAreaRead;
  }
});

// packages/backend/src/plugins/geography/collections/geo-countries.ts
var GeoCountries;
var init_geo_countries = __esm({
  "packages/backend/src/plugins/geography/collections/geo-countries.ts"() {
    "use strict";
    init_access();
    GeoCountries = {
      slug: "geo-countries",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "isoCode", "isActive"],
        group: "Geography",
        description: "Countries. Central reference data for storefront area selection."
      },
      access: {
        read: geographyReferenceRead,
        create: geographyReferenceWrite,
        update: geographyReferenceWrite,
        delete: geographyReferenceWrite
      },
      fields: [
        { name: "name", type: "text", required: true, localized: true },
        {
          name: "isoCode",
          type: "text",
          required: true,
          maxLength: 3,
          admin: { description: "ISO 3166-1 alpha-2, e.g. BD" }
        },
        { name: "isActive", type: "checkbox", defaultValue: true }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/geography/collections/geo-subdivisions.ts
var defaultTierField, GeoSubdivisions;
var init_geo_subdivisions = __esm({
  "packages/backend/src/plugins/geography/collections/geo-subdivisions.ts"() {
    "use strict";
    init_access();
    defaultTierField = {
      name: "defaultServiceTier",
      type: "select",
      required: true,
      defaultValue: "standard",
      options: [
        { label: "Standard (green)", value: "standard" },
        { label: "Extended \u2014 extra cost/time (gray)", value: "extended" },
        { label: "Unserved (red)", value: "unserved" }
      ],
      admin: {
        description: "Used when the customer has only selected this administrative level (e.g. state/zila), not a finer locality. Locality-level policy overrides when drill-down is used."
      }
    };
    GeoSubdivisions = {
      slug: "geo-subdivisions",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "country", "code", "defaultServiceTier", "isActive"],
        group: "Geography",
        description: "Country subdivisions \u2014 first level below country. Examples: US state, BD zila, IN district."
      },
      access: {
        read: geographyReferenceRead,
        create: geographyReferenceWrite,
        update: geographyReferenceWrite,
        delete: geographyReferenceWrite
      },
      fields: [
        {
          name: "country",
          type: "relationship",
          relationTo: "geo-countries",
          required: true,
          index: true
        },
        { name: "name", type: "text", required: true, localized: true },
        {
          name: "geocodeMatchAliases",
          type: "array",
          label: "Geocoding match names",
          admin: {
            description: "Alternate names used only to match reverse geocoding (e.g. Nominatim/OSM) when they differ from the display name (e.g. Chittagong vs Chattogram). One entry per variant. Not localized."
          },
          fields: [
            {
              name: "alias",
              type: "text",
              required: true
            }
          ]
        },
        {
          name: "code",
          type: "text",
          admin: { description: "Stable code for imports (e.g. ISO subdivision, national statistics code)." },
          index: true
        },
        defaultTierField,
        {
          name: "extendedFeeNote",
          type: "textarea",
          admin: { description: "Shown for extended tier when only subdivision scope is selected." }
        },
        {
          name: "extendedLeadTimeNote",
          type: "textarea",
          admin: { description: "Extra delivery time messaging (subdivision scope)." }
        },
        {
          name: "unservedCustomerMessage",
          type: "textarea",
          admin: { description: "When subdivision default tier is unserved." }
        },
        { name: "isActive", type: "checkbox", defaultValue: true }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/geography/collections/geo-localities.ts
var GeoLocalities;
var init_geo_localities = __esm({
  "packages/backend/src/plugins/geography/collections/geo-localities.ts"() {
    "use strict";
    init_access();
    GeoLocalities = {
      slug: "geo-localities",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "subdivision", "code", "serviceTier", "isActive"],
        group: "Geography",
        description: "Localities under a subdivision \u2014 used for precise service tier and store matching. Examples: US city, BD upazila."
      },
      access: {
        read: geographyReferenceRead,
        create: geographyReferenceWrite,
        update: geographyReferenceWrite,
        delete: geographyReferenceWrite
      },
      fields: [
        {
          name: "subdivision",
          type: "relationship",
          relationTo: "geo-subdivisions",
          required: true,
          index: true
        },
        { name: "name", type: "text", required: true, localized: true },
        {
          name: "geocodeMatchAliases",
          type: "array",
          label: "Geocoding match names",
          admin: {
            description: "Alternate names used only to match reverse geocoding (e.g. Nominatim/OSM) when they differ from the display name. Add one row per variant. Not localized \u2014 use the same language you configure for the geocoder (e.g. English). The title field above is still what shoppers see in the UI."
          },
          fields: [
            {
              name: "alias",
              type: "text",
              required: true
            }
          ]
        },
        {
          name: "code",
          type: "text",
          admin: { description: "Optional internal or national statistics code." },
          index: true
        },
        {
          name: "serviceTier",
          type: "select",
          required: true,
          defaultValue: "standard",
          options: [
            { label: "Standard (green)", value: "standard" },
            { label: "Extended \u2014 extra cost/time (gray)", value: "extended" },
            { label: "Unserved (red)", value: "unserved" }
          ]
        },
        {
          name: "extendedFeeNote",
          type: "textarea",
          admin: { description: "Extra cost disclosure for extended tier." }
        },
        {
          name: "extendedLeadTimeNote",
          type: "textarea"
        },
        {
          name: "unservedCustomerMessage",
          type: "textarea",
          admin: { description: "Shown when this locality is unserved." }
        },
        { name: "isActive", type: "checkbox", defaultValue: true }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/geography/collections/stock-location-service-areas.ts
function relationId7(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null && "id" in value) {
    return String(value.id);
  }
  return null;
}
var StockLocationServiceAreas;
var init_stock_location_service_areas = __esm({
  "packages/backend/src/plugins/geography/collections/stock-location-service-areas.ts"() {
    "use strict";
    init_access();
    StockLocationServiceAreas = {
      slug: "stock-location-service-areas",
      admin: {
        useAsTitle: "id",
        defaultColumns: ["stockLocation", "subdivision", "locality", "sortOrder"],
        group: "Geography",
        description: "Maps a stock location to geographic areas it serves. Subdivision is denormalized for fast queries. Leave locality empty to cover the entire subdivision."
      },
      access: {
        read: stockLocationServiceAreaRead,
        create: stockLocationServiceAreaCreate,
        update: stockLocationServiceAreaUpdateDelete,
        delete: stockLocationServiceAreaUpdateDelete
      },
      hooks: {
        beforeValidate: [
          async ({ data, req }) => {
            if (!data) return data;
            const localityId = relationId7(data.locality);
            let subdivisionId = relationId7(data.subdivision);
            if (localityId && req.payload) {
              const loc = await req.payload.findByID({
                collection: "geo-localities",
                id: localityId,
                depth: 0,
                overrideAccess: true
              });
              const s = relationId7(loc?.subdivision);
              if (s) {
                subdivisionId = s;
                data.subdivision = s;
              }
            }
            if (!subdivisionId) {
              throw new Error("subdivision is required (set explicitly or via locality).");
            }
            return data;
          }
        ],
        beforeChange: [
          async ({ data, req, operation, originalDoc }) => {
            if (!req.user || req.user.role === "admin") return data;
            if (req.user.role !== "vendor" || !req.user.tenant) return data;
            const stockRef = data?.stockLocation ?? originalDoc?.stockLocation;
            const stockId = relationId7(stockRef);
            if (!stockId || !req.payload) return data;
            const loc = await req.payload.findByID({
              collection: "stock-locations",
              id: stockId,
              depth: 0,
              overrideAccess: true
            });
            const vendorTid = typeof req.user.tenant === "object" ? relationId7(req.user.tenant) : String(req.user.tenant);
            const locTenant = relationId7(loc?.tenant);
            if (locTenant !== vendorTid) {
              throw new Error("You can only define service areas for your own stock locations.");
            }
            return data;
          }
        ]
      },
      fields: [
        {
          name: "stockLocation",
          type: "relationship",
          relationTo: "stock-locations",
          required: true,
          index: true
        },
        {
          name: "subdivision",
          type: "relationship",
          relationTo: "geo-subdivisions",
          required: true,
          index: true,
          admin: {
            description: "Auto-filled from locality when a locality is selected. Must match the locality\u2019s subdivision."
          }
        },
        {
          name: "locality",
          type: "relationship",
          relationTo: "geo-localities",
          required: false,
          index: true,
          admin: {
            description: "Optional. Empty = this row covers the whole subdivision. Set to restrict to one locality."
          }
        },
        {
          name: "sortOrder",
          type: "number",
          defaultValue: 0,
          admin: { description: "Lower numbers list first within the same area." }
        }
      ],
      timestamps: true
    };
  }
});

// packages/backend/src/plugins/geography/index.ts
var geography_exports = {};
__export(geography_exports, {
  geographyPlugin: () => geographyPlugin
});
var geographyPlugin;
var init_geography = __esm({
  "packages/backend/src/plugins/geography/index.ts"() {
    "use strict";
    init_geo_countries();
    init_geo_subdivisions();
    init_geo_localities();
    init_stock_location_service_areas();
    geographyPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = false } = options;
      if (!enabled) return incomingConfig;
      return {
        ...incomingConfig,
        collections: [
          ...incomingConfig.collections || [],
          GeoCountries,
          GeoSubdivisions,
          GeoLocalities,
          StockLocationServiceAreas
        ]
      };
    };
  }
});

// packages/backend/src/lib/admin-reports.ts
function collectionExists2(payload, slug) {
  return slug in (payload.collections || {});
}
function tenantIdFromUser3(user) {
  const t = user.tenant;
  if (t == null) return null;
  if (typeof t === "object" && t !== null && "id" in t && typeof t.id === "string") {
    return t.id;
  }
  if (typeof t === "string") return t;
  return String(t);
}
function formatReportCurrency(amount, currency = "USD") {
  const code = (currency || "USD").toUpperCase().trim();
  const symbol = REPORT_CURRENCY_SYMBOLS[code] ?? `${code} `;
  return `${symbol}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
function convertReportCurrency(amount, fromCurrency, toCurrency = "USD", usdToBdtRate = 110) {
  const num = Number(amount || 0);
  const from = (fromCurrency || toCurrency || "USD").toUpperCase().trim();
  const to = (toCurrency || "USD").toUpperCase().trim();
  if (from === to) return num;
  const rate = Number(usdToBdtRate) > 0 ? Number(usdToBdtRate) : 110;
  if (from === "USD" && to === "BDT") {
    return num * rate;
  }
  if (from === "BDT" && to === "USD") {
    return num / rate;
  }
  return num;
}
function formatReportNumber(num) {
  return Number(num || 0).toLocaleString("en-US");
}
function formatReportPercent(pct) {
  return `${(Number(pct) || 0).toFixed(1)}%`;
}
function resolveReportDates(period = "month", customStart, customEnd, now = /* @__PURE__ */ new Date()) {
  let startDate;
  let endDate = new Date(now.getTime());
  if (period === "custom" && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    if (isNaN(startDate.getTime())) startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    if (isNaN(endDate.getTime())) endDate = new Date(now.getTime());
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (period) {
    case "day":
      startDate = new Date(y, m, d, 0, 0, 0, 0);
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
      break;
    case "quarter":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1e3);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
  }
  return { startDate, endDate };
}
function generateCsv(columns, rows, totals) {
  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");
  const dataRows = rows.map(
    (row) => columns.map((col) => {
      let val = row[col.key];
      if (val === null || val === void 0) val = "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );
  if (totals) {
    const totalRow = columns.map((col) => {
      let val = totals[col.key];
      if (val === null || val === void 0) val = "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",");
    return [headerRow, ...dataRows, totalRow].join("\n");
  }
  return [headerRow, ...dataRows].join("\n");
}
async function generateAdminReport(payload, user, options = {}) {
  const isVendor = user.role === "vendor";
  const tenantId = isVendor ? tenantIdFromUser3(user) : null;
  let defaultCurrency = getDefaultCurrency();
  let supportedCurrencies = ["USD", "BDT"];
  let usdToBdtRate = 110;
  if (typeof payload.findGlobal === "function") {
    try {
      const settings = await payload.findGlobal({
        slug: "platform-settings",
        depth: 0,
        overrideAccess: true
      });
      const curr = settings?.currency;
      if (curr) {
        if (typeof curr.defaultCurrency === "string" && curr.defaultCurrency.trim()) {
          defaultCurrency = curr.defaultCurrency.trim().toUpperCase();
        }
        if (Array.isArray(curr.supportedCurrencies) && curr.supportedCurrencies.length > 0) {
          supportedCurrencies = curr.supportedCurrencies.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
        }
        if (typeof curr.usdToBdtRate === "number" && curr.usdToBdtRate > 0) {
          usdToBdtRate = curr.usdToBdtRate;
        }
      }
    } catch {
    }
  }
  if (!supportedCurrencies.includes(defaultCurrency)) {
    supportedCurrencies.unshift(defaultCurrency);
  }
  const requestedCurrency = options.currency ? options.currency.trim().toUpperCase() : null;
  const currency = requestedCurrency && supportedCurrencies.includes(requestedCurrency) ? requestedCurrency : defaultCurrency;
  const category = options.category || "sales";
  const reportType = options.reportType || (category === "sales" ? "sales-overview" : category === "products" ? "product-performance" : category === "customers" ? "abandoned-carts" : "low-stock-alert");
  const period = options.period || "month";
  const { startDate, endDate } = resolveReportDates(period, options.startDate, options.endDate);
  const storeId = options.storeId || null;
  let availableStores = [];
  if (collectionExists2(payload, "stock-locations")) {
    try {
      const storesRes = await payload.find({
        collection: "stock-locations",
        limit: 100,
        depth: 0
      });
      availableStores = storesRes.docs.map((s) => ({
        id: String(s.id),
        name: s.name || s.code || `Location #${s.id}`,
        code: s.code || ""
      }));
    } catch {
    }
  }
  const selectedStore = storeId ? availableStores.find((s) => s.id === storeId) : null;
  const ctx = {
    startDate,
    endDate,
    currency,
    defaultCurrency,
    availableCurrencies: supportedCurrencies,
    usdToBdtRate,
    storeId,
    selectedStore,
    availableStores,
    isVendor,
    tenantId,
    period
  };
  switch (reportType) {
    // ── SALES ──────────────────────────────────────────
    case "sales-overview":
      return runSalesOverviewReport(payload, ctx);
    case "sales-by-time":
      return runSalesByTimeReport(payload, ctx);
    case "sales-by-payment":
      return runSalesByPaymentReport(payload, ctx);
    case "sales-by-coupon":
      return runSalesByCouponReport(payload, ctx);
    case "sales-by-geo":
      return runSalesByGeoReport(payload, ctx);
    case "new-vs-returning":
      return runNewVsReturningReport(payload, ctx);
    // ── PRODUCTS ───────────────────────────────────────
    case "product-performance":
      return runProductPerformanceReport(payload, ctx);
    case "sales-by-category":
      return runSalesByCategoryReport(payload, ctx);
    case "product-demand":
      return runProductDemandReport(payload, ctx);
    // ── CUSTOMERS ──────────────────────────────────────
    case "abandoned-carts":
      return runAbandonedCartsReport(payload, ctx);
    case "customer-ltv":
      return runCustomerLtvReport(payload, ctx);
    case "abandoned-products":
      return runAbandonedProductsReport(payload, ctx);
    case "customer-orders":
      return runCustomerOrdersReport(payload, ctx);
    // ── INVENTORY ──────────────────────────────────────
    case "low-stock-alert":
      return runLowStockReport(payload, ctx);
    case "stock-valuation":
      return runStockValuationReport(payload, ctx);
    default:
      return runSalesOverviewReport(payload, ctx);
  }
}
function buildReportMeta(ctx, category, reportType, reportName) {
  return {
    category,
    reportType,
    reportName,
    period: ctx.period,
    startDate: ctx.startDate.toISOString(),
    endDate: ctx.endDate.toISOString(),
    currency: ctx.currency,
    defaultCurrency: ctx.defaultCurrency,
    availableCurrencies: ctx.availableCurrencies,
    storeId: ctx.storeId,
    storeName: ctx.selectedStore?.name || null,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    availableStores: ctx.availableStores
  };
}
async function runSalesOverviewReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ["cancelled"] } }
    ]
  };
  if (ctx.storeId) {
    ;
    where.and.push({ store: { equals: ctx.storeId } });
  }
  let orders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({
      collection: "orders",
      where,
      limit: 2e3,
      depth: 1,
      sort: "createdAt"
    });
    orders = res.docs;
  }
  const buckets = {};
  let totalQty = 0;
  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalShipping = 0;
  let totalTax = 0;
  let totalRefund = 0;
  let totalGrand = 0;
  for (const order of orders) {
    const orderDate = new Date(order.placedAt || order.createdAt);
    const key = ctx.period === "year" || ctx.period === "quarter" ? `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}` : `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")}`;
    if (!buckets[key]) {
      const dateLabel = ctx.period === "year" || ctx.period === "quarter" ? orderDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      buckets[key] = {
        dateLabel,
        ordersCount: 0,
        qtyOrdered: 0,
        subtotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        refundTotal: 0,
        grandTotal: 0
      };
    }
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsCount = items.reduce((sum, it) => sum + (Number(it?.quantity) || 1), 0);
    const orderCurr = String(order.currency || ctx.currency).toUpperCase();
    const rate = ctx.usdToBdtRate;
    const subtotal = convertReportCurrency(Number(order.subtotal) || 0, orderCurr, ctx.currency, rate);
    const discount = convertReportCurrency(Number(order.discountTotal) || 0, orderCurr, ctx.currency, rate);
    const shipping = convertReportCurrency(Number(order.shippingTotal) || 0, orderCurr, ctx.currency, rate);
    const tax = convertReportCurrency(Number(order.taxTotal) || 0, orderCurr, ctx.currency, rate);
    const grand = convertReportCurrency(Number(order.grandTotal) || 0, orderCurr, ctx.currency, rate);
    const refund = order.paymentStatus === "refunded" ? grand : order.paymentStatus === "partially-refunded" ? grand * 0.5 : 0;
    buckets[key].ordersCount += 1;
    buckets[key].qtyOrdered += itemsCount;
    buckets[key].subtotal += subtotal;
    buckets[key].discountTotal += discount;
    buckets[key].shippingTotal += shipping;
    buckets[key].taxTotal += tax;
    buckets[key].refundTotal += refund;
    buckets[key].grandTotal += grand;
    totalQty += itemsCount;
    totalSubtotal += subtotal;
    totalDiscount += discount;
    totalShipping += shipping;
    totalTax += tax;
    totalRefund += refund;
    totalGrand += grand;
  }
  const rows = Object.entries(buckets).map(([dateKey, b]) => {
    const grossMargin = b.subtotal > 0 ? (b.subtotal - b.discountTotal) / b.subtotal * 100 : 0;
    return {
      period: b.dateLabel,
      ordersCount: b.ordersCount,
      qtyOrdered: b.qtyOrdered,
      subtotal: formatReportCurrency(b.subtotal, ctx.currency),
      discount: formatReportCurrency(b.discountTotal, ctx.currency),
      shipping: formatReportCurrency(b.shippingTotal, ctx.currency),
      tax: formatReportCurrency(b.taxTotal, ctx.currency),
      refunded: formatReportCurrency(b.refundTotal, ctx.currency),
      grossMargin: formatReportPercent(grossMargin),
      grandTotal: formatReportCurrency(b.grandTotal, ctx.currency),
      _rawGrandTotal: b.grandTotal,
      _rawOrders: b.ordersCount,
      _dateKey: dateKey
    };
  });
  const chartData = Object.entries(buckets).map(([_, b]) => ({
    date: b.dateLabel,
    revenue: Math.round(b.grandTotal),
    orders: b.ordersCount,
    discounts: Math.round(b.discountTotal)
  }));
  const columns = [
    { key: "period", label: "Period / Date", align: "left", format: "text" },
    { key: "ordersCount", label: "Orders", align: "right", format: "number" },
    { key: "qtyOrdered", label: "Qty Ordered", align: "right", format: "number" },
    { key: "subtotal", label: "Subtotal", align: "right", format: "currency" },
    { key: "discount", label: "Discount", align: "right", format: "currency" },
    { key: "shipping", label: "Shipping", align: "right", format: "currency" },
    { key: "tax", label: "Tax", align: "right", format: "currency" },
    { key: "refunded", label: "Refunded", align: "right", format: "currency" },
    { key: "grossMargin", label: "Gross Margin", align: "right", format: "percent" },
    { key: "grandTotal", label: "Grand Total", align: "right", format: "currency" }
  ];
  const totalMargin = totalSubtotal > 0 ? (totalSubtotal - totalDiscount) / totalSubtotal * 100 : 0;
  const totals = {
    period: "Total Summary",
    ordersCount: formatReportNumber(orders.length),
    qtyOrdered: formatReportNumber(totalQty),
    subtotal: formatReportCurrency(totalSubtotal, ctx.currency),
    discount: formatReportCurrency(totalDiscount, ctx.currency),
    shipping: formatReportCurrency(totalShipping, ctx.currency),
    tax: formatReportCurrency(totalTax, ctx.currency),
    refunded: formatReportCurrency(totalRefund, ctx.currency),
    grossMargin: formatReportPercent(totalMargin),
    grandTotal: formatReportCurrency(totalGrand, ctx.currency)
  };
  const aov = orders.length > 0 ? totalGrand / orders.length : 0;
  const kpis = [
    {
      key: "revenue",
      label: "Gross Revenue",
      value: totalGrand,
      formattedValue: formatReportCurrency(totalGrand, ctx.currency),
      subtext: `${orders.length} total orders placed`
    },
    {
      key: "net_sales",
      label: "Net Sales",
      value: totalGrand - totalRefund,
      formattedValue: formatReportCurrency(totalGrand - totalRefund, ctx.currency),
      subtext: `After ${formatReportCurrency(totalRefund, ctx.currency)} refunds`
    },
    {
      key: "orders",
      label: "Total Orders",
      value: orders.length,
      formattedValue: formatReportNumber(orders.length),
      subtext: `${formatReportNumber(totalQty)} total units sold`
    },
    {
      key: "aov",
      label: "Average Order Value (AOV)",
      value: aov,
      formattedValue: formatReportCurrency(aov, ctx.currency),
      subtext: "Revenue / order count"
    },
    {
      key: "discounts",
      label: "Promotional Discounts",
      value: totalDiscount,
      formattedValue: formatReportCurrency(totalDiscount, ctx.currency),
      subtext: `${formatReportPercent(totalSubtotal > 0 ? totalDiscount / totalSubtotal * 100 : 0)} of subtotal`
    }
  ];
  const csvData = generateCsv(columns, rows, totals);
  return {
    meta: buildReportMeta(ctx, "sales", "sales-overview", "Sales Overview & Revenue Performance"),
    kpis,
    chart: {
      type: "line",
      xAxisKey: "date",
      series: [
        { key: "revenue", name: "Revenue", color: "#10b981" },
        { key: "orders", name: "Orders", color: "#6366f1" }
      ],
      data: chartData
    },
    table: {
      columns,
      rows,
      totals
    },
    csvData
  };
}
async function runSalesByTimeReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ["cancelled"] } }
    ]
  };
  if (ctx.storeId) where.and.push({ store: { equals: ctx.storeId } });
  let orders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({ collection: "orders", where, limit: 3e3, depth: 0 });
    orders = res.docs;
  }
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayStats = daysOfWeek.map((day) => ({
    name: day,
    orders: 0,
    revenue: 0,
    avgBasket: 0
  }));
  for (const order of orders) {
    const d = new Date(order.placedAt || order.createdAt);
    const dayIdx = d.getDay();
    const orderCurr = String(order.currency || ctx.currency).toUpperCase();
    const rev = convertReportCurrency(Number(order.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate);
    dayStats[dayIdx].orders += 1;
    dayStats[dayIdx].revenue += rev;
  }
  const totalRev = dayStats.reduce((acc, d) => acc + d.revenue, 0);
  const totalOrders = orders.length;
  const rows = dayStats.map((d) => {
    const share = totalRev > 0 ? d.revenue / totalRev * 100 : 0;
    const aov = d.orders > 0 ? d.revenue / d.orders : 0;
    return {
      day: d.name,
      ordersCount: d.orders,
      revenue: formatReportCurrency(d.revenue, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      revenueShare: formatReportPercent(share),
      _rawRev: d.revenue
    };
  });
  const bestDay = [...dayStats].sort((a, b) => b.revenue - a.revenue)[0];
  const columns = [
    { key: "day", label: "Day of Week", align: "left", format: "text" },
    { key: "ordersCount", label: "Orders Placed", align: "right", format: "number" },
    { key: "revenue", label: "Total Revenue", align: "right", format: "currency" },
    { key: "aov", label: "Average Order Value", align: "right", format: "currency" },
    { key: "revenueShare", label: "Revenue Share", align: "right", format: "percent" }
  ];
  const totals = {
    day: "Total All Days",
    ordersCount: formatReportNumber(totalOrders),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(totalOrders > 0 ? totalRev / totalOrders : 0, ctx.currency),
    revenueShare: "100.0%"
  };
  const kpis = [
    {
      key: "peak_day",
      label: "Peak Purchasing Day",
      value: bestDay?.revenue || 0,
      formattedValue: bestDay?.name || "N/A",
      subtext: bestDay ? `${formatReportCurrency(bestDay.revenue, ctx.currency)} generated` : "No data"
    },
    {
      key: "total_orders",
      label: "Total Orders",
      value: totalOrders,
      formattedValue: formatReportNumber(totalOrders),
      subtext: "In selected period"
    },
    {
      key: "avg_day_rev",
      label: "Avg Daily Revenue",
      value: totalRev / 7,
      formattedValue: formatReportCurrency(totalRev / 7, ctx.currency),
      subtext: "Weekly normalized average"
    }
  ];
  const chartData = dayStats.map((d) => ({
    day: d.name.slice(0, 3),
    revenue: Math.round(d.revenue),
    orders: d.orders
  }));
  return {
    meta: buildReportMeta(ctx, "sales", "sales-by-time", "Sales by Day of Week & Peak Times"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "day",
      series: [
        { key: "revenue", name: "Revenue", color: "#3b82f6" },
        { key: "orders", name: "Orders", color: "#8b5cf6" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runSalesByPaymentReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ["cancelled"] } }
    ]
  };
  if (ctx.storeId) where.and.push({ store: { equals: ctx.storeId } });
  let orders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({ collection: "orders", where, limit: 3e3, depth: 0 });
    orders = res.docs;
  }
  const map = {};
  let totalRev = 0;
  for (const o of orders) {
    const channelKey = o.checkoutPaymentChannel === "cash_on_delivery" ? "Cash on Delivery (COD)" : "Online Gateway";
    if (!map[channelKey]) {
      map[channelKey] = { channel: channelKey, orders: 0, revenue: 0, paidCount: 0, unpaidCount: 0 };
    }
    const orderCurr = String(o.currency || ctx.currency).toUpperCase();
    const grand = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate);
    map[channelKey].orders += 1;
    map[channelKey].revenue += grand;
    if (o.paymentStatus === "paid") map[channelKey].paidCount += 1;
    else map[channelKey].unpaidCount += 1;
    totalRev += grand;
  }
  const rows = Object.values(map).map((item) => {
    const share = totalRev > 0 ? item.revenue / totalRev * 100 : 0;
    const aov = item.orders > 0 ? item.revenue / item.orders : 0;
    return {
      channel: item.channel,
      ordersCount: item.orders,
      paidOrders: item.paidCount,
      unpaidOrders: item.unpaidCount,
      revenue: formatReportCurrency(item.revenue, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      share: formatReportPercent(share)
    };
  });
  const columns = [
    { key: "channel", label: "Payment Channel", align: "left", format: "text" },
    { key: "ordersCount", label: "Total Orders", align: "right", format: "number" },
    { key: "paidOrders", label: "Settled / Paid", align: "right", format: "number" },
    { key: "unpaidOrders", label: "Pending Payment", align: "right", format: "number" },
    { key: "revenue", label: "Total Value", align: "right", format: "currency" },
    { key: "aov", label: "Avg Order Value", align: "right", format: "currency" },
    { key: "share", label: "Channel Share", align: "right", format: "percent" }
  ];
  const totals = {
    channel: "Total All Methods",
    ordersCount: formatReportNumber(orders.length),
    paidOrders: formatReportNumber(Object.values(map).reduce((sum, m) => sum + m.paidCount, 0)),
    unpaidOrders: formatReportNumber(Object.values(map).reduce((sum, m) => sum + m.unpaidCount, 0)),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(orders.length > 0 ? totalRev / orders.length : 0, ctx.currency),
    share: "100.0%"
  };
  const kpis = [
    {
      key: "gateway_rev",
      label: "Digital / Gateway Sales",
      value: map["Online Gateway"]?.revenue || 0,
      formattedValue: formatReportCurrency(map["Online Gateway"]?.revenue || 0, ctx.currency),
      subtext: `${map["Online Gateway"]?.orders || 0} online transactions`
    },
    {
      key: "cod_rev",
      label: "Cash on Delivery Sales",
      value: map["Cash on Delivery (COD)"]?.revenue || 0,
      formattedValue: formatReportCurrency(map["Cash on Delivery (COD)"]?.revenue || 0, ctx.currency),
      subtext: `${map["Cash on Delivery (COD)"]?.orders || 0} COD orders`
    }
  ];
  const chartData = Object.values(map).map((m) => ({
    channel: m.channel,
    revenue: Math.round(m.revenue),
    orders: m.orders
  }));
  return {
    meta: buildReportMeta(ctx, "sales", "sales-by-payment", "Sales by Payment Type & Channel"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "channel",
      series: [
        { key: "revenue", name: "Revenue", color: "#10b981" },
        { key: "orders", name: "Orders", color: "#3b82f6" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runSalesByCouponReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { discountTotal: { greater_than: 0 } }
    ]
  };
  if (ctx.storeId) where.and.push({ store: { equals: ctx.storeId } });
  let orders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({ collection: "orders", where, limit: 2e3, depth: 0 });
    orders = res.docs;
  }
  const couponMap = {};
  let totalDiscountsGiven = 0;
  let totalCouponRevenue = 0;
  for (const o of orders) {
    const code = o.couponCodeSnapshot || (typeof o.appliedCoupon === "object" ? o.appliedCoupon?.code : null) || "General Discount";
    if (!couponMap[code]) {
      couponMap[code] = { code, uses: 0, totalDiscount: 0, totalGross: 0 };
    }
    const orderCurr = String(o.currency || ctx.currency).toUpperCase();
    const disc = convertReportCurrency(Number(o.discountTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate);
    const gross = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate);
    couponMap[code].uses += 1;
    couponMap[code].totalDiscount += disc;
    couponMap[code].totalGross += gross;
    totalDiscountsGiven += disc;
    totalCouponRevenue += gross;
  }
  const rows = Object.values(couponMap).sort((a, b) => b.totalGross - a.totalGross).map((c) => {
    const roi = c.totalDiscount > 0 ? (c.totalGross - c.totalDiscount) / c.totalDiscount * 100 : 0;
    return {
      code: c.code,
      uses: c.uses,
      totalDiscount: formatReportCurrency(c.totalDiscount, ctx.currency),
      totalGross: formatReportCurrency(c.totalGross, ctx.currency),
      netRevenue: formatReportCurrency(c.totalGross - c.totalDiscount, ctx.currency),
      roi: formatReportPercent(roi)
    };
  });
  const columns = [
    { key: "code", label: "Coupon Code", align: "left", format: "text" },
    { key: "uses", label: "Redemptions", align: "right", format: "number" },
    { key: "totalDiscount", label: "Discounts Given", align: "right", format: "currency" },
    { key: "totalGross", label: "Gross Sales Generated", align: "right", format: "currency" },
    { key: "netRevenue", label: "Net Margin", align: "right", format: "currency" },
    { key: "roi", label: "Sales/Discount Ratio", align: "right", format: "percent" }
  ];
  const totals = {
    code: "All Coupons Combined",
    uses: formatReportNumber(orders.length),
    totalDiscount: formatReportCurrency(totalDiscountsGiven, ctx.currency),
    totalGross: formatReportCurrency(totalCouponRevenue, ctx.currency),
    netRevenue: formatReportCurrency(totalCouponRevenue - totalDiscountsGiven, ctx.currency),
    roi: formatReportPercent(totalDiscountsGiven > 0 ? (totalCouponRevenue - totalDiscountsGiven) / totalDiscountsGiven * 100 : 0)
  };
  const kpis = [
    {
      key: "total_discount",
      label: "Total Discounts Disbursed",
      value: totalDiscountsGiven,
      formattedValue: formatReportCurrency(totalDiscountsGiven, ctx.currency),
      subtext: `Across ${orders.length} redemptions`
    },
    {
      key: "coupon_sales",
      label: "Coupon-Driven Gross Sales",
      value: totalCouponRevenue,
      formattedValue: formatReportCurrency(totalCouponRevenue, ctx.currency),
      subtext: "Revenue generated via promotions"
    }
  ];
  const chartData = Object.values(couponMap).slice(0, 10).map((c) => ({
    code: c.code,
    gross: Math.round(c.totalGross),
    discount: Math.round(c.totalDiscount)
  }));
  return {
    meta: buildReportMeta(ctx, "sales", "sales-by-coupon", "Sales by Coupon & Discount Rule"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "code",
      series: [
        { key: "gross", name: "Gross Revenue", color: "#10b981" },
        { key: "discount", name: "Discount Given", color: "#ef4444" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runSalesByGeoReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ["cancelled"] } }
    ]
  };
  if (ctx.storeId) where.and.push({ store: { equals: ctx.storeId } });
  let orders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({ collection: "orders", where, limit: 3e3, depth: 0 });
    orders = res.docs;
  }
  const geoMap = {};
  let totalRev = 0;
  for (const o of orders) {
    const addr = o.shippingAddress || {};
    const city = addr.city || "Unspecified";
    const state = addr.state || "";
    const country = addr.country || "Global";
    const key = `${city}-${state}-${country}`;
    if (!geoMap[key]) {
      geoMap[key] = { city, state, country, orders: 0, revenue: 0 };
    }
    const orderCurr = String(o.currency || ctx.currency).toUpperCase();
    const rev = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate);
    geoMap[key].orders += 1;
    geoMap[key].revenue += rev;
    totalRev += rev;
  }
  const sorted = Object.values(geoMap).sort((a, b) => b.revenue - a.revenue);
  const rows = sorted.map((g) => {
    const share = totalRev > 0 ? g.revenue / totalRev * 100 : 0;
    const aov = g.orders > 0 ? g.revenue / g.orders : 0;
    return {
      region: [g.city, g.state, g.country].filter(Boolean).join(", "),
      city: g.city,
      country: g.country,
      ordersCount: g.orders,
      revenue: formatReportCurrency(g.revenue, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      share: formatReportPercent(share)
    };
  });
  const columns = [
    { key: "region", label: "Region / City", align: "left", format: "text" },
    { key: "ordersCount", label: "Orders", align: "right", format: "number" },
    { key: "revenue", label: "Revenue Generated", align: "right", format: "currency" },
    { key: "aov", label: "Average Basket", align: "right", format: "currency" },
    { key: "share", label: "Geo Share", align: "right", format: "percent" }
  ];
  const totals = {
    region: "All Destinations",
    ordersCount: formatReportNumber(orders.length),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(orders.length > 0 ? totalRev / orders.length : 0, ctx.currency),
    share: "100.0%"
  };
  const topRegion = sorted[0];
  const kpis = [
    {
      key: "top_geo",
      label: "Top Performing City/Region",
      value: topRegion?.revenue || 0,
      formattedValue: topRegion ? `${topRegion.city}` : "N/A",
      subtext: topRegion ? `${formatReportCurrency(topRegion.revenue, ctx.currency)} (${topRegion.orders} orders)` : "No data"
    },
    {
      key: "total_cities",
      label: "Distinct Delivery Locations",
      value: sorted.length,
      formattedValue: formatReportNumber(sorted.length),
      subtext: "Active shipping destinations"
    }
  ];
  const chartData = sorted.slice(0, 10).map((g) => ({
    region: g.city.slice(0, 14),
    revenue: Math.round(g.revenue),
    orders: g.orders
  }));
  return {
    meta: buildReportMeta(ctx, "sales", "sales-by-geo", "Sales by Geographic Region"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "region",
      series: [
        { key: "revenue", name: "Revenue", color: "#0ea5e9" },
        { key: "orders", name: "Orders", color: "#64748b" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runNewVsReturningReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ["cancelled"] } }
    ]
  };
  if (ctx.storeId) where.and.push({ store: { equals: ctx.storeId } });
  let currentOrders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({ collection: "orders", where, limit: 3e3, depth: 0 });
    currentOrders = res.docs;
  }
  const pastOrdersRes = await payload.find({
    collection: "orders",
    where: {
      createdAt: { less_than: ctx.startDate.toISOString() },
      status: { not_in: ["cancelled"] }
    },
    limit: 5e3,
    depth: 0
  });
  const pastBuyerEmails = /* @__PURE__ */ new Set();
  for (const o of pastOrdersRes.docs) {
    const email = o.guestEmail || o.buyerSnapshot?.email;
    if (email) pastBuyerEmails.add(email.toLowerCase());
  }
  let newOrdersCount = 0;
  let newRev = 0;
  let retOrdersCount = 0;
  let retRev = 0;
  for (const o of currentOrders) {
    const email = o.guestEmail || o.buyerSnapshot?.email;
    const orderCurr = String(o.currency || ctx.currency).toUpperCase();
    const rev = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate);
    if (email && pastBuyerEmails.has(email.toLowerCase())) {
      retOrdersCount += 1;
      retRev += rev;
    } else {
      newOrdersCount += 1;
      newRev += rev;
    }
  }
  const totalRev = newRev + retRev;
  const totalOrders = newOrdersCount + retOrdersCount;
  const rows = [
    {
      cohort: "New Customers (First-time)",
      ordersCount: newOrdersCount,
      revenue: formatReportCurrency(newRev, ctx.currency),
      aov: formatReportCurrency(newOrdersCount > 0 ? newRev / newOrdersCount : 0, ctx.currency),
      share: formatReportPercent(totalRev > 0 ? newRev / totalRev * 100 : 0)
    },
    {
      cohort: "Returning Customers (Repeat)",
      ordersCount: retOrdersCount,
      revenue: formatReportCurrency(retRev, ctx.currency),
      aov: formatReportCurrency(retOrdersCount > 0 ? retRev / retOrdersCount : 0, ctx.currency),
      share: formatReportPercent(totalRev > 0 ? retRev / totalRev * 100 : 0)
    }
  ];
  const columns = [
    { key: "cohort", label: "Customer Cohort", align: "left", format: "text" },
    { key: "ordersCount", label: "Orders Placed", align: "right", format: "number" },
    { key: "revenue", label: "Revenue Generated", align: "right", format: "currency" },
    { key: "aov", label: "Average Order Value", align: "right", format: "currency" },
    { key: "share", label: "Revenue Share", align: "right", format: "percent" }
  ];
  const totals = {
    cohort: "Total Customer Base",
    ordersCount: formatReportNumber(totalOrders),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(totalOrders > 0 ? totalRev / totalOrders : 0, ctx.currency),
    share: "100.0%"
  };
  const kpis = [
    {
      key: "acquisition_rev",
      label: "New Customer Acquisition",
      value: newRev,
      formattedValue: formatReportCurrency(newRev, ctx.currency),
      subtext: `${newOrdersCount} first-time orders`
    },
    {
      key: "retention_rev",
      label: "Repeat Retention Revenue",
      value: retRev,
      formattedValue: formatReportCurrency(retRev, ctx.currency),
      subtext: `${retOrdersCount} returning shopper orders`
    }
  ];
  const chartData = [
    { cohort: "New Customers", revenue: Math.round(newRev), orders: newOrdersCount },
    { cohort: "Returning", revenue: Math.round(retRev), orders: retOrdersCount }
  ];
  return {
    meta: buildReportMeta(ctx, "sales", "new-vs-returning", "New vs. Returning Customer Cohorts"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "cohort",
      series: [
        { key: "revenue", name: "Revenue", color: "#10b981" },
        { key: "orders", name: "Orders", color: "#6366f1" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runProductPerformanceReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } }
    ]
  };
  if (ctx.isVendor && ctx.tenantId) {
    ;
    where.and.push({ tenant: { equals: ctx.tenantId } });
  }
  let items = [];
  if (collectionExists2(payload, "order-items")) {
    const res = await payload.find({ collection: "order-items", where, limit: 3e3, depth: 1 });
    items = res.docs;
  }
  const prodMap = {};
  let grandUnits = 0;
  let grandRevenue = 0;
  for (const it of items) {
    const prodId = typeof it.product === "object" ? it.product?.id : it.product || it.productName;
    const name = it.productName || (typeof it.product === "object" ? it.product?.title : "Product");
    const sku = it.sku || "";
    const qty = Number(it.quantity) || 1;
    const itOrder = typeof it.order === "object" ? it.order : null;
    const orderCurr = String(itOrder?.currency || it.currency || ctx.currency).toUpperCase();
    const rawPrice = Number(it.totalPrice) || Number(it.price || 0) * qty;
    const price = convertReportCurrency(rawPrice, orderCurr, ctx.currency, ctx.usdToBdtRate);
    const orderId = typeof it.order === "object" ? it.order?.id : it.order;
    if (!prodMap[prodId]) {
      prodMap[prodId] = { id: prodId, name, sku, unitsSold: 0, revenue: 0, orderIds: /* @__PURE__ */ new Set() };
    }
    prodMap[prodId].unitsSold += qty;
    prodMap[prodId].revenue += price;
    if (orderId) prodMap[prodId].orderIds.add(String(orderId));
    grandUnits += qty;
    grandRevenue += price;
  }
  const sorted = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue);
  const rows = sorted.map((p) => {
    const avgPrice = p.unitsSold > 0 ? p.revenue / p.unitsSold : 0;
    const share = grandRevenue > 0 ? p.revenue / grandRevenue * 100 : 0;
    return {
      productName: p.name,
      sku: p.sku || "N/A",
      unitsSold: p.unitsSold,
      ordersCount: p.orderIds.size,
      avgPrice: formatReportCurrency(avgPrice, ctx.currency),
      revenue: formatReportCurrency(p.revenue, ctx.currency),
      share: formatReportPercent(share)
    };
  });
  const columns = [
    { key: "productName", label: "Product Name", align: "left", format: "text" },
    { key: "sku", label: "SKU", align: "left", format: "text" },
    { key: "unitsSold", label: "Units Sold", align: "right", format: "number" },
    { key: "ordersCount", label: "Order Frequency", align: "right", format: "number" },
    { key: "avgPrice", label: "Avg Sale Price", align: "right", format: "currency" },
    { key: "revenue", label: "Gross Revenue", align: "right", format: "currency" },
    { key: "share", label: "Revenue Share", align: "right", format: "percent" }
  ];
  const totals = {
    productName: "All Catalog Products",
    sku: `${sorted.length} Products`,
    unitsSold: formatReportNumber(grandUnits),
    ordersCount: formatReportNumber(items.length),
    avgPrice: formatReportCurrency(grandUnits > 0 ? grandRevenue / grandUnits : 0, ctx.currency),
    revenue: formatReportCurrency(grandRevenue, ctx.currency),
    share: "100.0%"
  };
  const topProduct = sorted[0];
  const kpis = [
    {
      key: "top_product",
      label: "Top Selling Product",
      value: topProduct?.revenue || 0,
      formattedValue: topProduct ? topProduct.name : "N/A",
      subtext: topProduct ? `${topProduct.unitsSold} units (${formatReportCurrency(topProduct.revenue, ctx.currency)})` : "No data"
    },
    {
      key: "total_units",
      label: "Total Units Sold",
      value: grandUnits,
      formattedValue: formatReportNumber(grandUnits),
      subtext: `Across ${sorted.length} unique products`
    },
    {
      key: "total_gross",
      label: "Catalog Revenue",
      value: grandRevenue,
      formattedValue: formatReportCurrency(grandRevenue, ctx.currency),
      subtext: "Product sales total"
    }
  ];
  const chartData = sorted.slice(0, 10).map((p) => ({
    name: p.name.length > 16 ? `${p.name.slice(0, 15)}...` : p.name,
    revenue: Math.round(p.revenue),
    units: p.unitsSold
  }));
  return {
    meta: buildReportMeta(ctx, "products", "product-performance", "Product Performance & Sales Volume"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "name",
      series: [
        { key: "revenue", name: "Revenue", color: "#10b981" },
        { key: "units", name: "Units Sold", color: "#3b82f6" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runSalesByCategoryReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } }
    ]
  };
  let items = [];
  if (collectionExists2(payload, "order-items")) {
    const res = await payload.find({ collection: "order-items", where, limit: 3e3, depth: 2 });
    items = res.docs;
  }
  const catMap = {};
  let totalRevenue = 0;
  let totalUnits = 0;
  for (const it of items) {
    const prod = typeof it.product === "object" ? it.product : null;
    const cats = Array.isArray(prod?.categories) ? prod.categories : [];
    const itOrder = typeof it.order === "object" ? it.order : null;
    const orderCurr = String(itOrder?.currency || it.currency || ctx.currency).toUpperCase();
    const qty = Number(it.quantity) || 1;
    const rawPrice = Number(it.totalPrice) || 0;
    const price = convertReportCurrency(rawPrice, orderCurr, ctx.currency, ctx.usdToBdtRate);
    if (cats.length === 0) {
      if (!catMap["uncategorized"]) catMap["uncategorized"] = { id: "uncategorized", name: "Uncategorized", units: 0, revenue: 0 };
      catMap["uncategorized"].units += qty;
      catMap["uncategorized"].revenue += price;
    } else {
      for (const c of cats) {
        const catId = typeof c === "object" ? c.id : c;
        const catName = typeof c === "object" ? c.title || c.name : "Category";
        if (!catMap[catId]) catMap[catId] = { id: catId, name: catName, units: 0, revenue: 0 };
        catMap[catId].units += qty;
        catMap[catId].revenue += price;
      }
    }
    totalRevenue += price;
    totalUnits += qty;
  }
  const sorted = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
  const rows = sorted.map((c) => {
    const share = totalRevenue > 0 ? c.revenue / totalRevenue * 100 : 0;
    return {
      category: c.name,
      unitsSold: c.units,
      revenue: formatReportCurrency(c.revenue, ctx.currency),
      share: formatReportPercent(share)
    };
  });
  const columns = [
    { key: "category", label: "Category Name", align: "left", format: "text" },
    { key: "unitsSold", label: "Units Sold", align: "right", format: "number" },
    { key: "revenue", label: "Category Revenue", align: "right", format: "currency" },
    { key: "share", label: "Revenue Share", align: "right", format: "percent" }
  ];
  const totals = {
    category: "All Categories Combined",
    unitsSold: formatReportNumber(totalUnits),
    revenue: formatReportCurrency(totalRevenue, ctx.currency),
    share: "100.0%"
  };
  const topCategory = sorted[0];
  const kpis = [
    {
      key: "top_category",
      label: "Top Performing Category",
      value: topCategory?.revenue || 0,
      formattedValue: topCategory ? topCategory.name : "N/A",
      subtext: topCategory ? `${formatReportCurrency(topCategory.revenue, ctx.currency)} generated` : "No data"
    },
    {
      key: "total_categories",
      label: "Active Categories",
      value: sorted.length,
      formattedValue: formatReportNumber(sorted.length),
      subtext: "With transactions in this period"
    }
  ];
  const chartData = sorted.slice(0, 8).map((c) => ({
    category: c.name,
    revenue: Math.round(c.revenue),
    units: c.units
  }));
  return {
    meta: buildReportMeta(ctx, "products", "sales-by-category", "Sales Distribution by Product Category"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "category",
      series: [
        { key: "revenue", name: "Revenue", color: "#10b981" },
        { key: "units", name: "Units", color: "#6366f1" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runProductDemandReport(payload, ctx) {
  let products = [];
  if (collectionExists2(payload, "products")) {
    const res = await payload.find({ collection: "products", limit: 100, depth: 0 });
    products = res.docs;
  }
  const wishlistCounts = {};
  if (collectionExists2(payload, "wishlist-items")) {
    const wishRes = await payload.find({ collection: "wishlist-items", limit: 2e3, depth: 0 });
    for (const w of wishRes.docs) {
      const pid = typeof w.product === "object" ? w.product?.id : w.product;
      if (pid) wishlistCounts[pid] = (wishlistCounts[pid] || 0) + 1;
    }
  }
  const rows = products.map((p) => {
    const wishlists = wishlistCounts[p.id] || 0;
    const rating = p.rating || 0;
    const reviews = p.totalReviews || 0;
    const prodCurr = String(p.currency || ctx.currency).toUpperCase();
    const basePrice = convertReportCurrency(Number(p.basePrice || 0), prodCurr, ctx.currency, ctx.usdToBdtRate);
    return {
      productName: p.title || p.name || "Product",
      sku: p.sku || "N/A",
      basePrice: formatReportCurrency(basePrice, ctx.currency),
      wishlistCount: wishlists,
      rating: rating ? `${Number(rating).toFixed(1)} \u2605` : "No reviews",
      reviewsCount: reviews,
      _demandScore: wishlists * 2 + reviews * 3 + (rating || 0) * 10
    };
  }).sort((a, b) => b._demandScore - a._demandScore);
  const columns = [
    { key: "productName", label: "Product Name", align: "left", format: "text" },
    { key: "sku", label: "SKU", align: "left", format: "text" },
    { key: "basePrice", label: "Base Price", align: "right", format: "currency" },
    { key: "wishlistCount", label: "Wishlist Adds", align: "right", format: "number" },
    { key: "rating", label: "Customer Rating", align: "center", format: "text" },
    { key: "reviewsCount", label: "Total Reviews", align: "right", format: "number" }
  ];
  const totalWish = Object.values(wishlistCounts).reduce((a, b) => a + b, 0);
  const totals = {
    productName: "Total Catalog Demand",
    sku: `${products.length} Products`,
    basePrice: "",
    wishlistCount: formatReportNumber(totalWish),
    rating: "",
    reviewsCount: ""
  };
  const kpis = [
    {
      key: "wishlist_adds",
      label: "Shopper Wishlist Adds",
      value: totalWish,
      formattedValue: formatReportNumber(totalWish),
      subtext: "High-intent shopper saves"
    },
    {
      key: "catalog_size",
      label: "Monitored Products",
      value: products.length,
      formattedValue: formatReportNumber(products.length),
      subtext: "Active catalog listings"
    }
  ];
  const chartData = rows.slice(0, 10).map((r) => ({
    name: r.productName.slice(0, 15),
    wishlists: r.wishlistCount,
    reviews: r.reviewsCount
  }));
  return {
    meta: buildReportMeta(ctx, "products", "product-demand", "Product Engagement & Shopper Demand"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "name",
      series: [
        { key: "wishlists", name: "Wishlist Adds", color: "#ec4899" },
        { key: "reviews", name: "Reviews", color: "#f59e0b" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runAbandonedCartsReport(payload, ctx) {
  const thresholdTime = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
  const where = {
    and: [
      { updatedAt: { less_than: thresholdTime } },
      { subtotal: { greater_than: 0 } }
    ]
  };
  let carts = [];
  if (collectionExists2(payload, "carts")) {
    const res = await payload.find({ collection: "carts", where, limit: 1e3, depth: 1, sort: "-updatedAt" });
    carts = res.docs;
  }
  let totalLostValue = 0;
  let totalItemsInCarts = 0;
  const rows = carts.map((c) => {
    const items = Array.isArray(c.items) ? c.items : [];
    const count = items.reduce((sum, it) => sum + (Number(it?.quantity) || 1), 0);
    const cartCurr = String(c.currency || ctx.currency).toUpperCase();
    const rawVal = Number(c.grandTotal || c.subtotal) || 0;
    const val = convertReportCurrency(rawVal, cartCurr, ctx.currency, ctx.usdToBdtRate);
    totalLostValue += val;
    totalItemsInCarts += count;
    const userEmail = typeof c.user === "object" ? c.user?.email : null;
    const customerIdentifier = userEmail || (c.guestId ? `Guest (${c.guestId.slice(0, 8)})` : "Anonymous");
    const lastActive = new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return {
      cartId: `CART-${String(c.id).slice(0, 8)}`,
      customer: customerIdentifier,
      itemsCount: count,
      coupon: c.couponCode || "None",
      cartValue: formatReportCurrency(val, ctx.currency),
      lastActive,
      _rawVal: val
    };
  });
  const columns = [
    { key: "cartId", label: "Cart ID", align: "left", format: "text" },
    { key: "customer", label: "Shopper / Email", align: "left", format: "text" },
    { key: "itemsCount", label: "Items in Cart", align: "right", format: "number" },
    { key: "coupon", label: "Coupon Applied", align: "left", format: "text" },
    { key: "cartValue", label: "Abandoned Value", align: "right", format: "currency" },
    { key: "lastActive", label: "Last Abandoned", align: "right", format: "date" }
  ];
  const totals = {
    cartId: "All Abandoned Carts",
    customer: `${carts.length} Incomplete Checkouts`,
    itemsCount: formatReportNumber(totalItemsInCarts),
    coupon: "",
    cartValue: formatReportCurrency(totalLostValue, ctx.currency),
    lastActive: ""
  };
  const kpis = [
    {
      key: "lost_rev",
      label: "Potential Lost Cart Value",
      value: totalLostValue,
      formattedValue: formatReportCurrency(totalLostValue, ctx.currency),
      subtext: `Across ${carts.length} abandoned sessions`
    },
    {
      key: "avg_cart",
      label: "Average Abandoned Basket",
      value: carts.length > 0 ? totalLostValue / carts.length : 0,
      formattedValue: formatReportCurrency(carts.length > 0 ? totalLostValue / carts.length : 0, ctx.currency),
      subtext: "Value per abandoned cart"
    },
    {
      key: "total_items",
      label: "Unconverted Items",
      value: totalItemsInCarts,
      formattedValue: formatReportNumber(totalItemsInCarts),
      subtext: "Products left in baskets"
    }
  ];
  const chartData = rows.slice(0, 10).map((r) => ({
    cart: r.cartId,
    value: Math.round(r._rawVal),
    items: r.itemsCount
  }));
  return {
    meta: buildReportMeta(ctx, "customers", "abandoned-carts", "Abandoned Carts & Lost Opportunity"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "cart",
      series: [
        { key: "value", name: "Cart Value", color: "#f59e0b" },
        { key: "items", name: "Item Qty", color: "#6366f1" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runCustomerLtvReport(payload, ctx) {
  const where = {
    and: [
      { status: { not_in: ["cancelled"] } }
    ]
  };
  let orders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({ collection: "orders", where, limit: 3e3, depth: 1 });
    orders = res.docs;
  }
  const custMap = {};
  let allSpend = 0;
  for (const o of orders) {
    const email = (o.guestEmail || o.buyerSnapshot?.email || (typeof o.customer === "object" ? o.customer?.email : null) || "guest@anonymous.com").toLowerCase();
    const custObj = typeof o.customer === "object" && o.customer !== null ? o.customer : null;
    const custFullName = custObj ? [custObj.firstName, custObj.lastName].filter(Boolean).join(" ") || custObj.displayName || custObj.name : null;
    const name = String(o.buyerSnapshot?.name || custFullName || (email !== "guest@anonymous.com" ? email.split("@")[0] : "Guest Customer")).trim() || "Guest Customer";
    const phone = o.buyerSnapshot?.phone || (typeof o.customer === "object" ? o.customer?.phone : "") || "N/A";
    const orderCurr = String(o.currency || ctx.currency).toUpperCase();
    const grand = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate);
    const orderDate = o.placedAt || o.createdAt;
    if (!custMap[email]) {
      custMap[email] = { email, name, phone, ordersCount: 0, totalSpend: 0, lastOrder: orderDate };
    }
    custMap[email].ordersCount += 1;
    custMap[email].totalSpend += grand;
    if (new Date(orderDate) > new Date(custMap[email].lastOrder)) {
      custMap[email].lastOrder = orderDate;
    }
    allSpend += grand;
  }
  const sorted = Object.values(custMap).sort((a, b) => b.totalSpend - a.totalSpend);
  const rows = sorted.map((c) => {
    const aov = c.ordersCount > 0 ? c.totalSpend / c.ordersCount : 0;
    return {
      customer: c.name,
      email: c.email,
      phone: c.phone || "N/A",
      ordersCount: c.ordersCount,
      totalSpend: formatReportCurrency(c.totalSpend, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      lastOrder: new Date(c.lastOrder).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };
  });
  const columns = [
    { key: "customer", label: "Customer Name", align: "left", format: "text" },
    { key: "email", label: "Email", align: "left", format: "text" },
    { key: "ordersCount", label: "Total Orders", align: "right", format: "number" },
    { key: "totalSpend", label: "Lifetime Spend", align: "right", format: "currency" },
    { key: "aov", label: "Average Order Value", align: "right", format: "currency" },
    { key: "lastOrder", label: "Last Purchase", align: "right", format: "date" }
  ];
  const totals = {
    customer: "All Customers",
    email: `${sorted.length} Buyers`,
    ordersCount: formatReportNumber(orders.length),
    totalSpend: formatReportCurrency(allSpend, ctx.currency),
    aov: formatReportCurrency(orders.length > 0 ? allSpend / orders.length : 0, ctx.currency),
    lastOrder: ""
  };
  const topCust = sorted[0];
  const kpis = [
    {
      key: "top_spender",
      label: "Top Customer Spend",
      value: topCust?.totalSpend || 0,
      formattedValue: topCust ? `${formatReportCurrency(topCust.totalSpend, ctx.currency)}` : "N/A",
      subtext: topCust ? `${topCust.name || "Customer"} (${topCust.ordersCount} orders)` : "No data"
    },
    {
      key: "avg_ltv",
      label: "Average Customer LTV",
      value: sorted.length > 0 ? allSpend / sorted.length : 0,
      formattedValue: formatReportCurrency(sorted.length > 0 ? allSpend / sorted.length : 0, ctx.currency),
      subtext: `Across ${sorted.length} customer records`
    }
  ];
  const chartData = sorted.slice(0, 10).map((c) => ({
    name: String(c.name || c.email || "Customer").slice(0, 14),
    spend: Math.round(c.totalSpend),
    orders: c.ordersCount
  }));
  return {
    meta: buildReportMeta(ctx, "customers", "customer-ltv", "Customer Lifetime Value & Top Spenders"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "name",
      series: [
        { key: "spend", name: "Total Spend", color: "#10b981" },
        { key: "orders", name: "Orders", color: "#3b82f6" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runAbandonedProductsReport(payload, ctx) {
  const thresholdTime = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
  const where = {
    and: [
      { updatedAt: { less_than: thresholdTime } },
      { subtotal: { greater_than: 0 } }
    ]
  };
  let carts = [];
  if (collectionExists2(payload, "carts")) {
    const res = await payload.find({ collection: "carts", where, limit: 1e3, depth: 2 });
    carts = res.docs;
  }
  const prodMap = {};
  let totalLostQty = 0;
  let totalLostVal = 0;
  for (const c of carts) {
    const items = Array.isArray(c.items) ? c.items : [];
    for (const it of items) {
      const prod = typeof it.product === "object" ? it.product : null;
      const prodId = prod?.id || it.product;
      if (!prodId) continue;
      const name = prod?.title || prod?.name || "Product";
      const sku = prod?.sku || "";
      const prodCurr = String(prod?.currency || it.currency || ctx.currency).toUpperCase();
      const rawPrice = Number(it.unitPrice || prod?.basePrice || 0);
      const price = convertReportCurrency(rawPrice, prodCurr, ctx.currency, ctx.usdToBdtRate);
      const qty = Number(it.quantity) || 1;
      if (!prodMap[prodId]) {
        prodMap[prodId] = { id: prodId, name, sku, price, abandonedQty: 0, abandonedCartsCount: 0 };
      }
      prodMap[prodId].abandonedQty += qty;
      prodMap[prodId].abandonedCartsCount += 1;
      totalLostQty += qty;
      totalLostVal += price * qty;
    }
  }
  const sorted = Object.values(prodMap).sort((a, b) => b.abandonedQty - a.abandonedQty);
  const rows = sorted.map((p) => {
    const lostRev = p.abandonedQty * p.price;
    return {
      productName: p.name,
      sku: p.sku || "N/A",
      unitPrice: formatReportCurrency(p.price, ctx.currency),
      abandonedQty: p.abandonedQty,
      cartCount: p.abandonedCartsCount,
      lostValue: formatReportCurrency(lostRev, ctx.currency)
    };
  });
  const columns = [
    { key: "productName", label: "Product Name", align: "left", format: "text" },
    { key: "sku", label: "SKU", align: "left", format: "text" },
    { key: "unitPrice", label: "Unit Price", align: "right", format: "currency" },
    { key: "abandonedQty", label: "Abandoned Units", align: "right", format: "number" },
    { key: "cartCount", label: "In Abandoned Carts", align: "right", format: "number" },
    { key: "lostValue", label: "Total Lost Potential", align: "right", format: "currency" }
  ];
  const totals = {
    productName: "All Abandoned Products",
    sku: `${sorted.length} Unique Items`,
    unitPrice: "",
    abandonedQty: formatReportNumber(totalLostQty),
    cartCount: "",
    lostValue: formatReportCurrency(totalLostVal, ctx.currency)
  };
  const kpis = [
    {
      key: "most_abandoned",
      label: "Most Frequently Abandoned",
      value: sorted[0]?.abandonedQty || 0,
      formattedValue: sorted[0] ? sorted[0].name : "N/A",
      subtext: sorted[0] ? `${sorted[0].abandonedQty} units left unpurchased` : "No data"
    },
    {
      key: "total_lost_value",
      label: "Total Opportunity in Cart",
      value: totalLostVal,
      formattedValue: formatReportCurrency(totalLostVal, ctx.currency),
      subtext: `${totalLostQty} total units in abandoned carts`
    }
  ];
  const chartData = sorted.slice(0, 10).map((p) => ({
    name: p.name.slice(0, 15),
    qty: p.abandonedQty,
    carts: p.abandonedCartsCount
  }));
  return {
    meta: buildReportMeta(ctx, "customers", "abandoned-products", "Most Frequently Abandoned Products"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "name",
      series: [
        { key: "qty", name: "Abandoned Units", color: "#f59e0b" },
        { key: "carts", name: "Cart Count", color: "#ef4444" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runCustomerOrdersReport(payload, ctx) {
  const where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } }
    ]
  };
  if (ctx.storeId) {
    where.and.push({ store: { equals: ctx.storeId } });
  }
  let orders = [];
  if (collectionExists2(payload, "orders")) {
    const res = await payload.find({
      collection: "orders",
      where,
      limit: 3e3,
      depth: 1,
      sort: "-createdAt"
    });
    orders = res.docs;
  }
  let totalRevenue = 0;
  let totalItemsCount = 0;
  const uniqueCustomers = /* @__PURE__ */ new Set();
  const deviceCounts = {
    Desktop: { count: 0, revenue: 0 },
    Mobile: { count: 0, revenue: 0 },
    Tablet: { count: 0, revenue: 0 },
    "Other/Direct": { count: 0, revenue: 0 }
  };
  const rows = orders.map((o) => {
    const email = String(
      o.guestEmail || o.buyerSnapshot?.email || (typeof o.customer === "object" ? o.customer?.email : null) || "guest@anonymous.com"
    ).toLowerCase();
    const custObj = typeof o.customer === "object" && o.customer !== null ? o.customer : null;
    const custFullName = custObj ? [custObj.firstName, custObj.lastName].filter(Boolean).join(" ") || custObj.displayName || custObj.name : null;
    const customer = String(
      o.buyerSnapshot?.name || custFullName || (email !== "guest@anonymous.com" ? email.split("@")[0] : "Guest Shopper")
    ).trim() || "Guest Shopper";
    const phone = o.buyerSnapshot?.phone || (typeof o.customer === "object" ? o.customer?.phone : "") || "N/A";
    const accountType = custObj ? "Registered" : "Guest";
    if (email && email !== "guest@anonymous.com") {
      uniqueCustomers.add(email);
    } else {
      uniqueCustomers.add(String(o.id));
    }
    const items = Array.isArray(o.items) ? o.items : [];
    const itemsCount = items.reduce((sum, it) => sum + (Number(it?.quantity) || 1), 0);
    totalItemsCount += itemsCount;
    const orderCurr = String(o.currency || ctx.currency).toUpperCase();
    const rawGrand = Number(o.grandTotal) || 0;
    const grand = convertReportCurrency(rawGrand, orderCurr, ctx.currency, ctx.usdToBdtRate);
    totalRevenue += grand;
    const dt = o.deviceTracking || {};
    const rawDev = String(dt.deviceType || "").toLowerCase();
    let deviceLabel = "Desktop";
    if (rawDev.includes("mobile")) deviceLabel = "Mobile";
    else if (rawDev.includes("tablet")) deviceLabel = "Tablet";
    else if (rawDev.includes("desktop")) deviceLabel = "Desktop";
    else deviceLabel = "Other/Direct";
    if (!deviceCounts[deviceLabel]) {
      deviceCounts[deviceLabel] = { count: 0, revenue: 0 };
    }
    deviceCounts[deviceLabel].count += 1;
    deviceCounts[deviceLabel].revenue += grand;
    const browser = dt.browser || "Chrome (Web)";
    const os = dt.os || "Desktop OS";
    const ipAddress = dt.ipAddress || "127.0.0.1";
    const orderDate = new Date(o.placedAt || o.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return {
      orderNumber: o.orderNumber || `ORD-${String(o.id).slice(0, 8)}`,
      placedAt: orderDate,
      customer,
      email,
      phone,
      accountType,
      itemsCount,
      grandTotal: formatReportCurrency(grand, ctx.currency),
      paymentStatus: String(o.paymentStatus || "unpaid"),
      orderStatus: String(o.status || "pending"),
      deviceType: deviceLabel,
      browserOs: `${browser} / ${os}`,
      ipAddress,
      _rawTotal: grand
    };
  });
  const columns = [
    { key: "orderNumber", label: "Order Number", align: "left", format: "text" },
    { key: "placedAt", label: "Date & Time", align: "left", format: "date" },
    { key: "customer", label: "Customer Name", align: "left", format: "text" },
    { key: "email", label: "Email Address", align: "left", format: "text" },
    { key: "accountType", label: "Account", align: "center", format: "badge" },
    { key: "itemsCount", label: "Items", align: "right", format: "number" },
    { key: "grandTotal", label: "Order Total", align: "right", format: "currency" },
    { key: "paymentStatus", label: "Payment", align: "center", format: "badge" },
    { key: "deviceType", label: "Device", align: "center", format: "badge" },
    { key: "browserOs", label: "Browser & OS", align: "left", format: "text" },
    { key: "ipAddress", label: "IP Address", align: "left", format: "text" }
  ];
  const totals = {
    orderNumber: "All Customer Orders",
    placedAt: `${orders.length} Total Orders`,
    customer: `${uniqueCustomers.size} Unique Shoppers`,
    email: "",
    accountType: "",
    itemsCount: formatReportNumber(totalItemsCount),
    grandTotal: formatReportCurrency(totalRevenue, ctx.currency),
    paymentStatus: "",
    deviceType: `${deviceCounts.Desktop.count} Desk / ${deviceCounts.Mobile.count} Mob`,
    browserOs: "",
    ipAddress: ""
  };
  const topDeviceEntry = Object.entries(deviceCounts).sort((a, b) => b[1].count - a[1].count)[0];
  const topDeviceShare = orders.length > 0 && topDeviceEntry ? topDeviceEntry[1].count / orders.length * 100 : 0;
  const aov = orders.length > 0 ? totalRevenue / orders.length : 0;
  const kpis = [
    {
      key: "total_orders",
      label: "Total Customer Orders",
      value: orders.length,
      formattedValue: formatReportNumber(orders.length),
      subtext: `${uniqueCustomers.size} active purchasers`
    },
    {
      key: "customer_revenue",
      label: "Total Customer Volume",
      value: totalRevenue,
      formattedValue: formatReportCurrency(totalRevenue, ctx.currency),
      subtext: `Avg Order ${formatReportCurrency(aov, ctx.currency)}`
    },
    {
      key: "primary_device",
      label: "Primary Device Channel",
      value: topDeviceEntry ? topDeviceEntry[1].count : 0,
      formattedValue: topDeviceEntry ? `${topDeviceEntry[0]} (${topDeviceShare.toFixed(1)}%)` : "N/A",
      subtext: topDeviceEntry ? `${topDeviceEntry[1].count} checkouts captured` : "No device data"
    },
    {
      key: "unique_customers",
      label: "Customer Shopper Base",
      value: uniqueCustomers.size,
      formattedValue: formatReportNumber(uniqueCustomers.size),
      subtext: `${totalItemsCount} total items ordered`
    }
  ];
  const chartData = Object.entries(deviceCounts).map(([device, data]) => ({
    device,
    orders: data.count,
    revenue: Math.round(data.revenue)
  }));
  return {
    meta: buildReportMeta(ctx, "customers", "customer-orders", "Customer Orders & Device Tracking"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "device",
      series: [
        { key: "orders", name: "Order Volume", color: "#3b82f6" },
        { key: "revenue", name: "Revenue", color: "#10b981" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runLowStockReport(payload, ctx) {
  const where = {};
  if (ctx.storeId) where.location = { equals: ctx.storeId };
  let stockDocs = [];
  if (collectionExists2(payload, "stock-levels")) {
    const res = await payload.find({ collection: "stock-levels", where, limit: 1e3, depth: 2 });
    stockDocs = res.docs;
  }
  let outOfStockCount = 0;
  let lowStockCount = 0;
  const items = stockDocs.map((s) => {
    const prod = typeof s.product === "object" ? s.product : null;
    const loc = typeof s.location === "object" ? s.location : null;
    const qty = Number(s.quantity) || 0;
    const reserved = Number(s.reservedQuantity) || 0;
    const available = Math.max(0, qty - reserved);
    const threshold = Number(s.lowStockThreshold) || Number(prod?.lowStockThreshold) || 10;
    let status = "In Stock";
    if (qty <= 0) {
      status = "Out of Stock";
      outOfStockCount += 1;
    } else if (available <= threshold) {
      status = "Low Stock";
      lowStockCount += 1;
    }
    return {
      productName: prod?.title || prod?.name || `Product #${s.product}`,
      sku: prod?.sku || "N/A",
      location: loc?.name || loc?.code || "Main Warehouse",
      quantity: qty,
      reserved,
      available,
      threshold,
      status,
      _urgency: qty <= 0 ? 3 : available <= threshold ? 2 : 1
    };
  }).filter((s) => s.quantity <= s.threshold || s.available <= s.threshold).sort((a, b) => b._urgency - a._urgency || a.available - b.available);
  const rows = items.map((it) => ({
    productName: it.productName,
    sku: it.sku,
    location: it.location,
    quantity: it.quantity,
    reserved: it.reserved,
    available: it.available,
    threshold: it.threshold,
    status: it.status
  }));
  const columns = [
    { key: "productName", label: "Product / Item", align: "left", format: "text" },
    { key: "sku", label: "SKU", align: "left", format: "text" },
    { key: "location", label: "Warehouse / Store", align: "left", format: "text" },
    { key: "quantity", label: "On Hand", align: "right", format: "number" },
    { key: "reserved", label: "Reserved", align: "right", format: "number" },
    { key: "available", label: "Available to Sell", align: "right", format: "number" },
    { key: "threshold", label: "Safety Threshold", align: "right", format: "number" },
    { key: "status", label: "Stock Status", align: "center", format: "badge" }
  ];
  const totals = {
    productName: "Total At-Risk Stock Items",
    sku: `${items.length} SKUs`,
    location: "",
    quantity: formatReportNumber(items.reduce((s, it) => s + it.quantity, 0)),
    reserved: formatReportNumber(items.reduce((s, it) => s + it.reserved, 0)),
    available: formatReportNumber(items.reduce((s, it) => s + it.available, 0)),
    threshold: "",
    status: ""
  };
  const kpis = [
    {
      key: "out_of_stock",
      label: "Out of Stock SKUs",
      value: outOfStockCount,
      formattedValue: formatReportNumber(outOfStockCount),
      subtext: "Requires urgent replenishment"
    },
    {
      key: "low_stock",
      label: "Low Stock Alerts",
      value: lowStockCount,
      formattedValue: formatReportNumber(lowStockCount),
      subtext: "Below minimum safety threshold"
    },
    {
      key: "total_alerts",
      label: "Total Reorder Alerts",
      value: items.length,
      formattedValue: formatReportNumber(items.length),
      subtext: "SKUs requiring procurement"
    }
  ];
  const chartData = items.slice(0, 10).map((it) => ({
    name: it.productName.slice(0, 15),
    available: it.available,
    threshold: it.threshold
  }));
  return {
    meta: buildReportMeta(ctx, "inventory", "low-stock-alert", "Low Stock & Restock Replenishment Alerts"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "name",
      series: [
        { key: "available", name: "Available Qty", color: "#ef4444" },
        { key: "threshold", name: "Safety Threshold", color: "#94a3b8" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
async function runStockValuationReport(payload, ctx) {
  const where = {};
  if (ctx.storeId) where.location = { equals: ctx.storeId };
  let stockDocs = [];
  if (collectionExists2(payload, "stock-levels")) {
    const res = await payload.find({ collection: "stock-levels", where, limit: 2e3, depth: 2 });
    stockDocs = res.docs;
  }
  const locMap = {};
  let totalCatalogUnits = 0;
  let totalCatalogValue = 0;
  for (const s of stockDocs) {
    const loc = typeof s.location === "object" ? s.location : null;
    const locId = loc?.id || "default";
    const locName = loc?.name || loc?.code || "Main Warehouse";
    const prod = typeof s.product === "object" ? s.product : null;
    const prodCurr = String(prod?.currency || ctx.currency).toUpperCase();
    const basePrice = convertReportCurrency(Number(prod?.basePrice || 0), prodCurr, ctx.currency, ctx.usdToBdtRate);
    const qty = Number(s.quantity) || 0;
    const val = qty * basePrice;
    if (!locMap[locId]) {
      locMap[locId] = { id: locId, name: locName, skuCount: 0, totalUnits: 0, totalValuation: 0 };
    }
    locMap[locId].skuCount += 1;
    locMap[locId].totalUnits += qty;
    locMap[locId].totalValuation += val;
    totalCatalogUnits += qty;
    totalCatalogValue += val;
  }
  const rows = Object.values(locMap).map((l) => {
    const share = totalCatalogValue > 0 ? l.totalValuation / totalCatalogValue * 100 : 0;
    return {
      location: l.name,
      skuCount: l.skuCount,
      totalUnits: l.totalUnits,
      valuation: formatReportCurrency(l.totalValuation, ctx.currency),
      share: formatReportPercent(share)
    };
  });
  const columns = [
    { key: "location", label: "Warehouse / Store Location", align: "left", format: "text" },
    { key: "skuCount", label: "Unique SKUs Stored", align: "right", format: "number" },
    { key: "totalUnits", label: "Total Units on Hand", align: "right", format: "number" },
    { key: "valuation", label: "Stock Valuation (At Base Cost)", align: "right", format: "currency" },
    { key: "share", label: "Valuation Share", align: "right", format: "percent" }
  ];
  const totals = {
    location: "Total Enterprise Inventory",
    skuCount: formatReportNumber(stockDocs.length),
    totalUnits: formatReportNumber(totalCatalogUnits),
    valuation: formatReportCurrency(totalCatalogValue, ctx.currency),
    share: "100.0%"
  };
  const kpis = [
    {
      key: "total_inventory_value",
      label: "Total Inventory Asset Valuation",
      value: totalCatalogValue,
      formattedValue: formatReportCurrency(totalCatalogValue, ctx.currency),
      subtext: `Across ${formatReportNumber(totalCatalogUnits)} total units`
    },
    {
      key: "locations_count",
      label: "Active Warehouses / Stores",
      value: Object.keys(locMap).length,
      formattedValue: formatReportNumber(Object.keys(locMap).length),
      subtext: "Fulfillment locations"
    }
  ];
  const chartData = Object.values(locMap).map((l) => ({
    location: l.name,
    valuation: Math.round(l.totalValuation),
    units: l.totalUnits
  }));
  return {
    meta: buildReportMeta(ctx, "inventory", "stock-valuation", "Inventory Asset Valuation by Location"),
    kpis,
    chart: {
      type: "bar",
      xAxisKey: "location",
      series: [
        { key: "valuation", name: "Valuation", color: "#10b981" },
        { key: "units", name: "Total Units", color: "#6366f1" }
      ],
      data: chartData
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals)
  };
}
var REPORT_CURRENCY_SYMBOLS;
var init_admin_reports = __esm({
  "packages/backend/src/lib/admin-reports.ts"() {
    "use strict";
    init_currencies();
    REPORT_CURRENCY_SYMBOLS = {
      USD: "$",
      BDT: "\u09F3",
      EUR: "\u20AC",
      GBP: "\xA3",
      INR: "\u20B9",
      CAD: "CA$",
      AUD: "AU$",
      JPY: "\xA5",
      AED: "AED ",
      SAR: "SAR "
    };
  }
});

// packages/backend/src/endpoints/admin-reports.ts
function formatAdminReportError(err) {
  return err instanceof Error ? err.message : "Failed to generate report";
}
async function adminReportsHandler(req) {
  const user = req.user;
  if (!user?.id) {
    return Response.json({ errors: [{ message: "Unauthorized" }] }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "vendor") {
    return Response.json({ errors: [{ message: "Forbidden" }] }, { status: 403 });
  }
  const url = new URL(req.url ?? "", "http://localhost");
  const qs = url.searchParams;
  const options = {
    category: qs.get("category") || void 0,
    reportType: qs.get("reportType") || void 0,
    period: qs.get("period") || void 0,
    startDate: qs.get("startDate") || void 0,
    endDate: qs.get("endDate") || void 0,
    storeId: qs.get("storeId") || void 0,
    currency: qs.get("currency") || void 0,
    format: qs.get("format") || "json"
  };
  try {
    const report = await generateAdminReport(
      req.payload,
      {
        id: String(user.id),
        role: user.role,
        tenant: user.tenant
      },
      options
    );
    if (options.format === "csv") {
      const filename2 = `${report.meta.reportType}-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      return new Response(report.csvData || "", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename2}"`
        }
      });
    }
    return Response.json(report);
  } catch (err) {
    return Response.json({ errors: [{ message: formatAdminReportError(err) }] }, { status: 500 });
  }
}
var adminReportsEndpoint;
var init_admin_reports2 = __esm({
  "packages/backend/src/endpoints/admin-reports.ts"() {
    "use strict";
    init_admin_reports();
    adminReportsEndpoint = {
      path: "/reports",
      method: "get",
      handler: async (req) => adminReportsHandler(req)
    };
  }
});

// packages/backend/src/plugins/reports/index.ts
var reports_exports = {};
__export(reports_exports, {
  reportsPlugin: () => reportsPlugin
});
var reportsPlugin;
var init_reports = __esm({
  "packages/backend/src/plugins/reports/index.ts"() {
    "use strict";
    init_admin_reports2();
    reportsPlugin = (options = {}) => (incomingConfig) => {
      const { enabled = true } = options;
      if (!enabled) return incomingConfig;
      const existingEndpoints = incomingConfig.endpoints || [];
      const hasEndpoint = existingEndpoints.some((ep) => ep.path === "/reports" && ep.method === "get");
      const existingViews = incomingConfig.admin?.components?.views || {};
      const existingAfterNav = incomingConfig.admin?.components?.afterNavLinks || [];
      const hasReportsNavLink = existingAfterNav.includes("/components/admin/ReportsNavLink");
      return {
        ...incomingConfig,
        endpoints: hasEndpoint ? existingEndpoints : [...existingEndpoints, adminReportsEndpoint],
        admin: {
          ...incomingConfig.admin || {},
          components: {
            ...incomingConfig.admin?.components || {},
            views: {
              ...existingViews,
              reports: {
                Component: "/components/admin/ReportsHome",
                path: "/reports",
                exact: true
              }
            },
            afterNavLinks: hasReportsNavLink ? existingAfterNav : [...existingAfterNav, "/components/admin/ReportsNavLink"]
          }
        }
      };
    };
  }
});

// packages/backend/migrations/20260426_095728.ts
import { sql } from "@payloadcms/db-postgres";
async function up({ db, payload, req }) {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'bn');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'vendor', 'customer');
  CREATE TYPE "public"."enum_users_status" AS ENUM('active', 'suspended', 'banned');
  CREATE TYPE "public"."enum_users_locale" AS ENUM('en', 'bn');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en', 'bn');
  CREATE TYPE "public"."enum_tenants_type" AS ENUM('platform-store', 'vendor');
  CREATE TYPE "public"."enum_vendor_settings_commission_type" AS ENUM('percentage', 'flat', 'tiered');
  CREATE TYPE "public"."enum_vendor_settings_payout_method" AS ENUM('stripe', 'bank-transfer', 'manual');
  CREATE TYPE "public"."enum_vendor_settings_shipping_model" AS ENUM('platform', 'vendor', 'hybrid');
  CREATE TYPE "public"."enum_vendor_applications_business_type" AS ENUM('individual', 'company', 'partnership');
  CREATE TYPE "public"."enum_vendor_applications_status" AS ENUM('pending', 'under-review', 'approved', 'rejected');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'pending-review', 'published', 'archived');
  CREATE TYPE "public"."enum_products_sale_display_mode" AS ENUM('none', 'strike_through', 'badge_percent', 'badge_amount', 'strike_and_badge');
  CREATE TYPE "public"."enum_products_currency" AS ENUM('BDT');
  CREATE TYPE "public"."enum_product_variants_sale_display_mode" AS ENUM('inherit', 'none', 'strike_through', 'badge_percent', 'badge_amount', 'strike_and_badge');
  CREATE TYPE "public"."enum_geo_subdivisions_default_service_tier" AS ENUM('standard', 'extended', 'unserved');
  CREATE TYPE "public"."enum_geo_localities_service_tier" AS ENUM('standard', 'extended', 'unserved');
  CREATE TYPE "public"."enum_shipping_methods_type" AS ENUM('flat', 'per-item', 'weight-based');
  CREATE TYPE "public"."enum_shipping_methods_currency" AS ENUM('BDT');
  CREATE TYPE "public"."enum_transactions_type" AS ENUM('charge', 'refund', 'partial-refund');
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'processing', 'partially-shipped', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('unpaid', 'paid', 'partially-refunded', 'refunded');
  CREATE TYPE "public"."enum_sub_orders_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_commission_rules_type" AS ENUM('percentage', 'flat', 'tiered', 'category-based');
  CREATE TYPE "public"."enum_payout_items_status" AS ENUM('included', 'held', 'disputed');
  CREATE TYPE "public"."enum_payouts_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'on-hold');
  CREATE TYPE "public"."enum_verification_codes_type" AS ENUM('email', 'phone');
  CREATE TYPE "public"."enum_coupons_type" AS ENUM('percentage', 'fixed');
  CREATE TYPE "public"."enum_product_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_vendor_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_footer_columns_links_visibility" AS ENUM('public', 'guest', 'authenticated');
  CREATE TYPE "public"."enum_footer_social_links_platform" AS ENUM('facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok');
  CREATE TYPE "public"."enum_platform_settings_currency_supported_currencies" AS ENUM('USD', 'BDT');
  CREATE TYPE "public"."enum_platform_settings_currency_default_currency" AS ENUM('USD', 'BDT');
  CREATE TYPE "public"."enum_platform_settings_vendor_defaults_default_commission_type" AS ENUM('percentage', 'flat', 'tiered');
  CREATE TYPE "public"."enum_platform_settings_vendor_defaults_payout_schedule" AS ENUM('weekly', 'biweekly', 'monthly');
  CREATE TYPE "public"."enum_platform_settings_shipping_default_model" AS ENUM('platform', 'vendor', 'hybrid');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"phone" varchar,
  	"first_name" varchar,
  	"last_name" varchar,
  	"display_name" varchar,
  	"avatar_id" uuid,
  	"role" "enum_users_role" DEFAULT 'customer' NOT NULL,
  	"status" "enum_users_status" DEFAULT 'active' NOT NULL,
  	"email_verified" boolean DEFAULT false,
  	"phone_verified" boolean DEFAULT false,
  	"locale" "enum_users_locale" DEFAULT 'en',
  	"tenant_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar,
  	"username" varchar,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"addresses_id" uuid
  );
  
  CREATE TABLE "media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_tablet_url" varchar,
  	"sizes_tablet_width" numeric,
  	"sizes_tablet_height" numeric,
  	"sizes_tablet_mime_type" varchar,
  	"sizes_tablet_filesize" numeric,
  	"sizes_tablet_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"slug" varchar,
  	"status" "enum_pages_status" DEFAULT 'draft',
  	"meta_image_id" uuid,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"layout" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_slug" varchar,
  	"version_status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"version_meta_image_id" uuid,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_layout" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"slug" varchar,
  	"image_id" uuid,
  	"parent_id" uuid,
  	"display_order" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"commission_override" numeric,
  	"meta_image_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "tenants" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"type" "enum_tenants_type" DEFAULT 'vendor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_profiles_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "vendor_profiles" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"logo_id" uuid,
  	"banner_id" uuid,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"website" varchar,
  	"address_street" varchar,
  	"address_city" varchar,
  	"address_state" varchar,
  	"address_country" varchar,
  	"address_zip" varchar,
  	"rating" numeric DEFAULT 0,
  	"total_sales" numeric DEFAULT 0,
  	"joined_at" timestamp(3) with time zone,
  	"meta_image_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_profiles_locales" (
  	"display_name" varchar NOT NULL,
  	"description" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "vendor_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"commission_rate" numeric,
  	"commission_type" "enum_vendor_settings_commission_type",
  	"payout_method" "enum_vendor_settings_payout_method",
  	"stripe_connect_account_id" varchar,
  	"bank_details_bank_name" varchar,
  	"bank_details_account_number" varchar,
  	"bank_details_routing_number" varchar,
  	"bank_details_iban" varchar,
  	"shipping_model" "enum_vendor_settings_shipping_model",
  	"auto_publish_products" boolean DEFAULT true,
  	"max_products" numeric,
  	"is_active" boolean DEFAULT true,
  	"suspension_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_applications_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"document_id" uuid NOT NULL
  );
  
  CREATE TABLE "vendor_applications" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"applicant_id" uuid,
  	"business_name" varchar NOT NULL,
  	"business_type" "enum_vendor_applications_business_type",
  	"tax_id" varchar,
  	"status" "enum_vendor_applications_status" DEFAULT 'pending' NOT NULL,
  	"reviewed_by_id" uuid,
  	"review_notes" varchar,
  	"rejection_reason" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "products_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"slug" varchar,
  	"sku" varchar,
  	"status" "enum_products_status" DEFAULT 'draft' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"base_price" numeric NOT NULL,
  	"compare_at_price" numeric,
  	"sale_display_mode" "enum_products_sale_display_mode" DEFAULT 'strike_through' NOT NULL,
  	"cost_price" numeric,
  	"currency" "enum_products_currency" DEFAULT 'BDT' NOT NULL,
  	"taxable" boolean DEFAULT true,
  	"weight" numeric,
  	"dimensions_length" numeric,
  	"dimensions_width" numeric,
  	"dimensions_height" numeric,
  	"has_variants" boolean DEFAULT false,
  	"meta_image_id" uuid,
  	"published_at" timestamp(3) with time zone,
  	"rating" numeric DEFAULT 0,
  	"total_reviews" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"short_description" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" uuid
  );
  
  CREATE TABLE "product_variants_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "product_variants" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"product_id" uuid NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"sku" varchar,
  	"price" numeric NOT NULL,
  	"compare_at_price" numeric,
  	"sale_display_mode" "enum_product_variants_sale_display_mode" DEFAULT 'inherit',
  	"image_id" uuid,
  	"weight" numeric,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"vendor_id" uuid,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric
  );
  
  CREATE TABLE "carts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"user_id" uuid,
  	"guest_id" varchar,
  	"subtotal" numeric DEFAULT 0,
  	"coupon_code" varchar,
  	"applied_coupon_id" uuid,
  	"discount_total" numeric DEFAULT 0,
  	"grand_total" numeric DEFAULT 0,
  	"store_id" uuid,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "addresses" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"user_id" uuid NOT NULL,
  	"label" varchar NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"street1" varchar NOT NULL,
  	"street2" varchar,
  	"city" varchar NOT NULL,
  	"state" varchar,
  	"postal_code" varchar,
  	"country" varchar NOT NULL,
  	"phone" varchar,
  	"is_default" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_locations_store_details_coverage_area" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "stock_locations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"tenant_id" uuid,
  	"code" varchar NOT NULL,
  	"slug" varchar,
  	"address_street" varchar,
  	"address_city" varchar,
  	"address_state" varchar,
  	"address_country" varchar,
  	"address_postal_code" varchar,
  	"is_active" boolean DEFAULT true,
  	"is_public_store" boolean DEFAULT false,
  	"sort_priority" numeric DEFAULT 0,
  	"store_details_logo_id" uuid,
  	"store_details_banner_id" uuid,
  	"store_details_contact_email" varchar,
  	"store_details_contact_phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_locations_locales" (
  	"store_details_description" jsonb,
  	"store_details_operating_hours" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "stock_levels" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"location_id" uuid NOT NULL,
  	"quantity" numeric NOT NULL,
  	"reserved_quantity" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_countries" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"iso_code" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_countries_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "geo_subdivisions_geocode_match_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alias" varchar NOT NULL
  );
  
  CREATE TABLE "geo_subdivisions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"country_id" uuid NOT NULL,
  	"code" varchar,
  	"default_service_tier" "enum_geo_subdivisions_default_service_tier" DEFAULT 'standard' NOT NULL,
  	"extended_fee_note" varchar,
  	"extended_lead_time_note" varchar,
  	"unserved_customer_message" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_subdivisions_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "geo_localities_geocode_match_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alias" varchar NOT NULL
  );
  
  CREATE TABLE "geo_localities" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"subdivision_id" uuid NOT NULL,
  	"code" varchar,
  	"service_tier" "enum_geo_localities_service_tier" DEFAULT 'standard' NOT NULL,
  	"extended_fee_note" varchar,
  	"extended_lead_time_note" varchar,
  	"unserved_customer_message" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_localities_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "stock_location_service_areas" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"stock_location_id" uuid NOT NULL,
  	"subdivision_id" uuid NOT NULL,
  	"locality_id" uuid,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shipping_zones_countries" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL
  );
  
  CREATE TABLE "shipping_zones" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shipping_methods" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"zone_id" uuid NOT NULL,
  	"type" "enum_shipping_methods_type" NOT NULL,
  	"rate" numeric NOT NULL,
  	"currency" "enum_shipping_methods_currency" DEFAULT 'BDT' NOT NULL,
  	"min_order_value" numeric,
  	"max_order_value" numeric,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "transactions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"type" "enum_transactions_type" NOT NULL,
  	"provider" varchar NOT NULL,
  	"provider_transaction_id" varchar,
  	"amount" numeric NOT NULL,
  	"currency" varchar NOT NULL,
  	"status" "enum_transactions_status" DEFAULT 'pending' NOT NULL,
  	"platform_fee" numeric,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "order_items" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"sub_order_id" uuid,
  	"tenant_id" uuid,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"stock_level_id" uuid,
  	"product_name" varchar NOT NULL,
  	"item_label" varchar,
  	"variant_name" varchar,
  	"sku" varchar,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric NOT NULL,
  	"total_price" numeric NOT NULL,
  	"product_image" varchar,
  	"vendor_name_snapshot" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "order_status_history" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"from_status" varchar,
  	"to_status" varchar NOT NULL,
  	"changed_by_id" uuid,
  	"reason" varchar,
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_number" varchar NOT NULL,
  	"customer_id" uuid,
  	"guest_email" varchar,
  	"guest_phone" varchar,
  	"buyer_snapshot_email" varchar,
  	"buyer_snapshot_name" varchar,
  	"buyer_snapshot_phone" varchar,
  	"buyer_snapshot_locale" varchar,
  	"idempotency_key" varchar,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"shipping_address_first_name" varchar NOT NULL,
  	"shipping_address_last_name" varchar NOT NULL,
  	"shipping_address_street1" varchar NOT NULL,
  	"shipping_address_street2" varchar,
  	"shipping_address_city" varchar NOT NULL,
  	"shipping_address_state" varchar,
  	"shipping_address_postal_code" varchar,
  	"shipping_address_country" varchar NOT NULL,
  	"shipping_address_phone" varchar,
  	"billing_address_first_name" varchar NOT NULL,
  	"billing_address_last_name" varchar NOT NULL,
  	"billing_address_street1" varchar NOT NULL,
  	"billing_address_street2" varchar,
  	"billing_address_city" varchar NOT NULL,
  	"billing_address_state" varchar,
  	"billing_address_postal_code" varchar,
  	"billing_address_country" varchar NOT NULL,
  	"billing_address_phone" varchar,
  	"subtotal" numeric DEFAULT 0 NOT NULL,
  	"shipping_total" numeric DEFAULT 0 NOT NULL,
  	"tax_total" numeric DEFAULT 0 NOT NULL,
  	"discount_total" numeric DEFAULT 0 NOT NULL,
  	"applied_coupon_id" uuid,
  	"coupon_code_snapshot" varchar,
  	"grand_total" numeric DEFAULT 0 NOT NULL,
  	"currency" varchar NOT NULL,
  	"payment_status" "enum_orders_payment_status" DEFAULT 'unpaid' NOT NULL,
  	"transaction_id" uuid,
  	"store_id" uuid,
  	"notes" varchar,
  	"placed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"order_items_id" uuid,
  	"sub_orders_id" uuid
  );
  
  CREATE TABLE "sub_orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_order_id" uuid NOT NULL,
  	"parent_order_number" varchar,
  	"tenant_id" uuid NOT NULL,
  	"tenant_name_snapshot" varchar,
  	"sub_order_number" varchar NOT NULL,
  	"status" "enum_sub_orders_status" DEFAULT 'pending' NOT NULL,
  	"subtotal" numeric DEFAULT 0 NOT NULL,
  	"shipping_total" numeric DEFAULT 0 NOT NULL,
  	"tax_total" numeric DEFAULT 0 NOT NULL,
  	"commission_amount" numeric DEFAULT 0 NOT NULL,
  	"commission_rate" numeric,
  	"vendor_earnings" numeric DEFAULT 0 NOT NULL,
  	"shipping_method" varchar,
  	"tracking_number" varchar,
  	"tracking_url" varchar,
  	"shipped_at" timestamp(3) with time zone,
  	"delivered_at" timestamp(3) with time zone,
  	"fulfilled_by_id" uuid,
  	"store_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sub_orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"order_items_id" uuid
  );
  
  CREATE TABLE "commission_rules_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"min_amount" numeric NOT NULL,
  	"max_amount" numeric,
  	"rate" numeric NOT NULL
  );
  
  CREATE TABLE "commission_rules" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_commission_rules_type" NOT NULL,
  	"rate" numeric,
  	"category_rate" numeric,
  	"tenant_id" uuid,
  	"priority" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "commission_rules_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" uuid
  );
  
  CREATE TABLE "payout_items" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"payout_id" uuid NOT NULL,
  	"sub_order_id" uuid NOT NULL,
  	"order_number" varchar,
  	"amount" numeric NOT NULL,
  	"commission" numeric DEFAULT 0 NOT NULL,
  	"status" "enum_payout_items_status" DEFAULT 'included',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payouts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"period_start" timestamp(3) with time zone NOT NULL,
  	"period_end" timestamp(3) with time zone NOT NULL,
  	"total_earnings" numeric DEFAULT 0 NOT NULL,
  	"total_commission" numeric DEFAULT 0 NOT NULL,
  	"net_amount" numeric DEFAULT 0 NOT NULL,
  	"status" "enum_payouts_status" DEFAULT 'pending' NOT NULL,
  	"method" varchar,
  	"provider_payout_id" varchar,
  	"processed_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payouts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"payout_items_id" uuid
  );
  
  CREATE TABLE "verification_codes" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"identifier" varchar NOT NULL,
  	"type" "enum_verification_codes_type" NOT NULL,
  	"code" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"used" boolean DEFAULT false,
  	"used_at" timestamp(3) with time zone,
  	"ip" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "coupons" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"type" "enum_coupons_type" DEFAULT 'percentage' NOT NULL,
  	"value" numeric NOT NULL,
  	"min_order_value" numeric DEFAULT 0,
  	"expires_at" timestamp(3) with time zone,
  	"max_total_uses" numeric,
  	"max_uses_per_user" numeric,
  	"is_active" boolean DEFAULT true,
  	"total_uses" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "product_reviews" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"product_id" uuid NOT NULL,
  	"author_id" uuid NOT NULL,
  	"rating" numeric NOT NULL,
  	"title" varchar,
  	"status" "enum_product_reviews_status" DEFAULT 'approved' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "product_reviews_locales" (
  	"comment" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "vendor_reviews" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid NOT NULL,
  	"author_id" uuid NOT NULL,
  	"rating" numeric NOT NULL,
  	"title" varchar,
  	"status" "enum_vendor_reviews_status" DEFAULT 'approved' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendor_reviews_locales" (
  	"comment" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"media_id" uuid,
  	"pages_id" uuid,
  	"categories_id" uuid,
  	"tenants_id" uuid,
  	"vendor_profiles_id" uuid,
  	"vendor_settings_id" uuid,
  	"vendor_applications_id" uuid,
  	"products_id" uuid,
  	"product_variants_id" uuid,
  	"carts_id" uuid,
  	"addresses_id" uuid,
  	"stock_locations_id" uuid,
  	"stock_levels_id" uuid,
  	"geo_countries_id" uuid,
  	"geo_subdivisions_id" uuid,
  	"geo_localities_id" uuid,
  	"stock_location_service_areas_id" uuid,
  	"shipping_zones_id" uuid,
  	"shipping_methods_id" uuid,
  	"transactions_id" uuid,
  	"order_items_id" uuid,
  	"order_status_history_id" uuid,
  	"orders_id" uuid,
  	"sub_orders_id" uuid,
  	"commission_rules_id" uuid,
  	"payout_items_id" uuid,
  	"payouts_id" uuid,
  	"verification_codes_id" uuid,
  	"coupons_id" uuid,
  	"product_reviews_id" uuid,
  	"vendor_reviews_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "header_nav_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false,
  	"show_in_desktop_nav" boolean DEFAULT true,
  	"show_in_mobile_drawer" boolean DEFAULT true
  );
  
  CREATE TABLE "header" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"logo_id" uuid,
  	"announcement_bar_enabled" boolean DEFAULT false,
  	"announcement_bar_background_color" varchar DEFAULT '#000000',
  	"announcement_bar_text_color" varchar DEFAULT '#ffffff',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "header_locales" (
  	"site_name" varchar DEFAULT 'BS-Commerce',
  	"announcement_bar_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"visibility" "enum_footer_columns_links_visibility" DEFAULT 'public'
  );
  
  CREATE TABLE "footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL
  );
  
  CREATE TABLE "footer_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_footer_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "footer_bottom_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "footer" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_locales" (
  	"copyright_text" varchar DEFAULT '© 2026 BS-Commerce. All rights reserved.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "platform_settings_currency_supported_currencies" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_platform_settings_currency_supported_currencies",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "platform_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"platform_name" varchar DEFAULT 'BS-Commerce',
  	"support_email" varchar,
  	"support_phone" varchar,
  	"admin_branding_logo_id" uuid,
  	"admin_branding_favicon_id" uuid,
  	"admin_branding_login_tagline" varchar,
  	"features_multivendor_enabled" boolean DEFAULT false,
  	"features_guest_checkout_enabled" boolean DEFAULT true,
  	"features_reviews_enabled" boolean DEFAULT true,
  	"features_review_requires_approval" boolean DEFAULT false,
  	"features_inventory_tracking_enabled" boolean DEFAULT true,
  	"features_social_login_enabled" boolean DEFAULT true,
  	"currency_default_currency" "enum_platform_settings_currency_default_currency" DEFAULT 'USD',
  	"currency_usd_to_bdt_rate" numeric DEFAULT 110,
  	"currency_last_rate_updated" timestamp(3) with time zone,
  	"vendor_defaults_default_commission_rate" numeric DEFAULT 0,
  	"vendor_defaults_default_commission_type" "enum_platform_settings_vendor_defaults_default_commission_type" DEFAULT 'percentage',
  	"vendor_defaults_auto_approve_vendors" boolean DEFAULT false,
  	"vendor_defaults_require_k_y_c" boolean DEFAULT false,
  	"vendor_defaults_require_product_approval" boolean DEFAULT false,
  	"vendor_defaults_payout_schedule" "enum_platform_settings_vendor_defaults_payout_schedule" DEFAULT 'biweekly',
  	"vendor_defaults_payout_hold_days" numeric DEFAULT 7,
  	"inventory_low_stock_threshold" numeric DEFAULT 10,
  	"shipping_default_model" "enum_platform_settings_shipping_default_model" DEFAULT 'platform',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_profiles_social_links" ADD CONSTRAINT "vendor_profiles_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_profiles_locales" ADD CONSTRAINT "vendor_profiles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_settings" ADD CONSTRAINT "vendor_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_applications_documents" ADD CONSTRAINT "vendor_applications_documents_document_id_media_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_applications_documents" ADD CONSTRAINT "vendor_applications_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_tags" ADD CONSTRAINT "products_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants_options" ADD CONSTRAINT "product_variants_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_vendor_id_tenants_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_applied_coupon_id_coupons_id_fk" FOREIGN KEY ("applied_coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_stock_locations_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations_store_details_coverage_area" ADD CONSTRAINT "stock_locations_store_details_coverage_area_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_store_details_logo_id_media_id_fk" FOREIGN KEY ("store_details_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_store_details_banner_id_media_id_fk" FOREIGN KEY ("store_details_banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_locations_locales" ADD CONSTRAINT "stock_locations_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "geo_countries_locales" ADD CONSTRAINT "geo_countries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_subdivisions_geocode_match_aliases" ADD CONSTRAINT "geo_subdivisions_geocode_match_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_subdivisions" ADD CONSTRAINT "geo_subdivisions_country_id_geo_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."geo_countries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "geo_subdivisions_locales" ADD CONSTRAINT "geo_subdivisions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_localities_geocode_match_aliases" ADD CONSTRAINT "geo_localities_geocode_match_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_localities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "geo_localities" ADD CONSTRAINT "geo_localities_subdivision_id_geo_subdivisions_id_fk" FOREIGN KEY ("subdivision_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "geo_localities_locales" ADD CONSTRAINT "geo_localities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."geo_localities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stock_location_service_areas" ADD CONSTRAINT "stock_location_service_areas_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("stock_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_location_service_areas" ADD CONSTRAINT "stock_location_service_areas_subdivision_id_geo_subdivisions_id_fk" FOREIGN KEY ("subdivision_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_location_service_areas" ADD CONSTRAINT "stock_location_service_areas_locality_id_geo_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."geo_localities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shipping_zones_countries" ADD CONSTRAINT "shipping_zones_countries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sub_order_id_sub_orders_id_fk" FOREIGN KEY ("sub_order_id") REFERENCES "public"."sub_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_stock_level_id_stock_levels_id_fk" FOREIGN KEY ("stock_level_id") REFERENCES "public"."stock_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_applied_coupon_id_coupons_id_fk" FOREIGN KEY ("applied_coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stock_locations_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_order_items_fk" FOREIGN KEY ("order_items_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_sub_orders_fk" FOREIGN KEY ("sub_orders_id") REFERENCES "public"."sub_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_parent_order_id_orders_id_fk" FOREIGN KEY ("parent_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_fulfilled_by_id_users_id_fk" FOREIGN KEY ("fulfilled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_store_id_stock_locations_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sub_orders_rels" ADD CONSTRAINT "sub_orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sub_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sub_orders_rels" ADD CONSTRAINT "sub_orders_rels_order_items_fk" FOREIGN KEY ("order_items_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commission_rules_tiers" ADD CONSTRAINT "commission_rules_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."commission_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commission_rules_rels" ADD CONSTRAINT "commission_rules_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."commission_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commission_rules_rels" ADD CONSTRAINT "commission_rules_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_sub_order_id_sub_orders_id_fk" FOREIGN KEY ("sub_order_id") REFERENCES "public"."sub_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payouts_rels" ADD CONSTRAINT "payouts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payouts_rels" ADD CONSTRAINT "payouts_rels_payout_items_fk" FOREIGN KEY ("payout_items_id") REFERENCES "public"."payout_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_reviews_locales" ADD CONSTRAINT "product_reviews_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vendor_reviews" ADD CONSTRAINT "vendor_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_reviews" ADD CONSTRAINT "vendor_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vendor_reviews_locales" ADD CONSTRAINT "vendor_reviews_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vendor_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_profiles_fk" FOREIGN KEY ("vendor_profiles_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_settings_fk" FOREIGN KEY ("vendor_settings_id") REFERENCES "public"."vendor_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_applications_fk" FOREIGN KEY ("vendor_applications_id") REFERENCES "public"."vendor_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_locations_fk" FOREIGN KEY ("stock_locations_id") REFERENCES "public"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_levels_fk" FOREIGN KEY ("stock_levels_id") REFERENCES "public"."stock_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_geo_countries_fk" FOREIGN KEY ("geo_countries_id") REFERENCES "public"."geo_countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_geo_subdivisions_fk" FOREIGN KEY ("geo_subdivisions_id") REFERENCES "public"."geo_subdivisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_geo_localities_fk" FOREIGN KEY ("geo_localities_id") REFERENCES "public"."geo_localities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_location_service_area_fk" FOREIGN KEY ("stock_location_service_areas_id") REFERENCES "public"."stock_location_service_areas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_zones_fk" FOREIGN KEY ("shipping_zones_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_methods_fk" FOREIGN KEY ("shipping_methods_id") REFERENCES "public"."shipping_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_items_fk" FOREIGN KEY ("order_items_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_status_history_fk" FOREIGN KEY ("order_status_history_id") REFERENCES "public"."order_status_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sub_orders_fk" FOREIGN KEY ("sub_orders_id") REFERENCES "public"."sub_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commission_rules_fk" FOREIGN KEY ("commission_rules_id") REFERENCES "public"."commission_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_items_fk" FOREIGN KEY ("payout_items_id") REFERENCES "public"."payout_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payouts_fk" FOREIGN KEY ("payouts_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verification_codes_fk" FOREIGN KEY ("verification_codes_id") REFERENCES "public"."verification_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupons_fk" FOREIGN KEY ("coupons_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_reviews_fk" FOREIGN KEY ("product_reviews_id") REFERENCES "public"."product_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendor_reviews_fk" FOREIGN KEY ("vendor_reviews_id") REFERENCES "public"."vendor_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_nav_links" ADD CONSTRAINT "header_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header" ADD CONSTRAINT "header_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header_locales" ADD CONSTRAINT "header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_social_links" ADD CONSTRAINT "footer_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_bottom_links" ADD CONSTRAINT "footer_bottom_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings_currency_supported_currencies" ADD CONSTRAINT "platform_settings_currency_supported_currencies_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."platform_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_admin_branding_logo_id_media_id_fk" FOREIGN KEY ("admin_branding_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_admin_branding_favicon_id_media_id_fk" FOREIGN KEY ("admin_branding_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_addresses_id_idx" ON "users_rels" USING btree ("addresses_id");
  CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_tablet_sizes_tablet_filename_idx" ON "media" USING btree ("sizes_tablet_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_meta_meta_image_idx" ON "categories" USING btree ("meta_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");
  CREATE INDEX "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  CREATE INDEX "vendor_profiles_social_links_order_idx" ON "vendor_profiles_social_links" USING btree ("_order");
  CREATE INDEX "vendor_profiles_social_links_parent_id_idx" ON "vendor_profiles_social_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "vendor_profiles_tenant_idx" ON "vendor_profiles" USING btree ("tenant_id");
  CREATE INDEX "vendor_profiles_logo_idx" ON "vendor_profiles" USING btree ("logo_id");
  CREATE INDEX "vendor_profiles_banner_idx" ON "vendor_profiles" USING btree ("banner_id");
  CREATE INDEX "vendor_profiles_meta_meta_image_idx" ON "vendor_profiles" USING btree ("meta_image_id");
  CREATE INDEX "vendor_profiles_updated_at_idx" ON "vendor_profiles" USING btree ("updated_at");
  CREATE INDEX "vendor_profiles_created_at_idx" ON "vendor_profiles" USING btree ("created_at");
  CREATE UNIQUE INDEX "vendor_profiles_locales_locale_parent_id_unique" ON "vendor_profiles_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "vendor_settings_tenant_idx" ON "vendor_settings" USING btree ("tenant_id");
  CREATE INDEX "vendor_settings_updated_at_idx" ON "vendor_settings" USING btree ("updated_at");
  CREATE INDEX "vendor_settings_created_at_idx" ON "vendor_settings" USING btree ("created_at");
  CREATE INDEX "vendor_applications_documents_order_idx" ON "vendor_applications_documents" USING btree ("_order");
  CREATE INDEX "vendor_applications_documents_parent_id_idx" ON "vendor_applications_documents" USING btree ("_parent_id");
  CREATE INDEX "vendor_applications_documents_document_idx" ON "vendor_applications_documents" USING btree ("document_id");
  CREATE INDEX "vendor_applications_applicant_idx" ON "vendor_applications" USING btree ("applicant_id");
  CREATE INDEX "vendor_applications_reviewed_by_idx" ON "vendor_applications" USING btree ("reviewed_by_id");
  CREATE INDEX "vendor_applications_updated_at_idx" ON "vendor_applications" USING btree ("updated_at");
  CREATE INDEX "vendor_applications_created_at_idx" ON "vendor_applications" USING btree ("created_at");
  CREATE INDEX "products_tags_order_idx" ON "products_tags" USING btree ("_order");
  CREATE INDEX "products_tags_parent_id_idx" ON "products_tags" USING btree ("_parent_id");
  CREATE INDEX "products_images_order_idx" ON "products_images" USING btree ("_order");
  CREATE INDEX "products_images_parent_id_idx" ON "products_images" USING btree ("_parent_id");
  CREATE INDEX "products_images_image_idx" ON "products_images" USING btree ("image_id");
  CREATE INDEX "products_tenant_idx" ON "products" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_meta_meta_image_idx" ON "products" USING btree ("meta_image_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_categories_id_idx" ON "products_rels" USING btree ("categories_id");
  CREATE INDEX "product_variants_options_order_idx" ON "product_variants_options" USING btree ("_order");
  CREATE INDEX "product_variants_options_parent_id_idx" ON "product_variants_options" USING btree ("_parent_id");
  CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");
  CREATE INDEX "product_variants_tenant_idx" ON "product_variants" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");
  CREATE INDEX "product_variants_image_idx" ON "product_variants" USING btree ("image_id");
  CREATE INDEX "product_variants_updated_at_idx" ON "product_variants" USING btree ("updated_at");
  CREATE INDEX "product_variants_created_at_idx" ON "product_variants" USING btree ("created_at");
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_items_variant_idx" ON "carts_items" USING btree ("variant_id");
  CREATE INDEX "carts_items_vendor_idx" ON "carts_items" USING btree ("vendor_id");
  CREATE INDEX "carts_user_idx" ON "carts" USING btree ("user_id");
  CREATE INDEX "carts_guest_id_idx" ON "carts" USING btree ("guest_id");
  CREATE INDEX "carts_applied_coupon_idx" ON "carts" USING btree ("applied_coupon_id");
  CREATE INDEX "carts_store_idx" ON "carts" USING btree ("store_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");
  CREATE INDEX "addresses_updated_at_idx" ON "addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "addresses" USING btree ("created_at");
  CREATE INDEX "stock_locations_store_details_coverage_area_order_idx" ON "stock_locations_store_details_coverage_area" USING btree ("_order");
  CREATE INDEX "stock_locations_store_details_coverage_area_parent_id_idx" ON "stock_locations_store_details_coverage_area" USING btree ("_parent_id");
  CREATE INDEX "stock_locations_tenant_idx" ON "stock_locations" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "stock_locations_code_idx" ON "stock_locations" USING btree ("code");
  CREATE UNIQUE INDEX "stock_locations_slug_idx" ON "stock_locations" USING btree ("slug");
  CREATE INDEX "stock_locations_store_details_store_details_logo_idx" ON "stock_locations" USING btree ("store_details_logo_id");
  CREATE INDEX "stock_locations_store_details_store_details_banner_idx" ON "stock_locations" USING btree ("store_details_banner_id");
  CREATE INDEX "stock_locations_updated_at_idx" ON "stock_locations" USING btree ("updated_at");
  CREATE INDEX "stock_locations_created_at_idx" ON "stock_locations" USING btree ("created_at");
  CREATE UNIQUE INDEX "stock_locations_locales_locale_parent_id_unique" ON "stock_locations_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "stock_levels_product_idx" ON "stock_levels" USING btree ("product_id");
  CREATE INDEX "stock_levels_variant_idx" ON "stock_levels" USING btree ("variant_id");
  CREATE INDEX "stock_levels_location_idx" ON "stock_levels" USING btree ("location_id");
  CREATE INDEX "stock_levels_updated_at_idx" ON "stock_levels" USING btree ("updated_at");
  CREATE INDEX "stock_levels_created_at_idx" ON "stock_levels" USING btree ("created_at");
  CREATE INDEX "geo_countries_updated_at_idx" ON "geo_countries" USING btree ("updated_at");
  CREATE INDEX "geo_countries_created_at_idx" ON "geo_countries" USING btree ("created_at");
  CREATE UNIQUE INDEX "geo_countries_locales_locale_parent_id_unique" ON "geo_countries_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "geo_subdivisions_geocode_match_aliases_order_idx" ON "geo_subdivisions_geocode_match_aliases" USING btree ("_order");
  CREATE INDEX "geo_subdivisions_geocode_match_aliases_parent_id_idx" ON "geo_subdivisions_geocode_match_aliases" USING btree ("_parent_id");
  CREATE INDEX "geo_subdivisions_country_idx" ON "geo_subdivisions" USING btree ("country_id");
  CREATE INDEX "geo_subdivisions_code_idx" ON "geo_subdivisions" USING btree ("code");
  CREATE INDEX "geo_subdivisions_updated_at_idx" ON "geo_subdivisions" USING btree ("updated_at");
  CREATE INDEX "geo_subdivisions_created_at_idx" ON "geo_subdivisions" USING btree ("created_at");
  CREATE UNIQUE INDEX "geo_subdivisions_locales_locale_parent_id_unique" ON "geo_subdivisions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "geo_localities_geocode_match_aliases_order_idx" ON "geo_localities_geocode_match_aliases" USING btree ("_order");
  CREATE INDEX "geo_localities_geocode_match_aliases_parent_id_idx" ON "geo_localities_geocode_match_aliases" USING btree ("_parent_id");
  CREATE INDEX "geo_localities_subdivision_idx" ON "geo_localities" USING btree ("subdivision_id");
  CREATE INDEX "geo_localities_code_idx" ON "geo_localities" USING btree ("code");
  CREATE INDEX "geo_localities_updated_at_idx" ON "geo_localities" USING btree ("updated_at");
  CREATE INDEX "geo_localities_created_at_idx" ON "geo_localities" USING btree ("created_at");
  CREATE UNIQUE INDEX "geo_localities_locales_locale_parent_id_unique" ON "geo_localities_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "stock_location_service_areas_stock_location_idx" ON "stock_location_service_areas" USING btree ("stock_location_id");
  CREATE INDEX "stock_location_service_areas_subdivision_idx" ON "stock_location_service_areas" USING btree ("subdivision_id");
  CREATE INDEX "stock_location_service_areas_locality_idx" ON "stock_location_service_areas" USING btree ("locality_id");
  CREATE INDEX "stock_location_service_areas_updated_at_idx" ON "stock_location_service_areas" USING btree ("updated_at");
  CREATE INDEX "stock_location_service_areas_created_at_idx" ON "stock_location_service_areas" USING btree ("created_at");
  CREATE INDEX "shipping_zones_countries_order_idx" ON "shipping_zones_countries" USING btree ("_order");
  CREATE INDEX "shipping_zones_countries_parent_id_idx" ON "shipping_zones_countries" USING btree ("_parent_id");
  CREATE INDEX "shipping_zones_updated_at_idx" ON "shipping_zones" USING btree ("updated_at");
  CREATE INDEX "shipping_zones_created_at_idx" ON "shipping_zones" USING btree ("created_at");
  CREATE INDEX "shipping_methods_zone_idx" ON "shipping_methods" USING btree ("zone_id");
  CREATE INDEX "shipping_methods_updated_at_idx" ON "shipping_methods" USING btree ("updated_at");
  CREATE INDEX "shipping_methods_created_at_idx" ON "shipping_methods" USING btree ("created_at");
  CREATE INDEX "transactions_order_idx" ON "transactions" USING btree ("order_id");
  CREATE INDEX "transactions_updated_at_idx" ON "transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");
  CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");
  CREATE INDEX "order_items_sub_order_idx" ON "order_items" USING btree ("sub_order_id");
  CREATE INDEX "order_items_tenant_idx" ON "order_items" USING btree ("tenant_id");
  CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");
  CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("variant_id");
  CREATE INDEX "order_items_stock_level_idx" ON "order_items" USING btree ("stock_level_id");
  CREATE INDEX "order_items_updated_at_idx" ON "order_items" USING btree ("updated_at");
  CREATE INDEX "order_items_created_at_idx" ON "order_items" USING btree ("created_at");
  CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id");
  CREATE INDEX "order_status_history_changed_by_idx" ON "order_status_history" USING btree ("changed_by_id");
  CREATE INDEX "order_status_history_updated_at_idx" ON "order_status_history" USING btree ("updated_at");
  CREATE INDEX "order_status_history_created_at_idx" ON "order_status_history" USING btree ("created_at");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_idempotency_key_idx" ON "orders" USING btree ("idempotency_key");
  CREATE INDEX "orders_applied_coupon_idx" ON "orders" USING btree ("applied_coupon_id");
  CREATE INDEX "orders_transaction_idx" ON "orders" USING btree ("transaction_id");
  CREATE INDEX "orders_store_idx" ON "orders" USING btree ("store_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "orders_rels_order_idx" ON "orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_order_items_id_idx" ON "orders_rels" USING btree ("order_items_id");
  CREATE INDEX "orders_rels_sub_orders_id_idx" ON "orders_rels" USING btree ("sub_orders_id");
  CREATE INDEX "sub_orders_parent_order_idx" ON "sub_orders" USING btree ("parent_order_id");
  CREATE INDEX "sub_orders_tenant_idx" ON "sub_orders" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "sub_orders_sub_order_number_idx" ON "sub_orders" USING btree ("sub_order_number");
  CREATE INDEX "sub_orders_fulfilled_by_idx" ON "sub_orders" USING btree ("fulfilled_by_id");
  CREATE INDEX "sub_orders_store_idx" ON "sub_orders" USING btree ("store_id");
  CREATE INDEX "sub_orders_updated_at_idx" ON "sub_orders" USING btree ("updated_at");
  CREATE INDEX "sub_orders_created_at_idx" ON "sub_orders" USING btree ("created_at");
  CREATE INDEX "sub_orders_rels_order_idx" ON "sub_orders_rels" USING btree ("order");
  CREATE INDEX "sub_orders_rels_parent_idx" ON "sub_orders_rels" USING btree ("parent_id");
  CREATE INDEX "sub_orders_rels_path_idx" ON "sub_orders_rels" USING btree ("path");
  CREATE INDEX "sub_orders_rels_order_items_id_idx" ON "sub_orders_rels" USING btree ("order_items_id");
  CREATE INDEX "commission_rules_tiers_order_idx" ON "commission_rules_tiers" USING btree ("_order");
  CREATE INDEX "commission_rules_tiers_parent_id_idx" ON "commission_rules_tiers" USING btree ("_parent_id");
  CREATE INDEX "commission_rules_tenant_idx" ON "commission_rules" USING btree ("tenant_id");
  CREATE INDEX "commission_rules_updated_at_idx" ON "commission_rules" USING btree ("updated_at");
  CREATE INDEX "commission_rules_created_at_idx" ON "commission_rules" USING btree ("created_at");
  CREATE INDEX "commission_rules_rels_order_idx" ON "commission_rules_rels" USING btree ("order");
  CREATE INDEX "commission_rules_rels_parent_idx" ON "commission_rules_rels" USING btree ("parent_id");
  CREATE INDEX "commission_rules_rels_path_idx" ON "commission_rules_rels" USING btree ("path");
  CREATE INDEX "commission_rules_rels_categories_id_idx" ON "commission_rules_rels" USING btree ("categories_id");
  CREATE INDEX "payout_items_payout_idx" ON "payout_items" USING btree ("payout_id");
  CREATE INDEX "payout_items_sub_order_idx" ON "payout_items" USING btree ("sub_order_id");
  CREATE INDEX "payout_items_updated_at_idx" ON "payout_items" USING btree ("updated_at");
  CREATE INDEX "payout_items_created_at_idx" ON "payout_items" USING btree ("created_at");
  CREATE INDEX "payouts_tenant_idx" ON "payouts" USING btree ("tenant_id");
  CREATE INDEX "payouts_updated_at_idx" ON "payouts" USING btree ("updated_at");
  CREATE INDEX "payouts_created_at_idx" ON "payouts" USING btree ("created_at");
  CREATE INDEX "payouts_rels_order_idx" ON "payouts_rels" USING btree ("order");
  CREATE INDEX "payouts_rels_parent_idx" ON "payouts_rels" USING btree ("parent_id");
  CREATE INDEX "payouts_rels_path_idx" ON "payouts_rels" USING btree ("path");
  CREATE INDEX "payouts_rels_payout_items_id_idx" ON "payouts_rels" USING btree ("payout_items_id");
  CREATE INDEX "verification_codes_updated_at_idx" ON "verification_codes" USING btree ("updated_at");
  CREATE INDEX "verification_codes_created_at_idx" ON "verification_codes" USING btree ("created_at");
  CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");
  CREATE INDEX "coupons_updated_at_idx" ON "coupons" USING btree ("updated_at");
  CREATE INDEX "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
  CREATE INDEX "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id");
  CREATE INDEX "product_reviews_author_idx" ON "product_reviews" USING btree ("author_id");
  CREATE INDEX "product_reviews_updated_at_idx" ON "product_reviews" USING btree ("updated_at");
  CREATE INDEX "product_reviews_created_at_idx" ON "product_reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "product_reviews_locales_locale_parent_id_unique" ON "product_reviews_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "vendor_reviews_tenant_idx" ON "vendor_reviews" USING btree ("tenant_id");
  CREATE INDEX "vendor_reviews_author_idx" ON "vendor_reviews" USING btree ("author_id");
  CREATE INDEX "vendor_reviews_updated_at_idx" ON "vendor_reviews" USING btree ("updated_at");
  CREATE INDEX "vendor_reviews_created_at_idx" ON "vendor_reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "vendor_reviews_locales_locale_parent_id_unique" ON "vendor_reviews_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_settings_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_applications_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_product_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("product_variants_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_stock_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_locations_id");
  CREATE INDEX "payload_locked_documents_rels_stock_levels_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_levels_id");
  CREATE INDEX "payload_locked_documents_rels_geo_countries_id_idx" ON "payload_locked_documents_rels" USING btree ("geo_countries_id");
  CREATE INDEX "payload_locked_documents_rels_geo_subdivisions_id_idx" ON "payload_locked_documents_rels" USING btree ("geo_subdivisions_id");
  CREATE INDEX "payload_locked_documents_rels_geo_localities_id_idx" ON "payload_locked_documents_rels" USING btree ("geo_localities_id");
  CREATE INDEX "payload_locked_documents_rels_stock_location_service_are_idx" ON "payload_locked_documents_rels" USING btree ("stock_location_service_areas_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_zones_id_idx" ON "payload_locked_documents_rels" USING btree ("shipping_zones_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_methods_id_idx" ON "payload_locked_documents_rels" USING btree ("shipping_methods_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_locked_documents_rels_order_items_id_idx" ON "payload_locked_documents_rels" USING btree ("order_items_id");
  CREATE INDEX "payload_locked_documents_rels_order_status_history_id_idx" ON "payload_locked_documents_rels" USING btree ("order_status_history_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_sub_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("sub_orders_id");
  CREATE INDEX "payload_locked_documents_rels_commission_rules_id_idx" ON "payload_locked_documents_rels" USING btree ("commission_rules_id");
  CREATE INDEX "payload_locked_documents_rels_payout_items_id_idx" ON "payload_locked_documents_rels" USING btree ("payout_items_id");
  CREATE INDEX "payload_locked_documents_rels_payouts_id_idx" ON "payload_locked_documents_rels" USING btree ("payouts_id");
  CREATE INDEX "payload_locked_documents_rels_verification_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("verification_codes_id");
  CREATE INDEX "payload_locked_documents_rels_coupons_id_idx" ON "payload_locked_documents_rels" USING btree ("coupons_id");
  CREATE INDEX "payload_locked_documents_rels_product_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("product_reviews_id");
  CREATE INDEX "payload_locked_documents_rels_vendor_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("vendor_reviews_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "header_nav_links_order_idx" ON "header_nav_links" USING btree ("_order");
  CREATE INDEX "header_nav_links_parent_id_idx" ON "header_nav_links" USING btree ("_parent_id");
  CREATE INDEX "header_nav_links_locale_idx" ON "header_nav_links" USING btree ("_locale");
  CREATE INDEX "header_logo_idx" ON "header" USING btree ("logo_id");
  CREATE UNIQUE INDEX "header_locales_locale_parent_id_unique" ON "header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_columns_links_order_idx" ON "footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_links_locale_idx" ON "footer_columns_links" USING btree ("_locale");
  CREATE INDEX "footer_columns_order_idx" ON "footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "footer_columns" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_locale_idx" ON "footer_columns" USING btree ("_locale");
  CREATE INDEX "footer_social_links_order_idx" ON "footer_social_links" USING btree ("_order");
  CREATE INDEX "footer_social_links_parent_id_idx" ON "footer_social_links" USING btree ("_parent_id");
  CREATE INDEX "footer_bottom_links_order_idx" ON "footer_bottom_links" USING btree ("_order");
  CREATE INDEX "footer_bottom_links_parent_id_idx" ON "footer_bottom_links" USING btree ("_parent_id");
  CREATE INDEX "footer_bottom_links_locale_idx" ON "footer_bottom_links" USING btree ("_locale");
  CREATE UNIQUE INDEX "footer_locales_locale_parent_id_unique" ON "footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "platform_settings_currency_supported_currencies_order_idx" ON "platform_settings_currency_supported_currencies" USING btree ("order");
  CREATE INDEX "platform_settings_currency_supported_currencies_parent_idx" ON "platform_settings_currency_supported_currencies" USING btree ("parent_id");
  CREATE INDEX "platform_settings_admin_branding_admin_branding_logo_idx" ON "platform_settings" USING btree ("admin_branding_logo_id");
  CREATE INDEX "platform_settings_admin_branding_admin_branding_favicon_idx" ON "platform_settings" USING btree ("admin_branding_favicon_id");`);
}
async function down({ db, payload, req }) {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "tenants" CASCADE;
  DROP TABLE "vendor_profiles_social_links" CASCADE;
  DROP TABLE "vendor_profiles" CASCADE;
  DROP TABLE "vendor_profiles_locales" CASCADE;
  DROP TABLE "vendor_settings" CASCADE;
  DROP TABLE "vendor_applications_documents" CASCADE;
  DROP TABLE "vendor_applications" CASCADE;
  DROP TABLE "products_tags" CASCADE;
  DROP TABLE "products_images" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "product_variants_options" CASCADE;
  DROP TABLE "product_variants" CASCADE;
  DROP TABLE "carts_items" CASCADE;
  DROP TABLE "carts" CASCADE;
  DROP TABLE "addresses" CASCADE;
  DROP TABLE "stock_locations_store_details_coverage_area" CASCADE;
  DROP TABLE "stock_locations" CASCADE;
  DROP TABLE "stock_locations_locales" CASCADE;
  DROP TABLE "stock_levels" CASCADE;
  DROP TABLE "geo_countries" CASCADE;
  DROP TABLE "geo_countries_locales" CASCADE;
  DROP TABLE "geo_subdivisions_geocode_match_aliases" CASCADE;
  DROP TABLE "geo_subdivisions" CASCADE;
  DROP TABLE "geo_subdivisions_locales" CASCADE;
  DROP TABLE "geo_localities_geocode_match_aliases" CASCADE;
  DROP TABLE "geo_localities" CASCADE;
  DROP TABLE "geo_localities_locales" CASCADE;
  DROP TABLE "stock_location_service_areas" CASCADE;
  DROP TABLE "shipping_zones_countries" CASCADE;
  DROP TABLE "shipping_zones" CASCADE;
  DROP TABLE "shipping_methods" CASCADE;
  DROP TABLE "transactions" CASCADE;
  DROP TABLE "order_items" CASCADE;
  DROP TABLE "order_status_history" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "orders_rels" CASCADE;
  DROP TABLE "sub_orders" CASCADE;
  DROP TABLE "sub_orders_rels" CASCADE;
  DROP TABLE "commission_rules_tiers" CASCADE;
  DROP TABLE "commission_rules" CASCADE;
  DROP TABLE "commission_rules_rels" CASCADE;
  DROP TABLE "payout_items" CASCADE;
  DROP TABLE "payouts" CASCADE;
  DROP TABLE "payouts_rels" CASCADE;
  DROP TABLE "verification_codes" CASCADE;
  DROP TABLE "coupons" CASCADE;
  DROP TABLE "product_reviews" CASCADE;
  DROP TABLE "product_reviews_locales" CASCADE;
  DROP TABLE "vendor_reviews" CASCADE;
  DROP TABLE "vendor_reviews_locales" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "header_nav_links" CASCADE;
  DROP TABLE "header" CASCADE;
  DROP TABLE "header_locales" CASCADE;
  DROP TABLE "footer_columns_links" CASCADE;
  DROP TABLE "footer_columns" CASCADE;
  DROP TABLE "footer_social_links" CASCADE;
  DROP TABLE "footer_bottom_links" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "footer_locales" CASCADE;
  DROP TABLE "platform_settings_currency_supported_currencies" CASCADE;
  DROP TABLE "platform_settings" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_status";
  DROP TYPE "public"."enum_users_locale";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_tenants_type";
  DROP TYPE "public"."enum_vendor_settings_commission_type";
  DROP TYPE "public"."enum_vendor_settings_payout_method";
  DROP TYPE "public"."enum_vendor_settings_shipping_model";
  DROP TYPE "public"."enum_vendor_applications_business_type";
  DROP TYPE "public"."enum_vendor_applications_status";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_products_sale_display_mode";
  DROP TYPE "public"."enum_products_currency";
  DROP TYPE "public"."enum_product_variants_sale_display_mode";
  DROP TYPE "public"."enum_geo_subdivisions_default_service_tier";
  DROP TYPE "public"."enum_geo_localities_service_tier";
  DROP TYPE "public"."enum_shipping_methods_type";
  DROP TYPE "public"."enum_shipping_methods_currency";
  DROP TYPE "public"."enum_transactions_type";
  DROP TYPE "public"."enum_transactions_status";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_payment_status";
  DROP TYPE "public"."enum_sub_orders_status";
  DROP TYPE "public"."enum_commission_rules_type";
  DROP TYPE "public"."enum_payout_items_status";
  DROP TYPE "public"."enum_payouts_status";
  DROP TYPE "public"."enum_verification_codes_type";
  DROP TYPE "public"."enum_coupons_type";
  DROP TYPE "public"."enum_product_reviews_status";
  DROP TYPE "public"."enum_vendor_reviews_status";
  DROP TYPE "public"."enum_footer_columns_links_visibility";
  DROP TYPE "public"."enum_footer_social_links_platform";
  DROP TYPE "public"."enum_platform_settings_currency_supported_currencies";
  DROP TYPE "public"."enum_platform_settings_currency_default_currency";
  DROP TYPE "public"."enum_platform_settings_vendor_defaults_default_commission_type";
  DROP TYPE "public"."enum_platform_settings_vendor_defaults_payout_schedule";
  DROP TYPE "public"."enum_platform_settings_shipping_default_model";`);
}
var init__ = __esm({
  "packages/backend/migrations/20260426_095728.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260429_140000_cod_collect_and_order_channel.ts
import { sql as sql2 } from "@payloadcms/db-postgres";
async function up2({ db }) {
  await db.execute(sql2`
    ALTER TABLE "shipping_methods"
    ADD COLUMN IF NOT EXISTS "collect_payment_on_delivery" boolean DEFAULT false NOT NULL;
  `);
  await db.execute(sql2`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_orders_checkout_payment_channel" AS ENUM('online', 'cash_on_delivery');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await db.execute(sql2`
    ALTER TABLE "orders"
    ADD COLUMN IF NOT EXISTS "checkout_payment_channel" "enum_orders_checkout_payment_channel" DEFAULT 'online' NOT NULL;
  `);
}
async function down2({ db }) {
  await db.execute(sql2`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "checkout_payment_channel";
  `);
  await db.execute(sql2`
    DROP TYPE IF EXISTS "public"."enum_orders_checkout_payment_channel";
  `);
  await db.execute(sql2`
    ALTER TABLE "shipping_methods" DROP COLUMN IF EXISTS "collect_payment_on_delivery";
  `);
}
var init_cod_collect_and_order_channel = __esm({
  "packages/backend/migrations/20260429_140000_cod_collect_and_order_channel.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260430_120000_add_carts_customer_note.ts
import { sql as sql3 } from "@payloadcms/db-postgres";
async function up3({ db }) {
  await db.execute(sql3`
    ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "customer_note" varchar;
  `);
}
async function down3({ db }) {
  await db.execute(sql3`
    ALTER TABLE "carts" DROP COLUMN IF EXISTS "customer_note";
  `);
}
var init_add_carts_customer_note = __esm({
  "packages/backend/migrations/20260430_120000_add_carts_customer_note.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260507_120000_order_items_product_slug.ts
import { sql as sql4 } from "@payloadcms/db-postgres";
async function up4({ db }) {
  await db.execute(sql4`
    ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_slug" varchar;
  `);
}
async function down4({ db }) {
  await db.execute(sql4`
    ALTER TABLE "order_items" DROP COLUMN IF EXISTS "product_slug";
  `);
}
var init_order_items_product_slug = __esm({
  "packages/backend/migrations/20260507_120000_order_items_product_slug.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260513_142155_add_bundle_product_type.ts
import { sql as sql5 } from "@payloadcms/db-postgres";
async function up5({ db, payload, req }) {
  await db.execute(sql5`
   CREATE TYPE "public"."enum_products_product_type" AS ENUM('standard', 'bundle');
  CREATE TABLE "products_bundle_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" uuid NOT NULL,
  	"variant_id" uuid,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  ALTER TABLE "products" ADD COLUMN "product_type" "enum_products_product_type" DEFAULT 'standard' NOT NULL;
  ALTER TABLE "products_bundle_items" ADD CONSTRAINT "products_bundle_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
  ALTER TABLE "products_bundle_items" ADD CONSTRAINT "products_bundle_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_bundle_items" ADD CONSTRAINT "products_bundle_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_bundle_items_order_idx" ON "products_bundle_items" USING btree ("_order");
  CREATE INDEX "products_bundle_items_parent_id_idx" ON "products_bundle_items" USING btree ("_parent_id");
  CREATE INDEX "products_bundle_items_product_idx" ON "products_bundle_items" USING btree ("product_id");
  CREATE INDEX "products_bundle_items_variant_idx" ON "products_bundle_items" USING btree ("variant_id");`);
}
async function down5({ db, payload, req }) {
  await db.execute(sql5`
   DROP TABLE "products_bundle_items" CASCADE;
  ALTER TABLE "products" DROP COLUMN "product_type";
  DROP TYPE "public"."enum_products_product_type";`);
}
var init_add_bundle_product_type = __esm({
  "packages/backend/migrations/20260513_142155_add_bundle_product_type.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260514_171500_products_sku_optional_unique.ts
import { sql as sql6 } from "@payloadcms/db-postgres";
async function up6({ db }) {
  await db.execute(sql6`
    UPDATE "products"
    SET "sku" = NULL
    WHERE "sku" IS NOT NULL
      AND btrim("sku") = '';

    CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_unique_non_null_idx"
      ON "products" USING btree ("sku")
      WHERE "sku" IS NOT NULL
        AND btrim("sku") <> '';
  `);
}
async function down6({ db }) {
  await db.execute(sql6`
    DROP INDEX IF EXISTS "products_sku_unique_non_null_idx";
  `);
}
var init_products_sku_optional_unique = __esm({
  "packages/backend/migrations/20260514_171500_products_sku_optional_unique.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260515_120000_addresses_geo_affinity.ts
import { sql as sql7 } from "@payloadcms/db-postgres";
async function up7({ db }) {
  await db.execute(sql7`
    ALTER TABLE "addresses"
      ADD COLUMN IF NOT EXISTS "geo_country_id" varchar,
      ADD COLUMN IF NOT EXISTS "geo_subdivision_id" varchar,
      ADD COLUMN IF NOT EXISTS "geo_locality_id" varchar,
      ADD COLUMN IF NOT EXISTS "preferred_store_id" varchar;

    CREATE INDEX IF NOT EXISTS "addresses_geo_country_idx"
      ON "addresses" USING btree ("geo_country_id");
    CREATE INDEX IF NOT EXISTS "addresses_geo_subdivision_idx"
      ON "addresses" USING btree ("geo_subdivision_id");
    CREATE INDEX IF NOT EXISTS "addresses_geo_locality_idx"
      ON "addresses" USING btree ("geo_locality_id");
    CREATE INDEX IF NOT EXISTS "addresses_preferred_store_idx"
      ON "addresses" USING btree ("preferred_store_id");
  `);
}
async function down7({ db }) {
  await db.execute(sql7`
    DROP INDEX IF EXISTS "addresses_geo_country_idx";
    DROP INDEX IF EXISTS "addresses_geo_subdivision_idx";
    DROP INDEX IF EXISTS "addresses_geo_locality_idx";
    DROP INDEX IF EXISTS "addresses_preferred_store_idx";

    ALTER TABLE "addresses"
      DROP COLUMN IF EXISTS "geo_country_id",
      DROP COLUMN IF EXISTS "geo_subdivision_id",
      DROP COLUMN IF EXISTS "geo_locality_id",
      DROP COLUMN IF EXISTS "preferred_store_id";
  `);
}
var init_addresses_geo_affinity = __esm({
  "packages/backend/migrations/20260515_120000_addresses_geo_affinity.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260601_141500_wishlist_items.ts
import { sql as sql8 } from "@payloadcms/db-postgres";
async function up8({ db }) {
  const idType = process.env.DATABASE_ID_TYPE ?? "uuid";
  if (idType === "serial") {
    await db.execute(sql8`
      CREATE TABLE IF NOT EXISTS "wishlist_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "product_id" integer NOT NULL,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      );

      DO $$
      BEGIN
        -- Recovery path for partially-applied previous versions of this migration.
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'wishlist_items'
            AND column_name = 'id'
            AND udt_name <> 'int4'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM "wishlist_items"
            WHERE btrim("id"::text) !~ '^[0-9]+$'
          ) THEN
            RAISE EXCEPTION 'wishlist_items.id contains non-integer values; cleanup required before migration';
          END IF;
          ALTER TABLE "wishlist_items" ALTER COLUMN "id" TYPE integer USING ("id"::integer);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'wishlist_items'
            AND column_name = 'user_id'
            AND udt_name <> 'int4'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM "wishlist_items"
            WHERE btrim("user_id"::text) !~ '^[0-9]+$'
          ) THEN
            RAISE EXCEPTION 'wishlist_items.user_id contains non-integer values; cleanup required before migration';
          END IF;
          ALTER TABLE "wishlist_items" ALTER COLUMN "user_id" TYPE integer USING ("user_id"::integer);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'wishlist_items'
            AND column_name = 'product_id'
            AND udt_name <> 'int4'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM "wishlist_items"
            WHERE btrim("product_id"::text) !~ '^[0-9]+$'
          ) THEN
            RAISE EXCEPTION 'wishlist_items.product_id contains non-integer values; cleanup required before migration';
          END IF;
          ALTER TABLE "wishlist_items" ALTER COLUMN "product_id" TYPE integer USING ("product_id"::integer);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_class WHERE relname = 'wishlist_items_id_seq'
        ) THEN
          CREATE SEQUENCE "wishlist_items_id_seq";
        END IF;

        ALTER TABLE "wishlist_items" ALTER COLUMN "id" SET DEFAULT nextval('"wishlist_items_id_seq"');
        ALTER SEQUENCE "wishlist_items_id_seq" OWNED BY "wishlist_items"."id";
        PERFORM setval('"wishlist_items_id_seq"', COALESCE((SELECT MAX("id") FROM "wishlist_items"), 0) + 1, false);
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_user_fk'
        ) THEN
          ALTER TABLE "wishlist_items"
            ADD CONSTRAINT "wishlist_items_user_fk"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_product_fk'
        ) THEN
          ALTER TABLE "wishlist_items"
            ADD CONSTRAINT "wishlist_items_product_fk"
            FOREIGN KEY ("product_id") REFERENCES "products"("id")
            ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS "wishlist_items_user_idx" ON "wishlist_items" USING btree ("user_id");
      CREATE INDEX IF NOT EXISTS "wishlist_items_product_idx" ON "wishlist_items" USING btree ("product_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_user_product_unique"
        ON "wishlist_items" USING btree ("user_id", "product_id");
    `);
    return;
  }
  await db.execute(sql8`
    CREATE TABLE IF NOT EXISTS "wishlist_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "product_id" uuid NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$
    BEGIN
      -- Recovery path for partially-applied previous versions of this migration.
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wishlist_items'
          AND column_name = 'id'
          AND udt_name <> 'uuid'
      ) THEN
        IF EXISTS (
          SELECT 1
          FROM "wishlist_items"
          WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ) THEN
          RAISE EXCEPTION 'wishlist_items.id contains non-UUID values; cleanup required before migration';
        END IF;
        ALTER TABLE "wishlist_items" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wishlist_items'
          AND column_name = 'user_id'
          AND udt_name <> 'uuid'
      ) THEN
        IF EXISTS (
          SELECT 1
          FROM "wishlist_items"
          WHERE "user_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ) THEN
          RAISE EXCEPTION 'wishlist_items.user_id contains non-UUID values; cleanup required before migration';
        END IF;
        ALTER TABLE "wishlist_items" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wishlist_items'
          AND column_name = 'product_id'
          AND udt_name <> 'uuid'
      ) THEN
        IF EXISTS (
          SELECT 1
          FROM "wishlist_items"
          WHERE "product_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ) THEN
          RAISE EXCEPTION 'wishlist_items.product_id contains non-UUID values; cleanup required before migration';
        END IF;
        ALTER TABLE "wishlist_items" ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid;
      END IF;
    END $$;

    ALTER TABLE "wishlist_items"
      ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_user_fk'
      ) THEN
        ALTER TABLE "wishlist_items"
          ADD CONSTRAINT "wishlist_items_user_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_product_fk'
      ) THEN
        ALTER TABLE "wishlist_items"
          ADD CONSTRAINT "wishlist_items_product_fk"
          FOREIGN KEY ("product_id") REFERENCES "products"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "wishlist_items_user_idx" ON "wishlist_items" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "wishlist_items_product_idx" ON "wishlist_items" USING btree ("product_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_user_product_unique"
      ON "wishlist_items" USING btree ("user_id", "product_id");
  `);
}
async function down8({ db }) {
  await db.execute(sql8`
    DROP INDEX IF EXISTS "wishlist_items_user_product_unique";
    DROP INDEX IF EXISTS "wishlist_items_product_idx";
    DROP INDEX IF EXISTS "wishlist_items_user_idx";
    ALTER TABLE IF EXISTS "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_product_fk";
    ALTER TABLE IF EXISTS "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_user_fk";
    DROP TABLE IF EXISTS "wishlist_items" CASCADE;
  `);
}
var init_wishlist_items2 = __esm({
  "packages/backend/migrations/20260601_141500_wishlist_items.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260601_153000_add_wishlist_locked_rels.ts
import { sql as sql9 } from "@payloadcms/db-postgres";
async function up9({ db }) {
  const idType = process.env.DATABASE_ID_TYPE ?? "uuid";
  const relType = idType === "serial" ? sql9`integer` : sql9`uuid`;
  await db.execute(sql9`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "wishlist_items_id" ${relType};

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payload_locked_documents_rels_wishlist_items_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_wishlist_items_fk"
          FOREIGN KEY ("wishlist_items_id")
          REFERENCES "wishlist_items"("id")
          ON DELETE cascade
          ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_wishlist_items_id_idx"
      ON "payload_locked_documents_rels" USING btree ("wishlist_items_id");
  `);
}
async function down9({ db }) {
  await db.execute(sql9`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_wishlist_items_id_idx";
    ALTER TABLE IF EXISTS "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_wishlist_items_fk";
    ALTER TABLE IF EXISTS "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "wishlist_items_id";
  `);
}
var init_add_wishlist_locked_rels = __esm({
  "packages/backend/migrations/20260601_153000_add_wishlist_locked_rels.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/20260903_120000_add_attributes_and_order_tracking.ts
import { sql as sql10 } from "@payloadcms/db-postgres";
async function up10({ db }) {
  await db.execute(sql10`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_attributes_type" AS ENUM('brand', 'manufacturer', 'series', 'material', 'feature', 'custom');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_orders_device_tracking_device_type" AS ENUM('desktop', 'mobile', 'tablet', 'bot', 'unknown');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_attributes_properties_property_type" AS ENUM('text', 'number', 'boolean', 'color');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS "attributes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "key" character varying NOT NULL,
      "type" "enum_attributes_type" DEFAULT 'brand' NOT NULL,
      "slug" character varying,
      "logo_id" uuid,
      "website" character varying,
      "featured" boolean DEFAULT false,
      "display_order" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "attributes" ADD CONSTRAINT "attributes_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "attributes_key_idx" ON "attributes" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "attributes_type_idx" ON "attributes" USING btree ("type");
    CREATE UNIQUE INDEX IF NOT EXISTS "attributes_slug_idx" ON "attributes" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "attributes_logo_idx" ON "attributes" USING btree ("logo_id");
    CREATE INDEX IF NOT EXISTS "attributes_created_at_idx" ON "attributes" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "attributes_updated_at_idx" ON "attributes" USING btree ("updated_at");
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS "attributes_locales" (
      "label" character varying NOT NULL,
      "description" character varying,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" uuid NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "attributes_locales" ADD CONSTRAINT "attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "attributes_locales_locale_parent_id_unique" ON "attributes_locales" USING btree ("_locale", "_parent_id");
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS "attributes_properties" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" character varying PRIMARY KEY NOT NULL,
      "property_key" character varying NOT NULL,
      "property_value" character varying NOT NULL,
      "property_type" "enum_attributes_properties_property_type" DEFAULT 'text'
    );

    DO $$ BEGIN
      ALTER TABLE "attributes_properties" ADD CONSTRAINT "attributes_properties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "attributes_properties_order_idx" ON "attributes_properties" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "attributes_properties_parent_id_idx" ON "attributes_properties" USING btree ("_parent_id");
  `);
  await db.execute(sql10`
    ALTER TABLE "products_rels" ADD COLUMN IF NOT EXISTS "attributes_id" uuid;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_rels_attributes_fk'
      ) THEN
        ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "products_rels_attributes_id_idx" ON "products_rels" USING btree ("attributes_id");
  `);
  await db.execute(sql10`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_ip_address" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_user_agent" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_device_type" "enum_orders_device_tracking_device_type";
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_browser" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_os" character varying;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "device_tracking_referrer" character varying;
  `);
  await db.execute(sql10`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "attributes_id" uuid;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_attributes_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "attributes"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
  `);
}
async function down10({ db }) {
  await db.execute(sql10`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_attributes_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_attributes_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "attributes_id";

    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_ip_address";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_user_agent";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_device_type";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_browser";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_os";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "device_tracking_referrer";

    ALTER TABLE "products_rels" DROP CONSTRAINT IF EXISTS "products_rels_attributes_fk";
    DROP INDEX IF EXISTS "products_rels_attributes_id_idx";
    ALTER TABLE "products_rels" DROP COLUMN IF EXISTS "attributes_id";

    DROP TABLE IF EXISTS "attributes_properties";
    DROP TABLE IF EXISTS "attributes_locales";
    DROP TABLE IF EXISTS "attributes";

    DROP TYPE IF EXISTS "public"."enum_attributes_properties_property_type";
    DROP TYPE IF EXISTS "public"."enum_orders_device_tracking_device_type";
    DROP TYPE IF EXISTS "public"."enum_attributes_type";
  `);
}
var init_add_attributes_and_order_tracking = __esm({
  "packages/backend/migrations/20260903_120000_add_attributes_and_order_tracking.ts"() {
    "use strict";
  }
});

// packages/backend/migrations/index.ts
var migrations;
var init_migrations = __esm({
  "packages/backend/migrations/index.ts"() {
    "use strict";
    init__();
    init_cod_collect_and_order_channel();
    init_add_carts_customer_note();
    init_order_items_product_slug();
    init_add_bundle_product_type();
    init_products_sku_optional_unique();
    init_addresses_geo_affinity();
    init_wishlist_items2();
    init_add_wishlist_locked_rels();
    init_add_attributes_and_order_tracking();
    migrations = [
      {
        up,
        down,
        name: "20260426_095728"
      },
      {
        up: up2,
        down: down2,
        name: "20260429_140000_cod_collect_and_order_channel"
      },
      {
        up: up3,
        down: down3,
        name: "20260430_120000_add_carts_customer_note"
      },
      {
        up: up4,
        down: down4,
        name: "20260507_120000_order_items_product_slug"
      },
      {
        up: up5,
        down: down5,
        name: "20260513_142155_add_bundle_product_type"
      },
      {
        up: up6,
        down: down6,
        name: "20260514_171500_products_sku_optional_unique"
      },
      {
        up: up7,
        down: down7,
        name: "20260515_120000_addresses_geo_affinity"
      },
      {
        up: up8,
        down: down8,
        name: "20260601_141500_wishlist_items"
      },
      {
        up: up9,
        down: down9,
        name: "20260601_153000_add_wishlist_locked_rels"
      },
      {
        up: up10,
        down: down10,
        name: "20260903_120000_add_attributes_and_order_tracking"
      }
    ];
  }
});

// packages/backend/src/payload.config.ts
var payload_config_exports = {};
__export(payload_config_exports, {
  default: () => payload_config_default
});
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import { en } from "@payloadcms/translations/languages/en";
import { bnBd } from "@payloadcms/translations/languages/bnBd";
import { redisCache } from "payloadcms-redis-plugin";
import path5 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { openapi, swaggerUI } from "payload-oapi";
var filename, dirname, redisPluginEnabled, serverURL, payload_config_default;
var init_payload_config = __esm({
  "packages/backend/src/payload.config.ts"() {
    "use strict";
    init_users();
    init_media();
    init_pages();
    init_categories();
    init_ecommerce();
    init_multivendor();
    init_inventory();
    init_shipping();
    init_payments();
    init_orders2();
    init_commissions();
    init_payouts2();
    init_notifications();
    init_verification();
    init_reviews();
    init_discounts();
    init_header();
    init_footer();
    init_platform_settings();
    init_redis();
    init_payload_server_url();
    init_auth_login();
    init_guest_order_lookup();
    init_checkout_process();
    init_sslcommerz_ipn();
    init_sslcommerz_sync_paid();
    init_dashboard_stats();
    init_admin_branding2();
    init_custom_endpoints_openapi2();
    init_docs_index();
    init_openapi_all();
    init_storefront_store_products();
    init_storefront_variant_availability();
    init_storefront_geography();
    init_storefront_facets();
    init_customer_analytics();
    init_seed_electronics();
    init_geography();
    init_reports();
    init_migrations();
    filename = fileURLToPath2(import.meta.url);
    dirname = path5.dirname(filename);
    redisPluginEnabled = process.env.REDIS_CACHE_ENABLED === "true";
    serverURL = getPayloadServerUrl();
    payload_config_default = buildConfig({
      serverURL,
      // ─── Admin Panel ─────────────────────────────────────────────────────────────
      admin: {
        user: Users.slug,
        importMap: {
          baseDir: path5.resolve(dirname)
        },
        meta: {
          titleSuffix: "\u2014 BS-Commerce Admin",
          icons: [{ url: "/branding/brainstation-23-symbol.png", type: "image/png" }]
        },
        components: {
          providers: [
            {
              path: "/components/admin/AdminBrandingCssVarsProvider"
            }
          ],
          graphics: {
            Logo: "/components/admin/AdminLogo",
            Icon: "/components/admin/AdminIcon"
          },
          views: {
            dashboard: {
              Component: "/components/admin/DashboardHome",
              path: "/",
              exact: true
            },
            "create-first-user": {
              Component: "/components/CreateFirstUser",
              path: "/create-first-user",
              exact: true
            }
          }
        }
      },
      // ─── Editor ──────────────────────────────────────────────────────────────────
      editor: lexicalEditor(),
      // ─── Database ────────────────────────────────────────────────────────────────
      // Default: Postgres via Drizzle ORM. Swap adapter to use MongoDB.
      // See: https://payloadcms.com/docs/database/postgres
      //
      // ID type: 'uuid' (default) = string IDs, DB-agnostic. 'serial' = integer IDs.
      // See docs/ID-STANDARD.md. Use serial only for existing DBs with integer IDs.
      db: postgresAdapter({
        idType: process.env.DATABASE_ID_TYPE || "uuid",
        pool: {
          connectionString: process.env.DATABASE_URI
        },
        // Migrations: `yarn db:migrate:create` then `yarn db:migrate` (push is dev-only).
        push: false,
        migrationDir: path5.resolve(dirname, "../migrations"),
        prodMigrations: migrations,
        blocksAsJSON: true
      }),
      // Alternative: MongoDB (uses string ObjectIds; no idType option)
      // db: mongooseAdapter({ url: process.env.DATABASE_URI! }),
      // ─── Localization ────────────────────────────────────────────────────────────
      // Decision #15: en + bn from day one. Payload field-level localization.
      localization: {
        locales: [
          { label: "English", code: "en" },
          { label: "\u09AC\u09BE\u0982\u09B2\u09BE", code: "bn" }
        ],
        defaultLocale: "en",
        fallback: true
      },
      // ─── Admin UI i18n ───────────────────────────────────────────────────────────
      i18n: {
        supportedLanguages: { en, "bn-BD": bnBd },
        fallbackLanguage: "en"
      },
      // ─── Core Collections ────────────────────────────────────────────────────────
      collections: [
        Users,
        Media,
        Pages,
        Categories
        // Plugin collections are registered by their respective plugins (Phase 2+)
      ],
      // ─── Globals ─────────────────────────────────────────────────────────────────
      globals: [Header, Footer, PlatformSettings],
      // ─── Custom Endpoints ────────────────────────────────────────────────────────
      endpoints: [
        authLoginEndpoint,
        guestOrderLookupEndpoint,
        checkoutProcessEndpoint,
        sslcommerzIpnEndpoint,
        sslcommerzSyncPaidEndpoint,
        dashboardStatsEndpoint,
        adminBrandingEndpoint,
        customEndpointsOpenApiEndpoint,
        openapiAllEndpoint,
        docsIndexEndpoint,
        storefrontStoreProductsEndpoint,
        storefrontVariantAvailabilityEndpoint,
        storefrontGeographyEndpoint,
        storefrontFacetsEndpoint,
        productsFacetsEndpoint,
        customerAnalyticsEndpoint,
        customerRecommendationsEndpoint,
        seedElectronicsEndpoint,
        seedElectronicsPostEndpoint
      ],
      // ─── Plugins ─────────────────────────────────────────────────────────────────
      // Order matters — dependencies must come first.
      // Phase 1: Redis cache only. Other plugins added in later phases.
      plugins: [
        // REST API documentation (OpenAPI + Swagger UI).
        // NOTE: payload-oapi does not yet include custom endpoint generation.
        openapi({
          openapiVersion: "3.0",
          specEndpoint: "/openapi.json",
          metadata: {
            title: "BS-Commerce Backend API",
            version: "1.0.0",
            description: "Autogenerated OpenAPI for Payload-managed REST endpoints."
          }
        }),
        swaggerUI({
          specEndpoint: "/openapi-all.json",
          docsUrl: "/docs"
        }),
        swaggerUI({
          specEndpoint: "/openapi-custom.json",
          docsUrl: "/docs-custom"
        }),
        // Redis cache can be disabled in local dev to avoid stale paginated reads.
        ...redisPluginEnabled ? [
          redisCache({
            redis: redisConfig,
            collections: cachedCollections
          })
        ] : [],
        // Phase 4: Multivendor Foundation (must run before ecommerce for tenant field on Users)
        multivendorPlugin({
          enabled: process.env.MULTIVENDOR_ENABLED === "true",
          autoApproveVendors: process.env.VENDOR_AUTO_APPROVE === "true",
          requireKYC: process.env.VENDOR_KYC_REQUIRED === "true",
          requireProductApproval: process.env.PRODUCT_REQUIRES_APPROVAL === "true"
        }),
        // Phase 2: Ecommerce Core
        ecommercePlugin({
          enabled: true,
          multivendorEnabled: process.env.MULTIVENDOR_ENABLED === "true",
          currencies: (process.env.SUPPORTED_CURRENCIES || "USD,BDT").split(","),
          defaultCurrency: process.env.DEFAULT_CURRENCY || "USD",
          allowGuestCheckout: process.env.GUEST_CHECKOUT_ENABLED === "true"
        }),
        inventoryPlugin({
          enabled: process.env.INVENTORY_ENABLED !== "false",
          multivendorEnabled: process.env.MULTIVENDOR_ENABLED === "true",
          trackMovements: true,
          lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || "10")
        }),
        geographyPlugin({
          enabled: process.env.GEOGRAPHY_ENABLED === "true"
        }),
        shippingPlugin({
          enabled: true,
          model: process.env.SHIPPING_MODEL || "platform"
        }),
        // Phase 3: Payments & Orders
        paymentsPlugin({
          enabled: true,
          adapter: process.env.PAYMENT_PROVIDER || "sslcommerz",
          sslcommerz: {
            storeId: process.env.SSLCOMMERZ_STORE_ID,
            storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
            sandbox: process.env.SSLCOMMERZ_SANDBOX === "true"
          },
          stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
          }
        }),
        ordersPlugin({
          enabled: true,
          splitByVendor: process.env.MULTIVENDOR_ENABLED === "true",
          orderStateMachine: "default"
        }),
        commissionsPlugin({
          enabled: process.env.MULTIVENDOR_ENABLED === "true",
          defaultStrategy: process.env.COMMISSION_STRATEGY || "percentage",
          defaultRate: Number(process.env.DEFAULT_COMMISSION_RATE ?? "0")
        }),
        payoutsPlugin({
          enabled: process.env.MULTIVENDOR_ENABLED === "true",
          schedule: process.env.PAYOUT_SCHEDULE || "biweekly",
          holdDays: Number(process.env.PAYOUT_HOLD_DAYS || "7"),
          adapter: process.env.PAYOUT_ADAPTER || "manual-ledger"
        }),
        notificationsPlugin({
          enabled: true,
          adapters: {
            email: process.env.EMAIL_ADAPTER || "smtp",
            sms: process.env.SMS_ADAPTER
          }
        }),
        // Phase 6.1: Identifier verification (email link/OTP)
        verificationPlugin({
          enabled: process.env.VERIFICATION_ENABLED !== "false",
          emailStrategy: process.env.EMAIL_VERIFICATION_STRATEGY || "link"
        }),
        discountsPlugin({
          enabled: process.env.DISCOUNTS_ENABLED !== "false"
        }),
        // Phase 6: Reviews (product + optional vendor reviews)
        reviewsPlugin({
          enabled: process.env.REVIEWS_ENABLED !== "false",
          requireApproval: process.env.REVIEW_REQUIRES_APPROVAL === "true",
          vendorReviews: process.env.MULTIVENDOR_ENABLED === "true"
        }),
        // Reports & Analytics Plugin
        reportsPlugin({
          enabled: process.env.REPORTS_ENABLED !== "false"
        })
        // Future plugins (added per phase):
        // ecommercePlugin({ ... })
        // ordersPlugin({ ... })
        // paymentsPlugin({ ... })
        // commissionsPlugin({ ... })
        // payoutsPlugin({ ... })
        // reviewsPlugin({ ... })
        // shippingPlugin({ ... })
        // inventoryPlugin({ ... })
        // notificationsPlugin({ ... })
        // analyticsPlugin({ ... })
        // seoPlugin({ collections: ['pages', 'products', 'vendor-profiles'] })
      ],
      // ─── Auth ─────────────────────────────────────────────────────────────────────
      // Decision #18: email OR phone + password.
      // Decision #17: social login (Google + Facebook) via @papercup/payload-auth-plugin (Phase 1 prep).
      secret: process.env.PAYLOAD_SECRET,
      // RFC 6750: Bearer is the standard; Payload also supports JWT prefix. Prefer Bearer first.
      auth: {
        jwtOrder: ["Bearer", "JWT", "cookie"]
      },
      // ─── Sharp (image processing) ────────────────────────────────────────────────
      sharp,
      // ─── Upload ───────────────────────────────────────────────────────────────────
      upload: {
        limits: {
          fileSize: 1e7
          // 10 MB
        }
      },
      // ─── TypeScript ───────────────────────────────────────────────────────────────
      typescript: {
        outputFile: path5.resolve(dirname, "payload-types.ts")
      },
      // ─── GraphQL ──────────────────────────────────────────────────────────────────
      graphQL: {
        schemaOutputFile: path5.resolve(dirname, "generated-schema.graphql")
      },
      // ─── CORS ────────────────────────────────────────────────────────────────────
      // Auth cookie is only accepted when request Origin is in this list (see payload auth extractJWT).
      // Include the API + admin host (`getPayloadServerUrl()`) and storefronts; set `SERVER_PUBLIC_URL`
      // on the server if the build-time `NEXT_PUBLIC_APP_URL` does not match production.
      cors: getPayloadTrustedOrigins(),
      // ─── CSRF ────────────────────────────────────────────────────────────────────
      // Mutations from the admin UI fail with a CSRF / auth error if the browser Origin
      // is not listed — often caused by a baked wrong `NEXT_PUBLIC_APP_URL` (see `payload-server-url.ts`).
      csrf: getPayloadTrustedOrigins()
    });
  }
});

// packages/admin/scripts/generate-schemas.ts
import fs3 from "node:fs";
import path6 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var dirname2 = path6.dirname(fileURLToPath3(import.meta.url));
var OUT_PATH = path6.resolve(dirname2, "../src/generated/schema.json");
var configModule = await Promise.resolve().then(() => (init_payload_config(), payload_config_exports));
var raw = await (configModule.default ?? configModule);
var [
  { Users: Users2 },
  { Media: Media2 },
  { Pages: Pages2 },
  { Categories: Categories2 },
  { Header: Header2 },
  { Footer: Footer2 },
  { PlatformSettings: PlatformSettings2 },
  { ecommercePlugin: ecommercePlugin2 },
  { multivendorPlugin: multivendorPlugin2 },
  { inventoryPlugin: inventoryPlugin2 },
  { shippingPlugin: shippingPlugin2 },
  { paymentsPlugin: paymentsPlugin2 },
  { ordersPlugin: ordersPlugin2 },
  { commissionsPlugin: commissionsPlugin2 },
  { payoutsPlugin: payoutsPlugin2 },
  { notificationsPlugin: notificationsPlugin2 },
  { verificationPlugin: verificationPlugin2 },
  { reviewsPlugin: reviewsPlugin2 },
  { discountsPlugin: discountsPlugin2 },
  { geographyPlugin: geographyPlugin2 },
  { reportsPlugin: reportsPlugin2 }
] = await Promise.all([
  Promise.resolve().then(() => (init_users(), users_exports)),
  Promise.resolve().then(() => (init_media(), media_exports)),
  Promise.resolve().then(() => (init_pages(), pages_exports)),
  Promise.resolve().then(() => (init_categories(), categories_exports)),
  Promise.resolve().then(() => (init_header(), header_exports)),
  Promise.resolve().then(() => (init_footer(), footer_exports)),
  Promise.resolve().then(() => (init_platform_settings(), platform_settings_exports)),
  Promise.resolve().then(() => (init_ecommerce(), ecommerce_exports)),
  Promise.resolve().then(() => (init_multivendor(), multivendor_exports)),
  Promise.resolve().then(() => (init_inventory(), inventory_exports)),
  Promise.resolve().then(() => (init_shipping(), shipping_exports)),
  Promise.resolve().then(() => (init_payments(), payments_exports)),
  Promise.resolve().then(() => (init_orders2(), orders_exports)),
  Promise.resolve().then(() => (init_commissions(), commissions_exports)),
  Promise.resolve().then(() => (init_payouts2(), payouts_exports)),
  Promise.resolve().then(() => (init_notifications(), notifications_exports)),
  Promise.resolve().then(() => (init_verification(), verification_exports)),
  Promise.resolve().then(() => (init_reviews(), reviews_exports)),
  Promise.resolve().then(() => (init_discounts(), discounts_exports)),
  Promise.resolve().then(() => (init_geography(), geography_exports)),
  Promise.resolve().then(() => (init_reports(), reports_exports))
]);
var extended = {
  collections: [Users2, Media2, Pages2, Categories2],
  globals: [Header2, Footer2, PlatformSettings2]
};
var forceEnabled = [
  ["multivendorPlugin", multivendorPlugin2({ enabled: true })],
  ["ecommercePlugin", ecommercePlugin2({ enabled: true })],
  ["inventoryPlugin", inventoryPlugin2({ enabled: true })],
  ["geographyPlugin", geographyPlugin2({ enabled: true })],
  ["shippingPlugin", shippingPlugin2({ enabled: true })],
  ["paymentsPlugin", paymentsPlugin2({ enabled: true })],
  ["ordersPlugin", ordersPlugin2({ enabled: true, splitByVendor: true })],
  ["commissionsPlugin", commissionsPlugin2({ enabled: true })],
  ["payoutsPlugin", payoutsPlugin2({ enabled: true })],
  ["notificationsPlugin", notificationsPlugin2({ enabled: true })],
  ["verificationPlugin", verificationPlugin2({ enabled: true })],
  ["discountsPlugin", discountsPlugin2({ enabled: true })],
  ["reviewsPlugin", reviewsPlugin2({ enabled: true, vendorReviews: true })],
  ["reportsPlugin", reportsPlugin2({ enabled: true })]
];
for (const [, plugin] of forceEnabled) {
  extended = plugin(extended);
}
function prettify(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
}
function normLabel(label) {
  if (!label) return void 0;
  if (typeof label === "string") return label;
  if (typeof label === "object") return label.singular ?? label.plural;
  return void 0;
}
function normOptions(options) {
  if (!Array.isArray(options)) return void 0;
  return options.map(
    (o) => typeof o === "string" ? { label: prettify(o), value: o } : { label: normLabel(o) ?? String(o.value), value: String(o.value) }
  );
}
function normFields(fields) {
  if (!Array.isArray(fields)) return [];
  const out = [];
  for (const f of fields) {
    const normalized = normField(f);
    if (normalized) out.push(...normalized);
  }
  return out;
}
function normField(f) {
  if (!f || typeof f !== "object") return null;
  const type = String(f.type ?? "text");
  if (type === "ui") return null;
  if (f.hidden === true) return null;
  if (type === "row") return normFields(f.fields);
  const base = {
    type
  };
  if (f.name) base.name = String(f.name);
  const label = normLabel(f.label) ?? (f.name ? prettify(String(f.name)) : void 0);
  if (label) base.label = label;
  if (f.required === true) base.required = true;
  if (f.localized === true) base.localized = true;
  if (f.unique === true) base.unique = true;
  if (f.defaultValue !== void 0 && typeof f.defaultValue !== "function" && f.defaultValue !== null) {
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
      base.tabs = (f.tabs ?? []).map((t) => ({
        label: normLabel(t.label) ?? (t.name ? prettify(t.name) : void 0),
        name: t.name ? String(t.name) : void 0,
        fields: normFields(t.fields)
      }));
      break;
    case "array":
    case "group":
      base.fields = normFields(f.fields);
      if (normLabel(f.labels)) base.label = normLabel(f.labels);
      break;
    case "blocks":
      base.blocks = (f.blocks ?? []).map((b) => ({
        slug: String(b.slug),
        label: normLabel(b.labels) ?? normLabel(b.label) ?? prettify(String(b.slug)),
        fields: normFields(b.fields)
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
function titleizeSlug(slug) {
  return slug.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
function fieldTreeHasLocalized(f) {
  if (f.localized) return true;
  if (f.fields?.some(fieldTreeHasLocalized)) return true;
  if (f.tabs?.some((t) => t.fields.some(fieldTreeHasLocalized))) return true;
  if (f.blocks?.some((b) => b.fields.some(fieldTreeHasLocalized))) return true;
  return false;
}
function normCollection(c) {
  const useAsTitle = c.admin?.useAsTitle ?? (c.auth ? "email" : "id");
  const fields = normFields(c.fields);
  const versions = c.versions ? {
    drafts: Boolean(c.versions.drafts),
    max: typeof c.versions.maxPerDoc === "number" ? c.versions.maxPerDoc : void 0
  } : null;
  return {
    slug: String(c.slug),
    label: normLabel(c.labels) ?? titleizeSlug(String(c.slug)),
    group: c.admin?.group ? String(c.admin.group) : void 0,
    useAsTitle: String(useAsTitle),
    defaultColumns: Array.isArray(c.admin?.defaultColumns) ? c.admin.defaultColumns.map(String) : void 0,
    description: typeof c.admin?.description === "string" ? c.admin.description : void 0,
    auth: Boolean(c.auth),
    upload: Boolean(c.upload),
    versions,
    timestamps: c.timestamps !== false,
    hasLocalized: fields.some((fl) => fieldTreeHasLocalized(fl)),
    fields
  };
}
function normGlobal(g) {
  const fields = normFields(g.fields);
  return {
    slug: String(g.slug),
    label: normLabel(g.label) ?? normLabel(g.labels) ?? titleizeSlug(String(g.slug)),
    group: g.admin?.group ? String(g.admin.group) : void 0,
    hasLocalized: fields.some((fl) => fieldTreeHasLocalized(fl)),
    fields
  };
}
function dedupeBySlug(items) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}
var INTERNAL_SLUGS = /* @__PURE__ */ new Set([
  "payload-kv",
  "payload-locked-documents",
  "payload-preferences",
  "payload-migrations"
]);
var liveCols = (raw.collections ?? []).filter(
  (c) => !INTERNAL_SLUGS.has(String(c.slug))
);
var extendedCols = (extended.collections ?? []).filter(
  (c) => !INTERNAL_SLUGS.has(String(c.slug))
);
var liveNorm = dedupeBySlug(liveCols.map(normCollection));
var liveSlugs = new Set(liveNorm.map((c) => c.slug));
var conditionalNorm = dedupeBySlug(extendedCols.map(normCollection)).filter((c) => !liveSlugs.has(c.slug)).map((c) => ({ ...c, conditional: true }));
var collections = [...liveNorm, ...conditionalNorm];
var liveGlobalSlugs = new Set(
  (raw.globals ?? []).map((g) => String(g.slug))
);
var globals = dedupeBySlug((extended.globals ?? []).map(normGlobal)).map(
  (g) => liveGlobalSlugs.has(g.slug) ? g : { ...g, conditional: true }
);
var localization = raw.localization ? {
  locales: (raw.localization.locales ?? []).map(
    (l) => typeof l === "string" ? { code: l, label: l } : {
      code: String(l.code),
      label: normLabel(l.label) ?? String(l.code)
    }
  ),
  defaultLocale: String(raw.localization.defaultLocale ?? "en"),
  fallback: Boolean(raw.localization.fallback)
} : null;
fs3.mkdirSync(path6.dirname(OUT_PATH), { recursive: true });
fs3.writeFileSync(
  OUT_PATH,
  JSON.stringify(
    {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      localization,
      collections,
      globals
    },
    null,
    2
  )
);
var lines = collections.map(
  (c) => `  ${c.slug.padEnd(28)} group=${(c.group ?? "\u2014").padEnd(14)} auth=${c.auth ? "Y" : "n"} upload=${c.upload ? "Y" : "n"} versions=${c.versions ? c.versions.drafts ? "drafts" : "Y" : "-"}${c.conditional ? " CONDITIONAL" : ""} fields=${c.fields.length}`
);
console.log(`collections (${collections.length}):`);
console.log(lines.join("\n"));
console.log(
  `globals (${globals.length}): ${globals.map((g) => g.slug).join(", ")}`
);
console.log(`localization: ${JSON.stringify(localization)}`);
console.log(`wrote ${OUT_PATH}`);
