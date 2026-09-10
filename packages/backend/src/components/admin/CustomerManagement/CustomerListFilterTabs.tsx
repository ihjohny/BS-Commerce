'use client'

import React, { useMemo } from 'react'
import { useListQuery } from '@payloadcms/ui'

/**
 * Client component rendered via admin.components.beforeListTable on the `users` collection.
 * Provides quick-filter tabs for customer status ('All', 'Active', 'Suspended / Inactive', 'Customers Only')
 * and synchronizes automatically with Payload's native list query, search, and pagination.
 */
export function CustomerListFilterTabs() {
  const { handleWhereChange, query } = useListQuery()

  // Determine current active filter from list query
  const currentTab = useMemo(() => {
    const where = query?.where as any
    if (!where) return 'all'

    // Check status equals
    if (where.status?.equals === 'active') return 'active'
    if (where.status?.equals === 'suspended' || where.status?.equals === 'banned') return 'inactive'
    if (Array.isArray(where.status?.in) && (where.status.in.includes('suspended') || where.status.in.includes('banned'))) {
      return 'inactive'
    }

    // Check role equals
    if (where.role?.equals === 'customer') return 'customer'
    if (where.role?.equals === 'admin') return 'admin'

    // Check 'and' conditions if present
    if (Array.isArray(where.and)) {
      for (const cond of where.and) {
        if (cond?.status?.equals === 'active') return 'active'
        if (cond?.status?.equals === 'suspended' || cond?.status?.equals === 'banned') return 'inactive'
        if (Array.isArray(cond?.status?.in) && (cond.status.in.includes('suspended') || cond.status.in.includes('banned'))) {
          return 'inactive'
        }
        if (cond?.role?.equals === 'customer') return 'customer'
        if (cond?.role?.equals === 'admin') return 'admin'
      }
    }

    return 'all'
  }, [query?.where])

  const setFilterTab = (tab: 'all' | 'active' | 'inactive' | 'customer' | 'admin') => {
    if (typeof handleWhereChange !== 'function') return

    if (tab === 'all') {
      handleWhereChange({} as any)
      return
    }

    if (tab === 'active') {
      handleWhereChange({
        status: { equals: 'active' },
      })
      return
    }

    if (tab === 'inactive') {
      handleWhereChange({
        status: { in: ['suspended', 'banned'] },
      })
      return
    }

    if (tab === 'customer') {
      handleWhereChange({
        role: { equals: 'customer' },
      })
      return
    }

    if (tab === 'admin') {
      handleWhereChange({
        role: { equals: 'admin' },
      })
      return
    }
  }

  const tabs = [
    {
      id: 'all',
      label: 'All Users',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'active',
      label: 'Active',
      icon: (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--bs-success, #16a34a)',
            display: 'inline-block',
          }}
        />
      ),
    },
    {
      id: 'inactive',
      label: 'Inactive / Suspended',
      icon: (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--bs-error, #dc2626)',
            display: 'inline-block',
          }}
        />
      ),
    },
    {
      id: 'customer',
      label: 'Customers Only',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      id: 'admin',
      label: 'Admin only',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ] as const

  return (
    <div
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--theme-elevation-500, #64748b)',
            marginRight: '0.35rem',
          }}
        >
          Quick Filter:
        </span>

        {tabs.map((t) => {
          const isActive = currentTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'var(--theme-elevation-700, #334155)',
                background: isActive
                  ? 'var(--bs-primary, #2563eb)'
                  : 'var(--theme-elevation-100, #f1f5f9)',
                border: isActive
                  ? '1px solid var(--bs-primary, #2563eb)'
                  : '1px solid var(--theme-elevation-200, #e2e8f0)',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 2px rgba(37, 99, 235, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CustomerListFilterTabs
