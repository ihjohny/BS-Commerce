import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { phoneConsoleAdapter } from '../../../src/plugins/verification/adapters/phone-console.ts'

test('phoneConsoleAdapter.sendOTP returns true', async () => {
  const ok = await phoneConsoleAdapter.sendOTP('+8801712345678', '123456', 120)
  assert.equal(ok, true)
})
