import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { getPhoneAdapter } from '../../src/plugins/verification/adapters/get-phone-adapter.ts'

const envKeys = [
  'PHONE_VERIFICATION_PROVIDER',
  'VERIFICATION_PHONE_ADAPTER_PATH',
]

let envBackup: Record<string, string | undefined> = {}

beforeEach(() => {
  envBackup = {}
  for (const key of envKeys) envBackup[key] = process.env[key]
})

afterEach(() => {
  for (const key of envKeys) {
    if (envBackup[key] === undefined) delete process.env[key]
    else process.env[key] = envBackup[key]
  }
})

test('should fail safely when custom adapter path traversal is attempted (API7)', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  process.env.VERIFICATION_PHONE_ADAPTER_PATH = '../../../etc/passwd'

  const adapter = await getPhoneAdapter()
  const sent = await adapter.sendOTP('+15550001111', '123456', 300)
  assert.equal(sent, true)
})

test('should fail safely when custom adapter path includes null-byte style payload (API7)', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  process.env.VERIFICATION_PHONE_ADAPTER_PATH = 'malicious-adapter.ts\u0000.js'

  const adapter = await getPhoneAdapter()
  const sent = await adapter.sendOTP('+15550002222', '654321', 300)
  assert.equal(sent, true)
})

test('should fail safely when custom adapter path is missing (API7)', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'custom'
  delete process.env.VERIFICATION_PHONE_ADAPTER_PATH

  const adapter = await getPhoneAdapter()
  const sent = await adapter.sendOTP('+15550003333', '111222', 300)
  assert.equal(sent, true)
})
