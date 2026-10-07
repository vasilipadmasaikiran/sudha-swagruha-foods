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
  tables: {
    orders: boolean;
    products: boolean;
    coupons: boolean;
    store_settings: boolean;
  };
}> => {
  try {
    const [ordersRes, productsRes, couponsRes, settingsRes] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('coupons').select('*', { count: 'exact', head: true }),
      supabase.from('store_settings').select('*', { count: 'exact', head: true }),
    ]);

    const tables = {
      orders: !ordersRes.error,
      products: !productsRes.error,
      coupons: !couponsRes.error,
      store_settings: !settingsRes.error,
    };

    const hasCore = tables.orders && tables.products;

    return {
      success: hasCore,
      message: hasCore
        ? 'Connected to Supabase cloud database'
        : ordersRes.error?.message || 'Failed to connect to core tables',
      orderCount: ordersRes.count ?? 0,
      tables,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Database connection error',
      tables: { orders: false, products: false, coupons: false, store_settings: false },
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

export interface OrderStatusHistoryItem {
  status: DbOrder['order_status'];
  timestamp: string;
  updated_by?: string;
  notes?: string;
  tracking_id?: string;
  courier_name?: string;
  tracking_url?: string;
}

export type NotificationEvent =
  | 'ORDER_CONFIRMED'
  | 'ORDER_DISPATCHED'
  | 'TRACKING_UPDATED'
  | 'ORDER_ITEM_REMOVED'
  | 'PARTIAL_REFUND_INITIATED'
  | 'FULL_ORDER_CANCELLED'
  | 'FULL_REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'REFUND_FAILED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLATION_REJECTED';

export interface NotificationLogItem {
  id: string;
  order_id: string;
  order_number: string;
  customer_id?: string | null;
  channel: 'email' | 'sms';
  event: NotificationEvent;
  recipient: string;
  status: 'pending' | 'sent' | 'failed';
  provider: string;
  provider_message_id?: string | null;
  error?: string | null;
  created_at: string;
  sent_at?: string | null;
}

export interface OrderRefundRecord {
  id: string; // e.g. "rfnd_1791234567"
  order_id: string;
  order_number: string;
  payment_id?: string | null;
  amount: number;
  type: 'full' | 'partial';
  reason: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  provider: string; // 'razorpay' | 'manual'
  provider_refund_id?: string | null;
  item_id?: string | null;
  requested_by: string;
  requested_at: string;
  completed_at?: string | null;
  failure_reason?: string | null;
}

export type CancellationRequestStatus = 'none' | 'requested' | 'approved' | 'rejected';

export interface CustomerCancellationRequest {
  status: CancellationRequestStatus;
  reason: string;
  customer_comment?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reviewer_role?: string | null;
  rejection_reason?: string | null;
  admin_comment?: string | null;
  estimated_refund_amount?: number;
  approved_refund_amount?: number;
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
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  payment_id: string | null;
  razorpay_order_id: string | null;
  order_status: 'placed' | 'confirmed' | 'preparing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  delivery_address: DeliveryAddress;
  customer_name: string;
  customer_mobile: string;
  customer_whatsapp: string;
  customer_email: string | null;
  notes: string | null;
  // Compatibility & denormalized access
  total_amount?: number;
  customer_phone?: string;
  city?: string;
  pincode?: string;
  state?: string;
  // Tracking & Timeline Extensions
  tracking_id?: string | null;
  courier_name?: string | null;
  tracking_url?: string | null;
  dispatched_at?: string | null;
  order_status_history?: OrderStatusHistoryItem[];
  // Cancellation & Refund Extensions
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_request?: CustomerCancellationRequest | null;
  refunded_amount?: number;
  refunds?: OrderRefundRecord[];
  created_at: string;
  updated_at: string;
}

/**
 * Extracts tracking details and history, handling both dedicated DB columns
 * and encoded notes fallback for seamless backward compatibility.
 */
export function normalizeOrderTracking(rawOrder: DbOrder): DbOrder {
  if (!rawOrder) return rawOrder;
  const order = { ...rawOrder };

  let extractedTrackingId = order.tracking_id || '';
  let extractedCourier = order.courier_name || '';
  let extractedUrl = order.tracking_url || '';
  let extractedDispatchedAt = order.dispatched_at || '';
  let extractedCancellationReason = order.cancellation_reason || '';
  let extractedCancelledAt = order.cancelled_at || '';
  let extractedRefundedAmount = order.refunded_amount || 0;
  let extractedCancellationRequest: CustomerCancellationRequest | null = order.cancellation_request || null;
  let extractedRefunds: OrderRefundRecord[] = Array.isArray(order.refunds) ? [...order.refunds] : [];
  let extractedHistory: OrderStatusHistoryItem[] = Array.isArray(order.order_status_history)
    ? [...order.order_status_history]
    : [];

  // Check for metadata encoded in notes: [SSF_TRACKING:{...}]
  if (order.notes && order.notes.includes('[SSF_TRACKING:')) {
    try {
      const match = order.notes.match(/\[SSF_TRACKING:([\s\S]*?)\]/);
      if (match && match[1]) {
        const meta = JSON.parse(match[1]);
        if (meta.tracking_id && !extractedTrackingId) extractedTrackingId = meta.tracking_id;
        if (meta.courier_name && !extractedCourier) extractedCourier = meta.courier_name;
        if (meta.tracking_url && !extractedUrl) extractedUrl = meta.tracking_url;
        if (meta.dispatched_at && !extractedDispatchedAt) extractedDispatchedAt = meta.dispatched_at;
        if (meta.cancellation_reason && !extractedCancellationReason) extractedCancellationReason = meta.cancellation_reason;
        if (meta.cancelled_at && !extractedCancelledAt) extractedCancelledAt = meta.cancelled_at;
        if (meta.cancellation_request && !extractedCancellationRequest) extractedCancellationRequest = meta.cancellation_request;
        if (meta.refunded_amount && !extractedRefundedAmount) extractedRefundedAmount = meta.refunded_amount;
        if (Array.isArray(meta.refunds) && extractedRefunds.length === 0) extractedRefunds = meta.refunds;
        if (Array.isArray(meta.history) && extractedHistory.length === 0) {
          extractedHistory = meta.history;
        }
      }
    } catch (e) {
      console.warn('Could not parse encoded tracking from notes', e);
    }
  }

  // Ensure initial placed status is at least in history if history is empty
  if (extractedHistory.length === 0) {
    extractedHistory = [
      {
        status: 'placed',
        timestamp: order.created_at || new Date().toISOString(),
        notes: 'Order placed by customer',
      },
    ];
    if (order.order_status !== 'placed') {
      extractedHistory.push({
        status: order.order_status,
        timestamp: order.updated_at || new Date().toISOString(),
        tracking_id: extractedTrackingId || undefined,
        courier_name: extractedCourier || undefined,
      });
    }
  }

  // Auto-generate standard tracking URL if courier is specified
  if (extractedTrackingId && !extractedUrl) {
    const trk = extractedTrackingId.trim();
    if (extractedCourier.toLowerCase().includes('delhivery')) {
      extractedUrl = `https://www.delhivery.com/track/package/${trk}`;
    } else if (extractedCourier.toLowerCase().includes('dtdc')) {
      extractedUrl = `https://www.dtdc.in/tracking.asp?strCnno=${trk}`;
    } else if (extractedCourier.toLowerCase().includes('bluedart')) {
      extractedUrl = `https://www.bluedart.com/tracking?numbers=${trk}`;
    } else if (extractedCourier.toLowerCase().includes('indiapost') || extractedCourier.toLowerCase().includes('speed post')) {
      extractedUrl = `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`;
    }
  }

  return {
    ...order,
    tracking_id: extractedTrackingId || null,
    courier_name: extractedCourier || null,
    tracking_url: extractedUrl || null,
    dispatched_at: extractedDispatchedAt || (order.order_status === 'shipped' ? order.updated_at : null),
    cancellation_reason: extractedCancellationReason || null,
    cancelled_at: extractedCancelledAt || null,
    cancellation_request: extractedCancellationRequest || null,
    refunded_amount: extractedRefundedAmount,
    refunds: extractedRefunds,
    order_status_history: extractedHistory,
  };
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
  // Item Removal & Partial Cancellation Extensions
  status?: 'active' | 'removed' | 'cancelled';
  removal_reason?: string | null;
  removed_by?: string | null;
  removed_at?: string | null;
  refundable_amount?: number;
  refund_amount?: number;
  refund_id?: string | null;
  customization?: string | null;
  cancelled_quantity?: number;
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
// REQUIREMENT 2: Supabase database is ONE authoritative source of truth.
export const orderService = {
  async getByOrderNumberAndMobile(orderNumber: string, mobile?: string): Promise<DbOrder> {
    const cleanNum = orderNumber.trim().toUpperCase();
    const cleanMob = mobile?.trim();

    // 1. PRIMARY SOURCE OF TRUTH: Query Supabase cloud database directly
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('orders').select('*').ilike('order_number', cleanNum);
        if (cleanMob && cleanMob.length > 0) {
          query = query.eq('customer_mobile', cleanMob);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          const normalized = normalizeOrderTracking(data as DbOrder);

          // Update local storage store so local cache reflects the latest cloud truth
          try {
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem('ssf-orders');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed?.state?.orders)) {
                  const existingIdx = parsed.state.orders.findIndex(
                    (o: DbOrder) => o.order_number.trim().toUpperCase() === cleanNum
                  );
                  if (existingIdx >= 0) {
                    parsed.state.orders[existingIdx] = normalized;
                  } else {
                    parsed.state.orders.unshift(normalized);
                  }
                  localStorage.setItem('ssf-orders', JSON.stringify(parsed));
                }
              }
            }
          } catch (storageErr) {
            console.warn('Local cache sync notice:', storageErr);
          }

          return normalized;
        }
      } catch (dbErr) {
        console.warn('Supabase order lookup failed, trying local fallback:', dbErr);
      }
    }

    // 2. FALLBACK ONLY: Check local storage order store if database unreachable
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
              return normalizeOrderTracking(match);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Local order storage lookup error:', e);
    }

    throw new Error('Order not found');
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
