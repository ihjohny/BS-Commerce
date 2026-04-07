import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
// @ts-ignore
import { openapiAllEndpoint } from '../../../src/endpoints/openapi-all.ts'

const originalFetch = globalThis.fetch

test('openapiAllEndpoint merges generated + legacy + supplemental paths', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Generated API', version: '0.0.1' },
        components: {
          securitySchemes: {
            ApiKey: { type: 'apiKey', in: 'header', name: 'Authorization' },
          },
          schemas: {
            GeneratedOnly: { type: 'object' },
          },
        },
        paths: {
          '/api/only-generated': {
            get: { summary: 'generated route' },
          },
          '/api/users/me': {
            get: { security: [{ jwt: [] }] },
          },
        },
      }),
      { status: 200 },
    )) as typeof fetch

  const req = { url: 'http://localhost:3000/api/openapi-all.json' } as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)

  const body = (await res.json()) as {
    paths: Record<string, { get?: unknown; post?: unknown }>
    components?: { schemas?: Record<string, unknown> }
  }

  assert.ok(body.paths['/api/only-generated']?.get)
  // Supplemental/custom routes should exist.
  assert.ok(body.paths['/api/checkout/process']?.post)
  assert.ok(body.components?.schemas?.GeneratedOnly)
  assert.ok((body as any).components?.securitySchemes?.bearerAuth)
  assert.deepEqual((body.paths['/api/users/me'] as any)?.get?.security, [{ bearerAuth: [] }])

  globalThis.fetch = originalFetch
})

test('openapiAllEndpoint normalizes mixed/invalid security requirement shapes', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Generated API', version: '0.0.1' },
        components: {
          securitySchemes: {
            ApiKey: { type: 'apiKey', in: 'header', name: 'Authorization' },
          },
        },
        paths: {
          '/api/non-object-op': null,
          '/api/mixed-security': {
            get: {
              security: [
                null,
                { first: [], second: [] },
                { unknownScheme: ['scope-a'] },
                { unknownScheme: 'scope-non-array' },
                { ApiKey: [] },
                { jwt: [] },
                { bearerAuth: [] },
                { bearerAuth: 'bad-scope' },
              ],
            },
          },
        },
      }),
      { status: 200 },
    )) as typeof fetch

  const req = { url: 'http://localhost:3000/api/openapi-all.json' } as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)
  const body = (await res.json()) as any

  assert.deepEqual(body.paths['/api/mixed-security'].get.security, [
    null,
    { first: [], second: [] },
    { bearerAuth: ['scope-a'] },
    { bearerAuth: [] },
    { bearerAuth: [] },
    { bearerAuth: [] },
    { bearerAuth: [] },
    { bearerAuth: [] },
  ])

  globalThis.fetch = originalFetch
})

test('openapiAllEndpoint falls back to supplemental spec when generated fetch fails', async () => {
  globalThis.fetch = (async () => {
    throw new Error('network failed')
  }) as typeof fetch

  const req = { url: 'http://localhost:3000/api/openapi-all.json' } as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)

  const body = (await res.json()) as { paths: Record<string, unknown> }
  assert.ok(body.paths['/api/auth/login'])
  assert.ok(body.paths['/api/checkout/process'])

  globalThis.fetch = originalFetch
})

test('openapiAllEndpoint uses localhost fallback when request URL is invalid', async () => {
  let seenUrl = ''
  globalThis.fetch = (async (url: string | URL | Request) => {
    seenUrl = String(url)
    return new Response(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: '', version: '0.0.0' },
        paths: {},
      }),
      { status: 200 },
    )
  }) as typeof fetch

  const req = {} as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)
  assert.equal(seenUrl, 'http://localhost:3000/api/openapi.json')

  globalThis.fetch = originalFetch
})

test('openapiAllEndpoint tolerates legacy file read/parse errors', async () => {
  const originalExistsSync = fs.existsSync
  const originalReadFileSync = fs.readFileSync

  fs.existsSync = (() => true) as typeof fs.existsSync
  fs.readFileSync = (() => {
    throw new Error('boom')
  }) as typeof fs.readFileSync

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Generated API', version: '0.0.1' },
        paths: { '/api/only-generated': { get: { summary: 'ok' } } },
      }),
      { status: 200 },
    )) as typeof fetch

  const req = { url: 'http://localhost:3000/api/openapi-all.json' } as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)
  const body = (await res.json()) as { paths: Record<string, unknown> }
  assert.ok(body.paths['/api/only-generated'])

  fs.existsSync = originalExistsSync
  fs.readFileSync = originalReadFileSync
  globalThis.fetch = originalFetch
})

test('openapiAllEndpoint covers fallback defaults and /api-prefixed legacy paths', async () => {
  const originalExistsSync = fs.existsSync
  const originalReadFileSync = fs.readFileSync

  fs.existsSync = (() => true) as typeof fs.existsSync
  fs.readFileSync = ((() => `
openapi: 3.0.3
paths:
  /legacy-no-prefix:
    get:
      summary: Legacy no prefix
  /api/legacy-with-prefix:
    post:
      summary: Legacy with prefix
`) as unknown) as typeof fs.readFileSync

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        openapi: '3.0.3',
      }),
      { status: 200 },
    )) as typeof fetch

  const req = { url: 'http://localhost:3000/api/openapi-all.json' } as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)
  const body = (await res.json()) as { info: { title: string }; paths: Record<string, { get?: unknown; post?: unknown }> }

  assert.equal(body.info.title, 'BS-Commerce Backend API')
  assert.ok(body.paths['/api/legacy-no-prefix']?.get)
  assert.ok(body.paths['/api/legacy-with-prefix']?.post)

  fs.existsSync = originalExistsSync
  fs.readFileSync = originalReadFileSync
  globalThis.fetch = originalFetch
})

test('openapiAllEndpoint handles missing legacy file path', async () => {
  const originalExistsSync = fs.existsSync
  fs.existsSync = (() => false) as typeof fs.existsSync

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Generated API', version: '0.0.1' },
        paths: {},
      }),
      { status: 200 },
    )) as typeof fetch

  const req = { url: 'http://localhost:3000/api/openapi-all.json' } as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)

  fs.existsSync = originalExistsSync
  globalThis.fetch = originalFetch
})

test('openapiAllEndpoint tolerates non-object legacy YAML root', async () => {
  const originalExistsSync = fs.existsSync
  const originalReadFileSync = fs.readFileSync

  fs.existsSync = (() => true) as typeof fs.existsSync
  fs.readFileSync = ((() => 'true') as unknown) as typeof fs.readFileSync

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Generated API', version: '0.0.1' },
        paths: {},
      }),
      { status: 200 },
    )) as typeof fetch

  const req = { url: 'http://localhost:3000/api/openapi-all.json' } as any
  const res = await openapiAllEndpoint.handler(req)
  assert.equal(res.status, 200)

  fs.existsSync = originalExistsSync
  fs.readFileSync = originalReadFileSync
  globalThis.fetch = originalFetch
})

