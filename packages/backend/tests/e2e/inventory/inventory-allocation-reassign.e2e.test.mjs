#!/usr/bin/env node
/**
 * Phase 12 — Multi-warehouse allocation + vendor stock reassignment (live API).
 *
 * When MULTIVENDOR_ENABLED=false:
 *   - One product, two platform stock-locations / stock-levels with enough qty each.
 *   - Checkout must allocate the row with the lexicographically smaller stock-level id
 *     (same rule as allocate-stock-level.ts).
 *
 * When MULTIVENDOR_ENABLED=true:
 *   - Approve a vendor, admin seeds two tenant warehouses + stock-levels + published product.
 *   - Checkout: guest (if GUEST_CHECKOUT_ENABLED) or admin cart — assert deterministic pick (min stock-level id).
 *   - Vendor PATCH order-items/{id} { stockLevel: otherRowId }: reservation moves (transfer hook).
 *
 * Requires: RUN_INTEGRATION_TESTS=true, ADMIN_TOKEN, INVENTORY_ENABLED=true.
 * Skips with exit 0 when prerequisites missing.
 */

import crypto from 'node:crypto'
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const mv = process.env.MULTIVENDOR_ENABLED === 'true'
const inv = process.env.INVENTORY_ENABLED !== 'false'
const guestCheckout = process.env.GUEST_CHECKOUT_ENABLED !== 'false'
const AUTH_REQUIRED = (process.env.AUTH_REQUIRED_IDENTIFIER || 'either').toLowerCase()

const auth = ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function randomPhone() {
  return `+1555${String(1000000000 + Math.floor(Math.random() * 8999999999))}`
}

function selectOrString(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && 'value' in v && v.value != null) return String(v.value)
  return String(v)
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Vendor user may have username = phone (phone-first). Try auth/login + users/login like test-data-manager.
 */
async function vendorLoginToken(email, password, phone) {
  const attempts = []
  if (phone) {
    attempts.push(() =>
      request('/auth/login', { method: 'POST', body: { identifier: phone, password } }),
    )
  }
  attempts.push(() => request('/users/login', { method: 'POST', body: { email, password } }))
  attempts.push(() =>
    request('/auth/login', { method: 'POST', body: { identifier: email, password } }),
  )
  let last
  for (const run of attempts) {
    last = await run()
    if (last.status === 200 && last.json?.token) return last.json.token
  }
  const hint = last?.text?.slice(0, 200) ?? ''
  throw new Error(`vendor login failed (last status ${last?.status}) ${hint}`)
}

async function waitForVendorTenant(userId) {
  for (let i = 0; i < 20; i++) {
    const userGet = await request(`/users/${userId}?depth=1`, { headers: auth })
    if (userGet.status === 200) {
      const tenantRef = userGet.json?.tenant
      const tid = tenantRef && typeof tenantRef === 'object' ? tenantRef.id : tenantRef
      if (tid) return tid
    }
    await sleepMs(100)
  }
  return null
}

/** Lexicographically smaller stock-level id wins allocation when both can fulfill. */
function expectedStockLevelId(a, b) {
  return String(a).localeCompare(String(b)) <= 0 ? String(a) : String(b)
}

function otherStockLevelId(a, b) {
  return String(a).localeCompare(String(b)) <= 0 ? String(b) : String(a)
}

function stockLevelIdFromItem(doc) {
  const sl = doc?.stockLevel
  if (!sl) return null
  return typeof sl === 'object' ? sl.id : sl
}

async function getStockLevelDoc(id) {
  const r = await request(`/stock-levels/${id}`, { headers: auth })
  assert(r.status === 200, `stock-level get ${r.status}`)
  return r.json
}

const addr = {
  firstName: 'A',
  lastName: 'B',
  street1: '1 St',
  city: 'Test',
  country: 'US',
}

async function adminCheckout(productId, qty = 1) {
  const cart = await request('/carts', {
    method: 'POST',
    headers: { ...auth },
    body: { items: [{ product: productId, quantity: qty, unitPrice: 10 }] },
  })
  assert(cart.status === 200 || cart.status === 201, `cart ${cart.status}`)
  const cartId = cart.json?.doc?.id || cart.json?.id
  const co = await request('/checkout/process', {
    method: 'POST',
    headers: { ...auth },
    body: {
      cartId,
      shippingAddress: addr,
      billingAddress: addr,
      simulatePayment: true,
    },
  })
  assert(co.status === 200 || co.status === 201, `checkout ${co.status}: ${co.text?.slice(0, 250)}`)
  return co.json?.order?.id
}

async function getFirstOrderItem(orderId) {
  const oiRes = await request(`/order-items?where[order][equals]=${orderId}&limit=5&depth=1`, {
    headers: auth,
  })
  assert(oiRes.status === 200, `order-items ${oiRes.status}`)
  const docs = oiRes.json?.docs || []
  assert(docs.length >= 1, 'expected order-item')
  return docs[0]
}

async function testSingleVendorTwoWarehouses() {
  const suffix = `${Date.now()}-${crypto.randomInt(1000, 9999)}`
  logStep('SV: two platform warehouses — deterministic stock-level id')
  const loc1 = await request('/stock-locations', {
    method: 'POST',
    headers: auth,
    body: { name: `WH-A-${suffix}`, code: `WHA-${suffix}`, isActive: true },
  })
  const loc2 = await request('/stock-locations', {
    method: 'POST',
    headers: auth,
    body: { name: `WH-B-${suffix}`, code: `WHB-${suffix}`, isActive: true },
  })
  assert(loc1.status === 200 || loc1.status === 201, `loc1 ${loc1.status}`)
  assert(loc2.status === 200 || loc2.status === 201, `loc2 ${loc2.status}`)
  const locId1 = loc1.json?.doc?.id || loc1.json?.id
  const locId2 = loc2.json?.doc?.id || loc2.json?.id

  const pRes = await request('/products', {
    method: 'POST',
    headers: auth,
    body: {
      name: `E2E 2WH ${suffix}`,
      basePrice: 10,
      currency: 'USD',
      status: 'published',
    },
  })
  assert(pRes.status === 200 || pRes.status === 201, `product ${pRes.status}`)
  const productId = pRes.json?.doc?.id || pRes.json?.id

  const sl1 = await request('/stock-levels', {
    method: 'POST',
    headers: auth,
    body: { product: productId, location: locId1, quantity: 50, reservedQuantity: 0 },
  })
  const sl2 = await request('/stock-levels', {
    method: 'POST',
    headers: auth,
    body: { product: productId, location: locId2, quantity: 50, reservedQuantity: 0 },
  })
  assert(sl1.status === 200 || sl1.status === 201, `sl1 ${sl1.status}`)
  assert(sl2.status === 200 || sl2.status === 201, `sl2 ${sl2.status}`)
  const id1 = sl1.json?.doc?.id || sl1.json?.id
  const id2 = sl2.json?.doc?.id || sl2.json?.id
  const expected = expectedStockLevelId(id1, id2)

  const orderId = await adminCheckout(productId, 1)
  assert(orderId, 'order id')
  const item = await getFirstOrderItem(orderId)
  const picked = stockLevelIdFromItem(item)
  assert(picked === expected, `expected allocation ${expected}, got ${picked}`)
  ok('SV: checkout picked lexicographically first eligible stock-level')
}

/**
 * @param {{ useGuestCheckout: boolean }} opts
 */
async function testMultivendorPickAndVendorReassign(opts) {
  const { useGuestCheckout } = opts
  const suffix = `${Date.now()}-${crypto.randomInt(1000, 9999)}`
  logStep(
    useGuestCheckout
      ? 'MV: vendor + two warehouses + guest checkout + vendor reassign stockLevel'
      : 'MV: vendor + two warehouses + admin checkout + vendor reassign stockLevel (no guest)',
  )

  const vendorEmail = `e2e-reassign-${suffix}@test.local`
  const vendorPassword = 'VendorReassign1234!'
  const vendorPhone = AUTH_REQUIRED === 'phone' ? randomPhone() : null
  const applicantBody = {
    email: vendorEmail,
    password: vendorPassword,
    firstName: 'Re',
    lastName: 'Assign',
  }
  if (vendorPhone) applicantBody.phone = vendorPhone

  const uRes = await request('/users', { method: 'POST', body: applicantBody })
  assert(uRes.status === 200 || uRes.status === 201, `vendor user ${uRes.status}: ${uRes.text?.slice(0, 200)}`)
  const vendorUserId = uRes.json?.doc?.id || uRes.json?.id
  assert(vendorUserId, 'vendor user id')

  const verifyPatch = { emailVerified: true }
  if (vendorPhone) verifyPatch.phoneVerified = true
  const vPatch = await request(`/users/${vendorUserId}`, {
    method: 'PATCH',
    headers: auth,
    body: verifyPatch,
  })
  assert(vPatch.status === 200, `vendor user verify flags ${vPatch.status}`)

  const appRes = await request('/vendor-applications', {
    method: 'POST',
    headers: auth,
    body: {
      businessName: `E2E Reassign Co ${suffix}`,
      businessType: 'individual',
      applicant: vendorUserId,
    },
  })
  assert(appRes.status === 200 || appRes.status === 201, `application ${appRes.status}`)
  const appId = appRes.json?.doc?.id || appRes.json?.id
  assert(appId, 'application id')

  const appDoc = appRes.json?.doc || appRes.json
  const initialStatus = selectOrString(appDoc?.status)
  if (initialStatus !== 'approved') {
    const approve = await request(`/vendor-applications/${appId}`, {
      method: 'PATCH',
      headers: auth,
      body: { status: 'approved' },
    })
    assert(approve.status === 200, `approve ${approve.status}: ${approve.text?.slice(0, 200)}`)
  }

  const tenantId = await waitForVendorTenant(vendorUserId)
  assert(tenantId, 'vendor tenant id (after application approved; hook may be briefly async)')

  const pRes = await request('/products', {
    method: 'POST',
    headers: auth,
    body: {
      name: `E2E MV 2WH ${suffix}`,
      basePrice: 10,
      currency: 'USD',
      status: 'published',
      tenant: tenantId,
    },
  })
  assert(pRes.status === 200 || pRes.status === 201, `product ${pRes.status}`)
  const productId = pRes.json?.doc?.id || pRes.json?.id

  const loc1 = await request('/stock-locations', {
    method: 'POST',
    headers: auth,
    body: { name: `MV-W1-${suffix}`, code: `MVW1-${suffix}`, tenant: tenantId, isActive: true },
  })
  const loc2 = await request('/stock-locations', {
    method: 'POST',
    headers: auth,
    body: { name: `MV-W2-${suffix}`, code: `MVW2-${suffix}`, tenant: tenantId, isActive: true },
  })
  assert(loc1.status === 200 || loc1.status === 201, `mv loc1 ${loc1.status}`)
  assert(loc2.status === 200 || loc2.status === 201, `mv loc2 ${loc2.status}`)
  const locId1 = loc1.json?.doc?.id || loc1.json?.id
  const locId2 = loc2.json?.doc?.id || loc2.json?.id

  const sl1 = await request('/stock-levels', {
    method: 'POST',
    headers: auth,
    body: { product: productId, location: locId1, quantity: 50, reservedQuantity: 0 },
  })
  const sl2 = await request('/stock-levels', {
    method: 'POST',
    headers: auth,
    body: { product: productId, location: locId2, quantity: 50, reservedQuantity: 0 },
  })
  assert(sl1.status === 200 || sl1.status === 201, `mv sl1 ${sl1.status}`)
  assert(sl2.status === 200 || sl2.status === 201, `mv sl2 ${sl2.status}`)
  const stockId1 = sl1.json?.doc?.id || sl1.json?.id
  const stockId2 = sl2.json?.doc?.id || sl2.json?.id
  const expectedPick = expectedStockLevelId(stockId1, stockId2)
  const alternateId = otherStockLevelId(stockId1, stockId2)

  let orderId
  if (useGuestCheckout) {
    const guestId = crypto.randomUUID()
    const cartRes = await request('/carts', {
      method: 'POST',
      headers: { 'X-Guest-Id': guestId },
      body: { items: [{ product: productId, quantity: 1 }] },
    })
    assert(cartRes.status === 201, `guest cart ${cartRes.status}`)
    const cartId = cartRes.json?.doc?.id || cartRes.json?.id

    const coRes = await request('/checkout/process', {
      method: 'POST',
      headers: { 'X-Guest-Id': guestId },
      body: {
        cartId,
        guestEmail: `guest-${suffix}@example.com`,
        simulatePayment: true,
        shippingAddress: {
          firstName: 'G',
          lastName: 'uest',
          street1: '1 St',
          city: 'Dhaka',
          country: 'BD',
        },
        billingAddress: {
          firstName: 'G',
          lastName: 'uest',
          street1: '1 St',
          city: 'Dhaka',
          country: 'BD',
        },
      },
    })
    assert(coRes.status === 201, `guest checkout ${coRes.status}: ${coRes.text?.slice(0, 250)}`)
    orderId = coRes.json?.order?.id
  } else {
    orderId = await adminCheckout(productId, 1)
  }
  assert(orderId, 'order id')

  const item = await getFirstOrderItem(orderId)
  const itemId = item.id
  const picked = stockLevelIdFromItem(item)
  assert(picked === expectedPick, `expected pick ${expectedPick}, got ${picked}`)
  ok(
    useGuestCheckout
      ? 'MV: guest checkout picked lexicographically first eligible stock-level'
      : 'MV: admin checkout picked lexicographically first eligible stock-level',
  )

  const beforeFrom = await getStockLevelDoc(expectedPick)
  const beforeTo = await getStockLevelDoc(alternateId)
  const rFrom = Number(beforeFrom.reservedQuantity ?? 0)
  const rTo = Number(beforeTo.reservedQuantity ?? 0)
  assert(rFrom >= 1, `expected reservation on picked row >= 1, got ${rFrom}`)
  assert(rTo === 0, `expected no reservation on alternate row, got ${rTo}`)

  const vendorToken = await vendorLoginToken(vendorEmail, vendorPassword, vendorPhone)
  const vendorAuth = { Authorization: `Bearer ${vendorToken}` }

  const patchRes = await request(`/order-items/${itemId}`, {
    method: 'PATCH',
    headers: vendorAuth,
    body: { stockLevel: alternateId },
  })
  assert(patchRes.status === 200, `vendor patch stockLevel ${patchRes.status}: ${patchRes.text?.slice(0, 250)}`)

  const afterFrom = await getStockLevelDoc(expectedPick)
  const afterTo = await getStockLevelDoc(alternateId)
  const rFrom2 = Number(afterFrom.reservedQuantity ?? 0)
  const rTo2 = Number(afterTo.reservedQuantity ?? 0)
  assert(rFrom2 === rFrom - 1, `picked row reserved: expected ${rFrom - 1}, got ${rFrom2}`)
  assert(rTo2 === rTo + 1, `alternate row reserved: expected ${rTo + 1}, got ${rTo2}`)
  ok('MV: vendor PATCH stockLevel moved reservation to other warehouse')
}

async function main() {
  console.log('inventory-allocation-reassign E2E | MV=' + mv + ' | INV=' + inv + ' | guest=' + guestCheckout)

  if (!RUN || !ADMIN_TOKEN) {
    skip('allocation/reassign', 'requires RUN_INTEGRATION_TESTS, ADMIN_TOKEN')
    printSummary('Inventory allocation & vendor reassign E2E')
    process.exit(0)
  }

  if (!inv) {
    skip('allocation/reassign', 'INVENTORY_ENABLED=false')
    printSummary('Inventory allocation & vendor reassign E2E')
    process.exit(0)
  }

  const checkMv = await request('/vendor-applications?limit=0', { headers: auth })
  if (mv && checkMv.status === 404) {
    skip('allocation/reassign', 'MULTIVENDOR_ENABLED in env but vendor-applications missing')
    printSummary('Inventory allocation & vendor reassign E2E')
    process.exit(0)
  }

  try {
    if (!mv) {
      await testSingleVendorTwoWarehouses()
    } else {
      await testMultivendorPickAndVendorReassign({ useGuestCheckout: guestCheckout })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    fail('inventory allocation/reassign', msg)
    console.error(e)
    printSummary('Inventory allocation & vendor reassign E2E')
    process.exit(1)
  }

  const failed = printSummary('Inventory allocation & vendor reassign E2E')
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
