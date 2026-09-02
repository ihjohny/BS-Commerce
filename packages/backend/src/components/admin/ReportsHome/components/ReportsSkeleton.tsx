'use client'

import React from 'react'

export function ReportsSkeleton() {
  const pulseStyle: React.CSSProperties = {
    background: 'var(--theme-elevation-150, #e2e8f0)',
    borderRadius: 6,
    animation: 'pulse 1.5s ease-in-out infinite',
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Title & Controls Skeleton */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ ...pulseStyle, width: 280, height: 40 }} />
        <div style={{ ...pulseStyle, width: 220, height: 36 }} />
      </div>

      {/* Tabs Skeleton */}
      <div style={{ ...pulseStyle, width: '100%', height: 44, marginBottom: '1.5rem' }} />

      {/* KPIs Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...pulseStyle, height: 90 }} />
        ))}
      </div>

      {/* Chart Skeleton */}
      <div style={{ ...pulseStyle, width: '100%', height: 260, marginBottom: '1.5rem' }} />

      {/* Table Skeleton */}
      <div style={{ ...pulseStyle, width: '100%', height: 320 }} />

      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }
      `}</style>
    </div>
  )
}
