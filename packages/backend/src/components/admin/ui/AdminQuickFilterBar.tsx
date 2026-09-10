'use client'

import React from 'react'

export interface AdminFilterTab<T extends string = string> {
  id: T
  label: string
  count?: number
  color?: string
  activeBg?: string
  icon?: React.ReactNode
}

export interface AdminQuickFilterBarProps<T extends string = string> {
  tabs: AdminFilterTab<T>[]
  activeTab: T
  onSelectTab: (tabId: T) => void
  title?: string
  rightAction?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function AdminQuickFilterBar<T extends string = string>({
  tabs,
  activeTab,
  onSelectTab,
  title = 'Quick Filter:',
  rightAction,
  className,
  style,
}: AdminQuickFilterBarProps<T>) {
  return (
    <div
      className={`admin-quick-filter-bar ${className || ''}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.65rem 0.95rem',
        marginBottom: '0.85rem',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        borderRadius: 10,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        {title && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--theme-elevation-500, #64748b)',
              marginRight: '0.35rem',
              userSelect: 'none',
            }}
          >
            {title}
          </span>
        )}

        {tabs.map((t) => {
          const isActive = activeTab === t.id
          const activeBg = t.activeBg || 'var(--bs-primary, #2563eb)'

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8125rem', // 13px
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'var(--theme-elevation-700, #334155)',
                background: isActive ? activeBg : 'var(--theme-elevation-100, #f1f5f9)',
                border: isActive
                  ? `1px solid ${activeBg}`
                  : '1px solid var(--theme-elevation-200, #e2e8f0)',
                borderRadius: 'var(--bs-radius-sm, 6px)',
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--theme-elevation-150, #e2e8f0)'
                  e.currentTarget.style.borderColor = 'var(--theme-elevation-300, #cbd5e1)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--theme-elevation-100, #f1f5f9)'
                  e.currentTarget.style.borderColor = 'var(--theme-elevation-200, #e2e8f0)'
                }
              }}
            >
              {t.icon && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: isActive ? '#ffffff' : t.color || 'var(--theme-elevation-600, #64748b)',
                  }}
                >
                  {t.icon}
                </span>
              )}
              <span>{t.label}</span>
              {typeof t.count === 'number' && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 9999,
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--theme-elevation-200, #cbd5e1)',
                    color: isActive ? '#ffffff' : 'var(--theme-elevation-700, #334155)',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {rightAction && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {rightAction}
        </div>
      )}
    </div>
  )
}

export default AdminQuickFilterBar
