// ============================================================
// Enterprise Unified Notification Service (Requirements 16, 17, 20, 23, 24, 29, 32)
// Coordinates Email & SMS, Deduplication Protection,
// Non-blocking Failure Handling
// ============================================================
import type { DbOrder, NotificationEvent, OrderRefundRecord, OrderItem } from '@/services/supabase';
import type { StoreSettings } from '@/hooks/useSettingsStore';
import { EmailService } from './emailService';
import { SmsService } from './smsService';

// In-memory deduplication cache: `${orderNumber}:${event}:${hash}` -> timestamp
const deduplicationCache = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 10000; // 10 seconds

export const NotificationService = {
  /**
   * Checks and sets deduplication key to prevent repeated notifications on duplicate webhooks or quick clicks
   */
  isDuplicateEvent(orderNumber: string, event: NotificationEvent, signature = ''): boolean {
    const key = `${orderNumber}:${event}:${signature}`;
    const now = Date.now();
    const lastSent = deduplicationCache.get(key);

    if (lastSent && now - lastSent < DEDUPLICATION_WINDOW_MS) {
      return true;
    }

    deduplicationCache.set(key, now);
    // Cleanup old keys
    if (deduplicationCache.size > 500) {
      for (const [k, time] of deduplicationCache.entries()) {
        if (now - time > 60000) deduplicationCache.delete(k);
      }
    }

    return false;
  },

  /**
   * Notifies customer of Item Removal & Partial Refund via Email & SMS
   */
  async notifyItemRemoved({
    order,
    item,
    refundAmount,
    reason,
    settings,
  }: {
    order: DbOrder;
    item: OrderItem;
    refundAmount: number;
    reason: string;
    settings: StoreSettings;
  }): Promise<{ emailSent: boolean; smsSent: boolean }> {
    if (this.isDuplicateEvent(order.order_number, 'ORDER_ITEM_REMOVED', item.product_id)) {
      return { emailSent: false, smsSent: false };
    }

    let emailSent = false;
    let smsSent = false;

    // 1. Email (non-blocking)
    try {
      const emailRes = await EmailService.sendOrderItemRemoved(order, item, refundAmount, reason, settings);
      emailSent = emailRes.success;
    } catch (err) {
      console.warn('Item removal email notice:', err);
    }

    // 2. SMS (non-blocking)
    try {
      const smsRes = await SmsService.sendOrderEventSms(
        'ORDER_ITEM_REMOVED',
        order,
        {
          productName: item.product_name_en,
          removalReason: reason,
          refundAmount,
          refundStatus: refundAmount > 0 ? 'Initiated' : 'N/A',
        },
        settings
      );
      smsSent = smsRes.success;
    } catch (err) {
      console.warn('Item removal SMS notice:', err);
    }

    return { emailSent, smsSent };
  },

  /**
   * Notifies customer of Full Order Cancellation via Email & SMS
   */
  async notifyOrderCancelled({
    order,
    reason,
    refundAmount,
    settings,
  }: {
    order: DbOrder;
    reason: string;
    refundAmount: number;
    settings: StoreSettings;
  }): Promise<{ emailSent: boolean; smsSent: boolean }> {
    if (this.isDuplicateEvent(order.order_number, 'FULL_ORDER_CANCELLED', reason)) {
      return { emailSent: false, smsSent: false };
    }

    let emailSent = false;
    let smsSent = false;

    // 1. Email
    try {
      const emailRes = await EmailService.sendOrderCancellation(order, reason, refundAmount, settings);
      emailSent = emailRes.success;
    } catch (err) {
      console.warn('Order cancellation email notice:', err);
    }

    // 2. SMS
    try {
      const smsRes = await SmsService.sendOrderEventSms(
        'FULL_ORDER_CANCELLED',
        order,
        {
          cancellationReason: reason,
          refundAmount,
          refundStatus: refundAmount > 0 ? 'Initiated' : 'N/A',
        },
        settings
      );
      smsSent = smsRes.success;
    } catch (err) {
      console.warn('Order cancellation SMS notice:', err);
    }

    return { emailSent, smsSent };
  },

  /**
   * Notifies customer of Refund Milestone (Initiated / Completed / Failed)
   */
  async notifyRefundUpdate({
    order,
    refund,
    settings,
  }: {
    order: DbOrder;
    refund: OrderRefundRecord;
    settings: StoreSettings;
  }): Promise<{ emailSent: boolean; smsSent: boolean }> {
    const event: NotificationEvent =
      refund.status === 'success'
        ? 'REFUND_COMPLETED'
        : refund.status === 'failed'
        ? 'REFUND_FAILED'
        : refund.type === 'full'
        ? 'FULL_REFUND_INITIATED'
        : 'PARTIAL_REFUND_INITIATED';

    if (this.isDuplicateEvent(order.order_number, event, refund.id)) {
      return { emailSent: false, smsSent: false };
    }

    let emailSent = false;
    let smsSent = false;

    // 1. Email
    try {
      const emailRes = await EmailService.sendRefundUpdate(order, refund, settings);
      emailSent = emailRes.success;
    } catch (err) {
      console.warn('Refund notification email notice:', err);
    }

    // 2. SMS
    try {
      const smsRes = await SmsService.sendOrderEventSms(
        event,
        order,
        {
          refundAmount: refund.amount,
          refundReason: refund.reason,
          refundId: refund.provider_refund_id || refund.id,
          refundStatus: refund.status,
        },
        settings
      );
      smsSent = smsRes.success;
    } catch (err) {
      console.warn('Refund notification SMS notice:', err);
    }

    return { emailSent, smsSent };
  },

  /**
   * Notifies customer of Courier Dispatch & Tracking ID
   */
  async notifyOrderDispatched({
    order,
    settings,
  }: {
    order: DbOrder;
    settings: StoreSettings;
  }): Promise<{ emailSent: boolean; smsSent: boolean }> {
    if (this.isDuplicateEvent(order.order_number, 'ORDER_DISPATCHED', order.tracking_id || '')) {
      return { emailSent: false, smsSent: false };
    }

    let emailSent = false;
    let smsSent = false;

    try {
      const emailRes = await EmailService.sendOrderStatusUpdate(order, settings);
      emailSent = emailRes.success;
    } catch (err) {
      console.warn('Dispatch email notice:', err);
    }

    try {
      const smsRes = await SmsService.sendOrderEventSms('ORDER_DISPATCHED', order, {}, settings);
      smsSent = smsRes.success;
    } catch (err) {
      console.warn('Dispatch SMS notice:', err);
    }

    return { emailSent, smsSent };
  },
};
