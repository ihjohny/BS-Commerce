'use client'

import React, { useEffect, useState } from 'react'
import type { AdminDashboardStats } from '../../../lib/admin-dashboard-stats'

/** Payload 3 list view: `/admin/collections/:slug` */
const collectionListHref = (slug: string) => `/admin/collections/${slug}`

function StatCard({
  label,
  value,
  href,
  title,
}: {
  label: string
  value: string | number
  href?: string
  title?: string
}) {
  const boxStyle: React.CSSProperties = {
    padding: '1.35rem 1.5rem',
    borderRadius: 10,
    border: '1px solid var(--theme-elevation-200)',
    background: 'var(--theme-elevation-50)',
    minWidth: 200,
    flex: '1 1 220px',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
  }

  const inner = (
    <>
      <div style={{ fontSize: 13, color: 'var(--theme-elevation-500)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: 'var(--theme-text)' }}>{value}</div>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        title={title ?? `Open ${label}`}
        style={{
          ...boxStyle,
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          cursor: 'pointer',
        }}
      >
        {inner}
      </a>
    )
  }

  return <div style={boxStyle}>{inner}</div>
}

/** No server props: Payload passes non-serializable view props (e.g. languageOptions) that break RSC → client. */
export function DashboardHomeClient() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/dashboard-stats', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = data.errors?.[0]?.message ?? `Error ${res.status}`
          if (!cancelled) setError(msg)
          return
        }
        if (!cancelled) setStats(data as AdminDashboardStats)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1280 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: 'var(--theme-elevation-500)', marginBottom: '1.5rem', fontSize: 14 }}>
        Overview for your role. Click a card to open the collection, or use the sidebar.
      </p>

      {loading && <p style={{ color: 'var(--theme-elevation-500)' }}>Loading metrics…</p>}
      {error && (
        <p style={{ color: 'var(--theme-error-500)', marginBottom: '1rem' }} role="alert">
          {error}
        </p>
      )}

      {stats?.role === 'admin' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <StatCard label="Orders" value={stats.ordersTotal} href={collectionListHref('orders')} />
          {stats.adminUi.showSubOrders && (
            <StatCard label="Sub-orders" value={stats.subOrdersTotal} href={collectionListHref('sub-orders')} />
          )}
          {stats.adminUi.showTenants && (
            <StatCard label="Vendors (tenants)" value={stats.tenantsTotal} href={collectionListHref('tenants')} />
          )}
          <StatCard label="Products" value={stats.productsTotal} href={collectionListHref('products')} />
          {stats.adminUi.showVendorApplications && (
            <StatCard
              label="Pending vendor applications"
              value={stats.pendingVendorApplications}
              href={collectionListHref('vendor-applications')}
            />
          )}
        </div>
      )}

      {stats?.role === 'vendor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!stats.tenantId && (
            <p style={{ color: 'var(--theme-warning-500, #b45309)', fontSize: 14 }}>
              No tenant is linked to this user yet. Metrics will populate after vendor onboarding completes.
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {stats.vendorUi.showSubOrders && (
              <>
                <StatCard label="Sub-orders" value={stats.subOrdersTotal} href={collectionListHref('sub-orders')} />
                <StatCard label="Open sub-orders" value={stats.subOrdersOpen} href={collectionListHref('sub-orders')} />
              </>
            )}
            <StatCard label="Products" value={stats.productsTotal} href={collectionListHref('products')} />
            {stats.vendorUi.showStockLevels && (
              <StatCard
                label="Stock levels (your warehouses)"
                value={stats.stockLevelsTotal}
                href={collectionListHref('stock-levels')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
