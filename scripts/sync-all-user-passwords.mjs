/**
 * Set every user's password to the same value (Payload 3 PBKDF2 scheme).
 * For local / client-demo databases only — never run against production.
 *
 * From BS-Commerce root:
 *   node scripts/sync-all-user-passwords.mjs
 *   DEMO_UNIFIED_PASSWORD='your-secret' node scripts/sync-all-user-passwords.mjs
 *
 * Optional first arg: path to a KEY=value env file (loads DATABASE_URI).
 * DATABASE_URI must point at the target Postgres (e.g. bs_commerce_mv).
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

function parseEnvFile(filePath) {
  const parsed = {}
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

function pbkdf2Hex(password, saltHex) {
  return crypto.pbkdf2Sync(password, saltHex, 25000, 512, 'sha256').toString('hex')
}

function psql(uri, sql) {
  return execFileSync('psql', [uri, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

function psqlExec(uri, sql) {
  execFileSync('psql', [uri, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'inherit' })
}

const envFileArg = process.argv[2]?.match(/\.env/i) ? path.resolve(process.cwd(), process.argv[2]) : null
if (envFileArg && fs.existsSync(envFileArg)) {
  const fileEnv = parseEnvFile(envFileArg)
  for (const [k, v] of Object.entries(fileEnv)) {
    if (process.env[k] === undefined) process.env[k] = v
  }
}

let databaseUri = process.env.DATABASE_URI
if (!databaseUri && fs.existsSync(path.resolve(process.cwd(), '../docker/.env.multivendor'))) {
  const mv = parseEnvFile(path.resolve(process.cwd(), '../docker/.env.multivendor'))
  databaseUri = mv.DATABASE_URI?.replace('host.docker.internal', 'localhost')
}

if (!databaseUri) {
  console.error('DATABASE_URI is required (or ../docker/.env.multivendor).')
  process.exit(1)
}

/** Default matches team client-demo convention; override with DEMO_UNIFIED_PASSWORD. */
const password = process.env.DEMO_UNIFIED_PASSWORD || 'Asd@1234'

const idsRaw = psql(databaseUri, `SELECT id::text FROM users ORDER BY created_at ASC;`)
const ids = idsRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)

if (ids.length === 0) {
  console.log('No users in database; nothing to update.')
  process.exit(0)
}

console.log(`Updating passwords for ${ids.length} user(s) (each gets a fresh salt, same plaintext).`)

for (const id of ids) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    console.warn('Skipping invalid id:', id)
    continue
  }
  const salt = crypto.randomBytes(32).toString('hex')
  const hash = pbkdf2Hex(password, salt)
  const sql = `UPDATE users SET salt = '${salt}', hash = '${hash}', login_attempts = 0, lock_until = NULL WHERE id = '${id}';`
  psqlExec(databaseUri, sql)
}

console.log('Done. All users now share the password from DEMO_UNIFIED_PASSWORD (see script header for default).')
