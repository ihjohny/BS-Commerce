import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

const pe = process.env as Record<string, string | undefined>

let backups: Record<string, string | undefined> = {}
const keys = ['SSLWIRELESS_API_KEY', 'SSLWIRELESS_SENDER', 'NODE_ENV']

beforeEach(() => {
  backups = {}
  for (const k of keys) backups[k] = pe[k]
})
afterEach(() => {
  for (const k of keys) {
    if (backups[k] === undefined) Reflect.deleteProperty(pe, k)
    else pe[k] = backups[k]
  }
})

test('sendOTP returns true when API key or sender is missing (dev console path)', async () => {
  Reflect.deleteProperty(pe, 'SSLWIRELESS_API_KEY')
  Reflect.deleteProperty(pe, 'SSLWIRELESS_SENDER')
  pe.NODE_ENV = 'development'
  // @ts-ignore fresh module pick up env
  const { phoneSSLWirelessAdapter } = await import(
    '../../../src/plugins/verification/adapters/phone-sslwireless.ts'
  )
  const ok = await phoneSSLWirelessAdapter.sendOTP('+8801712345678', '111111', 120)
  assert.equal(ok, true)
})

test('sendOTP returns true when credentials are set (stub path)', async () => {
  pe.SSLWIRELESS_API_KEY = 'test-key'
  pe.SSLWIRELESS_SENDER = 'SENDER'
  pe.NODE_ENV = 'development'
  const { phoneSSLWirelessAdapter } = await import(
    '../../../src/plugins/verification/adapters/phone-sslwireless.ts'
  )
  const ok = await phoneSSLWirelessAdapter.sendOTP('+8801712345678', '222222', 60)
  assert.equal(ok, true)
})
