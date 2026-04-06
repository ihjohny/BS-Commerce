#!/usr/bin/env node
/**
 * Multivendor + inventory E2E: release/consume run on **sub-orders** (not parent orders).
 *
 * Covers:
 * - Guest checkout → order-items.stockLevel + reservedQuantity (sanity with existing MV checkout)
 * - PATCH sub-order cancelled → reservation released (releaseOrderInventory on sub-order items)
 * - Second guest checkout → sub-order processing → shipped → quantity + reservedQuantity consumed
 * - Guest checkout 400 when line qty exceeds single-warehouse availability
 *
 * Requires: MULTIVENDOR_ENABLED=true, INVENTORY_ENABLED=true, GUEST_CHECKOUT_ENABLED=true, ADMIN_TOKEN.
 * Skips exit 0 when flags/env not met.
 */

import crypto from 'node:crypto'
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()
const mv = process.env.MULTIVENDOR_ENABLED === 'true'
const inv = process.env.INVENTORY_ENABLED !== 'false'
const guestCheckout = process.env.GUEST_CHECKOUT_ENABLED !== 'false'
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const token = process.env.ADMIN_TOKEN

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function stockLevelIdFromItem(doc) {
  const sl = doc?.stockLevel
  if (!sl) return null
  return typeof sl === 'object' ? sl.id : sl
}

async function main() {
  console.log('multivendor-inventory-lifecycle E2E | MV=' + mv + ' | INV=' + inv)

  if (!RUN) {
    skip('mv inventory lifecycle', 'requires RUN_INTEGRATION_TESTS=true')
    printSummary('Multivendor inventory lifecycle E2E')
    process.exit(0)
  }

  if (!mv || !inv) {
    skip('mv inventory lifecycle', 'requires MULTIVENDOR_ENABLED=true and INVENTORY_ENABLED=true')
    printSummary('Multivendor inventory lifecycle E2E')
    process.exit(0)
  }

  if (!guestCheckout) {
    skip('mv inventory lifecycle', 'requires GUEST_CHECKOUT_ENABLED=true')
    printSummary('Multivendor inventory lifecycle E2E')
    process.exit(0)
  }

  if (!token) {
    console.error('FAIL: ADMIN_TOKEN missing (run via tests/run-e2e.mjs)')
    process.exit(1)
  }

  const auth = { Authorization: `Bearer ${token}` }
  const suffix = `${Date.now()}-${crypto.randomInt(1000, 9999)}`

  async function seedTenantProductStock(tag = suffix) {
    const tRes = await request('/tenants', {
      method: 'POST',
      headers: auth,
      body: { name: `E2E MV Inv LC ${tag}` },
    })
    assert(tRes.status === 200 || tRes.status === 201, `tenant ${tRes.status}: ${tRes.text?.slice(0, 200)}`)
    const tenantId = tRes.json?.doc?.id || tRes.json?.id
    assert(tenantId, 'tenant id')

    const locRes = await request('/stock-locations', {
      method: 'POST',
      headers: auth,
      body: {
        name: `WH-LC-${tag}`,
        code: `WH-LC-${tag}`,
        tenant: tenantId,
        isActive: true,
      },
    })
    assert(locRes.status === 200 || locRes.status === 201, `stock-location ${locRes.status}`)
    const locationId = locRes.json?.doc?.id || locRes.json?.id
    assert(locationId, 'location id')

    const pRes = await request('/products', {
      method: 'POST',
      headers: auth,
      body: {
        name: `E2E MV LC Product ${tag}`,
        basePrice: 10,
        currency: 'USD',
        status: 'published',
        tenant: tenantId,
      },
    })
    assert(pRes.status === 200 || pRes.status === 201, `product ${pRes.status}`)
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
    assert(slRes.status === 200 || slRes.status === 201, `stock-level ${slRes.status}`)
    const stockLevelId = slRes.json?.doc?.id || slRes.json?.id
    assert(stockLevelId, 'stock level id')

    return { tenantId, productId, stockLevelId }
  }

  async function guestCheckoutProduct(productId, guestId) {
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
        guestEmail: `guest-${guestId.slice(0, 8)}@example.com`,
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
    return orderId
  }

  async function getSubOrderForParent(parentOrderId) {
    const soRes = await request(
      `/sub-orders?where[parentOrder][equals]=${parentOrderId}&limit=10&depth=0`,
      { method: 'GET', headers: auth },
    )
    assert(soRes.status === 200, `sub-orders list ${soRes.status}`)
    const docs = soRes.json?.docs || []
    assert(docs.length >= 1, 'expected at least one sub-order')
    return docs[0].id
  }

  async function getFirstOrderItemForOrder(orderId) {
    const oiRes = await request(
      `/order-items?where[order][equals]=${orderId}&limit=5&depth=1`,
      { method: 'GET', headers: auth },
    )
    assert(oiRes.status === 200, `order-items ${oiRes.status}`)
    const docs = oiRes.json?.docs || []
    assert(docs.length >= 1, 'expected order-item')
    return docs[0]
  }

  async function getStockLevelDoc(id) {
    const r = await request(`/stock-levels/${id}`, { headers: auth })
    assert(r.status === 200, `stock-level ${r.status}`)
    return r.json
  }

  try {
    logStep('Seed tenant, product, stock')
    const { productId, stockLevelId } = await seedTenantProductStock()

    logStep('Guest checkout → line stockLevel + reserved')
    const guest1 = crypto.randomUUID()
    const order1 = await guestCheckoutProduct(productId, guest1)
    const item1 = await getFirstOrderItemForOrder(order1)
    assert(stockLevelIdFromItem(item1) === stockLevelId, 'order-item.stockLevel matches seeded row')
    ok('MV line has stockLevel')

    const afterReserve = await getStockLevelDoc(stockLevelId)
    const r1 = Number(afterReserve.reservedQuantity ?? 0)
    assert(r1 >= 1, `reserved >= 1, got ${r1}`)
    ok('reserved after checkout', String(r1))

    logStep('Cancel sub-order → reservation released')
    const sub1 = await getSubOrderForParent(order1)
    const cancelSo = await request(`/sub-orders/${sub1}`, {
      method: 'PATCH',
      headers: auth,
      body: { status: 'cancelled' },
    })
    assert(cancelSo.status === 200, `sub-order cancel ${cancelSo.status}: ${cancelSo.text?.slice(0, 200)}`)
    const afterCancel = await getStockLevelDoc(stockLevelId)
    const r2 = Number(afterCancel.reservedQuantity ?? 0)
    assert(r2 === r1 - 1, `expected reserved ${r1 - 1} after sub-order cancel, got ${r2}`)
    ok('reserved after sub-order cancel', String(r2))

    logStep('Second guest checkout → sub-order processing → shipped → consume')
    const guest2 = crypto.randomUUID()
    const order2 = await guestCheckoutProduct(productId, guest2)
    await getFirstOrderItemForOrder(order2)
    const sub2 = await getSubOrderForParent(order2)
    const beforeShip = await getStockLevelDoc(stockLevelId)
    const r3 = Number(beforeShip.reservedQuantity ?? 0)
    const q3 = Number(beforeShip.quantity ?? 0)
    assert(r3 >= 1, `reserved before ship >= 1, got ${r3}`)

    const proc = await request(`/sub-orders/${sub2}`, {
      method: 'PATCH',
      headers: auth,
      body: { status: 'processing' },
    })
    assert(proc.status === 200, `sub-order processing ${proc.status}: ${proc.text?.slice(0, 200)}`)

    const ship = await request(`/sub-orders/${sub2}`, {
      method: 'PATCH',
      headers: auth,
      body: { status: 'shipped' },
    })
    assert(ship.status === 200, `sub-order ship ${ship.status}: ${ship.text?.slice(0, 200)}`)

    const afterShip = await getStockLevelDoc(stockLevelId)
    const r4 = Number(afterShip.reservedQuantity ?? 0)
    const q4 = Number(afterShip.quantity ?? 0)
    assert(r4 === r3 - 1, `expected reserved ${r3 - 1} after ship, got ${r4}`)
    assert(q4 === q3 - 1, `expected quantity ${q3 - 1} after consume, got ${q4}`)
    ok('sub-order shipped: quantity and reserved decreased')

    logStep('Insufficient stock: guest checkout 400')
    const lowTag = `${Date.now()}-${crypto.randomInt(1000, 9999)}`
    const tLow = await request('/tenants', {
      method: 'POST',
      headers: auth,
      body: { name: `E2E MV Low tenant ${lowTag}` },
    })
    assert(tLow.status === 200 || tLow.status === 201, `low tenant ${tLow.status}`)
    const lowTenantId = tLow.json?.doc?.id || tLow.json?.id
    assert(lowTenantId, 'low tenant id')

    const locLow = await request('/stock-locations', {
      method: 'POST',
      headers: auth,
      body: {
        name: `LOC-${lowTag}`,
        code: `LOC-${lowTag}`,
        tenant: lowTenantId,
        isActive: true,
      },
    })
    assert(locLow.status === 200 || locLow.status === 201, `loc ${locLow.status}`)
    const lowLocId = locLow.json?.doc?.id || locLow.json?.id

    const pLow = await request('/products', {
      method: 'POST',
      headers: auth,
      body: {
        name: `E2E MV Low ${lowTag}`,
        basePrice: 1,
        currency: 'USD',
        status: 'published',
        tenant: lowTenantId,
      },
    })
    assert(pLow.status === 200 || pLow.status === 201, `low product ${pLow.status}`)
    const lowPid = pLow.json?.doc?.id || pLow.json?.id

    const slLow = await request('/stock-levels', {
      method: 'POST',
      headers: auth,
      body: { product: lowPid, location: lowLocId, quantity: 2, reservedQuantity: 0 },
    })
    assert(slLow.status === 200 || slLow.status === 201, `low stock-level ${slLow.status}`)

    const g3 = crypto.randomUUID()
    const cartBad = await request('/carts', {
      method: 'POST',
      headers: { 'X-Guest-Id': g3 },
      body: { items: [{ product: lowPid, quantity: 50 }] },
    })
    assert(cartBad.status === 201, `bad cart ${cartBad.status}`)
    const badCartId = cartBad.json?.doc?.id || cartBad.json?.id

    const badCo = await request('/checkout/process', {
      method: 'POST',
      headers: { 'X-Guest-Id': g3 },
      body: {
        cartId: badCartId,
        guestEmail: `bad-${g3.slice(0, 8)}@example.com`,
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
    assert(badCo.status === 400, `expected 400, got ${badCo.status}`)
    const low = String(badCo.text || '').toLowerCase()
    assert(low.includes('stock') || low.includes('warehouse'), 'body should mention stock/warehouse')
    ok('MV guest checkout 400 when stock insufficient')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    fail('multivendor inventory lifecycle', msg)
    console.error(e)
    printSummary('Multivendor inventory lifecycle E2E')
    process.exit(1)
  }

  const failed = printSummary('Multivendor inventory lifecycle E2E')
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
