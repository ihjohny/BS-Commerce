import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { multivendorPlugin } from '../../../src/plugins/multivendor/index.ts'

test('should return same config when multivendor plugin is disabled', async () => {
  const plugin = multivendorPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register multivendor collections when enabled', async () => {
  const plugin = multivendorPlugin({
    enabled: true,
    autoApproveVendors: false,
    requireKYC: false,
    requireProductApproval: false,
  })
  const incoming = { collections: [{ slug: 'users', fields: [] }] } as any
  const result = await plugin(incoming)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('tenants'))
  assert.ok(slugs.includes('vendor-profiles'))
  assert.ok(slugs.includes('vendor-settings'))
  assert.ok(slugs.includes('vendor-applications'))
})

test('should inject tenant field into users when enabled', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [{ slug: 'users', fields: [{ name: 'email', type: 'email' }] }],
  } as any
  const result = await plugin(incoming)
  const users = (result.collections || []).find((c: any) => c.slug === 'users') as { fields?: { name: string }[] } | undefined
  assert.ok(users)
  const fieldNames = (users.fields || []).map((f: any) => f.name)
  assert.ok(fieldNames.includes('tenant'))
})

test('should insert users tenant field immediately after locale when locale exists', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [
      {
        slug: 'users',
        fields: [
          { name: 'locale', type: 'select' },
          { name: 'email', type: 'email' },
        ],
      },
    ],
  } as any
  const result = await plugin(incoming)
  const users = (result.collections || []).find((c: any) => c.slug === 'users') as { fields?: { name: string }[] }
  const names = (users.fields || []).map((f: any) => f.name)
  const localeIdx = names.indexOf('locale')
  const tenantIdx = names.indexOf('tenant')
  assert.ok(localeIdx >= 0)
  assert.equal(tenantIdx, localeIdx + 1)
})

test('should not duplicate tenant field on users if already present', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [
      {
        slug: 'users',
        fields: [
          { name: 'tenant', type: 'relationship' },
          { name: 'email', type: 'email' },
        ],
      },
    ],
  } as any
  const result = await plugin(incoming)
  const users = (result.collections || []).find((c: any) => c.slug === 'users') as { fields?: unknown[] }
  const tenantCount = (users.fields || []).filter((f: any) => f?.name === 'tenant').length
  assert.equal(tenantCount, 1)
})

test('should augment media with tenant field, access, and beforeValidate when media has no tenant', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [
      { slug: 'users', fields: [{ name: 'email', type: 'email' }] },
      { slug: 'media', fields: [{ name: 'alt', type: 'text' }] },
    ],
  } as any
  const result = await plugin(incoming)
  const media = (result.collections || []).find((c: any) => c.slug === 'media') as any
  assert.ok(media)
  assert.ok((media.fields || []).some((f: any) => f.name === 'tenant'))
  assert.equal(typeof media.access?.create, 'function')
  assert.equal(typeof media.access?.read, 'function')
  assert.equal(typeof media.access?.update, 'function')
  assert.equal(typeof media.access?.delete, 'function')
  const hooks = media.hooks?.beforeValidate
  assert.ok(Array.isArray(hooks) && hooks.length > 0)
  const hook = hooks[hooks.length - 1]
  const withTenant = hook({
    data: { alt: 'x' },
    req: { user: { role: 'vendor', tenant: { id: 'ten-1' } } },
  })
  assert.equal(withTenant.tenant, 'ten-1')
  const unchanged = hook({
    data: { alt: 'y' },
    req: { user: { role: 'customer' } },
  })
  assert.deepEqual(unchanged, { alt: 'y' })
})

test('should not duplicate media tenant field when media already has tenant', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [
      { slug: 'users', fields: [{ name: 'email', type: 'email' }] },
      {
        slug: 'media',
        fields: [
          { name: 'tenant', type: 'relationship' },
          { name: 'alt', type: 'text' },
        ],
      },
    ],
  } as any
  const result = await plugin(incoming)
  const media = (result.collections || []).find((c: any) => c.slug === 'media') as any
  const tenantCount = (media.fields || []).filter((f: any) => f?.name === 'tenant').length
  assert.equal(tenantCount, 1)
  assert.equal(media.access, undefined)
})
