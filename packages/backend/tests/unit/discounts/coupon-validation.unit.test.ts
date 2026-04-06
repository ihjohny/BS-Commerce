import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockPayload } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { validateCouponForSubtotal } from '../../../src/plugins/discounts/lib/coupon.ts'

function couponDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1', code: 'SAVE10', type: 'percentage', value: 10,
    isActive: true, expiresAt: null, minOrderValue: null,
    maxTotalUses: null, maxUsesPerUser: null, totalUses: 0,
    ...overrides,
  }
}

test('should return invalid when no coupon code provided', async () => {
  const payload = mockPayload()
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: '', subtotal: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('No coupon'))
})

test('should return invalid when coupon code is not a string', async () => {
  const payload = mockPayload()
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: null as any, subtotal: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('No coupon'))
})

test('should return invalid when coupon not found', async () => {
  const payload = mockPayload({ find: async () => ({ docs: [] }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'UNKNOWN', subtotal: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('not found'))
})

test('should return invalid when coupon is inactive', async () => {
  const payload = mockPayload({ find: async () => ({ docs: [couponDoc({ isActive: false })] }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'SAVE10', subtotal: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('inactive'))
})

test('should return invalid when coupon is expired', async () => {
  const pastDate = new Date(Date.now() - 86400000).toISOString()
  const payload = mockPayload({ find: async () => ({ docs: [couponDoc({ expiresAt: pastDate })] }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'SAVE10', subtotal: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('expired'))
})

test('should return invalid when subtotal is below minimum order value', async () => {
  const payload = mockPayload({ find: async () => ({ docs: [couponDoc({ minOrderValue: 200 })] }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'SAVE10', subtotal: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('Minimum'))
})

test('should return invalid when max total uses reached', async () => {
  const payload = mockPayload({ find: async () => ({ docs: [couponDoc({ maxTotalUses: 5, totalUses: 5 })] }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'SAVE10', subtotal: 100 })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('limit'))
})

test('should return invalid when user exceeded per-user limit', async () => {
  let callCount = 0
  const payload = mockPayload({
    find: async () => {
      callCount++
      if (callCount === 1) return { docs: [couponDoc({ maxUsesPerUser: 1 })] }
      return { docs: [], totalDocs: 1 }
    },
  })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'SAVE10', subtotal: 100, userId: 'u-1' })
  assert.equal(result.valid, false)
  assert.ok(result.discountReason?.includes('already used'))
})

test('should calculate percentage discount correctly', async () => {
  const payload = mockPayload({ find: async () => ({ docs: [couponDoc({ type: 'percentage', value: 15 })], totalDocs: 0 }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'SAVE10', subtotal: 200 })
  assert.equal(result.valid, true)
  assert.equal(result.discountTotal, 30)
})

test('should calculate fixed discount correctly', async () => {
  const payload = mockPayload({ find: async () => ({ docs: [couponDoc({ type: 'fixed', value: 25 })], totalDocs: 0 }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'FLAT25', subtotal: 100 })
  assert.equal(result.valid, true)
  assert.equal(result.discountTotal, 25)
})

test('should coerce missing coupon value to zero for percentage branch', async () => {
  const payload = mockPayload({
    find: async () => ({ docs: [couponDoc({ type: 'percentage', value: undefined as any })], totalDocs: 0 }),
  })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'PCT', subtotal: 100 })
  assert.equal(result.valid, true)
  assert.equal(result.discountTotal, 0)
})

test('should coerce missing coupon value to zero for fixed branch', async () => {
  const payload = mockPayload({
    find: async () => ({ docs: [couponDoc({ type: 'fixed', value: undefined as any })], totalDocs: 0 }),
  })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'FX', subtotal: 100 })
  assert.equal(result.valid, true)
  assert.equal(result.discountTotal, 0)
})

test('should cap discount at subtotal (no negative total)', async () => {
  const payload = mockPayload({ find: async () => ({ docs: [couponDoc({ type: 'fixed', value: 200 })], totalDocs: 0 }) })
  const result = await validateCouponForSubtotal({ payload: payload as any, couponCode: 'BIG', subtotal: 50 })
  assert.equal(result.valid, true)
  assert.equal(result.discountTotal, 50)
})

test('should skip per-user limit when userId is not provided', async () => {
  let ordersFindCalls = 0
  const payload = mockPayload({
    find: async (args: any) => {
      if (args.collection === 'coupons') {
        return { docs: [couponDoc({ maxUsesPerUser: 1 })], totalDocs: 1 }
      }
      if (args.collection === 'orders') {
        ordersFindCalls++
        return { docs: [], totalDocs: 99 }
      }
      return { docs: [], totalDocs: 0 }
    },
  })
  const result = await validateCouponForSubtotal({
    payload: payload as any,
    couponCode: 'SAVE10',
    subtotal: 100,
  })
  assert.equal(result.valid, true)
  assert.equal(ordersFindCalls, 0)
})

test('should normalize coupon code to uppercase', async () => {
  let findArgs: any = null
  const payload = mockPayload({
    find: async (args: any) => {
      findArgs = args
      return { docs: [couponDoc()], totalDocs: 0 }
    },
  })
  await validateCouponForSubtotal({ payload: payload as any, couponCode: '  save10  ', subtotal: 100 })
  assert.equal(findArgs.where.code.equals, 'SAVE10')
})
