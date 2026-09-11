'use client'

import React from 'react'
import Link from 'next/link'
import type { NewCustomer } from '../../../../lib/admin-dashboard-stats'
import { AdminStatusBadge } from '../../ui'

type NewCustomersCardProps = {
  customers: NewCustomer[]
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export function NewCustomersCard({ customers }: NewCustomersCardProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--bs-font-md, 0.9375rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)', letterSpacing: '-0.015em' }}>
            New Customers
          </div>
          <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
            Recent user registrations and activity
          </div>
        </div>

        <Link
          href="/admin/collections/users"
          style={{
            fontSize: 'var(--bs-font-sm, 0.8125rem)',
            fontWeight: 600,
            color: 'var(--bs-primary, #2563eb)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>Users</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {customers.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400, #94a3b8)', fontSize: 'var(--bs-font-sm, 0.8125rem)' }}>
          No customer accounts found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {customers.map((c) => {
            const initials = c.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'U'

            return (
              <a
                key={c.id}
                href={`/admin/collections/users/${c.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '8px 10px',
                  borderRadius: 'var(--bs-radius-sm, 7px)',
                  background: 'var(--theme-elevation-50, #f8fafc)',
                  border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
                  e.currentTarget.style.background = 'var(--theme-elevation-0, #ffffff)'
                  e.currentTarget.style.boxShadow = 'var(--bs-shadow-xs)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--theme-elevation-150, #e2e8f0)'
                  e.currentTarget.style.background = 'var(--theme-elevation-50, #f8fafc)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--theme-elevation-100, #f1f5f9)',
                      border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                      color: 'var(--theme-elevation-700, #334155)',
                      fontWeight: 700,
                      fontSize: 'var(--bs-font-xs, 0.75rem)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 'var(--bs-font-base, 0.875rem)',
                        fontWeight: 600,
                        color: 'var(--theme-text, #0f172a)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--bs-font-xs, 0.75rem)',
                        color: 'var(--theme-elevation-500, #64748b)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2,
                      }}
                    >
                      {c.email || c.phone || 'No contact info'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <AdminStatusBadge status={c.status} type="user" />
                  <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-450, #64748b)', marginTop: 3 }}>
                    {formatDate(c.createdAt)}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

