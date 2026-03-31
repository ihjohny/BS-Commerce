import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../_helpers/mock-request.ts'
// @ts-ignore
import { mockReq } from '../_helpers/mock-payload.ts'
// @ts-ignore
import { verifyIdentifierAdminEndpoint } from '../../src/plugins/verification/endpoints/verify-identifier-admin.ts'
// @ts-ignore
import { createOrdersConfig } from '../../src/plugins/orders/collections/orders.ts'
// @ts-ignore
import { SubOrders } from '../../src/plugins/orders/collections/sub-orders.ts'

const adminVerifyHandler = verifyIdentifierAdminEndpoint.handler

test('should deny customer access to admin-only function endpoint (API5/BFLA)', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'target@example.com' },
    user: { id: 'customer-1', role: 'customer' },
  })
  const res = await adminVerifyHandler(req)
  assert.equal(res.status, 403)
})

test('should deny vendor create permission on orders collection (API5/BFLA)', () => {
  const Orders = createOrdersConfig(true)
  const canCreate = Orders.access?.create
  assert.equal(typeof canCreate, 'function')
  const result = (canCreate as any)({ req: mockReq({ id: 'vendor-1', role: 'vendor', tenant: 'tenant-1' }) })
  assert.equal(result, false)
})

test('should deny vendor delete permission on sub-orders collection (API5/BFLA)', () => {
  const canDelete = SubOrders.access?.delete
  assert.equal(typeof canDelete, 'function')
  const result = (canDelete as any)({ req: mockReq({ id: 'vendor-1', role: 'vendor', tenant: 'tenant-1' }) })
  assert.equal(result, false)
})

test('should scope vendor update permission to own tenant only on sub-orders (API5/BFLA)', () => {
  const canUpdate = SubOrders.access?.update
  assert.equal(typeof canUpdate, 'function')
  const result = (canUpdate as any)({ req: mockReq({ id: 'vendor-1', role: 'vendor', tenant: { id: 'tenant-1' } }) })
  assert.deepEqual(result, { tenant: { equals: 'tenant-1' } })
})
