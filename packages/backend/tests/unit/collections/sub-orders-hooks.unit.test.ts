import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { SubOrders } from '../../../src/plugins/orders/collections/sub-orders.ts'

const beforeChangeHook = SubOrders.hooks?.beforeChange?.[0] as any
const afterChangeHooks = SubOrders.hooks?.afterChange as any[]
function getParentDerivationHook() {
  const hook = (afterChangeHooks || []).find((fn: any) => {
    const src = String(fn)
    return src.includes('Derive parent order status') || src.includes('parentOrderId')
  })
  assert.ok(hook, 'parent-status derivation afterChange hook should exist')
  return hook as any
}

test('should allow valid sub-order status transition in beforeChange', () => {
  assert.ok(beforeChangeHook)
  const data = { status: 'confirmed' } as any
  const result = beforeChangeHook({ operation: 'update', data, originalDoc: { status: 'pending' } })
  assert.equal(result, data)
})

test('should reject invalid sub-order status transition in beforeChange', () => {
  assert.ok(beforeChangeHook)
  const data = { status: 'delivered' } as any
  assert.throws(
    () => beforeChangeHook({ operation: 'update', data, originalDoc: { status: 'pending' } }),
    /cannot change/i,
  )
})

test('should derive parent order status on sub-order update', async () => {
  const parentDerivationHook = getParentDerivationHook()
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async () => ({
        docs: [
          { id: 'sub-1', status: 'processing' },
          { id: 'sub-2', status: 'pending' },
        ],
      }),
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }

  const doc = { id: 'sub-1', status: 'shipped', parentOrder: 'order-1' }
  const previousDoc = { id: 'sub-1', status: 'processing' }
  await parentDerivationHook({ operation: 'update', doc, previousDoc, req })

  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].collection, 'orders')
  assert.equal(updateCalls[0].id, 'order-1')
  assert.equal(updateCalls[0].data.status, 'partially-shipped')
})
