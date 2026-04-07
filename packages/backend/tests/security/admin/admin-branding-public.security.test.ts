import test from 'node:test'
import assert from 'node:assert/strict'
import type { PayloadRequest } from 'payload'
// @ts-ignore
import { adminBrandingHandler } from '../../../src/endpoints/admin-branding.ts'

test('admin-branding endpoint response exposes only branding fields', async () => {
  const res = await adminBrandingHandler({
    payload: {
      config: {
        routes: { api: '/api' },
        serverURL: '',
      },
      findGlobal: async () => ({
        platformName: 'SecretShop',
        supportEmail: 'ops@example.com',
        features: { multivendorEnabled: true },
        adminBranding: { logo: { url: '/media/a.png' } },
      }),
    },
  } as unknown as PayloadRequest)
  const body = await res.json()
  assert.deepEqual(Object.keys(body).sort(), ['faviconUrl', 'logoAlt', 'logoUrl', 'tagline'].sort())
  assert.equal(body.logoUrl, '/media/a.png')
  assert.ok(!JSON.stringify(body).includes('support'))
  assert.ok(!JSON.stringify(body).includes('multivendor'))
})
