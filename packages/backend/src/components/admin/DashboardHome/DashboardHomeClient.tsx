'use client'

import React, { useEffect, useState, useCallback } from 'react'
import type { AdminDashboardStats } from '../../../lib/admin-dashboard-stats'
import { DashboardHeader } from './components/DashboardHeader'
import { FulfillmentPipeline } from './components/FulfillmentPipeline'
import { KpiCards } from './components/KpiCards'
import { SalesOverviewChart } from './components/SalesOverviewChart'
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* 1. Enhanced Filter Header */}
      <DashboardHeader
        role={stats.role}
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

      {/* 2. Primary KPI Cards */}
      <KpiCards currency={stats.currency} kpis={stats.kpis} />

      {/* 3. Order Fulfillment Pipeline */}
      {stats.orderStatusBreakdown && (
        <FulfillmentPipeline
          breakdown={stats.orderStatusBreakdown}
          totalOrders={stats.kpis.orders.value}
        />
      )}

      {/* 4. Sales Overview Chart & Financial Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ flex: '2 1 600px', minWidth: 300 }}>
          <SalesOverviewChart data={stats.salesChart || []} currency={stats.currency} />
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 260 }}>
          <SalesSummaryCard summary={stats.salesSummary} currency={stats.currency} />
        </div>
      </div>

      {/* 5. Recent Orders Feed (Full Width) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <RecentOrdersCard orders={stats.recentOrders || []} currency={stats.currency} />
      </div>

      {/* 6. Product Performance & Operational Intelligence Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Left Column: Bestselling & Customer Reviews / Promotions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <BestsellersCard
            bestsellers={stats.bestsellingProducts || []}
            topEngaged={stats.topEngagedProducts || []}
            currency={stats.currency}
          />
          <FeedbackPromotionsCard
            reviews={stats.recentReviews || []}
            coupons={stats.activeCoupons || []}
            currency={stats.currency}
          />
        </div>

        {/* Right Column: Inventory Restock Alerts & New Customers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <LowStockCard items={stats.lowStockProducts || []} />
          <NewCustomersCard customers={stats.newCustomers || []} />
        </div>
      </div>
    </div>
  )
}
