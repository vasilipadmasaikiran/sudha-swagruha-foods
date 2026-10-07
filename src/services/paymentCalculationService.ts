// ============================================================
// Single Authoritative Payment & Cancellation Calculation Engine
// Complies with requirements:
// 1. Adjusted Order Total = Original Order Total - Cancelled Items Total
// 2. Authoritative Payment Statuses: FULLY PAID, PARTIALLY PAID, EXCESS AMOUNT, UNPAID
// 3. Excess Amount automatically becomes Refund Amount
// 4. Multi-payment history summation & cancellation-aware reactivity
// 5. Decimal-safe calculations (IEEE 754 precision protection)
// ============================================================

import type { DbOrder, OrderItem, OrderPaymentRecord, OrderRefundRecord } from './supabase';
import { roundToTwo } from './orderCalculationService';

export type AuthoritativePaymentStatus =
  | 'FULLY PAID'
  | 'PARTIALLY PAID'
  | 'EXCESS AMOUNT'
  | 'UNPAID';

export type AuthoritativeRefundStatus =
  | 'NO REFUND'
  | 'REFUND PENDING'
  | 'PARTIALLY REFUNDED'
  | 'REFUNDED';

export interface OrderPaymentBreakdown {
  originalOrderTotal: number;
  cancelledItemsTotal: number;
  adjustedOrderTotal: number;
  totalAmountReceived: number;
  balanceAmount: number;
  excessAmount: number;
  refundRequiredAmount: number;
  totalRefundedAmount: number;
  paymentStatus: AuthoritativePaymentStatus;
  refundStatus: AuthoritativeRefundStatus;
  hasCancellations: boolean;
  isFullySettled: boolean;
  paymentsCount: number;
  refundsCount: number;
}

/**
 * Calculates the total value of cancelled items in an order
 * Handles both item-level cancellations/removals and whole-order cancellation
 */
export function calculateCancelledItemsAmount(order: Partial<DbOrder>): number {
  if (!order) return 0;

  const originalTotal = roundToTwo(Number(order.total || order.total_amount || 0));

  // If the whole order was cancelled and no specific items were itemized as cancelled,
  // the entire order amount is considered cancelled.
  if (order.order_status === 'cancelled') {
    let itemLevelCancelled = 0;
    if (Array.isArray(order.items)) {
      for (const it of order.items) {
        if (it.status === 'cancelled' || it.status === 'removed') {
          const unitPrice = roundToTwo(Number(it.unit_price || 0));
          const qty = Number(it.cancelled_quantity !== undefined ? it.cancelled_quantity : it.quantity || 0);
          itemLevelCancelled += roundToTwo(unitPrice * qty);
        }
      }
    }
    // If items were marked individually, use that; otherwise all items/total is cancelled
    return itemLevelCancelled > 0 ? roundToTwo(itemLevelCancelled) : originalTotal;
  }

  // Active or partially cancelled order: sum up explicitly cancelled items
  let cancelledTotal = 0;
  if (Array.isArray(order.items)) {
    for (const it of order.items) {
      if (it.status === 'cancelled' || it.status === 'removed') {
        const unitPrice = roundToTwo(Number(it.unit_price || 0));
        const qty = Number(it.cancelled_quantity !== undefined ? it.cancelled_quantity : it.quantity || 0);
        cancelledTotal += roundToTwo(unitPrice * qty);
      }
    }
  }

  return roundToTwo(Math.min(cancelledTotal, originalTotal));
}

/**
 * Sums all successful payment transactions against an order.
 * If payments array is empty, defensively falls back to legacy amount_paid / payment_status.
 */
export function calculateTotalAmountReceived(order: Partial<DbOrder>): number {
  if (!order) return 0;

  // 1. If explicit payments ledger exists, sum all successful payments
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    const sum = order.payments
      .filter((p) => p.status === 'success' || !p.status)
      .reduce((acc, p) => acc + roundToTwo(Number(p.amount || 0)), 0);
    return roundToTwo(sum);
  }

  // 2. Legacy fallback
  if (order.amount_paid !== undefined && order.amount_paid !== null) {
    return roundToTwo(Number(order.amount_paid));
  }

  // 3. Fallback based on payment_status
  if (order.payment_status === 'paid' || order.payment_status === 'partially_refunded') {
    return roundToTwo(Number(order.total || 0));
  }

  return 0;
}

/**
 * Sums all successful / processed refund transactions against an order
 */
export function calculateTotalAmountRefunded(order: Partial<DbOrder>): number {
  if (!order) return 0;

  if (Array.isArray(order.refunds) && order.refunds.length > 0) {
    const sum = order.refunds
      .filter((r) => r.status === 'success' || r.status === 'processing')
      .reduce((acc, r) => acc + roundToTwo(Number(r.amount || 0)), 0);
    if (sum > 0) return roundToTwo(sum);
  }

  if (order.refunded_amount !== undefined && order.refunded_amount !== null) {
    return roundToTwo(Number(order.refunded_amount));
  }

  return 0;
}

/**
 * Single Authoritative Payment Calculation Engine
 * 
 * Formula:
 * 1. Adjusted Order Total = Original Order Total - Cancelled Items Total
 * 2. Total Amount Received = Sum of all successful payments
 * 3. Payment Status Rules:
 *    - Total Received === Adjusted Total: FULLY PAID (balance = 0, excess = 0)
 *    - Total Received < Adjusted Total: PARTIALLY PAID (or UNPAID if 0) (balance = Adjusted - Received)
 *    - Total Received > Adjusted Total: EXCESS AMOUNT (excess = Received - Adjusted, refundRequired = excess)
 * 4. Refund Status Rules:
 *    - When excess > 0: REFUND PENDING until processed, then REFUNDED
 */
export function calculateOrderPaymentBreakdown(order: Partial<DbOrder>): OrderPaymentBreakdown {
  const originalOrderTotal = roundToTwo(Number(order.total || order.total_amount || 0));
  const cancelledItemsTotal = calculateCancelledItemsAmount(order);
  const adjustedOrderTotal = Math.max(0, roundToTwo(originalOrderTotal - cancelledItemsTotal));

  const totalAmountReceived = calculateTotalAmountReceived(order);
  const totalRefundedAmount = calculateTotalAmountRefunded(order);

  let balanceAmount = 0;
  let excessAmount = 0;
  let refundRequiredAmount = 0;
  let paymentStatus: AuthoritativePaymentStatus = 'UNPAID';

  // Float precision tolerance (0.001) for financial comparisons
  const diff = roundToTwo(totalAmountReceived - adjustedOrderTotal);

  if (Math.abs(diff) < 0.005) {
    // Exactly matches adjusted total
    if (adjustedOrderTotal === 0 && originalOrderTotal > 0 && totalAmountReceived === 0) {
      paymentStatus = 'UNPAID';
      balanceAmount = 0;
      excessAmount = 0;
      refundRequiredAmount = 0;
    } else {
      paymentStatus = totalAmountReceived > 0 || adjustedOrderTotal === 0 ? 'FULLY PAID' : 'UNPAID';
      balanceAmount = 0;
      excessAmount = 0;
      refundRequiredAmount = 0;
    }
  } else if (diff < -0.005) {
    // Underpaid
    paymentStatus = totalAmountReceived > 0 ? 'PARTIALLY PAID' : 'UNPAID';
    balanceAmount = Math.max(0, roundToTwo(adjustedOrderTotal - totalAmountReceived));
    excessAmount = 0;
    refundRequiredAmount = 0;
  } else {
    // Overpaid / Excess Payment
    paymentStatus = 'EXCESS AMOUNT';
    balanceAmount = 0;
    excessAmount = roundToTwo(totalAmountReceived - adjustedOrderTotal);
    refundRequiredAmount = excessAmount;
  }

  // Refund Status
  let refundStatus: AuthoritativeRefundStatus = 'NO REFUND';
  if (excessAmount > 0) {
    if (totalRefundedAmount >= excessAmount) {
      refundStatus = 'REFUNDED';
    } else if (totalRefundedAmount > 0) {
      refundStatus = 'PARTIALLY REFUNDED';
    } else {
      refundStatus = 'REFUND PENDING';
    }
  } else if (totalRefundedAmount > 0) {
    refundStatus = 'REFUNDED';
  }

  const paymentsCount = Array.isArray(order.payments) ? order.payments.length : (totalAmountReceived > 0 ? 1 : 0);
  const refundsCount = Array.isArray(order.refunds) ? order.refunds.length : (totalRefundedAmount > 0 ? 1 : 0);

  return {
    originalOrderTotal,
    cancelledItemsTotal,
    adjustedOrderTotal,
    totalAmountReceived,
    balanceAmount,
    excessAmount,
    refundRequiredAmount,
    totalRefundedAmount,
    paymentStatus,
    refundStatus,
    hasCancellations: cancelledItemsTotal > 0,
    isFullySettled: paymentStatus === 'FULLY PAID' || (paymentStatus === 'EXCESS AMOUNT' && refundStatus === 'REFUNDED'),
    paymentsCount,
    refundsCount,
  };
}

/**
 * Validates a new payment entry against business rules
 */
export function validateNewPaymentEntry(
  order: Partial<DbOrder>,
  amount: number
): { valid: boolean; error?: string; roundedAmount: number } {
  const roundedAmount = roundToTwo(amount);
  if (isNaN(roundedAmount) || roundedAmount <= 0) {
    return {
      valid: false,
      error: 'Payment amount must be greater than ₹0.00',
      roundedAmount: 0,
    };
  }

  return {
    valid: true,
    roundedAmount,
  };
}

/**
 * Validates a refund against the calculated excess amount
 * Rule 5: Never allow Admin to refund more than calculated excess amount
 */
export function validateRefundAmount(
  order: Partial<DbOrder>,
  refundAmount: number
): { valid: boolean; error?: string; maxAllowedRefund: number; roundedRefund: number } {
  const breakdown = calculateOrderPaymentBreakdown(order);
  const roundedRefund = roundToTwo(refundAmount);
  const maxAllowedRefund = Math.max(0, roundToTwo(breakdown.excessAmount - breakdown.totalRefundedAmount));

  if (isNaN(roundedRefund) || roundedRefund <= 0) {
    return {
      valid: false,
      error: 'Refund amount must be greater than ₹0.00',
      maxAllowedRefund,
      roundedRefund: 0,
    };
  }

  // If there's an excess payment or cancellation, cap at max allowable excess
  if (breakdown.excessAmount > 0 && roundedRefund > maxAllowedRefund) {
    return {
      valid: false,
      error: `Refund amount ₹${roundedRefund} exceeds remaining excess/refundable amount ₹${maxAllowedRefund}. Maximum allowed refund is ₹${maxAllowedRefund}.`,
      maxAllowedRefund,
      roundedRefund,
    };
  }

  // If order total has remaining paid amount available for refund
  const maxOverallRefund = Math.max(0, roundToTwo(breakdown.totalAmountReceived - breakdown.totalRefundedAmount));
  if (roundedRefund > maxOverallRefund) {
    return {
      valid: false,
      error: `Refund amount ₹${roundedRefund} exceeds total received amount ₹${maxOverallRefund}.`,
      maxAllowedRefund: maxOverallRefund,
      roundedRefund,
    };
  }

  return {
    valid: true,
    maxAllowedRefund,
    roundedRefund,
  };
}
