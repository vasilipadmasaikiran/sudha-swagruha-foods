// ============================================================
// Order Store with Zustand & LocalStorage Persistence
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DbOrder } from '@/services/supabase';
import { supabase } from '@/services/supabase';

interface OrderStore {
  orders: DbOrder[];
  addOrder: (order: DbOrder) => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    status: DbOrder['order_status'],
    notes?: string
  ) => Promise<void>;
  deleteOrder: (orderId: string) => void;
  getOrderByNumber: (orderNumber: string) => DbOrder | undefined;
  resetOrders: () => void;
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

      addOrder: async (newOrder: DbOrder) => {
        // Prepend to local state
        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        // Try syncing to Supabase if connected
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
            await supabase.from('orders').insert([newOrder]);
          }
        } catch (err) {
          console.warn('Supabase order insert skipped:', err);
        }
      },

      updateOrderStatus: async (
        orderId: string,
        status: DbOrder['order_status'],
        notes?: string
      ) => {
        const now = new Date().toISOString();
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
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
            await supabase
              .from('orders')
              .update({ order_status: status, updated_at: now })
              .or(`id.eq.${orderId},order_number.eq.${orderId}`);
          }
        } catch (err) {
          console.warn('Supabase status update skipped:', err);
        }
      },

      deleteOrder: (orderId: string) => {
        set((state) => ({
          orders: state.orders.filter(
            (o) => o.id !== orderId && o.order_number !== orderId
          ),
        }));
      },

      getOrderByNumber: (orderNumber: string) => {
        const clean = orderNumber.trim().toUpperCase();
        return get().orders.find(
          (o) => o.order_number.trim().toUpperCase() === clean
        );
      },

      resetOrders: () => {
        set({ orders: initialOrders });
      },
    }),
    {
      name: 'ssf-orders',
    }
  )
);
