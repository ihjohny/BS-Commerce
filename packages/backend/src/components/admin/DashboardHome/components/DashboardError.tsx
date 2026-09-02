'use client'

import React from 'react'

type DashboardErrorProps = {
  message: string
  onRetry: () => void
}

export function DashboardError({ message, onRetry }: DashboardErrorProps) {
  return (
    <div
      style={{
        margin: '2rem auto',
        maxWidth: 600,
        padding: '1.5rem',
        borderRadius: 10,
        border: '1px solid rgba(239, 68, 68, 0.3)',
        background: 'rgba(239, 68, 68, 0.06)',
        textAlign: 'center',
      }}
      role="alert"
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--theme-text)', margin: '0 0 6px 0' }}>
        Failed to load dashboard metrics
      </h3>
      <p style={{ fontSize: 13, color: 'var(--theme-elevation-600, #555)', margin: '0 0 16px 0' }}>
        {message}
      </p>

      <button
        onClick={onRetry}
        style={{
          padding: '0.5rem 1.25rem',
          borderRadius: 6,
          border: 'none',
          background: '#2563eb',
          color: '#fff',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  )
}
