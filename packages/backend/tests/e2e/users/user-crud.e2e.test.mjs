#!/usr/bin/env node
/**
 * E2E: Users — registration, profile, admin operations.
 *
 * Requires: running server, ADMIN_TOKEN env.
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()

const ADMIN_TOKEN = process.env.ADMIN_TOKEN
const ts = Date.now()
const AUTH_REQUIRED = (process.env.AUTH_REQUIRED_IDENTIFIER || 'either').toLowerCase()

async function run() {
  if (!ADMIN_TOKEN) { skip('All user tests', 'ADMIN_TOKEN not set'); printSummary('Users CRUD'); return }

  // ─── Register a new customer ──────────────────────────────────────────────
  logStep('Register new customer')
  const email = `e2e-user-${ts}@test.local`
  const phone = `+1555${String(1000000000 + Math.floor(Math.random() * 8999999999))}`
  const registerBody = { email, password: 'TestUser1234!' }
  if (AUTH_REQUIRED === 'phone') {
    registerBody.phone = phone
  }
  const { status: regStatus, json: regJson } = await request('/users', {
    method: 'POST',
    body: registerBody,
  })
  if (regStatus === 201 || regStatus === 200) {
    ok('Register customer', `id=${regJson?.doc?.id}`)
  } else {
    fail('Register customer', `status=${regStatus}`)
    printSummary('Users CRUD')
    process.exit(1)
  }
  const userId = regJson?.doc?.id

  // ─── Verify the customer (to pass verification gate if enabled) ─────────
  await request(`/users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { emailVerified: true },
  })

  // ─── Login as the new customer ────────────────────────────────────────────
  logStep('Login as customer')
  const { status: loginStatus, json: loginJson, text: loginText } = await request('/auth/login', {
    method: 'POST',
    body: { identifier: AUTH_REQUIRED === 'phone' ? phone : email, password: 'TestUser1234!' },
  })
  
  // Handle verification gate (user might still not be verified)
  const isVerificationGate = loginStatus === 403 && loginText?.includes('not verified')
  
  if (loginStatus === 200 && loginJson?.token) {
    ok('Login customer')
  } else if (isVerificationGate) {
    skip('Login customer', 'verification gate active')
  } else {
    fail('Login customer', `status=${loginStatus}`)
  }
  const custToken = loginJson?.token

  // ─── Read own profile ─────────────────────────────────────────────────────
  logStep('Read own profile')
  if (custToken) {
    const { status: meStatus, json: meJson } = await request(`/users/${userId}`, {
      headers: { Authorization: `JWT ${custToken}` },
    })
    if (meStatus === 200 && meJson?.email === email) {
      ok('Read own profile')
    } else {
      fail('Read own profile', `status=${meStatus}`)
    }
  } else {
    skip('Read own profile', 'no token')
  }

  // ─── Update own profile ───────────────────────────────────────────────────
  logStep('Update own profile')
  if (custToken) {
    const { status: updStatus } = await request(`/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `JWT ${custToken}` },
      body: { firstName: 'E2EFirst', lastName: 'E2ELast' },
    })
    if (updStatus === 200) {
      ok('Update own profile')
    } else {
      fail('Update own profile', `status=${updStatus}`)
    }
  } else {
    skip('Update own profile', 'no token')
  }

  // ─── Customer cannot change own role ──────────────────────────────────────
  logStep('Customer cannot change own role')
  if (custToken) {
    const { status: roleStatus, json: roleJson } = await request(`/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `JWT ${custToken}` },
      body: { role: 'admin' },
    })
    const stillCustomer = roleJson?.doc?.role === 'customer'
    if (roleStatus === 200 && stillCustomer) {
      ok('Customer cannot escalate role')
    } else if (roleStatus === 403 || roleStatus === 400) {
      ok('Customer cannot escalate role', 'blocked by API')
    } else {
      fail('Customer cannot escalate role', `status=${roleStatus} role=${roleJson?.doc?.role}`)
    }
  } else {
    skip('Customer cannot escalate role', 'no token')
  }

  // ─── Admin can read any user ──────────────────────────────────────────────
  logStep('Admin reads user')
  const { status: adminReadStatus, json: adminReadJson } = await request(`/users/${userId}`, {
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
  })
  if (adminReadStatus === 200 && adminReadJson?.email === email) {
    ok('Admin reads user')
  } else {
    fail('Admin reads user', `status=${adminReadStatus}`)
  }

  // ─── Admin can update user status ─────────────────────────────────────────
  logStep('Admin updates user status')
  const { status: suspStatus, json: suspJson } = await request(`/users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { status: 'suspended' },
  })
  if (suspStatus === 200 && suspJson?.doc?.status === 'suspended') {
    ok('Admin updates user status')
  } else {
    fail('Admin updates user status', `status=${suspStatus}`)
  }

  // ─── Customer cannot read other users ─────────────────────────────────────
  logStep('Customer cannot read other user')
  if (custToken) {
    const { status: listStatus, json: listJson } = await request('/users', {
      headers: { Authorization: `JWT ${custToken}` },
    })
    const onlySelf = listJson?.docs?.length <= 1
    if (listStatus === 200 && onlySelf) {
      ok('Customer sees only self in list')
    } else {
      fail('Customer sees only self in list', `count=${listJson?.docs?.length}`)
    }
  } else {
    skip('Customer sees only self in list', 'no token')
  }

  // ─── Customer cannot delete users ─────────────────────────────────────────
  logStep('Customer cannot delete user')
  if (custToken) {
    const { status: delStatus } = await request(`/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `JWT ${custToken}` },
    })
    if (delStatus === 403 || delStatus === 401) {
      ok('Customer cannot delete user')
    } else {
      fail('Customer cannot delete user', `status=${delStatus}`)
    }
  } else {
    skip('Customer cannot delete user', 'no token')
  }

  // ─── Cleanup: admin deletes test user ─────────────────────────────────────
  logStep('Cleanup: admin deletes test user')
  const { status: cleanStatus } = await request(`/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
  })
  if (cleanStatus === 200) {
    ok('Cleanup test user')
  } else {
    fail('Cleanup test user', `status=${cleanStatus}`)
  }

  const failures = printSummary('Users CRUD')
  if (failures > 0) process.exit(1)
}

run().catch((err) => { console.error('Users CRUD failed:', err); process.exit(1) })
