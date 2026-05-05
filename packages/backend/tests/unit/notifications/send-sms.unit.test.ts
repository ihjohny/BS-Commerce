import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

let backups: Record<string, string | undefined> = {}
const smsKeys = ['SMS_PROVIDER', 'SMS_API_KEY']

beforeEach(() => {
  backups = {}
  for (const k of smsKeys) {
    backups[k] = process.env[k]
    delete process.env[k]
  }
})
afterEach(() => {
  for (const k of smsKeys) {
    if (backups[k] === undefined) delete process.env[k]
    else process.env[k] = backups[k]
  }
})

test('sendSms should return true when SMS adapter env is not configured', async () => {
  // @ts-ignore
  const { sendSms } = await import('../../../src/plugins/notifications/lib/send-sms.ts')
  const result = await sendSms({ to: '+8801711111111', body: 'Hello' })
  assert.equal(result, true)
})

test('sendOrderConfirmationSms should return true', async () => {
  // @ts-ignore
  const { sendOrderConfirmationSms } = await import('../../../src/plugins/notifications/lib/send-sms.ts')
  const result = await sendOrderConfirmationSms('ORD-1', '01711111111', 50, 'BDT')
  assert.equal(result, true)
})

test('sendGuestPaymentNotConfirmedSms should return true', async () => {
  // @ts-ignore
  const { sendGuestPaymentNotConfirmedSms } = await import(
    '../../../src/plugins/notifications/lib/send-sms.ts'
  )
  const result = await sendGuestPaymentNotConfirmedSms('ORD-G', '01711111111', 'FAILED')
  assert.equal(result, true)
})

test('sendGuestPaymentNotConfirmedSms rejects when BS_TEST_PAYMENT_FAILURE_SMS_REJECT is set', async () => {
  process.env.BS_TEST_PAYMENT_FAILURE_SMS_REJECT = 'true'
  try {
    // @ts-ignore
    const { sendGuestPaymentNotConfirmedSms } = await import(
      '../../../src/plugins/notifications/lib/send-sms.ts'
    )
    await assert.rejects(
      () => sendGuestPaymentNotConfirmedSms('ORD-X', '01711111111', 'CANCELLED'),
      /simulated payment failure sms reject/,
    )
  } finally {
    delete process.env.BS_TEST_PAYMENT_FAILURE_SMS_REJECT
  }
})
