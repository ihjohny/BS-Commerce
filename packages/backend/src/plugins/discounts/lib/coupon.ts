import type { Payload, PayloadRequest } from 'payload'

type CouponDoc = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderValue?: number | null
  expiresAt?: string | null
  maxTotalUses?: number | null
  maxUsesPerUser?: number | null
  totalUses?: number | null
  isActive?: boolean
}

export type CouponValidationResult =
  | {
      valid: true
      coupon: CouponDoc
      discountTotal: number
      discountReason?: undefined
    }
  | {
      valid: false
      coupon?: CouponDoc
      discountTotal: 0
      discountReason: string
    }

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export async function validateCouponForSubtotal(args: {
  payload: Payload
  req?: PayloadRequest
  couponCode?: string | null
  subtotal: number
  userId?: string | number
}): Promise<CouponValidationResult> {
  const { payload, couponCode, subtotal, userId } = args
  const normalizedCode = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : ''
  if (!normalizedCode) {
    return { valid: false, discountTotal: 0, discountReason: 'No coupon code provided' }
  }

  const found = await payload.find({
    collection: 'coupons',
    where: { code: { equals: normalizedCode } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req: args.req,
  })
  const coupon = found.docs?.[0] as CouponDoc | undefined
  if (!coupon) {
    return { valid: false, discountTotal: 0, discountReason: 'Coupon not found' }
  }
  if (coupon.isActive === false) {
    return { valid: false, discountTotal: 0, coupon, discountReason: 'Coupon is inactive' }
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, discountTotal: 0, coupon, discountReason: 'Coupon has expired' }
  }

  const minOrderValue = Number(coupon.minOrderValue || 0)
  if (subtotal < minOrderValue) {
    return {
      valid: false,
      discountTotal: 0,
      coupon,
      discountReason: `Minimum order value is ${minOrderValue}`,
    }
  }

  const totalUses = Number(coupon.totalUses || 0)
  if (coupon.maxTotalUses != null && totalUses >= Number(coupon.maxTotalUses)) {
    return { valid: false, discountTotal: 0, coupon, discountReason: 'Coupon usage limit reached' }
  }

  if (coupon.maxUsesPerUser != null && userId != null) {
    const usedByUser = await payload.find({
      collection: 'orders',
      where: {
        and: [{ customer: { equals: userId } }, { appliedCoupon: { equals: coupon.id } }],
      },
      limit: 0,
      depth: 0,
      overrideAccess: true,
      req: args.req,
    })
    if (usedByUser.totalDocs >= Number(coupon.maxUsesPerUser)) {
      return { valid: false, discountTotal: 0, coupon, discountReason: 'Coupon already used by this user' }
    }
  }

  const rawDiscount =
    coupon.type === 'percentage' ? (subtotal * Number(coupon.value || 0)) / 100 : Number(coupon.value || 0)
  const discountTotal = round2(Math.max(0, Math.min(rawDiscount, subtotal)))

  return { valid: true, coupon, discountTotal }
}
