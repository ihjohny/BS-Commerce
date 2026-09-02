'use client'

import React from 'react'
import type { NewCustomer } from '../../../lib/admin-dashboard-stats'

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
        borderRadius: 8,
        border: '1px solid var(--theme-elevation-200)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)' }}>
            New Customers
          </div>
          <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Recent user registrations
          </div>
        </div>

        <a
          href="/admin/collections/users"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--theme-text)',
            textDecoration: 'none',
          }}
        >
          View All &rarr;
        </a>
      </div>

      {customers.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
          No customer accounts found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
                  borderRadius: 6,
                  background: 'var(--theme-elevation-100)',
                  border: '1px solid var(--theme-elevation-150, rgba(120,120,120,0.08))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--theme-elevation-200)',
                      color: 'var(--theme-text)',
                      fontWeight: 600,
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
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: c.status === 'active' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                      color: c.status === 'active' ? 'var(--theme-success-500, #16a34a)' : 'var(--theme-error-500, #dc2626)',
                    }}
                  >
                    {c.status}
                  </span>
                  <div style={{ fontSize: 10, color: 'var(--theme-elevation-450, #888)', marginTop: 2 }}>
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
