// ============================================================
// Order Store with Zustand & LocalStorage Persistence
// + Supabase two-way sync (fetch + insert + update + realtime)
// Supports Tracking ID, Carrier details, and Order Status History (Req 2, 11, 12, 17)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DbOrder, OrderStatusHistoryItem } from '@/services/supabase';
import { supabase, isSupabaseConfigured, normalizeOrderTracking } from '@/services/supabase';

export interface OrderUpdatePayload {
  order_status?: DbOrder['order_status'];
  tracking_id?: string;
  courier_name?: string;
  tracking_url?: string;
  notes?: string;
  updated_by?: string;
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

        if (isSupabaseConfigured()) {
          try {
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
              notes: normalized.notes || null,
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

        // Encode metadata seamlessly into notes so that tracking and history are 100% saved in Supabase
        // even before or after the dedicated columns are created in PostgreSQL
        const cleanUserNotes = (newNotes || '').replace(/\[SSF_TRACKING:[\s\S]*?\]/g, '').trim();
        const trackingMetadata = {
          tracking_id: newTrackingId,
          courier_name: newCourier,
          tracking_url: newTrackingUrl,
          dispatched_at: newStatus === 'shipped' ? (existing.dispatched_at || now) : existing.dispatched_at,
          history: existingHistory,
        };
        const encodedNotes = `${cleanUserNotes ? cleanUserNotes + ' ' : ''}[SSF_TRACKING:${JSON.stringify(trackingMetadata)}]`;

        const updatedOrder: DbOrder = normalizeOrderTracking({
          ...existing,
          order_status: newStatus,
          tracking_id: newTrackingId,
          courier_name: newCourier,
          tracking_url: newTrackingUrl,
          dispatched_at: trackingMetadata.dispatched_at || null,
          notes: cleanUserNotes,
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
              notes: encodedNotes,
              updated_at: now,
              tracking_id: newTrackingId,
              courier_name: newCourier,
              tracking_url: newTrackingUrl,
            };

            const { error: fullError } = await supabase
              .from('orders')
              .update(fullPayload)
              .eq('order_number', existing.order_number);

            if (fullError) {
              // If column does not exist yet (pre-migration), fallback safely to standard columns + encoded notes
              console.warn('Dedicated tracking columns not yet in DB schema cache; updating via standard schema fallback:', fullError.message);
              const fallbackPayload: Record<string, unknown> = {
                order_status: newStatus,
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
