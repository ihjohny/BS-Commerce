'use client'

import React from 'react'

export function DashboardSkeleton() {
  const pulseBlock: React.CSSProperties = {
    borderRadius: 8,
    background: 'var(--theme-elevation-150, rgba(120, 120, 120, 0.15))',
    animation: 'pulse 1.5s ease-in-out infinite',
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: 16 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              padding: '1.25rem 1.4rem',
              borderRadius: 10,
              border: '1px solid var(--theme-elevation-200)',
              background: 'var(--theme-elevation-50)',
              height: 110,
            }}
          >
            <div style={{ ...pulseBlock, width: '40%', height: 14, marginBottom: 12 }} />
            <div style={{ ...pulseBlock, width: '60%', height: 24, marginBottom: 8 }} />
            <div style={{ ...pulseBlock, width: '30%', height: 10 }} />
          </div>
        ))}
      </div>

      {/* Chart & Summary Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 10,
            border: '1px solid var(--theme-elevation-200)',
            background: 'var(--theme-elevation-50)',
            height: 280,
          }}
        >
          <div style={{ ...pulseBlock, width: '30%', height: 18, marginBottom: 20 }} />
          <div style={{ ...pulseBlock, width: '100%', height: 200 }} />
        </div>

        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 10,
            border: '1px solid var(--theme-elevation-200)',
            background: 'var(--theme-elevation-50)',
            height: 280,
          }}
        >
          <div style={{ ...pulseBlock, width: '40%', height: 18, marginBottom: 20 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ ...pulseBlock, width: '100%', height: 20 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
