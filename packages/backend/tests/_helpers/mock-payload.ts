/**
 * Factory for building mock Payload request objects used in unit tests.
 *
 * Usage:
 *   import { mockReq } from '../_helpers/mock-payload.ts'
 *   const req = mockReq({ role: 'admin' })
 *   const req = mockReq({ role: 'vendor', tenant: 'tenant-1' })
 *   const req = mockReq(null) // unauthenticated
 */

type MockUser = {
  id: string
  role: 'admin' | 'vendor' | 'customer'
  tenant?: string | { id: string }
  email?: string
  [key: string]: unknown
}

type MockFindResult = { docs: Array<Record<string, unknown>> }

type MockPayload = {
  find: (...args: unknown[]) => Promise<MockFindResult>
  update: (...args: unknown[]) => Promise<unknown>
  create: (...args: unknown[]) => Promise<unknown>
  delete: (...args: unknown[]) => Promise<unknown>
  findCalls: Array<Record<string, unknown>>
  updateCalls: Array<Record<string, unknown>>
  createCalls: Array<Record<string, unknown>>
  deleteCalls: Array<Record<string, unknown>>
}

export function mockPayload(overrides: {
  find?: (args: Record<string, unknown>) => Promise<MockFindResult>
  update?: (args: Record<string, unknown>) => Promise<unknown>
  create?: (args: Record<string, unknown>) => Promise<unknown>
  delete?: (args: Record<string, unknown>) => Promise<unknown>
} = {}): MockPayload {
  const p: MockPayload = {
    findCalls: [],
    updateCalls: [],
    createCalls: [],
    deleteCalls: [],
    find: async (args: unknown) => {
      const a = args as Record<string, unknown>
      p.findCalls.push(a)
      return overrides.find ? overrides.find(a) : { docs: [] }
    },
    update: async (args: unknown) => {
      const a = args as Record<string, unknown>
      p.updateCalls.push(a)
      return overrides.update ? overrides.update(a) : {}
    },
    create: async (args: unknown) => {
      const a = args as Record<string, unknown>
      p.createCalls.push(a)
      return overrides.create ? overrides.create(a) : {}
    },
    delete: async (args: unknown) => {
      const a = args as Record<string, unknown>
      p.deleteCalls.push(a)
      return overrides.delete ? overrides.delete(a) : {}
    },
  }
  return p
}

export function mockReq(
  user: Partial<MockUser> | null,
  payloadOverrides?: Parameters<typeof mockPayload>[0],
) {
  const payload = mockPayload(payloadOverrides)
  return {
    user: user
      ? {
          id: user.id ?? 'user-1',
          role: user.role ?? 'customer',
          ...user,
        }
      : undefined,
    payload,
  } as any
}
