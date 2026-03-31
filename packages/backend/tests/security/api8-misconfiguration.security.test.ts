import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { phoneConsoleAdapter } from '../../src/plugins/verification/adapters/phone-console.ts'
// @ts-ignore
import { sendVerificationLink } from '../../src/plugins/verification/adapters/email-link.ts'

const envKeys = ['NODE_ENV', 'NEXT_PUBLIC_APP_URL', 'VERIFICATION_BASE_URL']
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

test('should suppress phone OTP debug logs in production mode (API8)', async () => {
  process.env.NODE_ENV = 'production'

  let logCalled = false
  const originalLog = console.log
  console.log = (..._args: unknown[]) => {
    logCalled = true
  }

  try {
    const sent = await phoneConsoleAdapter.sendOTP('+15550004444', '222333', 300)
    assert.equal(sent, true)
    assert.equal(logCalled, false)
  } finally {
    console.log = originalLog
  }
})

test('should emit verification link debug log in non-production for observability (API8)', async () => {
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

  const captured: string[] = []
  const originalLog = console.log
  console.log = (...args: unknown[]) => {
    captured.push(args.map((a) => String(a)).join(' '))
  }

  try {
    const sent = await sendVerificationLink('user@example.com', 'test-token', 30)
    assert.equal(sent, true)
    assert.equal(captured.some((line) => line.includes('[Verification] Token only: test-token')), true)
  } finally {
    console.log = originalLog
  }
})
