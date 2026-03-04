/**
 * Allowed order / sub-order status transitions.
 * Prevents invalid flows (e.g. cancel after shipped) and keeps inventory logic consistent.
 *
 * Rules:
 * - Cancel only from pending/confirmed/processing (before ship); once shipped, use returns/refunds.
 * - Terminal states: cancelled, refunded, completed — no further transitions.
 * - Forward flow: pending → … → shipped → delivered → completed.
 */
import { APIError } from 'payload'

/** Allowed next statuses for sub-order (per-vendor segment). */
const SUB_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'processing', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
}

/** Allowed next statuses for main order (includes partially-shipped for multivendor). Cancel only before any ship. */
const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['partially-shipped', 'shipped', 'cancelled'],
  'partially-shipped': ['shipped'], // no cancel once any sub-order has shipped
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
}

function getAllowedNext(current: string, transitions: Record<string, string[]>): string[] {
  return transitions[current] ?? []
}

/**
 * Returns true if the transition is allowed for a sub-order.
 */
export function isAllowedSubOrderStatusTransition(from: string, to: string): boolean {
  if (!from || !to || from === to) return true
  return getAllowedNext(from, SUB_ORDER_TRANSITIONS).includes(to)
}

/**
 * Returns true if the transition is allowed for a main order.
 */
export function isAllowedOrderStatusTransition(from: string, to: string): boolean {
  if (!from || !to || from === to) return true
  return getAllowedNext(from, ORDER_TRANSITIONS).includes(to)
}

/**
 * Throws a Payload error if the sub-order transition is invalid (for use in beforeChange).
 */
export function validateSubOrderStatusTransition(from: string | undefined, to: string | undefined): void {
  if (to == null) return
  const fromStatus = from ?? 'pending'
  if (!isAllowedSubOrderStatusTransition(fromStatus, to)) {
    const allowed = getAllowedNext(fromStatus, SUB_ORDER_TRANSITIONS)
    const allowedText = allowed.length ? allowed.join(', ') : 'none (terminal)'
    throw new APIError(
      `Allowed next: ${allowedText}. Cannot change "${fromStatus}" → "${to}".`,
      400
    )
  }
}

/**
 * Throws a Payload error if the order transition is invalid (for use in beforeChange).
 */
export function validateOrderStatusTransition(from: string | undefined, to: string | undefined): void {
  if (to == null) return
  const fromStatus = from ?? 'pending'
  if (!isAllowedOrderStatusTransition(fromStatus, to)) {
    const allowed = getAllowedNext(fromStatus, ORDER_TRANSITIONS)
    const allowedText = allowed.length ? allowed.join(', ') : 'none (terminal)'
    throw new APIError(
      `Allowed next: ${allowedText}. Cannot change "${fromStatus}" → "${to}".`,
      400
    )
  }
}
