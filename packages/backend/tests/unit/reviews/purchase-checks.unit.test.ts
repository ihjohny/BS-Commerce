import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockPayload } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { userPurchasedProduct, userPurchasedTenant } from '../../../src/plugins/reviews/lib/purchase-checks.ts'

let envBackup: string | undefined
beforeEach(() => { envBackup = process.env.MULTIVENDOR_ENABLED })
afterEach(() => {
  if (envBackup === undefined) delete process.env.MULTIVENDOR_ENABLED
  else process.env.MULTIVENDOR_ENABLED = envBackup
})

// --- userPurchasedProduct (single vendor mode) ---

test('should return true when user has fulfilled order with the product', async () => {
  delete process.env.MULTIVENDOR_ENABLED
  let callIdx = 0
  const payload = mockPayload({
    find: async () => {
      callIdx++
      if (callIdx === 1) return { docs: [{ id: 'o-1' }] }
      return { docs: [{ id: 'oi-1' }], totalDocs: 1 }
    },
  })
  // @ts-ignore
  payload.findByID = async () => ({ id: 'p-1', tenant: null })
  const result = await userPurchasedProduct({ payload: payload as any, userId: 'u-1', productId: 'p-1' })
  assert.equal(result, true)
})

test('should return false when user has no fulfilled orders', async () => {
  delete process.env.MULTIVENDOR_ENABLED
  const payload = mockPayload({ find: async () => ({ docs: [], totalDocs: 0 }) })
  // @ts-ignore
  payload.findByID = async () => ({ id: 'p-1', tenant: null })
  const result = await userPurchasedProduct({ payload: payload as any, userId: 'u-1', productId: 'p-1' })
  assert.equal(result, false)
})

test('should return false when product not in any order items', async () => {
  delete process.env.MULTIVENDOR_ENABLED
  let callIdx = 0
  const payload = mockPayload({
    find: async () => {
      callIdx++
      if (callIdx === 1) return { docs: [{ id: 'o-1' }] }
      return { docs: [], totalDocs: 0 }
    },
  })
  // @ts-ignore
  payload.findByID = async () => ({ id: 'p-1', tenant: null })
  const result = await userPurchasedProduct({ payload: payload as any, userId: 'u-1', productId: 'p-1' })
  assert.equal(result, false)
})

// --- userPurchasedTenant ---

test('should return true when user has fulfilled sub-order for tenant', async () => {
  let callIdx = 0
  const payload = mockPayload({
    find: async () => {
      callIdx++
      if (callIdx === 1) return { docs: [{ id: 'o-1' }] }
      return { docs: [{ id: 'so-1' }], totalDocs: 1 }
    },
  })
  const result = await userPurchasedTenant({ payload: payload as any, userId: 'u-1', tenantId: 't-1' })
  assert.equal(result, true)
})

test('should return false when user has no fulfilled sub-orders for tenant', async () => {
  let callIdx = 0
  const payload = mockPayload({
    find: async () => {
      callIdx++
      if (callIdx === 1) return { docs: [{ id: 'o-1' }] }
      return { docs: [], totalDocs: 0 }
    },
  })
  const result = await userPurchasedTenant({ payload: payload as any, userId: 'u-1', tenantId: 't-1' })
  assert.equal(result, false)
})

// --- userPurchasedProduct (multivendor + tenant-owned product) ---

test('should return true when MV tenant product was in a fulfilled sub-order for customer', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  const payload = mockPayload({
    find: async (args: Record<string, unknown>) => {
      const col = args.collection as string
      if (col === 'orders') {
        return { docs: [{ id: 'parent-1' }] }
      }
      if (col === 'sub-orders') {
        return { docs: [{ id: 'so-1' }] }
      }
      if (col === 'order-items') {
        return { docs: [{ id: 'oi-1' }], totalDocs: 1 }
      }
      return { docs: [], totalDocs: 0 }
    },
  })
  ;(payload as any).findByID = async () => ({ id: 'p-1', tenant: { id: 'tenant-a' } })
  const result = await userPurchasedProduct({ payload: payload as any, userId: 'u-1', productId: 'p-1' })
  assert.equal(result, true)
})

test('should return false in MV when customer has no orders', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  const payload = mockPayload({
    find: async (args: Record<string, unknown>) => {
      if (args.collection === 'orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })
  ;(payload as any).findByID = async () => ({ id: 'p-1', tenant: 'tenant-x' })
  const result = await userPurchasedProduct({ payload: payload as any, userId: 'u-1', productId: 'p-1' })
  assert.equal(result, false)
})

test('should return false in MV when no fulfilled sub-orders for tenant', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  let ordersCalls = 0
  const payload = mockPayload({
    find: async (args: Record<string, unknown>) => {
      const col = args.collection as string
      if (col === 'orders') {
        ordersCalls++
        return { docs: [{ id: 'o-1' }] }
      }
      if (col === 'sub-orders') return { docs: [] }
      return { docs: [], totalDocs: 0 }
    },
  })
  ;(payload as any).findByID = async () => ({ id: 'p-1', tenant: { id: 't-1' } })
  const result = await userPurchasedProduct({ payload: payload as any, userId: 'u-1', productId: 'p-1' })
  assert.equal(result, false)
  assert.equal(ordersCalls, 1)
})

test('should return false in MV when product not in fulfilled sub-order line items', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  const payload = mockPayload({
    find: async (args: Record<string, unknown>) => {
      const col = args.collection as string
      if (col === 'orders') return { docs: [{ id: 'o-1' }] }
      if (col === 'sub-orders') return { docs: [{ id: 'so-1' }] }
      if (col === 'order-items') return { docs: [], totalDocs: 0 }
      return { docs: [], totalDocs: 0 }
    },
  })
  ;(payload as any).findByID = async () => ({ id: 'p-1', tenant: { id: 't-1' } })
  const result = await userPurchasedProduct({ payload: payload as any, userId: 'u-1', productId: 'p-1' })
  assert.equal(result, false)
})
