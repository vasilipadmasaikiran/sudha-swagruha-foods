// ============================================================
// Order Tracking Page
// ============================================================
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Search,
  Package,
  CheckCircle,
  Truck,
  Home,
  ChefHat,
  ShoppingCart as CartIcon,
  RefreshCw,
  Phone,
  Clock,
} from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { translations } from '@/i18n/translations';
import { orderService } from '@/services/supabase';
import type { DbOrder } from '@/services/supabase';

interface TrackForm {
  orderNumber: string;
  mobile?: string;
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

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const { orders } = useOrderStore();
  const { settings } = useSettingsStore();
  const t = translations[language];

  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue } = useForm<TrackForm>();

  // Check URL query param e.g. /track-order?order=SSF-20261005-1234
  useEffect(() => {
    const orderFromQuery = searchParams.get('order');
    if (orderFromQuery) {
      setValue('orderNumber', orderFromQuery);
      handleTrackOrder(orderFromQuery);
    }
  }, [searchParams, setValue]);

  const handleTrackOrder = async (orderNumber: string, mobile?: string) => {
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError('');

    const cleanNum = orderNumber.trim().toUpperCase();
    const cleanMob = mobile?.trim();

    try {
      // 1. First look in live zustand orders
      const local = orders.find(
        (o) => o.order_number.trim().toUpperCase() === cleanNum
      );
      if (local) {
        setTrackedOrderNumber(local.order_number);
        setLoading(false);
        return;
      }

      // 2. Query service
      const result = await orderService.getByOrderNumberAndMobile(cleanNum, cleanMob);
      if (result) {
        setTrackedOrderNumber(result.order_number);
      } else {
        setError(t.tracking.notFound);
      }
    } catch {
      setError(t.tracking.notFound);
    } finally {
      setLoading(false);
    }
  };

  const onTrack = (data: TrackForm) => {
    handleTrackOrder(data.orderNumber, data.mobile);
  };

  // Find live order from zustand store so changes in Admin console update automatically!
  const currentOrder = orders.find(
    (o) => o.order_number.trim().toUpperCase() === trackedOrderNumber.trim().toUpperCase()
  );

  const currentStatusIdx = currentOrder
    ? STATUS_INDEX[currentOrder.order_status] ?? 0
    : -1;

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
          <p className="text-green-200">
            Enter your order ID to track the real-time status of your homemade delicacies
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-card p-6 mb-8 border border-gray-100"
        >
          <form onSubmit={handleSubmit(onTrack)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t.tracking.orderNumber} *
              </label>
              <input
                {...register('orderNumber', { required: true })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green uppercase font-mono tracking-wider transition-all"
                placeholder="e.g. SSF-20261005-00101"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex justify-between">
                <span>{t.tracking.mobileNumber}</span>
                <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('mobile')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green transition-all"
                placeholder="10-digit mobile number"
                type="tel"
                maxLength={10}
              />
            </div>

            {/* Quick Chips for Existing Orders */}
            {orders.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-gray-400 mb-2 font-medium">Recent Sample Orders:</p>
                <div className="flex flex-wrap gap-2">
                  {orders.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setValue('orderNumber', o.order_number);
                        if (o.customer_mobile) setValue('mobile', o.customer_mobile);
                        handleTrackOrder(o.order_number, o.customer_mobile);
                      }}
                      className="text-xs bg-brand-light-green text-brand-green border border-brand-green/30 px-2.5 py-1 rounded-lg font-mono hover:bg-brand-green hover:text-white transition-colors"
                    >
                      {o.order_number} ({o.order_status})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors shadow-green-glow disabled:opacity-60 cursor-pointer"
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-brand-red text-sm text-center"
            >
              <p className="font-semibold">{error}</p>
              <p className="text-xs text-gray-600 mt-1">
                Please verify your Order Number or contact WhatsApp support at{' '}
                <a
                  href={`https://wa.me/91${settings.businessWhatsApp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-brand-green"
                >
                  +91 {settings.businessWhatsApp}
                </a>
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Live Order Status Display */}
        {currentOrder && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Order Info Card */}
            <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Order Number
                  </p>
                  <p className="font-bold text-brand-green text-2xl font-mono">
                    {currentOrder.order_number}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Placed on {new Date(currentOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      currentOrder.order_status === 'delivered'
                        ? 'bg-green-100 text-green-700'
                        : currentOrder.order_status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Status: {currentOrder.order_status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm pt-4 border-t border-gray-100">
                <div>
                  <p className="text-gray-500 text-xs">Customer Name</p>
                  <p className="font-semibold text-gray-800">{currentOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Amount</p>
                  <p className="font-bold text-brand-green text-lg">₹{currentOrder.total}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Delivery To</p>
                  <p className="font-medium text-gray-700">
                    {currentOrder.delivery_address.city}, {currentOrder.delivery_address.state}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">PIN Code</p>
                  <p className="font-medium text-gray-700">{currentOrder.delivery_address.pincode}</p>
                </div>
              </div>

              {currentOrder.notes && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-xl text-xs text-yellow-800 border border-yellow-200">
                  <span className="font-semibold">Order Notes:</span> {currentOrder.notes}
                </div>
              )}
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Order Progress</h3>
                <span className="text-xs bg-brand-light-green text-brand-green font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Live Updates
                </span>
              </div>

              <div className="relative">
                {ORDER_STATUSES.map((status, idx) => {
                  const isCompleted = idx <= currentStatusIdx;
                  const isCurrent = idx === currentStatusIdx;
                  return (
                    <div key={status.key} className="flex gap-4 mb-4 last:mb-0">
                      {/* Icon & Line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition-all ${
                            isCompleted
                              ? isCurrent
                                ? 'bg-brand-green text-white shadow-green-glow scale-110 ring-4 ring-brand-green/20'
                                : 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {isCurrent ? (
                            <motion.span
                              animate={{ scale: [1, 1.25, 1] }}
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
                            className={`w-0.5 h-10 mt-1 rounded-full transition-all ${
                              idx < currentStatusIdx ? 'bg-brand-green' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>

                      {/* Label */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-semibold text-sm ${
                              isCurrent
                                ? 'text-brand-green text-base'
                                : isCompleted
                                ? 'text-gray-800'
                                : 'text-gray-400'
                            }`}
                          >
                            {language === 'te' ? status.labelTe : status.label}
                          </p>
                          {isCurrent && (
                            <span className="text-xs bg-brand-green text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                              Current Status
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isCompleted
                            ? isCurrent
                              ? 'Your order is currently at this stage'
                              : 'Completed'
                            : 'Upcoming stage'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 text-base">Items in this Order</h3>
              <div className="space-y-3">
                {currentOrder.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {language === 'te' ? item.product_name_te : item.product_name_en}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        Weight: {item.weight} • Qty: {item.quantity} (₹{item.unit_price} each)
                      </p>
                    </div>
                    <p className="font-bold text-brand-green text-base">₹{item.total_price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Help / WhatsApp Contact */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-bold text-emerald-950 text-sm">Need help with your order?</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Contact our support team anytime on WhatsApp with your Order ID
                </p>
              </div>
              <a
                href={`https://wa.me/91${settings.businessWhatsApp}?text=${encodeURIComponent(
                  `నమస్కారం! 🙏 నా ఆర్డర్ నంబర్: *${currentOrder.order_number}* గురించి విచారణ చేయాలనుకుంటున్నాను.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-green-600 transition-colors shadow-sm flex-shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
