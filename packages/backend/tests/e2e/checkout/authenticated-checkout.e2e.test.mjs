#!/usr/bin/env node
/**
 * Authenticated checkout E2E tests (live API).
 *
 * Requires: RUN_INTEGRATION_TESTS=true, ADMIN_TOKEN, PRODUCT_ID
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const PRODUCT_ID = process.env.PRODUCT_ID || null
const ip = `10.0.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`

const addr = {
  firstName: 'E2E', lastName: 'Test', street1: '123 Test St',
  city: 'Testville', country: 'US', postalCode: '12345',
}

async function main() {
  console.log('Running authenticated checkout E2E tests')
  if (!RUN || !ADMIN_TOKEN || !PRODUCT_ID) {
    skip('authenticated checkout', 'requires RUN_INTEGRATION_TESTS, ADMIN_TOKEN, PRODUCT_ID')
    process.exit(0)
  }

  // Create a cart as admin user
  const cart = await request('/carts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: {
      items: [{ product: PRODUCT_ID, quantity: 1, unitPrice: 99 }],
    },
  })
  if (cart.status !== 201 && cart.status !== 200) {
    fail('create authenticated cart', `status=${cart.status} body=${cart.text?.slice(0, 300)}`)
    const failCount = printSummary('Authenticated checkout E2E')
    process.exit(failCount ? 1 : 0)
  }
  ok('create authenticated cart')
  const cartId = cart.json?.doc?.id

  if (!cartId) {
    fail('cart has an id', `got ${JSON.stringify(cart.json?.doc)}`)
    const failCount = printSummary('Authenticated checkout E2E')
    process.exit(failCount ? 1 : 0)
  }

  // Checkout
  const checkout = await request('/checkout/process', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'x-forwarded-for': ip },
    body: {
      cartId,
      shippingAddress: addr,
      billingAddress: addr,
      simulatePayment: true,
    },
  })
  if ((checkout.status === 200 || checkout.status === 201) && checkout.json?.order?.id) {
    ok('authenticated checkout succeeds')
  } else {
    fail('authenticated checkout succeeds', `status=${checkout.status} body=${checkout.text?.slice(0, 300)}`)
  }

  // Idempotency key reuse returns same order
  const idemKey = `e2e-idem-${Date.now()}`
  const cart2 = await request('/carts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: { items: [{ product: PRODUCT_ID, quantity: 1, unitPrice: 99 }] },
  })
  const cartId2 = cart2.json?.doc?.id
  if (cartId2) {
    const co1 = await request('/checkout/process', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'x-forwarded-for': `${ip}, 1` },
      body: { cartId: cartId2, shippingAddress: addr, billingAddress: addr, simulatePayment: true, idempotencyKey: idemKey },
    })
    if (co1.status === 200 || co1.status === 201) {
      const co2 = await request('/checkout/process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'x-forwarded-for': `${ip}, 2` },
        body: { cartId: 'any', shippingAddress: addr, billingAddress: addr, idempotencyKey: idemKey },
      })
      if (co2.status === 200 && co2.json?.order?.id === co1.json?.order?.id) ok('idempotency key returns same order')
      else fail('idempotency key returns same order', `status=${co2.status}`)
    } else {
      skip('idempotency key test', 'first checkout failed')
    }
  }

  const failCount = printSummary('Authenticated checkout E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected authenticated checkout error:', err)
  process.exit(1)
})
