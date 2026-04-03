import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { processCheckout } from '../../../src/lib/process-checkout.ts'

let envBackups: Record<string, string | undefined> = {}
const envKeys = ['MULTIVENDOR_ENABLED', 'REQUIRE_VERIFIED_FOR_CHECKOUT', 'DEFAULT_COMMISSION_RATE']
beforeEach(() => { envBackups = {}; for (const k of envKeys) envBackups[k] = process.env[k] })
afterEach(() => { for (const k of envKeys) { if (envBackups[k] === undefined) delete process.env[k]; else process.env[k] = envBackups[k] } })

function buildPayload(overrides: Record<string, Function> = {}) {
  const calls: Record<string, any[]> = { find: [], findByID: [], create: [], update: [], delete: [] }
  const defaultProduct = { id: 'prod-1', name: 'Test', basePrice: 50, tenant: null }

  return {
    find: async (args: any) => {
      calls.find.push(args)
      if (overrides.find) return overrides.find(args)
      if (args.collection === 'orders') return { docs: [] }
      if (args.collection === 'stock-levels') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
    findByID: async (args: any) => {
      calls.findByID.push(args)
      if (overrides.findByID) return overrides.findByID(args)
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, quantity: 2, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return defaultProduct
      if (args.collection === 'users') return { id: args.id, email: 'u@test.com', emailVerified: true }
      return { id: args.id }
    },
    create: async (args: any) => {
      calls.create.push(args)
      if (overrides.create) return overrides.create(args)
      if (args.collection === 'orders') return { id: 'order-1', orderNumber: 'ORD-TEST', status: 'pending' }
      if (args.collection === 'sub-orders') return { id: 'so-1' }
      if (args.collection === 'order-items') return { id: `oi-${calls.create.length}` }
      if (args.collection === 'order-status-history') return { id: 'osh-1' }
      if (args.collection === 'transactions') return { id: 'txn-1' }
      return { id: `new-${calls.create.length}` }
    },
    update: async (args: any) => {
      calls.update.push(args)
      if (overrides.update) return overrides.update(args)
      return { id: args.id }
    },
    delete: async (args: any) => {
      calls.delete.push(args)
      if (overrides.delete) return overrides.delete(args)
      return { id: args.id }
    },
    db: {
      beginTransaction: async () => 'tx-1',
      commitTransaction: async () => {},
      rollbackTransaction: async () => {},
    },
    _calls: calls,
  } as any
}

const baseInput = {
  cartId: 'cart-1',
  shippingAddress: { firstName: 'A', lastName: 'B', street1: '1 St', city: 'C', country: 'US' },
  billingAddress: { firstName: 'A', lastName: 'B', street1: '1 St', city: 'C', country: 'US' },
}

function guestReq() {
  return {
    headers: { get: (name: string) => name === 'x-guest-id' ? 'guest-abc' : null },
    user: undefined,
    context: {},
  } as any
}

test('should return error when no userId and no guestEmail', async () => {
  const payload = buildPayload()
  const result = await processCheckout(payload, { ...baseInput }, undefined, guestReq())
  assert.equal(result.statusCode, 400)
  assert.ok(result.error?.includes('guestEmail'))
})

test('should process guest checkout successfully', async () => {
  const payload = buildPayload()
  const result = await processCheckout(
    payload,
    { ...baseInput, guestEmail: 'guest@test.com' },
    undefined,
    guestReq(),
  )
  assert.ok(result.order.id)
  assert.ok(result.order.orderNumber)
  assert.equal(result.error, undefined)
})

test('should return 404 when cart not found', async () => {
  const { NotFound: NF } = await import('payload')
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') throw new NF()
      return { id: args.id, name: 'Test', basePrice: 50 }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq())
  assert.equal(result.statusCode, 404)
})

test('should reject guest checkout when X-Guest-Id does not match', async () => {
  const payload = buildPayload()
  const req = {
    headers: { get: (name: string) => name === 'x-guest-id' ? 'wrong-id' : null },
    user: undefined,
    context: {},
  } as any
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, req)
  assert.equal(result.statusCode, 403)
  assert.ok(result.error?.includes('guest'))
})

test('should reject authenticated checkout when cart does not belong to user', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') return { id: 'cart-1', user: { id: 'other-user' }, items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 10 }] }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 10, tenant: null }
      return { id: args.id, emailVerified: true }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'user-1', role: 'customer' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput }, 'user-1', req)
  assert.equal(result.statusCode, 403)
})

test('should return error when cart is empty', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') return { id: 'cart-1', guestId: 'guest-abc', items: [] }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq())
  assert.ok(result.error?.includes('empty'))
})

test('should return existing order when idempotencyKey is reused by same user', async () => {
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'orders' && args.where?.idempotencyKey) {
        return { docs: [{ id: 'existing-order', orderNumber: 'ORD-EXISTING', customer: { id: 'user-1' } }] }
      }
      return { docs: [] }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'user-1', role: 'customer' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput, idempotencyKey: 'idem-1' }, 'user-1', req)
  assert.equal(result.order.id, 'existing-order')
  assert.equal(result.error, undefined)
})

test('should return 409 when idempotencyKey is used by different user', async () => {
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'orders' && args.where?.idempotencyKey) {
        return { docs: [{ id: 'existing-order', orderNumber: 'ORD-X', customer: { id: 'other-user' } }] }
      }
      return { docs: [] }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'user-1', role: 'customer' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput, idempotencyKey: 'idem-1' }, 'user-1', req)
  assert.equal(result.statusCode, 409)
})

test('should return existing order when idempotencyKey matches same guest email', async () => {
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'orders' && args.where?.idempotencyKey) {
        return {
          docs: [{
            id: 'guest-order-1',
            orderNumber: 'ORD-GUEST',
            customer: null,
            guestEmail: 'repeat@guest.com',
          }],
        }
      }
      return { docs: [] }
    },
  })
  const result = await processCheckout(
    payload,
    { ...baseInput, guestEmail: 'Repeat@Guest.com', idempotencyKey: 'idem-guest-1' },
    undefined,
    guestReq(),
  )
  assert.equal(result.order.id, 'guest-order-1')
  assert.equal(result.order.orderNumber, 'ORD-GUEST')
  assert.equal(result.error, undefined)
})

test('should allow admin to reuse idempotency order owned by another customer', async () => {
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'orders' && args.where?.idempotencyKey) {
        return { docs: [{ id: 'admin-idem', orderNumber: 'ORD-A', customer: { id: 'customer-x' } }] }
      }
      return { docs: [] }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'admin-1', role: 'admin' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput, idempotencyKey: 'idem-admin' }, 'admin-1', req)
  assert.equal(result.order.id, 'admin-idem')
  assert.equal(result.error, undefined)
})

test('should return 400 when cart coupon code is invalid', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          couponCode: 'NOT-A-REAL-COUPON',
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      return { id: args.id }
    },
    find: async (args: any) => {
      if (args.collection === 'coupons') return { docs: [], totalDocs: 0 }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq())
  assert.equal(result.statusCode, 400)
  assert.ok(result.error?.includes('not found') || result.error?.includes('Coupon'))
})

test('should block unverified user when REQUIRE_VERIFIED_FOR_CHECKOUT is on', async () => {
  process.env.REQUIRE_VERIFIED_FOR_CHECKOUT = 'true'
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'users') return { id: 'u-1', emailVerified: false, phoneVerified: false }
      if (args.collection === 'carts') return { id: 'cart-1', user: { id: 'u-1' }, items: [{ product: { id: 'p-1' }, quantity: 1, unitPrice: 10 }] }
      return { id: args.id }
    },
    find: async () => ({ docs: [] }),
  })
  const req = { headers: { get: () => null }, user: { id: 'u-1', role: 'customer' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput }, 'u-1', req)
  assert.equal(result.statusCode, 403)
  assert.ok(result.error?.includes('verified'))
})

test('should delete cart after successful checkout', async () => {
  const payload = buildPayload()
  await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq())
  const deleteCall = payload._calls.delete.find((c: any) => c.collection === 'carts')
  assert.ok(deleteCall)
  assert.equal(deleteCall.id, 'cart-1')
})

test('should commit transaction on success', async () => {
  let committed = false
  const payload = buildPayload()
  payload.db.commitTransaction = async () => { committed = true }
  await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq())
  assert.ok(committed)
})

test('should rollback transaction on error', async () => {
  let rolledBack = false
  const payload = buildPayload({
    create: async (args: any) => {
      if (args.collection === 'orders') throw new Error('DB write error')
      return { id: 'x' }
    },
  })
  payload.db.rollbackTransaction = async () => { rolledBack = true }
  await assert.rejects(() =>
    processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq()),
  )
  assert.ok(rolledBack)
})

test('should create simulated transaction when simulatePayment is true', async () => {
  const payload = buildPayload()
  const result = await processCheckout(
    payload,
    { ...baseInput, guestEmail: 'pay@test.com', simulatePayment: true },
    undefined,
    guestReq(),
  )
  assert.equal(result.error, undefined)
  assert.ok(result.transaction?.id)
  const txnCreates = payload._calls.create.filter((c: any) => c.collection === 'transactions')
  assert.equal(txnCreates.length, 1)
  assert.equal(txnCreates[0].data.status, 'succeeded')
  const orderUpdates = payload._calls.update.filter((c: any) => c.collection === 'orders')
  const paidUpdate = orderUpdates.find((c: any) => c.data?.paymentStatus === 'paid')
  assert.ok(paidUpdate)
})

test('should use variant price when cart line has variant', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [
            {
              product: { id: 'prod-1' },
              variant: { id: 'var-99' },
              quantity: 1,
              unitPrice: 1,
            },
          ],
        }
      }
      if (args.collection === 'products') {
        return { id: 'prod-1', name: 'P', basePrice: 50, sku: 'P-SKU', tenant: null }
      }
      if (args.collection === 'product-variants') {
        return { id: 'var-99', price: 33.5, product: 'prod-1', name: 'Size M', sku: 'V-SKU' }
      }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'v@test.com' }, undefined, guestReq())
  assert.ok(result.order.id)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates.length, 1)
  assert.equal(itemCreates[0].data.unitPrice, 33.5)
  assert.ok(String(itemCreates[0].data.variant || '').includes('var-99') || itemCreates[0].data.variant === 'var-99')
})

test('should increment coupon totalUses after checkout with valid cart coupon', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          couponCode: 'SAVE10',
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      if (args.collection === 'coupons') return { id: 'cpn-1', code: 'SAVE10', totalUses: 3 }
      return { id: args.id }
    },
    find: async (args: any) => {
      if (args.collection === 'coupons') {
        return {
          docs: [
            {
              id: 'cpn-1',
              code: 'SAVE10',
              type: 'percentage',
              value: 10,
              isActive: true,
              totalUses: 3,
            },
          ],
          totalDocs: 1,
        }
      }
      if (args.collection === 'orders') return { docs: [] }
      if (args.collection === 'stock-levels') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'coupon@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const couponUpdates = payload._calls.update.filter((c: any) => c.collection === 'coupons')
  assert.equal(couponUpdates.length, 1)
  assert.equal(couponUpdates[0].data.totalUses, 4)
})

test('should create sub-orders and platform line items when multivendor is enabled', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  process.env.DEFAULT_COMMISSION_RATE = '10'
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [
            { product: { id: 'p-v' }, quantity: 1, unitPrice: 10 },
            { product: { id: 'p-plat' }, quantity: 1, unitPrice: 5 },
          ],
        }
      }
      if (args.collection === 'products') {
        if (args.id === 'p-v') {
          return { id: 'p-v', name: 'Vendor P', basePrice: 100, sku: 'V', tenant: { id: 't-1' } }
        }
        return { id: 'p-plat', name: 'Platform P', basePrice: 20, sku: 'P', tenant: null }
      }
      return { id: args.id }
    },
    find: async (args: any) => {
      if (args.collection === 'vendor-settings') return { docs: [] }
      if (args.collection === 'orders') return { docs: [] }
      if (args.collection === 'stock-levels') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'mv@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const subCreates = payload._calls.create.filter((c: any) => c.collection === 'sub-orders')
  assert.equal(subCreates.length, 1)
  assert.equal(subCreates[0].data.tenant, 't-1')
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates.length, 2)
  const withSub = itemCreates.filter((c: any) => c.data.subOrder != null)
  const platformOnly = itemCreates.filter((c: any) => c.data.subOrder == null && c.data.product === 'p-plat')
  assert.equal(withSub.length, 1)
  assert.equal(platformOnly.length, 1)
})

test('should reserve stock when matching stock-level exists', async () => {
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-1',
              product: 'prod-1',
              reservedQuantity: 1,
            },
          ],
        }
      }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })
  await processCheckout(payload, { ...baseInput, guestEmail: 'stock@test.com' }, undefined, guestReq())
  const stockUpdates = payload._calls.update.filter((c: any) => c.collection === 'stock-levels')
  assert.equal(stockUpdates.length, 1)
  assert.equal(stockUpdates[0].data.reservedQuantity, 3)
})

test('should skip commit when adapter returns no transaction id', async () => {
  let committed = false
  const payload = buildPayload()
  payload.db.beginTransaction = async () => null
  payload.db.commitTransaction = async () => { committed = true }
  await processCheckout(payload, { ...baseInput, guestEmail: 'notx@test.com' }, undefined, guestReq())
  assert.equal(committed, false)
})

test('should load user email for confirmation when checkout is authenticated', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          user: { id: 'u-1' },
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      if (args.collection === 'users') return { id: 'u-1', email: 'buyer@test.com' }
      return { id: args.id }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'u-1', role: 'customer' }, context: {} } as any
  await processCheckout(payload, baseInput, 'u-1', req)
  const userLookups = payload._calls.findByID.filter((c: any) => c.collection === 'users')
  assert.ok(userLookups.some((c: any) => c.id === 'u-1'))
})

test('should set changedBy on simulated payment history when user is logged in', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          user: { id: 'u-1' },
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      return { id: args.id }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'u-1', role: 'customer' }, context: {} } as any
  await processCheckout(payload, { ...baseInput, simulatePayment: true }, 'u-1', req)
  const histCreates = payload._calls.create.filter((c: any) => c.collection === 'order-status-history')
  assert.ok(histCreates.some((c: any) => c.data?.changedBy === 'u-1' && c.data?.toStatus === 'processing'))
})
