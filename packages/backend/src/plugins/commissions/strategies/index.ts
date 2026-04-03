/**
 * Commission calculation strategies.
 * See docs/MULTIVENDOR-ARCHITECTURE.md §8 Strategy Patterns.
 */

export interface CommissionContext {
  subtotal: number
  tenantId: string
  categoryIds?: string[]
}

export interface CommissionResult {
  amount: number
  rate: number
}

export interface CommissionStrategy {
  calculate(ctx: CommissionContext): Promise<CommissionResult> | CommissionResult
}

/** Percentage of subtotal. */
export class PercentageCommissionStrategy implements CommissionStrategy {
  private readonly ratePercent: number

  constructor(ratePercent: number) {
    this.ratePercent = ratePercent
  }

  calculate(ctx: CommissionContext): CommissionResult {
    const amount = Math.round(ctx.subtotal * (this.ratePercent / 100) * 100) / 100
    return { amount, rate: this.ratePercent }
  }
}

/** Flat fee per order. */
export class FlatFeeCommissionStrategy implements CommissionStrategy {
  private readonly flatAmount: number

  constructor(flatAmount: number) {
    this.flatAmount = flatAmount
  }

  calculate(ctx: CommissionContext): CommissionResult {
    return { amount: Math.round(this.flatAmount * 100) / 100, rate: 0 }
  }
}
