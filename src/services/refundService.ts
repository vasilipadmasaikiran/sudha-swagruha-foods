// ============================================================
// Enterprise Refund Service (Requirements 5, 6, 8, 9, 10, 11, 12, 35)
// Accurate Financial Arithmetic, Razorpay Refund Integration,
// Duplicate Refund Prevention, Status Lifecycle Tracking
// ============================================================
import type { DbOrder, OrderRefundRecord, OrderItem } from '@/services/supabase';
import type { StoreSettings } from '@/hooks/useSettingsStore';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { logAdminAction } from '@/services/auditLogger';

export interface RefundCalculation {
  originalPaidAmount: number;
  totalAlreadyRefunded: number;
  remainingRefundableAmount: number;
  remainingOrderValue: number;
  isRefundable: boolean;
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
  const isPaid = order.payment_status === 'paid' || order.payment_status === 'partially_refunded';
  const originalPaidAmount = isPaid ? roundToTwoDecimals(Number(order.total || 0)) : 0;
  const totalAlreadyRefunded = roundToTwoDecimals(Number(order.refunded_amount || 0));
  const remainingRefundableAmount = Math.max(0, roundToTwoDecimals(originalPaidAmount - totalAlreadyRefunded));

  // Active items sum
  const activeItemsSum = (order.items || [])
    .filter((it) => it.status !== 'removed' && it.status !== 'cancelled')
    .reduce((sum, it) => sum + Number(it.total_price || 0), 0);

  const remainingOrderValue = roundToTwoDecimals(
    activeItemsSum + Number(order.delivery_charge || 0) - Number(order.discount || 0)
  );

  return {
    originalPaidAmount,
    totalAlreadyRefunded,
    remainingRefundableAmount,
    remainingOrderValue: Math.max(0, remainingOrderValue),
    isRefundable: isPaid && remainingRefundableAmount > 0,
    paidAmount: originalPaidAmount,
    alreadyRefunded: totalAlreadyRefunded,
    refundableAmount: remainingRefundableAmount,
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
    const metrics = calculateOrderRefundableMetrics(order);

    if (requestedAmount <= 0) {
      return { valid: false, error: 'Refund amount must be greater than zero' };
    }

    if (!metrics.isRefundable && requestedAmount > 0) {
      return {
        valid: false,
        error: 'Order payment status is not paid or order has already been fully refunded',
      };
    }

    if (roundToTwoDecimals(requestedAmount) > metrics.remainingRefundableAmount) {
      return {
        valid: false,
        error: `Requested refund amount (₹${requestedAmount}) exceeds remaining refundable balance (₹${metrics.remainingRefundableAmount})`,
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
