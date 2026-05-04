/**
 * SSL Commerz IPN (Instant Payment Notification) + optional success-page sync.
 *
 * POST /api/payments/sslcommerz/ipn
 *
 * SSL Commerz POSTs form-urlencoded fields after payment. We validate `val_id` server-side,
 * then mark the matching transaction succeeded and the order paid.
 */
import type { Endpoint } from 'payload'
import { processSslCommerzIpnNotification } from '../lib/sslcommerz-ipn-process'

async function readIpnBody(req: unknown): Promise<string> {
  const r = req as Request
  if (typeof r.text === 'function') {
    return r.text()
  }
  return ''
}

export const sslcommerzIpnEndpoint: Endpoint = {
  path: '/payments/sslcommerz/ipn',
  method: 'post',
  handler: async (req) => {
    try {
      const bodyText = await readIpnBody(req)
      await processSslCommerzIpnNotification(req.payload, bodyText)
    } catch (e) {
      console.error('[sslcommerz-ipn]', e)
    }
    /* SSL expects HTTP 200; body content is ignored. */
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  },
}
