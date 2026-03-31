#!/usr/bin/env node
/**
 * Seed minimum test data required by E2E suites.
 *
 * What it does:
 *   1. Waits for the server to be ready
 *   2. Creates admin user (via Payload's first-register or login)
 *   3. Creates a published product (required by guest checkout tests)
 *   4. Writes credentials to stdout as KEY=VALUE (consumed by test orchestrator)
 *
 * Usage:
 *   node tests/_helpers/seed-test-data.mjs
 *
 * Required ENV:
 *   TEST_ADMIN_EMAIL    (default: admin@test.local)
 *   TEST_ADMIN_PASSWORD (default: AdminTest1234!)
 *   BASE_URL            (default: http://localhost:3000)
 *
 * Outputs to stdout (parseable):
 *   ADMIN_TOKEN=<jwt>
 *   TEST_PRODUCT_ID=<id>
 *   TEST_ADMIN_EMAIL=<email>
 */

import { waitForServer } from './wait-for-server.mjs'
import { TestDataManager } from './test-data-manager.mjs'

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.local'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminTest1234!'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

async function main() {
  await waitForServer({ baseUrl: BASE_URL })

  const dm = new TestDataManager({
    verbose: process.env.VERBOSE === 'true',
  })

  console.log('Bootstrapping admin user...')
  const admin = await dm.bootstrapAdmin({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  console.log(`Admin ready (created=${admin.created})`)

  console.log('Creating test product...')
  const product = await dm.createProduct({
    name: 'E2E Test Product',
    basePrice: 99,
    currency: 'USD',
    status: 'published',
  })
  console.log(`Product created: ${product.id}`)

  console.log('')
  console.log('--- TEST CREDENTIALS ---')
  console.log(`ADMIN_TOKEN=${admin.token}`)
  console.log(`TEST_PRODUCT_ID=${product.id}`)
  console.log(`TEST_ADMIN_EMAIL=${ADMIN_EMAIL}`)
  console.log('--- END CREDENTIALS ---')
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err)
  process.exit(1)
})
