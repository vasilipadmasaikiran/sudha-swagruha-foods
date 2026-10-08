// ============================================================
// Order Store with Zustand & LocalStorage Persistence
// + Supabase two-way sync (fetch + insert + update + realtime)
// Supports Tracking ID, Carrier details, and Order Status History (Req 2, 11, 12, 17)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DbOrder, OrderStatusHistoryItem, OrderRefundRecord, OrderPaymentRecord, OrderItem, CustomerCancellationRequest, ShippingSnapshot, ShippingAuditItem } from '@/services/supabase';
import { supabase, isSupabaseConfigured, normalizeOrderTracking } from '@/services/supabase';
import { RefundService, calculateOrderRefundableMetrics, roundToTwoDecimals } from '@/services/refundService';
import { NotificationService } from '@/services/notificationService';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useProductStore } from '@/hooks/useProductStore';
import { roundToTwo, derivePaymentStatus, validateManualPayment } from '@/services/orderCalculationService';
import { logAdminAction } from '@/services/auditLogger';
import {
  calculateOrderPaymentBreakdown,
  validateNewPaymentEntry,
  validateRefundAmount,
  type OrderPaymentBreakdown,
} from '@/services/paymentCalculationService';

export interface OrderUpdatePayload {
  order_status?: DbOrder['order_status'];
  tracking_id?: string;
  courier_name?: string;
  tracking_url?: string;
  notes?: string;
  updated_by?: string;
  payment_status?: DbOrder['payment_status'];
  amount_paid?: number;
  amount_due?: number;
  payments?: OrderPaymentRecord[];
  refunds?: OrderRefundRecord[];
  refunded_amount?: number;
  subtotal?: number;
  delivery_charge?: number;
  total?: number;
  calculated_delivery_charge?: number;
  admin_shipping_override?: number;
  shipping_override_reason?: string;
  shipping_audit_trail?: ShippingAuditItem[];
  shipping_snapshot?: ShippingSnapshot;
}

interface OrderStore {
  orders: DbOrder[];
  isSyncing: boolean;
  addOrder: (order: DbOrder) => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    status: DbOrder['order_status'],
    notes?: string
  ) => Promise<void>;
  updateOrderDetails: (
    orderId: string,
    payload: OrderUpdatePayload
  ) => Promise<DbOrder>;
  cancelOrder: (
    orderId: string,
    reason: string,
    cancelledBy?: string,
    initiateRefund?: boolean,
    customRefundAmount?: number
  ) => Promise<{ success: boolean; order?: DbOrder; refund?: OrderRefundRecord; error?: string }>;
  requestOrderCancellation: (
    orderId: string,
    reason: string,
    customerComment?: string
  ) => Promise<{ success: boolean; order?: DbOrder; error?: string }>;
  approveCancellationRequest: (
    orderId: string,
    approvedBy?: string,
    reviewerRole?: string,
    initiateRefund?: boolean,
    customRefundAmount?: number
  ) => Promise<{ success: boolean; order?: DbOrder; refund?: OrderRefundRecord; error?: string }>;
  rejectCancellationRequest: (
    orderId: string,
    rejectionReason: string,
    adminComment?: string,
    rejectedBy?: string,
    reviewerRole?: string
  ) => Promise<{ success: boolean; order?: DbOrder; error?: string }>;
  removeOrderItem: (
    orderId: string,
    productId: string,
    reason: string,
    removedBy?: string,
    initiateRefund?: boolean,
    options?: {
      cancelledQuantity?: number;
      customRefundAmount?: number;
      customizationNotes?: string;
    }
  ) => Promise<{ success: boolean; order?: DbOrder; refund?: OrderRefundRecord; error?: string }>;
  cancelOrderItem: (
    orderId: string,
    productId: string,
    options: {
      reason: string;
      cancelledQuantity?: number;
      customRefundAmount?: number;
      customizationNotes?: string;
      cancelledBy?: string;
      initiateRefund?: boolean;
    }
  ) => Promise<{ success: boolean; order?: DbOrder; refund?: OrderRefundRecord; error?: string }>;
  initiateOrderRefund: (
    orderId: string,
    amount: number,
    reason: string,
    type: 'full' | 'partial',
    itemId?: string | null,
    requestedBy?: string
  ) => Promise<{ success: boolean; order?: DbOrder; refund?: OrderRefundRecord; error?: string }>;
  recordOrderPayment: (
    orderId: string,
    payment: {
      amount: number;
      transactionId?: string;
      provider?: string;
      paymentMethod?: string;
      paymentDate?: string;
      notes?: string;
      recordedBy?: string;
      recordedByRole?: string;
    }
  ) => Promise<{ success: boolean; order?: DbOrder; error?: string; breakdown?: OrderPaymentBreakdown }>;
  processExcessRefund: (
    orderId: string,
    refundData: {
      amount: number;
      refundMethod?: string;
      transactionId?: string;
      refundDate?: string;
      notes?: string;
      processedBy?: string;
      processedByRole?: string;
    }
  ) => Promise<{ success: boolean; order?: DbOrder; refund?: OrderRefundRecord; error?: string }>;
  updateOrderShipping: (
    orderId: string,
    newShippingCharge: number,
    reason: string,
    changedBy?: string,
    changedByRole?: string
  ) => Promise<{ success: boolean; order?: DbOrder; error?: string; breakdown?: OrderPaymentBreakdown }>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrderByNumber: (orderNumber: string) => DbOrder | undefined;
  resetOrders: () => void;
  fetchOrdersFromSupabase: () => Promise<{ success: boolean; count: number; error?: string }>;
  subscribeToOrders: () => () => void;
}

const initialOrders: DbOrder[] = [
  {
    id: 'order-101',
    order_number: 'SSF-20261001-00101',
    customer_id: null,
    customer_name: 'Suresh Varma',
    customer_mobile: '9876543210',
    customer_whatsapp: '9876543210',
    customer_email: 'suresh@example.com',
    items: [
      {
        product_id: '1',
        product_name_en: 'Andhra Avakaya Pickle',
        product_name_te: 'ఆంధ్ర అవకాయ',
        weight: '500g',
        quantity: 2,
        unit_price: 320,
        total_price: 640,
        sku: 'SSF-AVK-500',
      },
      {
        product_id: '5',
        product_name_en: 'Kandi Karam Podi',
        product_name_te: 'కంది కారం పొడి',
        weight: '250g',
        quantity: 1,
        unit_price: 180,
        total_price: 180,
        sku: 'SSF-KKP-250',
      },
    ],
    subtotal: 820,
    delivery_charge: 0,
    discount: 0,
    total: 820,
    payment_status: 'paid',
    payment_id: null,
    razorpay_order_id: null,
    order_status: 'preparing',
    tracking_id: null,
    courier_name: null,
    tracking_url: null,
    dispatched_at: null,
    delivery_address: {
      house_no: 'Plot 42, Green Meadows',
      street: 'Madhapur Main Road',
      area: 'Hitech City',
      city: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
    },
    notes: 'Please pack securely with extra bubble wrap',
    order_status_history: [
      {
        status: 'placed',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        notes: 'Order placed by customer',
      },
      {
        status: 'confirmed',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
        updated_by: 'Order Processor',
      },
      {
        status: 'preparing',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        updated_by: 'Kitchen Head',
      },
    ],
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'order-102',
    order_number: 'SSF-20261004-00102',
    customer_id: null,
    customer_name: 'Lakshmi Devi',
    customer_mobile: '8374634989',
    customer_whatsapp: '8374634989',
    customer_email: 'lakshmi@example.com',
    items: [
      {
        product_id: '3',
        product_name_en: 'Gongura Pachadi',
        product_name_te: 'గోంగూర పచ్చడి',
        weight: '500g',
        quantity: 1,
        unit_price: 310,
        total_price: 310,
        sku: 'SSF-GNG-500',
      },
    ],
    subtotal: 310,
    delivery_charge: 60,
    discount: 0,
    total: 370,
    payment_status: 'pending',
    payment_id: null,
    razorpay_order_id: null,
    order_status: 'shipped',
    tracking_id: 'DELH98726351',
    courier_name: 'Delhivery',
    tracking_url: 'https://www.delhivery.com/track/package/DELH98726351',
    dispatched_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    delivery_address: {
      house_no: 'D.No 12-4-5',
      street: 'Brodipet 4th line',
      area: 'Brodipet',
      city: 'Guntur',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      pincode: '522002',
    },
    notes: 'Call before delivery',
    order_status_history: [
      {
        status: 'placed',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
      {
        status: 'confirmed',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        status: 'shipped',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        tracking_id: 'DELH98726351',
        courier_name: 'Delhivery',
        notes: 'Handed over to Delhivery logistics',
      },
    ],
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: initialOrders,
      isSyncing: false,

      // ─── Fetch all orders from Supabase (for Admin & Customer Store) ───
      fetchOrdersFromSupabase: async () => {
        if (!isSupabaseConfigured()) {
          return { success: false, count: 0, error: 'Database not configured' };
        }
        set({ isSyncing: true });
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data) {
            const normalizedData = (data as DbOrder[]).map(normalizeOrderTracking);
            if (normalizedData.length > 0) {
              const supabaseOrderNumbers = new Set(normalizedData.map((o) => o.order_number));
              const localOnly = get().orders.filter(
                (o) =>
                  !supabaseOrderNumbers.has(o.order_number) &&
                  !o.id.startsWith('order-10')
              );
              set({ orders: [...normalizedData, ...localOnly] });
            } else {
              const nonDemo = get().orders.filter((o) => !o.id.startsWith('order-10'));
              if (nonDemo.length > 0) {
                set({ orders: nonDemo });
              }
            }
            return { success: true, count: normalizedData.length };
          }
          return { success: true, count: 0 };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Fetch failed';
          console.error('Supabase orders fetch failed:', err);
          return { success: false, count: 0, error: errorMsg };
        } finally {
          set({ isSyncing: false });
        }
      },

      // ─── Add new order ─────────────────────────────────────────────
      addOrder: async (newOrder: DbOrder) => {
        const normalized = normalizeOrderTracking(newOrder);
        set((state) => ({
          orders: [normalized, ...state.orders.filter((o) => o.order_number !== normalized.order_number)],
        }));

        // Authoritative stock deduction across ordered variants
        try {
          if (Array.isArray(normalized.items)) {
            useProductStore.getState().deductOrderStock(
              normalized.items.map((it) => ({
                productId: it.product_id,
                weight: it.weight,
                quantity: it.quantity,
              })),
              normalized.order_number
            );
          }
        } catch (stockErr) {
          console.warn('Inventory deduction notice:', stockErr);
        }

        if (isSupabaseConfigured()) {
          try {
            const cleanUserNotes = (normalized.notes || '').replace(/\[SSF_TRACKING:[\s\S]*?\]/g, '').trim();
            const trackingMetadata = {
              tracking_id: normalized.tracking_id || null,
              courier_name: normalized.courier_name || null,
              tracking_url: normalized.tracking_url || null,
              dispatched_at: normalized.dispatched_at || null,
              history: normalized.order_status_history || [],
              cancellation_reason: normalized.cancellation_reason || null,
              cancelled_at: normalized.cancelled_at || null,
              cancelled_by: normalized.cancelled_by || null,
              cancellation_request: normalized.cancellation_request || null,
              refunded_amount: normalized.refunded_amount || 0,
              refunds: normalized.refunds || [],
              payments: normalized.payments || [],
              taxable_amount: normalized.taxable_amount,
              gst_rate: normalized.gst_rate,
              gst_amount: normalized.gst_amount,
              coupon_code: normalized.coupon_code,
              coupon_discount: normalized.coupon_discount,
              item_discount: normalized.item_discount,
              order_discount: normalized.order_discount,
              amount_paid: normalized.amount_paid,
              amount_due: normalized.amount_due,
            };
            const encodedNotes = `${cleanUserNotes ? cleanUserNotes + ' ' : ''}[SSF_TRACKING:${JSON.stringify(trackingMetadata)}]`;

            const orderPayload: Record<string, unknown> = {
              order_number: normalized.order_number,
              customer_id: normalized.customer_id || null,
              items: normalized.items,
              subtotal: Number(normalized.subtotal),
              delivery_charge: Number(normalized.delivery_charge || 0),
              discount: Number(normalized.discount || 0),
              total: Number(normalized.total),
              payment_status: normalized.payment_status,
              payment_id: normalized.payment_id || null,
              razorpay_order_id: normalized.razorpay_order_id || null,
              order_status: normalized.order_status,
              delivery_address: normalized.delivery_address,
              customer_name: normalized.customer_name,
              customer_mobile: normalized.customer_mobile,
              customer_whatsapp: normalized.customer_whatsapp,
              customer_email: normalized.customer_email || null,
              notes: encodedNotes,
              created_at: normalized.created_at || new Date().toISOString(),
              updated_at: normalized.updated_at || new Date().toISOString(),
            };

            const { data, error } = await supabase
              .from('orders')
              .insert([orderPayload])
              .select()
              .single();

            if (error) {
              console.error('Supabase order insert error:', error);
              throw error;
            }

            if (data) {
              const saved = normalizeOrderTracking(data as DbOrder);
              set((state) => ({
                orders: state.orders.map((o) =>
                  o.order_number === normalized.order_number ? saved : o
                ),
              }));
              console.log('Order successfully inserted into Supabase DB:', normalized.order_number);
            }
          } catch (err) {
            console.error('Supabase order insert failed (order saved locally):', err);
          }
        }
      },

      // ─── Basic status update (wraps comprehensive updateOrderDetails) ──
      updateOrderStatus: async (
        orderId: string,
        status: DbOrder['order_status'],
        notes?: string
      ) => {
        await get().updateOrderDetails(orderId, { order_status: status, notes });
      },

      // ─── Comprehensive Order Update with Tracking & History (Req 2, 11, 17) ───
      updateOrderDetails: async (
        orderId: string,
        payload: OrderUpdatePayload
      ): Promise<DbOrder> => {
        const now = new Date().toISOString();
        const existing = get().orders.find(
          (o) => o.id === orderId || o.order_number === orderId
        );

        if (!existing) {
          throw new Error('Order not found in store');
        }

        const newStatus = payload.order_status || existing.order_status;
        const newTrackingId = payload.tracking_id !== undefined ? payload.tracking_id : (existing.tracking_id || null);
        const newCourier = payload.courier_name !== undefined ? payload.courier_name : (existing.courier_name || null);
        const newTrackingUrl = payload.tracking_url !== undefined ? payload.tracking_url : (existing.tracking_url || null);
        const newNotes = payload.notes !== undefined ? payload.notes : (existing.notes || '');

        // Generate updated status history
        const existingHistory = Array.isArray(existing.order_status_history) ? [...existing.order_status_history] : [];
        const statusChanged = payload.order_status && payload.order_status !== existing.order_status;
        const trackingChanged = payload.tracking_id && payload.tracking_id !== existing.tracking_id;

        if (statusChanged || trackingChanged || existingHistory.length === 0) {
          existingHistory.push({
            status: newStatus,
            timestamp: now,
            updated_by: payload.updated_by || 'Admin',
            notes: payload.notes || undefined,
            tracking_id: newTrackingId || undefined,
            courier_name: newCourier || undefined,
            tracking_url: newTrackingUrl || undefined,
          });
        }

        // Encode complete metadata seamlessly into notes so that tracking, history, and financial snapshots are 100% saved
        const cleanUserNotes = (newNotes || '').replace(/\[SSF_TRACKING:[\s\S]*?\]/g, '').trim();
        const trackingMetadata = {
          tracking_id: newTrackingId,
          courier_name: newCourier,
          tracking_url: newTrackingUrl,
          dispatched_at: newStatus === 'shipped' ? (existing.dispatched_at || now) : existing.dispatched_at,
          history: existingHistory,
          cancellation_reason: existing.cancellation_reason || null,
          cancelled_at: existing.cancelled_at || null,
          cancelled_by: existing.cancelled_by || null,
          cancellation_request: existing.cancellation_request || null,
          refunded_amount: payload.refunded_amount !== undefined ? payload.refunded_amount : (existing.refunded_amount || 0),
          refunds: payload.refunds !== undefined ? payload.refunds : (existing.refunds || []),
          payments: payload.payments !== undefined ? payload.payments : (existing.payments || []),
          taxable_amount: existing.taxable_amount,
          gst_rate: existing.gst_rate,
          gst_amount: existing.gst_amount,
          coupon_code: existing.coupon_code,
          coupon_discount: existing.coupon_discount,
          item_discount: existing.item_discount,
          order_discount: existing.order_discount,
          amount_paid: payload.amount_paid !== undefined ? payload.amount_paid : existing.amount_paid,
          amount_due: payload.amount_due !== undefined ? payload.amount_due : existing.amount_due,
          shipping_snapshot: payload.shipping_snapshot !== undefined ? payload.shipping_snapshot : existing.shipping_snapshot,
          calculated_delivery_charge: payload.calculated_delivery_charge !== undefined ? payload.calculated_delivery_charge : existing.calculated_delivery_charge,
          admin_shipping_override: payload.admin_shipping_override !== undefined ? payload.admin_shipping_override : existing.admin_shipping_override,
          shipping_override_reason: payload.shipping_override_reason !== undefined ? payload.shipping_override_reason : existing.shipping_override_reason,
          shipping_audit_trail: payload.shipping_audit_trail !== undefined ? payload.shipping_audit_trail : existing.shipping_audit_trail,
        };
        const encodedNotes = `${cleanUserNotes ? cleanUserNotes + ' ' : ''}[SSF_TRACKING:${JSON.stringify(trackingMetadata)}]`;

        const newPaymentStatus = payload.payment_status || existing.payment_status;
        const newAmountPaid = payload.amount_paid !== undefined ? payload.amount_paid : existing.amount_paid;
        const newAmountDue = payload.amount_due !== undefined ? payload.amount_due : existing.amount_due;
        const newDeliveryCharge = payload.delivery_charge !== undefined ? payload.delivery_charge : existing.delivery_charge;
        const newTotal = payload.total !== undefined ? payload.total : existing.total;

        const updatedOrder: DbOrder = normalizeOrderTracking({
          ...existing,
          delivery_charge: newDeliveryCharge,
          total: newTotal,
          total_amount: newTotal,
          order_status: newStatus,
          payment_status: newPaymentStatus,
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          payments: trackingMetadata.payments,
          refunds: trackingMetadata.refunds,
          refunded_amount: trackingMetadata.refunded_amount,
          shipping_snapshot: trackingMetadata.shipping_snapshot,
          calculated_delivery_charge: trackingMetadata.calculated_delivery_charge,
          admin_shipping_override: trackingMetadata.admin_shipping_override,
          shipping_override_reason: trackingMetadata.shipping_override_reason,
          shipping_audit_trail: trackingMetadata.shipping_audit_trail,
          tracking_id: newTrackingId,
          courier_name: newCourier,
          tracking_url: newTrackingUrl,
          dispatched_at: trackingMetadata.dispatched_at || null,
          notes: encodedNotes,
          order_status_history: existingHistory,
          updated_at: now,
        });

        // 1. Immediately update Zustand local state for instant snappy UI
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId || o.order_number === existing.order_number ? updatedOrder : o
          ),
        }));

        // 2. Synchronize to Supabase Cloud Database (AUTHORITATIVE TRUTH)
        if (isSupabaseConfigured()) {
          try {
            // First attempt: Try updating with dedicated columns
            const fullPayload: Record<string, unknown> = {
              order_status: newStatus,
              payment_status: newPaymentStatus,
              delivery_charge: newDeliveryCharge,
              total: newTotal,
              total_amount: newTotal,
              notes: encodedNotes,
              updated_at: now,
              tracking_id: newTrackingId,
              courier_name: newCourier,
              tracking_url: newTrackingUrl,
              amount_paid: newAmountPaid,
              amount_due: newAmountDue,
              payments: trackingMetadata.payments,
              refunds: trackingMetadata.refunds,
              refunded_amount: trackingMetadata.refunded_amount,
              taxable_amount: existing.taxable_amount,
              gst_rate: existing.gst_rate,
              gst_amount: existing.gst_amount,
              coupon_discount: existing.coupon_discount,
              calculated_delivery_charge: trackingMetadata.calculated_delivery_charge,
              admin_shipping_override: trackingMetadata.admin_shipping_override,
              shipping_override_reason: trackingMetadata.shipping_override_reason,
              shipping_audit_trail: trackingMetadata.shipping_audit_trail,
              shipping_snapshot: trackingMetadata.shipping_snapshot,
            };

            let { error: fullError } = await supabase
              .from('orders')
              .update(fullPayload)
              .eq('order_number', existing.order_number);

            // If check constraint violation occurred (e.g. 'partially_paid' or 'unpaid' not yet in DB check constraint),
            // automatically retry with compliant payment_status 'pending' while full payment ledger is preserved in payments & notes
            if (
              fullError &&
              (fullError.code === '23514' ||
                fullError.message?.toLowerCase().includes('violates check constraint') ||
                fullError.message?.toLowerCase().includes('payment_status'))
            ) {
              console.warn('DB payment_status check constraint violation; retrying with compliant "pending":', fullError.message);
              fullPayload.payment_status = 'pending';
              const retryRes = await supabase
                .from('orders')
                .update(fullPayload)
                .eq('order_number', existing.order_number);
              fullError = retryRes.error;
            }

            if (fullError) {
              // If column does not exist yet (pre-migration), fallback safely to standard columns + encoded notes
              console.warn('Dedicated tracking columns not yet in DB schema cache; updating via standard schema fallback:', fullError.message);
              const safeDbStatus =
                newPaymentStatus === 'partially_paid' || newPaymentStatus === 'unpaid'
                  ? 'pending'
                  : newPaymentStatus;

              const fallbackPayload: Record<string, unknown> = {
                order_status: newStatus,
                payment_status: safeDbStatus,
                delivery_charge: newDeliveryCharge,
                total: newTotal,
                notes: encodedNotes,
                updated_at: now,
              };
              const { error: fallbackError } = await supabase
                .from('orders')
                .update(fallbackPayload)
                .eq('order_number', existing.order_number);

              if (fallbackError) {
                console.error('Supabase fallback status update error:', fallbackError);
                throw fallbackError;
              }
            }
            console.log(`Order ${existing.order_number} successfully updated in Supabase cloud!`);
          } catch (dbErr) {
            console.error('Supabase status sync failed:', dbErr);
            throw dbErr;
          }
        }

        return updatedOrder;
      },

      // ─── Cancel Order (Requirements 1, 2, 7, 8, 9, 10, 18) ────────
      cancelOrder: async (orderId, reason, cancelledBy = 'Order Processor', initiateRefund = true, customRefundAmount?: number) => {
        const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        if (order.order_status === 'delivered') {
          return { success: false, error: 'Cannot cancel an order that has already been delivered.' };
        }

        const now = new Date().toISOString();
        const settings = useSettingsStore.getState().settings;
        const metrics = calculateOrderRefundableMetrics(order);

        let refundRecord: OrderRefundRecord | undefined;
        let newRefundedAmount = order.refunded_amount || 0;
        let newPaymentStatus = order.payment_status;

        const targetRefundAmount = customRefundAmount !== undefined && !isNaN(customRefundAmount) && customRefundAmount > 0
          ? Math.min(roundToTwoDecimals(customRefundAmount), metrics.remainingRefundableAmount)
          : metrics.remainingRefundableAmount;

        // Process refund if order is paid and requested
        if (initiateRefund && metrics.isRefundable && targetRefundAmount > 0) {
          const refundResult = await RefundService.processRefund({
            order,
            amount: targetRefundAmount,
            reason: `Order Cancellation: ${reason}`,
            type: targetRefundAmount >= metrics.remainingRefundableAmount ? 'full' : 'partial',
            requestedBy: cancelledBy,
            settings,
          });

          refundRecord = refundResult.refundRecord;
          if (refundResult.success) {
            newRefundedAmount = roundToTwoDecimals(newRefundedAmount + refundRecord.amount);
            newPaymentStatus = newRefundedAmount >= order.total ? 'refunded' : 'partially_refunded';
          }
        }

        const historyNotes = `Order Cancelled. Reason: ${reason}${
          refundRecord ? ` | Refund: ₹${refundRecord.amount} (${refundRecord.status.toUpperCase()})` : ''
        }`;

        const updatedHistory: OrderStatusHistoryItem[] = [
          ...(order.order_status_history || []),
          {
            status: 'cancelled',
            timestamp: now,
            updated_by: cancelledBy,
            notes: historyNotes,
          },
        ];

        const updatedRefunds: OrderRefundRecord[] = [
          ...(order.refunds || []),
          ...(refundRecord ? [refundRecord] : []),
        ];

        const updatedOrder: DbOrder = {
          ...order,
          order_status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: now,
          cancelled_by: cancelledBy,
          refunded_amount: newRefundedAmount,
          payment_status: newPaymentStatus,
          refunds: updatedRefunds,
          order_status_history: updatedHistory,
          updated_at: now,
        };

        // Update local store
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id || o.order_number === order.order_number ? updatedOrder : o
          ),
        }));

        // Restock inventory for cancelled order items
        try {
          if (Array.isArray(order.items)) {
            useProductStore.getState().restockOrderItems(
              order.items.map((it) => ({
                productId: it.product_id,
                weight: it.weight,
                quantity: it.quantity,
              })),
              order.order_number,
              'Order Cancellation Restock'
            );
          }
        } catch (restockErr) {
          console.warn('Inventory restock notice:', restockErr);
        }

        // Sync with Supabase DB
        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('orders')
              .update({
                order_status: 'cancelled',
                cancellation_reason: reason,
                cancelled_at: now,
                cancelled_by: cancelledBy,
                refunded_amount: newRefundedAmount,
                payment_status: newPaymentStatus,
                refunds: updatedRefunds,
                order_status_history: updatedHistory,
                updated_at: now,
              })
              .eq('order_number', order.order_number);
          } catch (dbErr) {
            console.warn('DB cancel order update notice:', dbErr);
          }
        }

        // Audit Log
        await logAdminAction(cancelledBy, 'ORDER_PROCESSOR', 'CANCEL_ORDER', 'ORDER', order.order_number, {
          reason,
          refundAmount: refundRecord?.amount || 0,
          refundStatus: refundRecord?.status || 'none',
        });

        // Trigger notifications non-blockingly
        NotificationService.notifyOrderCancelled({
          order: updatedOrder,
          reason,
          refundAmount: refundRecord?.amount || 0,
          settings,
        }).catch((e) => console.warn('Cancel order notification error:', e));

        return { success: true, order: updatedOrder, refund: refundRecord };
      },

      // ─── Customer-Initiated Cancellation Request ──────────────────
      requestOrderCancellation: async (orderId: string, reason: string, customerComment?: string) => {
        const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        if (order.order_status === 'cancelled') {
          return { success: false, error: 'Order is already cancelled' };
        }
        if (order.order_status === 'delivered') {
          return { success: false, error: 'Delivered orders cannot be cancelled' };
        }
        if (order.order_status === 'shipped') {
          return { success: false, error: 'Order has already been dispatched with tracking and cannot be cancelled directly' };
        }
        if (order.cancellation_request?.status === 'requested') {
          return { success: false, error: 'A cancellation request is already pending review for this order' };
        }

        const now = new Date().toISOString();
        const settings = useSettingsStore.getState().settings;
        const metrics = calculateOrderRefundableMetrics(order);
        const estimatedRefund = metrics.isPaid ? metrics.remainingRefundableAmount : 0;

        const request: CustomerCancellationRequest = {
          status: 'requested',
          reason: reason.trim(),
          customer_comment: customerComment?.trim() || undefined,
          requested_at: now,
          estimated_refund_amount: estimatedRefund,
        };

        const updatedHistory: OrderStatusHistoryItem[] = [
          ...(order.order_status_history || []),
          {
            status: order.order_status, // Order status remains active!
            timestamp: now,
            notes: `Customer cancellation requested: ${reason}`,
            updated_by: 'Customer',
          },
        ];

        const updatedOrder: DbOrder = {
          ...order,
          cancellation_request: request,
          order_status_history: updatedHistory,
          updated_at: now,
        };

        // Update local store
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id || o.order_number === order.order_number ? updatedOrder : o
          ),
        }));

        // Sync with Supabase DB
        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('orders')
              .update({
                cancellation_request: request,
                order_status_history: updatedHistory,
                updated_at: now,
              })
              .eq('order_number', order.order_number);
          } catch (dbErr) {
            console.warn('DB request cancellation update notice:', dbErr);
          }
        }

        // Audit Log
        await logAdminAction('Customer', 'CUSTOMER', 'CANCELLATION_REQUESTED', 'ORDER', order.order_number, {
          reason,
          customerComment: customerComment?.trim() || '',
          estimatedRefund,
        });

        // Trigger notifications non-blockingly
        NotificationService.notifyCancellationRequested({
          order: updatedOrder,
          request,
          settings,
        }).catch((e) => console.warn('Cancellation request notification error:', e));

        return { success: true, order: updatedOrder };
      },

      // ─── Admin Approve Customer Cancellation Request ───────────────
      approveCancellationRequest: async (
        orderId: string,
        approvedBy = 'Store Owner',
        reviewerRole = 'STORE_OWNER',
        initiateRefund = true,
        customRefundAmount?: number
      ) => {
        const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        if (order.order_status === 'cancelled') {
          return { success: false, error: 'Order is already cancelled' };
        }
        if (order.cancellation_request?.status !== 'requested') {
          return { success: false, error: 'No pending customer cancellation request found for this order' };
        }

        const now = new Date().toISOString();
        const settings = useSettingsStore.getState().settings;
        const metrics = calculateOrderRefundableMetrics(order);

        // Calculate authoritative refund amount
        const customAmt = customRefundAmount !== undefined ? Number(customRefundAmount) : undefined;
        const refundableAmount = customAmt !== undefined && !isNaN(customAmt)
          ? Math.min(roundToTwoDecimals(customAmt), metrics.remainingRefundableAmount)
          : metrics.isPaid
          ? metrics.remainingRefundableAmount
          : 0;

        let refundRecord: OrderRefundRecord | undefined;

        // Process refund transaction if payment captured and amount > 0
        if (refundableAmount > 0 && initiateRefund && metrics.isRefundable) {
          const refundResult = await RefundService.processRefund({
            order,
            amount: refundableAmount,
            reason: `Customer cancellation approved: ${order.cancellation_request.reason || 'Requested by customer'}`,
            type: refundableAmount >= metrics.remainingRefundableAmount ? 'full' : 'partial',
            requestedBy: `${approvedBy} (${reviewerRole})`,
            settings,
          });
          refundRecord = refundResult.refundRecord;
        }

        const approvedRequest: CustomerCancellationRequest = {
          ...order.cancellation_request,
          status: 'approved',
          reviewed_at: now,
          reviewed_by: approvedBy,
          reviewer_role: reviewerRole,
          approved_refund_amount: refundableAmount,
        };

        const newRefundedAmount = roundToTwoDecimals(
          (order.refunded_amount || 0) + (refundRecord && refundRecord.status === 'success' ? refundableAmount : 0)
        );

        const newPaymentStatus =
          newRefundedAmount >= order.total
            ? 'refunded'
            : newRefundedAmount > 0
            ? 'partially_refunded'
            : order.payment_status;

        const updatedHistory: OrderStatusHistoryItem[] = [
          ...(order.order_status_history || []),
          {
            status: 'cancelled',
            timestamp: now,
            notes: `Customer cancellation approved by ${approvedBy} (${reviewerRole})${
              refundableAmount > 0 ? ` with refund of ₹${refundableAmount}` : ''
            }`,
            updated_by: `${approvedBy} (${reviewerRole})`,
          },
        ];

        const updatedRefunds: OrderRefundRecord[] = [
          ...(order.refunds || []),
          ...(refundRecord ? [refundRecord] : []),
        ];

        const updatedOrder: DbOrder = {
          ...order,
          order_status: 'cancelled',
          cancellation_reason: order.cancellation_request.reason || 'Customer cancellation request approved',
          cancelled_at: now,
          cancelled_by: `${approvedBy} (${reviewerRole})`,
          cancellation_request: approvedRequest,
          refunded_amount: newRefundedAmount,
          payment_status: newPaymentStatus,
          refunds: updatedRefunds,
          order_status_history: updatedHistory,
          updated_at: now,
        };

        // Update local store
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id || o.order_number === order.order_number ? updatedOrder : o
          ),
        }));

        // Sync with Supabase DB
        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('orders')
              .update({
                order_status: 'cancelled',
                cancellation_reason: updatedOrder.cancellation_reason,
                cancelled_at: now,
                cancelled_by: updatedOrder.cancelled_by,
                cancellation_request: approvedRequest,
                refunded_amount: newRefundedAmount,
                payment_status: newPaymentStatus,
                refunds: updatedRefunds,
                order_status_history: updatedHistory,
                updated_at: now,
              })
              .eq('order_number', order.order_number);
          } catch (dbErr) {
            console.warn('DB approve cancellation update notice:', dbErr);
          }
        }

        // Audit Log
        await logAdminAction(approvedBy, reviewerRole, 'CANCELLATION_APPROVED', 'ORDER', order.order_number, {
          reason: order.cancellation_request.reason,
          refundAmount: refundableAmount,
          refundStatus: refundRecord?.status || 'none',
        });

        // Trigger notifications non-blockingly
        NotificationService.notifyOrderCancelled({
          order: updatedOrder,
          reason: updatedOrder.cancellation_reason || 'Customer cancellation approved',
          refundAmount: refundableAmount,
          settings,
        }).catch((e) => console.warn('Approved cancellation notification error:', e));

        return { success: true, order: updatedOrder, refund: refundRecord };
      },

      // ─── Admin Reject Customer Cancellation Request ────────────────
      rejectCancellationRequest: async (
        orderId: string,
        rejectionReason: string,
        adminComment?: string,
        rejectedBy = 'Store Owner',
        reviewerRole = 'STORE_OWNER'
      ) => {
        const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        if (order.cancellation_request?.status !== 'requested') {
          return { success: false, error: 'No pending customer cancellation request found for this order' };
        }

        const now = new Date().toISOString();
        const settings = useSettingsStore.getState().settings;

        const rejectedRequest: CustomerCancellationRequest = {
          ...order.cancellation_request,
          status: 'rejected',
          reviewed_at: now,
          reviewed_by: rejectedBy,
          reviewer_role: reviewerRole,
          rejection_reason: rejectionReason.trim(),
          admin_comment: adminComment?.trim() || undefined,
        };

        // Note: order_status remains active (NOT cancelled)
        const updatedHistory: OrderStatusHistoryItem[] = [
          ...(order.order_status_history || []),
          {
            status: order.order_status,
            timestamp: now,
            notes: `Cancellation request rejected: ${rejectionReason}`,
            updated_by: `${rejectedBy} (${reviewerRole})`,
          },
        ];

        const updatedOrder: DbOrder = {
          ...order,
          cancellation_request: rejectedRequest,
          order_status_history: updatedHistory,
          updated_at: now,
        };

        // Update local store
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id || o.order_number === order.order_number ? updatedOrder : o
          ),
        }));

        // Sync with Supabase DB
        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('orders')
              .update({
                cancellation_request: rejectedRequest,
                order_status_history: updatedHistory,
                updated_at: now,
              })
              .eq('order_number', order.order_number);
          } catch (dbErr) {
            console.warn('DB reject cancellation update notice:', dbErr);
          }
        }

        // Audit Log
        await logAdminAction(rejectedBy, reviewerRole, 'CANCELLATION_REJECTED', 'ORDER', order.order_number, {
          rejectionReason,
          adminComment: adminComment?.trim() || '',
        });

        // Trigger notifications non-blockingly
        NotificationService.notifyCancellationRejected({
          order: updatedOrder,
          request: rejectedRequest,
          settings,
        }).catch((e) => console.warn('Rejected cancellation notification error:', e));

        return { success: true, order: updatedOrder };
      },

      // ─── Remove / Cancel Order Item with Customization & Partial Qty ───
      removeOrderItem: async (orderId, productId, reason, removedBy = 'Order Processor', initiateRefund = true, options) => {
        const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        const itemIndex = order.items.findIndex(
          (it) => (it.product_id === productId || it.sku === productId) && it.status !== 'removed' && it.status !== 'cancelled'
        );
        if (itemIndex === -1) {
          return { success: false, error: 'Item not found in order or already removed' };
        }

        const targetItem = order.items[itemIndex];
        const now = new Date().toISOString();
        const settings = useSettingsStore.getState().settings;
        const metrics = calculateOrderRefundableMetrics(order);

        // Check if partial quantity cancellation
        const requestedCancelQty = options?.cancelledQuantity && options.cancelledQuantity > 0 && options.cancelledQuantity <= targetItem.quantity
          ? options.cancelledQuantity
          : targetItem.quantity;
        const isPartialQty = requestedCancelQty < targetItem.quantity;

        // Proportional item value
        const unitPrice = Number(targetItem.unit_price || (targetItem.total_price / targetItem.quantity));
        const cancelledLineValue = roundToTwoDecimals(unitPrice * requestedCancelQty);

        // Calculate item refundable amount
        const customAmt = options?.customRefundAmount !== undefined ? Number(options.customRefundAmount) : undefined;
        const maxRefundableForThis = customAmt !== undefined && !isNaN(customAmt)
          ? customAmt
          : cancelledLineValue;
        const itemRefundAmount = Math.min(roundToTwoDecimals(maxRefundableForThis), metrics.remainingRefundableAmount);

        let refundRecord: OrderRefundRecord | undefined;
        let newRefundedAmount = order.refunded_amount || 0;
        let newPaymentStatus = order.payment_status;

        if (initiateRefund && metrics.isRefundable && itemRefundAmount > 0) {
          const refundResult = await RefundService.processRefund({
            order,
            amount: itemRefundAmount,
            reason: `Item Cancelled (${targetItem.product_name_en} x${requestedCancelQty}): ${reason}${options?.customizationNotes ? ` [${options.customizationNotes}]` : ''}`,
            type: 'partial',
            itemId: targetItem.product_id,
            requestedBy: removedBy,
            settings,
          });

          refundRecord = refundResult.refundRecord;
          if (refundResult.success) {
            newRefundedAmount = roundToTwoDecimals(newRefundedAmount + refundRecord.amount);
            newPaymentStatus = newRefundedAmount >= order.total ? 'refunded' : 'partially_refunded';
          }
        }

        // Update items array
        let updatedItems: OrderItem[];
        if (isPartialQty) {
          const remainingQty = targetItem.quantity - requestedCancelQty;
          const remainingTotalPrice = roundToTwoDecimals(unitPrice * remainingQty);
          const activeItem: OrderItem = {
            ...targetItem,
            quantity: remainingQty,
            total_price: remainingTotalPrice,
          };
          const cancelledItem: OrderItem = {
            ...targetItem,
            quantity: requestedCancelQty,
            total_price: cancelledLineValue,
            status: 'cancelled',
            cancelled_quantity: requestedCancelQty,
            removal_reason: reason,
            removed_by: removedBy,
            removed_at: now,
            customization: options?.customizationNotes || targetItem.customization,
            refundable_amount: cancelledLineValue,
            refund_amount: refundRecord?.amount || 0,
            refund_id: refundRecord?.id,
          };
          updatedItems = [
            ...order.items.slice(0, itemIndex),
            activeItem,
            cancelledItem,
            ...order.items.slice(itemIndex + 1),
          ];
        } else {
          updatedItems = order.items.map((it, idx) => {
            if (idx === itemIndex) {
              return {
                ...it,
                status: 'cancelled',
                cancelled_quantity: targetItem.quantity,
                removal_reason: reason,
                removed_by: removedBy,
                removed_at: now,
                customization: options?.customizationNotes || it.customization,
                refundable_amount: cancelledLineValue,
                refund_amount: refundRecord?.amount || 0,
                refund_id: refundRecord?.id,
              };
            }
            return it;
          });
        }

        // Check if all items are removed/cancelled -> auto cancel order
        const hasActiveItems = updatedItems.some((it) => it.status !== 'removed' && it.status !== 'cancelled');
        const nextOrderStatus = hasActiveItems ? order.order_status : 'cancelled';

        const historyNotes = `Item Cancelled: ${targetItem.product_name_en} (Qty: ${requestedCancelQty}). Reason: ${reason}${
          options?.customizationNotes ? ` [Customisation: ${options.customizationNotes}]` : ''
        }${refundRecord ? ` | Partial Refund: ₹${refundRecord.amount} (${refundRecord.status.toUpperCase()})` : ''}`;

        const updatedHistory: OrderStatusHistoryItem[] = [
          ...(order.order_status_history || []),
          {
            status: nextOrderStatus,
            timestamp: now,
            updated_by: removedBy,
            notes: historyNotes,
          },
        ];

        const updatedRefunds: OrderRefundRecord[] = [
          ...(order.refunds || []),
          ...(refundRecord ? [refundRecord] : []),
        ];

        const updatedOrder: DbOrder = {
          ...order,
          items: updatedItems,
          order_status: nextOrderStatus,
          cancellation_reason: !hasActiveItems ? 'All products unavailable' : order.cancellation_reason,
          refunded_amount: newRefundedAmount,
          payment_status: newPaymentStatus,
          refunds: updatedRefunds,
          order_status_history: updatedHistory,
          updated_at: now,
        };

        // Update local store
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id || o.order_number === order.order_number ? updatedOrder : o
          ),
        }));

        // Restock inventory for cancelled item quantity
        try {
          useProductStore.getState().restockOrderItems(
            [
              {
                productId: targetItem.product_id,
                weight: targetItem.weight,
                quantity: requestedCancelQty,
              },
            ],
            order.order_number,
            'Order Item Cancellation Restock'
          );
        } catch (restockErr) {
          console.warn('Inventory item restock notice:', restockErr);
        }

        // Sync with Supabase DB
        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('orders')
              .update({
                items: updatedItems,
                order_status: nextOrderStatus,
                cancellation_reason: updatedOrder.cancellation_reason,
                refunded_amount: newRefundedAmount,
                payment_status: newPaymentStatus,
                refunds: updatedRefunds,
                order_status_history: updatedHistory,
                updated_at: now,
              })
              .eq('order_number', order.order_number);
          } catch (dbErr) {
            console.warn('DB remove item update notice:', dbErr);
          }
        }

        // Audit Log
        await logAdminAction(removedBy, 'ORDER_PROCESSOR', 'CANCEL_ORDER_ITEM', 'ORDER', order.order_number, {
          item: targetItem.product_name_en,
          cancelledQuantity: requestedCancelQty,
          reason,
          customization: options?.customizationNotes,
          refundAmount: refundRecord?.amount || 0,
        });

        // Trigger notifications non-blockingly
        NotificationService.notifyItemRemoved({
          order: updatedOrder,
          item: {
            ...targetItem,
            quantity: requestedCancelQty,
            total_price: cancelledLineValue,
          },
          refundAmount: refundRecord?.amount || 0,
          reason: `${reason}${options?.customizationNotes ? ` (${options.customizationNotes})` : ''}`,
          settings,
        }).catch((e) => console.warn('Remove item notification error:', e));

        return { success: true, order: updatedOrder, refund: refundRecord };
      },

      // Alias cancelOrderItem for explicit naming
      cancelOrderItem: async (orderId, productId, options) => {
        return get().removeOrderItem(
          orderId,
          productId,
          options.reason,
          options.cancelledBy || 'Order Processor',
          options.initiateRefund ?? true,
          {
            cancelledQuantity: options.cancelledQuantity,
            customRefundAmount: options.customRefundAmount,
            customizationNotes: options.customizationNotes,
          }
        );
      },

      // ─── Initiate Order Refund (Requirements 8, 9, 10, 11) ──────────
      initiateOrderRefund: async (orderId, amount, reason, type = 'partial', itemId = null, requestedBy = 'Order Processor') => {
        const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        const settings = useSettingsStore.getState().settings;
        const refundResult = await RefundService.processRefund({
          order,
          amount,
          reason,
          type,
          itemId,
          requestedBy,
          settings,
        });

        if (!refundResult.success) {
          return { success: false, error: refundResult.error || 'Refund failed', refund: refundResult.refundRecord };
        }

        const now = new Date().toISOString();
        const refundRecord = refundResult.refundRecord;
        const newRefundedAmount = roundToTwoDecimals((order.refunded_amount || 0) + refundRecord.amount);
        const newPaymentStatus = newRefundedAmount >= order.total ? 'refunded' : 'partially_refunded';

        const updatedHistory: OrderStatusHistoryItem[] = [
          ...(order.order_status_history || []),
          {
            status: order.order_status,
            timestamp: now,
            updated_by: requestedBy,
            notes: `Refund Initiated: ₹${refundRecord.amount} (${type.toUpperCase()}). Reason: ${reason}. Provider Ref: ${refundRecord.provider_refund_id}`,
          },
        ];

        const updatedRefunds: OrderRefundRecord[] = [...(order.refunds || []), refundRecord];

        const updatedOrder: DbOrder = {
          ...order,
          refunded_amount: newRefundedAmount,
          payment_status: newPaymentStatus,
          refunds: updatedRefunds,
          order_status_history: updatedHistory,
          updated_at: now,
        };

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id || o.order_number === order.order_number ? updatedOrder : o
          ),
        }));

        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('orders')
              .update({
                refunded_amount: newRefundedAmount,
                payment_status: newPaymentStatus,
                refunds: updatedRefunds,
                order_status_history: updatedHistory,
                updated_at: now,
              })
              .eq('order_number', order.order_number);
          } catch (dbErr) {
            console.warn('DB initiate refund update notice:', dbErr);
          }
        }

        NotificationService.notifyRefundUpdate({
          order: updatedOrder,
          refund: refundRecord,
          settings,
        }).catch((e) => console.warn('Refund notification error:', e));

        return { success: true, order: updatedOrder, refund: refundRecord };
      },

      // ─── Record Order Payment (Section 2, 3, 4, 16, 17) ───────
      recordOrderPayment: async (
        orderId: string,
        paymentData: {
          amount: number;
          transactionId?: string;
          provider?: string;
          paymentMethod?: string;
          paymentDate?: string;
          notes?: string;
          recordedBy?: string;
          recordedByRole?: string;
        }
      ) => {
        try {
          const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
          if (!order) {
            return { success: false, error: 'Order not found in database or store' };
          }

          // 1. Authoritative Backend/Service Validation (Never trust frontend values)
          const validation = validateNewPaymentEntry(order, paymentData.amount);
          if (!validation.valid) {
            return { success: false, error: validation.error };
          }

          const txnId = paymentData.transactionId?.trim() || `MANUAL-${Date.now().toString().slice(-6)}`;

          // 2. Prevent Duplicate Entry (Deduplication Guard)
          if (
            paymentData.transactionId?.trim() &&
            order.payments?.some(
              (p) =>
                p.transaction_id &&
                p.transaction_id.toLowerCase() === paymentData.transactionId?.trim().toLowerCase()
            )
          ) {
            return {
              success: false,
              error: `A payment with Transaction Reference "${paymentData.transactionId}" has already been recorded for this order.`,
            };
          }

          // Rapid accidental double-click guard (same amount within 10 seconds)
          const recentDuplicate = order.payments?.find((p) => {
            if (Number(p.amount) !== validation.roundedAmount) return false;
            const pTime = new Date(p.created_at || p.createdAt || 0).getTime();
            return Date.now() - pTime < 10000;
          });
          if (recentDuplicate) {
            return {
              success: false,
              error: `A payment of ₹${validation.roundedAmount} was already recorded a few moments ago (Ref: ${recentDuplicate.transaction_id || recentDuplicate.id}). Please wait or specify a distinct Transaction ID.`,
            };
          }

          const now = new Date().toISOString();
          const paymentDate = paymentData.paymentDate || now;
          const recordedBy = paymentData.recordedBy || 'Admin';
          const recordedByRole = paymentData.recordedByRole || 'Store Owner';
          const paymentMethod = paymentData.paymentMethod || 'cash';

          const newPayment: OrderPaymentRecord = {
            id: `pay_${Date.now()}`,
            payment_id: `pay_${Date.now()}`,
            order_id: order.id,
            orderId: order.id,
            order_number: order.order_number,
            transaction_id: txnId,
            reference: txnId,
            amount: validation.roundedAmount,
            status: 'success',
            provider: paymentData.provider || 'manual',
            payment_method: paymentMethod,
            paymentMethod: paymentMethod,
            paid_at: paymentDate,
            payment_date: paymentDate,
            paymentDate: paymentDate,
            notes: paymentData.notes || `Manual payment recorded by ${recordedBy}`,
            recorded_by: recordedBy,
            recordedBy: recordedBy,
            recorded_by_role: recordedByRole,
            recordedByRole: recordedByRole,
            created_at: now,
            createdAt: now,
          };

          const existingPayments = Array.isArray(order.payments) ? [...order.payments] : [];
          const updatedPayments = [...existingPayments, newPayment];

          // 3. Central Authoritative Calculation
          const interimOrder: DbOrder = {
            ...order,
            payments: updatedPayments,
          };
          const breakdown = calculateOrderPaymentBreakdown(interimOrder);

          const mappedPaymentStatus: DbOrder['payment_status'] =
            breakdown.paymentStatus === 'FULLY PAID'
              ? 'paid'
              : breakdown.paymentStatus === 'EXCESS AMOUNT'
              ? 'paid'
              : breakdown.paymentStatus === 'PARTIALLY PAID'
              ? 'partially_paid'
              : 'unpaid';

          const updatedHistory: OrderStatusHistoryItem[] = [
            ...(order.order_status_history || []),
            {
              status: order.order_status,
              timestamp: now,
              updated_by: recordedBy,
              notes: `Payment recorded: ₹${validation.roundedAmount} via ${paymentMethod.toUpperCase()} (Ref: ${txnId}). Status: ${breakdown.paymentStatus}. Total Received: ₹${breakdown.totalAmountReceived}, Balance: ₹${breakdown.balanceAmount}${breakdown.excessAmount > 0 ? `, Excess: ₹${breakdown.excessAmount}` : ''}`,
            },
          ];

          // 4. Persist to Supabase and update local state via updateOrderDetails
          const updatedOrder = await get().updateOrderDetails(order.id, {
            payment_status: mappedPaymentStatus,
            amount_paid: breakdown.totalAmountReceived,
            amount_due: breakdown.balanceAmount,
            payments: updatedPayments,
            notes: order.notes || undefined,
            updated_by: recordedBy,
          });

          // Ensure in-memory Zustand store is immediately updated with full payments array
          const finalOrder: DbOrder = {
            ...updatedOrder,
            payments: updatedPayments,
            amount_paid: breakdown.totalAmountReceived,
            amount_due: breakdown.balanceAmount,
            payment_status: mappedPaymentStatus,
            order_status_history: updatedHistory,
          };

          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === order.id || o.order_number === order.order_number ? finalOrder : o
            ),
          }));

          // 5. Audit Logging: MANUAL_PAYMENT_RECORDED
          try {
            await logAdminAction(recordedBy, recordedByRole, 'MANUAL_PAYMENT_RECORDED', 'ORDER', order.order_number, {
              orderId: order.id,
              paymentId: newPayment.id,
              amount: validation.roundedAmount,
              paymentMethod,
              reference: txnId,
              status: 'SUCCESS',
              paymentDate,
              notes: newPayment.notes,
              recordedBy,
              recordedByRole,
              totalReceived: breakdown.totalAmountReceived,
              balanceAmount: breakdown.balanceAmount,
              excessAmount: breakdown.excessAmount,
              authoritativeStatus: breakdown.paymentStatus,
            });
          } catch (auditErr) {
            console.warn('Non-blocking audit log notice:', auditErr);
          }

          // 6. Customer Notification (SMS + Email) (Section 8)
          try {
            const storeSettings = useSettingsStore.getState().settings;
            await NotificationService.notifyPaymentReceived({
              order: finalOrder,
              payment: {
                amount: validation.roundedAmount,
                payment_method: paymentMethod,
                reference: txnId,
                payment_date: paymentDate,
                notes: newPayment.notes || undefined,
              },
              breakdown: {
                adjustedOrderTotal: breakdown.adjustedOrderTotal,
                totalAmountReceived: breakdown.totalAmountReceived,
                balanceAmount: breakdown.balanceAmount,
                paymentStatus: breakdown.paymentStatus,
              },
              settings: storeSettings,
            });
          } catch (notifErr) {
            console.warn('Customer payment notification non-blocking issue:', notifErr);
          }

          return { success: true, order: finalOrder, breakdown };
        } catch (err: any) {
          console.error('Error in recordOrderPayment:', err);
          return {
            success: false,
            error: err.message || 'Failed to record payment due to an unexpected error',
          };
        }
      },

      // ─── Process Excess / Order Refund (Section 5, 6, 14, 15) ───────────────
      processExcessRefund: async (orderId, refundData) => {
        try {
          const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
          if (!order) {
            return { success: false, error: 'Order not found in database or store' };
          }

          // RBAC Enforcement (Section 14: Order Processors cannot refund unless permitted)
          const processedByRole = refundData.processedByRole || 'ROOT_ADMIN';
          if (processedByRole === 'ORDER_PROCESSOR') {
            return {
              success: false,
              error: 'Order Processors are not authorized to process refunds. Please contact an Administrator.',
            };
          }

          // Validate refund amount (Section 5: Never allow refunding more than calculated excess amount)
          const validation = validateRefundAmount(order, refundData.amount);
          if (!validation.valid) {
            return { success: false, error: validation.error };
          }

          const now = new Date().toISOString();
          const refundDate = refundData.refundDate || now;
          const processedBy = refundData.processedBy || 'Admin';
          const refundTxnId = refundData.transactionId?.trim() || `REF-${Date.now().toString().slice(-6)}`;
          const refundMethod = refundData.refundMethod || 'bank_transfer';
          const refundAmount = validation.roundedRefund;

          const newRefund: OrderRefundRecord = {
            id: `rfnd_${Date.now()}`,
            order_id: order.id,
            order_number: order.order_number,
            amount: refundAmount,
            type: 'partial',
            reason: refundData.notes?.trim() || 'Excess payment refund',
            status: 'success',
            provider: refundMethod,
            provider_refund_id: refundTxnId,
            requested_by: processedBy,
            requested_at: refundDate,
            completed_at: refundDate,
          };

          const existingRefunds = Array.isArray(order.refunds) ? [...order.refunds] : [];
          const updatedRefunds = [...existingRefunds, newRefund];
          const newTotalRefunded = roundToTwo(Number(order.refunded_amount || 0) + refundAmount);

          const updatedHistory: OrderStatusHistoryItem[] = [
            ...(order.order_status_history || []),
            {
              status: order.order_status,
              timestamp: now,
              updated_by: processedBy,
              notes: `Refund processed: ₹${refundAmount} via ${refundMethod.toUpperCase()} (Ref: ${refundTxnId}). Reason: ${newRefund.reason}`,
            },
          ];

          // Persist to Supabase and update local state
          const updatedOrder = await get().updateOrderDetails(order.id, {
            refunds: updatedRefunds,
            refunded_amount: newTotalRefunded,
            updated_by: processedBy,
          });

          const finalOrder: DbOrder = {
            ...updatedOrder,
            refunds: updatedRefunds,
            refunded_amount: newTotalRefunded,
            order_status_history: updatedHistory,
          };

          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === order.id || o.order_number === order.order_number ? finalOrder : o
            ),
          }));

          // Audit Logging (Section 15)
          try {
            await logAdminAction(processedBy, processedByRole, 'PROCESS_REFUND', 'ORDER', order.order_number, {
              orderId: order.id,
              refundId: newRefund.id,
              amount: refundAmount,
              refundMethod,
              reference: refundTxnId,
              totalRefunded: newTotalRefunded,
              processedBy,
              processedByRole,
            });
          } catch (auditErr) {
            console.warn('Non-blocking refund audit log notice:', auditErr);
          }

          // Customer Notification (SMS + Email) (Section 8)
          try {
            const storeSettings = useSettingsStore.getState().settings;
            await NotificationService.notifyRefundProcessed({
              order: finalOrder,
              refund: newRefund,
              settings: storeSettings,
            });
          } catch (notifErr) {
            console.warn('Customer refund notification non-blocking issue:', notifErr);
          }

          return { success: true, order: finalOrder, refund: newRefund };
        } catch (err: any) {
          console.error('Error in processExcessRefund:', err);
          return {
            success: false,
            error: err.message || 'Failed to process refund due to an unexpected error',
          };
        }
      },

      // ─── Authoritative Shipping Override Before Dispatch (Requirements 1.4, 1.5, 1.7) ───
      updateOrderShipping: async (
        orderId: string,
        newShippingCharge: number,
        reason: string,
        changedBy: string = 'Admin',
        changedByRole: string = 'Store Owner'
      ) => {
        try {
          const order = get().orders.find((o) => o.id === orderId || o.order_number === orderId);
          if (!order) {
            return { success: false, error: 'Order not found in store or database' };
          }

          // Guard: Only allow shipping override before dispatch
          if (order.order_status === 'shipped' || order.order_status === 'delivered') {
            return {
              success: false,
              error: `Cannot update shipping for an order that is already ${order.order_status.toUpperCase()}. Shipping can only be modified before dispatch.`,
            };
          }

          if (order.order_status === 'cancelled') {
            return {
              success: false,
              error: 'Cannot update shipping for a cancelled order.',
            };
          }

          if (typeof newShippingCharge !== 'number' || isNaN(newShippingCharge) || newShippingCharge < 0) {
            return { success: false, error: 'Shipping charge must be a valid non-negative number.' };
          }

          if (!reason || !reason.trim()) {
            return { success: false, error: 'A reason for changing the shipping charge is mandatory for audit logging.' };
          }

          const roundedNewShipping = roundToTwo(newShippingCharge);
          const previousShipping = roundToTwo(Number(order.delivery_charge || 0));

          // Retain original calculated charge if not already recorded
          const calculatedShipping =
            order.calculated_delivery_charge !== undefined
              ? roundToTwo(order.calculated_delivery_charge)
              : (order.shipping_snapshot?.originalCalculatedCharge !== undefined
                ? roundToTwo(order.shipping_snapshot.originalCalculatedCharge)
                : (order.shipping_snapshot?.shippingCharge !== undefined
                  ? roundToTwo(order.shipping_snapshot.shippingCharge)
                  : previousShipping));

          const now = new Date().toISOString();

          // 1. Recalculate Order Total (Product Total + Final Shipping Charge - Discounts)
          const subtotal = roundToTwo(Number(order.subtotal || 0));
          const discount = roundToTwo(Number(order.discount || 0));
          const newOrderTotal = Math.max(0, roundToTwo(subtotal + roundedNewShipping - discount));

          // 2. Shipping Audit Trail (Requirement 1.7)
          const auditItem: ShippingAuditItem = {
            previousShipping,
            newShipping: roundedNewShipping,
            reason: reason.trim(),
            changedBy,
            changedAt: now,
          };
          const updatedAuditTrail: ShippingAuditItem[] = [
            ...(order.shipping_audit_trail || []),
            auditItem,
          ];

          // 3. Status History Entry
          const historyNotes = `Shipping charge updated from ₹${previousShipping} to ₹${roundedNewShipping} (Original: ₹${calculatedShipping}). Reason: ${reason.trim()} (Changed by: ${changedBy})`;
          const updatedHistory: OrderStatusHistoryItem[] = [
            ...(order.order_status_history || []),
            {
              status: order.order_status,
              timestamp: now,
              updated_by: changedBy,
              notes: historyNotes,
            },
          ];

          // 4. Payment Recalculation (Requirement 1.5)
          const interimOrder: DbOrder = {
            ...order,
            delivery_charge: roundedNewShipping,
            total: newOrderTotal,
            total_amount: newOrderTotal,
            calculated_delivery_charge: calculatedShipping,
            admin_shipping_override: roundedNewShipping,
            shipping_override_reason: reason.trim(),
            shipping_audit_trail: updatedAuditTrail,
          };
          const breakdown = calculateOrderPaymentBreakdown(interimOrder);

          const mappedPaymentStatus: DbOrder['payment_status'] =
            breakdown.paymentStatus === 'FULLY PAID'
              ? 'paid'
              : breakdown.paymentStatus === 'EXCESS AMOUNT'
              ? 'paid'
              : breakdown.paymentStatus === 'PARTIALLY PAID'
              ? 'partially_paid'
              : 'unpaid';

          // 5. Persist to Supabase and update state
          const updatedOrder = await get().updateOrderDetails(order.id, {
            delivery_charge: roundedNewShipping,
            total: newOrderTotal,
            calculated_delivery_charge: calculatedShipping,
            admin_shipping_override: roundedNewShipping,
            shipping_override_reason: reason.trim(),
            shipping_audit_trail: updatedAuditTrail,
            payment_status: mappedPaymentStatus,
            amount_paid: breakdown.totalAmountReceived,
            amount_due: breakdown.balanceAmount,
            updated_by: changedBy,
          });

          const finalOrder: DbOrder = {
            ...updatedOrder,
            delivery_charge: roundedNewShipping,
            total: newOrderTotal,
            total_amount: newOrderTotal,
            calculated_delivery_charge: calculatedShipping,
            admin_shipping_override: roundedNewShipping,
            shipping_override_reason: reason.trim(),
            shipping_audit_trail: updatedAuditTrail,
            payment_status: mappedPaymentStatus,
            amount_paid: breakdown.totalAmountReceived,
            amount_due: breakdown.balanceAmount,
            order_status_history: updatedHistory,
          };

          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === order.id || o.order_number === order.order_number ? finalOrder : o
            ),
          }));

          // 6. Audit Logging (Requirement 1.7)
          try {
            await logAdminAction(changedBy, changedByRole, 'SHIPPING_OVERRIDE', 'ORDER', order.order_number, {
              orderId: order.id,
              previousShipping,
              newShipping: roundedNewShipping,
              calculatedShipping,
              reason: reason.trim(),
              originalTotal: order.total,
              newOrderTotal,
              totalAmountReceived: breakdown.totalAmountReceived,
              balanceAmount: breakdown.balanceAmount,
              excessAmount: breakdown.excessAmount,
              paymentStatus: breakdown.paymentStatus,
            });
          } catch (auditErr) {
            console.warn('Non-blocking shipping override audit log notice:', auditErr);
          }

          return { success: true, order: finalOrder, breakdown };
        } catch (err: any) {
          console.error('Error updating order shipping:', err);
          return {
            success: false,
            error: err.message || 'Failed to update shipping charge',
          };
        }
      },

      // ─── Delete order ──────────────────────────────────────────────
      deleteOrder: async (orderId: string) => {
        const order = get().orders.find(
          (o) => o.id === orderId || o.order_number === orderId
        );
        set((state) => ({
          orders: state.orders.filter(
            (o) => o.id !== orderId && o.order_number !== orderId
          ),
        }));
        if (isSupabaseConfigured() && order) {
          try {
            const { error } = await supabase
              .from('orders')
              .delete()
              .eq('order_number', order.order_number);
            if (error) console.error('Supabase order delete error:', error);
          } catch (err) {
            console.error('Supabase order delete failed:', err);
          }
        }
      },

      // ─── Realtime Orders Subscription ──────────────────────────────
      subscribeToOrders: () => {
        if (!isSupabaseConfigured()) return () => {};
        try {
          const channel = supabase
            .channel('orders_realtime_channel')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'orders' },
              (payload) => {
                if (payload.eventType === 'INSERT') {
                  const newRow = normalizeOrderTracking(payload.new as DbOrder);
                  set((state) => {
                    const exists = state.orders.some((o) => o.order_number === newRow.order_number);
                    if (exists) {
                      return {
                        orders: state.orders.map((o) =>
                          o.order_number === newRow.order_number ? newRow : o
                        ),
                      };
                    }
                    return { orders: [newRow, ...state.orders] };
                  });
                } else if (payload.eventType === 'UPDATE') {
                  const updatedRow = normalizeOrderTracking(payload.new as DbOrder);
                  set((state) => ({
                    orders: state.orders.map((o) =>
                      o.order_number === updatedRow.order_number || o.id === updatedRow.id
                        ? updatedRow
                        : o
                    ),
                  }));
                } else if (payload.eventType === 'DELETE') {
                  const oldRow = payload.old as { id?: string; order_number?: string };
                  set((state) => ({
                    orders: state.orders.filter(
                      (o) =>
                        (!oldRow.id || o.id !== oldRow.id) &&
                        (!oldRow.order_number || o.order_number !== oldRow.order_number)
                    ),
                  }));
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (e) {
          console.warn('Realtime subscription error:', e);
          return () => {};
        }
      },

      // ─── Get order by number ───────────────────────────────────────
      getOrderByNumber: (orderNumber: string) => {
        const clean = orderNumber.trim().toUpperCase();
        return get().orders.find(
          (o) => o.order_number.trim().toUpperCase() === clean
        );
      },

      // ─── Reset to demo data ────────────────────────────────────────
      resetOrders: () => {
        set({ orders: initialOrders });
      },
    }),
    {
      name: 'ssf-orders',
    }
  )
);
