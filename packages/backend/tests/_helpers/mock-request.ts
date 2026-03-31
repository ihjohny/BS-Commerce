/**
 * Factory for building mock HTTP request objects used in handler-level unit tests.
 * Payload endpoint handlers expect a Request-like object with:
 *   .json()        — returns body data
 *   .headers.get() — returns header value
 *   .user          — authenticated user or undefined
 *   .payload       — Payload instance with CRUD operations
 *   .ip            — client IP address
 */

import { mockPayload, mockReq as baseMockReq } from './mock-payload'

type PayloadOverrides = Parameters<typeof mockPayload>[0]

interface HandlerReqOptions {
  body?: Record<string, unknown>
  user?: { id?: string; role?: string; email?: string; phone?: string; tenant?: string | { id: string }; [key: string]: unknown } | null
  headers?: Record<string, string>
  ip?: string
  payloadOverrides?: PayloadOverrides & {
    login?: (args: Record<string, unknown>) => Promise<unknown>
  }
  params?: Record<string, string>
}

export function mockHandlerReq(options: HandlerReqOptions = {}) {
  const { body = {}, user = null, headers = {}, ip, payloadOverrides = {}, params = {} } = options

  const payload = mockPayload(payloadOverrides) as any
  if (payloadOverrides?.login) {
    payload.login = payloadOverrides.login
  }

  const headerMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))

  return {
    json: async () => body,
    user: user ? { id: user.id ?? 'user-1', role: user.role ?? 'customer', ...user } : undefined,
    payload,
    ip,
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
    routeParams: params,
  } as any
}
