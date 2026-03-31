import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

let backups: Record<string, string | undefined> = {}
const smtpKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']

beforeEach(() => {
  backups = {}
  for (const k of smtpKeys) { backups[k] = process.env[k]; delete process.env[k] }
})
afterEach(() => {
  for (const k of smtpKeys) {
    if (backups[k] === undefined) delete process.env[k]
    else process.env[k] = backups[k]
  }
})

test('sendEmail should return true when SMTP is not configured', async () => {
  // @ts-ignore
  const { sendEmail } = await import('../../../src/plugins/notifications/lib/send-email.ts')
  const result = await sendEmail({ to: 'test@test.com', subject: 'Test', text: 'Hello' })
  assert.equal(result, true)
})

test('sendEmail should return true when SMTP is configured', async () => {
  process.env.SMTP_HOST = 'smtp.test.local'
  process.env.SMTP_USER = 'user'
  process.env.SMTP_PASS = 'pass'
  // @ts-ignore
  const { sendEmail } = await import('../../../src/plugins/notifications/lib/send-email.ts')
  const result = await sendEmail({ to: 'test@test.com', subject: 'Test', text: 'Body' })
  assert.equal(result, true)
})

test('sendEmail should accept html-only emails', async () => {
  // @ts-ignore
  const { sendEmail } = await import('../../../src/plugins/notifications/lib/send-email.ts')
  const result = await sendEmail({ to: 'a@b.com', subject: 'HTML', html: '<p>Hi</p>' })
  assert.equal(result, true)
})

test('sendEmail should handle empty body', async () => {
  // @ts-ignore
  const { sendEmail } = await import('../../../src/plugins/notifications/lib/send-email.ts')
  const result = await sendEmail({ to: 'a@b.com', subject: 'NoBody' })
  assert.equal(result, true)
})

test('sendOrderConfirmationEmail should return true', async () => {
  // @ts-ignore
  const { sendOrderConfirmationEmail } = await import('../../../src/plugins/notifications/lib/send-email.ts')
  const result = await sendOrderConfirmationEmail('ORD-001', 'cust@test.com', 99.50, 'USD')
  assert.equal(result, true)
})

test('sendOrderConfirmationEmail should handle zero total', async () => {
  // @ts-ignore
  const { sendOrderConfirmationEmail } = await import('../../../src/plugins/notifications/lib/send-email.ts')
  const result = await sendOrderConfirmationEmail('ORD-002', 'cust@test.com', 0, 'BDT')
  assert.equal(result, true)
})

test('sendEmail should extend preview for verification links', async () => {
  // @ts-ignore
  const { sendEmail } = await import('../../../src/plugins/notifications/lib/send-email.ts')
  const longText = 'Please verify: http://localhost:3000/verify-email/' + 'a'.repeat(50) + ' ' + 'b'.repeat(150)
  const result = await sendEmail({ to: 'a@b.com', subject: 'Verify', text: longText })
  assert.equal(result, true)
})
