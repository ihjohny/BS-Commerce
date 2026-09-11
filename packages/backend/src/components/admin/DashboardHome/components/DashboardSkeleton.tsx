'use client'

import React from 'react'

export function DashboardSkeleton() {
  const pulseBlock: React.CSSProperties = {
    borderRadius: 'var(--bs-radius-sm, 6px)',
    background: 'var(--theme-elevation-150)',
    animation: 'pulse 1.5s ease-in-out infinite',
  }

  return (
    <div style={{ padding: '0.75rem 2rem 2.5rem 2rem', maxWidth: 1440, margin: '0 auto' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }
      `}</style>

      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.75rem', gap: 16 }}>
        <div>
          <div style={{ ...pulseBlock, width: 180, height: 28, marginBottom: 8 }} />
          <div style={{ ...pulseBlock, width: 280, height: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ ...pulseBlock, width: 140, height: 36 }} />
          <div style={{ ...pulseBlock, width: 120, height: 36 }} />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              padding: '1.15rem 1.25rem',
              borderRadius: 12,
              border: '1px solid var(--theme-elevation-150)',
              background: 'var(--theme-elevation-0, var(--theme-bg))',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
              height: 110,
            }}
          >
            <div style={{ ...pulseBlock, width: '40%', height: 14, marginBottom: 12 }} />
            <div style={{ ...pulseBlock, width: '60%', height: 24, marginBottom: 8 }} />
            <div style={{ ...pulseBlock, width: '30%', height: 10 }} />
          </div>
        ))}
      </div>

      {/* Chart & Order Status Radial Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            gridColumn: 'span 8 / span 12',
            padding: '1.25rem 1.5rem',
            borderRadius: 12,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-0, var(--theme-bg))',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            height: 340,
          }}
        >
          <div style={{ ...pulseBlock, width: '30%', height: 18, marginBottom: 20 }} />
          <div style={{ ...pulseBlock, width: '100%', height: 260 }} />
        </div>

        <div
          style={{
            gridColumn: 'span 4 / span 12',
            padding: '1.25rem 1.5rem',
            borderRadius: 12,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-0, var(--theme-bg))',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            height: 340,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ ...pulseBlock, width: '50%', height: 18, alignSelf: 'flex-start' }} />
          <div style={{ ...pulseBlock, width: 150, height: 150, borderRadius: '50%' }} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ ...pulseBlock, width: '100%', height: 16 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
