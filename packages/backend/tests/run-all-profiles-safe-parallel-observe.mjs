#!/usr/bin/env node
/**
 * Parallel safe matrix runner for all E2E ENV profiles.
 *
 * Runs profiles concurrently using distinct `E2E_PARALLEL_SLOT` values so:
 * - Docker Compose project name + host ports do not collide
 * - backend server starts on a slot-specific port
 *
 * By default, runs ALL profiles in parallel (max-parallel = profileCount).
 *
 * Usage:
 *   node tests/run-all-profiles-safe-parallel-observe.mjs
 *   node tests/run-all-profiles-safe-parallel-observe.mjs --quick
 *   node tests/run-all-profiles-safe-parallel-observe.mjs --profiles=default,phone-only
 *   node tests/run-all-profiles-safe-parallel-observe.mjs --max-parallel=4 --slot-start=4  # matches yarn test:all-profiles:safe:parallel:observe
 *   node tests/run-all-profiles-safe-parallel-observe.mjs --max-parallel=4 --slot-start=0  # CI / clean machine
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const profileDir = path.join(backendRoot, 'tests', 'env-profiles')
const logsDir = path.join(backendRoot, 'tests', 'logs')
fs.mkdirSync(logsDir, { recursive: true })

function parseProfilesArg(allProfiles, args) {
  const matches = args.filter((a) => a.startsWith('--profiles='))
  const profilesArg = matches[matches.length - 1]
  if (!profilesArg) return allProfiles
  return profilesArg
    .replace('--profiles=', '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

/** Last `--name=value` wins so `yarn script -- --max-parallel=1` overrides package.json defaults. */
function parseNumberArg(args, name, fallback) {
  const matches = args.filter((a) => a.startsWith(`${name}=`))
  const v = matches[matches.length - 1]
  if (!v) return fallback
  const parsed = Number(v.split('=')[1])
  return Number.isFinite(parsed) ? parsed : fallback
}

function resolveProfilesToRun() {
  const args = process.argv.slice(2)
  const quickMode = args.includes('--quick')

  const allProfiles = fs
    .readdirSync(profileDir)
    .filter((f) => f.startsWith('.env.test'))
    .map((f) => (f === '.env.test' ? 'default' : f.replace('.env.test.', '')))
    .sort()

  if (quickMode) return ['default', 'multivendor', 'gates-on']
  return parseProfilesArg(allProfiles, args)
}

const profilesToRun = resolveProfilesToRun()
const args = process.argv.slice(2)
const maxParallel = parseNumberArg(args, '--max-parallel', profilesToRun.length)
const slotStart = parseNumberArg(args, '--slot-start', 0)
const queryableTimeoutMs = (() => {
  const env = process.env.E2E_QUERYABLE_TIMEOUT_MS
  const parsed = env ? Number(env) : NaN
  if (Number.isFinite(parsed)) return parsed
  // Parallel infra + Next boot can be slow on constrained machines.
  // Use a larger readiness timeout so we don't fail just due to contention.
  return maxParallel >= 8 ? 360_000 : 180_000
})()

const nodeOptions = (() => {
  const existing = process.env.NODE_OPTIONS?.trim()
  // Running many Next dev servers concurrently can exceed Node's default heap, but a
  // fixed 8192 MB × maxParallel processes often exhausts Windows virtual memory
  // (ENOMEM / VirtualAlloc failures). Scale the cap down as parallelism rises.
  const heapMb = Math.min(4096, Math.max(1024, Math.floor(12000 / Math.max(1, maxParallel))))
  const extra = `--max-old-space-size=${heapMb}`
  if (!existing) return extra
  if (existing.includes('--max-old-space-size=')) return existing
  return `${existing} ${extra}`
})()

function prefixChunk(prefix, text) {
  // Avoid regex here; just duplicate lines with a prefix.
  return prefix + text.replace(/\n/g, `\n${prefix}`)
}

const liveChildren = new Set()
function terminateChildren(reason) {
  // Best-effort shutdown for all running child processes.
  console.error(`[matrix-runner] stopping children (${reason})`)
  for (const child of liveChildren) {
    try {
      if (process.platform === 'win32') {
        spawn('cmd', ['/c', `taskkill /PID ${child.pid} /T /F`], { stdio: 'ignore' })
      } else {
        child.kill('SIGTERM')
      }
    } catch {
      // ignore
    }
  }
}

process.on('SIGINT', () => {
  terminateChildren('SIGINT')
  process.exit(130)
})
process.on('SIGTERM', () => {
  terminateChildren('SIGTERM')
  process.exit(143)
})

function runProfile(profile, slot, { postgresPort, redisPort, backendPort }) {
  const ts = new Date()
  const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(
    ts.getHours(),
  ).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`
  const logPath = path.join(logsDir, `e2e-matrix-${profile}-slot${slot}-${stamp}.log`)

  const stream = fs.createWriteStream(logPath, { flags: 'a' })

  const prefix = `[${profile} slot-${slot}] `
  const child = spawn(process.execPath, ['tests/run-e2e-safe.mjs', ...(profile !== 'default' ? ['--profile', profile] : [])], {
    cwd: backendRoot,
    env: {
      ...process.env,
      E2E_PARALLEL_SLOT: String(slot),
      E2E_QUERYABLE_TIMEOUT_MS: String(queryableTimeoutMs),
      TEST_POSTGRES_PORT: String(postgresPort),
      TEST_REDIS_PORT: String(redisPort),
      TEST_BACKEND_PORT: String(backendPort),
      NODE_OPTIONS: nodeOptions,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  liveChildren.add(child)

  let recent = ''
  const maxRecent = 300_000

  child.stdout.on('data', (chunk) => {
    const s = chunk.toString()
    process.stdout.write(prefixChunk(prefix, s))
    stream.write(chunk)
    recent = (recent + s).slice(-maxRecent)
  })

  child.stderr.on('data', (chunk) => {
    const s = chunk.toString()
    process.stderr.write(prefixChunk(prefix, s))
    stream.write(chunk)
    recent = (recent + s).slice(-maxRecent)
  })

  stream.write(`\n[matrix-runner] start profile=${profile} slot=${slot} log=${path.basename(logPath)}\n`)
  console.log(`[matrix-runner] ${profile} slot=${slot} -> ${path.relative(backendRoot, logPath)}`)

  return new Promise((resolve) => {
    child.on('close', (code) => {
      liveChildren.delete(child)
      stream.write(`\n[matrix-runner] end profile=${profile} slot=${slot} exitCode=${code}\n`)
      stream.end()

      const m = recent.match(/E2E RESULT: (\d+)\/(\d+) suites passed/)
      const passed = m ? Number(m[1]) : 0
      const total = m ? Number(m[2]) : 0

      resolve({
        profile,
        slot,
        exitCode: code ?? 1,
        passed,
        total,
        success: (code ?? 1) === 0 && total > 0 && passed === total,
        logPath,
      })
    })
  })
}

const jobs = profilesToRun.map((profile, idx) => ({
  profile,
  slot: slotStart + idx,
}))

function preCleanDockerTestInfra() {
  // Best-effort: leftover containers from earlier aborted runs can keep ports occupied.
  // We only target test infra containers that match the `bscommerce-e2e` prefix.
  try {
    const idsOut = spawnSync('docker', ['ps', '-aq', '--filter', 'name=bscommerce-e2e'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const ids = (idsOut.stdout || '')
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (ids.length > 0) {
      spawnSync('docker', ['rm', '-f', ...ids], {
        encoding: 'utf8',
        stdio: 'ignore',
      })
    }

    const netIdsOut = spawnSync('docker', ['network', 'ls', '-q', '--filter', 'name=bscommerce-e2e'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const netIds = (netIdsOut.stdout || '')
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (netIds.length > 0) {
      // Ignore failures if networks are still in use.
      spawnSync('docker', ['network', 'rm', ...netIds], { stdio: 'ignore' })
    }
  } catch {
    // ignore; test run will still report any issues
  }
}

async function isPortFree(port) {
  // Check TCP availability on localhost.
  // Docker's port bindings will still block this.
  return await new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') resolve(false)
      else resolve(false)
    })
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true))
    })
  })
}

async function findFreePort(startPort, usedPorts) {
  let p = startPort
  while (true) {
    if (!usedPorts.has(p) && (await isPortFree(p))) {
      usedPorts.add(p)
      return p
    }
    p += 1
  }
}

async function allocatePortsForAllJobs() {
  const usedPostgres = new Set()
  const usedRedis = new Set()
  const usedBackend = new Set()

  // Allocate sequentially so two jobs never pass `isPortFree` for the same port
  // before either calls `usedPorts.add` (Promise.all caused duplicate Redis ports).
  const assignments = []
  for (const job of jobs) {
    const postgresStart = 5433 + job.slot
    const redisStart = 6380 + job.slot
    const backendStart = 3000 + job.slot

    const postgresPort = await findFreePort(postgresStart, usedPostgres)
    const redisPort = await findFreePort(redisStart, usedRedis)
    const backendPort = await findFreePort(backendStart, usedBackend)

    assignments.push({
      ...job,
      postgresPort,
      redisPort,
      backendPort,
    })
  }

  return assignments
}

preCleanDockerTestInfra()
const jobsWithPorts = await allocatePortsForAllJobs()

let nextIndex = 0
let running = 0
const results = new Array(jobsWithPorts.length)

function startMore(resolveAll) {
  while (running < maxParallel && nextIndex < jobsWithPorts.length) {
    const idx = nextIndex++
    const job = jobsWithPorts[idx]
    running++
    runProfile(job.profile, job.slot, { postgresPort: job.postgresPort, redisPort: job.redisPort, backendPort: job.backendPort })
      .then((r) => {
        results[idx] = r
      })
      .finally(() => {
        running--
        startMore(resolveAll)
      })
  }

  if (nextIndex >= jobs.length && running === 0) {
    resolveAll(results)
  }
}

console.log('='.repeat(72))
console.log('Parallel Safe E2E Matrix Runner')
console.log('='.repeat(72))
console.log(`Profiles: ${profilesToRun.join(', ')}`)
console.log(`Total: ${profilesToRun.length} | max-parallel=${maxParallel} | slot-start=${slotStart}\n`)

const finalResults = await new Promise((resolveAll) => startMore(resolveAll))

let totalPassed = 0
let totalSuites = 0
let anyFail = false

console.log('\n' + '='.repeat(72))
console.log('Final Summary')
console.log('='.repeat(72))
console.log('\n| Profile | Slot | Passed | Total | Status |')
console.log('|---------|------|--------|-------|--------|')

for (const r of finalResults) {
  totalPassed += r.passed
  totalSuites += r.total
  const status = r.success ? 'PASS' : 'FAIL'
  anyFail = anyFail || !r.success
  const failHint =
    !r.success && r.total === 0
      ? ` (exit ${r.exitCode}; no E2E RESULT in tail — see ${path.relative(backendRoot, r.logPath)})`
      : ''
  console.log(
    `| ${r.profile.padEnd(12)} | ${String(r.slot).padStart(4)} | ${String(r.passed).padStart(6)} | ${String(r.total).padStart(5)} | ${status.padEnd(6)} |${failHint}`,
  )
}

console.log('|---------|------|--------|-------|--------|')
console.log(`| TOTAL   |      | ${String(totalPassed).padStart(6)} | ${String(totalSuites).padStart(5)} | ${anyFail ? 'FAIL' : 'PASS'} |`)

if (anyFail) {
  process.exit(1)
}

console.log('\nAll safe profile runs passed.')

