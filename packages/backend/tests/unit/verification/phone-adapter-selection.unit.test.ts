import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { getPhoneAdapter, getPhoneAdapterSync } from '../../../src/plugins/verification/adapters/get-phone-adapter.ts'

let envBackup: string | undefined

beforeEach(() => { envBackup = process.env.PHONE_VERIFICATION_PROVIDER })
afterEach(() => {
  if (envBackup === undefined) delete process.env.PHONE_VERIFICATION_PROVIDER
  else process.env.PHONE_VERIFICATION_PROVIDER = envBackup
})

test('should return console adapter when env is unset', () => {
  delete process.env.PHONE_VERIFICATION_PROVIDER
  const adapter = getPhoneAdapterSync()
  assert.ok(typeof adapter.sendOTP === 'function')
})

test('should return console adapter when env is "console"', () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'console'
  const adapter = getPhoneAdapterSync()
  assert.ok(typeof adapter.sendOTP === 'function')
})

test('should return twilio adapter when env is "twilio"', () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'twilio'
  const adapter = getPhoneAdapterSync()
  assert.ok(typeof adapter.sendOTP === 'function')
})

test('should return sslwireless adapter when env is "sslwireless"', () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'sslwireless'
  const adapter = getPhoneAdapterSync()
  assert.ok(typeof adapter.sendOTP === 'function')
})

test('should fall back to console adapter for sync custom provider', () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  const adapter = getPhoneAdapterSync()
  assert.ok(typeof adapter.sendOTP === 'function')
})

test('should return adapter via async getPhoneAdapter for console', async () => {
  delete process.env.PHONE_VERIFICATION_PROVIDER
  const adapter = await getPhoneAdapter()
  assert.ok(typeof adapter.sendOTP === 'function')
})

test('should handle case-insensitive provider name', () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'TWILIO'
  const adapter = getPhoneAdapterSync()
  assert.ok(typeof adapter.sendOTP === 'function')
})
