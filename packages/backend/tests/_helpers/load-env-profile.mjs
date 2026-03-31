/**
 * Load a .env.test.* profile file and apply its values to process.env.
 *
 * Values from the profile are only applied if the key is NOT already set in
 * process.env, preserving explicit overrides (e.g. from CI secrets).
 *
 * Profile files are located in: tests/env-profiles/
 *
 * @param {string} profileName  — Profile suffix (e.g. 'multivendor', 'gates-on')
 * @returns {Record<string, string>}  — The loaded key-value pairs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const profileDir = path.join(backendRoot, 'tests', 'env-profiles')

export function loadEnvProfile(profileName) {
  const envFile = path.join(profileDir, `.env.test.${profileName}`)
  if (!fs.existsSync(envFile)) {
    const available = getAvailableProfiles()
    throw new Error(`ENV profile not found: ${envFile}\nAvailable: ${available.join(', ')}`)
  }

  const loaded = {}
  const lines = fs.readFileSync(envFile, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 1) continue
    const key = trimmed.slice(0, eqIndex)
    const value = trimmed.slice(eqIndex + 1)
    loaded[key] = value
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
  return loaded
}

export function getAvailableProfiles() {
  if (!fs.existsSync(profileDir)) return ['default']
  return fs.readdirSync(profileDir)
    .filter(f => f.startsWith('.env.test'))
    .map(f => f === '.env.test' ? 'default' : f.replace('.env.test.', ''))
    .sort()
}
