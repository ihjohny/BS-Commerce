import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { initiateSslCommerzHostedSession } from '../../../src/lib/sslcommerz-initiate-session.ts'

test('should parse SUCCESS response with GatewayPageURL', async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        status: 'SUCCESS',
        GatewayPageURL: 'https://sandbox.sslcommerz.com/checkout.php?key=abc',
        sessionkey: 'sess-1',
      }),
      { status: 200 },
    )
  const r = await initiateSslCommerzHostedSession(
    {
      storeId: 's1',
      storePassword: 'p1',
      sandbox: true,
      tranId: 't1',
      totalAmount: 10.5,
      currency: 'BDT',
      successUrl: 'https://example.test/s',
      failUrl: 'https://example.test/f',
      cancelUrl: 'https://example.test/c',
      customerName: 'A B',
      customerEmail: 'a@b.com',
      customerPhone: '01711111111',
      customerAddress: '1 Rd',
      customerCity: 'Dhaka',
      customerCountry: 'BD',
    },
    fetchImpl as typeof fetch,
  )
  assert.equal(r.gatewayPageUrl, 'https://sandbox.sslcommerz.com/checkout.php?key=abc')
  assert.equal(r.sessionKey, 'sess-1')
})

test('should include ship_name and shipping_method YES in POST body', async () => {
  let posted = ''
  const fetchImpl = async (_url: string, init?: RequestInit) => {
    const raw = init?.body
    if (typeof raw === 'string') {
      posted = raw
    } else if (raw instanceof URLSearchParams) {
      posted = raw.toString()
    }
    return new Response(
      JSON.stringify({
        status: 'SUCCESS',
        GatewayPageURL: 'https://sandbox.sslcommerz.com/gw.php',
      }),
      { status: 200 },
    )
  }
  await initiateSslCommerzHostedSession(
    {
      storeId: 's1',
      storePassword: 'p1',
      sandbox: true,
      tranId: 't1',
      totalAmount: 10,
      currency: 'BDT',
      successUrl: 'https://example.test/s',
      failUrl: 'https://example.test/f',
      cancelUrl: 'https://example.test/c',
      customerName: 'Pat Buyer',
      customerEmail: 'a@b.com',
      customerPhone: '01711111111',
      customerAddress: '12 Road',
      customerCity: 'Dhaka',
      customerCountry: 'Bangladesh',
      customerState: 'Dhaka',
      customerPostcode: '1212',
      numOfItems: 2,
    },
    fetchImpl as typeof fetch,
  )
  const params = new URLSearchParams(posted)
  assert.equal(params.get('shipping_method'), 'YES')
  assert.equal(params.get('ship_name'), 'Pat Buyer')
  assert.equal(params.get('ship_add1'), '12 Road')
  assert.equal(params.get('num_of_item'), '2')
})

test('should throw when SSL Commerz returns FAILED', async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ status: 'FAILED', failedreason: 'invalid_store' }), { status: 200 })
  await assert.rejects(
    () =>
      initiateSslCommerzHostedSession(
        {
          storeId: 's1',
          storePassword: 'p1',
          sandbox: true,
          tranId: 't1',
          totalAmount: 1,
          currency: 'BDT',
          successUrl: 'https://example.test/s',
          failUrl: 'https://example.test/f',
          cancelUrl: 'https://example.test/c',
          customerName: 'A',
          customerEmail: 'a@b.com',
          customerPhone: '01711111111',
          customerAddress: '1',
          customerCity: 'C',
          customerCountry: 'BD',
        },
        fetchImpl as typeof fetch,
      ),
    /invalid_store/,
  )
})
