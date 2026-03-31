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
