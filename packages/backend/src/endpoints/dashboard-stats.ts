/**
 * Authenticated admin dashboard metrics (admin = platform; vendor = tenant-scoped).
 * GET /api/dashboard-stats — used by the custom admin dashboard view.
 */
import type { Endpoint } from 'payload'
import { loadDashboardStats } from '../lib/admin-dashboard-stats'

export function formatDashboardStatsError(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to load stats'
}

export async function dashboardStatsHandler(req: {
  user?: { id?: string; role?: string | null; tenant?: unknown } | null
  payload: import('payload').Payload
}): Promise<Response> {
  const user = req.user
  if (!user?.id) {
    return Response.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 })
  }
  if (user.role !== 'admin' && user.role !== 'vendor') {
    return Response.json({ errors: [{ message: 'Forbidden' }] }, { status: 403 })
  }

  try {
    const stats = await loadDashboardStats(req.payload, {
      id: String(user.id),
      role: user.role,
      tenant: user.tenant,
    })
    return Response.json(stats)
  } catch (err) {
    return Response.json({ errors: [{ message: formatDashboardStatsError(err) }] }, { status: 500 })
  }
}

export const dashboardStatsEndpoint: Endpoint = {
  path: '/dashboard-stats',
  method: 'get',
  handler: async (req) => dashboardStatsHandler(req as never),
}
