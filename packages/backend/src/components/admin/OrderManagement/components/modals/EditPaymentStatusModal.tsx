'use client'

import React, { useState } from 'react'

export type EditPaymentStatusModalProps = {
  isOpen: boolean
  currentStatus: string
  onClose: () => void
  onSave: (newStatus: string) => Promise<void>
  saving: boolean
}

const ALL_PAYMENT_STATUSES = [
  { label: 'Unpaid', value: 'unpaid', desc: 'Awaiting customer payment' },
  { label: 'Paid', value: 'paid', desc: 'Full payment verified and captured' },
  { label: 'Partially Refunded', value: 'partially-refunded', desc: 'Portion of funds returned' },
  { label: 'Refunded', value: 'refunded', desc: 'Total order amount refunded' },
]

export function EditPaymentStatusModal({
  isOpen,
  currentStatus,
  onClose,
  onSave,
  saving,
}: EditPaymentStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'unpaid')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(selectedStatus)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--theme-elevation-0, #ffffff)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--theme-elevation-200, #cbd5e1)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--theme-text, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Update Payment Status
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--theme-elevation-500, #64748b)',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
            {ALL_PAYMENT_STATUSES.map((opt) => {
              const isSelected = selectedStatus === opt.value
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: isSelected
                      ? '1.5px solid var(--bs-primary, #2563eb)'
                      : '1px solid var(--theme-elevation-200, #cbd5e1)',
                    background: isSelected
                      ? 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.06))'
                      : 'var(--theme-elevation-0, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentStatus"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setSelectedStatus(opt.value)}
                    style={{ accentColor: 'var(--bs-primary, #2563eb)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>
                      {opt.desc}
                    </span>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              paddingTop: '1rem',
              borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                background: 'transparent',
                color: 'var(--theme-text, #0f172a)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                background: 'var(--bs-primary, #2563eb)',
                color: '#ffffff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
