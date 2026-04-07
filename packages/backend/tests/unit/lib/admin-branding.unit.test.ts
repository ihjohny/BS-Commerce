import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload } from 'payload'
// @ts-ignore
import {
  DEFAULT_ADMIN_TAGLINE,
  mediaUploadFilePath,
  mediaUrlFromUploadField,
  resolveAdminBrandingFromGlobal,
  resolveMediaPublicUrl,
} from '../../../src/lib/admin-branding.ts'
// @ts-ignore
import { BRAINSTATION_FAVICON_SRC, BRAINSTATION_LOGO_SRC } from '../../../src/lib/brainstation-brand-assets.ts'

const mockPayload = {
  config: {
    routes: { api: '/api' },
    serverURL: '',
  },
} as unknown as Payload

test('mediaUrlFromUploadField returns url from populated upload', () => {
  assert.equal(mediaUrlFromUploadField({ url: '/media/x.png' }), '/media/x.png')
  assert.equal(mediaUrlFromUploadField({ url: '' }), null)
  assert.equal(mediaUrlFromUploadField(null), null)
  assert.equal(mediaUrlFromUploadField('id-only'), null)
})

test('resolveAdminBrandingFromGlobal uses defaults when empty', () => {
  const r = resolveAdminBrandingFromGlobal({}, mockPayload)
  assert.equal(r.logoUrl, BRAINSTATION_LOGO_SRC)
  assert.equal(r.faviconUrl, BRAINSTATION_FAVICON_SRC)
  assert.equal(r.tagline, DEFAULT_ADMIN_TAGLINE)
  assert.equal(r.logoAlt, 'Admin')
})

test('resolveAdminBrandingFromGlobal maps uploads and platform name', () => {
  const r = resolveAdminBrandingFromGlobal(
    {
      platformName: 'Acme Co',
      adminBranding: {
        logo: { url: '/media/logo.png' },
        favicon: { url: '/media/fav.png' },
        loginTagline: 'Acme · Console',
      },
    },
    mockPayload,
  )
  assert.equal(r.logoUrl, '/media/logo.png')
  assert.equal(r.faviconUrl, '/media/fav.png')
  assert.equal(r.tagline, 'Acme · Console')
  assert.equal(r.logoAlt, 'Acme Co')
})

test('resolveAdminBrandingFromGlobal falls back tagline when blank string', () => {
  const r = resolveAdminBrandingFromGlobal(
    {
      adminBranding: { loginTagline: '   ' },
    },
    mockPayload,
  )
  assert.equal(r.tagline, DEFAULT_ADMIN_TAGLINE)
})

test('resolveMediaPublicUrl builds API file path from filename when url missing', () => {
  const u = resolveMediaPublicUrl({ filename: 'my-logo.png' }, mockPayload)
  assert.ok(u)
  assert.ok(u.includes('media'))
  assert.ok(u.includes('my-logo.png'))
})

test('resolveMediaPublicUrl prefers derivative size url when root url missing', () => {
  const u = resolveMediaPublicUrl(
    {
      filename: 'x.png',
      sizes: { thumbnail: { url: '/media/thumb.png' } },
    },
    mockPayload,
  )
  assert.equal(u, '/media/thumb.png')
})

test('resolveMediaPublicUrl falls back to other size keys when standard sizes have no url', () => {
  const u = resolveMediaPublicUrl({ sizes: { web: { url: '/custom.png' } } }, mockPayload)
  assert.equal(u, '/custom.png')
})

test('resolveMediaPublicUrl returns null when upload object has no usable url or filename', () => {
  assert.equal(resolveMediaPublicUrl({ id: 'abc' }, mockPayload), null)
})

test('resolveMediaPublicUrl returns null when sizes exist but no non-empty url and no filename', () => {
  assert.equal(resolveMediaPublicUrl({ sizes: { thumb: { url: '' } } }, mockPayload), null)
})

test('mediaUploadFilePath omits api prefix when api route is root', () => {
  const p = { config: { routes: { api: '/' }, serverURL: '' } } as unknown as Payload
  assert.equal(mediaUploadFilePath('a.png', p), '/media/file/a.png')
})

test('mediaUploadFilePath strips trailing slash from api route', () => {
  const p = { config: { routes: { api: '/api/' }, serverURL: '' } } as unknown as Payload
  assert.equal(mediaUploadFilePath('x.png', p), '/api/media/file/x.png')
})

test('mediaUploadFilePath uses default api when routes is null', () => {
  const p = { config: { routes: null } } as unknown as Payload
  assert.equal(mediaUploadFilePath('b.png', p), '/api/media/file/b.png')
})
