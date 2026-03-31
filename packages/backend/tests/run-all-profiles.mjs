#!/usr/bin/env node
/**
 * Run E2E tests with ALL profiles sequentially.
 * 
 * This script:
 * 1. Iterates through all available profiles
 * 2. Starts a server with each profile's ENV
 * 3. Runs the E2E suite
 * 4. Collects and summarizes results
 * 
 * Usage:
 *   node tests/run-all-profiles.mjs
 *   node tests/run-all-profiles.mjs --profiles default,multivendor
 *   node tests/run-all-profiles.mjs --quick  # only 3 core profiles
 */

import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const backendRoot = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const profileDir = path.join(backendRoot, 'tests', 'env-profiles')

// Get available profiles
const allProfiles = fs.readdirSync(profileDir)
  .filter(f => f.startsWith('.env.test'))
  .map(f => f === '.env.test' ? 'default' : f.replace('.env.test.', ''))
  .sort()

// Parse arguments
const args = process.argv.slice(2)
const quickMode = args.includes('--quick')
const profilesArg = args.find(a => a.startsWith('--profiles='))

let profilesToRun = allProfiles
if (quickMode) {
  profilesToRun = ['default', 'multivendor', 'gates-on']
} else if (profilesArg) {
  profilesToRun = profilesArg.replace('--profiles=', '').split(',')
}

console.log('=' .repeat(70))
console.log('E2E Test Runner - All Profiles')
console.log('=' .repeat(70))
console.log(`Profiles to run: ${profilesToRun.join(', ')}`)
console.log(`Total: ${profilesToRun.length} profiles\n`)

function loadEnvFile(filePath) {
  const env = {}
  if (!fs.existsSync(filePath)) return env
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 1) continue
    env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1)
  }
  return env
}

function killServer() {
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' })
    } else {
      execSync('pkill -f "next dev" 2>/dev/null || true', { stdio: 'ignore' })
    }
  } catch (e) {
    // Ignore errors
  }
}

async function waitForServer(baseUrl, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/users?limit=1`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      if (res.status < 500) return true
    } catch (e) {
      // Continue waiting
    }
    await new Promise(r => setTimeout(r, 2000))
  }
  return false
}

function startServer(env) {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('yarn', ['dev'], {
      cwd: backendRoot,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
    
    let started = false
    const timeout = setTimeout(() => {
      if (!started) {
        serverProcess.kill()
        reject(new Error('Server start timeout'))
      }
    }, 60000)
    
    serverProcess.stdout.on('data', (data) => {
      const text = data.toString()
      if (text.includes('Ready') || text.includes('started')) {
        started = true
        clearTimeout(timeout)
        resolve(serverProcess)
      }
    })
    
    serverProcess.on('error', reject)
  })
}

function runE2E(profile) {
  return new Promise((resolve) => {
    const env = { ...process.env }
    const e2eProcess = spawn('node', ['tests/run-e2e.mjs', '--profile', profile], {
      cwd: backendRoot,
      env,
      stdio: 'pipe',
      shell: true,
    })
    
    let output = ''
    e2eProcess.stdout.on('data', (data) => {
      output += data.toString()
      process.stdout.write(data)
    })
    e2eProcess.stderr.on('data', (data) => {
      output += data.toString()
      process.stderr.write(data)
    })
    
    e2eProcess.on('close', (code) => {
      // Extract summary
      const match = output.match(/E2E RESULT: (\d+)\/(\d+) suites passed/)
      const passed = match ? parseInt(match[1]) : 0
      const total = match ? parseInt(match[2]) : 0
      resolve({ code, passed, total, output })
    })
  })
}

async function runProfile(profile) {
  console.log('\n' + '='.repeat(70))
  console.log(`PROFILE: ${profile}`)
  console.log('='.repeat(70))
  
  // Load profile ENV
  const envFile = profile === 'default' 
    ? path.join(profileDir, '.env.test')
    : path.join(profileDir, `.env.test.${profile}`)
  
  const profileEnv = loadEnvFile(envFile)
  
  // Override with test database
  profileEnv.DATABASE_URI = 'postgresql://postgres:postgres@localhost:55433/bs_commerce_test'
  profileEnv.REDIS_URL = 'redis://localhost:56380'
  
  console.log(`Key settings: MV=${profileEnv.MULTIVENDOR_ENABLED || 'false'}, Guest=${profileEnv.GUEST_CHECKOUT_ENABLED || 'false'}, VerifyLogin=${profileEnv.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN || 'false'}`)
  
  // Kill existing server
  killServer()
  await new Promise(r => setTimeout(r, 2000))
  
  // Start server with profile ENV
  console.log('Starting server...')
  const serverProcess = spawn('yarn', ['dev'], {
    cwd: backendRoot,
    env: { ...process.env, ...profileEnv },
    stdio: 'ignore',
    shell: true,
    detached: true,
  })
  serverProcess.unref()
  
  // Wait for server
  const ready = await waitForServer('http://localhost:3000', 60000)
  if (!ready) {
    console.error('Server failed to start')
    return { profile, passed: 0, total: 0, error: 'Server timeout' }
  }
  console.log('Server ready!')
  
  // Run E2E
  const result = await runE2E(profile)
  
  return {
    profile,
    passed: result.passed,
    total: result.total,
    success: result.code === 0,
  }
}

async function main() {
  const results = []
  
  for (const profile of profilesToRun) {
    const result = await runProfile(profile)
    results.push(result)
  }
  
  // Kill server at the end
  killServer()
  
  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('FINAL SUMMARY')
  console.log('='.repeat(70))
  
  let totalPassed = 0
  let totalSuites = 0
  
  console.log('\n| Profile | Passed | Total | Status |')
  console.log('|---------|--------|-------|--------|')
  
  for (const r of results) {
    totalPassed += r.passed
    totalSuites += r.total
    const status = r.error ? '❌ Error' : (r.passed === r.total ? '✅ Pass' : '⚠️ Partial')
    console.log(`| ${r.profile.padEnd(20)} | ${String(r.passed).padStart(6)} | ${String(r.total).padStart(5)} | ${status} |`)
  }
  
  console.log('|---------|--------|-------|--------|')
  console.log(`| TOTAL | ${String(totalPassed).padStart(6)} | ${String(totalSuites).padStart(5)} | ${totalPassed}/${totalSuites} |`)
  
  const failedProfiles = results.filter(r => r.error || r.passed < r.total)
  if (failedProfiles.length > 0) {
    console.log('\nProfiles with issues:')
    for (const r of failedProfiles) {
      console.log(`  - ${r.profile}: ${r.error || `${r.passed}/${r.total}`}`)
    }
    process.exit(1)
  }
  
  console.log('\n✅ All profiles passed!')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
