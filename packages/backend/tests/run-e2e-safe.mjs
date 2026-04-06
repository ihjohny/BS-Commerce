#!/usr/bin/env node
/**
 * Safe E2E orchestrator (default local flow):
 * 1) infra down -v (fresh Postgres + Redis state)
 * 2) force-free configured backend port (default 3000; see E2E_PARALLEL_SLOT)
 * 3) infra up
 * 4) start backend with merged env profile
 * 5) wait for DB-queryable readiness
 * 6) run existing run-e2e.mjs
 * 7) always stop backend + infra down
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { resolveE2eInfraEnv } from './_helpers/e2e-infra-env.mjs'
import { findNextCliJs } from './_helpers/e2e-next-dev.mjs'

const profileArg = process.argv.find((a, i) => process.argv[i - 1] === '--profile') || ''
const suiteArg = process.argv.find((a, i) => process.argv[i - 1] === '--suite') || ''
const keepInfra = process.argv.includes('--keep-infra')

const backendRoot = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const profileDir = path.join(backendRoot, 'tests', 'env-profiles')

function loadEnvFile(filePath) {
  const env = {}
  if (!fs.existsSync(filePath)) return env
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return env
}

function yarnInvocation(args) {
  if (process.platform === 'win32') return { command: 'cmd', args: ['/c', 'yarn', ...args] }
  return { command: 'yarn', args }
}

function runStep(name, args, env = process.env, stdio = 'inherit') {
  console.log(`\n=== ${name} ===`)
  const invocation = yarnInvocation(args)
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: backendRoot,
    stdio,
    env,
  })
  if (result.error) throw new Error(`${name} failed to start: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`${name} failed with exit code ${result.status ?? 'unknown'}`)
}

function sleepSyncMs(ms) {
  if (ms <= 0) return
  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', `timeout /t ${Math.ceil(ms / 1000)} /nobreak >nul`], { stdio: 'ignore' })
  } else {
    spawnSync('sleep', [`${Math.ceil(ms / 1000)}`], { stdio: 'ignore' })
  }
}

function runStepWithRetry(name, args, env, attempts = 3, delayMs = 2000) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      runStep(name, args, env)
      return
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) {
        console.warn(`[run-e2e-safe] ${name} retry ${i + 2}/${attempts} after ${delayMs}ms…`)
        sleepSyncMs(delayMs)
      }
    }
  }
  throw lastErr
}

function killPortListeners(port) {
  const portStr = String(port)
  if (process.platform === 'win32') {
    const result = spawnSync('cmd', ['/c', `netstat -ano | findstr :${portStr} | findstr LISTENING`], {
      cwd: backendRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    })
    const out = result.stdout || ''
    const pids = [...new Set(out.split(/\r?\n/).map((l) => l.trim().split(/\s+/).pop()).filter(Boolean))]
    for (const pid of pids) {
      spawnSync('cmd', ['/c', `taskkill /F /T /PID ${pid}`], { stdio: 'ignore' })
    }
    return
  }

  spawnSync('bash', ['-lc', `lsof -ti :${portStr} | xargs -r kill -9`], { stdio: 'ignore' })
}

async function waitForQueryable(baseUrl, server, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  let stable = 0

  while (Date.now() < deadline) {
    if (server && server.exitCode != null) {
      throw new Error(`Backend process exited before readiness (exit=${server.exitCode})`)
    }
    try {
      const res = await fetch(`${baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'readiness@test.local', password: 'invalid' }),
        signal: AbortSignal.timeout(5000),
      })
      if (res.status < 500) {
        stable += 1
        if (stable >= 2) return
      } else {
        stable = 0
      }
    } catch {
      stable = 0
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error(`Server did not become DB-queryable within ${timeoutMs}ms`)
}

async function stopServer(server) {
  if (!server || server.exitCode != null) return

  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', `taskkill /F /T /PID ${server.pid}`], { stdio: 'ignore' })
    return
  }

  server.kill('SIGTERM')
  await new Promise((resolve) => setTimeout(resolve, 1000))
  if (server.exitCode == null) server.kill('SIGKILL')
}

async function main() {
  const infra = resolveE2eInfraEnv()
  const composeShellEnv = { ...process.env, ...infra.composeEnv }
  const canonicalTsconfigPath = path.join(backendRoot, 'tsconfig.json')
  // Isolate tsconfig per slot so parallel Next dev servers never rewrite the same file (Windows TS assertion).
  const slotTsconfigPath = path.join(backendRoot, `tsconfig.e2e-slot-${infra.slot}.json`)
  const canonicalTsconfigText = fs.existsSync(canonicalTsconfigPath) ? fs.readFileSync(canonicalTsconfigPath, 'utf8') : null
  let tsconfigSnapshot = null
  if (canonicalTsconfigText != null) {
    fs.writeFileSync(slotTsconfigPath, canonicalTsconfigText, 'utf8')
    tsconfigSnapshot = canonicalTsconfigText
  }

  const queryableTimeoutMsEnv = process.env.E2E_QUERYABLE_TIMEOUT_MS
  const queryableTimeoutMs = queryableTimeoutMsEnv && Number.isFinite(Number(queryableTimeoutMsEnv)) ? Number(queryableTimeoutMsEnv) : 120_000

  const baseEnv = loadEnvFile(path.join(profileDir, '.env.test'))
  const profileEnv = profileArg ? loadEnvFile(path.join(profileDir, `.env.test.${profileArg}`)) : {}
  const mergedProfileEnv = { ...baseEnv, ...profileEnv }
  mergedProfileEnv.DATABASE_URI = infra.databaseUri
  mergedProfileEnv.REDIS_URL = infra.redisUrl
  mergedProfileEnv.BASE_URL = infra.baseUrl
  mergedProfileEnv.NEXT_PUBLIC_APP_URL = infra.baseUrl

  const baseUrl = mergedProfileEnv.BASE_URL || infra.baseUrl
  const serverEnv = { ...process.env, ...mergedProfileEnv }
  // Next dev writes to `.next/` by default; parallel runs must not share build output.
  // Use `distDir` (configured in `next.config.mjs`) to isolate per E2E slot.
  serverEnv.NEXT_DIST_DIR = serverEnv.NEXT_DIST_DIR || `.next-e2e-slot-${infra.slot}`
  if (canonicalTsconfigText != null) {
    serverEnv.E2E_TSCONFIG_PATH = path.basename(slotTsconfigPath)
  }

  if (profileArg) console.log(`Using profile: ${profileArg}`)
  if (suiteArg) console.log(`Using suite: ${suiteArg}`)
  console.log(`Target base URL: ${baseUrl}`)
  console.log(
    `[infra] COMPOSE_PROJECT_NAME=${infra.composeProjectName} postgres=${infra.postgresPort} redis=${infra.redisPort} backend=${infra.backendPort} slot=${infra.slot}`,
  )

  let server
  try {
    runStep('Infra down (fresh reset)', ['test:infra:down'], composeShellEnv)
    killPortListeners(infra.backendPort)
    runStepWithRetry('Infra up', ['test:infra:up'], composeShellEnv)

    console.log('\n=== Start backend server ===')
    const nextCli = findNextCliJs(backendRoot)
    if (!nextCli) {
      throw new Error('Could not find Next.js CLI (node_modules/next). Install deps from the monorepo root.')
    }
    server = spawn(process.execPath, [nextCli, 'dev', '-p', String(infra.backendPort)], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: serverEnv,
    })

    await waitForQueryable(baseUrl, server, queryableTimeoutMs)

    console.log('\n=== Run E2E ===')
    const args = ['tests/run-e2e.mjs']
    if (profileArg) args.push('--profile', profileArg)
    if (suiteArg) args.push('--suite', suiteArg)
    const result = spawnSync('node', args, {
      cwd: backendRoot,
      stdio: 'inherit',
      env: serverEnv,
    })
    if (result.error) throw new Error(`E2E failed to start: ${result.error.message}`)
    if (result.status !== 0) throw new Error(`E2E failed with exit code ${result.status ?? 'unknown'}`)

    console.log('\n✅ Safe E2E flow completed successfully.')
  } finally {
    await stopServer(server)
    killPortListeners(infra.backendPort)
    if (tsconfigSnapshot != null) {
      try {
        const currentTsconfig = fs.existsSync(slotTsconfigPath) ? fs.readFileSync(slotTsconfigPath, 'utf8') : null
        if (currentTsconfig !== tsconfigSnapshot) {
          fs.writeFileSync(slotTsconfigPath, tsconfigSnapshot, 'utf8')
        }
      } catch (err) {
        console.error('⚠️ tsconfig restore warning:', err instanceof Error ? err.message : String(err))
      }
    }
    if (!keepInfra) {
      try {
        runStep('Infra down (final cleanup)', ['test:infra:down'], composeShellEnv)
      } catch (err) {
        console.error('⚠️ Infra teardown warning:', err instanceof Error ? err.message : String(err))
      }
    }
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

