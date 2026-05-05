import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  isCollectPaymentOnDeliveryShippingMethod,
  validateCashOnDeliveryShippingMethods,
} from '../../../src/lib/shipping/cash-on-delivery.ts'

function mockPayload(byId: Record<string, unknown>) {
  return {
    findByID: async (args: { id: string; collection: string }) => {
      if (args.collection !== 'shipping-methods') return null
      const doc = byId[args.id]
      return doc ?? null
    },
  } as unknown as import('payload').Payload
}

test('should report invalid when shippingMethodIds is empty', async () => {
  const err = await validateCashOnDeliveryShippingMethods(mockPayload({}), [])
  assert.equal(err, 'cashOnDelivery requires a non-empty shippingMethodIds array')
})

test('should allow COD when every method has collectPaymentOnDelivery', async () => {
  const p = mockPayload({
    sm1: { id: 'sm1', isActive: true, collectPaymentOnDelivery: true },
  })
  assert.equal(await validateCashOnDeliveryShippingMethods(p, ['sm1']), null)
})

test('should reject when a method omits collectPaymentOnDelivery', async () => {
  const p = mockPayload({
    sm1: { id: 'sm1', isActive: true },
  })
  const err = await validateCashOnDeliveryShippingMethods(p, ['sm1'])
  assert.ok(err?.includes('cashOnDelivery'))
})

test('should reject when collectPaymentOnDelivery is false even if name says COD', async () => {
  const p = mockPayload({
    sm1: { id: 'sm1', name: 'Cash on Delivery', isActive: true, collectPaymentOnDelivery: false },
  })
  const err = await validateCashOnDeliveryShippingMethods(p, ['sm1'])
  assert.ok(err?.includes('cashOnDelivery'))
})

test('isCollectPaymentOnDeliveryShippingMethod should be true only when flag is true', () => {
  assert.equal(isCollectPaymentOnDeliveryShippingMethod({ collectPaymentOnDelivery: true }), true)
  assert.equal(isCollectPaymentOnDeliveryShippingMethod({ collectPaymentOnDelivery: false }), false)
  assert.equal(isCollectPaymentOnDeliveryShippingMethod({}), false)
})
