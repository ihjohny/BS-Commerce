'use client'

import React from 'react'
import type { StoreOption } from '../../../lib/admin-dashboard-stats'

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

  const inputStyle: React.CSSProperties = {
    padding: '0.45rem 0.75rem',
    borderRadius: 6,
    border: '1px solid var(--theme-elevation-200)',
    background: 'var(--theme-elevation-0, #fff)',
    color: 'var(--theme-text)',
    fontSize: 13,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    height: 34,
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--theme-elevation-500)',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
      {/* 1. Page Title & Role Section */}
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
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--theme-text)' }}>
              Dashboard
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '2px 8px',
                borderRadius: 4,
                background: 'var(--theme-elevation-150, rgba(120,120,120,0.15))',
                color: 'var(--theme-elevation-600, #555)',
              }}
            >
              {role === 'admin' ? 'Store Admin' : 'Vendor Portal'}
            </span>
          </div>
          <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            Overview of sales, order fulfillment, customer activity, and inventory.
          </p>
        </div>

        {/* Top Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Data"
          style={{
            ...inputStyle,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--theme-elevation-100)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
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

      {/* 2. Dedicated Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '0.85rem',
          padding: '0.85rem 1rem',
          borderRadius: 8,
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-200)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.85rem' }}>
          {/* Store View Field */}
          {stores.length > 0 && (
            <div>
              <label style={labelStyle}>Store View</label>
              <select
                value={selectedStoreId || ''}
                onChange={(e) => onStoreChange(e.target.value ? e.target.value : null)}
                style={{ ...inputStyle, minWidth: 150 }}
                aria-label="Store View"
              >
                <option value="">All Store Views</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Range Preset Field */}
          <div>
            <label style={labelStyle}>Date Range</label>
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              style={{ ...inputStyle, minWidth: 140 }}
              aria-label="Date Range"
            >
              <option value="today">Today</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="mtd">Month to Date</option>
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range Fields */}
          {isCustom && (
            <>
              <div>
                <label style={labelStyle}>From</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>To</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <button
                  onClick={onApplyCustomRange}
                  disabled={!customStartDate || !customEndDate || loading}
                  style={{
                    ...inputStyle,
                    background: 'var(--theme-text)',
                    color: 'var(--theme-elevation-0, #fff)',
                    fontWeight: 600,
                    padding: '0 1rem',
                  }}
                >
                  Apply
                </button>
              </div>
            </>
          )}
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            title="Reset filters to default"
            style={{
              ...inputStyle,
              background: 'transparent',
              border: '1px solid var(--theme-elevation-200)',
              color: 'var(--theme-elevation-600, #555)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Reset to Default
          </button>
        )}
      </div>
    </div>
  )
}
