import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { guestCheckoutIdentifiersError } from '../../../src/lib/guest-checkout-identifiers.ts'

test('should require valid email when mode is email', () => {
  assert.ok(guestCheckoutIdentifiersError('email', '', '+8801712345678')?.includes('guestEmail'))
  assert.equal(guestCheckoutIdentifiersError('email', 'g@t.com', ''), null)
})

test('should require phone when mode is phone', () => {
  assert.ok(guestCheckoutIdentifiersError('phone', 'g@t.com', '')?.includes('guestPhone'))
  assert.equal(guestCheckoutIdentifiersError('phone', '', '+8801712345678'), null)
})

test('should allow either channel when mode is either', () => {
  assert.equal(guestCheckoutIdentifiersError('either', 'g@t.com', ''), null)
  assert.equal(guestCheckoutIdentifiersError('either', '', '+8801712345678'), null)
  assert.ok(guestCheckoutIdentifiersError('either', '', '')?.includes('guestEmail'))
})

test('should reject malformed email when provided under either mode', () => {
  assert.ok(guestCheckoutIdentifiersError('either', 'bad', '+8801712345678')?.includes('guestEmail'))
})

test('should reject invalid national phone when shipping country does not parse number', () => {
  assert.ok(
    guestCheckoutIdentifiersError('phone', '', '01712345678', 'US')?.includes('guestPhone'),
  )
})

test('should accept national phone when shipping country matches numbering plan', () => {
  assert.equal(guestCheckoutIdentifiersError('phone', '', '01712345678', 'BD'), null)
})
