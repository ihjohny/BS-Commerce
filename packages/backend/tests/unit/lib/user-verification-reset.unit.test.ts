import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  shouldResetEmailVerified,
  shouldResetPhoneVerified,
} from '../../../src/lib/user-verification-reset.ts'

test('shouldResetEmailVerified is false without originalDoc', () => {
  assert.equal(shouldResetEmailVerified(undefined, { email: 'a@b.com' }), false)
  assert.equal(shouldResetEmailVerified(null, { email: 'a@b.com' }), false)
})

test('shouldResetEmailVerified is false when email field omitted', () => {
  assert.equal(shouldResetEmailVerified({ email: 'a@b.com' }, { firstName: 'x' } as any), false)
})

test('shouldResetEmailVerified compares trimmed strings and empty fallbacks', () => {
  assert.equal(shouldResetEmailVerified({ email: 'a@b.com' }, { email: 'a@b.com' }), false)
  assert.equal(shouldResetEmailVerified({ email: 'a@b.com' }, { email: '  a@b.com  ' }), false)
  assert.equal(shouldResetEmailVerified({ email: 'a@b.com' }, { email: 'other@test.com' }), true)
  assert.equal(shouldResetEmailVerified({ email: 'a@b.com' }, { email: null as any }), true)
  assert.equal(shouldResetEmailVerified({ email: 'a@b.com' }, { email: '' }), true)
  assert.equal(shouldResetEmailVerified({}, { email: '' }), false)
})

test('shouldResetEmailVerified treats truthy email for || branch', () => {
  assert.equal(shouldResetEmailVerified({ email: 'old@test.com' }, { email: 'new@test.com' }), true)
})

test('shouldResetPhoneVerified is false without originalDoc or when phone omitted', () => {
  assert.equal(shouldResetPhoneVerified(undefined, { phone: '+1' }), false)
  assert.equal(shouldResetPhoneVerified({ phone: '+1' }, { firstName: 'x' } as any), false)
})

test('shouldResetPhoneVerified compares trimmed values', () => {
  assert.equal(shouldResetPhoneVerified({ phone: '+111' }, { phone: '+111' }), false)
  assert.equal(shouldResetPhoneVerified({ phone: '+111' }, { phone: '  +111  ' }), false)
  assert.equal(shouldResetPhoneVerified({ phone: '+111' }, { phone: '+222' }), true)
  assert.equal(shouldResetPhoneVerified({}, { phone: '' }), false)
})
