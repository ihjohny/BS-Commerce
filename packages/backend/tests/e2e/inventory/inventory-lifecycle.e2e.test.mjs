#!/usr/bin/env node
/**
 * Single-vendor + inventory E2E (Phase 12 business paths).
 *
 * Covers:
 * - Checkout persists order-items.stockLevel and increases reservedQuantity
 * - Order cancel (before ship) releases reservation
 * - Order shipped consumes physical qty + reserved (admin checkout path)
 * - Checkout returns 400 when no single warehouse can fulfill line qty (insufficient stock)
 *
 * Skips with exit 0 when INVENTORY_ENABLED=false, MULTIVENDOR_ENABLED=true (MV inventory:
 * multivendor-inventory-checkout + multivendor-inventory-lifecycle), or missing tokens.
 */

import crypto from 'node:crypto'
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const PRODUCT_ID = process.env.PRODUCT_ID || null
const mv = process.env.MULTIVENDOR_ENABLED === 'true'
const inv = process.env.INVENTORY_ENABLED !== 'false'

const auth = ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}
const addr = {
  firstName: 'Inv',
  lastName: 'Test',
  street1: '1 Warehouse Rd',
  city: 'Test',
  country: 'US',
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function stockLevelIdFromItem(doc) {
  const sl = doc?.stockLevel
  if (!sl) return null
  return typeof sl === 'object' ? sl.id : sl
}

async function adminCheckout(productId, qty = 1) {
  const cart = await request('/carts', {
    method: 'POST',
    headers: { ...auth },
    body: { items: [{ product: productId, quantity: qty, unitPrice: 99 }] },
  })
  assert(cart.status === 200 || cart.status === 201, `cart ${cart.status}: ${cart.text?.slice(0, 200)}`)
  const cartId = cart.json?.doc?.id || cart.json?.id
  assert(cartId, 'cart id')
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
  assert(co.status === 200 || co.status === 201, `checkout ${co.status}: ${co.text?.slice(0, 300)}`)
  const orderId = co.json?.order?.id
  assert(orderId, 'order id')
  return orderId
}

async function getFirstOrderItem(orderId) {
  const oiRes = await request(`/order-items?where[order][equals]=${orderId}&limit=5&depth=1`, {
    headers: { ...auth },
  })
  assert(oiRes.status === 200, `order-items ${oiRes.status}`)
  const docs = oiRes.json?.docs || []
  assert(docs.length >= 1, 'expected order-item')
  return docs[0]
}

async function getStockLevelDoc(id) {
  const r = await request(`/stock-levels/${id}`, { headers: { ...auth } })
  assert(r.status === 200, `stock-level get ${r.status}`)
  return r.json
}

async function main() {
  console.log('inventory-lifecycle E2E | MV=' + mv + ' | INV=' + inv)

  if (!RUN || !ADMIN_TOKEN || !PRODUCT_ID) {
    skip('inventory lifecycle', 'requires RUN_INTEGRATION_TESTS, ADMIN_TOKEN, PRODUCT_ID')
    printSummary('Inventory lifecycle E2E')
    process.exit(0)
  }

  if (!inv) {
    console.log('SKIP: INVENTORY_ENABLED=false')
    printSummary('Inventory lifecycle E2E')
    process.exit(0)
  }

  if (mv) {
    console.log('SKIP: MULTIVENDOR_ENABLED=true (see tests/e2e/inventory/multivendor-inventory-lifecycle.e2e.test.mjs)')
    printSummary('Inventory lifecycle E2E')
    process.exit(0)
  }

  try {
    logStep('Checkout: order line has stockLevel + reserved increases')
    const order1 = await adminCheckout(PRODUCT_ID, 1)
    const item1 = await getFirstOrderItem(order1)
    const slId = stockLevelIdFromItem(item1)
    assert(slId, 'order-item missing stockLevel')
    ok('order-item has stockLevel', String(slId))

    const afterReserve = await getStockLevelDoc(slId)
    const r1 = Number(afterReserve.reservedQuantity ?? 0)
    const q1 = Number(afterReserve.quantity ?? 0)
    assert(r1 >= 1, `expected reservedQuantity >= 1 after checkout, got ${r1}`)
    ok('reservedQuantity after checkout', String(r1))

    logStep('Cancel order: reservation released')
    const cancel = await request(`/orders/${order1}`, {
      method: 'PATCH',
      headers: { ...auth },
      body: { status: 'cancelled' },
    })
    assert(cancel.status === 200, `cancel ${cancel.status}: ${cancel.text?.slice(0, 200)}`)
    const afterCancel = await getStockLevelDoc(slId)
    const r2 = Number(afterCancel.reservedQuantity ?? 0)
    assert(r2 === r1 - 1, `expected reserved ${r1 - 1} after cancel, got ${r2}`)
    ok('reservedQuantity after cancel', String(r2))

    logStep('Second checkout + ship: consume qty and reserved')
    const order2 = await adminCheckout(PRODUCT_ID, 1)
    const item2 = await getFirstOrderItem(order2)
    assert(stockLevelIdFromItem(item2) === slId, 'same stock level row for seeded product')
    const beforeShip = await getStockLevelDoc(slId)
    const r3 = Number(beforeShip.reservedQuantity ?? 0)
    const q3 = Number(beforeShip.quantity ?? 0)
    assert(r3 >= 1, `expected reserved before ship >= 1, got ${r3}`)

    const ship = await request(`/orders/${order2}`, {
      method: 'PATCH',
      headers: { ...auth },
      body: { status: 'shipped' },
    })
    assert(ship.status === 200, `ship ${ship.status}: ${ship.text?.slice(0, 200)}`)
    const afterShip = await getStockLevelDoc(slId)
    const r4 = Number(afterShip.reservedQuantity ?? 0)
    const q4 = Number(afterShip.quantity ?? 0)
    assert(r4 === r3 - 1, `expected reserved ${r3 - 1} after ship, got ${r4}`)
    assert(q4 === q3 - 1, `expected quantity ${q3 - 1} after consume, got ${q4}`)
    ok('consume on ship: quantity and reserved decreased')

    logStep('Insufficient stock: checkout should fail')
    const suffix = `${Date.now()}-${crypto.randomInt(1000, 9999)}`
    const pRes = await request('/products', {
      method: 'POST',
      headers: { ...auth },
      body: {
        name: `E2E Low Stock ${suffix}`,
        basePrice: 5,
        currency: 'USD',
        status: 'published',
      },
    })
    assert(pRes.status === 200 || pRes.status === 201, `product ${pRes.status}`)
    const lowPid = pRes.json?.doc?.id || pRes.json?.id
    assert(lowPid, 'low product id')

    const locRes = await request('/stock-locations', {
      method: 'POST',
      headers: { ...auth },
      body: { name: `Loc-${suffix}`, code: `LOC-${suffix}`, isActive: true },
    })
    assert(locRes.status === 200 || locRes.status === 201, `location ${locRes.status}`)
    const locId = locRes.json?.doc?.id || locRes.json?.id

    const slLow = await request('/stock-levels', {
      method: 'POST',
      headers: { ...auth },
      body: {
        product: lowPid,
        location: locId,
        quantity: 2,
        reservedQuantity: 0,
      },
    })
    assert(slLow.status === 200 || slLow.status === 201, `stock-level ${slLow.status}`)

    const badCart = await request('/carts', {
      method: 'POST',
      headers: { ...auth },
      body: { items: [{ product: lowPid, quantity: 50, unitPrice: 5 }] },
    })
    assert(badCart.status === 200 || badCart.status === 201, `bad cart ${badCart.status}`)
    const badCartId = badCart.json?.doc?.id || badCart.json?.id
    const badCo = await request('/checkout/process', {
      method: 'POST',
      headers: { ...auth },
      body: {
        cartId: badCartId,
        shippingAddress: addr,
        billingAddress: addr,
        simulatePayment: true,
      },
    })
    assert(badCo.status === 400, `expected 400 insufficient stock, got ${badCo.status}`)
    assert(
      String(badCo.text || '').toLowerCase().includes('stock') ||
        String(badCo.text || '').toLowerCase().includes('warehouse'),
      'error body should mention stock/warehouse',
    )
    ok('checkout 400 when stock cannot fulfill line')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    fail('inventory lifecycle', msg)
    console.error(e)
    printSummary('Inventory lifecycle E2E')
    process.exit(1)
  }

  const failed = printSummary('Inventory lifecycle E2E')
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
