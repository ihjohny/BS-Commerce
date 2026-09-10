'use client'

import React from 'react'

export type OrderNotesCardProps = {
  notes?: string | null
  onEditNotes?: () => void
}

export function OrderNotesCard({ notes, onEditNotes }: OrderNotesCardProps) {
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
      <div
        style={{
          borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--theme-text, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Order & Delivery Notes
        </h2>

        {onEditNotes && (
          <button
            type="button"
            onClick={onEditNotes}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--bs-primary, #2563eb)',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            Edit Notes
          </button>
        )}
      </div>

      {notes ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--theme-text, #0f172a)',
            background: 'var(--theme-elevation-50, #f8fafc)',
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
          }}
        >
          {notes}
        </p>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--theme-elevation-500, #64748b)', fontStyle: 'italic' }}>
          No customer or delivery instructions provided.
        </div>
      )}
    </div>
  )
}
