import type { Payload } from 'payload'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export async function recomputeProductRating(payload: Payload, args: { productId: string; req?: any }): Promise<void> {
  const { productId, req } = args

  const { docs } = await payload.find({
    collection: 'product-reviews',
    where: { product: { equals: productId }, status: { equals: 'approved' } },
    limit: 5000,
    depth: 0,
    req,
    overrideAccess: true,
  })

  const ratings = (docs as any[]).map((d) => Number(d.rating) || 0)
  const count = ratings.length
  const avg = count ? ratings.reduce((s, r) => s + r, 0) / count : 0

  await payload.update({
    collection: 'products',
    id: productId,
    overrideAccess: true,
    data: {
      rating: round2(avg),
      totalReviews: count,
    },
    req,
  })
}

export async function recomputeVendorRating(payload: Payload, args: { tenantId: string; req?: any }): Promise<void> {
  const { tenantId, req } = args

  const { docs } = await payload.find({
    collection: 'vendor-reviews',
    where: { tenant: { equals: tenantId }, status: { equals: 'approved' } },
    limit: 5000,
    depth: 0,
    req,
    overrideAccess: true,
  })

  const ratings = (docs as any[]).map((d) => Number(d.rating) || 0)
  const count = ratings.length
  const avg = count ? ratings.reduce((s, r) => s + r, 0) / count : 0

  const { docs: profiles } = await payload.find({
    collection: 'vendor-profiles',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })

  const profile = profiles[0]
  if (!profile) return

  await payload.update({
    collection: 'vendor-profiles',
    id: profile.id,
    overrideAccess: true,
    data: { rating: round2(avg) },
    req,
  })
}

