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

test('should start from empty collections when incoming has none', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {} as any
  const result = await plugin(incoming)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('tenants'))
  assert.ok(slugs.includes('vendor-applications'))
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

test('should inject tenant when user fields array contains non-object entries', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [{ slug: 'users', fields: [false as any, { name: 'email', type: 'email' }] }],
  } as any
  const result = await plugin(incoming)
  const users = (result.collections || []).find((c: any) => c.slug === 'users') as any
  assert.ok((users.fields || []).some((f: any) => f?.name === 'tenant'))
})

test('should inject tenant field when some user fields omit name key', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [{ slug: 'users', fields: [{ type: 'row' }, { name: 'email', type: 'email' }] }],
  } as any
  const result = await plugin(incoming)
  const users = (result.collections || []).find((c: any) => c.slug === 'users') as any
  assert.ok((users.fields || []).some((f: any) => f?.name === 'tenant'))
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

test('should inject tenant when users collection omits fields (falsy users.fields)', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  const users = (result.collections || []).find((c: any) => c.slug === 'users') as any
  assert.ok((users.fields || []).some((f: any) => f?.name === 'tenant'))
})

test('should inject media tenant when media collection omits fields', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [
      { slug: 'users', fields: [{ name: 'email', type: 'email' }] },
      { slug: 'media' },
    ],
  } as any
  const result = await plugin(incoming)
  const media = (result.collections || []).find((c: any) => c.slug === 'media') as any
  assert.ok((media.fields || []).some((f: any) => f?.name === 'tenant'))
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

test('should merge media beforeValidate when it is already an array', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const existing = () => ({})
  const incoming = {
    collections: [
      { slug: 'users', fields: [{ name: 'email', type: 'email' }] },
      {
        slug: 'media',
        fields: [{ name: 'alt', type: 'text' }],
        hooks: { beforeValidate: [existing] },
      },
    ],
  } as any
  const result = await plugin(incoming)
  const media = (result.collections || []).find((c: any) => c.slug === 'media') as any
  const hooks = media.hooks?.beforeValidate
  assert.ok(Array.isArray(hooks) && hooks.length >= 2)
})

test('should augment media when beforeValidate is a single function', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const existingBefore = () => ({})
  const incoming = {
    collections: [
      { slug: 'users', fields: [{ name: 'email', type: 'email' }] },
      {
        slug: 'media',
        fields: [{ name: 'alt', type: 'text' }],
        hooks: { beforeValidate: existingBefore },
      },
    ],
  } as any
  const result = await plugin(incoming)
  const media = (result.collections || []).find((c: any) => c.slug === 'media') as any
  assert.ok(media)
  const hooks = media.hooks?.beforeValidate
  assert.ok(Array.isArray(hooks))
  assert.ok(hooks.length >= 1)
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
  const withTenantString = hook({
    data: { alt: 'z' },
    req: { user: { role: 'vendor', tenant: 'ten-str' } },
  })
  assert.equal(withTenantString.tenant, 'ten-str')
  const withEmptyTenantObj = hook({
    data: { alt: 'w' },
    req: { user: { role: 'vendor', tenant: {} } },
  })
  assert.deepEqual(withEmptyTenantObj.tenant, {})
  const unchanged = hook({
    data: { alt: 'y' },
    req: { user: { role: 'customer' } },
  })
  assert.deepEqual(unchanged, { alt: 'y' })
})

test('should inject media tenant when media fields include non-object entry', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const incoming = {
    collections: [
      { slug: 'users', fields: [{ name: 'email', type: 'email' }] },
      { slug: 'media', fields: [null as any, { name: 'alt', type: 'text' }] },
    ],
  } as any
  const result = await plugin(incoming)
  const media = (result.collections || []).find((c: any) => c.slug === 'media') as any
  assert.ok((media.fields || []).some((f: any) => f?.name === 'tenant'))
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

test('should evaluate media access for anonymous, admin, vendor, and customer', async () => {
  const plugin = multivendorPlugin({ enabled: true })
  const result = await plugin({
    collections: [
      { slug: 'users', fields: [{ name: 'email', type: 'email' }] },
      { slug: 'media', fields: [{ name: 'alt', type: 'text' }] },
    ],
  } as any)
  const media = (result.collections || []).find((c: any) => c.slug === 'media') as any
  const { read, update, delete: del, create } = media.access

  assert.equal(read({ req: {} }), true)
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
  assert.equal(read({ req: { user: { role: 'customer' } } }), true)
  const vendorRead = read({ req: { user: { role: 'vendor', tenant: 't-1' } } })
  assert.ok(typeof vendorRead === 'object' && (vendorRead as any).tenant?.equals === 't-1')

  assert.equal(create({ req: {} }), false)
  assert.equal(create({ req: { user: { role: 'admin' } } }), true)

  assert.equal(update({ req: {} }), false)
  assert.equal(update({ req: { user: { role: 'admin' } } }), true)
  const vendorUpd = update({ req: { user: { role: 'vendor', tenant: { id: 'tx' } } } })
  assert.ok(typeof vendorUpd === 'object')

  assert.equal(del({ req: {} }), false)
  assert.equal(del({ req: { user: { role: 'admin' } } }), true)
  const vendorDel = del({ req: { user: { role: 'vendor', tenant: 't-2' } } })
  assert.ok(typeof vendorDel === 'object')
  assert.equal(update({ req: { user: { role: 'customer' } } }), false)
  assert.equal(del({ req: { user: { role: 'customer' } } }), false)
})
