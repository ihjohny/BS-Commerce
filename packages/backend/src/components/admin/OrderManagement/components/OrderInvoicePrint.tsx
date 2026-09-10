'use client'

import React from 'react'
import type { OrderItemData } from './OrderItemsTable'
import type { AddressData } from './FulfillmentCard'

export type OrderInvoicePrintProps = {
  order: {
    orderNumber: string
    status: string
    paymentStatus: string
    currency: string
    subtotal: number
    shippingTotal: number
    taxTotal: number
    discountTotal: number
    grandTotal: number
    couponCodeSnapshot?: string
    placedAt?: string
    createdAt: string
    checkoutPaymentChannel?: string
    shippingAddress: AddressData
    billingAddress: AddressData
    items?: OrderItemData[]
    notes?: string
  }
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  const num = Number(amount || 0)
  const hasDecimals = num % 1 !== 0
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Robust, cross-browser printable invoice generator.
 * Opens an isolated print window and invokes print without style collisions with Payload CMS.
 */
export function printOrderInvoice(order: any) {
  const printWindow = window.open('', '_blank', 'width=850,height=950')
  if (!printWindow) {
    // If popups are blocked, trigger window.print directly
    window.print()
    return
  }

  const orderDate = new Date(order.placedAt || order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const ship = order.shippingAddress || {}
  const bill = order.billingAddress || {}
  const shipName = [ship.firstName, ship.lastName].filter(Boolean).join(' ') || 'N/A'
  const billName = [bill.firstName, bill.lastName].filter(Boolean).join(' ') || 'N/A'
  const currency = order.currency || 'BDT'

  const items = order.items || []
  const rowsHtml = items
    .map((item: any) => {
      const productObj = typeof item.product === 'object' && item.product !== null ? item.product : null
      const variantObj = typeof item.variant === 'object' && item.variant !== null ? item.variant : null
      const title = item.productName || item.productTitle || productObj?.title || 'Item'
      const variant = item.variantName || variantObj?.title || ''
      const sku = item.sku || variantObj?.sku || '-'
      const price = item.unitPrice != null ? Number(item.unitPrice) : (item.price != null ? Number(item.price) : 0)
      const qty = item.quantity != null ? Number(item.quantity) : 1
      const total = item.totalPrice != null ? Number(item.totalPrice) : (item.total != null ? Number(item.total) : price * qty)

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 8px; vertical-align: top;">
            <div style="font-weight: 600; color: #0f172a;">${title}</div>
            ${variant ? `<div style="font-size: 11px; color: #64748b;">${variant}</div>` : ''}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; font-family: monospace; color: #475569;">${sku}</td>
          <td style="padding: 10px 8px; vertical-align: top; text-align: right; color: #0f172a;">${formatMoney(price, currency)}</td>
          <td style="padding: 10px 8px; vertical-align: top; text-align: center; font-weight: 600;">${qty}</td>
          <td style="padding: 10px 8px; vertical-align: top; text-align: right; font-weight: 700; color: #0f172a;">${formatMoney(total, currency)}</td>
        </tr>
      `
    })
    .join('')

  const couponCode = order.couponCodeSnapshot || ''

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${order.orderNumber}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 40px;
            color: #0f172a;
            line-height: 1.5;
            font-size: 13px;
            background: #ffffff;
            margin: 0;
          }
          @media print {
            body { padding: 20px; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 28px;">
          <div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">BS-Commerce</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; font-weight: 500;">Official Order Invoice & Packing Slip</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">${order.orderNumber}</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Placed: ${orderDate}</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #0f172a; font-weight: 600;">Status: <span style="text-transform: uppercase;">${order.status}</span></p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 28px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <h3 style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Ship To:</h3>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${shipName}</div>
            <div>${ship.street1 || ''}</div>
            ${ship.street2 ? `<div>${ship.street2}</div>` : ''}
            <div>${[ship.city, ship.state, ship.postalCode].filter(Boolean).join(', ')}</div>
            <div>${ship.country || ''}</div>
            ${ship.phone ? `<div style="margin-top: 4px; color: #475569;">Phone: ${ship.phone}</div>` : ''}
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <h3 style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Bill To:</h3>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${billName}</div>
            <div>${bill.street1 || ''}</div>
            ${bill.street2 ? `<div>${bill.street2}</div>` : ''}
            <div>${[bill.city, bill.state, bill.postalCode].filter(Boolean).join(', ')}</div>
            <div>${bill.country || ''}</div>
            ${bill.phone ? `<div style="margin-top: 4px; color: #475569;">Phone: ${bill.phone}</div>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 12px; color: #475569;">
              <th style="padding: 10px 8px;">Item Description</th>
              <th style="padding: 10px 8px;">SKU</th>
              <th style="padding: 10px 8px; text-align: right;">Price</th>
              <th style="padding: 10px 8px; text-align: center;">Qty</th>
              <th style="padding: 10px 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 28px;">
          <div style="width: 300px; font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Subtotal:</span>
              <span style="font-weight: 600; color: #0f172a;">${formatMoney(order.subtotal, currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Shipping Fee:</span>
              <span style="font-weight: 600; color: #0f172a;">${formatMoney(order.shippingTotal, currency)}</span>
            </div>
            ${
              order.discountTotal > 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #16a34a; font-weight: 600;">
                <span>Discount ${couponCode ? `(${couponCode})` : ''}:</span>
                <span>-${formatMoney(order.discountTotal, currency)}</span>
              </div>
            `
                : ''
            }
            ${
              order.taxTotal > 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #475569;">
                <span>Estimated Tax:</span>
                <span style="font-weight: 600; color: #0f172a;">${formatMoney(order.taxTotal, currency)}</span>
              </div>
            `
                : ''
            }
            <div style="display: flex; justify-content: space-between; border-top: 2px solid #0f172a; padding-top: 10px; font-weight: 800; font-size: 16px; color: #0f172a;">
              <span>Grand Total:</span>
              <span>${formatMoney(order.grandTotal, currency)}</span>
            </div>
          </div>
        </div>

        ${
          order.notes
            ? `
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #475569;">
            <strong style="color: #0f172a;">Customer Notes:</strong> ${order.notes}
          </div>
        `
            : ''
        }

        <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          Thank you for shopping with BS-Commerce! For questions or support, contact support@bs-commerce.com.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

export function OrderInvoicePrint({ order }: OrderInvoicePrintProps) {
  // Retained as a fallback component
  return null
}
