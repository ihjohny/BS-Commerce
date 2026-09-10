'use client'

import React, { useState } from 'react'
import type { AddressData } from '../FulfillmentCard'

export type EditAddressModalProps = {
  isOpen: boolean
  initialShippingAddress: AddressData
  initialBillingAddress: AddressData
  onClose: () => void
  onSave: (addresses: { shippingAddress: AddressData; billingAddress: AddressData }) => Promise<void>
  saving: boolean
}

export function EditAddressModal({
  isOpen,
  initialShippingAddress,
  initialBillingAddress,
  onClose,
  onSave,
  saving,
}: EditAddressModalProps) {
  const [shippingAddress, setShippingAddress] = useState<AddressData>({
    firstName: initialShippingAddress?.firstName || '',
    lastName: initialShippingAddress?.lastName || '',
    street1: initialShippingAddress?.street1 || '',
    street2: initialShippingAddress?.street2 || '',
    city: initialShippingAddress?.city || '',
    state: initialShippingAddress?.state || '',
    postalCode: initialShippingAddress?.postalCode || '',
    country: initialShippingAddress?.country || '',
    phone: initialShippingAddress?.phone || '',
  })

  const [billingAddress, setBillingAddress] = useState<AddressData>({
    firstName: initialBillingAddress?.firstName || '',
    lastName: initialBillingAddress?.lastName || '',
    street1: initialBillingAddress?.street1 || '',
    street2: initialBillingAddress?.street2 || '',
    city: initialBillingAddress?.city || '',
    state: initialBillingAddress?.state || '',
    postalCode: initialBillingAddress?.postalCode || '',
    country: initialBillingAddress?.country || '',
    phone: initialBillingAddress?.phone || '',
  })

  if (!isOpen) return null

  const handleCopyShippingToBilling = () => {
    setBillingAddress({ ...shippingAddress })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ shippingAddress, billingAddress })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'var(--theme-elevation-0, #ffffff)',
    color: 'var(--theme-text, #0f172a)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--theme-elevation-700, #334155)',
    marginBottom: 4,
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
          maxWidth: 820,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--theme-elevation-200, #cbd5e1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--theme-elevation-0, #ffffff)',
            zIndex: 10,
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
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Edit Shipping & Billing Addresses
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Shipping Address Column */}
            <div
              style={{
                border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                borderRadius: 10,
                padding: '1.25rem',
                background: 'var(--theme-elevation-50, #f8fafc)',
              }}
            >
              <h4
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--theme-text, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Shipping Address
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.firstName || ''}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.lastName || ''}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Street Address 1 *</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.street1 || ''}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street1: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Street Address 2 (Apt, Suite, Unit)</label>
                <input
                  type="text"
                  value={shippingAddress.street2 || ''}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street2: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.city || ''}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>State / Division</label>
                  <input
                    type="text"
                    value={shippingAddress.state || ''}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Postal Code</label>
                  <input
                    type="text"
                    value={shippingAddress.postalCode || ''}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Country *</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.country || ''}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Contact Phone</label>
                <input
                  type="text"
                  value={shippingAddress.phone || ''}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Billing Address Column */}
            <div
              style={{
                border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                borderRadius: 10,
                padding: '1.25rem',
                background: 'var(--theme-elevation-50, #f8fafc)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--theme-text, #0f172a)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Billing Address
                </h4>

                <button
                  type="button"
                  onClick={handleCopyShippingToBilling}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--bs-primary, #2563eb)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  Copy from Shipping
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={billingAddress.firstName || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, firstName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={billingAddress.lastName || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, lastName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Street Address 1 *</label>
                <input
                  type="text"
                  required
                  value={billingAddress.street1 || ''}
                  onChange={(e) => setBillingAddress({ ...billingAddress, street1: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Street Address 2 (Apt, Suite, Unit)</label>
                <input
                  type="text"
                  value={billingAddress.street2 || ''}
                  onChange={(e) => setBillingAddress({ ...billingAddress, street2: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input
                    type="text"
                    required
                    value={billingAddress.city || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>State / Division</label>
                  <input
                    type="text"
                    value={billingAddress.state || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Postal Code</label>
                  <input
                    type="text"
                    value={billingAddress.postalCode || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Country *</label>
                  <input
                    type="text"
                    required
                    value={billingAddress.country || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Contact Phone</label>
                <input
                  type="text"
                  value={billingAddress.phone || ''}
                  onChange={(e) => setBillingAddress({ ...billingAddress, phone: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
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
              {saving ? 'Saving...' : 'Save Addresses'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
