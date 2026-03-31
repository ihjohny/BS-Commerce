import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { LOCALES, DEFAULT_LOCALE, CURRENCIES, DEFAULT_CURRENCY, USER_ROLES, USER_STATUSES, PRODUCT_STATUSES, ORDER_STATUSES } from '../../../src/lib/constants.ts'

test('should have non-empty LOCALES', () => {
  assert.ok(LOCALES.length > 0)
  assert.ok(LOCALES.includes('en'))
  assert.ok(LOCALES.includes('bn'))
})

test('should have valid DEFAULT_LOCALE', () => {
  assert.equal(DEFAULT_LOCALE, 'en')
  assert.ok((LOCALES as readonly string[]).includes(DEFAULT_LOCALE))
})

test('should have non-empty CURRENCIES', () => {
  assert.ok(CURRENCIES.length > 0)
  assert.ok(CURRENCIES.includes('USD'))
  assert.ok(CURRENCIES.includes('BDT'))
})

test('should have valid DEFAULT_CURRENCY', () => {
  assert.equal(DEFAULT_CURRENCY, 'USD')
  assert.ok((CURRENCIES as readonly string[]).includes(DEFAULT_CURRENCY))
})

test('should have all expected USER_ROLES', () => {
  assert.ok(USER_ROLES.includes('admin'))
  assert.ok(USER_ROLES.includes('vendor'))
  assert.ok(USER_ROLES.includes('customer'))
  assert.equal(USER_ROLES.length, 3)
})

test('should have all expected USER_STATUSES', () => {
  assert.ok(USER_STATUSES.includes('active'))
  assert.ok(USER_STATUSES.includes('suspended'))
  assert.ok(USER_STATUSES.includes('banned'))
})

test('should have non-empty PRODUCT_STATUSES', () => {
  assert.ok(PRODUCT_STATUSES.length >= 4)
  assert.ok(PRODUCT_STATUSES.includes('draft'))
  assert.ok(PRODUCT_STATUSES.includes('published'))
})

test('should have all expected ORDER_STATUSES including multivendor', () => {
  assert.ok(ORDER_STATUSES.includes('pending'))
  assert.ok(ORDER_STATUSES.includes('processing'))
  assert.ok(ORDER_STATUSES.includes('partially-shipped'))
  assert.ok(ORDER_STATUSES.includes('shipped'))
  assert.ok(ORDER_STATUSES.includes('delivered'))
  assert.ok(ORDER_STATUSES.includes('completed'))
  assert.ok(ORDER_STATUSES.includes('cancelled'))
  assert.ok(ORDER_STATUSES.includes('refunded'))
})
