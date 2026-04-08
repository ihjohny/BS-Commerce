/**
 * Reset a local admin user's password using the same PBKDF2 scheme as Payload 3
 * (salt = 32 random bytes hex, hash = pbkdf2(password, salt, 25000, 512, sha256) hex).
 *
 * Plaintext passwords cannot be read from the database — only reset.
 *
 * Usage (from BS-Commerce repo root):
 *   DATABASE_URI=postgres://... node scripts/reset-local-admin-password.mjs
 *
 * Optional env:
 *   RESET_ADMIN_EMAIL   — defaults to first admin with non-null email (from DB)
 *   RESET_ADMIN_PASSWORD — new password (default: LocalDevSeed2026!)
 *
 * Optional first arg: path to .env file (KEY=value) to load DATABASE_URI
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

const envFileArg = process.argv[2]?.endsWith('.env') ? path.resolve(process.cwd(), process.argv[2]) : null
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
  console.error('DATABASE_URI is required (or place ../docker/.env.multivendor with DATABASE_URI).')
  process.exit(1)
}

const newPassword = process.env.RESET_ADMIN_PASSWORD || 'LocalDevSeed2026!'
let email = process.env.RESET_ADMIN_EMAIL?.trim()

if (!email) {
  try {
    email = psql(
      databaseUri,
      `SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL ORDER BY created_at ASC LIMIT 1;`,
    )
  } catch (e) {
    console.error('Could not query admin email. Set RESET_ADMIN_EMAIL.', e.message)
    process.exit(1)
  }
}

if (!email) {
  console.error('No admin user with email found.')
  process.exit(1)
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Invalid admin email from database:', email)
  process.exit(1)
}

const salt = crypto.randomBytes(32).toString('hex')
const hash = pbkdf2Hex(newPassword, salt)
const safeEmail = email.replace(/'/g, "''")

const updateSql = `UPDATE users SET salt = '${salt}', hash = '${hash}', login_attempts = 0, lock_until = NULL WHERE email = '${safeEmail}' AND role = 'admin';`

try {
  psqlExec(databaseUri, updateSql)
} catch (e) {
  console.error('UPDATE failed:', e.message)
  process.exit(1)
}

console.log('Admin password reset for:', email)
console.log('You can log in with that email and the password from RESET_ADMIN_PASSWORD (or the default in this script header).')
