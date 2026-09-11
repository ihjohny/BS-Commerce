'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import type { AdminDashboardStats } from '../../../lib/admin-dashboard-stats'
import { DashboardHeader } from './components/DashboardHeader'
import { FulfillmentPipeline } from './components/FulfillmentPipeline'
import { KpiCards } from './components/KpiCards'
import { SalesOverviewChart } from './components/SalesOverviewChart'
import { OrderStatusDonutCard } from './components/OrderStatusDonutCard'
import { RevenueTargetsCard } from './components/RevenueTargetsCard'
import { SalesSummaryCard } from './components/SalesSummaryCard'
import { RecentOrdersCard } from './components/RecentOrdersCard'
import { BestsellersCard } from './components/BestsellersCard'
import { NewCustomersCard } from './components/NewCustomersCard'
import { LowStockCard } from './components/LowStockCard'
import { FeedbackPromotionsCard } from './components/FeedbackPromotionsCard'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { DashboardError } from './components/DashboardError'

export function DashboardHomeClient() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters state
  const [timeRange, setTimeRange] = useState<string>('7d')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('timeRange', timeRange)
      if (selectedStoreId) params.set('storeId', selectedStoreId)
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', new Date(customStartDate).toISOString())
        params.set('endDate', new Date(customEndDate).toISOString())
      }

      const res = await fetch(`/api/dashboard-stats?${params.toString()}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = data.errors?.[0]?.message ?? `Error ${res.status}`
        setError(msg)
        return
      }

      setStats(data as AdminDashboardStats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [timeRange, selectedStoreId, customStartDate, customEndDate])

  useEffect(() => {
    // Auto fetch when preset or store changes (except when custom is selected without clicking apply)
    if (timeRange !== 'custom') {
      fetchStats()
    }
  }, [timeRange, selectedStoreId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Initial fetch on mount
    fetchStats()

    // Listen for home icon click when already on dashboard
    const handleReloadEvent = () => {
      fetchStats()
    }
    window.addEventListener('admin:reload-dashboard', handleReloadEvent)
    return () => {
      window.removeEventListener('admin:reload-dashboard', handleReloadEvent)
    }
  }, [fetchStats])

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
    if (range === 'custom') {
      const now = new Date()
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      if (!customStartDate) setCustomStartDate(past.toISOString().split('T')[0])
      if (!customEndDate) setCustomEndDate(now.toISOString().split('T')[0])
    }
  }

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
  }

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      fetchStats()
    }
  }

  const handleResetFilters = () => {
    setTimeRange('7d')
    setSelectedStoreId(null)
    setCustomStartDate('')
    setCustomEndDate('')
  }

  // Derive real trendline sparkline points from daily sales chart
  const sparklines = useMemo(() => {
    if (!stats?.salesChart || stats.salesChart.length === 0) return undefined
    const revenuePts = stats.salesChart.map((p) => p.revenue)
    const ordersPts = stats.salesChart.map((p) => p.orders)
    const aovPts = stats.salesChart.map((p) => (p.orders > 0 ? Math.round(p.revenue / p.orders) : 0))
    return {
      revenue: revenuePts,
      orders: ordersPts,
      aov: aovPts,
    }
  }, [stats?.salesChart])

  if (loading && !stats) {
    return <DashboardSkeleton />
  }

  if (error && !stats) {
    return <DashboardError message={error} onRetry={fetchStats} />
  }

  if (!stats) {
    return null
  }

  return (
    <div style={{ padding: '0.75rem 2rem 2.5rem 2rem', maxWidth: 1440, margin: '0 auto' }}>
      {/* 1. Enhanced Filter Header */}
      <DashboardHeader
        role={stats.role}
        platformName={stats.platformName}
        stores={stats.stores || []}
        selectedStoreId={selectedStoreId}
        timeRange={timeRange}
        startDate={stats.dateRange.startDate}
        endDate={stats.dateRange.endDate}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        loading={loading}
        onStoreChange={(storeId) => setSelectedStoreId(storeId)}
        onTimeRangeChange={handleTimeRangeChange}
        onCustomDateChange={handleCustomDateChange}
        onApplyCustomRange={handleApplyCustomRange}
        onResetFilters={handleResetFilters}
        onRefresh={fetchStats}
      />

      {/* Vendor Scope Notice */}
      {stats.role === 'vendor' && !stats.tenantId && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 6,
            background: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-200)',
            color: 'var(--theme-elevation-600, #555)',
            marginBottom: '1.5rem',
            fontSize: 13,
          }}
        >
          No vendor tenant is linked to this account yet. Live metrics will populate once onboarding completes.
        </div>
      )}

      {/* 2. Primary KPI Metric Cards with Apex Sparklines */}
      <KpiCards currency={stats.currency} kpis={stats.kpis} sparklines={sparklines} />

      {/* 3. Main Analytics Grid (8:4 layout matching Apex Shadcn: Sales Overview + Order Status Radial) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ gridColumn: 'span 12 / span 12', minWidth: 0 }} className="xl-col-8">
          <SalesOverviewChart data={stats.salesChart || []} currency={stats.currency} />
        </div>
        <div style={{ gridColumn: 'span 12 / span 12', minWidth: 0 }} className="xl-col-4">
          <OrderStatusDonutCard
            breakdown={stats.orderStatusBreakdown}
            totalOrders={stats.kpis.orders.value}
          />
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .xl-col-8 { grid-column: span 8 / span 12 !important; }
          .xl-col-4 { grid-column: span 4 / span 12 !important; }
        }
      `}</style>

      {/* 4. Secondary Row: Top Performers (8 col) & Revenue Targets / Goals (4 col) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ gridColumn: 'span 12 / span 12', minWidth: 0 }} className="xl-col-8">
          <BestsellersCard
            bestsellers={stats.bestsellingProducts || []}
            topEngaged={stats.topEngagedProducts || []}
            currency={stats.currency}
          />
        </div>
        <div style={{ gridColumn: 'span 12 / span 12', minWidth: 0 }} className="xl-col-4">
          <RevenueTargetsCard
            currentRevenue={stats.kpis.revenue.value}
            targetRevenue={Math.max(stats.kpis.revenue.value * 1.25, 250000)}
            currentOrders={stats.kpis.orders.value}
            targetOrders={Math.max(stats.kpis.orders.value * 1.3, 50)}
            currentCustomers={stats.kpis.customers.value}
            targetCustomers={Math.max(stats.kpis.customers.value * 1.2, 30)}
            currency={stats.currency}
          />
        </div>
      </div>

      {/* 5. Recent Transactions / Orders Table (Full Width) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <RecentOrdersCard orders={stats.recentOrders || []} currency={stats.currency} />
      </div>

      {/* 6. Order Fulfillment Pipeline (Multi-step operational view) */}
      {stats.orderStatusBreakdown && (
        <div style={{ marginBottom: '1.5rem' }}>
          <FulfillmentPipeline
            breakdown={stats.orderStatusBreakdown}
            totalOrders={stats.kpis.orders.value}
          />
        </div>
      )}

      {/* 7. Bottom Operational Intelligence Cards (Financial Summary, Low Stock Alerts, Customers, Reviews & Promos) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Accounting & Financial breakdown */}
        <SalesSummaryCard summary={stats.salesSummary} currency={stats.currency} />

        {/* Inventory Restock Alerts */}
        <LowStockCard items={stats.lowStockProducts || []} />

        {/* New Customer Registrations */}
        <NewCustomersCard customers={stats.newCustomers || []} />

        {/* Feedback & Active Promos */}
        <FeedbackPromotionsCard
          reviews={stats.recentReviews || []}
          coupons={stats.activeCoupons || []}
          currency={stats.currency}
        />
      </div>
    </div>
  )
}
