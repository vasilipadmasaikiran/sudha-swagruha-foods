// ============================================================
// Order Tracking Page
// ============================================================
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Search, Package, CheckCircle, Truck, Home, ChefHat, ShoppingCart as CartIcon } from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';
import { orderService } from '@/services/supabase';
import type { DbOrder } from '@/services/supabase';

interface TrackForm {
  orderNumber: string;
  mobile: string;
}

const ORDER_STATUSES = [
  { key: 'placed', icon: CartIcon, label: 'Order Placed', labelTe: 'ఆర్డర్ చేయబడింది', emoji: '🛒' },
  { key: 'confirmed', icon: CheckCircle, label: 'Confirmed', labelTe: 'నిర్ధారించబడింది', emoji: '✅' },
  { key: 'preparing', icon: ChefHat, label: 'Preparing', labelTe: 'తయారు చేస్తోంది', emoji: '👩‍🍳' },
  { key: 'packed', icon: Package, label: 'Packed', labelTe: 'ప్యాక్ చేయబడింది', emoji: '📦' },
  { key: 'shipped', icon: Truck, label: 'Shipped', labelTe: 'పంపబడింది', emoji: '🚚' },
  { key: 'delivered', icon: Home, label: 'Delivered', labelTe: 'డెలివరీ అయింది', emoji: '🏠' },
] as const;

const STATUS_INDEX: Record<string, number> = {
  placed: 0,
  confirmed: 1,
  preparing: 2,
  packed: 3,
  shipped: 4,
  delivered: 5,
};

// Demo order for testing
const DEMO_ORDER: DbOrder = {
  id: 'demo-1',
  order_number: 'SSF-20260926-DEMO',
  customer_id: null,
  items: [
    {
      product_id: '1',
      product_name_en: 'Andhra Avakaya',
      product_name_te: 'ఆంధ్ర అవకాయ',
      weight: '500g',
      quantity: 2,
      unit_price: 320,
      total_price: 640,
      sku: 'SSF-AVK-500',
    },
  ],
  subtotal: 640,
  delivery_charge: 0,
  discount: 0,
  total: 640,
  payment_status: 'paid',
  payment_id: 'pay_demo',
  razorpay_order_id: 'order_demo',
  order_status: 'preparing',
  delivery_address: {
    house_no: '5-6-789',
    street: 'MG Road',
    area: 'Banjara Hills',
    city: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
  },
  customer_name: 'Demo Customer',
  customer_mobile: '9999999999',
  customer_whatsapp: '9999999999',
  customer_email: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function TrackOrderPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [order, setOrder] = useState<DbOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<TrackForm>();

  const onTrack = async (data: TrackForm) => {
    setLoading(true);
    setError('');
    setOrder(null);

    // Demo shortcut
    if (
      data.orderNumber.toUpperCase() === 'SSF-20260926-DEMO' &&
      data.mobile === '9999999999'
    ) {
      setTimeout(() => {
        setOrder(DEMO_ORDER);
        setLoading(false);
      }, 800);
      return;
    }

    try {
      const result = await orderService.getByOrderNumberAndMobile(
        data.orderNumber.toUpperCase(),
        data.mobile
      );
      setOrder(result);
    } catch {
      setError(t.tracking.notFound);
    } finally {
      setLoading(false);
    }
  };

  const currentStatusIdx = order ? (STATUS_INDEX[order.order_status] ?? 0) : -1;

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      <div className="bg-brand-green py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-4xl font-bold text-white mb-2"
          >
            {t.tracking.title}
          </motion.h1>
          <p className="text-green-200">Enter your order details to track status</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-card p-6 mb-8"
        >
          <form onSubmit={handleSubmit(onTrack)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t.tracking.orderNumber}
              </label>
              <input
                {...register('orderNumber', { required: true })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green uppercase transition-all"
                placeholder="SSF-20260926-00125"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t.tracking.mobileNumber}
              </label>
              <input
                {...register('mobile', { required: true })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green transition-all"
                placeholder="8374634989"
                type="tel"
                maxLength={10}
              />
            </div>

            <p className="text-xs text-gray-400">
              💡 Demo: Order# <code className="bg-gray-100 px-1 rounded">SSF-20260926-DEMO</code>, Mobile: <code className="bg-gray-100 px-1 rounded">9999999999</code>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              {t.tracking.track}
            </button>
          </form>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-brand-red text-sm text-center"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        {/* Order Status */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Order Info Card */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-bold text-brand-green text-xl font-mono">{order.order_number}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    order.payment_status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {order.payment_status === 'paid' ? '✅ PAID' : 'PENDING'}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-semibold">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-bold text-brand-green text-lg">₹{order.total}</p>
                </div>
                <div>
                  <p className="text-gray-500">Delivery To</p>
                  <p className="font-semibold">
                    {order.delivery_address.city}, {order.delivery_address.state}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">PIN</p>
                  <p className="font-semibold">{order.delivery_address.pincode}</p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="font-bold text-gray-900 mb-6">Order Status</h3>
              <div className="relative">
                {ORDER_STATUSES.map((status, idx) => {
                  const isCompleted = idx <= currentStatusIdx;
                  const isCurrent = idx === currentStatusIdx;
                  return (
                    <div key={status.key} className="flex gap-4 mb-4 last:mb-0">
                      {/* Icon & Line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition-all ${
                            isCompleted
                              ? isCurrent
                                ? 'bg-brand-green text-white shadow-green-glow scale-110'
                                : 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {isCurrent ? (
                            <motion.span
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              {status.emoji}
                            </motion.span>
                          ) : (
                            status.emoji
                          )}
                        </div>
                        {idx < ORDER_STATUSES.length - 1 && (
                          <div
                            className={`w-0.5 h-8 mt-1 rounded-full transition-all ${
                              idx < currentStatusIdx ? 'bg-brand-green' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>

                      {/* Label */}
                      <div className="pt-2">
                        <p
                          className={`font-semibold text-sm ${
                            isCurrent ? 'text-brand-green' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        >
                          {language === 'te' ? status.labelTe : status.label}
                          {isCurrent && (
                            <span className="ml-2 text-xs bg-brand-green text-white px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="font-bold text-gray-900 mb-4">Items Ordered</h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{language === 'te' ? item.product_name_te : item.product_name_en}</p>
                      <p className="text-sm text-gray-500">{item.weight} × {item.quantity}</p>
                    </div>
                    <p className="font-bold text-brand-green">₹{item.total_price}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
