'use client'

import React, { useMemo } from 'react'
import { useListQuery } from '@payloadcms/ui'

import { AdminQuickFilterBar, type AdminFilterTab } from '../ui'

export type CustomerFilterTabKey = 'all' | 'active' | 'inactive' | 'customer' | 'admin'

/**
 * Client component rendered via admin.components.beforeListTable on the `users` collection.
 * Provides quick-filter tabs for customer status ('All', 'Active', 'Suspended / Inactive', 'Customers Only')
 * and synchronizes automatically with Payload's native list query, search, and pagination.
 */
export function CustomerListFilterTabs() {
  const { handleWhereChange, query } = useListQuery()

  // Determine current active filter from list query
  const currentTab = useMemo<CustomerFilterTabKey>(() => {
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

  const setFilterTab = (tab: CustomerFilterTabKey) => {
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

  const tabs: AdminFilterTab<CustomerFilterTabKey>[] = [
    {
      id: 'all',
      label: 'All Users',
      color: 'var(--theme-elevation-700, #334155)',
      activeBg: 'var(--bs-primary, #2563eb)',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      color: 'var(--bs-success, #16a34a)',
      activeBg: 'var(--bs-success, #16a34a)',
      icon: (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }}
        />
      ),
    },
    {
      id: 'inactive',
      label: 'Inactive / Suspended',
      color: 'var(--bs-error, #dc2626)',
      activeBg: 'var(--bs-error, #dc2626)',
      icon: (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }}
        />
      ),
    },
    {
      id: 'customer',
      label: 'Customers Only',
      color: '#4f46e5',
      activeBg: '#4f46e5',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      id: 'admin',
      label: 'Admin only',
      color: '#7c3aed',
      activeBg: '#7c3aed',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ]

  return (
    <AdminQuickFilterBar<CustomerFilterTabKey>
      tabs={tabs}
      activeTab={currentTab}
      onSelectTab={setFilterTab}
    />
  )
}

export default CustomerListFilterTabs
