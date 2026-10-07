// ============================================================
// Order Tracking Page - Realtime Synchronization & Timeline History
// Implements Requirements 2, 3, 11, 12, 17
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  CheckCircle2,
  Truck,
  Home,
  ChefHat,
  ShoppingCart as CartIcon,
  RefreshCw,
  Phone,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Radio,
  MapPin,
  Calendar,
  RotateCcw,
  Ban,
  MinusCircle,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { translations } from '@/i18n/translations';
import { orderService, supabase, isSupabaseConfigured, normalizeOrderTracking } from '@/services/supabase';
import type { DbOrder } from '@/services/supabase';
import toast from 'react-hot-toast';

interface TrackForm {
  orderNumber: string;
  mobile?: string;
}

const ORDER_STATUSES = [
  { key: 'placed', icon: CartIcon, label: 'Order Placed', labelTe: 'ఆర్డర్ చేయబడింది', emoji: '🛒' },
  { key: 'confirmed', icon: CheckCircle2, label: 'Order Confirmed', labelTe: 'నిర్ధారించబడింది', emoji: '✅' },
  { key: 'preparing', icon: ChefHat, label: 'Preparing Delicacies', labelTe: 'తయారు చేస్తోంది', emoji: '👩‍🍳' },
  { key: 'packed', icon: Package, label: 'Packed & Inspected', labelTe: 'ప్యాక్ చేయబడింది', emoji: '📦' },
  { key: 'shipped', icon: Truck, label: 'Dispatched / In Transit', labelTe: 'పంపబడింది / రవాణాలో ఉంది', emoji: '🚚' },
  { key: 'delivered', icon: Home, label: 'Delivered', labelTe: 'డెలివరీ అయింది', emoji: '🏠' },
] as const;

const STATUS_INDEX: Record<string, number> = {
  placed: 0,
  confirmed: 1,
  preparing: 2,
  packed: 3,
  shipped: 4,
  delivered: 5,
  cancelled: -1,
};

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const { orders } = useOrderStore();
  const { settings } = useSettingsStore();
  const t = translations[language];

  const [activeOrder, setActiveOrder] = useState<DbOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  const { register, handleSubmit, setValue } = useForm<TrackForm>();
  const activeOrderNumberRef = useRef<string>('');

  // Fetch live order directly from authoritative Supabase cloud database
  const fetchAuthoritativeOrder = useCallback(async (orderNumber: string, mobile?: string, silent = false) => {
    const cleanNum = orderNumber.trim().toUpperCase();
    if (!cleanNum) return;

    if (!silent) setLoading(true);
    setError('');

    try {
      const order = await orderService.getByOrderNumberAndMobile(cleanNum, mobile);
      setActiveOrder(order);
      activeOrderNumberRef.current = order.order_number;
      setLastRefreshedAt(new Date());
    } catch {
      if (!silent) {
        setError(t.tracking.notFound);
        setActiveOrder(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t.tracking.notFound]);

  // Read URL query parameter e.g. /track-order?order=SSF-20261005-1234
  useEffect(() => {
    const orderFromQuery = searchParams.get('order');
    if (orderFromQuery) {
      const clean = orderFromQuery.trim().toUpperCase();
      setValue('orderNumber', clean);
      fetchAuthoritativeOrder(clean);
    }
  }, [searchParams, setValue, fetchAuthoritativeOrder]);

  // ─── Realtime Synchronization (Requirement 3) ──────────────────────
  // Listens directly for Postgres UPDATE on this specific order record
  useEffect(() => {
    if (!activeOrder?.order_number || !isSupabaseConfigured()) return;

    const currentOrderNum = activeOrder.order_number;
    const channelName = `realtime_order_${currentOrderNum.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `order_number=eq.${currentOrderNum}`,
          },
          (payload) => {
            if (payload.new) {
              const updated = normalizeOrderTracking(payload.new as DbOrder);
              setActiveOrder(updated);
              setLastRefreshedAt(new Date());
              toast.success(`Order update received! Status: ${updated.order_status.toUpperCase()}`, {
                icon: '🔔',
                duration: 5000,
              });
            }
          }
        )
        .subscribe((status) => {
          setIsLiveConnected(status === 'SUBSCRIBED');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime channel subscription error:', err);
      setIsLiveConnected(false);
    }
  }, [activeOrder?.order_number]);

  // ─── Safe Fallback Polling Mechanism (Requirement 3) ───────────────
  // Automatically polls every 8 seconds if an order is currently tracked
  useEffect(() => {
    if (!activeOrder?.order_number) return;

    const interval = setInterval(() => {
      if (activeOrderNumberRef.current) {
        fetchAuthoritativeOrder(activeOrderNumberRef.current, undefined, true);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [activeOrder?.order_number, fetchAuthoritativeOrder]);

  const onTrack = (data: TrackForm) => {
    fetchAuthoritativeOrder(data.orderNumber, data.mobile);
  };

  const handleCopyTracking = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedTracking(true);
    toast.success('Tracking ID copied to clipboard!');
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const currentStatusIdx = activeOrder
    ? STATUS_INDEX[activeOrder.order_status] ?? 0
    : -1;

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      {/* Header Banner */}
      <div className="bg-brand-green py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-3.5 py-1 rounded-full text-xs font-semibold mb-3 border border-white/20"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>Live Order Tracking System</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-4xl font-bold text-white mb-2"
          >
            {t.tracking.title}
          </motion.h1>
          <p className="text-green-100 text-sm max-w-lg mx-auto">
            Live updates directly synchronized with our kitchen & logistics.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Search Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-card p-6 md:p-8 mb-8 border border-gray-100"
        >
          <form onSubmit={handleSubmit(onTrack)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                {t.tracking.orderNumber} *
              </label>
              <div className="relative">
                <input
                  {...register('orderNumber', { required: true })}
                  className="w-full pl-4 pr-10 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 uppercase font-mono tracking-wider text-sm transition-all text-gray-900 font-semibold"
                  placeholder="e.g. SSF-20261006-6578"
                />
                <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  {t.tracking.mobileNumber}
                </label>
                <span className="text-[11px] text-gray-400">(Optional for direct lookup)</span>
              </div>
              <input
                {...register('mobile')}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-green text-sm transition-all text-gray-800"
                placeholder="10-digit mobile number"
                type="tel"
                maxLength={10}
              />
            </div>

            {/* Quick Sample Order Pills */}
            {orders.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] text-gray-400 mb-2 font-medium">Quick Select Sample Orders:</p>
                <div className="flex flex-wrap gap-2">
                  {orders.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setValue('orderNumber', o.order_number);
                        if (o.customer_mobile) setValue('mobile', o.customer_mobile);
                        fetchAuthoritativeOrder(o.order_number, o.customer_mobile);
                      }}
                      className="text-xs bg-brand-light-green/80 text-brand-green border border-brand-green/30 px-3 py-1.5 rounded-xl font-mono hover:bg-brand-green hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{o.order_number}</span>
                      <span className="text-[10px] uppercase font-bold opacity-75">({o.order_status})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all shadow-green-glow disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>{loading ? 'Fetching Live Status...' : t.tracking.track}</span>
            </button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-brand-red text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Need help? Contact WhatsApp support at{' '}
                  <a
                    href={`https://wa.me/91${settings.businessWhatsApp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-brand-green"
                  >
                    +91 {settings.businessWhatsApp}
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ─── AUTHORITATIVE LIVE ORDER DETAILS (Requirements 2, 3, 11, 12) ─── */}
        <AnimatePresence>
          {activeOrder && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Order Header & Status Card */}
              <div className="bg-white rounded-3xl shadow-card p-6 md:p-8 border border-gray-100 relative overflow-hidden">
                {/* Live Pulse Indicator Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isLiveConnected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                      <span>{isLiveConnected ? 'Live Synchronized' : 'Polling Sync'}</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Updated {lastRefreshedAt.toLocaleTimeString()}
                    </span>
                  </div>

                  <button
                    onClick={() => fetchAuthoritativeOrder(activeOrder.order_number, undefined)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-green font-semibold hover:text-brand-green-dark cursor-pointer bg-brand-light-green/60 px-3 py-1 rounded-xl"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh Now</span>
                  </button>
                </div>

                {/* Order ID & Status Header */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                      Authoritative Order ID
                    </p>
                    <p className="font-mono text-2xl md:text-3xl font-extrabold text-brand-green tracking-tight">
                      {activeOrder.order_number}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Placed on {new Date(activeOrder.created_at).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider ${
                        activeOrder.order_status === 'delivered'
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-md'
                          : activeOrder.order_status === 'shipped'
                          ? 'bg-purple-600 text-white shadow-purple-600/20 shadow-md'
                          : activeOrder.order_status === 'cancelled'
                          ? 'bg-red-500 text-white shadow-red-500/20 shadow-md'
                          : 'bg-amber-500 text-white shadow-amber-500/20 shadow-md'
                      }`}
                    >
                      Status: {activeOrder.order_status.toUpperCase()}
                    </span>
                    <p className="text-xs font-bold text-gray-700 mt-1.5">
                      Total: ₹{activeOrder.total} ({activeOrder.payment_status === 'paid' ? 'Paid' : activeOrder.payment_status === 'partially_refunded' ? 'Partially Refunded' : activeOrder.payment_status === 'refunded' ? 'Refunded' : 'Pending / COD'})
                    </p>
                  </div>
                </div>

                {/* ─── ORDER CANCELLATION BANNER ─── */}
                {activeOrder.order_status === 'cancelled' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="my-6 p-5 bg-red-50 border-2 border-red-300 rounded-2xl space-y-2 text-red-950"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center">
                          <Ban className="w-4 h-4" />
                        </div>
                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-red-900">
                          This Order Has Been Cancelled
                        </h4>
                      </div>
                      {activeOrder.refunded_amount && activeOrder.refunded_amount > 0 ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold font-mono">
                          Refund Processed: ₹{activeOrder.refunded_amount}
                        </span>
                      ) : null}
                    </div>
                    {activeOrder.cancellation_reason && (
                      <p className="text-xs text-red-800 bg-white/70 p-2.5 rounded-xl border border-red-200">
                        <strong>Reason:</strong> {activeOrder.cancellation_reason}
                      </p>
                    )}
                    {activeOrder.cancelled_at && (
                      <p className="text-[11px] text-red-600">
                        Cancelled on: {new Date(activeOrder.cancelled_at).toLocaleString()}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* ─── REQUIREMENT 11: DISPATCH & TRACKING ID HIGHLIGHT BOX ─── */}
                {(activeOrder.order_status === 'shipped' || activeOrder.tracking_id) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="my-6 p-5 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-blue-50 border-2 border-purple-200/80 rounded-2xl shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-purple-900 tracking-wider">
                            Package Dispatched / Tracking Details
                          </p>
                          <p className="text-xs text-purple-700">
                            Carrier:{' '}
                            <strong className="text-purple-950 font-bold">
                              {activeOrder.courier_name || 'Standard Courier'}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {activeOrder.dispatched_at && (
                        <div className="text-right">
                          <p className="text-[11px] text-purple-600">Dispatched On</p>
                          <p className="text-xs font-semibold text-purple-900">
                            {new Date(activeOrder.dispatched_at).toLocaleDateString()} •{' '}
                            {new Date(activeOrder.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {activeOrder.tracking_id ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-purple-200 font-mono text-sm font-bold text-purple-950 shadow-inner">
                          <span>Tracking ID: {activeOrder.tracking_id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyTracking(activeOrder.tracking_id!)}
                            className="p-1 hover:bg-purple-100 rounded text-purple-700 transition-colors cursor-pointer"
                            title="Copy Tracking ID"
                          >
                            {copiedTracking ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>

                        {activeOrder.tracking_url && (
                          <a
                            href={activeOrder.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                          >
                            <span>Track on Courier Site</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-purple-700 italic">
                        Tracking ID will be assigned shortly by the dispatch team.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Customer Delivery Details */}
                <div className="grid sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-gray-400 font-medium">Customer Recipient</p>
                    <p className="font-bold text-gray-800 text-sm">{activeOrder.customer_name}</p>
                    <p className="text-gray-600 font-mono">📞 {activeOrder.customer_mobile}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Delivery Destination</p>
                    <p className="font-semibold text-gray-800">
                      {activeOrder.delivery_address.house_no}, {activeOrder.delivery_address.street}
                    </p>
                    <p className="text-gray-600">
                      {activeOrder.delivery_address.city}, {activeOrder.delivery_address.state} -{' '}
                      <strong>{activeOrder.delivery_address.pincode}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* ─── REALTIME TIMELINE & STATUS HISTORY ─── */}
              <div className="bg-white rounded-3xl shadow-card p-6 md:p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Order Progress Timeline</h3>
                    <p className="text-xs text-gray-400">
                      Driven by actual order milestones & status history
                    </p>
                  </div>
                  <span className="text-xs bg-brand-light-green text-brand-green font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Stage {Math.min(currentStatusIdx + 1, 6)} of 6
                  </span>
                </div>

                <div className="relative pl-2">
                  {ORDER_STATUSES.map((status, idx) => {
                    const isCompleted = idx <= currentStatusIdx;
                    const isCurrent = idx === currentStatusIdx;
                    const isUpcoming = idx > currentStatusIdx;

                    // Match history record for this milestone if available
                    const historyRecord = activeOrder.order_status_history?.find(
                      (h) => h.status === status.key
                    );

                    return (
                      <div key={status.key} className="flex gap-4 mb-6 last:mb-0 relative group">
                        {/* Connecting Vertical Line */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${
                              isCompleted
                                ? isCurrent
                                ? 'bg-brand-green text-white shadow-green-glow scale-110 ring-4 ring-brand-green/20'
                                : 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
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
                              className={`w-0.5 h-12 mt-2 rounded-full transition-all duration-500 ${
                                idx < currentStatusIdx ? 'bg-brand-green' : 'bg-gray-200'
                              }`}
                            />
                          )}
                        </div>

                        {/* Milestone Content */}
                        <div className="pt-1.5 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p
                              className={`font-bold text-sm ${
                                isCurrent
                                  ? 'text-brand-green text-base'
                                  : isCompleted
                                  ? 'text-gray-900'
                                  : 'text-gray-400'
                              }`}
                            >
                              {language === 'te' ? status.labelTe : status.label}
                            </p>
                            {isCurrent && (
                              <span className="text-[11px] bg-brand-green text-white font-extrabold px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                Current Stage
                              </span>
                            )}
                          </div>

                          {/* Historical Timestamp & Details */}
                          {historyRecord?.timestamp ? (
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{new Date(historyRecord.timestamp).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{new Date(historyRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {historyRecord.updated_by && (
                                <span className="text-gray-400 text-[11px]">({historyRecord.updated_by})</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {isUpcoming ? 'Awaiting milestone' : 'Completed'}
                            </p>
                          )}

                          {/* Tracking ID in Shipped Step */}
                          {status.key === 'shipped' && isCompleted && activeOrder.tracking_id && (
                            <div className="mt-2 inline-flex items-center gap-2 bg-purple-50 text-purple-900 px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-mono font-bold">
                              <span>Tracking ID: {activeOrder.tracking_id}</span>
                              <span className="text-purple-600 font-sans">({activeOrder.courier_name || 'Courier'})</span>
                            </div>
                          )}

                          {historyRecord?.notes && (
                            <p className="text-xs text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 mt-1.5 inline-block">
                              📝 {historyRecord.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items Card with Removed Item Visual Indicators */}
              <div className="bg-white rounded-3xl shadow-card p-6 md:p-8 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 text-base">Items in this Consignment</h3>
                <div className="space-y-3">
                  {activeOrder.items.map((item, i) => {
                    const isRemoved = item.status === 'removed';
                    return (
                      <div
                        key={i}
                        className={`flex justify-between items-center py-3 border-b border-gray-100 last:border-0 ${
                          isRemoved ? 'bg-red-50/60 p-3 rounded-2xl border border-red-200/60' : ''
                        }`}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm ${isRemoved ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                              {language === 'te' ? item.product_name_te : item.product_name_en}
                            </p>
                            {isRemoved && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                REMOVED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Net Weight: {item.weight} • Qty: {item.quantity} (₹{item.unit_price} each)
                          </p>
                          {isRemoved && (
                            <p className="text-xs text-red-700 mt-1">
                              <strong>Reason:</strong> {item.removal_reason || 'Product unavailable'} {item.refund_amount ? `• (Refund: ₹${item.refund_amount})` : ''}
                            </p>
                          )}
                        </div>
                        <p className={`font-bold text-base ${isRemoved ? 'line-through text-gray-400' : 'text-brand-green'}`}>
                          ₹{item.total_price}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Financial Reconciliation Summary Breakdown */}
                <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Original Order Total</span>
                    <span className="font-semibold text-gray-900 font-mono text-sm">₹{activeOrder.total}</span>
                  </div>

                  {activeOrder.refunded_amount && activeOrder.refunded_amount > 0 ? (
                    <>
                      <div className="flex justify-between items-center text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        <span className="flex items-center gap-1.5 font-bold">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Refund Initiated to Customer Account</span>
                        </span>
                        <span className="font-bold font-mono text-sm text-amber-900">-₹{activeOrder.refunded_amount}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-900 font-bold text-sm pt-1">
                        <span>Remaining Net Order Value</span>
                        <span className="font-mono text-brand-green text-lg">
                          ₹{Math.max(0, activeOrder.total - (activeOrder.refunded_amount || 0))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="text-gray-500 font-medium">Order Grand Total</span>
                      <span className="text-xl font-extrabold text-brand-green">₹{activeOrder.total}</span>
                    </div>
                  )}

                  {/* Payment & Refund Status Indicator */}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-gray-400">Payment Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      activeOrder.payment_status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : activeOrder.payment_status === 'partially_refunded'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : activeOrder.payment_status === 'refunded'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {activeOrder.payment_status === 'partially_refunded'
                        ? 'Partially Refunded'
                        : activeOrder.payment_status === 'refunded'
                        ? 'Fully Refunded'
                        : activeOrder.payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Support Callout */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 rounded-3xl p-6 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-emerald-950 text-sm">Have a query regarding this delivery?</p>
                  <p className="text-xs text-emerald-800 mt-1">
                    Contact our store team directly on WhatsApp with Order ID{' '}
                    <strong className="font-mono">{activeOrder.order_number}</strong>
                  </p>
                </div>
                <a
                  href={`https://wa.me/91${settings.businessWhatsApp}?text=${encodeURIComponent(
                    `నమస్కారం! 🙏 నా ఆర్డర్ నంబర్: *${activeOrder.order_number}* స్టేటస్ గురించి వివరాలు కావాలి.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-2xl font-bold text-xs hover:bg-green-600 transition-all shadow-md flex-shrink-0 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
