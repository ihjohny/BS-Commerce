import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  parseGuestOrderNotifyMode,
  resolveGuestOrderNotifyChannels,
  deliverGuestOrderNotifications,
} from '../../../src/lib/guest-order-notify.ts'

test('resolveGuestOrderNotifyChannels should use only channel available when just one contact exists', () => {
  assert.deepEqual(resolveGuestOrderNotifyChannels('sms', true, false), { email: true, sms: false })
  assert.deepEqual(resolveGuestOrderNotifyChannels('email', false, true), { email: false, sms: true })
  assert.deepEqual(resolveGuestOrderNotifyChannels('both', false, false), { email: false, sms: false })
})

test('should prefer email when mode is email and both contacts exist', () => {
  assert.deepEqual(resolveGuestOrderNotifyChannels('email', true, true), { email: true, sms: false })
})

test('should prefer sms when mode is sms and both contacts exist', () => {
  assert.deepEqual(resolveGuestOrderNotifyChannels('sms', true, true), { email: false, sms: true })
})

test('should send both when mode is both and both contacts exist', () => {
  assert.deepEqual(resolveGuestOrderNotifyChannels('both', true, true), { email: true, sms: true })
})

test('parseGuestOrderNotifyMode should accept email sms both case-insensitively', () => {
  assert.equal(parseGuestOrderNotifyMode('EMAIL'), 'email')
  assert.equal(parseGuestOrderNotifyMode('  SMS '), 'sms')
  assert.equal(parseGuestOrderNotifyMode('Both'), 'both')
})

test('parseGuestOrderNotifyMode should default invalid values to email and warn', () => {
  const warns: string[] = []
  const prev = console.warn
  console.warn = (...args: unknown[]) => {
    warns.push(args.map(String).join(' '))
  }
  try {
    assert.equal(parseGuestOrderNotifyMode('nope'), 'email')
    assert.ok(warns.some((w) => w.includes('GUEST_ORDER_NOTIFY')))
  } finally {
    console.warn = prev
  }
})

test('deliverGuestOrderNotifications should run SMS then email when mode is both and both contacts exist', async () => {
  const calls: string[] = []
  await deliverGuestOrderNotifications({
    mode: 'both',
    channels: { email: true, sms: true },
    hasEmail: true,
    hasPhone: true,
    sendEmail: async () => {
      calls.push('email')
    },
    sendSms: async () => {
      calls.push('sms')
    },
    logPrefix: '[t]',
  })
  assert.deepEqual(calls, ['sms', 'email'])
})

test('deliverGuestOrderNotifications should invoke SMS fallback when email fails in email preference', async () => {
  const calls: string[] = []
  await deliverGuestOrderNotifications({
    mode: 'email',
    channels: { email: true, sms: false },
    hasEmail: true,
    hasPhone: true,
    sendEmail: async () => {
      calls.push('email')
      throw new Error('smtp down')
    },
    sendSms: async () => {
      calls.push('sms')
    },
    logPrefix: '[t]',
  })
  assert.deepEqual(calls, ['email', 'sms'])
})

test('deliverGuestOrderNotifications should invoke email fallback when SMS fails in sms preference', async () => {
  const calls: string[] = []
  await deliverGuestOrderNotifications({
    mode: 'sms',
    channels: { email: false, sms: true },
    hasEmail: true,
    hasPhone: true,
    sendSms: async () => {
      calls.push('sms')
      throw new Error('sms gateway')
    },
    sendEmail: async () => {
      calls.push('email')
    },
    logPrefix: '[t]',
  })
  assert.deepEqual(calls, ['sms', 'email'])
})

test('deliverGuestOrderNotifications should not invoke fallback when primary succeeds', async () => {
  const calls: string[] = []
  await deliverGuestOrderNotifications({
    mode: 'email',
    channels: { email: true, sms: false },
    hasEmail: true,
    hasPhone: true,
    sendEmail: async () => {
      calls.push('email')
    },
    sendSms: async () => {
      calls.push('sms')
    },
    logPrefix: '[t]',
  })
  assert.deepEqual(calls, ['email'])
})

test('deliverGuestOrderNotifications should still run email after SMS failure when mode is both', async () => {
  const calls: string[] = []
  await deliverGuestOrderNotifications({
    mode: 'both',
    channels: { email: true, sms: true },
    hasEmail: true,
    hasPhone: true,
    sendSms: async () => {
      calls.push('sms')
      throw new Error('fail sms')
    },
    sendEmail: async () => {
      calls.push('email')
    },
    logPrefix: '[t]',
  })
  assert.deepEqual(calls, ['sms', 'email'])
})
