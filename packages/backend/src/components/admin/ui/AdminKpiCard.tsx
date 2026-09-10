'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export interface AdminKpiCardProps {
  label: string
  value: React.ReactNode
  change?: number | null
  sublabel?: React.ReactNode
  icon?: React.ReactNode
  href?: string
  badge?: React.ReactNode
  compact?: boolean
  className?: string
  style?: React.CSSProperties
  iconVariant?: 'neutral' | 'primary'
}

export function AdminKpiTrendBadge({ change }: { change?: number | null }) {
  if (change === null || change === undefined || isNaN(change)) return null

  const isPositive = change > 0
  const isZero = change === 0

  const color = isZero
    ? 'var(--theme-elevation-500, #64748b)'
    : isPositive
    ? 'var(--bs-success, #16a34a)'
    : 'var(--bs-error, #dc2626)'

  const bg = isZero
    ? 'var(--theme-elevation-150, #e2e8f0)'
    : isPositive
    ? 'var(--bs-success-subtle, rgba(22, 163, 74, 0.1))'
    : 'var(--bs-error-subtle, rgba(220, 38, 38, 0.1))'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: '0.6875rem', // 11px
        fontWeight: 600,
        color,
        background: bg,
        padding: '1.5px 7px',
        borderRadius: 'var(--bs-radius-full, 9999px)',
        lineHeight: 1.2,
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

export function AdminKpiCard({
  label,
  value,
  change,
  sublabel,
  icon,
  href,
  badge,
  compact = false,
  className,
  style,
  iconVariant = 'neutral',
}: AdminKpiCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    textDecoration: 'none',
    color: 'inherit',
    padding: compact ? '1rem 1.15rem' : '1.15rem 1.25rem',
    borderRadius: 'var(--bs-radius-lg, 12px)',
    border: `1px solid ${
      isHovered && href
        ? 'var(--bs-primary, #2563eb)'
        : isHovered
        ? 'var(--theme-elevation-300, #94a3b8)'
        : 'var(--theme-elevation-150, #e2e8f0)'
    }`,
    background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
    boxShadow: isHovered ? 'var(--bs-shadow-sm)' : 'var(--bs-shadow-xs)',
    transform: isHovered && href ? 'translateY(-1px)' : 'none',
    transition: 'all 0.15s ease',
    cursor: href ? 'pointer' : 'default',
    minHeight: compact ? 92 : 112,
    ...style,
  }

  const content = (
    <>
      {/* Top Header Row: Label + Icon / Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: compact ? 8 : 12,
        }}
      >
        <span
          style={{
            fontSize: '0.71875rem', // 11.5px
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--theme-elevation-500, #64748b)',
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {badge}
          {icon && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--bs-radius-sm, 6px)',
                background:
                  iconVariant === 'primary'
                    ? 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.08))'
                    : 'var(--theme-elevation-100, #f1f5f9)',
                color:
                  iconVariant === 'primary'
                    ? 'var(--bs-primary, #2563eb)'
                    : 'var(--theme-elevation-600, #64748b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Middle Value + Trend Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: sublabel ? 5 : 0,
        }}
      >
        <div
          style={{
            fontSize: compact ? '1.35rem' : '1.55rem', // 22px / 25px
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--theme-text, #0f172a)',
          }}
        >
          {value}
        </div>
        <AdminKpiTrendBadge change={change} />
      </div>

      {/* Bottom Sublabel / Help text */}
      {sublabel && (
        <div
          style={{
            fontSize: '0.75rem', // 12px
            color: 'var(--theme-elevation-450, #64748b)',
            fontWeight: 400,
            lineHeight: 1.35,
          }}
        >
          {sublabel}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={`admin-kpi-card ${className || ''}`.trim()}
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      className={`admin-kpi-card ${className || ''}`.trim()}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </div>
  )
}

export default AdminKpiCard
