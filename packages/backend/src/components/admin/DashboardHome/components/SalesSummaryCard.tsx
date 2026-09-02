'use client'

import React from 'react'
import type { SalesSummary } from '../../../lib/admin-dashboard-stats'

type SalesSummaryCardProps = {
  summary: SalesSummary
  currency: string
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SalesSummaryCard({ summary, currency }: SalesSummaryCardProps) {
  const rows = [
    { label: 'Gross Revenue', value: summary.revenue, bold: true },
    { label: 'Net Subtotal', value: summary.subtotal },
    { label: 'Tax Total', value: summary.taxTotal },
    { label: 'Shipping Total', value: summary.shippingTotal },
    { label: 'Discounts Total', value: summary.discountTotal, isNegative: true },
    { label: 'Refunds / Returns', value: summary.refundTotal, isNegative: true, isError: true },
  ]

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--theme-elevation-200)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)', marginBottom: '0.25rem' }}>
        Sales Breakdown
      </div>
      <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginBottom: '1rem' }}>
        Financial breakdown for active range
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '0.55rem',
              borderBottom: '1px solid var(--theme-elevation-150, rgba(120, 120, 120, 0.1))',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: row.bold ? 'var(--theme-text)' : 'var(--theme-elevation-600, #555)',
                fontWeight: row.bold ? 700 : 500,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: row.bold ? 700 : 600,
                color: row.isError ? 'var(--theme-error-500, #dc2626)' : 'var(--theme-text)',
              }}
            >
              {row.isNegative && row.value > 0
                ? `-${formatCurrency(row.value, currency)}`
                : formatCurrency(row.value, currency)}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem 0.85rem',
          borderRadius: 6,
          background: 'var(--theme-elevation-100)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-elevation-600, #555)' }}>
          Merchandise Margin Ratio
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>
          {summary.revenue > 0 ? `${((summary.subtotal / summary.revenue) * 100).toFixed(1)}%` : '100%'}
        </span>
      </div>
    </div>
  )
}
