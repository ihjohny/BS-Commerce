#!/usr/bin/env node
/**
 * Multivendor + inventory E2E: guest checkout allocates a stock-level row per line
 * and persists order-items.stockLevel (Phase 12).
 *
 * Requires: MULTIVENDOR_ENABLED=true, INVENTORY_ENABLED=true, GUEST_CHECKOUT_ENABLED=true.
 * Skips with exit 0 when those are not met (e.g. default profile is not MV; all-gates has guest OFF).
 *
 * Cart must be created without Authorization so hooks set guestId from X-Guest-Id (see carts beforeChange).
 */

import crypto from 'node:crypto'
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()
const mv = process.env.MULTIVENDOR_ENABLED === 'true'
const inv = process.env.INVENTORY_ENABLED !== 'false'
const guestCheckout = process.env.GUEST_CHECKOUT_ENABLED !== 'false'
const token = process.env.ADMIN_TOKEN

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  console.log('multivendor-inventory-checkout E2E | MV=' + mv + ' | INV=' + inv)

  if (!mv || !inv) {
    console.log('SKIP: requires MULTIVENDOR_ENABLED=true and INVENTORY_ENABLED=true')
    process.exit(0)
  }

  // Guest cart + guest checkout require GUEST_CHECKOUT_ENABLED (e.g. all-gates profile has guest OFF).
  if (!guestCheckout) {
    console.log('SKIP: requires GUEST_CHECKOUT_ENABLED=true (guest cart API is disabled in this profile)')
    process.exit(0)
  }

  if (!token) {
    console.error('FAIL: ADMIN_TOKEN missing (run via tests/run-e2e.mjs)')
    process.exit(1)
  }

  const auth = { Authorization: `Bearer ${token}` }
  const guestId = crypto.randomUUID()
  const suffix = `${Date.now()}-${crypto.randomInt(1000, 9999)}`

  try {
    logStep('Create tenant + warehouse + product + stock-level')
    const tRes = await request('/tenants', {
      method: 'POST',
      headers: auth,
      body: { name: `E2E MV Inv ${suffix}` },
    })
    assert(tRes.status === 200 || tRes.status === 201, `tenant create ${tRes.status}: ${tRes.text?.slice(0, 200)}`)
    const tenantId = tRes.json?.doc?.id || tRes.json?.id
    assert(tenantId, 'tenant id')

    const locRes = await request('/stock-locations', {
      method: 'POST',
      headers: auth,
      body: {
        name: `WH-${suffix}`,
        code: `WH-${suffix}`,
        tenant: tenantId,
        isActive: true,
      },
    })
    assert(locRes.status === 200 || locRes.status === 201, `stock-location ${locRes.status}: ${locRes.text?.slice(0, 200)}`)
    const locationId = locRes.json?.doc?.id || locRes.json?.id
    assert(locationId, 'location id')

    const pRes = await request('/products', {
      method: 'POST',
      headers: auth,
      body: {
        name: `E2E Product ${suffix}`,
        basePrice: 10,
        currency: 'USD',
        status: 'published',
        tenant: tenantId,
      },
    })
    assert(pRes.status === 200 || pRes.status === 201, `product ${pRes.status}: ${pRes.text?.slice(0, 200)}`)
    const productId = pRes.json?.doc?.id || pRes.json?.id
    assert(productId, 'product id')

    const slRes = await request('/stock-levels', {
      method: 'POST',
      headers: auth,
      body: {
        product: productId,
        location: locationId,
        quantity: 100,
        reservedQuantity: 0,
      },
    })
    assert(slRes.status === 200 || slRes.status === 201, `stock-level ${slRes.status}: ${slRes.text?.slice(0, 200)}`)
    const stockLevelId = slRes.json?.doc?.id || slRes.json?.id
    assert(stockLevelId, 'stock level id')

    // Guest cart must be created without Authorization: carts hooks only set guestId
    // from X-Guest-Id when req.user is absent; admin-created carts get user=admin and
    // checkout/process as guest then fails "Cart does not belong to this guest".
    logStep('Guest cart + checkout')
    const cartRes = await request('/carts', {
      method: 'POST',
      headers: { 'X-Guest-Id': guestId },
      body: { items: [{ product: productId, quantity: 1 }] },
    })
    assert(cartRes.status === 201, `cart ${cartRes.status}`)
    const cartId = cartRes.json?.doc?.id || cartRes.json?.id
    assert(cartId, 'cart id')

    const coRes = await request('/checkout/process', {
      method: 'POST',
      headers: { 'X-Guest-Id': guestId },
      body: {
        cartId,
        guestEmail: `guest-${suffix}@example.com`,
        simulatePayment: true,
        shippingAddress: {
          firstName: 'T',
          lastName: 'G',
          street1: '1 St',
          city: 'Dhaka',
          country: 'BD',
        },
        billingAddress: {
          firstName: 'T',
          lastName: 'G',
          street1: '1 St',
          city: 'Dhaka',
          country: 'BD',
        },
      },
    })
    assert(coRes.status === 201, `checkout ${coRes.status}: ${coRes.text?.slice(0, 300)}`)
    const orderId = coRes.json?.order?.id
    assert(orderId, 'order id')
    ok('checkout 201', `order=${orderId}`)

    logStep('Verify order line has stockLevel')
    const oiRes = await request(
      `/order-items?where[order][equals]=${orderId}&limit=5&depth=1`,
      { method: 'GET', headers: auth },
    )
    assert(oiRes.status === 200, `get order-items ${oiRes.status}`)
    const docs = oiRes.json?.docs || []
    assert(docs.length >= 1, 'expected at least one order-item')
    const first = docs[0]
    const slRef = first?.stockLevel
    const slId = slRef && typeof slRef === 'object' ? slRef.id : slRef
    assert(slId === stockLevelId, `expected stockLevel ${stockLevelId}, got ${JSON.stringify(slRef)}`)
    ok('order-line stockLevel matches seeded stock-level')

    logStep('Verify reservedQuantity increased on stock-level')
    const slGet = await request(`/stock-levels/${stockLevelId}`, {
      method: 'GET',
      headers: auth,
    })
    assert(slGet.status === 200, `get stock-level ${slGet.status}`)
    const reserved = Number(slGet.json?.reservedQuantity ?? 0)
    assert(reserved >= 1, `expected reservedQuantity >= 1, got ${reserved}`)
    ok('stock-level reservedQuantity >= 1')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    fail('multivendor inventory checkout', msg)
    console.error(e)
    process.exit(1)
  }

  const failed = printSummary('Multivendor + inventory checkout')
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
