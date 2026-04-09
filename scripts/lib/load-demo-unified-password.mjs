/**
 * Demo unified password must never live in committed source. Resolve from:
 * 1) process.env.DEMO_UNIFIED_PASSWORD (highest priority)
 * 2) Keys merged from BS-Commerce/.env.demo-seed then .env.demo-seed.local
 *    (only sets process.env[k] when k is currently unset, except merged file
 *    layering: local overrides demo-seed for the merged map before applying)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** BS-Commerce repository root (parent of /scripts). */
export const BS_COMMERCE_ROOT = path.resolve(__dirname, '..', '..')

export function parseEnvFile(filePath) {
  const parsed = {}
  if (!fs.existsSync(filePath)) return parsed
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    parsed[key] = value
  }
  return parsed
}

/**
 * Merge demo env files into process.env where keys are still unset.
 * demo-seed.local values override demo-seed for keys that end up applied.
 */
export function mergeDemoSeedEnvFiles(rootDir = BS_COMMERCE_ROOT) {
  const demo = parseEnvFile(path.join(rootDir, '.env.demo-seed'))
  const local = parseEnvFile(path.join(rootDir, '.env.demo-seed.local'))
  const merged = { ...demo, ...local }
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === undefined && v !== '') {
      process.env[k] = v
    }
  }
}

export function getDemoUnifiedPasswordFromEnv() {
  return process.env.DEMO_UNIFIED_PASSWORD?.trim() || null
}

export function exitWithDemoPasswordHelp() {
  const example = path.join(BS_COMMERCE_ROOT, '.env.demo-seed.example')
  const target = path.join(BS_COMMERCE_ROOT, '.env.demo-seed')
  console.error(
    'DEMO_UNIFIED_PASSWORD is not set.\n' +
      `  • Export it in your shell, or\n` +
      `  • Copy ${path.basename(example)} to ${path.basename(target)} and set DEMO_UNIFIED_PASSWORD there (both files are gitignored except the .example).`,
  )
  process.exit(1)
}

export function requireDemoUnifiedPassword() {
  mergeDemoSeedEnvFiles()
  const p = getDemoUnifiedPasswordFromEnv()
  if (!p) exitWithDemoPasswordHelp()
  return p
}
