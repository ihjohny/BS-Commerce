import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { isAllowedSubOrderStatusTransition, isAllowedOrderStatusTransition, validateSubOrderStatusTransition, validateOrderStatusTransition } from '../../../src/lib/order-status-transitions.ts'

// --- Sub-order transitions ---

test('should allow sub-order pending -> confirmed', () => {
  assert.equal(isAllowedSubOrderStatusTransition('pending', 'confirmed'), true)
})

test('should allow sub-order pending -> processing', () => {
  assert.equal(isAllowedSubOrderStatusTransition('pending', 'processing'), true)
})

test('should allow sub-order pending -> cancelled', () => {
  assert.equal(isAllowedSubOrderStatusTransition('pending', 'cancelled'), true)
})

test('should allow sub-order processing -> shipped', () => {
  assert.equal(isAllowedSubOrderStatusTransition('processing', 'shipped'), true)
})

test('should allow sub-order shipped -> delivered', () => {
  assert.equal(isAllowedSubOrderStatusTransition('shipped', 'delivered'), true)
})

test('should allow sub-order delivered -> completed', () => {
  assert.equal(isAllowedSubOrderStatusTransition('delivered', 'completed'), true)
})

test('should deny sub-order shipped -> cancelled', () => {
  assert.equal(isAllowedSubOrderStatusTransition('shipped', 'cancelled'), false)
})

test('should deny sub-order completed -> anything', () => {
  assert.equal(isAllowedSubOrderStatusTransition('completed', 'pending'), false)
})

test('should deny sub-order cancelled -> anything', () => {
  assert.equal(isAllowedSubOrderStatusTransition('cancelled', 'processing'), false)
})

test('should allow same-status transition (no-op)', () => {
  assert.equal(isAllowedSubOrderStatusTransition('pending', 'pending'), true)
})

test('should allow when from is empty (treats as identity)', () => {
  assert.equal(isAllowedSubOrderStatusTransition('', 'pending'), true)
})

// --- Main order transitions ---

test('should allow order pending -> processing', () => {
  assert.equal(isAllowedOrderStatusTransition('pending', 'processing'), true)
})

test('should allow order pending -> cancelled', () => {
  assert.equal(isAllowedOrderStatusTransition('pending', 'cancelled'), true)
})

test('should allow order processing -> partially-shipped', () => {
  assert.equal(isAllowedOrderStatusTransition('processing', 'partially-shipped'), true)
})

test('should allow order processing -> shipped', () => {
  assert.equal(isAllowedOrderStatusTransition('processing', 'shipped'), true)
})

test('should allow order partially-shipped -> shipped', () => {
  assert.equal(isAllowedOrderStatusTransition('partially-shipped', 'shipped'), true)
})

test('should deny order partially-shipped -> cancelled', () => {
  assert.equal(isAllowedOrderStatusTransition('partially-shipped', 'cancelled'), false)
})

test('should deny order shipped -> cancelled', () => {
  assert.equal(isAllowedOrderStatusTransition('shipped', 'cancelled'), false)
})

test('should deny unknown status as source', () => {
  assert.equal(isAllowedOrderStatusTransition('unknown', 'processing'), false)
})

// --- Validate functions (throw on invalid) ---

test('should not throw when sub-order transition is valid', () => {
  assert.doesNotThrow(() => validateSubOrderStatusTransition('pending', 'confirmed'))
})

test('should throw APIError when sub-order transition is invalid', () => {
  assert.throws(
    () => validateSubOrderStatusTransition('shipped', 'cancelled'),
    (err: any) => err.message.includes('Cannot change') && err.status === 400,
  )
})

test('should not throw when to is undefined', () => {
  assert.doesNotThrow(() => validateSubOrderStatusTransition('pending', undefined))
})

test('should default from to pending when from is undefined', () => {
  assert.doesNotThrow(() => validateSubOrderStatusTransition(undefined, 'confirmed'))
})

test('should not throw when order transition is valid', () => {
  assert.doesNotThrow(() => validateOrderStatusTransition('pending', 'processing'))
})

test('should throw when order transition is invalid', () => {
  assert.throws(
    () => validateOrderStatusTransition('delivered', 'cancelled'),
    (err: any) => err.message.includes('Cannot change'),
  )
})
