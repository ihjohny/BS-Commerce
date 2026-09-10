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

export function KpiCards({ currency, kpis }: KpiCardsProps) {
  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(kpis.revenue.value, currency),
      change: kpis.revenue.changePercentage,
      href: '/admin/collections/orders',
      sublabel: `vs prev: ${formatCurrency(kpis.revenue.previousValue, currency)}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Total Orders',
      value: kpis.orders.value.toLocaleString(),
      change: kpis.orders.changePercentage,
      href: '/admin/collections/orders',
      sublabel: `vs prev: ${kpis.orders.previousValue.toLocaleString()}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
    {
      label: 'Total Customers',
      value: kpis.customers.value.toLocaleString(),
      change: kpis.customers.changePercentage,
      href: '/admin/collections/users',
      sublabel: 'Registered accounts',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Average Order Value',
      value: formatCurrency(kpis.aov.value, currency),
      change: kpis.aov.changePercentage,
      href: '/admin/collections/orders',
      sublabel: `vs prev: ${formatCurrency(kpis.aov.previousValue, currency)}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem',
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
        />
      ))}
    </div>
  )
}

export default KpiCards
