// ============================================================
// Order Store with Zustand & LocalStorage Persistence
// + Supabase two-way sync (fetch + insert + update)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DbOrder } from '@/services/supabase';
import { supabase } from '@/services/supabase';

interface OrderStore {
  orders: DbOrder[];
  isSyncing: boolean;
  addOrder: (order: DbOrder) => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    status: DbOrder['order_status'],
    notes?: string
  ) => Promise<void>;
  deleteOrder: (orderId: string) => void;
  getOrderByNumber: (orderNumber: string) => DbOrder | undefined;
  resetOrders: () => void;
  fetchOrdersFromSupabase: () => Promise<void>;
}

// Check if Supabase is actually configured (not placeholder)
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return url && !url.includes('placeholder');
};

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
        if (!isSupabaseConfigured()) return;
        set({ isSyncing: true });
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data && data.length > 0) {
            // Supabase orders take priority; keep any local-only (non-demo) orders
            const supabaseOrderNumbers = new Set((data as DbOrder[]).map((o) => o.order_number));
            const localOnly = get().orders.filter(
              (o) =>
                !supabaseOrderNumbers.has(o.order_number) &&
                !o.id.startsWith('order-10') // exclude demo seed orders
            );
            set({ orders: [...(data as DbOrder[]), ...localOnly] });
          }
        } catch (err) {
          console.warn('Supabase orders fetch failed:', err);
        } finally {
          set({ isSyncing: false });
        }
      },

      // ─── Add new order ─────────────────────────────────────────────
      addOrder: async (newOrder: DbOrder) => {
        // Immediately add to local state
        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        // Sync to Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            // Omit local `id` — DB will generate a real UUID
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _localId, ...orderPayload } = newOrder;
            const { data, error } = await supabase
              .from('orders')
              .insert([orderPayload])
              .select()
              .single();
            if (error) throw error;
            // Replace local order with the DB-returned record (has real UUID)
            if (data) {
              set((state) => ({
                orders: state.orders.map((o) =>
                  o.order_number === newOrder.order_number ? (data as DbOrder) : o
                ),
              }));
            }
          } catch (err) {
            console.warn('Supabase order insert failed (order saved locally):', err);
          }
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
              if (error) throw error;
            }
          } catch (err) {
            console.warn('Supabase status update failed (updated locally):', err);
          }
        }
      },

      // ─── Delete order ──────────────────────────────────────────────
      deleteOrder: (orderId: string) => {
        const order = get().orders.find(
          (o) => o.id === orderId || o.order_number === orderId
        );
        set((state) => ({
          orders: state.orders.filter(
            (o) => o.id !== orderId && o.order_number !== orderId
          ),
        }));
        if (isSupabaseConfigured() && order) {
          supabase
            .from('orders')
            .delete()
            .eq('order_number', order.order_number)
            .then(({ error }) => {
              if (error) console.warn('Supabase order delete failed:', error);
            });
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
