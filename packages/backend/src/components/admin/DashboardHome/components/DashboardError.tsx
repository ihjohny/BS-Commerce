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
        margin: '3rem auto',
        maxWidth: 540,
        padding: '2rem',
        borderRadius: 'var(--bs-radius-md, 8px)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        background: 'var(--theme-elevation-50)',
        boxShadow: 'var(--bs-shadow-sm)',
        textAlign: 'center',
      }}
      role="alert"
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(220, 38, 38, 0.1)',
          color: 'var(--bs-error, #dc2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px auto',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--theme-text)', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
        Unable to Load Dashboard Data
      </h3>
      <p style={{ fontSize: 13, color: 'var(--theme-elevation-600)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
        {message}
      </p>

      <button
        onClick={onRetry}
        style={{
          padding: '0.55rem 1.4rem',
          borderRadius: 'var(--bs-radius-sm, 6px)',
          border: 'none',
          background: 'var(--bs-primary, #2563eb)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bs-primary-hover, #1d4ed8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bs-primary, #2563eb)'
        }}
      >
        Retry Connection
      </button>
    </div>
  )
}
