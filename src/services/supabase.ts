// ============================================================
// Supabase Client
// ============================================================
import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://yhakphwljyjpfnsmkjnz.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloYWtwaHdsanlqcGZuc21ram56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzMyNjgsImV4cCI6MjEwNjc0OTI2OH0.155ZpYG_wF8am28wdL41Dj0tiAxeqaEn0P2XmEJBqQ0';

const getEnvOrStored = (key: string, storedKey: string, fallback: string): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storedKey);
    if (stored && stored.trim()) return stored.trim();
  }
  const envVal = import.meta.env[key] as string | undefined;
  if (envVal && !envVal.includes('placeholder') && !envVal.includes('your-project-id')) {
    return envVal.trim();
  }
  return fallback;
};

export const getSupabaseConfig = () => {
  const url = getEnvOrStored('VITE_SUPABASE_URL', 'ssf_supabase_url', DEFAULT_SUPABASE_URL);
  const anonKey = getEnvOrStored('VITE_SUPABASE_ANON_KEY', 'ssf_supabase_anon_key', DEFAULT_SUPABASE_ANON_KEY);
  const isConfigured = Boolean(
    url &&
    !url.includes('placeholder') &&
    !url.includes('your-project-id') &&
    anonKey &&
    !anonKey.includes('placeholder')
  );
  return { url, anonKey, isConfigured };
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

const currentConfig = getSupabaseConfig();

export const supabase = createClient(
  currentConfig.url,
  currentConfig.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  orderCount?: number;
}> => {
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    if (error) {
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: 'Connected to Supabase cloud database',
      orderCount: count ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Database connection error',
    };
  }
};

// ─── Database Types ───────────────────────────────────────────
export interface DbProduct {
  id: string;
  name_en: string;
  name_te: string;
  slug: string;
  description_en: string;
  description_te: string;
  category: string;
  images: string[];
  ingredients_en: string;
  ingredients_te: string;
  price: number;
  compare_price: number | null;
  stock: number;
  weight: string;
  sku: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id: string | null;
  razorpay_order_id: string | null;
  order_status: 'placed' | 'confirmed' | 'preparing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  delivery_address: DeliveryAddress;
  customer_name: string;
  customer_mobile: string;
  customer_whatsapp: string;
  customer_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name_en: string;
  product_name_te: string;
  weight: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku: string;
}

export interface DeliveryAddress {
  house_no: string;
  street: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface DbReview {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review: string;
  image_url: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

// ─── Product Service ──────────────────────────────────────────
export const productService = {
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbProduct[];
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    if (error) throw error;
    return data as DbProduct;
  },

  async getByCategory(category: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbProduct[];
  },
};

// ─── Order Service ────────────────────────────────────────────
export const orderService = {
  async getByOrderNumberAndMobile(orderNumber: string, mobile?: string) {
    const cleanNum = orderNumber.trim().toUpperCase();
    const cleanMob = mobile?.trim();

    // 1. Check local storage order store first (instant response for customer placed orders)
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ssf-orders');
        if (stored) {
          const parsed = JSON.parse(stored);
          const orders = parsed?.state?.orders as DbOrder[];
          if (Array.isArray(orders)) {
            const match = orders.find(
              (o) => o.order_number.trim().toUpperCase() === cleanNum
            );
            if (match) {
              return match;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Local order storage lookup error:', e);
    }

    // 2. Query Supabase
    let query = supabase.from('orders').select('*').eq('order_number', cleanNum);
    if (cleanMob && cleanMob.length > 0) {
      query = query.eq('customer_mobile', cleanMob);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      throw new Error('Order not found');
    }
    return data as DbOrder;
  },

  async getByCustomer(customerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbOrder[];
  },
};

// ─── Review Service ───────────────────────────────────────────
export const reviewService = {
  async getByProduct(productId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbReview[];
  },

  async submit(review: Omit<DbReview, 'id' | 'is_verified_purchase' | 'created_at'>) {
    const { data, error } = await supabase
      .from('reviews')
      .insert([review])
      .select()
      .single();
    if (error) throw error;
    return data as DbReview;
  },
};
