import type { Endpoint } from 'payload'
import { customEndpointsOpenApi } from '../lib/custom-endpoints-openapi'

/**
 * Machine-readable "short contract" for custom endpoints.
 * Useful until plugin-level custom endpoint generation is available.
 */
export const customEndpointsOpenApiEndpoint: Endpoint = {
  path: '/openapi-custom.json',
  method: 'get',
  handler: async () => {
    return Response.json(customEndpointsOpenApi, {
      status: 200,
      headers: { 'cache-control': 'no-store' },
    })
  },
}

