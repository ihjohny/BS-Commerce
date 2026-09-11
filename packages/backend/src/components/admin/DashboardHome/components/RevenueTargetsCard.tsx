'use client'

import React from 'react'

type RevenueTargetsCardProps = {
  currentRevenue: number
  targetRevenue: number
  currentOrders: number
  targetOrders: number
  currentCustomers: number
  targetCustomers: number
  currency: string
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  const num = Number(amount || 0)
  const hasDecimals = num % 1 !== 0
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function RevenueTargetsCard({
  currentRevenue,
  targetRevenue,
  currentOrders,
  targetOrders,
  currentCustomers,
  targetCustomers,
  currency,
}: RevenueTargetsCardProps) {
  const targets = [
    {
      label: 'Monthly Revenue Target',
      current: currentRevenue,
      target: targetRevenue,
      formattedCurrent: formatCurrency(currentRevenue, currency),
      formattedTarget: formatCurrency(targetRevenue, currency),
      percentage: Math.min(100, Math.round((currentRevenue / (targetRevenue || 1)) * 100)),
      color: 'var(--bs-primary, #2563eb)',
    },
    {
      label: 'Order Volume Target',
      current: currentOrders,
      target: targetOrders,
      formattedCurrent: `${currentOrders.toLocaleString()} orders`,
      formattedTarget: `${targetOrders.toLocaleString()} orders`,
      percentage: Math.min(100, Math.round((currentOrders / (targetOrders || 1)) * 100)),
      color: '#7c3aed',
    },
    {
      label: 'Customer Acquisition Target',
      current: currentCustomers,
      target: targetCustomers,
      formattedCurrent: `${currentCustomers.toLocaleString()} users`,
      formattedTarget: `${targetCustomers.toLocaleString()} users`,
      percentage: Math.min(100, Math.round((currentCustomers / (targetCustomers || 1)) * 100)),
      color: 'var(--bs-success, #16a34a)',
    },
  ]

  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            fontSize: 'var(--bs-font-md, 0.9375rem)',
            fontWeight: 600,
            color: 'var(--theme-text, #0f172a)',
            letterSpacing: '-0.015em',
          }}
        >
          Revenue Targets
        </div>
        <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
          Monthly progress toward growth goals
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'space-around' }}>
        {targets.map((t) => (
          <div key={t.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                {t.label}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: t.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t.percentage}%
              </span>
            </div>

            {/* Progress track */}
            <div
              style={{
                width: '100%',
                height: 8,
                borderRadius: 9999,
                background: 'var(--theme-elevation-100, #f1f5f9)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${t.percentage}%`,
                  backgroundColor: t.color,
                  borderRadius: 9999,
                  transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--theme-elevation-500, #64748b)' }}>
              <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>
                {t.formattedCurrent}
              </span>
              <span>Target: {t.formattedTarget}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
