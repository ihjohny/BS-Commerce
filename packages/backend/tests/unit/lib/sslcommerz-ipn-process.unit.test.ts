import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { processSslCommerzIpnNotification } from '../../../src/lib/sslcommerz-ipn-process.ts'

let defaultPhoneRegionBackup: string | undefined

beforeEach(() => {
  defaultPhoneRegionBackup = process.env.DEFAULT_PHONE_REGION
  process.env.DEFAULT_PHONE_REGION = 'BD'
})

afterEach(() => {
  if (defaultPhoneRegionBackup === undefined) delete process.env.DEFAULT_PHONE_REGION
  else process.env.DEFAULT_PHONE_REGION = defaultPhoneRegionBackup
})

function mockPayload() {
  const updates: { collection: string; id: string; data: Record<string, unknown> }[] = []
  const creates: { collection: string; data: Record<string, unknown> }[] = []

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord1',
          amount: 1156,
          currency: 'BDT',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          id: 'ord1',
          orderNumber: 'ON-1',
          grandTotal: 1156,
          currency: 'BDT',
          paymentStatus: 'unpaid',
          guestEmail: 'g@test.com',
        }
      }
      return null
    },
    update: async (args: { collection: string; id: string; data: Record<string, unknown> }) => {
      updates.push({ collection: args.collection, id: args.id, data: args.data })
    },
    create: async (args: { collection: string; data: Record<string, unknown> }) => {
      creates.push({ collection: args.collection, data: args.data })
    },
  }

  return { payload, updates, creates }
}

test('should update transaction and order to paid when validation succeeds', async () => {
  const { payload, updates, creates } = mockPayload()

  await processSslCommerzIpnNotification(payload as never, 'val_id=v1&tran_id=t-a&status=VALID', {
    validateValId: async () => ({
      ok: true,
      tran_id: 't-a',
      amount: '1156',
      currency: 'BDT',
      status: 'VALID',
    }),
  })

  const txUp = updates.find((u) => u.collection === 'transactions')
  assert.ok(txUp)
  assert.equal(txUp?.data.status, 'succeeded')

  const ordUp = updates.find((u) => u.collection === 'orders')
  assert.ok(ordUp)
  assert.equal(ordUp?.data.paymentStatus, 'paid')
  assert.equal(ordUp?.data.status, 'processing')

  assert.ok(creates.some((c) => c.collection === 'order-status-history'))
})

test('should invoke paid-order SMS callback when guest has phone only and validation succeeds', async () => {
  const smsCalls: [string, string, number, string][] = []
  const updates: { collection: string; id: string; data: Record<string, unknown> }[] = []
  const creates: { collection: string; data: Record<string, unknown> }[] = []

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord1',
          providerTransactionId: 't-phone',
          amount: 99,
          currency: 'BDT',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          id: 'ord1',
          orderNumber: 'ON-P',
          grandTotal: 99,
          currency: 'BDT',
          paymentStatus: 'unpaid',
          guestPhone: '01711111111',
        }
      }
      return null
    },
    update: async (args: { collection: string; id: string; data: Record<string, unknown> }) => {
      updates.push(args)
    },
    create: async (args: { collection: string; data: Record<string, unknown> }) => {
      creates.push(args)
    },
  }

  await processSslCommerzIpnNotification(payload as never, 'val_id=v1&tran_id=t-phone&status=VALID', {
    validateValId: async () => ({
      ok: true,
      tran_id: 't-phone',
      amount: '99',
      currency: 'BDT',
      status: 'VALID',
    }),
    sendOrderPaidConfirmationSms: async (num: string, phone: string, total: number, cur: string) => {
      smsCalls.push([num, phone, total, cur])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.deepEqual(smsCalls, [['ON-P', '01711111111', 99, 'BDT']])
  assert.ok(updates.some((u) => u.collection === 'orders'))
})

test('should invoke paid-order email and SMS when notify mode is both and guest has email and phone', async () => {
  const emailCalls: [string, string, number, string][] = []
  const smsCalls: [string, string, number, string][] = []
  const updates: { collection: string; id: string; data: Record<string, unknown> }[] = []
  const creates: { collection: string; data: Record<string, unknown> }[] = []

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord1',
          providerTransactionId: 't-both',
          amount: 50,
          currency: 'USD',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          id: 'ord1',
          orderNumber: 'ON-BOTH',
          grandTotal: 50,
          currency: 'USD',
          paymentStatus: 'unpaid',
          guestEmail: 'guest@example.com',
          guestPhone: '01712222222',
        }
      }
      return null
    },
    update: async (args: { collection: string; id: string; data: Record<string, unknown> }) => {
      updates.push(args)
    },
    create: async (args: { collection: string; data: Record<string, unknown> }) => {
      creates.push(args)
    },
  }

  await processSslCommerzIpnNotification(payload as never, 'val_id=v1&tran_id=t-both&status=VALID', {
    getGuestOrderNotifyMode: () => 'both',
    validateValId: async () => ({
      ok: true,
      tran_id: 't-both',
      amount: '50',
      currency: 'USD',
      status: 'VALID',
    }),
    sendOrderPaidConfirmationEmail: async (num: string, email: string, total: number, cur: string) => {
      emailCalls.push([num, email, total, cur])
    },
    sendOrderPaidConfirmationSms: async (num: string, phone: string, total: number, cur: string) => {
      smsCalls.push([num, phone, total, cur])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.deepEqual(emailCalls, [['ON-BOTH', 'guest@example.com', 50, 'USD']])
  assert.deepEqual(smsCalls, [['ON-BOTH', '01712222222', 50, 'USD']])
  assert.ok(updates.some((u) => u.collection === 'orders'))
})

test('should mark pending transaction failed when IPN status is not VALID', async () => {
  const updates: { collection: string; id: string; data: Record<string, unknown> }[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          providerTransactionId: 't-fail',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async () => null,
    update: async (args: { collection: string; id: string; data: Record<string, unknown> }) => {
      updates.push(args)
    },
    create: async () => {},
  }

  await processSslCommerzIpnNotification(
    payload as never,
    'tran_id=t-fail&status=CANCELLED',
  )

  assert.equal(updates.length, 1)
  assert.equal(updates[0]?.collection, 'transactions')
  assert.equal(updates[0]?.data.status, 'cancelled')
})

test('should invoke guest payment-not-confirmed callback when IPN fails for guest unpaid order', async () => {
  const calls: [string, string, string][] = []
  const updates: { collection: string; id: string; data: Record<string, unknown> }[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-guest',
          providerTransactionId: 't-fail',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          guestEmail: 'guest@example.com',
          orderNumber: 'ORD-99',
          paymentStatus: 'unpaid',
        }
      }
      return null
    },
    update: async (args: { collection: string; id: string; data: Record<string, unknown> }) => {
      updates.push(args)
    },
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fail&status=FAILED', {
    sendGuestPaymentNotConfirmedEmail: async (num, email, st) => {
      calls.push([num, email, st])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.deepEqual(calls, [['ORD-99', 'guest@example.com', 'FAILED']])
  assert.equal(updates.length, 1)
})

test('should not notify guest when failure order has neither guestEmail nor guestPhone', async () => {
  const emailCalls: [string, string, string][] = []
  const smsCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-auth',
          providerTransactionId: 't-fail',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          orderNumber: 'ORD-A',
          paymentStatus: 'unpaid',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fail&status=FAILED', {
    sendGuestPaymentNotConfirmedEmail: async (num, email, st) => {
      emailCalls.push([num, email, st])
    },
    sendGuestPaymentNotConfirmedSms: async (num: string, phone: string, st: string) => {
      smsCalls.push([num, phone, st])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.equal(emailCalls.length, 0)
  assert.equal(smsCalls.length, 0)
})

test('should invoke guest payment-not-confirmed SMS when IPN fails for phone-only unpaid guest', async () => {
  const smsCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-phone',
          providerTransactionId: 't-fail',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          orderNumber: 'ORD-SMS',
          paymentStatus: 'unpaid',
          guestPhone: '01711111111',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fail&status=CANCELLED', {
    sendGuestPaymentNotConfirmedSms: async (num: string, phone: string, st: string) => {
      smsCalls.push([num, phone, st])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.deepEqual(smsCalls, [['ORD-SMS', '01711111111', 'CANCELLED']])
})

test('should send only email when notify mode is email and order has both guestEmail and guestPhone', async () => {
  const emailCalls: [string, string, string][] = []
  const smsCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-both',
          providerTransactionId: 't-fail',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          guestEmail: 'both@example.com',
          guestPhone: '01800000000',
          orderNumber: 'ORD-BOTH',
          paymentStatus: 'unpaid',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fail&status=FAILED', {
    getGuestOrderNotifyMode: () => 'email',
    sendGuestPaymentNotConfirmedEmail: async (num, email, st) => {
      emailCalls.push([num, email, st])
    },
    sendGuestPaymentNotConfirmedSms: async (num: string, phone: string, st: string) => {
      smsCalls.push([num, phone, st])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.deepEqual(emailCalls, [['ORD-BOTH', 'both@example.com', 'FAILED']])
  assert.equal(smsCalls.length, 0)
})

test('should send only SMS when notify mode is sms and order has both guestEmail and guestPhone', async () => {
  const emailCalls: [string, string, string][] = []
  const smsCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-both-s',
          providerTransactionId: 't-fail-s',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          guestEmail: 'both@sms.com',
          guestPhone: '01811111111',
          orderNumber: 'ORD-SMS-MODE',
          paymentStatus: 'unpaid',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fail-s&status=FAILED', {
    getGuestOrderNotifyMode: () => 'sms',
    sendGuestPaymentNotConfirmedEmail: async (num, email, st) => {
      emailCalls.push([num, email, st])
    },
    sendGuestPaymentNotConfirmedSms: async (num: string, phone: string, st: string) => {
      smsCalls.push([num, phone, st])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.equal(emailCalls.length, 0)
  assert.deepEqual(smsCalls, [['ORD-SMS-MODE', '01811111111', 'FAILED']])
})

test('should send email and SMS when notify mode is both and order has guestEmail and guestPhone', async () => {
  const emailCalls: [string, string, string][] = []
  const smsCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-both-2',
          providerTransactionId: 't-fail-b',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          guestEmail: 'both@both.com',
          guestPhone: '01822222222',
          orderNumber: 'ORD-BOTH-N',
          paymentStatus: 'unpaid',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fail-b&status=CANCELLED', {
    getGuestOrderNotifyMode: () => 'both',
    sendGuestPaymentNotConfirmedEmail: async (num, email, st) => {
      emailCalls.push([num, email, st])
    },
    sendGuestPaymentNotConfirmedSms: async (num: string, phone: string, st: string) => {
      smsCalls.push([num, phone, st])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.deepEqual(emailCalls, [['ORD-BOTH-N', 'both@both.com', 'CANCELLED']])
  assert.deepEqual(smsCalls, [['ORD-BOTH-N', '01822222222', 'CANCELLED']])
})

test('should fall back to email when guest payment SMS fails and notify mode is sms', async () => {
  const emailCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-fb',
          providerTransactionId: 't-fb-sms',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          guestEmail: 'fb@example.com',
          guestPhone: '01999999999',
          orderNumber: 'ORD-FB-SMS',
          paymentStatus: 'unpaid',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fb-sms&status=FAILED', {
    getGuestOrderNotifyMode: () => 'sms',
    sendGuestPaymentNotConfirmedSms: async () => {
      throw new Error('sms down')
    },
    sendGuestPaymentNotConfirmedEmail: async (num, email, st) => {
      emailCalls.push([num, email, st])
    },
  })

  assert.deepEqual(emailCalls, [['ORD-FB-SMS', 'fb@example.com', 'FAILED']])
})

test('should fall back to SMS when guest payment email fails and notify mode is email', async () => {
  const smsCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-fb2',
          providerTransactionId: 't-fb-em',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          guestEmail: 'fb2@example.com',
          guestPhone: '01988888888',
          orderNumber: 'ORD-FB-EM',
          paymentStatus: 'unpaid',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fb-em&status=FAILED', {
    getGuestOrderNotifyMode: () => 'email',
    sendGuestPaymentNotConfirmedEmail: async () => {
      throw new Error('smtp down')
    },
    sendGuestPaymentNotConfirmedSms: async (num: string, phone: string, st: string) => {
      smsCalls.push([num, phone, st])
    },
  })

  assert.deepEqual(smsCalls, [['ORD-FB-EM', '01988888888', 'FAILED']])
})

test('should notify authenticated customer on payment failure using buyerSnapshot contacts', async () => {
  const emailCalls: [string, string, string][] = []
  const smsCalls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord-auth',
          providerTransactionId: 't-auth-f',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          orderNumber: 'ORD-AUTH-N',
          paymentStatus: 'unpaid',
          customer: 'user-x',
          buyerSnapshot: { email: 'member@store.com', phone: '01611111111' },
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-auth-f&status=FAILED', {
    getGuestOrderNotifyMode: () => 'both',
    sendGuestPaymentNotConfirmedEmail: async (num: string, email: string, st: string) => {
      emailCalls.push([num, email, st])
    },
    sendGuestPaymentNotConfirmedSms: async (num: string, phone: string, st: string) => {
      smsCalls.push([num, phone, st])
    },
  })

  assert.deepEqual(smsCalls, [['ORD-AUTH-N', '01611111111', 'FAILED']])
  assert.deepEqual(emailCalls, [['ORD-AUTH-N', 'member@store.com', 'FAILED']])
})

test('should not invoke guest payment-not-confirmed callback when order is already paid', async () => {
  const calls: [string, string, string][] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord1',
          providerTransactionId: 't-fail',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        return {
          guestEmail: 'g@test.com',
          orderNumber: 'ORD-P',
          paymentStatus: 'paid',
        }
      }
      return null
    },
    update: async () => {},
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'tran_id=t-fail&status=FAILED', {
    sendGuestPaymentNotConfirmedEmail: async (num, email, st) => {
      calls.push([num, email, st])
    },
  })
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.equal(calls.length, 0)
})

test('should skip when tran_id mismatches validation API', async () => {
  const updates: unknown[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'tx1',
          order: 'ord1',
          amount: 10,
          currency: 'BDT',
          status: 'pending',
          metadata: {},
        },
      ],
    }),
    findByID: async () => ({}),
    update: async (args: unknown) => {
      updates.push(args)
    },
    create: async () => {},
  }

  await processSslCommerzIpnNotification(payload as never, 'val_id=v1&tran_id=wrong&status=VALID', {
    validateValId: async () => ({
      ok: true,
      tran_id: 'right',
      amount: '10',
      currency: 'BDT',
      status: 'VALID',
    }),
  })

  assert.equal(updates.length, 0)
})
