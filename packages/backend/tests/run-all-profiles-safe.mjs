#!/usr/bin/env node
/**
 * Safe matrix runner for all E2E ENV profiles.
 *
 * Uses run-e2e-safe.mjs for each profile, so every run gets:
 * - fresh infra reset
 * - port 3000 cleanup
 * - profile-aware backend startup
 * - deterministic teardown
 *
 * Usage:
 *   node tests/run-all-profiles-safe.mjs
 *   node tests/run-all-profiles-safe.mjs --quick
 *   node tests/run-all-profiles-safe.mjs --profiles=default,phone-only,phone-mv
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const backendRoot = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const profileDir = path.join(backendRoot, 'tests', 'env-profiles')

const allProfiles = fs
  .readdirSync(profileDir)
  .filter((f) => f.startsWith('.env.test'))
  .map((f) => (f === '.env.test' ? 'default' : f.replace('.env.test.', '')))
  .sort()

const args = process.argv.slice(2)
const quickMode = args.includes('--quick')
const profilesArg = args.find((a) => a.startsWith('--profiles='))

let profilesToRun = allProfiles
if (quickMode) {
  profilesToRun = ['default', 'multivendor', 'gates-on']
} else if (profilesArg) {
  profilesToRun = profilesArg
    .replace('--profiles=', '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

function runProfile(profile) {
  const cmdArgs = ['tests/run-e2e-safe.mjs']
  if (profile !== 'default') cmdArgs.push('--profile', profile)

  const result = spawnSync('node', cmdArgs, {
    cwd: backendRoot,
    stdio: 'pipe',
    encoding: 'utf8',
    env: process.env,
  })

  const output = `${result.stdout || ''}${result.stderr || ''}`
  process.stdout.write(output)

  const m = output.match(/E2E RESULT: (\d+)\/(\d+) suites passed/)
  const passed = m ? Number(m[1]) : 0
  const total = m ? Number(m[2]) : 0

  return {
    profile,
    code: result.status ?? 1,
    passed,
    total,
    success: (result.status ?? 1) === 0,
  }
}

console.log('='.repeat(72))
console.log('Safe E2E Matrix Runner')
console.log('='.repeat(72))
console.log(`Profiles: ${profilesToRun.join(', ')}`)
console.log(`Total: ${profilesToRun.length}\n`)

const results = []
for (const profile of profilesToRun) {
  console.log('\n' + '='.repeat(72))
  console.log(`Profile: ${profile}`)
  console.log('='.repeat(72))
  const r = runProfile(profile)
  results.push(r)
}

console.log('\n' + '='.repeat(72))
console.log('Final Summary')
console.log('='.repeat(72))
console.log('\n| Profile | Passed | Total | Status |')
console.log('|---------|--------|-------|--------|')

let totalPassed = 0
let totalSuites = 0
for (const r of results) {
  totalPassed += r.passed
  totalSuites += r.total
  const status = r.success && r.passed === r.total ? 'PASS' : 'FAIL'
  console.log(`| ${r.profile.padEnd(20)} | ${String(r.passed).padStart(6)} | ${String(r.total).padStart(5)} | ${status} |`)
}
console.log('|---------|--------|-------|--------|')
console.log(`| TOTAL | ${String(totalPassed).padStart(6)} | ${String(totalSuites).padStart(5)} | ${totalPassed}/${totalSuites} |`)

const hasFailure = results.some((r) => !(r.success && r.passed === r.total))
if (hasFailure) process.exit(1)

console.log('\nAll safe profile runs passed.')

