import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { orderItemRelationId } from '../../../src/lib/order-item-relation-id.ts'

test('returns null for null and undefined', () => {
  assert.equal(orderItemRelationId(null), null)
  assert.equal(orderItemRelationId(undefined), null)
})

test('returns id string for populated object', () => {
  assert.equal(orderItemRelationId({ id: 'abc' }), 'abc')
})

test('stringifies plain object without id', () => {
  assert.equal(orderItemRelationId({}), '[object Object]')
})

test('stringifies primitive ids', () => {
  assert.equal(orderItemRelationId('sl-1'), 'sl-1')
  assert.equal(orderItemRelationId(42), '42')
})
