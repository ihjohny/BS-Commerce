'use client'

import React from 'react'
import type { KpiMetric } from '../../../../lib/admin-dashboard-stats'
import { AdminKpiCard } from '../../ui'

type KpiCardsProps = {
  currency: string
  kpis: {
    revenue: KpiMetric
    orders: KpiMetric
    customers: KpiMetric
    aov: KpiMetric
  }
  sparklines?: {
    revenue?: number[]
    orders?: number[]
    customers?: number[]
    aov?: number[]
  }
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

export function KpiCards({ currency, kpis, sparklines }: KpiCardsProps) {
  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(kpis.revenue.value, currency),
      change: kpis.revenue.changePercentage,
      href: '/admin/collections/orders',
      sublabel: `vs prev: ${formatCurrency(kpis.revenue.previousValue, currency)}`,
      iconVariant: 'primary' as const,
      sparklinePoints: sparklines?.revenue,
      sparklineColor: 'var(--bs-primary, #2563eb)',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Total Orders',
      value: kpis.orders.value.toLocaleString(),
      change: kpis.orders.changePercentage,
      href: '/admin/collections/orders',
      sublabel: `vs prev: ${kpis.orders.previousValue.toLocaleString()} orders`,
      iconVariant: 'purple' as const,
      sparklinePoints: sparklines?.orders,
      sparklineColor: '#7c3aed',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      label: 'Total Customers',
      value: kpis.customers.value.toLocaleString(),
      change: kpis.customers.changePercentage,
      href: '/admin/collections/users',
      sublabel: `vs prev: ${kpis.customers.previousValue.toLocaleString()} accounts`,
      iconVariant: 'success' as const,
      sparklinePoints: sparklines?.customers,
      sparklineColor: 'var(--bs-success, #16a34a)',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(kpis.aov.value, currency),
      change: kpis.aov.changePercentage,
      href: '/admin/collections/orders',
      sublabel: `vs prev: ${formatCurrency(kpis.aov.previousValue, currency)}`,
      iconVariant: 'warning' as const,
      sparklinePoints: sparklines?.aov,
      sparklineColor: 'var(--bs-warning, #d97706)',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
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
        marginBottom: '1.5rem',
      }}
    >
      {cards.map((c) => (
        <AdminKpiCard
          key={c.label}
          label={c.label}
          value={c.value}
          change={c.change}
          sublabel={c.sublabel}
          href={c.href}
          icon={c.icon}
          iconVariant={c.iconVariant}
          sparklinePoints={c.sparklinePoints}
          sparklineColor={c.sparklineColor}
        />
      ))}
    </div>
  )
}

export default KpiCards
