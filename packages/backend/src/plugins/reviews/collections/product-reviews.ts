import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { relationId } from '../../../lib/relation-id'
import { userPurchasedProduct } from '../lib/purchase-checks'
import { recomputeProductRating } from '../lib/aggregate-ratings'

const ReviewStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const
type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus]

export function createProductReviewsConfig(args: { requireApproval: boolean }): CollectionConfig {
  const { requireApproval } = args

  return {
    slug: 'product-reviews',
    admin: {
      useAsTitle: 'id',
      defaultColumns: ['product', 'author', 'rating', 'status', 'createdAt'],
      group: 'Reviews',
      description: 'Customer product reviews. Public read (approved only if moderation enabled).',
    },
    access: {
      create: ({ req }) => req.user?.role === 'customer',
      read: ({ req }) => {
        if (req.user?.role === 'admin') return true
        if (requireApproval) return { status: { equals: ReviewStatus.Approved } }
        return true
      },
      update: ({ req }) => {
        if (!req.user) return false
        if (req.user.role === 'admin') return true
        // Hook will enforce "own only" on update.
        return req.user.role === 'customer'
      },
      delete: ({ req }) => req.user?.role === 'admin',
    },
    fields: [
      {
        name: 'product',
        type: 'relationship',
        relationTo: 'products',
        required: true,
        admin: { description: 'Reviewed product.' },
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

            const productId = relationId(data.product)

            if (!productId) throw new APIError('product is required', 400)

            const canReview = await userPurchasedProduct({
              payload: req.payload,
              userId,
              productId,
              req,
            })
            if (!canReview) {
              throw new APIError('You can only review products you have purchased.', 400)
            }

            // One review per user per product (enforced at hook level).
            const existing = await req.payload.find({
              collection: 'product-reviews',
              where: {
                product: { equals: productId },
                author: { equals: userId },
              },
              limit: 1,
              depth: 0,
              req,
              overrideAccess: true,
            })

            if (existing.totalDocs > 0) {
              throw new APIError('You already reviewed this product.', 400)
            }

            data.author = userId
            data.status = requireApproval ? ReviewStatus.Pending : ReviewStatus.Approved
            return data
          }

          // Update: enforce only owner can update, and only admin can change status.
          if (operation === 'update') {
            const prev = originalDoc as any
            const prevAuthor = relationId(prev?.author)
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

          const productId = relationId((doc as any).product)
          if (!productId) return doc

          // Always recompute on any create/update so approved->rejected (or reverse) is reflected.
          await recomputeProductRating(req.payload, { productId, req })
          return doc
        },
      ],
    },
    timestamps: true,
  }
}

