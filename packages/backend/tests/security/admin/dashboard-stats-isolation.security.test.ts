import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload } from 'payload'
// @ts-ignore
import { loadDashboardStats } from '../../../src/lib/admin-dashboard-stats.ts'

test('vendor dashboard counts never omit tenant scope in where clauses', async () => {
  const tenantId = 'tenant-vendor-a'
  const snapshots: string[] = []
  const payload = {
    collections: {
      'sub-orders': {},
      products: {},
      'stock-levels': {},
    },
    count: async (opts: { collection: string; where?: unknown }) => {
      snapshots.push(`${opts.collection}:${JSON.stringify(opts.where)}`)
      return { totalDocs: 0 }
    },
  } as unknown as Payload

  await loadDashboardStats(payload, { id: 'v1', role: 'vendor', tenant: tenantId })

  for (const s of snapshots) {
    assert.ok(
      s.includes(tenantId),
      `expected tenant id in count query: ${s}`,
    )
  }
})
