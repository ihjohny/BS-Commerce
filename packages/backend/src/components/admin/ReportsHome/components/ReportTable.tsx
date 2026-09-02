'use client'

import React, { useState } from 'react'
import type { ReportTable as ReportTableType } from '../../../../lib/admin-reports'

type ReportTableProps = {
  table: ReportTableType
  currency: string
}

export function ReportTable({ table, currency }: ReportTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 25

  const { columns, rows, totals } = table

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // Sorting rows
  const sortedRows = [...rows].sort((a, b) => {
    if (!sortKey) return 0
    let valA = a[sortKey]
    let valB = b[sortKey]

    // Parse currency strings or numbers if raw value is available
    if (typeof valA === 'string' && (valA.startsWith('$') || valA.startsWith('৳'))) {
      valA = parseFloat(valA.replace(/[^0-9.-]+/g, ''))
      valB = parseFloat(String(valB).replace(/[^0-9.-]+/g, ''))
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDir === 'asc' ? valA - valB : valB - valA
    }

    return sortDir === 'asc'
      ? String(valA || '').localeCompare(String(valB || ''))
      : String(valB || '').localeCompare(String(valA || ''))
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const renderBadge = (value: string) => {
    const isOut = value === 'Out of Stock'
    const isLow = value === 'Low Stock'
    const isIn = value === 'In Stock'

    const bg = isOut ? 'var(--theme-error-100, #fee2e2)' : isLow ? 'var(--theme-warning-100, #fef3c7)' : isIn ? 'var(--theme-success-100, #dcfce7)' : 'var(--theme-elevation-150)'
    const color = isOut ? 'var(--theme-error-700, #b91c1c)' : isLow ? 'var(--theme-warning-700, #b45309)' : isIn ? 'var(--theme-success-700, #15803d)' : 'var(--theme-elevation-800)'

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          background: bg,
          color: color,
        }}
      >
        {value}
      </span>
    )
  }

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-200)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr
              style={{
                background: 'var(--theme-elevation-100)',
                borderBottom: '1px solid var(--theme-elevation-200)',
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: col.align || 'left',
                    fontWeight: 600,
                    color: 'var(--theme-elevation-600)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                    }}
                  >
                    <span>{col.label}</span>
                    <span style={{ fontSize: 10, opacity: sortKey === col.key ? 1 : 0.35 }}>
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '2.5rem',
                    textAlign: 'center',
                    color: 'var(--theme-elevation-500)',
                  }}
                >
                  No data records found for this period.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    borderBottom: '1px solid var(--theme-elevation-150)',
                    background: rowIdx % 2 === 0 ? 'var(--theme-elevation-0, #fff)' : 'var(--theme-elevation-50)',
                    transition: 'background 0.1s ease',
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: col.align || 'left',
                        color: 'var(--theme-text)',
                        whiteSpace: col.key === 'productName' || col.key === 'customer' || col.key === 'region' ? 'normal' : 'nowrap',
                      }}
                    >
                      {col.format === 'badge' ? (
                        renderBadge(String(row[col.key] || ''))
                      ) : (
                        String(row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '—')
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Totals Summary Row */}
          {totals && paginatedRows.length > 0 && (
            <tfoot>
              <tr
                style={{
                  background: 'var(--theme-elevation-100)',
                  borderTop: '2px solid var(--theme-elevation-200)',
                  fontWeight: 700,
                  color: 'var(--theme-text)',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: col.align || 'left',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {totals[col.key] !== undefined ? String(totals[col.key]) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--theme-elevation-200)',
            background: 'var(--theme-elevation-0, #fff)',
            fontSize: 12,
            color: 'var(--theme-elevation-600)',
          }}
        >
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length} rows
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 4,
                border: '1px solid var(--theme-elevation-200)',
                background: 'var(--theme-elevation-50)',
                color: 'var(--theme-text)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', padding: '0 4px', fontWeight: 600 }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 4,
                border: '1px solid var(--theme-elevation-200)',
                background: 'var(--theme-elevation-50)',
                color: 'var(--theme-text)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
