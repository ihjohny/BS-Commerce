import fs from 'node:fs'
import path from 'node:path'

/** Resolve Next.js CLI entry for monorepos (local or hoisted node_modules). */
export function findNextCliJs(backendRoot) {
  const candidates = [
    path.join(backendRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
    path.join(backendRoot, '..', '..', 'node_modules', 'next', 'dist', 'bin', 'next'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}
