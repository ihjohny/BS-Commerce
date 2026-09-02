/**
 * Authenticated Admin Reports Endpoint (admin = full access; vendor = tenant-scoped).
 * GET /api/reports — used by the custom admin reports view and CSV export.
 */
import type { Endpoint } from 'payload'
import {
  generateAdminReport,
  type ReportCategory,
  type ReportType,
  type ReportPeriod,
  type ReportFilterOptions,
} from '../lib/admin-reports'

export function formatAdminReportError(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to generate report'
}

export async function adminReportsHandler(req: {
  user?: { id?: string; role?: string | null; tenant?: unknown } | null
  payload: import('payload').Payload
  url?: string
}): Promise<Response> {
  const user = req.user
  if (!user?.id) {
    return Response.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 })
  }
  if (user.role !== 'admin' && user.role !== 'vendor') {
    return Response.json({ errors: [{ message: 'Forbidden' }] }, { status: 403 })
  }

  const url = new URL(req.url ?? '', 'http://localhost')
  const qs = url.searchParams

  const options: ReportFilterOptions = {
    category: (qs.get('category') as ReportCategory) || undefined,
    reportType: (qs.get('reportType') as ReportType) || undefined,
    period: (qs.get('period') as ReportPeriod) || undefined,
    startDate: qs.get('startDate') || undefined,
    endDate: qs.get('endDate') || undefined,
    storeId: qs.get('storeId') || undefined,
    format: (qs.get('format') as 'json' | 'csv') || 'json',
  }

  try {
    const report = await generateAdminReport(
      req.payload,
      {
        id: String(user.id),
        role: user.role,
        tenant: user.tenant,
      },
      options
    )

    if (options.format === 'csv') {
      const filename = `${report.meta.reportType}-${new Date().toISOString().split('T')[0]}.csv`
      return new Response(report.csvData || '', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return Response.json(report)
  } catch (err) {
    return Response.json({ errors: [{ message: formatAdminReportError(err) }] }, { status: 500 })
  }
}

export const adminReportsEndpoint: Endpoint = {
  path: '/reports',
  method: 'get',
  handler: async (req) => adminReportsHandler(req as never),
}
