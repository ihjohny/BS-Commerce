/**
 * GET /api/payments/sslcommerz/sync-paid
 *
 * Browser-callable reconciliation when SSL Commerz redirects back with `val_id` (success URL query).
 * Use when IPN cannot reach the backend (e.g. localhost). Idempotent with IPN + validation API.
 */
import type { Endpoint } from 'payload'
import { processSslCommerzIpnNotification } from '../lib/sslcommerz-ipn-process'

export const sslcommerzSyncPaidEndpoint: Endpoint = {
  path: '/payments/sslcommerz/sync-paid',
  method: 'get',
  handler: async (req) => {
    try {
      const url = new URL(req.url ?? '', 'http://localhost')
      const valId = url.searchParams.get('val_id')?.trim()
      if (!valId) {
        return Response.json({ error: 'val_id is required' }, { status: 400 })
      }
      const tranId = url.searchParams.get('tran_id')?.trim()
      const body = new URLSearchParams()
      if (tranId) body.set('tran_id', tranId)
      body.set('val_id', valId)
      body.set('status', 'VALID')
      await processSslCommerzIpnNotification(req.payload, body.toString())
      return Response.json({ ok: true })
    } catch (e) {
      console.error('[sslcommerz-sync-paid]', e)
      return Response.json({ ok: false }, { status: 500 })
    }
  },
}
