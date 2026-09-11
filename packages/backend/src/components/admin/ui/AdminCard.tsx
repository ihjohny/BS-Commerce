'use client'

import React from 'react'

export interface AdminCardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  noPadding?: boolean
  padding?: string | number
  headerDivider?: boolean
  className?: string
  style?: React.CSSProperties
  headerStyle?: React.CSSProperties
  bodyStyle?: React.CSSProperties
}

export function AdminCard({
  title,
  subtitle,
  icon,
  badge,
  action,
  children,
  footer,
  noPadding = false,
  padding,
  headerDivider = true,
  className,
  style,
  headerStyle,
  bodyStyle,
}: AdminCardProps) {
  const hasHeader = Boolean(title || icon || action || badge)

  const resolvedPadding = noPadding ? 0 : padding ?? '1.25rem'

  return (
    <div
      className={`admin-card ${className || ''}`.trim()}
      style={{
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        borderRadius: 'var(--bs-radius-lg, 12px)',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.02))',
        position: 'relative',
        ...style,
      }}
    >
      {hasHeader && (
        <div
          className="admin-card__header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '1rem 1.25rem',
            borderBottom: headerDivider ? '1px solid var(--theme-elevation-150, #e2e8f0)' : 'none',
            ...headerStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {icon && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'var(--bs-primary, #2563eb)',
                }}
              >
                {icon}
              </span>
            )}
            {title && (
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 'var(--bs-font-md, 0.9375rem)',
                    fontWeight: 600,
                    color: 'var(--theme-text, #0f172a)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {title}
                </h3>
                {subtitle && (
                  <div
                    style={{
                      fontSize: 'var(--bs-font-xs, 0.75rem)',
                      color: 'var(--theme-elevation-500, #64748b)',
                      marginTop: 2,
                    }}
                  >
                    {subtitle}
                  </div>
                )}
              </div>
            )}
            {badge}
          </div>

          {action && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {action}
            </div>
          )}
        </div>
      )}

      <div
        className="admin-card__body"
        style={{
          padding: resolvedPadding,
          ...bodyStyle,
        }}
      >
        {children}
      </div>

      {footer && (
        <div
          className="admin-card__footer"
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
            background: 'var(--theme-elevation-50, rgba(248, 250, 252, 0.5))',
            borderBottomLeftRadius: 'calc(var(--bs-radius-lg, 12px) - 1px)',
            borderBottomRightRadius: 'calc(var(--bs-radius-lg, 12px) - 1px)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

export default AdminCard
