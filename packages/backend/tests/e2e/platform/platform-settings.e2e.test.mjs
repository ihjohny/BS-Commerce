#!/usr/bin/env node
/**
 * E2E: Platform Settings global — read/update, access control.
 *
 * Requires: running server, ADMIN_TOKEN env.
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()

const ADMIN_TOKEN = process.env.ADMIN_TOKEN

async function run() {
  if (!ADMIN_TOKEN) { skip('All platform settings tests', 'ADMIN_TOKEN not set'); printSummary('Platform Settings'); return }

  // ─── Unauthenticated cannot read ──────────────────────────────────────────
  logStep('Unauthenticated cannot read platform settings')
  const { status: anonReadStatus } = await request('/globals/platform-settings')
  if (anonReadStatus === 401 || anonReadStatus === 403) {
    ok('Unauthenticated cannot read platform settings')
  } else {
    fail('Unauthenticated cannot read platform settings', `status=${anonReadStatus}`)
  }

  // ─── Admin can read platform settings ─────────────────────────────────────
  logStep('Admin reads platform settings')
  const { status: readStatus, json: readJson } = await request('/globals/platform-settings', {
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
  })
  if (readStatus === 200 && readJson) {
    ok('Admin reads platform settings')
  } else {
    fail('Admin reads platform settings', `status=${readStatus}`)
  }

  const originalName = readJson?.platformName

  // ─── Admin can update platform settings ───────────────────────────────────
  logStep('Admin updates platformName')
  const newName = `E2E-Test-${Date.now()}`
  const { status: updStatus, json: updJson } = await request('/globals/platform-settings', {
    method: 'POST',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { platformName: newName },
  })
  let updateVerified = false
  if (updStatus === 200 || updStatus === 201) {
    const verify = await request('/globals/platform-settings', {
      headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    })
    const updatedName =
      verify.json?.platformName ??
      verify.json?.doc?.platformName ??
      updJson?.platformName ??
      updJson?.doc?.platformName
    updateVerified = updatedName === newName
  }
  if (updateVerified) ok('Admin updates platformName')
  else fail('Admin updates platformName', `status=${updStatus}`)

  // ─── Admin can update feature flags ───────────────────────────────────────
  logStep('Admin updates feature flags')
  const { status: flagStatus, json: flagJson } = await request('/globals/platform-settings', {
    method: 'POST',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { features: { guestCheckoutEnabled: true, reviewsEnabled: true } },
  })
  if (flagStatus === 200 || flagStatus === 201) {
    ok('Admin updates feature flags')
  } else {
    fail('Admin updates feature flags', `status=${flagStatus}`)
  }

  // ─── Admin can update currency settings ───────────────────────────────────
  logStep('Admin updates currency settings')
  const { status: curStatus } = await request('/globals/platform-settings', {
    method: 'POST',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { currency: { defaultCurrency: 'USD', usdToBdtRate: 115 } },
  })
  if (curStatus === 200 || curStatus === 201) {
    ok('Admin updates currency settings')
  } else {
    fail('Admin updates currency settings', `status=${curStatus}`)
  }

  // ─── Register a customer and try to read ──────────────────────────────────
  logStep('Customer can read platform settings')
  const custEmail = `e2e-ps-${Date.now()}@test.local`
  const { json: regJson } = await request('/users', {
    method: 'POST',
    body: { email: custEmail, password: 'CustPass1234!' },
  })
  const custId = regJson?.doc?.id
  const { json: loginJson } = await request('/auth/login', {
    method: 'POST',
    body: { identifier: custEmail, password: 'CustPass1234!' },
  })
  const custToken = loginJson?.token

  if (custToken) {
    const { status: custReadStatus, json: custReadJson } = await request('/globals/platform-settings', {
      headers: { Authorization: `JWT ${custToken}` },
    })
    if (custReadStatus === 200 && custReadJson) {
      ok('Customer can read platform settings')
    } else {
      fail('Customer can read platform settings', `status=${custReadStatus}`)
    }

    // ─── Customer cannot update platform settings ───────────────────────────
    logStep('Customer cannot update platform settings')
    const { status: custUpdStatus } = await request('/globals/platform-settings', {
      method: 'POST',
      headers: { Authorization: `JWT ${custToken}` },
      body: { platformName: 'Hacked' },
    })
    if (custUpdStatus === 403 || custUpdStatus === 401) {
      ok('Customer cannot update platform settings')
    } else {
      fail('Customer cannot update platform settings', `status=${custUpdStatus}`)
    }
  } else {
    skip('Customer can read platform settings', 'login failed')
    skip('Customer cannot update platform settings', 'login failed')
  }

  // ─── Restore original platformName ────────────────────────────────────────
  logStep('Restore original settings')
  if (originalName !== undefined) {
    await request('/globals/platform-settings', {
      method: 'POST',
      headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
      body: { platformName: originalName },
    })
  }
  ok('Restore original settings')

  // ─── Cleanup customer ─────────────────────────────────────────────────────
  if (custId) {
    await request(`/users/${custId}`, { method: 'DELETE', headers: { Authorization: `JWT ${ADMIN_TOKEN}` } })
  }

  const failures = printSummary('Platform Settings')
  if (failures > 0) process.exit(1)
}

run().catch((err) => { console.error('Platform Settings failed:', err); process.exit(1) })
