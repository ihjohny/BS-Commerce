import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedSrc = path.resolve(__dirname, '../../../shared/src/index.ts')
const sharedSrcUrl = new URL(`file://${sharedSrc.replace(/\\/g, '/')}`).href

/**
 * Node.js resolve hook that:
 * 1. Redirects @bs-commerce/shared to its TypeScript source (avoids needing a build step)
 * 2. Appends .ts or /index.ts to imports that fail to resolve
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@bs-commerce/shared') {
    return { url: sharedSrcUrl, shortCircuit: true }
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
        // Directory import — try /index.ts
        return nextResolve(specifier + '/index.ts', context)
      }
    }
    if (err?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      return nextResolve(specifier + '/index.ts', context)
    }
    throw err
  }
}
