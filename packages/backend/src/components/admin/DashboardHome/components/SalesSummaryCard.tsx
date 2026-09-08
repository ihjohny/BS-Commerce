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
        borderRadius: 'var(--bs-radius-md, 8px)',
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: 'var(--bs-shadow-xs)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
        Sales Breakdown
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', marginBottom: '1.25rem' }}>
        Financial breakdown for active range
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--theme-elevation-150)',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: row.bold ? 'var(--theme-text)' : 'var(--theme-elevation-600)',
                fontWeight: row.bold ? 700 : 500,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: row.bold ? 700 : 600,
                color: row.isError ? 'var(--bs-error, #dc2626)' : 'var(--theme-text)',
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
          marginTop: '1.25rem',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--bs-radius-sm, 6px)',
          background: 'var(--theme-elevation-100)',
          border: '1px solid var(--theme-elevation-150)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-elevation-600)' }}>
          Merchandise Margin Ratio
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--bs-primary, #2563eb)',
            background: 'var(--bs-primary-subtle)',
            padding: '2px 8px',
            borderRadius: 'var(--bs-radius-full)',
          }}
        >
          {summary.revenue > 0 ? `${((summary.subtotal / summary.revenue) * 100).toFixed(1)}%` : '100%'}
        </span>
      </div>
    </div>
  )
}
