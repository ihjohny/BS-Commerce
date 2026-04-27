# Payload CLI vs Next.js: import resolution and migrations

This document explains a recurring class of issues when running **Payload CMS 3** command-line tools (`payload migrate`, `payload migrate:create`, `generate:types`, etc.) in the **BS-Commerce** codebase. It is **not** a problem with your application code in the way Next.js runs it, and it is **not** fixed by “Payload plugin” specific `tsconfig` settings.

## Quick summary

| Context | Resolves `./collections/users` and `./access/foo` style imports? |
|--------|-------------------------------------------------------------------|
| **Next.js** (`next dev` / `next build`) | Yes (bundler resolution) |
| **Payload CLI** (Node ESM, often with `tsx`) | Often **no** (strict file/directory ESM rules) |
| **Fix** | Custom Node import hook + Payload `--disable-transpile` — see [Recommended fix](#recommended-fix) |

---

## Root `BS-Commerce/tsconfig.json`: do you need it?

**It is optional** for the normal workflow: **`packages/backend`** has its own full `tsconfig.json` and `yarn typecheck` / `next build` use that.

**Reasons to keep the root file:**

- Some tools walk **upward** for `getTsconfig()`; a minimal `tsconfig.json` at the monorepo `BS-Commerce/` root avoids **null/undefined** when something runs with cwd at or above `packages/backend`.
- It can give the IDE a **single** include set for `packages/backend` + `packages/shared` when the workspace is opened at `BS-Commerce/`.

**Reasons to remove it:** if nothing in CI or your tooling depends on a root `tsconfig`, and you always run `tsc` from `packages/backend` only, you can delete it. Before removing, run your usual `yarn typecheck` and any root-level scripts.

**It does not** fix Payload CLI resolution; the [Node resolve hook](#where-the-import-hook-lives) does.

---

## What goes wrong

### 1. Two different module systems in play

- The **app** (Next + `@payloadcms/next`) is built and bundled. The bundler resolves TypeScript the way you expect: `'./plugins/ecommerce'` can map to `ecommerce/index.ts`, and `'../access/is-admin'` can map to `is-admin.ts`.

- The **Payload CLI** is a **Node** process. It loads `payload.config.ts` using Node’s **ESM** loader. In that environment:

  - **Directory imports** can fail with `Error [ERR_UNSUPPORTED_DIR_IMPORT]`.
  - **Extensionless** relative imports to other `.ts` files can fail with `Error [ERR_MODULE_NOT_FOUND]`.

So the **same** source works in the Next app but can break for the **CLI** entry.

### 2. Why changing `tsconfig` “for plugins” does not fix the CLI

- **Payload plugins** (see [Payload plugins overview](https://payloadcms.com/docs/plugins/overview)) are normal TypeScript/ESM modules. No special `compilerOptions` is required for “Payload plugins” beyond a normal TypeScript/Next app.

- The `"plugins": [{ "name": "next" }]` entry in the **backend** `tsconfig.json` is the **TypeScript/Next** language service, **not** Payload runtime plugins.

- `moduleResolution: "bundler"` mainly affects **TypeScript** and the **bundler**; the Payload CLI does not use that algorithm for your config the same way `next` does.

### 3. Monorepo, Windows, and `tsx` vs the hook

- **Working directory:** Prefer running package scripts from **`BS-Commerce/packages/backend`**, or `yarn workspace @bs-commerce/backend <script>` from `BS-Commerce/`.

- **`npx payload` on Windows** with hoisted `node_modules` is unreliable. Use **`package.json` scripts** that call `node` with an explicit `../../node_modules/payload/bin.js` (Yarn hoists to `BS-Commerce/node_modules`).

- A custom **`node:module` resolve hook** can **conflict** with Payload’s default **tsx** path (`ERR_REQUIRE_ASYNC_MODULE`). **Always pair the hook with `--disable-transpile`** on the Payload binary so the built `dist` bin loads without that `tsImport` path.

### 4. Migration files and runtime `import`

Generated migrations often start with:

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
```

`MigrateUpArgs` and `MigrateDownArgs` are **type-only** exports in the built JS — they are **not** real runtime named exports. **Node** loading the migration will throw (*does not provide an export named 'MigrateDownArgs'*). Use:

```ts
import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
```

---

## Where the import hook lives

The hook is **not** test-specific: it is used for **unit tests** (Node’s test runner) **and** **Payload CLI** (migrate, generate:types, etc.). It was originally colocated under `tests/_helpers/`; it now lives in a neutral place:

| Path | Role |
|------|------|
| `packages/backend/scripts/node-resolve/register-ts-resolve.mjs` | `node:module` registration |
| `packages/backend/scripts/node-resolve/resolve-ts-hook.mjs` | Resolves `@bs-commerce/shared` to source and adds `.ts` / `index.ts` fallbacks for relative imports |

The standalone **`backend-demo`** copy may still use `tests/_helpers/` until aligned.

---

## Recommended fix (monorepo backend)

1. **Register** the hook: `--import ./scripts/node-resolve/register-ts-resolve.mjs`
2. **Call** the Payload binary with **`--disable-transpile`**
3. **Hoisted dependency path** (from `packages/backend`):

   ```text
   node --import ./scripts/node-resolve/register-ts-resolve.mjs ../../node_modules/payload/bin.js --disable-transpile <command>
   ```

4. Expose that via `package.json` (`db:migrate`, `db:migrate:create`, `generate:types`, etc.). Prefer **`yarn workspace @bs-commerce/backend <script>`** from `BS-Commerce/`.

5. **Node** ≥ 24; optional `"type": "module"` in `package.json` can silence `MODULE_TYPELESS_PACKAGE_JSON` (evaluate for Next if you change it).

**Note:** `resolve-ts-hook` in **`backend-demo`** may have `@bs-commerce/shared` commented out (inlined shared code). The **monorepo** hook should keep the shared redirect in sync with how you resolve the workspace package.

### Alternatives

- Explicit `…/index.ts` in `payload.config.ts` only: helps the config file, not extensionless imports across the rest of the tree without the hook.
- **prodMigrations** on deploy still needs migrations to be **authored** with a working **`migrate:create`**.

---

## Symptoms (errors you may see)

1. `ERR_UNSUPPORTED_DIR_IMPORT` for a directory path.
2. `ERR_MODULE_NOT_FOUND` for extensionless `../access/foo` style paths.
3. `ERR_REQUIRE_ASYNC_MODULE` if the hook is used **without** `--disable-transpile`.
4. (Monorepo) `getTsconfig` null or missing `tsconfig` at the **wrong** cwd.
5. *does not provide an export named 'MigrateDownArgs'* — use `import type` for migration arg types; keep `sql` as a value import.

---

## What this is not

- It is **not** a claim that your app imports are invalid for Next.
- It is **not** fixed by a `tsconfig` “flag for Payload plugins” — use the [Payload plugin docs](https://payloadcms.com/docs/plugins/overview) for plugins; this doc is for **running the CLI** next to a **Next** app.

---

*Last updated: root `tsconfig` note, `scripts/node-resolve/` layout, monorepo backend scripts, migration `import type`.*
