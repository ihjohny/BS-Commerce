import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedSrc = path.resolve(__dirname, '../../../shared/src/index.ts')
const sharedSrcUrl = new URL(`file://${sharedSrc.replace(/\\/g, '/')}`).href
/** Mirrors tsconfig `paths`: `@/*` -> `./src/*` (required for `node --test` + strip-types). */
const backendSrcRoot = path.resolve(__dirname, '../../src')

function resolveTsconfigAlias(specifier) {
  if (!specifier.startsWith('@/')) return null
  const rel = specifier.slice(2)
  const base = path.resolve(backendSrcRoot, rel)
  const candidates = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return pathToFileURL(p).href
    }
  }
  return null
}

/**
 * Node.js ESM resolve hook (used for unit tests, Payload CLI, etc.):
 * 1. Resolves @bs-commerce/shared to the TS source
 * 2. Resolves `@/` to packages/backend/src (matches tsconfig paths)
 * 3. For relative imports, appends .ts or /index.ts when the plain Node resolver fails
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@bs-commerce/shared') {
    return { url: sharedSrcUrl, shortCircuit: true }
  }

  const aliasUrl = resolveTsconfigAlias(specifier)
  if (aliasUrl) {
    return { url: aliasUrl, shortCircuit: true }
  }

  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return nextResolve(specifier, context)
  }
  if (/\.[cm]?[jt]sx?$/.test(specifier)) {
    return nextResolve(specifier, context)
  }
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND') {
      try {
        return await nextResolve(specifier + '.ts', context)
      } catch {
        return nextResolve(specifier + '/index.ts', context)
      }
    }
    if (err?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      return nextResolve(specifier + '/index.ts', context)
    }
    throw err
  }
}
