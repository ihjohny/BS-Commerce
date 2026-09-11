'use client'

import React, { useState } from 'react'
import type { StoreOption } from '../../../../lib/admin-dashboard-stats'
import { AdminStatusBadge } from '../../ui'

type DashboardHeaderProps = {
  role: 'admin' | 'vendor'
  stores: StoreOption[]
  selectedStoreId: string | null
  timeRange: string
  startDate: string
  endDate: string
  customStartDate: string
  customEndDate: string
  loading: boolean
  onStoreChange: (storeId: string | null) => void
  onTimeRangeChange: (range: string) => void
  onCustomDateChange: (start: string, end: string) => void
  onApplyCustomRange: () => void
  onResetFilters: () => void
  onRefresh: () => void
}

export function DashboardHeader({
  role,
  stores,
  selectedStoreId,
  timeRange,
  customStartDate,
  customEndDate,
  loading,
  onStoreChange,
  onTimeRangeChange,
  onCustomDateChange,
  onApplyCustomRange,
  onResetFilters,
  onRefresh,
}: DashboardHeaderProps) {
  const [showDemoMenu, setShowDemoMenu] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const isCustom = timeRange === 'custom'
  const isFiltered = timeRange !== '7d' || selectedStoreId !== null

  const timeRangePresets = [
    { key: 'today', label: 'Today' },
    { key: '24h', label: '24h' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: 'mtd', label: 'MTD' },
    { key: 'ytd', label: 'YTD' },
    { key: 'all', label: 'All Time' },
    { key: 'custom', label: 'Custom' },
  ]

  const handleSeedCatalog = async () => {
    if (
      !window.confirm(
        'Clear existing catalog data and reseed the Electronics Demo Shop?\n\nThis resets products and sample orders to a fresh dataset while preserving your admin login.'
      )
    ) {
      return
    }
    setSeeding(true)
    try {
      const res = await fetch('/api/seed/electronics?secret=FrontendSeed2026!', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else {
        alert('Error: ' + (data.error || 'Failed to seed'))
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSeeding(false)
      setShowDemoMenu(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
      {/* 1. Executive Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontSize: 'var(--bs-font-2xl, 1.625rem)',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.025em',
                color: 'var(--theme-text, #0f172a)',
              }}
            >
              Store Overview
            </h1>
            <AdminStatusBadge
              status={role}
              variant="info"
              label={role === 'admin' ? 'Store Admin' : 'Vendor Portal'}
            />
          </div>
          <p
            style={{
              color: 'var(--theme-elevation-500, #64748b)',
              fontSize: 'var(--bs-font-base, 0.875rem)',
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · Operational sales, inventory & order analytics
          </p>
        </div>

        {/* Top Header Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh dashboard metrics"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 8,
              border: '1px solid var(--theme-elevation-200, #e2e8f0)',
              background: 'var(--theme-elevation-0, #ffffff)',
              color: 'var(--theme-elevation-700, #334155)',
              fontSize: 'var(--bs-font-base, 0.875rem)',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = 'var(--theme-elevation-300, #cbd5e1)'
                e.currentTarget.style.backgroundColor = 'var(--theme-elevation-50, #f8fafc)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-elevation-200, #e2e8f0)'
              e.currentTarget.style.backgroundColor = 'var(--theme-elevation-0, #ffffff)'
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {/* Discreet Demo / Seed Utility Menu (for Admin only) */}
          {role === 'admin' && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                title="Demo Data & Utilities"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                  background: 'var(--theme-elevation-0, #ffffff)',
                  color: 'var(--theme-elevation-600, #64748b)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>

              {showDemoMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    width: 220,
                    borderRadius: 10,
                    background: 'var(--theme-elevation-0, #ffffff)',
                    border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: 6,
                    zIndex: 50,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleSeedCatalog}
                    disabled={seeding}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--theme-text, #0f172a)',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: seeding ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--theme-elevation-50, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                    <span>{seeding ? 'Seeding Catalog…' : 'Reseed Demo Catalog'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Filter Command Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.65rem 0.85rem',
          borderRadius: 10,
          background: 'var(--theme-elevation-0, #ffffff)',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {/* Store Selector */}
          {stores.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 'var(--bs-font-xs, 0.75rem)',
                  fontWeight: 600,
                  color: 'var(--theme-elevation-500, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Outlet:
              </span>
              <select
                value={selectedStoreId || ''}
                onChange={(e) => onStoreChange(e.target.value ? e.target.value : null)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 6,
                  border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                  background: 'var(--theme-elevation-50, #f8fafc)',
                  color: 'var(--theme-elevation-900, #0f172a)',
                  fontSize: 'var(--bs-font-base, 0.875rem)',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
                aria-label="Store View"
              >
                <option value="">All Outlets & Warehouses</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Range Segmented Control */}
          <div
            style={{
              display: 'inline-flex',
              padding: 2,
              borderRadius: 8,
              background: 'var(--theme-elevation-100, #f1f5f9)',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              gap: 2,
            }}
          >
            {timeRangePresets.map((preset) => {
              const active = timeRange === preset.key
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => onTimeRangeChange(preset.key)}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: 'var(--bs-font-sm, 0.8125rem)',
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--bs-primary, #2563eb)' : 'var(--theme-elevation-600, #475569)',
                    background: active ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
                    boxShadow: active ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* Custom Date Range Inputs */}
          {isCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                  background: 'var(--theme-elevation-0, #ffffff)',
                  color: 'var(--theme-text, #0f172a)',
                  fontSize: '0.8125rem',
                }}
              />
              <span style={{ fontSize: '0.8125rem', color: 'var(--theme-elevation-400, #94a3b8)' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                  background: 'var(--theme-elevation-0, #ffffff)',
                  color: 'var(--theme-text, #0f172a)',
                  fontSize: '0.8125rem',
                }}
              />
              <button
                type="button"
                onClick={onApplyCustomRange}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--bs-primary, #2563eb)',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Reset Filters Link */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--bs-primary, #2563eb)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Reset filters</span>
          </button>
        )}
      </div>
    </div>
  )
}
