/**
 * Node.js resolve hook that appends .ts extension to relative imports that
 * fail to resolve. This allows source files using extensionless TS imports
 * (e.g. `import { x } from './foo'`) to work under --experimental-strip-types.
 */
export async function resolve(specifier, context, nextResolve) {
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
      return nextResolve(specifier + '.ts', context)
    }
    throw err
  }
}
