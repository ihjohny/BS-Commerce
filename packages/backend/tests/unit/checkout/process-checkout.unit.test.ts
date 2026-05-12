import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { processCheckout } from '../../../src/lib/process-checkout.ts'

let envBackups: Record<string, string | undefined> = {}
const envKeys = [
  'MULTIVENDOR_ENABLED',
  'INVENTORY_ENABLED',
  'REQUIRE_VERIFIED_FOR_CHECKOUT',
  'DEFAULT_COMMISSION_RATE',
  'BS_TEST_ORDER_EMAIL_REJECT',
  'PAYMENT_PROVIDER',
  'SSLCOMMERZ_STORE_ID',
  'SSLCOMMERZ_STORE_PASSWORD',
  'SSLCOMMERZ_SESSION_ENABLED',
  'SSLCOMMERZ_SANDBOX',
  'NEXT_PUBLIC_STOREFRONT_URL',
  'AUTH_REQUIRED_IDENTIFIER',
  'DEFAULT_PHONE_REGION',
  'PHONE_VALIDATION_REGEX',
]
beforeEach(() => {
  envBackups = {}
  for (const k of envKeys) envBackups[k] = process.env[k]
  process.env.INVENTORY_ENABLED = 'false'
  process.env.AUTH_REQUIRED_IDENTIFIER = 'either'
})
afterEach(() => { for (const k of envKeys) { if (envBackups[k] === undefined) delete process.env[k]; else process.env[k] = envBackups[k] } })

function buildPayload(overrides: Record<string, Function> = {}) {
  const calls: Record<string, any[]> = { find: [], findByID: [], create: [], update: [], delete: [] }
  const defaultProduct = { id: 'prod-1', name: 'Test', slug: 'test-product', basePrice: 50, tenant: null }

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
      if (args.collection === 'stock-levels') {
        return { id: args.id, reservedQuantity: 0, quantity: 999 }
      }
      if (args.collection === 'shipping-methods') {
        return { id: args.id, name: 'Standard fulfilment', isActive: true, collectPaymentOnDelivery: true }
      }
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

test('should persist productSlug snapshot on order-items when product has slug', async () => {
  const payload = buildPayload()
  const result = await processCheckout(
    payload,
    { ...baseInput, guestEmail: 'slug@test.com' },
    undefined,
    guestReq(),
  )
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates.length, 1)
  assert.equal(itemCreates[0].data.productSlug, 'test-product')
})

test('should return error when guest has neither email nor qualifying phone', async () => {
  const payload = buildPayload()
  const result = await processCheckout(payload, { ...baseInput }, undefined, guestReq())
  assert.equal(result.statusCode, 400)
  assert.ok(
    result.error?.includes('guestEmail') ||
      result.error?.includes('guestPhone') ||
      result.error?.includes('email') ||
      result.error?.includes('phone'),
  )
})

test('should return error when guest phone is too short', async () => {
  const payload = buildPayload()
  const result = await processCheckout(
    payload,
    { ...baseInput, guestPhone: '1234' },
    undefined,
    guestReq(),
  )
  assert.equal(result.statusCode, 400)
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
  const orderCreate = payload._calls.create.find((c: any) => c.collection === 'orders')
  assert.ok(orderCreate)
  assert.equal(orderCreate.data.checkoutPaymentChannel, 'online')
  assert.equal(result.order.checkoutPaymentChannel, 'online')
  assert.equal(result.order.paymentStatus, 'unpaid')
})

test('should process guest checkout with phone only when phone is valid for shipping country', async () => {
  const payload = buildPayload()
  const result = await processCheckout(
    payload,
    { ...baseInput, guestPhone: ' +12025551234 ' },
    undefined,
    guestReq(),
  )
  assert.ok(result.order.id)
  assert.ok(result.order.orderNumber)
  assert.equal(result.error, undefined)
})

test('should persist guestPhone and buyerSnapshot phone as E.164 for national BD input', async () => {
  const payload = buildPayload()
  const bdShipping = { firstName: 'A', lastName: 'B', street1: '1 St', city: 'Dhaka', country: 'BD' }
  const result = await processCheckout(
    payload,
    {
      ...baseInput,
      shippingAddress: bdShipping,
      billingAddress: bdShipping,
      guestPhone: '01712345678',
    },
    undefined,
    guestReq(),
  )
  assert.equal(result.error, undefined)
  assert.equal(result.order.guestPhone, '+8801712345678')
  const orderCreate = payload._calls.create.find((c: any) => c.collection === 'orders')
  assert.ok(orderCreate)
  assert.equal(orderCreate.data.guestPhone, '+8801712345678')
  assert.equal(orderCreate.data.buyerSnapshot.phone, '+8801712345678')
})

test('should process COD checkout without payment redirect when cashOnDelivery validates', async () => {
  process.env.PAYMENT_PROVIDER = 'sslcommerz'
  process.env.SSLCOMMERZ_SESSION_ENABLED = 'false'
  const payload = buildPayload()
  const result = await processCheckout(
    payload,
    {
      ...baseInput,
      guestEmail: 'cod@guest.com',
      shippingMethodIds: ['sm-cod-1'],
      cashOnDelivery: true,
    },
    undefined,
    guestReq(),
  )
  assert.equal(result.error, undefined)
  assert.ok(result.order.orderNumber)
  assert.ok(!result.paymentRedirectUrl)
  const orderCreate = payload._calls.create.find((c: any) => c.collection === 'orders')
  assert.ok(orderCreate)
  assert.equal(orderCreate.data.checkoutPaymentChannel, 'cash_on_delivery')
  assert.equal(result.order.checkoutPaymentChannel, 'cash_on_delivery')
  assert.equal(result.order.paymentStatus, 'unpaid')
})

test('should reject cashOnDelivery when shipping method does not collect on delivery', async () => {
  const payload = buildPayload()
  const origFind = payload.findByID
  payload.findByID = async (args: any) => {
    if (args.collection === 'shipping-methods') {
      payload._calls.findByID.push(args)
      return { id: args.id, name: 'Standard Courier', isActive: true, collectPaymentOnDelivery: false }
    }
    return origFind(args)
  }
  const result = await processCheckout(
    payload,
    {
      ...baseInput,
      guestEmail: 'cod@guest.com',
      shippingMethodIds: ['sm-x'],
      cashOnDelivery: true,
    },
    undefined,
    guestReq(),
  )
  assert.equal(result.statusCode, 400)
  assert.ok(String(result.error).includes('cashOnDelivery'))
})

test('should reject phone-only guest when AUTH_REQUIRED_IDENTIFIER is email', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'email'
  const payload = buildPayload()
  const result = await processCheckout(
    payload,
    { ...baseInput, guestPhone: '+880171112233' },
    undefined,
    guestReq(),
  )
  assert.equal(result.statusCode, 400)
})

test('should copy cart customerNote onto order notes', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          customerNote: 'Leave at reception.',
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') {
        return { id: args.id, name: 'Test', basePrice: 50, tenant: null }
      }
      if (args.collection === 'users') return { id: args.id, email: 'u@test.com', emailVerified: true }
      return { id: args.id }
    },
  })
  await processCheckout(
    payload,
    { ...baseInput, guestEmail: 'guest@test.com' },
    undefined,
    guestReq(),
  )
  const orderCreate = payload._calls.create.find((c: any) => c.collection === 'orders')
  assert.ok(orderCreate)
  assert.equal(orderCreate.data.notes, 'Leave at reception.')
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

test('when multivendor and inventory enabled, should set stockLevel on vendor and platform line items', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  process.env.INVENTORY_ENABLED = 'true'
  process.env.DEFAULT_COMMISSION_RATE = '10'

  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'stock-levels' && args.id === 'sl-v-t1') {
        return { id: 'sl-v-t1', reservedQuantity: 0, quantity: 100 }
      }
      if (args.collection === 'stock-levels' && args.id === 'sl-plat') {
        return { id: 'sl-plat', reservedQuantity: 0, quantity: 100 }
      }
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
      if (args.collection === 'stock-levels') return { id: args.id, reservedQuantity: 0, quantity: 999 }
      return { id: args.id }
    },
    find: async (args: any) => {
      if (args.collection === 'stock-levels') {
        const pid = args.where?.product?.equals
        if (pid === 'p-v') {
          return {
            docs: [
              {
                id: 'sl-v-t1',
                product: 'p-v',
                variant: null,
                quantity: 100,
                reservedQuantity: 0,
                location: { tenant: { id: 't-1' } },
              },
            ],
          }
        }
        if (pid === 'p-plat') {
          return {
            docs: [
              {
                id: 'sl-plat',
                product: 'p-plat',
                variant: null,
                quantity: 100,
                reservedQuantity: 0,
                location: { tenant: null },
              },
            ],
          }
        }
        return { docs: [] }
      }
      if (args.collection === 'vendor-settings') return { docs: [] }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })

  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'mv-inv@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)

  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates.length, 2)
  const vendorLine = itemCreates.find((c: any) => c.data.product === 'p-v')
  const platLine = itemCreates.find((c: any) => c.data.product === 'p-plat')
  assert.equal(vendorLine?.data.stockLevel, 'sl-v-t1')
  assert.equal(platLine?.data.stockLevel, 'sl-plat')

  const stockUpdates = payload._calls.update.filter((c: any) => c.collection === 'stock-levels')
  assert.equal(stockUpdates.length, 2)
})

test('should reserve stock when matching stock-level exists', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-1',
              product: 'prod-1',
              variant: null,
              quantity: 100,
              reservedQuantity: 1,
              location: { tenant: null },
            },
          ],
        }
      }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
    findByID: async (args: any) => {
      if (args.collection === 'stock-levels' && args.id === 'sl-1') {
        return { id: 'sl-1', reservedQuantity: 1, quantity: 100 }
      }
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, quantity: 2, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'Test', basePrice: 50, tenant: null }
      if (args.collection === 'users') return { id: args.id, email: 'u@test.com', emailVerified: true }
      if (args.collection === 'stock-levels') return { id: args.id, reservedQuantity: 0, quantity: 999 }
      return { id: args.id }
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

test('should allow admin to checkout a cart owned by another customer', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          user: { id: 'customer-other' },
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      return { id: args.id }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'admin-1', role: 'admin' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput }, 'admin-1', req)
  assert.equal(result.error, undefined)
})

test('should treat cart.user as id when stored as string for authenticated checkout', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          user: 'user-1',
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      return { id: args.id }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'user-1', role: 'customer' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput }, 'user-1', req)
  assert.equal(result.error, undefined)
})

test('should resolve variant id when cart line stores variant as string', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, variant: 'var-str', quantity: 1, unitPrice: 1 }],
        }
      }
      if (args.collection === 'products') {
        return { id: 'prod-1', name: 'P', basePrice: 50, sku: 'PSKU', tenant: null }
      }
      if (args.collection === 'product-variants' && args.id === 'var-str') {
        return { id: 'var-str', name: 'VarStr', sku: 'VSKU', price: 44, product: 'prod-1' }
      }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'varstr@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates[0].data.unitPrice, 44)
  assert.ok(String(itemCreates[0].data.variant || '').includes('var-str'))
})

test('should match idempotency when existing order customer id is a string', async () => {
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'orders' && args.where?.idempotencyKey) {
        return {
          docs: [
            {
              id: 'o-idem',
              orderNumber: 'ORD-IDEM',
              customer: 'user-1',
            },
          ],
        }
      }
      return { docs: [] }
    },
  })
  const req = { headers: { get: () => null }, user: { id: 'user-1', role: 'customer' }, context: {} } as any
  const result = await processCheckout(
    payload,
    { ...baseInput, idempotencyKey: '123e4567-e89b-12d3-a456-426614174000' },
    'user-1',
    req,
  )
  assert.equal(result.order.id, 'o-idem')
  assert.equal(result.error, undefined)
})

test('should resolve product id when cart line stores product as string', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: 'prod-str', quantity: 1, unitPrice: 10 }],
        }
      }
      if (args.collection === 'products' && args.id === 'prod-str') {
        return { id: 'prod-str', name: 'Str', basePrice: 10, sku: 'SKU', tenant: null }
      }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates[0].data.product, 'prod-str')
})

test('should record string and object tenant ids on sub-order line items when multivendor is on', async () => {
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
            { product: { id: 'p1' }, quantity: 1, unitPrice: 10 },
            { product: { id: 'p2' }, quantity: 1, unitPrice: 10 },
          ],
        }
      }
      if (args.collection === 'products' && args.id === 'p1') {
        return { id: 'p1', name: 'A', basePrice: 10, sku: 'a', tenant: 'tenant-string' }
      }
      if (args.collection === 'products' && args.id === 'p2') {
        return { id: 'p2', name: 'B', basePrice: 10, sku: 'b', tenant: { id: 'tenant-obj' } }
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
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'tenantmv@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  const tenants = itemCreates.map((c: any) => c.data.tenant).filter(Boolean)
  assert.ok(tenants.includes('tenant-string'))
  assert.ok(tenants.includes('tenant-obj'))
})

test('should keep line unitPrice when variant id is set but variant document is missing', async () => {
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
              variant: { id: 'var-gone' },
              quantity: 1,
              unitPrice: 77,
            },
          ],
        }
      }
      if (args.collection === 'products') {
        return { id: 'prod-1', name: 'P', basePrice: 50, sku: 'P', tenant: null }
      }
      if (args.collection === 'product-variants') return null
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'v@t.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates[0].data.unitPrice, 77)
})

test('should default quantity to 1 when line quantity is zero', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, quantity: 0, unitPrice: 10 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 10, tenant: null }
      return { id: args.id }
    },
  })
  await processCheckout(payload, { ...baseInput, guestEmail: 'q@t.com' }, undefined, guestReq())
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates[0].data.quantity, 1)
})

test('should persist idempotencyKey on new order create', async () => {
  const key = '123e4567-e89b-12d3-a456-426614174000'
  const payload = buildPayload()
  await processCheckout(payload, { ...baseInput, guestEmail: 'idem@t.com', idempotencyKey: key }, undefined, guestReq())
  const orderCreate = payload._calls.create.find((c: any) => c.collection === 'orders')
  assert.equal(orderCreate.data.idempotencyKey, key)
})

test('should use pending in status history when created order has no status field', async () => {
  const payload = buildPayload({
    create: async (args: any) => {
      if (args.collection === 'orders') return { id: 'order-1' }
      if (args.collection === 'order-items') return { id: `oi-${Math.random()}` }
      if (args.collection === 'order-status-history') return { id: 'osh-1' }
      if (args.collection === 'transactions') return { id: 'txn-1' }
      return { id: 'x' }
    },
  })
  await processCheckout(payload, { ...baseInput, guestEmail: 'hist@t.com' }, undefined, guestReq())
  const hist = payload._calls.create.find((c: any) => c.collection === 'order-status-history')
  assert.equal(hist.data.toStatus, 'pending')
})

test('should reserve stock matching product and variant on stock level', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-v',
              product: 'prod-1',
              variant: 'var-1',
              quantity: 50,
              reservedQuantity: 1,
              location: { tenant: null },
            },
          ],
        }
      }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
    findByID: async (args: any) => {
      if (args.collection === 'stock-levels' && args.id === 'sl-v') {
        return { id: 'sl-v', reservedQuantity: 1, quantity: 50 }
      }
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [
            {
              product: { id: 'prod-1' },
              variant: { id: 'var-1' },
              quantity: 2,
              unitPrice: 10,
            },
          ],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 10, tenant: null }
      if (args.collection === 'product-variants') {
        return { id: 'var-1', price: 10, sku: 'V1' }
      }
      if (args.collection === 'stock-levels') return { id: args.id, reservedQuantity: 0, quantity: 999 }
      return { id: args.id }
    },
  })
  await processCheckout(payload, { ...baseInput, guestEmail: 'sv@t.com' }, undefined, guestReq())
  const stockUpdates = payload._calls.update.filter((c: any) => c.collection === 'stock-levels')
  assert.equal(stockUpdates.length, 1)
  assert.equal(stockUpdates[0].data.reservedQuantity, 3)
})

test('should return error when product lookup returns null', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'missing-prod' }, quantity: 1, unitPrice: 10 }],
        }
      }
      if (args.collection === 'products' && args.id === 'missing-prod') return null
      return { id: args.id, name: 'P', basePrice: 10, tenant: null }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq())
  assert.ok(result.error?.includes('missing-prod') || result.error?.includes('not found'))
})

test('should propagate when cart fetch throws a non-NotFound error', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') throw new Error('database connection lost')
      return { id: args.id }
    },
  })
  await assert.rejects(
    () => processCheckout(payload, { ...baseInput, guestEmail: 'g@t.com' }, undefined, guestReq()),
    /database connection lost/,
  )
})

test('should use empty base req when transaction id is set and req is undefined', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          user: { id: 'user-1' },
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput }, 'user-1', undefined)
  assert.equal(result.error, undefined)
})

test('should use empty req when transaction is null and req is undefined', async () => {
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
  payload.db.beginTransaction = async () => null
  const req = { headers: { get: () => null }, user: { id: 'u-1', role: 'customer' }, context: {} } as any
  const result = await processCheckout(payload, { ...baseInput }, 'u-1', undefined)
  assert.equal(result.error, undefined)
})

test('should use base price null coalesce when product has no variant and basePrice null', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 12 }],
        }
      }
      if (args.collection === 'products') {
        return { id: 'prod-1', name: 'P', basePrice: null as any, sku: 'S', tenant: null }
      }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'bpnull@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates[0].data.unitPrice, 12)
})

test('should resolve tenant id when product tenant is object without id', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 10 }],
        }
      }
      if (args.collection === 'products') {
        return { id: 'prod-1', name: 'NoTenantId', basePrice: 10, sku: 'S', tenant: {} as any }
      }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'tn@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
})

test('should fall back to product sku and unit price when variant lacks sku and price', async () => {
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
              variant: { id: 'var-min' },
              quantity: 1,
              unitPrice: 88,
            },
          ],
        }
      }
      if (args.collection === 'products') {
        return { id: 'prod-1', name: 'P', basePrice: 50, sku: 'PSKU', tenant: null }
      }
      if (args.collection === 'product-variants') {
        return { id: 'var-min', name: 'V', product: 'prod-1' } as any
      }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'vf@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates[0].data.sku, 'PSKU')
  assert.equal(itemCreates[0].data.unitPrice, 88)
})

test('should use Product fallback when product name is missing', async () => {
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, quantity: 1, unitPrice: 10 }],
        }
      }
      if (args.collection === 'products') {
        return { id: 'prod-1', basePrice: 10, sku: 'X', tenant: null } as any
      }
      return { id: args.id }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'nm@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  assert.equal(itemCreates[0].data.productName, 'Product')
})

test('should omit orderUpdateData subOrders when multivendor has only platform items', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  process.env.DEFAULT_COMMISSION_RATE = '10'
  const payload = buildPayload({
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'p-plat' }, quantity: 1, unitPrice: 5 }],
        }
      }
      if (args.collection === 'products') {
        return { id: 'p-plat', name: 'Platform', basePrice: 5, sku: 'P', tenant: null }
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
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'platonly@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const orderUpdate = payload._calls.update.find((c: any) => c.collection === 'orders' && c.data?.items?.length)
  assert.ok(orderUpdate)
  assert.equal(orderUpdate.data.subOrders, undefined)
})

test('should attach variant to sub-order and platform multivendor line items', async () => {
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
            {
              product: { id: 'p-v' },
              variant: { id: 'var-v' },
              quantity: 1,
              unitPrice: 10,
            },
            {
              product: { id: 'p-plat' },
              variant: { id: 'var-p' },
              quantity: 1,
              unitPrice: 5,
            },
          ],
        }
      }
      if (args.collection === 'products') {
        if (args.id === 'p-v') {
          return { id: 'p-v', name: 'V', basePrice: 100, sku: 'VS', tenant: { id: 't-1' } }
        }
        return { id: 'p-plat', name: 'Plat', basePrice: 20, sku: 'PS', tenant: null }
      }
      if (args.collection === 'product-variants') {
        if (args.id === 'var-v') return { id: 'var-v', price: 11, sku: 'VSKU', product: 'p-v' }
        if (args.id === 'var-p') return { id: 'var-p', price: 6, sku: 'PSKU2', product: 'p-plat' }
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
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'varmv@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const itemCreates = payload._calls.create.filter((c: any) => c.collection === 'order-items')
  const withVariant = itemCreates.filter((c: any) => c.data.variant != null)
  assert.equal(withVariant.length, 2)
})

test('should increment coupon uses when totalUses is undefined on stored coupon', async () => {
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
      if (args.collection === 'coupons') return { id: 'cpn-1', code: 'SAVE10' }
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
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'cpndef@test.com' }, undefined, guestReq())
  assert.equal(result.error, undefined)
  const couponUpdates = payload._calls.update.filter((c: any) => c.collection === 'coupons')
  assert.equal(couponUpdates[0].data.totalUses, 1)
})

test('should reserve stock when stock level uses object ids', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-obj',
              product: { id: 'prod-1' },
              variant: { id: 'var-1' },
              quantity: 50,
              reservedQuantity: 0,
              location: { tenant: null },
            },
          ],
        }
      }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
    findByID: async (args: any) => {
      if (args.collection === 'stock-levels' && args.id === 'sl-obj') {
        return { id: 'sl-obj', reservedQuantity: 0, quantity: 50 }
      }
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [
            {
              product: { id: 'prod-1' },
              variant: { id: 'var-1' },
              quantity: 2,
              unitPrice: 10,
            },
          ],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 10, tenant: null }
      if (args.collection === 'product-variants') return { id: 'var-1', price: 10, sku: 'V1' }
      if (args.collection === 'stock-levels') return { id: args.id, reservedQuantity: 0, quantity: 999 }
      return { id: args.id }
    },
  })
  await processCheckout(payload, { ...baseInput, guestEmail: 'slobj@test.com' }, undefined, guestReq())
  const stockUpdates = payload._calls.update.filter((c: any) => c.collection === 'stock-levels')
  assert.equal(stockUpdates.length, 1)
  assert.equal(stockUpdates[0].data.reservedQuantity, 2)
})

test('should return error when no stock level row matches product variant', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-x',
              product: 'prod-1',
              variant: 'other-variant',
              quantity: 10,
              reservedQuantity: 0,
              location: { tenant: null },
            },
          ],
        }
      }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })
  const result = await processCheckout(payload, { ...baseInput, guestEmail: 'slmiss@test.com' }, undefined, guestReq())
  assert.equal(result.statusCode, 400)
  assert.ok(result.error?.includes('stock') || result.error?.includes('warehouse'))
})

test('should skip stock reserve update when stock-level doc missing at reserve time', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const payload = buildPayload({
    find: async (args: any) => {
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-m',
              product: 'prod-1',
              variant: null,
              quantity: 100,
              reservedQuantity: 0,
              location: { tenant: null },
            },
          ],
        }
      }
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
    findByID: async (args: any) => {
      if (args.collection === 'carts') {
        return {
          id: 'cart-1',
          guestId: 'guest-abc',
          user: null,
          items: [{ product: { id: 'prod-1' }, quantity: 2, unitPrice: 50 }],
        }
      }
      if (args.collection === 'products') return { id: 'prod-1', name: 'P', basePrice: 50, tenant: null }
      if (args.collection === 'stock-levels' && args.id === 'sl-m') return null
      if (args.collection === 'stock-levels') return { id: args.id, reservedQuantity: 0, quantity: 999 }
      return { id: args.id }
    },
  })
  await processCheckout(payload, { ...baseInput, guestEmail: 'resgap@test.com' }, undefined, guestReq())
  const stockUpdates = payload._calls.update.filter((c: any) => c.collection === 'stock-levels')
  assert.equal(stockUpdates.length, 0)
})

test('should log when order confirmation email promise rejects', async () => {
  process.env.BS_TEST_ORDER_EMAIL_REJECT = 'true'
  const errors: string[] = []
  const orig = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  }
  try {
    const payload = buildPayload()
    await processCheckout(
      payload,
      { ...baseInput, guestEmail: 'notify@test.com', simulatePayment: true },
      undefined,
      guestReq(),
    )
    // sendOrderConfirmationEmail is fire-and-forget; flush microtasks so .catch(console.error) runs
    await new Promise<void>((resolve) => setImmediate(resolve))
  } finally {
    console.error = orig
    delete process.env.BS_TEST_ORDER_EMAIL_REJECT
  }
  assert.ok(errors.some((e) => e.includes('Failed to send order email')))
})

test('should return 501 when PAYMENT_PROVIDER is stripe and simulatePayment is false', async () => {
  process.env.PAYMENT_PROVIDER = 'stripe'
  try {
    const payload = buildPayload()
    const result = await processCheckout(
      payload,
      { ...baseInput, guestEmail: 'stripe@test.com', simulatePayment: false },
      undefined,
      guestReq(),
    )
    assert.equal(result.statusCode, 501)
    assert.ok(result.error?.includes('Stripe'))
  } finally {
    delete process.env.PAYMENT_PROVIDER
  }
})

test('should return 503 when PAYMENT_PROVIDER is sslcommerz but hosted session is not enabled', async () => {
  process.env.PAYMENT_PROVIDER = 'sslcommerz'
  delete process.env.SSLCOMMERZ_SESSION_ENABLED
  delete process.env.SSLCOMMERZ_STORE_ID
  delete process.env.SSLCOMMERZ_STORE_PASSWORD
  try {
    const payload = buildPayload()
    const result = await processCheckout(
      payload,
      { ...baseInput, guestEmail: 'ssl@test.com', simulatePayment: false },
      undefined,
      guestReq(),
    )
    assert.equal(result.statusCode, 503)
    assert.ok(result.error?.includes('SSL Commerz'))
  } finally {
    delete process.env.PAYMENT_PROVIDER
  }
})
