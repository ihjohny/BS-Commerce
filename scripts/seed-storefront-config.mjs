/**
 * Minimal idempotent seed: Payload globals (header, footer) + CMS pages required for
 * storefront integration (e.g. home hero source page). No products, users, orders, or demo media.
 *
 * Does not replace `seed-frontend-demo.mjs` — run this on a fresh DB before optional demo seed.
 *
 * From BS-Commerce root:
 *   yarn seed:storefront-config
 *
 * Same credentials as demo seed:
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 *   or SEED_ADMIN_EMAIL_SV / SEED_ADMIN_PASSWORD_SV (and _MV for multivendor host)
 *
 * Optional:
 *   STOREFRONT_CONFIG_SEED_PATH — absolute path to JSON (defaults to data/storefront-config.seed.json)
 *   SEED_STACKS or --stacks sv,mv — which API(s) to call (default: both). SV=3000, MV=4000. Each backend
 *     uses its own Postgres; seeding one does not update the other unless both are in the list.
 *     yarn seed:storefront-config:sv / :mv pass --stacks sv or --stacks mv so one env file does not
 *     overwrite the other stack’s DB.
 *   SEED_DEFAULT_LOCALE — locale for localized page fields when creating/updating CMS pages (default: en)
 *
 * Currency (Admin → Platform Settings):
 *   DEFAULT_CURRENCY, SUPPORTED_CURRENCIES — applied to globals/platform-settings (currency group).
 *   This script does not load any .env unless you point at one (shell vars still win for keys
 *   already set):
 *     yarn seed:storefront-config -- --env-file ../docker/.env.multivendor
 *     SEED_ENV_FILE=../docker/.env.singlevendor yarn seed:storefront-config
 *   Optional: SEED_USD_TO_BDT_RATE.
 *
 * Preconditions (new DB):
 *   - Migrations applied; API reachable.
 *   - Admin JWT path: set SEED_ADMIN_* or allow first-register via SEED_FIRST_REGISTER_*.
 *   - Run against each backend you use (SV / MV) or set SEED_STACKS=sv only.
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ensureAdminToken,
  ensureGlobal,
  ensurePage,
} from './lib/payload-seed-api.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Merge KEY=VALUE lines into process.env (shell wins for keys already set).
 */
function loadEnvFileMerge(filePath) {
  let text = readFileSync(filePath, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (const line of text.split(/\r?\n/)) {
    let m = line.trim()
    if (!m || m.startsWith('#')) continue
    if (m.startsWith('export ')) m = m.slice(7).trim()
    const eq = m.indexOf('=')
    if (eq === -1) continue
    const key = m.slice(0, eq).trim()
    if (!key) continue
    let val = m.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] !== undefined && process.env[key] !== '') continue
    process.env[key] = val
  }
}

/**
 * @param {string[]} argv process.argv.slice(2)
 * @returns {string | null} --env-file path (raw, may be relative)
 */
function parseEnvFileFromArgv(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--env-file' && argv[i + 1]) {
      return argv[i + 1]
    }
    if (a.startsWith('--env-file=')) {
      return a.slice('--env-file='.length)
    }
  }
  return null
}

/**
 * @param {string[]} argv process.argv.slice(2)
 * @returns {string | null} e.g. "sv" or "sv,mv"
 */
function parseStacksFromArgv(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--stacks' && argv[i + 1]) {
      return argv[i + 1]
    }
    if (a.startsWith('--stacks=')) {
      return a.slice('--stacks='.length)
    }
  }
  return null
}

function resolveOptionalEnvFilePath() {
  const fromCli = parseEnvFileFromArgv(process.argv.slice(2))
  const raw = fromCli ?? process.env.SEED_ENV_FILE
  if (!raw || String(raw).trim() === '') return null
  const p = isAbsolute(raw) ? raw : join(process.cwd(), raw)
  return p
}

const _envFilePath = resolveOptionalEnvFilePath()
if (_envFilePath) {
  if (!existsSync(_envFilePath)) {
    console.error(`[seed] Env file not found: ${_envFilePath}`)
    process.exit(1)
  }
  loadEnvFileMerge(_envFilePath)
  console.log(`[seed] Merged env from ${_envFilePath}`)
}

const SV = { base: process.env.SEED_SV_API_BASE || 'http://localhost:3000', key: 'SV' }
const MV = { base: process.env.SEED_MV_API_BASE || 'http://localhost:4000', key: 'MV' }

/** Only USD/BDT exist in Platform Settings select options today. */
const PLATFORM_CURRENCY_CODES = new Set(['USD', 'BDT'])

/**
 * Sync Admin "Currency Settings" with the same env vars used by the backend (`currencies.ts`).
 */
function platformSettingsCurrencyBodyFromEnv() {
  const supportedRaw = (process.env.SUPPORTED_CURRENCIES || 'USD,BDT')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const supported = supportedRaw.filter((c) => PLATFORM_CURRENCY_CODES.has(c))
  const supportedCurrencies = supported.length > 0 ? supported : ['USD', 'BDT']

  const preferred = (process.env.DEFAULT_CURRENCY || 'USD').trim()
  const defaultCurrency = supportedCurrencies.includes(preferred) ? preferred : supportedCurrencies[0]

  const rateRaw = process.env.SEED_USD_TO_BDT_RATE
  const usdToBdtRate =
    rateRaw != null && String(rateRaw).trim() !== '' && Number.isFinite(Number(rateRaw))
      ? Number(rateRaw)
      : 110

  return {
    currency: {
      defaultCurrency,
      supportedCurrencies,
      usdToBdtRate,
    },
  }
}

function loadManifest() {
  const manifestPath =
    process.env.STOREFRONT_CONFIG_SEED_PATH || join(__dirname, '../data/storefront-config.seed.json')
  if (!existsSync(manifestPath)) {
    throw new Error(`Storefront config seed file not found: ${manifestPath}`)
  }
  const raw = readFileSync(manifestPath, 'utf8')
  const m = JSON.parse(raw)
  if (!m.globals || typeof m.globals !== 'object') {
    throw new Error(`Invalid manifest: expected "globals" object at ${manifestPath}`)
  }
  if (!Array.isArray(m.pages)) {
    throw new Error(`Invalid manifest: expected "pages" array at ${manifestPath}`)
  }
  return m
}

async function seedStack(label, base, stackKey, manifest) {
  console.log(`\n=== ${label} (${base}) ===`)
  const token = await ensureAdminToken(base, stackKey)
  console.log('Admin session OK')

  for (const [globalSlug, body] of Object.entries(manifest.globals)) {
    console.log(`  globals/${globalSlug}`)
    await ensureGlobal(base, token, globalSlug, body)
  }

  const platformCurrency = platformSettingsCurrencyBodyFromEnv()
  console.log('  globals/platform-settings (currency)', JSON.stringify(platformCurrency.currency))
  await ensureGlobal(base, token, 'platform-settings', platformCurrency)

  for (const page of manifest.pages) {
    if (!page?.slug || !page.title) {
      console.warn('  [skip] page missing slug or title', page)
      continue
    }
    if (page.layout != null && !Array.isArray(page.layout)) {
      console.warn('  [skip] page layout must be an array:', page.slug)
      continue
    }
    console.log(`  pages/${page.slug}`)
    await ensurePage(base, token, page)
  }

  console.log(`  Done (${label})`)
}

const manifest = loadManifest()

const stacksFromCli = parseStacksFromArgv(process.argv.slice(2))
const stackFilterRaw = String(stacksFromCli ?? process.env.SEED_STACKS ?? 'sv,mv')
  .split(',')
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean)
const runSv = stackFilterRaw.includes('sv') || stackFilterRaw.includes('single') || stackFilterRaw.includes('single-vendor')
const runMv =
  stackFilterRaw.includes('mv') ||
  stackFilterRaw.includes('multi') ||
  stackFilterRaw.includes('multivendor')

const targets = []
if (runSv) targets.push({ label: 'Single-vendor', base: SV.base, key: SV.key })
if (runMv) targets.push({ label: 'Multivendor', base: MV.base, key: MV.key })
if (targets.length === 0) {
  console.error('SEED_STACKS must include at least one of: sv,mv')
  process.exit(1)
}

console.log(
  `[seed] API target(s): ${targets.map((t) => `${t.label} ${t.base}`).join(' | ')}`,
)

let anyOk = false
for (const { label, base, key } of targets) {
  try {
    await seedStack(label, base, key, manifest)
    anyOk = true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`\n[WARN] ${label} (${base}) skipped: ${msg}`)
  }
}

if (!anyOk) {
  console.error(
    '\nNo API was seeded. Start backends or set SEED_ADMIN_* / STOREFRONT_CONFIG_SEED_PATH.',
  )
  process.exit(1)
}
console.log('\nStorefront config seed complete.')
