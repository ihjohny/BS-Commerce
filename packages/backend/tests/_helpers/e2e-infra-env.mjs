/**
 * Resolves Docker Compose project name + host ports for E2E test infra.
 *
 * Why:
 * - Two concurrent `yarn test:infra:up` runs with the same COMPOSE_PROJECT_NAME
 *   race on container creation (name conflict).
 * - Two runs also race on host ports 5433/6380/3000 if not offset.
 *
 * Usage:
 * - Default (sequential): slot 0 → project `bscommerce-e2e`, ports 5433 / 6380 / 3000
 * - Parallel terminals: set E2E_PARALLEL_SLOT=1 and E2E_PARALLEL_SLOT=2 (offsets ports + project name)
 *
 * Overrides (all optional):
 * - COMPOSE_PROJECT_NAME
 * - TEST_POSTGRES_PORT, TEST_REDIS_PORT, TEST_BACKEND_PORT
 * - E2E_PARALLEL_SLOT (non-negative integer; 0 = default single-runner layout)
 */

import crypto from 'node:crypto'

function parsePort(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @returns {object} infra — includes composeEnv for yarn test:infra:* subprocesses
 */
export function resolveE2eInfraEnv() {
  const rawSlot = parseInt(process.env.E2E_PARALLEL_SLOT || '0', 10)
  const slot = Number.isFinite(rawSlot) && rawSlot >= 0 ? rawSlot : 0

  const postgresPort = parsePort('TEST_POSTGRES_PORT', 5433 + slot)
  const redisPort = parsePort('TEST_REDIS_PORT', 6380 + slot)
  const backendPort = parsePort('TEST_BACKEND_PORT', 3000 + slot)

  let composeProjectName = process.env.COMPOSE_PROJECT_NAME
  if (!composeProjectName) {
    if (slot > 0) {
      composeProjectName = `bscommerce-e2e-s${slot}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`
    } else if (process.env.E2E_UNIQUE_COMPOSE_PROJECT === 'true') {
      composeProjectName = `bscommerce-e2e-${process.pid}-${crypto.randomBytes(4).toString('hex')}`
    } else {
      composeProjectName = 'bscommerce-e2e'
    }
  }

  const databaseUri = `postgresql://postgres:postgres@localhost:${postgresPort}/bs_commerce_test`
  const redisUrl = `redis://localhost:${redisPort}`
  const baseUrl = `http://localhost:${backendPort}`

  const composeEnv = {
    COMPOSE_PROJECT_NAME: composeProjectName,
    TEST_POSTGRES_PORT: String(postgresPort),
    TEST_REDIS_PORT: String(redisPort),
  }

  return {
    slot,
    composeProjectName,
    postgresPort,
    redisPort,
    backendPort,
    databaseUri,
    redisUrl,
    baseUrl,
    composeEnv,
  }
}
