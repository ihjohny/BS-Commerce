#!/usr/bin/env node
/**
 * Order lifecycle E2E tests (live API).
 * Creates an order via checkout and verifies status transitions.
 *
 * Requires: RUN_INTEGRATION_TESTS=true, ADMIN_TOKEN, PRODUCT_ID
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const PRODUCT_ID = process.env.PRODUCT_ID || null
const ip = `10.1.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`

const addr = {
  firstName: 'Order', lastName: 'Test', street1: '1 Main',
  city: 'Test', country: 'US',
}

async function main() {
  console.log('Running order lifecycle E2E tests')
  if (!RUN || !ADMIN_TOKEN || !PRODUCT_ID) {
    skip('order lifecycle', 'requires RUN_INTEGRATION_TESTS, ADMIN_TOKEN, PRODUCT_ID')
    process.exit(0)
  }

  // Create cart and checkout
  const cart = await request('/carts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: { items: [{ product: PRODUCT_ID, quantity: 1, unitPrice: 99 }] },
  })
  const cartId = cart.json?.doc?.id
  if (!cartId) {
    fail('create cart for order lifecycle', `status=${cart.status}`)
    printSummary('Order lifecycle E2E')
    process.exit(1)
  }

  const co = await request('/checkout/process', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'x-forwarded-for': ip },
    body: { cartId, shippingAddress: addr, billingAddress: addr, simulatePayment: true },
  })
  if ((co.status !== 200 && co.status !== 201) || !co.json?.order?.id) {
    fail('checkout for order lifecycle', `status=${co.status}`)
    printSummary('Order lifecycle E2E')
    process.exit(1)
  }
  ok('checkout creates order')
  const orderId = co.json.order.id

  // Read order
  const order = await request(`/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (order.status === 200 && order.json?.orderNumber) {
    ok('order is readable via API')
  } else {
    fail('order is readable via API', `status=${order.status}`)
  }

  // Transition to shipped
  const ship = await request(`/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: { status: 'shipped' },
  })
  if (ship.status === 200) ok('order transitions to shipped')
  else fail('order transitions to shipped', `status=${ship.status} body=${ship.text?.slice(0, 200)}`)

  // Transition to delivered
  const deliver = await request(`/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: { status: 'delivered' },
  })
  if (deliver.status === 200) ok('order transitions to delivered')
  else fail('order transitions to delivered', `status=${deliver.status}`)

  // Transition to completed
  const complete = await request(`/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: { status: 'completed' },
  })
  if (complete.status === 200) ok('order transitions to completed')
  else fail('order transitions to completed', `status=${complete.status}`)

  // Invalid transition: completed -> pending
  const invalid = await request(`/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: { status: 'pending' },
  })
  if (invalid.status >= 400) ok('order rejects invalid transition from completed')
  else fail('order rejects invalid transition from completed', `status=${invalid.status}`)

  const failCount = printSummary('Order lifecycle E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected order lifecycle error:', err)
  process.exit(1)
})
