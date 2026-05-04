import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { validateSslCommerzValId } from '../../../src/lib/sslcommerz-validate-val-id.ts'

test('should return ok with tran_id amount currency when SSL returns VALID', async () => {
  process.env.SSLCOMMERZ_STORE_ID = 'sid'
  process.env.SSLCOMMERZ_STORE_PASSWORD = 'secret'
  process.env.SSLCOMMERZ_SANDBOX = 'true'

  const fetchImpl = async (url: string) => {
    assert.match(url, /sandbox\.sslcommerz\.com\/validator\/api\/validationserverAPI\.php/)
    assert.match(url, /val_id=v1/)
    return new Response(
      JSON.stringify({
        status: 'VALID',
        tran_id: 'ORD-1-abc',
        amount: '1156.00',
        currency: 'BDT',
      }),
      { status: 200 },
    )
  }

  const r = await validateSslCommerzValId('v1', fetchImpl as typeof fetch)
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.tran_id, 'ORD-1-abc')
    assert.equal(r.amount, '1156.00')
    assert.equal(r.currency, 'BDT')
  }
})

test('should accept VALIDATED status from SSL', async () => {
  process.env.SSLCOMMERZ_STORE_ID = 'sid'
  process.env.SSLCOMMERZ_STORE_PASSWORD = 'secret'

  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        status: 'VALIDATED',
        tran_id: 't2',
        amount: '10',
        currency: 'USD',
      }),
      { status: 200 },
    )

  const r = await validateSslCommerzValId('vid', fetchImpl as typeof fetch)
  assert.equal(r.ok, true)
})

test('should return error when status is not VALID or VALIDATED', async () => {
  process.env.SSLCOMMERZ_STORE_ID = 'sid'
  process.env.SSLCOMMERZ_STORE_PASSWORD = 'secret'

  const fetchImpl = async () =>
    new Response(JSON.stringify({ status: 'FAILED', failedreason: 'x' }), { status: 200 })

  const r = await validateSslCommerzValId('v', fetchImpl as typeof fetch)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.error, 'x')
})

test('should return error when store credentials missing', async () => {
  delete process.env.SSLCOMMERZ_STORE_ID
  delete process.env.SSLCOMMERZ_STORE_PASSWORD

  const r = await validateSslCommerzValId('v', async () => new Response('{}'))
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.error, /credentials/)
})
