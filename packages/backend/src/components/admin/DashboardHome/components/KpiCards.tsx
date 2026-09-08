'use client'

import React from 'react'
import type { KpiMetric } from '../../../lib/admin-dashboard-stats'

type KpiCardsProps = {
  currency: string
  kpis: {
    revenue: KpiMetric
    orders: KpiMetric
    customers: KpiMetric
    aov: KpiMetric
  }
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function TrendBadge({ change }: { change: number | null }) {
  if (change === null || isNaN(change)) return null

  const isPositive = change > 0
  const isZero = change === 0

  const color = isZero
    ? 'var(--theme-elevation-500)'
    : isPositive
    ? 'var(--bs-success, #16a34a)'
    : 'var(--bs-error, #dc2626)'

  const bg = isZero
    ? 'var(--theme-elevation-150)'
    : isPositive
    ? 'var(--bs-success-subtle, rgba(22,163,74,0.1))'
    : 'var(--bs-error-subtle, rgba(220,38,38,0.1))'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 11.5,
        fontWeight: 600,
        color: color,
        background: bg,
        padding: '2px 7px',
        borderRadius: 'var(--bs-radius-full, 9999px)',
      }}
    >
      {!isZero && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isPositive ? 'none' : 'rotate(180deg)' }}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
      <span>{isPositive ? `+${change}%` : `${change}%`}</span>
    </span>
  )
}

export function KpiCards({ currency, kpis }: KpiCardsProps) {
  const cards = [
    {
      label: 'Revenue',
      value: formatCurrency(kpis.revenue.value, currency),
      metric: kpis.revenue,
      href: '/admin/collections/orders',
      sublabel: `Prev: ${formatCurrency(kpis.revenue.previousValue, currency)}`,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#10b981',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Orders',
      value: kpis.orders.value.toLocaleString(),
      metric: kpis.orders,
      href: '/admin/collections/orders',
      sublabel: `Prev: ${kpis.orders.previousValue.toLocaleString()} orders`,
      iconBg: 'rgba(37, 99, 235, 0.12)',
      iconColor: '#2563eb',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
    {
      label: 'Customers',
      value: kpis.customers.value.toLocaleString(),
      metric: kpis.customers,
      href: '/admin/collections/users',
      sublabel: 'Registered accounts',
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: '#8b5cf6',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Avg. Order Value',
      value: formatCurrency(kpis.aov.value, currency),
      metric: kpis.aov,
      href: '/admin/collections/orders',
      sublabel: `Prev: ${formatCurrency(kpis.aov.previousValue, currency)}`,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: '#f59e0b',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}
    >
      {cards.map((c) => (
        <a
          key={c.label}
          href={c.href}
          style={{
            display: 'block',
            textDecoration: 'none',
            color: 'inherit',
            padding: '1.25rem 1.35rem',
            borderRadius: 'var(--bs-radius-md, 8px)',
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
            boxShadow: 'var(--bs-shadow-xs)',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--bs-primary-border)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--bs-shadow-md)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-elevation-150)'
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'var(--bs-shadow-xs)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-elevation-500)' }}>
              {c.label}
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--bs-radius-sm, 6px)',
                background: c.iconBg,
                color: c.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {c.icon}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: 'var(--theme-text)',
              }}
            >
              {c.value}
            </div>
            <TrendBadge change={c.metric.changePercentage} />
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--theme-elevation-450, #888)' }}>
            {c.sublabel}
          </div>
        </a>
      ))}
    </div>
  )
}
