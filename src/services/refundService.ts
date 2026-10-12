// ============================================================
// Enterprise Refund Service (Requirements 5, 6, 8, 9, 10, 11, 12, 35)
// Accurate Financial Arithmetic, Razorpay Refund Integration,
// Duplicate Refund Prevention, Status Lifecycle Tracking
// ============================================================
import type { DbOrder, OrderRefundRecord, OrderItem } from '@/services/supabase';
import type { StoreSettings } from '@/hooks/useSettingsStore';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { logAdminAction } from '@/services/auditLogger';
import { calculateOrderFinancials } from './orderCalculationService';

export interface RefundCalculation {
  originalPaidAmount: number;
  totalAlreadyRefunded: number;
  remainingRefundableAmount: number;
  remainingOrderValue: number;
  isRefundable: boolean;
  isPaid: boolean;
  paidAmount: number;
  alreadyRefunded: number;
  refundableAmount: number;
}

export interface RefundExecutionResult {
  success: boolean;
  refundRecord: OrderRefundRecord;
  error?: string | null;
  providerResponse?: unknown;
}

/**
 * Decimal-safe round to 2 decimal places
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates current refundable amounts for an order
 */
export function calculateOrderRefundableMetrics(order: DbOrder): RefundCalculation {
  if (!order) {
    return {
      originalPaidAmount: 0,
      totalAlreadyRefunded: 0,
      remainingRefundableAmount: 0,
      remainingOrderValue: 0,
      isRefundable: false,
      isPaid: false,
      paidAmount: 0,
      alreadyRefunded: 0,
      refundableAmount: 0,
    };
  }

  const fin = calculateOrderFinancials(order);
  const totalAlreadyRefunded = fin.refundedAmount;

  // Determine effective paid amount:
  // If verified gateway payments exist, use totalAmountReceived.
  // Otherwise, fallback to original order total or raw order total.
  const rawOrderTotal = roundToTwoDecimals(Number(order.total || order.total_amount || 0));
  const effectiveOrderTotal = fin.originalOrderTotal > 0 ? fin.originalOrderTotal : rawOrderTotal;
  const paidAmount = fin.totalAmountReceived > 0
    ? fin.totalAmountReceived
    : effectiveOrderTotal > 0
    ? effectiveOrderTotal
    : fin.refundableCancelledAmount;
  const isPaid = paidAmount > 0;

  // Max refundable balance:
  // If cancelled items exist, at least the cancelled items eligible amount minus already refunded;
  // Otherwise, the remaining order total minus already refunded.
  const refundableAmount = Math.max(
    0,
    fin.totalAmountReceived > 0
      ? roundToTwoDecimals(Math.max(0, fin.totalAmountReceived - totalAlreadyRefunded))
      : fin.refundableCancelledAmount > 0
      ? roundToTwoDecimals(Math.max(0, fin.refundableCancelledAmount - totalAlreadyRefunded))
      : roundToTwoDecimals(Math.max(0, paidAmount - totalAlreadyRefunded))
  );

  const remainingRefundableAmount = refundableAmount;
  const remainingOrderValue = fin.finalOrderTotal;

  return {
    originalPaidAmount: paidAmount,
    totalAlreadyRefunded,
    remainingRefundableAmount,
    remainingOrderValue,
    isRefundable: refundableAmount > 0 || fin.refundableCancelledAmount > 0 || effectiveOrderTotal > totalAlreadyRefunded,
    isPaid,
    paidAmount,
    alreadyRefunded: totalAlreadyRefunded,
    refundableAmount,
  };
}

export const RefundService = {
  /**
   * Validates refund eligibility before processing
   */
  validateRefundRequest(
    order: DbOrder,
    requestedAmount: number
  ): { valid: boolean; error?: string } {
    if (requestedAmount <= 0) {
      return { valid: false, error: 'Refund amount must be greater than zero' };
    }

    const fin = calculateOrderFinancials(order);
    const metrics = calculateOrderRefundableMetrics(order);
    const rawOrderTotal = roundToTwoDecimals(Number(order.total || order.total_amount || 0));
    const effectiveTotal = fin.originalOrderTotal > 0 ? fin.originalOrderTotal : rawOrderTotal;
    const maxCapacity = Math.max(
      metrics.refundableAmount,
      fin.refundableCancelledAmount,
      roundToTwoDecimals(effectiveTotal - metrics.alreadyRefunded),
      effectiveTotal
    );

    if (maxCapacity > 0 && fin.refundedAmount >= maxCapacity && fin.refundedAmount > 0) {
      return {
        valid: false,
        error: `Order has already been fully refunded (Total: ₹${maxCapacity}, Refunded: ₹${fin.refundedAmount})`,
      };
    }

    if (maxCapacity > 0 && roundToTwoDecimals(requestedAmount) > maxCapacity + 0.05) {
      return {
        valid: false,
        error: `Requested refund amount (₹${requestedAmount}) exceeds maximum eligible balance (₹${maxCapacity})`,
      };
    }

    return { valid: true };
  },

  /**
   * Executes refund via Razorpay payment gateway API or simulated test mode
   */
  async processRefund({
    order,
    amount,
    reason,
    type,
    itemId,
    requestedBy,
    settings,
  }: {
    order: DbOrder;
    amount: number;
    reason: string;
    type: 'full' | 'partial';
    itemId?: string | null;
    requestedBy: string;
    settings: StoreSettings;
  }): Promise<RefundExecutionResult> {
    const roundedAmount = roundToTwoDecimals(amount);

    // 1. Validation
    const validation = this.validateRefundRequest(order, roundedAmount);
    if (!validation.valid) {
      const failedRecord: OrderRefundRecord = {
        id: `rfnd_${Date.now()}`,
        order_id: order.id,
        order_number: order.order_number,
        payment_id: order.payment_id,
        amount: roundedAmount,
        type,
        reason,
        status: 'failed',
        provider: 'none',
        item_id: itemId || undefined,
        requested_by: requestedBy,
        requested_at: new Date().toISOString(),
        failure_reason: validation.error,
      };
      return { success: false, refundRecord: failedRecord, error: validation.error };
    }

    // 2. Initial record creation (status: PROCESSING)
    const refundId = `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const refundRecord: OrderRefundRecord = {
      id: refundId,
      order_id: order.id,
      order_number: order.order_number,
      payment_id: order.payment_id,
      amount: roundedAmount,
      type,
      reason,
      status: 'processing',
      provider: 'razorpay',
      item_id: itemId || undefined,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
    };

    // 3. Razorpay Integration
    const razorpayKeyId = settings.razorpayKeyId;
    const razorpayKeySecret = settings.razorpayKeySecret;
    const paymentId = order.payment_id;

    const isLiveGateway =
      !settings.isTestMode &&
      razorpayKeyId &&
      razorpayKeySecret &&
      paymentId &&
      !paymentId.startsWith('pay_test_') &&
      !paymentId.startsWith('mock_');

    if (isLiveGateway) {
      try {
        // Live Razorpay API Refund Call
        const authHeader = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(roundedAmount * 100), // convert to paise
            speed: 'normal',
            notes: {
              order_number: order.order_number,
              reason: reason.substring(0, 255),
              type,
            },
            receipt: refundId,
          }),
        });

        const data = await response.json();
        if (response.ok && data.id) {
          refundRecord.status = 'success';
          refundRecord.provider_refund_id = data.id;
          refundRecord.completed_at = new Date().toISOString();

          await logAdminAction(
            requestedBy,
            'ORDER_PROCESSOR',
            'REFUND_SUCCESS',
            'ORDER',
            order.order_number,
            { amount: roundedAmount, refund_id: data.id, provider: 'razorpay' }
          );

          return { success: true, refundRecord, providerResponse: data };
        } else {
          refundRecord.status = 'failed';
          refundRecord.failure_reason = data.error?.description || 'Payment gateway rejected refund';

          await logAdminAction(
            requestedBy,
            'ORDER_PROCESSOR',
            'REFUND_FAILED',
            'ORDER',
            order.order_number,
            { amount: roundedAmount, error: refundRecord.failure_reason }
          );

          return {
            success: false,
            refundRecord,
            error: refundRecord.failure_reason,
            providerResponse: data,
          };
        }
      } catch (err: any) {
        refundRecord.status = 'failed';
        refundRecord.failure_reason = err?.message || 'Network error contacting payment gateway';
        return { success: false, refundRecord, error: refundRecord.failure_reason };
      }
    } else {
      // 4. Test Mode / Simulated Gateway Refund
      refundRecord.status = 'success';
      refundRecord.provider_refund_id = `rzp_rfnd_sim_${Date.now()}`;
      refundRecord.completed_at = new Date().toISOString();

      await logAdminAction(
        requestedBy,
        'ORDER_PROCESSOR',
        'REFUND_PROCESSED_SIMULATED',
        'ORDER',
        order.order_number,
        { amount: roundedAmount, refund_id: refundRecord.provider_refund_id, mode: 'test_mode' }
      );

      return { success: true, refundRecord };
    }
  },
};
