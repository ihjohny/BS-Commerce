import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { resolveCheckoutNotifyContacts } from '../../../src/lib/resolve-checkout-notify-contacts.ts'

let defaultPhoneRegionBackup: string | undefined

beforeEach(() => {
  defaultPhoneRegionBackup = process.env.DEFAULT_PHONE_REGION
  process.env.DEFAULT_PHONE_REGION = 'BD'
})

afterEach(() => {
  if (defaultPhoneRegionBackup === undefined) delete process.env.DEFAULT_PHONE_REGION
  else process.env.DEFAULT_PHONE_REGION = defaultPhoneRegionBackup
})

test('should resolve guestEmail and guestPhone from order fields', async () => {
  const payload = { findByID: async () => null }
  const r = await resolveCheckoutNotifyContacts(payload as never, {
    guestEmail: 'G@Example.COM',
    guestPhone: '01711111111',
  })
  assert.equal(r.email, 'g@example.com')
  assert.equal(r.phone, '01711111111')
})

test('should resolve authenticated buyer from buyerSnapshot when guest fields absent', async () => {
  const payload = { findByID: async () => null }
  const r = await resolveCheckoutNotifyContacts(payload as never, {
    customer: 'user-1',
    buyerSnapshot: { email: 'Auth@shop.com', phone: '01822222222' },
  })
  assert.equal(r.email, 'auth@shop.com')
  assert.equal(r.phone, '01822222222')
})

test('should load email and phone from linked user when snapshot missing', async () => {
  const payload = {
    findByID: async ({ id }: { id: string }) => {
      if (id === 'u99') return { email: 'acc@test.com', phone: '01933333333' }
      return null
    },
  }
  const r = await resolveCheckoutNotifyContacts(payload as never, {
    customer: 'u99',
  })
  assert.equal(r.email, 'acc@test.com')
  assert.equal(r.phone, '01933333333')
})

test('should prefer guestEmail over buyerSnapshot email', async () => {
  const payload = { findByID: async () => null }
  const r = await resolveCheckoutNotifyContacts(payload as never, {
    guestEmail: 'guest@x.com',
    buyerSnapshot: { email: 'snap@x.com', phone: '01711111111' },
  })
  assert.equal(r.email, 'guest@x.com')
})

test('should strip checkout.invalid placeholder emails', async () => {
  const payload = { findByID: async () => null }
  const r = await resolveCheckoutNotifyContacts(payload as never, {
    buyerSnapshot: { email: '01744444444@checkout.invalid', phone: '01744444444' },
  })
  assert.equal(r.email, '')
  assert.equal(r.phone, '01744444444')
})

test('should fetch linked user at most once when resolving email and phone', async () => {
  let calls = 0
  const payload = {
    findByID: async ({ id }: { id: string }) => {
      calls += 1
      if (id === 'u1') return { email: 'once@test.com', phone: '01766666666' }
      return null
    },
  }
  const r = await resolveCheckoutNotifyContacts(payload as never, { customer: 'u1' })
  assert.equal(calls, 1)
  assert.equal(r.email, 'once@test.com')
  assert.equal(r.phone, '01766666666')
})

test('should resolve phone from shippingAddress when guestPhone absent', async () => {
  const payload = { findByID: async () => null }
  const r = await resolveCheckoutNotifyContacts(payload as never, {
    guestEmail: 'ship@test.com',
    shippingAddress: { phone: ' 01955555555 ' },
  })
  assert.equal(r.phone, '01955555555')
})
