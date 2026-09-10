'use client'

import React, { useState } from 'react'
import { AdminCard } from '../../ui'

export type DeviceAuditCardProps = {
  deviceTracking?: {
    ipAddress?: string
    userAgent?: string
    deviceType?: string
    browser?: string
    os?: string
    referrer?: string
  } | null
  preferredLanguage?: string | null
}

export function DeviceAuditCard({ deviceTracking, preferredLanguage }: DeviceAuditCardProps) {
  const [isOpen, setIsOpen] = useState(true)

  const hasDeviceData = deviceTracking && Object.keys(deviceTracking).length > 0
  if (!hasDeviceData && !preferredLanguage) {
    return null
  }

  return (
    <AdminCard
      style={{ marginBottom: '1.25rem' }}
      title="Device & Security Audit"
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      }
      action={
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--theme-elevation-500, #64748b)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <span>{isOpen ? 'Hide Details' : 'Show Details'}</span>
          <svg
            width="14"
            height="14"
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
        </button>
      }
      headerDivider={isOpen}
      noPadding={!isOpen}
    >
      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 12,
          }}
        >
          {preferredLanguage && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Preferred Language:</span>
              <span style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--theme-text, #0f172a)' }}>
                {preferredLanguage}
              </span>
            </div>
          )}

          {deviceTracking?.ipAddress && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>IP Address:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                {deviceTracking.ipAddress}
              </span>
            </div>
          )}

          {deviceTracking?.deviceType && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Device Type:</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 500, color: 'var(--theme-text, #0f172a)' }}>
                {deviceTracking.deviceType}
              </span>
            </div>
          )}

          {deviceTracking?.browser && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Browser:</span>
              <span style={{ fontWeight: 500, color: 'var(--theme-text, #0f172a)' }}>
                {deviceTracking.browser}
              </span>
            </div>
          )}

          {deviceTracking?.os && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Operating System:</span>
              <span style={{ fontWeight: 500, color: 'var(--theme-text, #0f172a)' }}>
                {deviceTracking.os}
              </span>
            </div>
          )}

          {deviceTracking?.referrer && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Referrer:</span>
              <span style={{ fontWeight: 500, color: 'var(--theme-text, #0f172a)', maxWidth: '65%', textAlign: 'right', wordBreak: 'break-all' }}>
                {deviceTracking.referrer}
              </span>
            </div>
          )}

          {deviceTracking?.userAgent && (
            <div style={{ marginTop: 4 }}>
              <span style={{ color: 'var(--theme-elevation-600, #64748b)', display: 'block', marginBottom: 2 }}>
                Full User Agent:
              </span>
              <div
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: 'var(--theme-elevation-50, #f8fafc)',
                  border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  wordBreak: 'break-all',
                  color: 'var(--theme-elevation-700, #334155)',
                }}
              >
                {deviceTracking.userAgent}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminCard>
  )
}

export default DeviceAuditCard
