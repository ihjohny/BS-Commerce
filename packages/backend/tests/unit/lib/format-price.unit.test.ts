import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { formatPrice } from '../../../src/lib/format-price.ts'

test('should format USD in en locale', () => {
  const result = formatPrice(1234.5, 'USD', 'en')
  assert.ok(result.includes('1,234.50') || result.includes('1234.50'))
  assert.ok(result.includes('$'))
})

test('should format BDT in bn locale', () => {
  const result = formatPrice(500, 'BDT', 'bn')
  assert.ok(typeof result === 'string')
  assert.ok(result.length > 0)
})

test('should default to USD and en when no args', () => {
  const result = formatPrice(10)
  assert.ok(result.includes('$'))
})

test('should handle zero amount', () => {
  const result = formatPrice(0, 'USD')
  assert.ok(result.includes('0.00'))
})

test('should handle negative amount', () => {
  const result = formatPrice(-25.5, 'USD')
  assert.ok(result.includes('25.50'))
})

test('should format with 2 decimal places', () => {
  const result = formatPrice(99.9, 'USD')
  assert.ok(result.includes('99.90'))
})
