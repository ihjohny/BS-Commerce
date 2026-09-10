'use client'

import React, { useState } from 'react'

export type EditOrderStatusModalProps = {
  isOpen: boolean
  currentStatus: string
  onClose: () => void
  onSave: (newStatus: string) => Promise<void>
  saving: boolean
}

const ALL_ORDER_STATUSES = [
  { label: 'Pending', value: 'pending', desc: 'Order received, awaiting processing' },
  { label: 'Processing', value: 'processing', desc: 'Order is being packed and prepared' },
  { label: 'Partially Shipped', value: 'partially-shipped', desc: 'Some parcels dispatched' },
  { label: 'Shipped', value: 'shipped', desc: 'All parcels dispatched with carrier' },
  { label: 'Delivered', value: 'delivered', desc: 'Package delivered to recipient' },
  { label: 'Completed', value: 'completed', desc: 'Order fulfilled and closed' },
  { label: 'Cancelled', value: 'cancelled', desc: 'Order cancelled, inventory released' },
  { label: 'Refunded', value: 'refunded', desc: 'Order returned or refunded' },
]

export function EditOrderStatusModal({
  isOpen,
  currentStatus,
  onClose,
  onSave,
  saving,
}: EditOrderStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'pending')

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
          maxWidth: 480,
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Change Order Fulfillment Status
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: 4 }}>
            {ALL_ORDER_STATUSES.map((opt) => {
              const isSelected = selectedStatus === opt.value
              const isCancel = opt.value === 'cancelled' || opt.value === 'refunded'
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
                      ? isCancel
                        ? '1.5px solid var(--bs-error, #dc2626)'
                        : '1.5px solid var(--bs-primary, #2563eb)'
                      : '1px solid var(--theme-elevation-200, #cbd5e1)',
                    background: isSelected
                      ? isCancel
                        ? 'var(--bs-error-subtle, rgba(220, 38, 38, 0.06))'
                        : 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.06))'
                      : 'var(--theme-elevation-0, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="orderStatus"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setSelectedStatus(opt.value)}
                    style={{
                      accentColor: isCancel ? 'var(--bs-error, #dc2626)' : 'var(--bs-primary, #2563eb)',
                      width: 16,
                      height: 16,
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSelected && isCancel ? 'var(--bs-error, #dc2626)' : 'var(--theme-text, #0f172a)',
                      }}
                    >
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
                background:
                  selectedStatus === 'cancelled' || selectedStatus === 'refunded'
                    ? 'var(--bs-error, #dc2626)'
                    : 'var(--bs-primary, #2563eb)',
                color: '#ffffff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
