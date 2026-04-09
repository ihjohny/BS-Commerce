/**
 * One-shot client demo prep:
 *   1) Sync all user passwords (DEMO_UNIFIED_PASSWORD — env or .env.demo-seed)
 *   2) Discover first admin email from the database
 *   3) Run frontend demo seed against MV (and SV if up) using that admin
 *
 * Usage from BS-Commerce root:
 *   node scripts/run-client-demo-bootstrap.mjs
 *   node scripts/run-client-demo-bootstrap.mjs ../docker/.env.multivendor
 *
 * Env:
 *   DATABASE_URI — optional if .env.multivendor path given or ../docker/.env.multivendor exists
 *   DEMO_UNIFIED_PASSWORD — required unless set in .env.demo-seed (see .env.demo-seed.example)
 *   DEMO_ADMIN_EMAIL — skip discovery; use this email for seed login
 *   SEED_SKIP_REMOTE_IMAGES=true — faster seed without image downloads
 */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  mergeDemoSeedEnvFiles,
  requireDemoUnifiedPassword,
} from './lib/load-demo-unified-password.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function parseEnvFile(filePath) {
  const parsed = {}
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    parsed[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return parsed
}

const envFileArg = process.argv[2]?.match(/\.env/i) ? path.resolve(process.cwd(), process.argv[2]) : null
if (envFileArg && fs.existsSync(envFileArg)) {
  const fileEnv = parseEnvFile(envFileArg)
  for (const [k, v] of Object.entries(fileEnv)) {
    if (process.env[k] === undefined) process.env[k] = v
  }
} else if (fs.existsSync(path.join(root, '../docker/.env.multivendor'))) {
  const fileEnv = parseEnvFile(path.join(root, '../docker/.env.multivendor'))
  for (const [k, v] of Object.entries(fileEnv)) {
    if (process.env[k] === undefined) process.env[k] = v
  }
}

mergeDemoSeedEnvFiles(root)

let databaseUri = process.env.DATABASE_URI
if (databaseUri?.includes('host.docker.internal')) {
  databaseUri = databaseUri.replace('host.docker.internal', 'localhost')
  process.env.DATABASE_URI = databaseUri
}

if (!databaseUri) {
  console.error('DATABASE_URI missing. Pass an env file or ensure ../docker/.env.multivendor exists.')
  process.exit(1)
}

const demoPassword = requireDemoUnifiedPassword()

console.log('\n=== Step 1: sync passwords for all users ===\n')
const sync = spawnSync(process.execPath, [path.join(__dirname, 'sync-all-user-passwords.mjs')], {
  cwd: root,
  env: { ...process.env, DATABASE_URI: databaseUri, DEMO_UNIFIED_PASSWORD: demoPassword },
  stdio: 'inherit',
})
if (sync.status !== 0) process.exit(sync.status ?? 1)

let adminEmail = process.env.DEMO_ADMIN_EMAIL?.trim()
if (!adminEmail) {
  console.log('\n=== Step 2: discover admin email ===\n')
  try {
    adminEmail = execFileSync(
      'psql',
      [databaseUri, '-t', '-A', '-c', `SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL ORDER BY created_at ASC LIMIT 1;`],
      { encoding: 'utf8' },
    ).trim()
  } catch (e) {
    console.error('Could not query admin email. Set DEMO_ADMIN_EMAIL.', e.message)
    process.exit(1)
  }
}

if (!adminEmail) {
  console.error('No admin with email found. Create an admin user first.')
  process.exit(1)
}

console.log('Using admin email for seed:', adminEmail)

console.log('\n=== Step 3: seed catalog (manifest-driven) ===\n')
const seed = spawnSync(process.execPath, [path.join(__dirname, 'seed-frontend-demo.mjs')], {
  cwd: root,
  env: {
    ...process.env,
    DATABASE_URI: databaseUri,
    SEED_ADMIN_EMAIL: adminEmail,
    SEED_ADMIN_PASSWORD: demoPassword,
    SEED_ADMIN_EMAIL_MV: adminEmail,
    SEED_ADMIN_PASSWORD_MV: demoPassword,
    SEED_ADMIN_EMAIL_SV: adminEmail,
    SEED_ADMIN_PASSWORD_SV: demoPassword,
  },
  stdio: 'inherit',
})

if (seed.status !== 0) process.exit(seed.status ?? 1)

console.log('\n=== Client demo bootstrap finished ===')
console.log('Log in (admin, vendors, customers):', adminEmail, '/', '(password from DEMO_UNIFIED_PASSWORD)')
