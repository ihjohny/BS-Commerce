#!/usr/bin/env node
/**
 * Fully automated local test pipeline:
 * 1) Bring up test infra (Postgres + Redis)
 * 2) Start backend server with test env
 * 3) Wait for server readiness
 * 4) Run typecheck + unit + e2e
 * 5) Always stop server and tear down infra
 */

import { spawn, spawnSync } from 'node:child_process'
import { waitForServer } from './_helpers/wait-for-server.mjs'

const TEST_POSTGRES_PORT = process.env.TEST_POSTGRES_PORT || '5433'
const TEST_REDIS_PORT = process.env.TEST_REDIS_PORT || '6380'

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
  let serverProcess
  const serverEnv = {
    DATABASE_URI: `postgresql://postgres:postgres@localhost:${TEST_POSTGRES_PORT}/bs_commerce_test`,
    REDIS_URL: `redis://localhost:${TEST_REDIS_PORT}`,
  }

  try {
    runStep('Infra up', ['test:infra:up'])

    console.log('\n=== Start backend server ===')
    const invocation = yarnInvocation(['dev'])
    serverProcess = spawn(invocation.command, invocation.args, {
      stdio: 'inherit',
      env: { ...process.env, ...serverEnv },
    })

    await waitForServer({ baseUrl: 'http://localhost:3000', timeoutMs: 90_000 })

    runStep('Typecheck', ['typecheck'])
    runStep('Unit tests', ['test:unit'])
    runStep('E2E tests', ['test:e2e'])

    console.log('\n✅ Automated test pipeline completed successfully.')
  } finally {
    await stopServer(serverProcess)
    try {
      runStep('Infra down', ['test:infra:down'])
    } catch (err) {
      console.error('⚠️ Failed to tear down infra cleanly:', err instanceof Error ? err.message : err)
    }
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
