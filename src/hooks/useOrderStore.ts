// ============================================================
// Order Store with Zustand & LocalStorage Persistence
// + Supabase two-way sync (fetch + insert + update + realtime)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DbOrder } from '@/services/supabase';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

interface OrderStore {
  orders: DbOrder[];
  isSyncing: boolean;
  addOrder: (order: DbOrder) => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    status: DbOrder['order_status'],
    notes?: string
  ) => Promise<void>;
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
    order_status: 'placed',
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
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: initialOrders,
      isSyncing: false,

      // ─── Fetch all orders from Supabase (for Admin page) ──────────
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
            if (data.length > 0) {
              // Supabase orders take priority; keep any local-only (non-demo) orders
              const supabaseOrderNumbers = new Set((data as DbOrder[]).map((o) => o.order_number));
              const localOnly = get().orders.filter(
                (o) =>
                  !supabaseOrderNumbers.has(o.order_number) &&
                  !o.id.startsWith('order-10') // exclude demo seed orders
              );
              set({ orders: [...(data as DbOrder[]), ...localOnly] });
            } else {
              // Table is empty in DB; keep non-demo local orders
              const nonDemo = get().orders.filter((o) => !o.id.startsWith('order-10'));
              if (nonDemo.length > 0) {
                set({ orders: nonDemo });
              }
            }
            return { success: true, count: data.length };
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
        // Immediately add to local state for instant UX
        set((state) => ({
          orders: [newOrder, ...state.orders.filter((o) => o.order_number !== newOrder.order_number)],
        }));

        // Sync to Supabase cloud database
        if (isSupabaseConfigured()) {
          try {
            // Clean payload for Postgres schema
            const orderPayload = {
              order_number: newOrder.order_number,
              customer_id: newOrder.customer_id || null,
              items: newOrder.items,
              subtotal: Number(newOrder.subtotal),
              delivery_charge: Number(newOrder.delivery_charge || 0),
              discount: Number(newOrder.discount || 0),
              total: Number(newOrder.total),
              payment_status: newOrder.payment_status,
              payment_id: newOrder.payment_id || null,
              razorpay_order_id: newOrder.razorpay_order_id || null,
              order_status: newOrder.order_status,
              delivery_address: newOrder.delivery_address,
              customer_name: newOrder.customer_name,
              customer_mobile: newOrder.customer_mobile,
              customer_whatsapp: newOrder.customer_whatsapp,
              customer_email: newOrder.customer_email || null,
              notes: newOrder.notes || null,
              created_at: newOrder.created_at || new Date().toISOString(),
              updated_at: newOrder.updated_at || new Date().toISOString(),
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

            // Replace local order with the DB-returned record (has real UUID)
            if (data) {
              set((state) => ({
                orders: state.orders.map((o) =>
                  o.order_number === newOrder.order_number ? (data as DbOrder) : o
                ),
              }));
              console.log('Order successfully inserted into Supabase DB:', newOrder.order_number);
            }
          } catch (err) {
            console.error('Supabase order insert failed (order saved locally):', err);
          }
        } else {
          console.warn('Supabase is not configured; order saved to local storage only.');
        }
      },

      // ─── Update order status ───────────────────────────────────────
      updateOrderStatus: async (
        orderId: string,
        status: DbOrder['order_status'],
        notes?: string
      ) => {
        const now = new Date().toISOString();
        // Update local state first
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId || o.order_number === orderId
              ? {
                  ...o,
                  order_status: status,
                  updated_at: now,
                  ...(notes !== undefined ? { notes } : {}),
                }
              : o
          ),
        }));

        // Sync to Supabase
        if (isSupabaseConfigured()) {
          try {
            const order = get().orders.find(
              (o) => o.id === orderId || o.order_number === orderId
            );
            if (order) {
              const updatePayload: Record<string, unknown> = {
                order_status: status,
                updated_at: now,
              };
              if (notes !== undefined) updatePayload.notes = notes;

              const { error } = await supabase
                .from('orders')
                .update(updatePayload)
                .eq('order_number', order.order_number);
              if (error) {
                console.error('Supabase status update error:', error);
                throw error;
              }
            }
          } catch (err) {
            console.error('Supabase status update failed (updated locally):', err);
            throw err;
          }
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
                  const newRow = payload.new as DbOrder;
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
                  const updatedRow = payload.new as DbOrder;
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
