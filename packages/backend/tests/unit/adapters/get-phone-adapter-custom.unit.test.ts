import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
// @ts-ignore
import {
  getPhoneAdapter,
  resetPhoneAdapterCache,
} from '../../../src/plugins/verification/adapters/get-phone-adapter.ts'

let backups: Record<string, string | undefined> = {}
const keys = ['PHONE_VERIFICATION_PROVIDER', 'VERIFICATION_PHONE_ADAPTER_PATH']

beforeEach(() => {
  backups = {}
  for (const k of keys) backups[k] = process.env[k]
  resetPhoneAdapterCache()
})

afterEach(() => {
  resetPhoneAdapterCache()
  for (const k of keys) {
    if (backups[k] === undefined) delete process.env[k]
    else process.env[k] = backups[k]
  }
})

test('custom provider without adapter path falls back to console adapter', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  delete process.env.VERIFICATION_PHONE_ADAPTER_PATH
  const adapter = await getPhoneAdapter()
  const ok = await adapter.sendOTP('+1', '000000', 60)
  assert.equal(ok, true)
})

test('custom provider with invalid module falls back to console adapter', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  process.env.VERIFICATION_PHONE_ADAPTER_PATH = path.join(
    'tests',
    'fixtures',
    'does-not-exist-adapter.mjs',
  )
  const adapter = await getPhoneAdapter()
  const ok = await adapter.sendOTP('+1', '000000', 60)
  assert.equal(ok, true)
})

test('custom provider with module that does not export sendOTP falls back to console', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  process.env.VERIFICATION_PHONE_ADAPTER_PATH = path.join(
    'tests',
    'fixtures',
    'invalid-phone-adapter.mjs',
  )
  const adapter = await getPhoneAdapter()
  assert.equal(typeof adapter.sendOTP, 'function')
  const ok = await adapter.sendOTP('+1', '000000', 60)
  assert.equal(ok, true)
})

test('custom provider loads valid default export from path', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  process.env.VERIFICATION_PHONE_ADAPTER_PATH = path.join(
    'tests',
    'fixtures',
    'custom-phone-adapter.mjs',
  )
  const adapter = await getPhoneAdapter()
  const ok = await adapter.sendOTP('+8801712345678', '123456', 120)
  assert.equal(ok, true)
})
