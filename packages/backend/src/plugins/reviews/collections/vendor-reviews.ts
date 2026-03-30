import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { userPurchasedTenant } from '../lib/purchase-checks'
import { recomputeVendorRating } from '../lib/aggregate-ratings'

const ReviewStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const
type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus]

function toStringId(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

function relationId(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object') return toStringId((value as any).id)
  return toStringId(value)
}

export function createVendorReviewsConfig(args: { requireApproval: boolean }): CollectionConfig {
  const { requireApproval } = args

  return {
    slug: 'vendor-reviews',
    admin: {
      useAsTitle: 'id',
      defaultColumns: ['tenant', 'author', 'rating', 'status', 'createdAt'],
      group: 'Reviews',
      description: 'Customer vendor reviews (multivendor). Public read (approved only if moderation enabled).',
    },
    access: {
      create: ({ req }) => req.user?.role === 'customer',
      read: ({ req }) => {
        if (req.user?.role === 'admin') return true

        const statusApproved = { status: { equals: ReviewStatus.Approved } }

        if (req.user?.role === 'vendor' && req.user.tenant) {
          const tenantId = relationId(req.user.tenant)
          return tenantId ? ({ tenant: { equals: tenantId } } as any) : false
        }

        if (req.user?.role === 'customer') {
          if (!requireApproval) return true
          // Customers can always read their own reviews (even pending), otherwise only approved reviews.
          return {
            or: [statusApproved, { author: { equals: String(req.user.id) } }],
          } as any
        }

        // Guest/customer: requireApproval => approved only.
        return requireApproval ? (statusApproved as any) : true
      },
      update: ({ req }) => {
        if (!req.user) return false
        if (req.user.role === 'admin') return true
        // Hook will enforce "own only" and forbid status changes for non-admins.
        return req.user.role === 'customer'
      },
      delete: ({ req }) => req.user?.role === 'admin',
    },
    fields: [
      {
        name: 'tenant',
        type: 'relationship',
        relationTo: 'tenants',
        required: true,
        admin: { description: 'Vendor (tenant) being reviewed.' },
      },
      {
        name: 'author',
        type: 'relationship',
        relationTo: 'users',
        required: true,
        admin: { description: 'Review author (customer).' },
      },
      { name: 'rating', type: 'number', required: true, min: 1, max: 5, admin: { step: 1 } },
      { name: 'title', type: 'text', required: false },
      { name: 'comment', type: 'textarea', localized: true },
      {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: requireApproval ? ReviewStatus.Pending : ReviewStatus.Approved,
        options: [
          { label: 'Pending', value: ReviewStatus.Pending },
          { label: 'Approved', value: ReviewStatus.Approved },
          { label: 'Rejected', value: ReviewStatus.Rejected },
        ],
      },
    ],
    hooks: {
      beforeChange: [
        async ({ data, operation, req, originalDoc }) => {
          if (!req.user) throw new APIError('Forbidden', 403)

          const userId = String(req.user.id)

          if (operation === 'create') {
            if (req.user.role !== 'customer') throw new APIError('Forbidden', 403)

            const tenantId = relationId(data.tenant)
            if (!tenantId) throw new APIError('tenant is required', 400)

            const canReview = await userPurchasedTenant({
              payload: req.payload,
              userId,
              tenantId,
              req,
            })
            if (!canReview) throw new APIError('You can only review vendors you have purchased from.', 400)

            const existing = await req.payload.find({
              collection: 'vendor-reviews',
              where: { tenant: { equals: tenantId }, author: { equals: userId } },
              limit: 1,
              depth: 0,
              req,
              overrideAccess: true,
            })

            if (existing.totalDocs > 0) throw new APIError('You already reviewed this vendor.', 400)

            data.author = userId
            data.status = requireApproval ? ReviewStatus.Pending : ReviewStatus.Approved
            return data
          }

          // Update: enforce owner can edit content; only admin can change status.
          if (operation === 'update') {
            const prev = (originalDoc as any) ?? {}
            const prevAuthor = relationId(prev.author)
            const incomingAuthor = relationId(data.author)

            if (req.user.role !== 'admin') {
              if (prevAuthor && prevAuthor !== userId) throw new APIError('Forbidden', 403)
              if (incomingAuthor && prevAuthor && incomingAuthor !== prevAuthor) {
                throw new APIError('Forbidden: author cannot be changed.', 403)
              }
              if (data.status != null && data.status !== prev.status) {
                throw new APIError('Forbidden: only admin can change review status.', 403)
              }
            }

            // Keep author stable for non-admin updates.
            if (req.user.role !== 'admin' && prevAuthor) {
              data.author = prevAuthor
            }
          }

          return data
        },
      ],
      afterChange: [
        async ({ doc, req }) => {
          if (!doc) return doc

          const tenantId = relationId((doc as any).tenant)
          if (!tenantId) return doc

          // Always recompute on any create/update so approved->rejected (or reverse) is reflected.
          await recomputeVendorRating(req.payload, { tenantId, req })
          return doc
        },
      ],
    },
    timestamps: true,
  }
}

