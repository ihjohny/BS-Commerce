import test from 'node:test'
import assert from 'node:assert/strict'
import type { PayloadRequest } from 'payload'
// @ts-ignore
import {
  adminBrandingEndpoint,
  adminBrandingHandler,
} from '../../../src/endpoints/admin-branding.ts'
// @ts-ignore
import { BRAINSTATION_LOGO_SRC } from '../../../src/lib/brainstation-brand-assets.ts'

function mockReq(findGlobal: () => Promise<unknown>): PayloadRequest {
  return {
    payload: {
      config: {
        routes: { api: '/api' },
        serverURL: '',
      },
      findGlobal,
    },
  } as unknown as PayloadRequest
}

test('adminBrandingHandler returns JSON from findGlobal', async () => {
  const res = await adminBrandingHandler(
    mockReq(async () => ({
      platformName: 'T',
      adminBranding: { logo: { url: '/m/l.png' } },
    })),
  )
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('Cache-Control'), 'no-store, max-age=0')
  const body = (await res.json()) as { logoUrl: string; faviconUrl: string; tagline: string; logoAlt: string }
  assert.equal(body.logoUrl, '/m/l.png')
  assert.equal(body.logoAlt, 'T')
  assert.ok(typeof body.faviconUrl === 'string')
  assert.ok(typeof body.tagline === 'string')
})

test('adminBrandingHandler still returns 200 when global is minimal', async () => {
  const res = await adminBrandingHandler(mockReq(async () => ({})))
  assert.equal(res.status, 200)
  const body = (await res.json()) as { logoUrl: string }
  assert.equal(body.logoUrl, BRAINSTATION_LOGO_SRC)
})

test('adminBrandingEndpoint.handler delegates to adminBrandingHandler', async () => {
  const res = await adminBrandingEndpoint.handler(
    mockReq(async () => ({})) as Parameters<typeof adminBrandingEndpoint.handler>[0],
  )
  assert.equal(res.status, 200)
})
