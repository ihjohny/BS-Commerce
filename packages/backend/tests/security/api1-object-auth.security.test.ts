import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../_helpers/mock-payload.ts'
// @ts-ignore
import { isOrderOwnerOrAdmin } from '../../src/access/is-order-owner-or-admin.ts'
// @ts-ignore
import { SubOrders } from '../../src/plugins/orders/collections/sub-orders.ts'

test('should deny order read when request is unauthenticated (API1/BOLA)', async () => {
  const result = await isOrderOwnerOrAdmin({ req: mockReq(null) })
  assert.equal(result, false)
})

test('should scope customer order read to own customer id only (API1/BOLA)', async () => {
  const result = await isOrderOwnerOrAdmin({ req: mockReq({ id: 'customer-1', role: 'customer' }) })
  assert.deepEqual(result, { customer: { equals: 'customer-1' } })
})

test('should scope vendor order read to parent orders from vendor tenant only (API1/BOLA)', async () => {
  let findArgs: Record<string, unknown> | undefined
  const req = mockReq(
    { id: 'vendor-1', role: 'vendor', tenant: { id: 'tenant-1' } },
    {
      find: async (args) => {
        findArgs = args
        return {
          docs: [
            { parentOrder: 'order-1' },
            { parentOrder: { id: 'order-2' } },
            { parentOrder: 'order-1' },
          ],
        }
      },
    },
  )

  const result = await isOrderOwnerOrAdmin({ req })
  assert.deepEqual(result, { id: { in: ['order-1', 'order-2'] } })
  assert.equal(findArgs?.collection, 'sub-orders')
  assert.deepEqual((findArgs?.where as any)?.tenant, { equals: 'tenant-1' })
})

test('should deny vendor order read when tenant has no related sub-orders (API1/BOLA)', async () => {
  const req = mockReq(
    { id: 'vendor-2', role: 'vendor', tenant: 'tenant-empty' },
    { find: async () => ({ docs: [] }) },
  )
  const result = await isOrderOwnerOrAdmin({ req })
  assert.equal(result, false)
})

test('should deny sub-order read for non-vendor non-admin users (API1/BOLA)', () => {
  const readAccess = SubOrders.access?.read
  assert.equal(typeof readAccess, 'function')
  const result = (readAccess as any)({ req: mockReq({ id: 'customer-1', role: 'customer' }) })
  assert.equal(result, false)
})
