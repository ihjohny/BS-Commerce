import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import { couponUsageEndpoint } from '../../../src/plugins/discounts/endpoints/coupon-usage.ts'

const handler = couponUsageEndpoint.handler

test('should return 403 for non-admin requests', async () => {
  const req = mockHandlerReq({
    user: { role: 'customer' },
    params: { id: 'coupon-1' },
  })
  const res = await handler(req)
  assert.equal(res.status, 403)
})

test('should return 400 when coupon id param is missing', async () => {
  const req = mockHandlerReq({
    user: { role: 'admin' },
    params: {},
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 404 when coupon is not found', async () => {
  const req = mockHandlerReq({
    user: { role: 'admin' },
    params: { id: 'missing' },
    payloadOverrides: {
      findByID: async () => {
        throw new Error('not found')
      },
    } as any,
  })
  const res = await handler(req)
  assert.equal(res.status, 404)
})

test('should return usage summary for existing coupon', async () => {
  const req = mockHandlerReq({
    user: { role: 'admin' },
    params: { id: 'coupon-1' },
    payloadOverrides: {
      find: async () => ({
        totalDocs: 2,
        docs: [
          { id: 'o-1', orderNumber: 'ORD-1', customer: 'u-1', discountTotal: 10, grandTotal: 90, createdAt: '2026-01-01' },
          { id: 'o-2', orderNumber: 'ORD-2', customer: 'u-2', discountTotal: 15, grandTotal: 85, createdAt: '2026-01-02' },
        ],
      }),
    } as any,
  })
  req.payload.findByID = async () => ({
    id: 'coupon-1',
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    isActive: true,
    totalUses: 2,
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.usage.totalRedemptions, 2)
  assert.equal(json.usage.totalDiscountGiven, 25)
  assert.equal(json.usage.sampledOrders.length, 2)
})
