import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { isOrderOwnerOrAdmin } from '../../../src/access/is-order-owner-or-admin.ts'

test('should return true when user is admin', async () => {
  const result = await isOrderOwnerOrAdmin({ req: mockReq({ role: 'admin' }) })
  assert.equal(result, true)
})

test('should return customer where clause when user is customer', async () => {
  const result = await isOrderOwnerOrAdmin({ req: mockReq({ id: 'c-1', role: 'customer' }) })
  assert.deepEqual(result, { customer: { equals: 'c-1' } })
})

test('should return order id filter when vendor has sub-orders for their tenant', async () => {
  const req = mockReq({ role: 'vendor', tenant: 'tenant-1' }, {
    find: async () => ({
      docs: [
        { parentOrder: 'order-1' },
        { parentOrder: 'order-2' },
        { parentOrder: 'order-1' },
      ],
    }),
  })
  const result = await isOrderOwnerOrAdmin({ req })
  assert.deepEqual(result, { id: { in: ['order-1', 'order-2'] } })
})

test('should handle vendor with object tenant reference', async () => {
  const req = mockReq({ role: 'vendor', tenant: { id: 'tenant-obj' } }, {
    find: async () => ({
      docs: [{ parentOrder: { id: 'order-3' } }],
    }),
  })
  const result = await isOrderOwnerOrAdmin({ req })
  assert.deepEqual(result, { id: { in: ['order-3'] } })
})

test('should return false when vendor has no sub-orders', async () => {
  const req = mockReq({ role: 'vendor', tenant: 'tenant-empty' }, {
    find: async () => ({ docs: [] }),
  })
  const result = await isOrderOwnerOrAdmin({ req })
  assert.equal(result, false)
})

test('should return false when vendor has no tenant', async () => {
  const result = await isOrderOwnerOrAdmin({ req: mockReq({ role: 'vendor' }) })
  assert.equal(result, false)
})

test('should return false when unauthenticated', async () => {
  const result = await isOrderOwnerOrAdmin({ req: mockReq(null) })
  assert.equal(result, false)
})

test('should return false when payload.find throws for vendor', async () => {
  const req = mockReq({ role: 'vendor', tenant: 'tenant-err' }, {
    find: async () => { throw new Error('DB error') },
  })
  const result = await isOrderOwnerOrAdmin({ req })
  assert.equal(result, false)
})
