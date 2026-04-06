import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { VendorApplications } from '../../../src/plugins/multivendor/collections/vendor-applications.ts'

test('access create requires authenticated user', () => {
  const create = VendorApplications.access?.create as (args: { req: { user?: unknown } }) => boolean
  assert.equal(create({ req: {} }), false)
  assert.equal(create({ req: { user: { id: 'u-1' } } }), true)
})

test('access read: admin sees all', () => {
  const read = VendorApplications.access?.read as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'admin', id: 'a-1' } } }), true)
})

test('access read: applicant scoped to own applications', () => {
  const read = VendorApplications.access?.read as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  const r = read({ req: { user: { role: 'customer', id: 'u-9' } } }) as { applicant?: { equals?: string } }
  assert.equal(r.applicant?.equals, 'u-9')
})

test('access read: unauthenticated denied', () => {
  const read = VendorApplications.access?.read as (args: { req: { user?: unknown } }) => unknown
  assert.equal(read({ req: {} }), false)
})

test('access update: admin true', () => {
  const update = VendorApplications.access?.update as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  assert.equal(update({ req: { user: { role: 'admin', id: 'a' } } }), true)
})

test('access update: applicant pending only', () => {
  const update = VendorApplications.access?.update as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  const r = update({ req: { user: { role: 'customer', id: 'u-2' } } }) as {
    applicant?: { equals?: string }
    status?: { equals?: string }
  }
  assert.equal(r.applicant?.equals, 'u-2')
  assert.equal(r.status?.equals, 'pending')
})

test('access update: unauthenticated denied', () => {
  const update = VendorApplications.access?.update as (args: { req: { user?: unknown } }) => unknown
  assert.equal(update({ req: {} }), false)
})

test('beforeValidate sets applicant for non-admin on create', () => {
  const hook = VendorApplications.hooks?.beforeValidate?.[0] as unknown as (args: {
    data: Record<string, unknown>
    operation: string
    req: { user: { id: string; role: string } }
  }) => unknown
  assert.ok(hook)
  const data = { businessName: 'Biz' } as Record<string, unknown>
  const out = hook({
    data,
    operation: 'create',
    req: { user: { id: 'u-1', role: 'customer' } },
  }) as Record<string, unknown>
  assert.equal(out.applicant, 'u-1')
  assert.ok(out.submittedAt)
})

test('afterChange provisions tenant when status becomes approved', async () => {
  const hook = VendorApplications.hooks?.afterChange?.[0] as any
  assert.ok(hook)
  const creates: any[] = []
  const updates: any[] = []
  const req = {
    payload: {
      find: async ({ collection, where }: any) => {
        if (collection === 'tenants' && where?.slug?.equals === 'biz') {
          return { docs: [] }
        }
        return { docs: [] }
      },
      create: async (args: any) => {
        creates.push(args)
        if (args.collection === 'tenants') return { id: 'tenant-new' }
        return { id: 'created' }
      },
      update: async (args: any) => {
        updates.push(args)
        return {}
      },
    },
  }
  await hook({
    doc: {
      id: 'va-1',
      status: 'approved',
      businessName: 'Biz',
      applicant: 'user-1',
    },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  })
  assert.ok(creates.some((c) => c.collection === 'tenants'))
  assert.ok(creates.some((c) => c.collection === 'vendor-profiles'))
  assert.ok(updates.some((u) => u.collection === 'users'))
})

test('afterChange resolves status from select object and applicant from populated user', async () => {
  const hook = VendorApplications.hooks?.afterChange?.[0] as any
  const creates: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'tenants' && args.where?.slug?.equals === 'name') {
          return { docs: [] }
        }
        return { docs: [] }
      },
      create: async (args: any) => {
        creates.push(args)
        if (args.collection === 'tenants') return { id: 99 }
        return { id: 'x' }
      },
      update: async () => ({}),
    },
  }
  await hook({
    doc: {
      id: 'va-2',
      status: { value: 'approved' },
      businessName: 'Name',
      applicant: { id: 'u-obj' },
    },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  })
  assert.ok(creates.length >= 1)
})

test('afterChange increments slug when tenant slug collides', async () => {
  const hook = VendorApplications.hooks?.afterChange?.[0] as any
  let findCalls = 0
  const req = {
    payload: {
      find: async (args: any) => {
        findCalls++
        if (args.collection !== 'tenants') return { docs: [] }
        const slug = args.where?.slug?.equals
        if (slug === 'biz') return { docs: [{ id: 'taken' }] }
        return { docs: [] }
      },
      create: async (args: any) => {
        if (args.collection === 'tenants') return { id: 't2' }
        return { id: 'x' }
      },
      update: async () => ({}),
    },
  }
  await hook({
    doc: { id: 'va-3', status: 'approved', businessName: 'Biz', applicant: 'u1' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  })
  assert.ok(findCalls >= 2)
})

test('afterChange returns early when status already approved on update', async () => {
  const hook = VendorApplications.hooks?.afterChange?.[0] as any
  let creates = 0
  const req = {
    payload: {
      find: async () => {
        throw new Error('find should not run')
      },
      create: async () => {
        creates++
        return { id: 'x' }
      },
      update: async () => ({}),
    },
  }
  await hook({
    doc: { id: 'va-skip', status: 'approved', businessName: 'B', applicant: 'u1' },
    previousDoc: { status: 'approved' },
    operation: 'update',
    req,
  })
  assert.equal(creates, 0)
})

test('afterChange returns when applicant id is missing', async () => {
  const hook = VendorApplications.hooks?.afterChange?.[0] as any
  let creates = 0
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async () => {
        creates++
        return { id: 'x' }
      },
      update: async () => ({}),
    },
  }
  await hook({
    doc: { id: 'va-no-app', status: 'approved', businessName: 'Biz', applicant: null },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  })
  assert.equal(creates, 0)
})

test('afterChange returns when business name trims to empty', async () => {
  const hook = VendorApplications.hooks?.afterChange?.[0] as any
  let creates = 0
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async () => {
        creates++
        return { id: 'x' }
      },
      update: async () => ({}),
    },
  }
  await hook({
    doc: { id: 'va-empty', status: 'approved', businessName: '   ', applicant: 'u1' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  })
  assert.equal(creates, 0)
})

test('afterChange uses string businessName fallback for non-string values', async () => {
  const hook = VendorApplications.hooks?.afterChange?.[0] as any
  const creates: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'tenants' && args.where?.slug?.equals === '99') {
          return { docs: [] }
        }
        return { docs: [] }
      },
      create: async (args: any) => {
        creates.push(args)
        if (args.collection === 'tenants') return { id: 't-num' }
        return { id: 'x' }
      },
      update: async () => ({}),
    },
  }
  await hook({
    doc: { id: 'va-num', status: 'approved', businessName: 99 as any, applicant: 'u1' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  })
  assert.ok(creates.some((c) => c.collection === 'tenants'))
})

test('beforeValidate does not auto-set applicant for admin create', () => {
  const hook = VendorApplications.hooks?.beforeValidate?.[0] as unknown as (args: {
    data: Record<string, unknown>
    operation: string
    req: { user: { id: string; role: string } }
  }) => unknown
  const data = { businessName: 'Biz', applicant: 'other' } as Record<string, unknown>
  const out = hook({
    data,
    operation: 'create',
    req: { user: { id: 'admin-1', role: 'admin' } },
  }) as Record<string, unknown>
  assert.equal(out.applicant, 'other')
})
