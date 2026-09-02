import type { Plugin } from 'payload'
import { adminReportsEndpoint } from '../../endpoints/admin-reports'

export interface ReportsPluginOptions {
  enabled?: boolean
}

/**
 * Reports & Analytics Plugin for BS-Commerce Admin.
 * Encapsulates the analytics engine, /api/reports endpoint,
 * custom admin views, and the sidebar navigation group.
 */
export const reportsPlugin =
  (options: ReportsPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    const existingEndpoints = incomingConfig.endpoints || []
    const hasEndpoint = existingEndpoints.some((ep) => ep.path === '/reports' && ep.method === 'get')

    const existingViews = (incomingConfig.admin?.components?.views || {}) as Record<string, unknown>
    const existingAfterNav = incomingConfig.admin?.components?.afterNavLinks || []
    const hasReportsNavLink = existingAfterNav.includes('/components/admin/ReportsNavLink')

    return {
      ...incomingConfig,
      endpoints: hasEndpoint ? existingEndpoints : [...existingEndpoints, adminReportsEndpoint],
      admin: {
        ...(incomingConfig.admin || {}),
        components: {
          ...(incomingConfig.admin?.components || {}),
          views: {
            ...existingViews,
            reports: {
              Component: '/components/admin/ReportsHome',
              path: '/reports',
              exact: true,
            },
          },
          afterNavLinks: hasReportsNavLink
            ? existingAfterNav
            : [...existingAfterNav, '/components/admin/ReportsNavLink'],
        },
      },
    }
  }
