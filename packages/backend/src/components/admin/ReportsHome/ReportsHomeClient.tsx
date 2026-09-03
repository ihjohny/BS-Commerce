'use client'

import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type {
  ReportCategory,
  ReportType,
  ReportPeriod,
  ReportResult,
} from '../../../lib/admin-reports'
import { ReportHeader, REPORT_DEFINITIONS } from './components/ReportHeader'
import { ReportKpis } from './components/ReportKpis'
import { ReportChart } from './components/ReportChart'
import { ReportTable } from './components/ReportTable'
import { ReportsSkeleton } from './components/ReportsSkeleton'

function ReportsHomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawType = searchParams?.get('type') as ReportType | null
  const rawCat = searchParams?.get('category') as ReportCategory | null

  // Resolve active category and reportType
  const category: ReportCategory =
    rawCat && ['sales', 'products', 'customers', 'inventory'].includes(rawCat)
      ? rawCat
      : rawType && rawType in REPORT_DEFINITIONS
      ? REPORT_DEFINITIONS[rawType].category
      : 'sales'

  const defaultTypeForCategory =
    category === 'products'
      ? 'product-performance'
      : category === 'customers'
      ? 'abandoned-carts'
      : category === 'inventory'
      ? 'low-stock-alert'
      : 'sales-overview'

  const reportType: ReportType =
    rawType && rawType in REPORT_DEFINITIONS && REPORT_DEFINITIONS[rawType].category === category
      ? rawType
      : defaultTypeForCategory

  const [report, setReport] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(searchParams?.get('currency') || null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('category', category)
      params.set('reportType', reportType)
      params.set('period', period)
      if (selectedStoreId) params.set('storeId', selectedStoreId)
      if (selectedCurrency) params.set('currency', selectedCurrency)
      if (period === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', new Date(customStartDate).toISOString())
        params.set('endDate', new Date(customEndDate).toISOString())
      }

      const res = await fetch(`/api/reports?${params.toString()}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = data.errors?.[0]?.message ?? `Error ${res.status}`
        setError(msg)
        return
      }

      setReport(data as ReportResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [category, reportType, period, selectedStoreId, selectedCurrency, customStartDate, customEndDate])

  useEffect(() => {
    if (period !== 'custom') {
      fetchReport()
    }
  }, [category, reportType, period, selectedStoreId, selectedCurrency]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReport()
  }, [reportType]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReportTypeChange = (newType: ReportType) => {
    const newCat = REPORT_DEFINITIONS[newType]?.category || category
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('category', newCat)
    params.set('type', newType)
    router.replace(`/admin/reports?${params.toString()}`, { scroll: false })
  }

  const handleCurrencyChange = (newCurr: string | null) => {
    setSelectedCurrency(newCurr)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (newCurr) {
      params.set('currency', newCurr)
    } else {
      params.delete('currency')
    }
    router.replace(`/admin/reports?${params.toString()}`, { scroll: false })
  }

  const handlePeriodChange = (newPeriod: ReportPeriod) => {
    setPeriod(newPeriod)
    if (newPeriod === 'custom') {
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
      fetchReport()
    }
  }

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    params.set('category', category)
    params.set('reportType', reportType)
    params.set('period', period)
    params.set('format', 'csv')
    if (selectedStoreId) params.set('storeId', selectedStoreId)
    if (selectedCurrency) params.set('currency', selectedCurrency)
    if (period === 'custom' && customStartDate && customEndDate) {
      params.set('startDate', new Date(customStartDate).toISOString())
      params.set('endDate', new Date(customEndDate).toISOString())
    }

    const downloadUrl = `/api/reports?${params.toString()}`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', `${reportType}-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      {/* 1. Header & Filter Controls */}
      <ReportHeader
        category={category}
        reportType={reportType}
        period={period}
        startDate={report?.meta.startDate || ''}
        endDate={report?.meta.endDate || ''}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedStoreId={selectedStoreId}
        availableStores={report?.meta.availableStores || []}
        selectedCurrency={selectedCurrency}
        defaultCurrency={report?.meta.defaultCurrency}
        availableCurrencies={report?.meta.availableCurrencies || []}
        activeCurrency={report?.meta.currency}
        loading={loading}
        onReportTypeChange={handleReportTypeChange}
        onPeriodChange={handlePeriodChange}
        onCustomDateChange={handleCustomDateChange}
        onApplyCustomRange={handleApplyCustomRange}
        onStoreChange={(id) => setSelectedStoreId(id)}
        onCurrencyChange={handleCurrencyChange}
        onRefresh={fetchReport}
        onExportCsv={handleExportCsv}
      />

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 6,
            background: 'var(--theme-error-50, #fef2f2)',
            border: '1px solid var(--theme-error-200, #fecaca)',
            color: 'var(--theme-error-700, #b91c1c)',
            marginBottom: '1.5rem',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Error loading report: {error}</span>
          <button
            type="button"
            onClick={fetchReport}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons on initial load */}
      {loading && !report && <ReportsSkeleton />}

      {/* Report Content with smooth transition */}
      {report && (
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          {/* 2. Primary KPI Cards for Current Report */}
          <ReportKpis kpis={report.kpis} />

          {/* 3. Trend Chart Visualization */}
          <ReportChart chart={report.chart} currency={report.meta.currency} />

          {/* 4. Tabular Data */}
          <ReportTable table={report.table} currency={report.meta.currency} />
        </div>
      )}
    </div>
  )
}

export function ReportsHomeClient() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsHomeContent />
    </Suspense>
  )
}

