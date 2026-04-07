#!/usr/bin/env node
/**
 * E2E test orchestrator — fully automated, zero manual data entry.
 *
 * Flow:
 *   1. Load ENV profile (if --profile specified)
 *   2. Wait for backend server to be healthy
 *   3. Seed admin user + test product via API
 *   4. Run all E2E test suites with seeded credentials
 *   5. Clean up test data
 *   6. Exit with combined pass/fail code
 *
 * Prerequisites:
 *   - Backend server running (yarn dev, or started by CI)
 *   - Postgres + Redis accessible (docker-compose.test.yml or dev services)
 *
 * Usage:
 *   node tests/run-e2e.mjs                                 # run all E2E (default profile)
 *   node tests/run-e2e.mjs --suite verification             # run verification only
 *   node tests/run-e2e.mjs --suite guest                    # run guest checkout only
 *   node tests/run-e2e.mjs --profile multivendor            # run with multivendor profile
 *   node tests/run-e2e.mjs --profile gates-on --suite auth  # combine profile + suite
 *   RUN_RATE_LIMIT=true node tests/run-e2e.mjs              # include rate-limit checks
 *
 * Profiles (tests/env-profiles/.env.test.<name>):
 *   default          — single-vendor, link strategy, no gates
 *   multivendor      — MULTIVENDOR_ENABLED=true
 *   verification-otp — EMAIL_VERIFICATION_STRATEGY=otp
 *   gates-on         — AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN=true, REQUIRE_VERIFIED_FOR_CHECKOUT=true
 *   guest-enabled    — GUEST_CHECKOUT_ENABLED=true
 *   mv-guest         — MULTIVENDOR_ENABLED=true, GUEST_CHECKOUT_ENABLED=true
 *   all-gates        — All gates ON, MV=true, OTP strategy
 *   phone-only       — AUTH_REQUIRED_IDENTIFIER=phone
 *
 * ENV overrides:
 *   BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_ADMIN_PHONE (when profile is phone-first), VERBOSE, RUN_RATE_LIMIT
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { waitForServer } from './_helpers/wait-for-server.mjs'
import { TestDataManager } from './_helpers/test-data-manager.mjs'

const profileArg = process.argv.find((a, i) => process.argv[i - 1] === '--profile') || ''
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 1) continue
    const key = trimmed.slice(0, eqIndex)
    const value = trimmed.slice(eqIndex + 1)
    // Keep explicit environment overrides (CI/shell) as highest priority.
    if (!(key in process.env)) process.env[key] = value
  }
  return true
}

// Profile directory: tests/env-profiles/
const profileDir = path.join(backendRoot, 'tests', 'env-profiles')

// Always load baseline test env by default for isolated, deterministic E2E.
loadEnvFile(path.join(profileDir, '.env.test'))

if (profileArg) {
  const envFile = path.join(profileDir, `.env.test.${profileArg}`)
  if (!fs.existsSync(envFile)) {
    console.error(`Profile file not found: ${envFile}`)
    // List available profiles dynamically
    const available = fs.readdirSync(profileDir)
      .filter(f => f.startsWith('.env.test.'))
      .map(f => f.replace('.env.test.', ''))
    console.error(`Available profiles: default, ${available.join(', ')}`)
    process.exit(1)
  }
  loadEnvFile(envFile)
  console.log(`Loaded ENV profile: ${profileArg}`)
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.local'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminTest1234!'
const ADMIN_PHONE = process.env.TEST_ADMIN_PHONE || '+15551234567'
const AUTH_REQUIRED = (process.env.AUTH_REQUIRED_IDENTIFIER || 'either').toLowerCase()
const LOGIN_IDENTIFIER = AUTH_REQUIRED === 'phone' ? ADMIN_PHONE : ADMIN_EMAIL
const VERBOSE = process.env.VERBOSE === 'true'

const suiteArg = process.argv.find((a, i) => process.argv[i - 1] === '--suite') || 'all'

function run(label, script, env) {
  console.log(`\n========== ${label} ==========`)
  try {
    const out = execSync(`node ${script}`, {
      stdio: 'pipe',
      encoding: 'utf8',
      env: { ...process.env, ...env },
      cwd: backendRoot,
    })
    if (out) process.stdout.write(out)
    return true
  } catch (err) {
    const text = `${err?.stdout || ''}${err?.stderr || ''}`
    if (text) process.stdout.write(text)
    // Node 24 on Windows intermittently throws UV_HANDLE_CLOSING after suite completion.
    // If the suite output does not show explicit test failures, treat this as a
    // non-blocking runtime quirk.
    const hasExplicitFailures = /Failed:\s*[1-9]\d*\b/.test(text) || /FAIL - /.test(text)
    if (text.includes('UV_HANDLE_CLOSING') && !hasExplicitFailures) {
      console.warn(`[run-e2e] Ignoring known Windows runtime assertion for suite: ${label}`)
      return true
    }
    return false
  }
}

async function main() {
  console.log(`E2E orchestrator | BASE_URL=${BASE_URL} | suite=${suiteArg} | profile=${profileArg || 'default'}`)

  await waitForServer({ baseUrl: BASE_URL })

  const dm = new TestDataManager({ verbose: VERBOSE })

  console.log('\n--- Seeding test data ---')
  const admin = await dm.bootstrapAdmin({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    phone: ADMIN_PHONE,
  })
  console.log(`Admin ready (created=${admin.created})`)

  const product = await dm.createProduct({
    name: 'E2E Test Product',
    basePrice: 99,
    currency: 'USD',
    status: 'published',
  })
  console.log(`Product seeded: ${product.id}`)

  const sharedEnv = {
    BASE_URL,
    ADMIN_TOKEN: admin.token,
    TEST_EMAIL: ADMIN_EMAIL,
    TEST_LOGIN_IDENTIFIER: LOGIN_IDENTIFIER,
    PRODUCT_ID: product.id,
    RUN_INTEGRATION_TESTS: 'true',
    RUN_SECURITY_TESTS: 'true',
  }

  const results = []

  if (suiteArg === 'all' || suiteArg === 'auth') {
    results.push(
      run('Auth login', 'tests/e2e/auth/auth-login.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'verification') {
    if (process.env.VERIFICATION_ENABLED === 'false') {
      console.log('Skipping verification suites: VERIFICATION_ENABLED=false')
    } else {
      results.push(
        run('Verification integration', 'tests/e2e/verification/verification-endpoints.e2e.test.mjs', sharedEnv),
        run('Verification security', 'tests/e2e/verification/verification-security.e2e.test.mjs', sharedEnv),
        run('Send verification', 'tests/e2e/verification/send-verification.e2e.test.mjs', sharedEnv),
        run('Verify phone', 'tests/e2e/verification/verify-phone.e2e.test.mjs', sharedEnv),
      )
    }
  }

  if (suiteArg === 'all' || suiteArg === 'guest' || suiteArg === 'checkout') {
    results.push(
      run('Guest checkout', 'tests/e2e/checkout/guest-checkout.e2e.test.mjs', sharedEnv),
      run('Authenticated checkout', 'tests/e2e/checkout/authenticated-checkout.e2e.test.mjs', sharedEnv),
      run('Checkout security', 'tests/e2e/checkout/checkout-security.e2e.test.mjs', sharedEnv),
      run('Multivendor inventory checkout', 'tests/e2e/checkout/multivendor-inventory-checkout.e2e.test.mjs', sharedEnv),
      run('Multivendor inventory lifecycle', 'tests/e2e/inventory/multivendor-inventory-lifecycle.e2e.test.mjs', sharedEnv),
      run('Inventory lifecycle', 'tests/e2e/inventory/inventory-lifecycle.e2e.test.mjs', sharedEnv),
      run('Inventory allocation & vendor reassign', 'tests/e2e/inventory/inventory-allocation-reassign.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'orders') {
    results.push(
      run('Order lifecycle', 'tests/e2e/orders/order-lifecycle.e2e.test.mjs', sharedEnv),
      run('Order access control', 'tests/e2e/orders/order-access.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'multivendor') {
    results.push(
      run('Vendor onboarding', 'tests/e2e/multivendor/vendor-onboarding.e2e.test.mjs', sharedEnv),
      run('Tenant isolation', 'tests/e2e/multivendor/tenant-isolation.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'discounts') {
    results.push(
      run('Coupon lifecycle', 'tests/e2e/discounts/coupon-lifecycle.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'reviews') {
    results.push(
      run('Product reviews', 'tests/e2e/reviews/product-reviews.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'users') {
    results.push(
      run('User CRUD', 'tests/e2e/users/user-crud.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'products') {
    results.push(
      run('Product CRUD', 'tests/e2e/products/product-crud.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'categories') {
    results.push(
      run('Category CRUD', 'tests/e2e/categories/category-crud.e2e.test.mjs', sharedEnv),
    )
  }

  if (suiteArg === 'all' || suiteArg === 'platform') {
    results.push(
      run('Platform settings', 'tests/e2e/platform/platform-settings.e2e.test.mjs', sharedEnv),
    )
  }

  console.log('\n--- Cleaning up test data ---')
  await dm.cleanup()

  const failed = results.filter((r) => !r).length
  const passed = results.length - failed
  console.log(`\n========== E2E RESULT: ${passed}/${results.length} suites passed ==========`)

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('E2E orchestrator failed:', err.message || err)
  process.exit(1)
})
