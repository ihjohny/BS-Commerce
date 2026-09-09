'use client'

import React from 'react'
import Link from 'next/link'
import type { NewCustomer } from '../../../../lib/admin-dashboard-stats'

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
        borderRadius: 12,
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-0, var(--theme-bg))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--theme-elevation-150)',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text)', letterSpacing: '-0.02em' }}>
            New Customers
          </div>
          <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Recent user registrations and activity
          </div>
        </div>

        <Link
          href="/admin/collections/users"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--bs-primary, #2563eb)',
            textDecoration: 'none',
          }}
        >
          Users &rarr;
        </Link>
      </div>

      {customers.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
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
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  background: 'var(--theme-elevation-100)',
                  border: '1px solid var(--theme-elevation-150)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
                  e.currentTarget.style.background = 'var(--theme-elevation-150)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--theme-elevation-150)'
                  e.currentTarget.style.background = 'var(--theme-elevation-100)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--theme-elevation-150)',
                      border: '1px solid var(--theme-elevation-200)',
                      color: 'var(--theme-elevation-700)',
                      fontWeight: 700,
                      fontSize: 11,
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
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--theme-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--theme-elevation-500)',
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
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: 999,
                      letterSpacing: '0.04em',
                      background: c.status === 'active' ? 'var(--bs-success-subtle)' : 'var(--bs-error-subtle)',
                      color: c.status === 'active' ? 'var(--bs-success, #16a34a)' : 'var(--bs-error, #dc2626)',
                    }}
                  >
                    {c.status}
                  </span>
                  <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', marginTop: 3 }}>
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
