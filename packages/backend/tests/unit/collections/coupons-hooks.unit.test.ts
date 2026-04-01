import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Coupons } from '../../../src/plugins/discounts/collections/coupons.ts'

const beforeValidateHook = Coupons.hooks?.beforeValidate?.[0]

test('should normalize coupon code to uppercase and trimmed in beforeValidate', () => {
  assert.ok(beforeValidateHook)
  const data = { code: '  save-10  ' } as any
  const result = (beforeValidateHook as any)({ data })
  assert.equal(result.code, 'SAVE-10')
})

test('should keep data unchanged when code is not a string', () => {
  assert.ok(beforeValidateHook)
  const data = { code: 1234 } as any
  const result = (beforeValidateHook as any)({ data })
  assert.equal(result.code, 1234)
})

test('should return undefined when data is missing', () => {
  assert.ok(beforeValidateHook)
  const result = (beforeValidateHook as any)({ data: undefined })
  assert.equal(result, undefined)
})
