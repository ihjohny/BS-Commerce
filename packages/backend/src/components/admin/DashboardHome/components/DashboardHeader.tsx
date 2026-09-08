'use client'

import React from 'react'
import type { StoreOption } from '../../../../lib/admin-dashboard-stats'

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
  const isCustom = timeRange === 'custom'
  const isFiltered = timeRange !== '7d' || selectedStoreId !== null

  const timeRangePresets = [
    { key: 'today', label: 'Today' },
    { key: '24h', label: '24h' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'mtd', label: 'MTD' },
    { key: 'ytd', label: 'YTD' },
    { key: 'all', label: 'All Time' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
      {/* 1. Page Title & Action Header */}
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
                fontSize: 24,
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.02em',
                color: 'var(--theme-text)',
              }}
            >
              Dashboard
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '3px 9px',
                borderRadius: 'var(--bs-radius-full, 9999px)',
                background: 'var(--bs-primary-subtle, rgba(37,99,235,0.08))',
                color: 'var(--bs-primary, #2563eb)',
                border: '1px solid var(--bs-primary-border, rgba(37,99,235,0.2))',
              }}
            >
              {role === 'admin' ? 'Store Admin' : 'Vendor Portal'}
            </span>
          </div>
          <p
            style={{
              color: 'var(--theme-elevation-500)',
              fontSize: 13.5,
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Real-time analytics across sales, fulfillment, catalog, and customers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Seed Electronics Store Button */}
          {role === 'admin' && (
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    '⚠️ Clear all existing data and reseed the Electronics Shop (BS Commerce)?\n\nThis will reset catalog/orders while preserving your admin login.'
                  )
                ) {
                  const btn = document.getElementById('btn-reseed-electronics')
                  if (btn) btn.innerText = '⏳ Seeding Electronics...'
                  try {
                    const res = await fetch('/api/seed/electronics?secret=FrontendSeed2026!', { method: 'POST' })
                    const data = await res.json()
                    if (data.success) {
                      alert('✅ Electronics store successfully seeded! Reloading dashboard...')
                      window.location.reload()
                    } else {
                      alert('❌ Error: ' + (data.error || 'Failed to seed'))
                    }
                  } catch (e: any) {
                    alert('❌ Error: ' + e.message)
                  } finally {
                    if (btn) btn.innerText = '⚡ Seed Electronics Store'
                  }
                }
              }}
              id="btn-reseed-electronics"
              title="Clear database and populate rich electronics catalog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--bs-radius-sm, 6px)',
                background: 'var(--theme-elevation-800, #1e293b)',
                border: '1px solid var(--theme-elevation-700, #334155)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
            >
              ⚡ Seed Electronics Store
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--bs-radius-sm, 6px)',
              border: '1px solid var(--theme-elevation-200)',
              background: 'var(--theme-elevation-50)',
              color: 'var(--theme-text)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.15s ease',
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
            <span>{loading ? 'Updating…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Modern Filter Command Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--bs-radius-md, 8px)',
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-150)',
          boxShadow: 'var(--bs-shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.85rem' }}>
          {/* Store Selector Dropdown */}
          {stores.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--theme-elevation-500)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Store:
              </span>
              <select
                value={selectedStoreId || ''}
                onChange={(e) => onStoreChange(e.target.value ? e.target.value : null)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  border: '1px solid var(--theme-elevation-200)',
                  background: 'var(--theme-elevation-0, #fff)',
                  color: 'var(--theme-text)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                aria-label="Store View"
              >
                <option value="">All Locations</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Range Pills Group */}
          <div
            style={{
              display: 'inline-flex',
              padding: 3,
              borderRadius: 'var(--bs-radius-sm, 6px)',
              background: 'var(--theme-elevation-100)',
              border: '1px solid var(--theme-elevation-200)',
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
                    borderRadius: 4,
                    padding: '3px 9px',
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    color: active ? '#ffffff' : 'var(--theme-elevation-600)',
                    background: active ? 'var(--bs-primary, #2563eb)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* Custom Date Inputs */}
          {isCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  border: '1px solid var(--theme-elevation-200)',
                  background: 'var(--theme-elevation-0, #fff)',
                  color: 'var(--theme-text)',
                  fontSize: 12,
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--theme-elevation-400)' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  border: '1px solid var(--theme-elevation-200)',
                  background: 'var(--theme-elevation-0, #fff)',
                  color: 'var(--theme-text)',
                  fontSize: 12,
                }}
              />
              <button
                type="button"
                onClick={onApplyCustomRange}
                disabled={!customStartDate || !customEndDate || loading}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  background: 'var(--bs-primary, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            title="Reset filters to default"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--bs-radius-sm, 6px)',
              background: 'transparent',
              border: '1px solid var(--theme-elevation-200)',
              color: 'var(--theme-elevation-600)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.12s ease',
            }}
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  )
}
