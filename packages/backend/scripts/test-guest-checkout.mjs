#!/usr/bin/env node
/**
 * Guest checkout E2E (backend API). Fully automated: picks the first published
 * product from GET /api/products unless PRODUCT_ID is set.
 *
 * Usage (from packages/backend): yarn test:guest
 * Optional: PRODUCT_ID=... RUN_RATE_LIMIT=true VERBOSE=true BASE_URL=...
 */

import crypto from 'node:crypto'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_BASE = `${BASE_URL.replace(/\/$/, '')}/api`
const RUN_RATE_LIMIT = process.env.RUN_RATE_LIMIT === 'true'
const VERBOSE = process.env.VERBOSE === 'true'
const AUTH_TOKEN = process.env.AUTH_TOKEN || null

const state = {
  guestId: crypto.randomUUID(),
  otherGuestId: crypto.randomUUID(),
  productId: null,
  orderNumber: null,
  orderId: null,
  authToken: null,
  authUserEmail: null,
}
const ipSegment = (crypto.randomInt(1, 250)).toString()
function ip(host) {
  return `10.10.${ipSegment}.${host}`
}

const summary = []

function logStep(name) {
  console.log(`\n[STEP] ${name}`)
}

function pass(name, detail = '') {
  summary.push({ name, ok: true, detail })
  console.log(`  PASS ${name}${detail ? ` - ${detail}` : ''}`)
}

function fail(name, detail = '') {
  summary.push({ name, ok: false, detail })
  console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`)
}

function skip(name, detail = '') {
  summary.push({ name, ok: true, skipped: true, detail })
  console.log(`  SKIP ${name}${detail ? ` - ${detail}` : ''}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const reqHeaders = { ...headers }
  let reqBody
  if (body !== undefined) {
    reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json'
    reqBody = typeof body === 'string' ? body : JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: reqBody,
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (VERBOSE) {
    console.log(`    ${method} ${path} -> ${res.status}`)
    if (text) console.log(`    body: ${text.slice(0, 500)}`)
  }

  return { res, status: res.status, json, text, headers: res.headers }
}

async function registerAndLoginCustomer() {
  const email = `pentest-${Date.now()}-${crypto.randomInt(1000, 9999)}@example.com`
  const password = 'Test1234!Secure'

  const created = await request('/users', {
    method: 'POST',
    body: {
      email,
      password,
      firstName: 'Pentest',
      lastName: 'User',
    },
  })
  if (![200, 201].includes(created.status)) {
    throw new Error(`Failed to create test user (${created.status}): ${created.text}`)
  }

  const login = await request('/auth/login', {
    method: 'POST',
    body: { identifier: email, password },
  })
  if (login.status !== 200 || !login.json?.token) {
    throw new Error(`Failed to login test user (${login.status}): ${login.text}`)
  }

  return { email, token: login.json.token }
}

function getDoc(payload) {
  if (!payload || typeof payload !== 'object') return null
  return payload.doc || payload.docs?.[0] || payload
}

/**
 * Uses PRODUCT_ID env if set; otherwise lists published products (public read).
 */
async function resolveProductId() {
  const explicit = process.env.PRODUCT_ID?.trim()
  if (explicit) return explicit

  const qs = new URLSearchParams()
  qs.set('limit', '25')
  qs.set('depth', '0')
  qs.set('where[status][equals]', 'published')

  let r
  try {
    r = await request(`/products?${qs.toString()}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Could not reach ${BASE_URL} (list products failed: ${msg}). Start the backend: yarn dev`,
    )
  }
  if (r.status !== 200) {
    throw new Error(
      `Failed to list products (${r.status}). Is the backend running at ${BASE_URL}? ${r.text?.slice(0, 200) ?? ''}`,
    )
  }
  const docs = r.json?.docs ?? []
  if (!docs.length) {
    throw new Error(
      'No published products found. Publish at least one product in Admin, or set PRODUCT_ID to a product id.',
    )
  }
  const id = docs[0]?.id
  if (id == null) throw new Error('Product list returned a doc without id')
  return String(id)
}

async function createCart(guestId, quantity = 1) {
  const result = await request('/carts', {
    method: 'POST',
    headers: { 'X-Guest-Id': guestId },
    body: {
      items: [{ product: state.productId, quantity }],
    },
  })

  if (result.status !== 201) return { ...result, cartId: null }
  const doc = getDoc(result.json)
  const cartId = doc?.id
  return { ...result, cartId }
}

async function checkoutAsGuest({ cartId, guestId, guestEmail, idempotencyKey, simulatePayment = true, forwardedFor }) {
  const headers = { 'X-Guest-Id': guestId }
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor
  const result = await request('/checkout/process', {
    method: 'POST',
    headers,
    body: {
      cartId,
      guestEmail,
      idempotencyKey,
      simulatePayment,
      shippingAddress: {
        firstName: 'Test',
        lastName: 'Guest',
        street1: '1 Main St',
        city: 'Dhaka',
        country: 'BD',
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'Guest',
        street1: '1 Main St',
        city: 'Dhaka',
        country: 'BD',
      },
    },
  })

  return result
}

async function testCartLifecycle() {
  logStep('B: Guest cart lifecycle')

  const created = await createCart(state.guestId, 2)
  assert(created.status === 201, `Expected 201 creating cart, got ${created.status}`)
  assert(created.cartId, 'Cart ID missing from create response')
  const cartId = created.cartId
  pass('B1 create cart', `cartId=${cartId}`)

  const ownRead = await request(`/carts/${cartId}`, {
    headers: { 'X-Guest-Id': state.guestId },
  })
  assert(ownRead.status === 200, `Expected 200 reading own cart, got ${ownRead.status}`)
  pass('B2 read own cart')

  const wrongRead = await request(`/carts/${cartId}`, {
    headers: { 'X-Guest-Id': state.otherGuestId },
  })
  assert([403, 404].includes(wrongRead.status), `Expected 403/404 reading with wrong guest, got ${wrongRead.status}`)
  pass('B3 wrong guest cannot read', `status=${wrongRead.status}`)

  const noHeaderRead = await request(`/carts/${cartId}`)
  assert([401, 403, 404].includes(noHeaderRead.status), `Expected 401/403/404 without header, got ${noHeaderRead.status}`)
  pass('B4 missing header cannot read', `status=${noHeaderRead.status}`)

  const patched = await request(`/carts/${cartId}`, {
    method: 'PATCH',
    headers: { 'X-Guest-Id': state.guestId },
    body: { items: [{ product: state.productId, quantity: 3 }] },
  })
  assert(patched.status === 200, `Expected 200 patching cart, got ${patched.status}`)
  pass('B5 update cart')

  const deleted = await request(`/carts/${cartId}`, {
    method: 'DELETE',
    headers: { 'X-Guest-Id': state.guestId },
  })
  assert(deleted.status === 200, `Expected 200 deleting cart, got ${deleted.status}`)
  pass('B6 delete cart')

  const createMissingHeader = await request('/carts', {
    method: 'POST',
    body: { items: [{ product: state.productId, quantity: 1 }] },
  })
  assert([400, 403].includes(createMissingHeader.status), `Expected 400/403 create without header, got ${createMissingHeader.status}`)
  pass('B7 create without header blocked', `status=${createMissingHeader.status}`)

  const createInvalidGuest = await request('/carts', {
    method: 'POST',
    headers: { 'X-Guest-Id': 'not-a-uuid' },
    body: { items: [{ product: state.productId, quantity: 1 }] },
  })
  assert([400, 403].includes(createInvalidGuest.status), `Expected 400/403 create invalid guest id, got ${createInvalidGuest.status}`)
  pass('B8 invalid guest id blocked', `status=${createInvalidGuest.status}`)
}

async function testCheckoutAndLookup() {
  logStep('C + D: Checkout and guest order lookup')

  const cart = await createCart(state.guestId, 1)
  assert(cart.status === 201 && cart.cartId, `Expected 201 creating checkout cart, got ${cart.status}`)

  const okCheckout = await checkoutAsGuest({
    cartId: cart.cartId,
    guestId: state.guestId,
    guestEmail: 'guest@example.com',
    forwardedFor: ip(1),
  })
  assert(okCheckout.status === 201, `Expected 201 successful guest checkout, got ${okCheckout.status}`)
  state.orderNumber = okCheckout.json?.order?.orderNumber || null
  state.orderId = okCheckout.json?.order?.id || null
  assert(state.orderNumber, 'Missing orderNumber from successful checkout')
  pass('C1 successful guest checkout', `orderNumber=${state.orderNumber}`)

  const cartMissing = await createCart(state.guestId, 1)
  assert(cartMissing.status === 201 && cartMissing.cartId, 'Failed creating cart for C2')
  const missingEmail = await request('/checkout/process', {
    method: 'POST',
    headers: { 'X-Guest-Id': state.guestId, 'x-forwarded-for': ip(2) },
    body: {
      cartId: cartMissing.cartId,
      shippingAddress: { firstName: 'T', lastName: 'G', street1: '1', city: 'D', country: 'BD' },
      billingAddress: { firstName: 'T', lastName: 'G', street1: '1', city: 'D', country: 'BD' },
    },
  })
  assert(missingEmail.status === 400, `Expected 400 missing guestEmail, got ${missingEmail.status}`)
  pass('C2 missing guestEmail blocked')

  const cartInvalid = await createCart(state.guestId, 1)
  assert(cartInvalid.status === 201 && cartInvalid.cartId, 'Failed creating cart for C3')
  const invalidEmail = await checkoutAsGuest({
    cartId: cartInvalid.cartId,
    guestId: state.guestId,
    guestEmail: 'not-an-email',
    simulatePayment: false,
    forwardedFor: ip(3),
  })
  assert(invalidEmail.status === 400, `Expected 400 invalid guestEmail, got ${invalidEmail.status}`)
  pass('C3 invalid guestEmail blocked')

  const cartMismatch = await createCart(state.guestId, 1)
  assert(cartMismatch.status === 201 && cartMismatch.cartId, 'Failed creating cart for C4')
  const mismatch = await checkoutAsGuest({
    cartId: cartMismatch.cartId,
    guestId: state.otherGuestId,
    guestEmail: 'guest@example.com',
    simulatePayment: false,
    forwardedFor: ip(4),
  })
  assert(mismatch.status === 403, `Expected 403 cart ownership mismatch, got ${mismatch.status}`)
  pass('C4 guest ownership enforced')

  const cartIdempotent = await createCart(state.guestId, 1)
  assert(cartIdempotent.status === 201 && cartIdempotent.cartId, 'Failed creating cart for C5')
  const key = crypto.randomUUID()
  const idempotentFirst = await checkoutAsGuest({
    cartId: cartIdempotent.cartId,
    guestId: state.guestId,
    guestEmail: 'guest@example.com',
    idempotencyKey: key,
    forwardedFor: ip(5),
  })
  assert(idempotentFirst.status === 201, `Expected 201 idempotent first checkout, got ${idempotentFirst.status}`)
  const firstOrderId = idempotentFirst.json?.order?.id

  const idempotentSecond = await checkoutAsGuest({
    cartId: cartIdempotent.cartId,
    guestId: state.guestId,
    guestEmail: 'guest@example.com',
    idempotencyKey: key,
    forwardedFor: ip(5),
  })
  assert(idempotentSecond.status === 201, `Expected 201 idempotent second checkout, got ${idempotentSecond.status}`)
  const secondOrderId = idempotentSecond.json?.order?.id
  assert(firstOrderId && secondOrderId && firstOrderId === secondOrderId, 'Idempotent retry did not return same order id')
  pass('C5 idempotency returns same order')

  const cartNorm = await createCart(state.guestId, 1)
  assert(cartNorm.status === 201 && cartNorm.cartId, 'Failed creating cart for C6')
  const normalizedEmail = '  Guest@Example.COM  '
  const normCheckout = await checkoutAsGuest({
    cartId: cartNorm.cartId,
    guestId: state.guestId,
    guestEmail: normalizedEmail,
    forwardedFor: ip(6),
  })
  assert(normCheckout.status === 201, `Expected 201 normalized email checkout, got ${normCheckout.status}`)
  const normOrderNumber = normCheckout.json?.order?.orderNumber
  assert(normOrderNumber, 'Missing orderNumber for normalized-email checkout')
  pass('C6 normalized guestEmail accepted')

  const lookupOk = await request('/guest/order-lookup', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip(201) },
    body: { orderNumber: state.orderNumber, guestEmail: 'guest@example.com' },
  })
  assert(lookupOk.status === 200, `Expected 200 lookup success, got ${lookupOk.status}`)
  pass('D1 lookup success')

  const lookupWrongEmail = await request('/guest/order-lookup', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip(202) },
    body: { orderNumber: state.orderNumber, guestEmail: 'wrong@example.com' },
  })
  assert(lookupWrongEmail.status === 404, `Expected 404 wrong email lookup, got ${lookupWrongEmail.status}`)
  pass('D2 wrong email returns 404')

  const lookupWrongOrder = await request('/guest/order-lookup', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip(203) },
    body: { orderNumber: 'ORD-00000000-ZZZZ', guestEmail: 'guest@example.com' },
  })
  assert(lookupWrongOrder.status === 404, `Expected 404 wrong orderNumber lookup, got ${lookupWrongOrder.status}`)
  pass('D3 wrong order returns 404')

  const lookupMissingField = await request('/guest/order-lookup', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip(204) },
    body: { orderNumber: state.orderNumber },
  })
  assert(lookupMissingField.status === 400, `Expected 400 missing guestEmail lookup, got ${lookupMissingField.status}`)
  pass('D4 missing field validation')
}

async function testAbuseScenarios() {
  logStep('E: Abuse / penetration checks')

  // E1: idempotency key must not be reusable across different guest contexts.
  const key = crypto.randomUUID()
  const guest1Email = 'guest-one@example.com'
  const guest2Email = 'guest-two@example.com'

  const c1 = await createCart(state.guestId, 1)
  assert(c1.status === 201 && c1.cartId, `Failed creating cart for E1 guest1 (${c1.status})`)
  const g1 = await checkoutAsGuest({
    cartId: c1.cartId,
    guestId: state.guestId,
    guestEmail: guest1Email,
    idempotencyKey: key,
    forwardedFor: ip(31),
  })
  assert(g1.status === 201, `Expected 201 for first idempotent checkout in E1, got ${g1.status}`)

  const c2 = await createCart(state.otherGuestId, 1)
  assert(c2.status === 201 && c2.cartId, `Failed creating cart for E1 guest2 (${c2.status})`)
  const g2 = await checkoutAsGuest({
    cartId: c2.cartId,
    guestId: state.otherGuestId,
    guestEmail: guest2Email,
    idempotencyKey: key,
    forwardedFor: ip(32),
  })
  assert(g2.status === 409, `Expected 409 on cross-guest idempotency reuse, got ${g2.status}`)
  pass('E1 cross-guest idempotency reuse blocked')

  // E2: authenticated customer cannot checkout a guest cart.
  if (!state.authToken && AUTH_TOKEN) {
    state.authToken = AUTH_TOKEN
    state.authUserEmail = 'token-user@example.com'
  }

  if (!state.authToken) {
    try {
      const auth = await registerAndLoginCustomer()
      state.authToken = auth.token
      state.authUserEmail = auth.email
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Email address is not verified')) {
        skip('E2 authenticated user cannot checkout guest cart', 'login blocked by verification policy; provide AUTH_TOKEN to run')
        return
      }
      throw err
    }
  }

  const guestCart = await createCart(state.guestId, 1)
  assert(guestCart.status === 201 && guestCart.cartId, `Failed creating guest cart for E2 (${guestCart.status})`)
  const authCheckout = await request('/checkout/process', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.authToken}`,
      'x-forwarded-for': ip(33),
    },
    body: {
      cartId: guestCart.cartId,
      guestEmail: state.authUserEmail, // attempt bypass by supplying guestEmail while authenticated
      shippingAddress: { firstName: 'A', lastName: 'B', street1: '1', city: 'D', country: 'BD' },
      billingAddress: { firstName: 'A', lastName: 'B', street1: '1', city: 'D', country: 'BD' },
    },
  })
  assert(authCheckout.status === 403, `Expected 403 authenticated user on guest cart checkout, got ${authCheckout.status}`)
  pass('E2 authenticated user cannot checkout guest cart')
}

async function testRateLimits() {
  logStep('F: Rate limit checks (optional)')

  const lookupIp = ip(241)
  const codesLookup = []
  for (let i = 0; i < 11; i++) {
    const r = await request('/guest/order-lookup', {
      method: 'POST',
      headers: { 'x-forwarded-for': lookupIp },
      body: { orderNumber: 'ORD-00000000-ZZZZ', guestEmail: 'test@example.com' },
    })
    codesLookup.push(r.status)
  }
  assert(codesLookup.slice(0, 10).every((c) => c === 404), `Expected first 10 lookup requests to be 404, got ${codesLookup.join(',')}`)
  assert(codesLookup[10] === 429, `Expected 11th guest lookup request to be 429, got ${codesLookup[10]}`)
  pass('D6 guest lookup rate limit', `codes=${codesLookup.join(',')}`)

  const checkoutIp = ip(242)
  const codesCheckout = []
  for (let i = 0; i < 6; i++) {
    const r = await request('/checkout/process', {
      method: 'POST',
      headers: { 'x-forwarded-for': checkoutIp },
      body: {
        cartId: 'nonexistent',
        guestEmail: 'a@b.com',
        shippingAddress: { firstName: 'T', lastName: 'G', street1: '1', city: 'D', country: 'BD' },
        billingAddress: { firstName: 'T', lastName: 'G', street1: '1', city: 'D', country: 'BD' },
      },
    })
    codesCheckout.push(r.status)
  }
  assert(codesCheckout.slice(0, 5).every((c) => c === 404), `Expected first 5 checkout requests to be 404, got ${codesCheckout.join(',')}`)
  assert(codesCheckout[5] === 429, `Expected 6th checkout request to be 429, got ${codesCheckout[5]}`)
  pass('F checkout rate limit', `codes=${codesCheckout.join(',')}`)
}

function printSummaryAndExit() {
  const failed = summary.filter((x) => !x.ok)
  const skipped = summary.filter((x) => x.skipped)
  console.log('\n=== Guest checkout test summary ===')
  for (const row of summary) {
    const label = row.skipped ? 'SKIP' : row.ok ? 'PASS' : 'FAIL'
    console.log(`${label} - ${row.name}${row.detail ? ` (${row.detail})` : ''}`)
  }
  const passed = summary.length - failed.length - skipped.length
  console.log(`\nTotal: ${summary.length}, Passed: ${passed}, Skipped: ${skipped.length}, Failed: ${failed.length}`)
  process.exit(failed.length ? 1 : 0)
}

async function main() {
  console.log('Running guest checkout backend test suite')
  console.log(`API_BASE=${API_BASE}`)
  console.log(`GUEST_ID=${state.guestId}`)
  console.log(`RUN_RATE_LIMIT=${RUN_RATE_LIMIT}`)

  try {
    logStep('Resolve product')
    state.productId = await resolveProductId()
    console.log(`  Using product id: ${state.productId}${process.env.PRODUCT_ID ? ' (from PRODUCT_ID)' : ' (first published)'}`)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }

  try {
    await testCartLifecycle()
  } catch (err) {
    fail('B cart lifecycle', err instanceof Error ? err.message : String(err))
  }

  try {
    await testCheckoutAndLookup()
  } catch (err) {
    fail('C/D checkout+lookup', err instanceof Error ? err.message : String(err))
  }

  try {
    await testAbuseScenarios()
  } catch (err) {
    fail('E abuse scenarios', err instanceof Error ? err.message : String(err))
  }

  if (RUN_RATE_LIMIT) {
    try {
      await testRateLimits()
    } catch (err) {
      fail('D6/F rate limits', err instanceof Error ? err.message : String(err))
    }
  } else {
    console.log('\nSkipping rate-limit checks. Set RUN_RATE_LIMIT=true to include them.')
  }

  printSummaryAndExit()
}

main().catch((err) => {
  console.error('Unexpected test runner error:', err)
  process.exit(1)
})
