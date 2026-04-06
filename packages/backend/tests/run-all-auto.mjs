#!/usr/bin/env node
/**
 * Fully automated local test pipeline:
 * 1) Bring up test infra (Postgres + Redis)
 * 2) Start backend server with test env
 * 3) Wait for server readiness
 * 4) Run typecheck + unit + e2e
 * 5) Always stop server and tear down infra
 */

import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { waitForServer } from './_helpers/wait-for-server.mjs'
import { resolveE2eInfraEnv } from './_helpers/e2e-infra-env.mjs'
import { findNextCliJs } from './_helpers/e2e-next-dev.mjs'

const backendRoot = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))

function yarnInvocation(args) {
  if (process.platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'yarn', ...args] }
  }
  return { command: 'yarn', args }
}

function runStep(name, args, extraEnv = {}) {
  console.log(`\n=== ${name} ===`)
  const invocation = yarnInvocation(args)
  const result = spawnSync(invocation.command, invocation.args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  })
  if (result.error) {
    throw new Error(`${name} failed to start: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`${name} failed with exit code ${result.status ?? 'unknown'}`)
  }
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.exitCode != null) return

  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', `taskkill /PID ${serverProcess.pid} /T /F`], { stdio: 'ignore' })
    return
  }

  serverProcess.kill('SIGTERM')
  await new Promise((resolve) => setTimeout(resolve, 1000))
  if (serverProcess.exitCode == null) serverProcess.kill('SIGKILL')
}

async function main() {
  const infra = resolveE2eInfraEnv()
  const composeShellEnv = { ...process.env, ...infra.composeEnv }
  let serverProcess
  const serverEnv = {
    ...process.env,
    DATABASE_URI: infra.databaseUri,
    REDIS_URL: infra.redisUrl,
    BASE_URL: infra.baseUrl,
    NEXT_PUBLIC_APP_URL: infra.baseUrl,
  }

  try {
    runStep('Infra up', ['test:infra:up'], composeShellEnv)

    console.log('\n=== Start backend server ===')
    const nextCli = findNextCliJs(backendRoot)
    if (!nextCli) {
      throw new Error('Could not find Next.js CLI (node_modules/next).')
    }
    serverProcess = spawn(process.execPath, [nextCli, 'dev', '-p', String(infra.backendPort)], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: serverEnv,
    })

    await waitForServer({ baseUrl: infra.baseUrl, timeoutMs: 90_000 })

    runStep('Typecheck', ['typecheck'])
    runStep('Unit tests', ['test:unit'])
    runStep('E2E tests', ['test:e2e'])

    console.log('\n✅ Automated test pipeline completed successfully.')
  } finally {
    await stopServer(serverProcess)
    try {
      runStep('Infra down', ['test:infra:down'], composeShellEnv)
    } catch (err) {
      console.error('⚠️ Failed to tear down infra cleanly:', err instanceof Error ? err.message : err)
    }
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
