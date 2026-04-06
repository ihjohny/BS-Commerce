import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { VendorApplications } from '../../../src/plugins/multivendor/collections/vendor-applications.ts'

const beforeValidateHook = VendorApplications.hooks!.beforeValidate![0]
const afterChangeHook = VendorApplications.hooks!.afterChange![0]

let envBackup: string | undefined
beforeEach(() => { envBackup = process.env.VENDOR_AUTO_APPROVE })
afterEach(() => {
  if (envBackup === undefined) delete process.env.VENDOR_AUTO_APPROVE
  else process.env.VENDOR_AUTO_APPROVE = envBackup
})

// --- beforeValidate ---

test('should auto-set applicant to current user on create', () => {
  const data = { businessName: 'Shop' } as any
  const result = beforeValidateHook({
    data,
    operation: 'create',
    req: { user: { id: 'u-1', role: 'customer' } },
  } as any)
  assert.equal(result.applicant, 'u-1')
})

test('should not override applicant when admin creates', () => {
  const data = { businessName: 'Shop', applicant: 'u-5' } as any
  const result = beforeValidateHook({
    data,
    operation: 'create',
    req: { user: { id: 'admin-1', role: 'admin' } },
  } as any)
  assert.equal(result.applicant, 'u-5')
})

test('should set submittedAt on create if not already set', () => {
  const data = { businessName: 'Shop' } as any
  const result = beforeValidateHook({
    data,
    operation: 'create',
    req: { user: { id: 'u-1', role: 'customer' } },
  } as any)
  assert.ok(result.submittedAt)
})

test('should auto-approve when VENDOR_AUTO_APPROVE is true', () => {
  process.env.VENDOR_AUTO_APPROVE = 'true'
  const data = { businessName: 'Shop' } as any
  const result = beforeValidateHook({
    data,
    operation: 'create',
    req: { user: { id: 'u-1', role: 'customer' } },
  } as any)
  assert.equal(result.status, 'approved')
})

test('should not auto-approve when VENDOR_AUTO_APPROVE is not true', () => {
  delete process.env.VENDOR_AUTO_APPROVE
  const data = { businessName: 'Shop' } as any
  const result = beforeValidateHook({
    data,
    operation: 'create',
    req: { user: { id: 'u-1', role: 'customer' } },
  } as any)
  assert.notEqual(result.status, 'approved')
})

test('should not modify data on update operation', () => {
  const data = { businessName: 'Updated' } as any
  const result = beforeValidateHook({
    data,
    operation: 'update',
    req: { user: { id: 'u-1', role: 'customer' } },
  } as any)
  assert.equal(result.applicant, undefined)
})

// --- afterChange (approval creates tenant, profile, settings, updates user) ---

test('should create tenant, profile, settings on approval', async () => {
  const created: any[] = []
  const updated: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async (args: any) => { created.push(args); return { id: `new-${created.length}` } },
      update: async (args: any) => { updated.push(args); return {} },
    },
  }
  await afterChangeHook({
    doc: { id: 'app-1', applicant: 'u-1', businessName: 'My Shop', status: 'approved' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  } as any)
  assert.ok(created.some((c: any) => c.collection === 'tenants'))
  assert.ok(created.some((c: any) => c.collection === 'vendor-profiles'))
  assert.ok(created.some((c: any) => c.collection === 'vendor-settings'))
  assert.ok(updated.some((u: any) => u.collection === 'users' && u.data.role === 'vendor'))
})

test('should not re-provision when already approved and updated again', async () => {
  const created: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async (args: any) => { created.push(args); return { id: `x` } },
      update: async () => ({}),
    },
  }
  await afterChangeHook({
    doc: { id: 'app-1', applicant: 'u-1', businessName: 'Shop', status: 'approved' },
    previousDoc: { status: 'approved' },
    operation: 'update',
    req,
  } as any)
  assert.equal(created.length, 0)
})

test('should not provision when status is not approved', async () => {
  const created: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async (args: any) => { created.push(args); return { id: 'x' } },
      update: async () => ({}),
    },
  }
  await afterChangeHook({
    doc: { id: 'app-1', applicant: 'u-1', businessName: 'Shop', status: 'rejected' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  } as any)
  assert.equal(created.length, 0)
})

test('beforeValidate should return unchanged when data is falsy', () => {
  const result = beforeValidateHook({
    data: null,
    operation: 'create',
    req: { user: { id: 'u-1', role: 'customer' } },
  } as any)
  assert.equal(result, null)
})

test('afterChange should no-op when req.payload is missing', async () => {
  await afterChangeHook({
    doc: { id: 'app-1', applicant: 'u-1', businessName: 'X', status: 'approved' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req: {},
  } as any)
})

test('afterChange should provision on create when status is approved', async () => {
  const created: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async (args: any) => {
        created.push(args)
        return { id: 'new-1' }
      },
      update: async () => ({}),
    },
  }
  await afterChangeHook({
    doc: { id: 'app-new', applicant: 'u-1', businessName: 'Create Approved', status: 'approved' },
    previousDoc: undefined,
    operation: 'create',
    req,
  } as any)
  assert.ok(created.some((c: any) => c.collection === 'tenants'))
})

test('afterChange should read status from select-shaped doc.status', async () => {
  const created: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async (args: any) => {
        created.push(args)
        return { id: 't-1' }
      },
      update: async () => ({}),
    },
  }
  await afterChangeHook({
    doc: {
      id: 'app-1',
      applicant: { id: 'u-obj' },
      businessName: 'Obj Applicant',
      status: { value: 'approved' },
    },
    previousDoc: { status: { value: 'pending' } },
    operation: 'update',
    req,
  } as any)
  assert.ok(created.length >= 1)
})

test('afterChange should skip provisioning when businessName is blank', async () => {
  const created: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      create: async (args: any) => {
        created.push(args)
        return { id: 'x' }
      },
      update: async () => ({}),
    },
  }
  await afterChangeHook({
    doc: { id: 'app-1', applicant: 'u-1', businessName: '   ', status: 'approved' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  } as any)
  assert.equal(created.length, 0)
})

test('should generate unique slug when duplicate exists', async () => {
  let slugAttempts = 0
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'tenants') {
          slugAttempts++
          return { docs: slugAttempts <= 1 ? [{ id: 'existing' }] : [] }
        }
        return { docs: [] }
      },
      create: async (args: any) => {
        if (args.collection === 'tenants') {
          assert.ok(args.data.slug.includes('-1') || args.data.slug.includes('-2'))
        }
        return { id: 'new-t' }
      },
      update: async () => ({}),
    },
  }
  await afterChangeHook({
    doc: { id: 'app-1', applicant: 'u-1', businessName: 'My Shop', status: 'approved' },
    previousDoc: { status: 'pending' },
    operation: 'update',
    req,
  } as any)
})
