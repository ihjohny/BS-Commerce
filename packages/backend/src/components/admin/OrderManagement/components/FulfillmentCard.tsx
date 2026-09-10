'use client'

import React from 'react'
import { AdminCard } from '../../ui'

export type AddressData = {
  firstName?: string
  lastName?: string
  street1?: string
  street2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
}

export type FulfillmentCardProps = {
  shippingAddress: AddressData
  billingAddress: AddressData
  store?: any
  onEditAddress?: () => void
}

function formatAddress(addr?: AddressData) {
  if (!addr) {
    return { name: '', street: '', cityStateZip: '', country: '', phone: undefined }
  }
  const name = [addr.firstName, addr.lastName].filter(Boolean).join(' ')
  const street = [addr.street1, addr.street2].filter(Boolean).join(', ')
  const cityStateZip = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(' ')
  const country = addr.country || ''

  return { name, street, cityStateZip, country, phone: addr.phone }
}

export function FulfillmentCard({
  shippingAddress,
  billingAddress,
  onEditAddress,
}: FulfillmentCardProps) {
  const ship = formatAddress(shippingAddress)
  const bill = formatAddress(billingAddress)

  return (
    <AdminCard
      style={{ marginBottom: '1.25rem' }}
      title="Fulfillment & Logistics"
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      }
      action={
        onEditAddress && (
          <button
            type="button"
            onClick={onEditAddress}
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
            Edit Address
          </button>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: 13 }}>
        {/* Shipping Address */}
        <div>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--theme-elevation-500, #64748b)',
              marginBottom: 4,
            }}
          >
            Shipping Address
          </span>
          <div style={{ color: 'var(--theme-text, #0f172a)', lineHeight: 1.5 }}>
            {ship.name && <div style={{ fontWeight: 600 }}>{ship.name}</div>}
            {ship.street && <div>{ship.street}</div>}
            {ship.cityStateZip && <div>{ship.cityStateZip}</div>}
            {ship.country && <div>{ship.country}</div>}
            {ship.phone && (
              <div style={{ color: 'var(--theme-elevation-600, #64748b)', fontSize: 12, marginTop: 2 }}>
                Phone: {ship.phone}
              </div>
            )}
          </div>
        </div>

        {/* Billing Address */}
        <div>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--theme-elevation-500, #64748b)',
              marginBottom: 4,
            }}
          >
            Billing Address
          </span>
          <div style={{ color: 'var(--theme-text, #0f172a)', lineHeight: 1.5 }}>
            {bill.name && <div style={{ fontWeight: 600 }}>{bill.name}</div>}
            {bill.street && <div>{bill.street}</div>}
            {bill.cityStateZip && <div>{bill.cityStateZip}</div>}
            {bill.country && <div>{bill.country}</div>}
            {bill.phone && (
              <div style={{ color: 'var(--theme-elevation-600, #64748b)', fontSize: 12, marginTop: 2 }}>
                Phone: {bill.phone}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminCard>
  )
}

export default FulfillmentCard
