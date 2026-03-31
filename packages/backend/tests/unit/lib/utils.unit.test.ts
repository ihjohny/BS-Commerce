import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { isValidUUID } from '../../../src/lib/utils.ts'

test('should return true for valid lowercase UUID', () => {
  assert.equal(isValidUUID('550e8400-e29b-41d4-a716-446655440000'), true)
})

test('should return true for valid uppercase UUID', () => {
  assert.equal(isValidUUID('550E8400-E29B-41D4-A716-446655440000'), true)
})

test('should return true for mixed case UUID', () => {
  assert.equal(isValidUUID('550e8400-E29B-41d4-a716-446655440000'), true)
})

test('should return false for empty string', () => {
  assert.equal(isValidUUID(''), false)
})

test('should return false for random string', () => {
  assert.equal(isValidUUID('not-a-uuid'), false)
})

test('should return false for UUID without dashes', () => {
  assert.equal(isValidUUID('550e8400e29b41d4a716446655440000'), false)
})

test('should return false for UUID with extra characters', () => {
  assert.equal(isValidUUID('550e8400-e29b-41d4-a716-446655440000x'), false)
})

test('should return false for UUID with wrong segment lengths', () => {
  assert.equal(isValidUUID('550e840-e29b-41d4-a716-446655440000'), false)
})
