'use client'

import React from 'react'
import type { SalesSummary } from '../../../../lib/admin-dashboard-stats'

type SalesSummaryCardProps = {
  summary: SalesSummary
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

export function SalesSummaryCard({ summary, currency }: SalesSummaryCardProps) {
  const rows = [
    { label: 'Gross Sales', value: summary.revenue, bold: true, tooltip: 'Total customer spend before deductions' },
    { label: 'Net Subtotal', value: summary.subtotal, tooltip: 'Merchandise value minus returns and discounts' },
    { label: 'Taxes Collected', value: summary.taxTotal, tooltip: 'Sales and value added taxes' },
    { label: 'Shipping Charged', value: summary.shippingTotal, tooltip: 'Freight and shipping fees billed' },
    { label: 'Discounts Granted', value: summary.discountTotal, isNegative: true, tooltip: 'Coupon and promotion deductions' },
    { label: 'Refunds & Returns', value: summary.refundTotal, isNegative: true, isError: true, tooltip: 'Amount returned or refunded to customers' },
  ]

  const merchandiseRatio = summary.revenue > 0 ? (summary.subtotal / summary.revenue) * 100 : 100

  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
      }}
    >
      <div style={{ marginBottom: '1.15rem' }}>
        <div style={{ fontSize: 'var(--bs-font-md, 0.9375rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)', letterSpacing: '-0.015em' }}>
          Financial Summary
        </div>
        <div style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
          Accounting breakdown for selected timeframe
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            title={row.tooltip}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.45rem 0',
              borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--bs-font-base, 0.875rem)',
                color: row.bold ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #475569)',
                fontWeight: row.bold ? 600 : 450,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: 'var(--bs-font-base, 0.875rem)',
                fontWeight: row.bold ? 700 : 600,
                fontVariantNumeric: 'tabular-nums',
                color: row.isError && row.value > 0
                  ? 'var(--bs-error, #dc2626)'
                  : row.isNegative && row.value > 0
                  ? 'var(--theme-elevation-700, #334155)'
                  : 'var(--theme-text, #0f172a)',
              }}
            >
              {row.isNegative && row.value > 0
                ? `-${formatCurrency(row.value, currency)}`
                : formatCurrency(row.value, currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Margin Highlight Footer */}
      <div
        style={{
          marginTop: '1.25rem',
          padding: '0.75rem 0.85rem',
          borderRadius: 'var(--bs-radius-sm, 7px)',
          background: 'var(--theme-elevation-50, #f8fafc)',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', fontWeight: 600, color: 'var(--theme-elevation-700, #334155)' }}>
            Net Realization Rate
          </div>
          <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 1 }}>
            Net Subtotal vs Gross Revenue
          </div>
        </div>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--bs-primary, #2563eb)',
            background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.08))',
            border: '1px solid var(--bs-primary-border, rgba(37, 99, 235, 0.2))',
            padding: '2px 8px',
            borderRadius: 'var(--bs-radius-full, 9999px)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {merchandiseRatio.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

