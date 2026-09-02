'use client'

import React from 'react'
import { NavGroup, Link } from '@payloadcms/ui'
import { usePathname, useSearchParams } from 'next/navigation'

export type ReportCategoryNav = {
  key: 'sales' | 'products' | 'customers' | 'inventory'
  label: string
  defaultType: string
}

export const REPORT_TOP_LEVEL_ITEMS: ReportCategoryNav[] = [
  { key: 'sales', label: 'Sales Analytics', defaultType: 'sales-overview' },
  { key: 'products', label: 'Product & Catalog', defaultType: 'product-performance' },
  { key: 'customers', label: 'Customer Engagement', defaultType: 'abandoned-carts' },
  { key: 'inventory', label: 'Inventory & Operations', defaultType: 'low-stock-alert' },
]

/**
 * Sidebar Navigation Group for Reports & Analytics.
 * Uses native Payload CMS 3 NavGroup & Link for 100% pixel-perfect sync and alignment with other sidebar groups.
 */
function ReportsNavGroup() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isReportsRoute = pathname?.startsWith('/admin/reports')
  const currentCategory = searchParams?.get('category') || 'sales'

  return (
    <NavGroup label="Reports & Analytics">
      {REPORT_TOP_LEVEL_ITEMS.map((item) => {
        const isActive = isReportsRoute && currentCategory === item.key
        const href = `/admin/reports?category=${item.key}&type=${item.defaultType}`
        const id = `nav-reports-${item.key}`

        const Label = (
          <React.Fragment>
            {isActive && <div className="nav__link-indicator" />}
            <span className="nav__link-label">{item.label}</span>
          </React.Fragment>
        )

        if (isActive) {
          return (
            <div className="nav__link active" id={id} key={item.key}>
              {Label}
            </div>
          )
        }

        return (
          <Link className="nav__link" href={href} id={id} key={item.key} prefetch={false}>
            {Label}
          </Link>
        )
      })}
    </NavGroup>
  )
}

export default function ReportsNavLink() {
  return (
    <React.Suspense fallback={null}>
      <ReportsNavGroup />
    </React.Suspense>
  )
}


