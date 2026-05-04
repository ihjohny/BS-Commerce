import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { customEndpointsOpenApiEndpoint } from '../../../src/endpoints/custom-endpoints-openapi.ts'

test('customEndpointsOpenApiEndpoint returns supplemental OpenAPI JSON', async () => {
  const res = await customEndpointsOpenApiEndpoint.handler({} as any)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('cache-control'), 'no-store')

  const body = (await res.json()) as { openapi: string; paths: Record<string, unknown> }
  assert.equal(body.openapi, '3.0.3')
  assert.ok(body.paths['/api/checkout/process'])
  assert.ok(body.paths['/api/payments/sslcommerz/ipn'])
  assert.ok(body.paths['/api/guest/order-lookup'])
  assert.ok(body.paths['/api/auth/login'])
})

