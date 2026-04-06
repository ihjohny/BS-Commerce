import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { toStringId, relationId } from '../../../src/lib/relation-id.ts'

test('toStringId handles null and undefined', () => {
  assert.equal(toStringId(null), '')
  assert.equal(toStringId(undefined), '')
})

test('toStringId preserves strings and stringifies other primitives', () => {
  assert.equal(toStringId('x'), 'x')
  assert.equal(toStringId(42), '42')
})

test('relationId handles nullish', () => {
  assert.equal(relationId(null), '')
  assert.equal(relationId(undefined), '')
})

test('relationId reads id from populated relationship object', () => {
  assert.equal(relationId({ id: 'abc' }), 'abc')
  assert.equal(relationId({ id: 7 }), '7')
})

test('relationId uses primitive as id string', () => {
  assert.equal(relationId('plain'), 'plain')
})

test('relationId treats object without id as empty', () => {
  assert.equal(relationId({}), '')
})
