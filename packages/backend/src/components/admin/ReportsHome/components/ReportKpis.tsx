'use client'

import React from 'react'
import type { ReportKpi } from '../../../../lib/admin-reports'

type ReportKpisProps = {
  kpis: ReportKpi[]
}

function getKpiIcon(key: string) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (key.includes('revenue') || key.includes('sales') || key.includes('value') || key.includes('discount')) {
    return (
      <svg {...props}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  }

  if (key.includes('order') || key.includes('volume') || key.includes('count') || key.includes('cart')) {
    return (
      <svg {...props}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    )
  }

  if (key.includes('customer') || key.includes('user') || key.includes('retention') || key.includes('buyer')) {
    return (
      <svg {...props}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    )
  }

  return (
    <svg {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

export function ReportKpis({ kpis }: ReportKpisProps) {
  if (!kpis || kpis.length === 0) return null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          style={{
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--bs-radius-md, 8px)',
            boxShadow: 'var(--bs-shadow-xs)',
            padding: '1.25rem 1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = 'var(--bs-shadow-sm)'
            e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'var(--bs-shadow-xs)'
            e.currentTarget.style.borderColor = 'var(--theme-elevation-150)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--theme-elevation-500)',
              }}
            >
              {kpi.label}
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--bs-radius-sm, 6px)',
                background: 'rgba(37, 99, 235, 0.08)',
                color: 'var(--bs-primary, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getKpiIcon(kpi.key)}
            </div>
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--theme-text)',
              lineHeight: 1.2,
              marginBottom: 4,
              letterSpacing: '-0.02em',
            }}
          >
            {kpi.formattedValue}
          </div>

          {kpi.subtext && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--theme-elevation-500)',
              }}
            >
              {kpi.subtext}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
