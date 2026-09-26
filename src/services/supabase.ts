// ============================================================
// Supabase Client
// ============================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase environment variables not set. Using demo mode with local data.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

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
  async getByOrderNumberAndMobile(orderNumber: string, mobile: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .eq('customer_mobile', mobile)
      .single();
    if (error) throw error;
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
