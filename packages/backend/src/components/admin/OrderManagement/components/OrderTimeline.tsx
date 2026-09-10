'use client'

import React, { useState } from 'react'
import { formatStatusLabel } from './OrderHeader'

export type StatusHistoryItem = {
  id: string
  timestamp: string
  fromStatus?: string | null
  toStatus: string
  changedBy?: {
    id?: string
    name?: string
    email?: string
  } | string | null
  notes?: string
}

export type OrderTimelineProps = {
  history: StatusHistoryItem[]
  currentStatus: string
  placedAt?: string
  createdAt: string
}

function formatHistoryDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function OrderTimeline({
  history,
  currentStatus,
  placedAt,
  createdAt,
}: OrderTimelineProps) {
  const [isOpen, setIsOpen] = useState(true)

  // Combine creation and history items
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div
      style={{
        background: 'var(--theme-elevation-0, #ffffff)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        borderRadius: 12,
        padding: '1.25rem',
        marginBottom: '1.25rem',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
            Order Audit & Status Timeline
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--theme-elevation-500, #64748b)', fontSize: 12 }}>
          <span>{isOpen ? 'Hide Details' : 'Show Details'}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'relative',
            paddingLeft: '1.25rem',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
          }}
        >
        {/* Vertical timeline connector line */}
        <div
          style={{
            position: 'absolute',
            left: '6px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            background: 'var(--theme-elevation-200, #e2e8f0)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sortedHistory.map((item, index) => {
            const isLatest = index === 0
            const changerName =
              typeof item.changedBy === 'object' && item.changedBy !== null
                ? item.changedBy.name || item.changedBy.email
                : 'Admin / System'

            return (
              <div
                key={item.id || index}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  fontSize: 13,
                }}
              >
                {/* Timeline node circle */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.25rem',
                    top: '3px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: isLatest ? 'var(--bs-primary, #2563eb)' : 'var(--theme-elevation-300, #94a3b8)',
                    border: '2px solid var(--theme-elevation-0, #ffffff)',
                    boxShadow: '0 0 0 2px var(--theme-elevation-150, #e2e8f0)',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                    {item.fromStatus
                      ? `${formatStatusLabel(item.fromStatus)} → ${formatStatusLabel(item.toStatus)}`
                      : `Status updated to ${formatStatusLabel(item.toStatus)}`}
                  </span>

                  {isLatest && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.12))',
                        color: 'var(--bs-primary, #2563eb)',
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>
                  <span>{formatHistoryDate(item.timestamp)}</span>
                  <span> • by </span>
                  <span style={{ fontWeight: 500, color: 'var(--theme-elevation-700, #334155)' }}>
                    {changerName}
                  </span>
                </div>

                {item.notes && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'var(--theme-elevation-50, #f8fafc)',
                      border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                      color: 'var(--theme-elevation-700, #334155)',
                    }}
                  >
                    {item.notes}
                  </div>
                )}
              </div>
            )
          })}

          {/* Initial Order Placed Node */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              fontSize: 13,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-1.25rem',
                top: '3px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'var(--bs-success, #16a34a)',
                border: '2px solid var(--theme-elevation-0, #ffffff)',
                boxShadow: '0 0 0 2px var(--theme-elevation-150, #e2e8f0)',
              }}
            />

            <span style={{ fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
              Order Created & Placed
            </span>

            <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>
              <span>{formatHistoryDate(placedAt || createdAt)}</span>
              <span> • Customer checkout</span>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
