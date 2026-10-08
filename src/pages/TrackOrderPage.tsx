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
  IndianRupee,
  ShieldCheck,
  ChevronUp,
  Printer,
  FileText,
  X,
} from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { translations } from '@/i18n/translations';
import { orderService, supabase, isSupabaseConfigured, normalizeOrderTracking } from '@/services/supabase';
import type { DbOrder } from '@/services/supabase';
import { calculateOrderRefundableMetrics } from '@/services/refundService';
import { calculateOrderPaymentBreakdown } from '@/services/paymentCalculationService';
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
  const { orders, requestOrderCancellation } = useOrderStore();
  const { settings } = useSettingsStore();
  const t = translations[language];

  const [activeOrder, setActiveOrder] = useState<DbOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // Cancellation Request State (Requirements 3, 4, 5)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [customerComment, setCustomerComment] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [showRefundCalculation, setShowRefundCalculation] = useState(false);

  const { register, handleSubmit, setValue } = useForm<TrackForm>();
  const activeOrderNumberRef = useRef<string>('');

  // Handle Customer Cancellation Request Submission (Requirements 3, 4, 5)
  const handleSubmitCancellationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const finalReason =
      cancelReason === 'Other' ? cancelCustomReason.trim() : cancelReason.trim();

    if (!finalReason) {
      toast.error('Please select or specify a cancellation reason');
      return;
    }

    setIsSubmittingCancellation(true);
    try {
      const res = await requestOrderCancellation(
        activeOrder.order_number,
        finalReason,
        customerComment.trim()
      );

      if (res.success && res.order) {
        setActiveOrder(res.order);
        setShowCancelModal(false);
        setCustomerComment('');
        setCancelCustomReason('');
        toast.success(
          'Your cancellation request has been submitted and is awaiting review by our order management team.',
          { duration: 6000 }
        );
      } else {
        toast.error(res.error || 'Failed to submit cancellation request');
      }
    } catch {
      toast.error('Failed to submit cancellation request');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPrintModal(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-white font-bold bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                      title="Print or Save Order as PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Order</span>
                    </button>

                    <button
                      onClick={() => fetchAuthoritativeOrder(activeOrder.order_number, undefined)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 text-xs text-brand-green font-semibold hover:text-brand-green-dark cursor-pointer bg-brand-light-green/60 px-3 py-1.5 rounded-xl"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Refresh Now</span>
                    </button>
                  </div>
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

                {/* ─── CUSTOMER CANCELLATION ACTIONS & STATUS (Requirements 3, 4, 5, 34, 35) ─── */}
                {activeOrder.order_status !== 'cancelled' && (
                  <div className="my-4">
                    {/* State 1: Cancellation Request is Awaiting Approval */}
                    {activeOrder.cancellation_request?.status === 'requested' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2 text-amber-950"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm uppercase tracking-wider text-amber-900">
                                Cancellation Request — Awaiting Approval
                              </h4>
                              <p className="text-xs text-amber-700">
                                Requested on{' '}
                                {activeOrder.cancellation_request.requested_at
                                  ? new Date(activeOrder.cancellation_request.requested_at).toLocaleString()
                                  : 'Recently'}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 border border-amber-400 text-xs font-bold animate-pulse">
                            Under Review
                          </span>
                        </div>
                        <div className="text-xs bg-white/80 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                          <p>
                            <strong>Reason:</strong> {activeOrder.cancellation_request.reason}
                          </p>
                          {activeOrder.cancellation_request.customer_comment && (
                            <p>
                              <strong>Your Comments:</strong> &quot;{activeOrder.cancellation_request.customer_comment}&quot;
                            </p>
                          )}
                          {activeOrder.cancellation_request.estimated_refund_amount !== undefined &&
                            activeOrder.cancellation_request.estimated_refund_amount > 0 && (
                              <p className="font-semibold text-emerald-800">
                                Estimated Refund: ₹{activeOrder.cancellation_request.estimated_refund_amount}
                              </p>
                            )}
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Your cancellation request has been submitted and is awaiting review by our order management team. The order will not be cancelled until the request is approved.
                        </p>
                      </motion.div>
                    ) : activeOrder.cancellation_request?.status === 'rejected' ? (
                      /* State 2: Cancellation Request was Rejected */
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-sky-50 border-2 border-sky-300 rounded-2xl space-y-2 text-sky-950"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm uppercase tracking-wider text-sky-900">
                                Cancellation Request Rejected
                              </h4>
                              <p className="text-xs text-sky-700">
                                Reviewed on{' '}
                                {activeOrder.cancellation_request.reviewed_at
                                  ? new Date(activeOrder.cancellation_request.reviewed_at).toLocaleString()
                                  : 'Recently'}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold">
                            Order Remains Active
                          </span>
                        </div>
                        <div className="text-xs bg-white/80 p-3 rounded-xl border border-sky-200 text-sky-900 space-y-1">
                          <p>
                            <strong>Reason:</strong>{' '}
                            {activeOrder.cancellation_request.rejection_reason ||
                              'Order has already entered dispatch processing'}
                          </p>
                          {activeOrder.cancellation_request.admin_comment && (
                            <p>
                              <strong>Store Team Note:</strong> &quot;{activeOrder.cancellation_request.admin_comment}&quot;
                            </p>
                          )}
                        </div>
                        <p className="text-[11px] text-sky-800">
                          Your order remains active and is proceeding through our kitchen and courier dispatch.
                        </p>
                      </motion.div>
                    ) : ['placed', 'confirmed', 'preparing'].includes(activeOrder.order_status) ? (
                      /* State 3: Order is eligible for customer cancellation request */
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      </div>
                    ) : activeOrder.order_status === 'shipped' ? (
                      <p className="text-[11px] text-gray-400 italic text-right pt-1">
                        Cancellation unavailable: Order has already entered the courier dispatch process.
                      </p>
                    ) : activeOrder.order_status === 'delivered' ? (
                      <p className="text-[11px] text-gray-400 italic text-right pt-1">
                        Cancellation unavailable: Order has been delivered.
                      </p>
                    ) : null}
                  </div>
                )}

                {/* ─── ORDER CANCELLATION BANNER (Requirements 2, 23) ─── */}
                {activeOrder.order_status === 'cancelled' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="my-6 p-5 bg-red-50 border-2 border-red-300 rounded-2xl space-y-3 text-red-950"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center">
                          <Ban className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm uppercase tracking-wider text-red-900">
                            Order Cancelled
                          </h4>
                          <p className="text-xs text-red-700">
                            Cancelled by: <strong>{activeOrder.cancelled_by || 'Store Management'}</strong>
                          </p>
                        </div>
                      </div>
                      {activeOrder.refunded_amount && activeOrder.refunded_amount > 0 ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold font-mono">
                          Refund Processed: ₹{activeOrder.refunded_amount}
                        </span>
                      ) : null}
                    </div>
                    {activeOrder.cancellation_reason && (
                      <p className="text-xs text-red-800 bg-white/70 p-2.5 rounded-xl border border-red-200">
                        <strong>Cancellation Reason:</strong> {activeOrder.cancellation_reason}
                      </p>
                    )}
                    {activeOrder.cancelled_at && (
                      <p className="text-[11px] text-red-600">
                        Date & Time: {new Date(activeOrder.cancelled_at).toLocaleString()}
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

                {/* Financial Reconciliation Summary Breakdown with Authoritative Calculations (Requirements 2, 21) */}
                {(() => {
                  const refundMetrics = calculateOrderRefundableMetrics(activeOrder);
                  const subtotal = activeOrder.subtotal || activeOrder.total;
                  const itemDiscount = activeOrder.item_discount || 0;
                  const couponDiscount = activeOrder.coupon_discount || activeOrder.discount || 0;
                  const totalDiscount = itemDiscount + couponDiscount;
                  const taxableAmount = activeOrder.taxable_amount || Math.max(0, subtotal - totalDiscount);
                  const gstRate = activeOrder.gst_rate || 0;
                  const gstAmount = activeOrder.gst_amount || 0;
                  const shippingAmount = activeOrder.delivery_charge || 0;
                  const amountPaid = activeOrder.amount_paid !== undefined ? activeOrder.amount_paid : refundMetrics.paidAmount;
                  const amountDue = activeOrder.amount_due !== undefined ? activeOrder.amount_due : Math.max(0, activeOrder.total - amountPaid);
                  const totalRefunded = activeOrder.refunded_amount || refundMetrics.alreadyRefunded;
                  const remainingRefundable = Math.max(0, amountPaid - totalRefunded);

                  // Find latest refund for Current Refund display
                  const refunds = Array.isArray(activeOrder.refunds) ? activeOrder.refunds : [];
                  const latestRefund = refunds.length > 0 ? refunds[refunds.length - 1] : null;
                  const previousRefunds = refunds.length > 1
                    ? refunds.slice(0, -1).reduce((s, r) => s + r.amount, 0)
                    : 0;

                  return (
                    <div className="mt-6 pt-4 border-t border-gray-100 space-y-4 text-xs">
                      {/* ─── 1. Authoritative Order Financial Summary (Issues #3, #9, #11) ─── */}
                      <div className="bg-gray-50/90 p-4 rounded-2xl border border-gray-200/90 space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                            <IndianRupee className="w-4 h-4 text-brand-green" />
                            <span>Order Financial Breakdown</span>
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              activeOrder.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : activeOrder.payment_status === 'partially_refunded'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : activeOrder.payment_status === 'refunded'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : activeOrder.payment_status === 'partially_paid'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            Payment: {activeOrder.payment_status.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-gray-700">
                          <div className="flex justify-between items-center">
                            <span>Original Subtotal</span>
                            <span className="font-mono font-medium">₹{subtotal}</span>
                          </div>
                          {itemDiscount > 0 && (
                            <div className="flex justify-between items-center text-emerald-700">
                              <span>Product / Item Discount</span>
                              <span className="font-mono font-bold">-₹{itemDiscount}</span>
                            </div>
                          )}
                          {couponDiscount > 0 && (
                            <div className="flex justify-between items-center text-emerald-700">
                              <span>Coupon Discount {activeOrder.coupon_code ? `(${activeOrder.coupon_code})` : ''}</span>
                              <span className="font-mono font-bold">-₹{couponDiscount}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-gray-500 text-[11px]">
                            <span>Taxable Amount</span>
                            <span className="font-mono">₹{taxableAmount}</span>
                          </div>
                          {gstAmount > 0 && (
                            <div className="flex justify-between items-center text-gray-700">
                              <span>GST ({gstRate}%)</span>
                              <span className="font-mono font-medium">+₹{gstAmount}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-gray-700">
                            <span>Shipping / Delivery</span>
                            <span className="font-mono">
                              {shippingAmount === 0 ? 'FREE' : `₹${shippingAmount}`}
                              {activeOrder.admin_shipping_override !== undefined && (
                                <span className="ml-1 text-[11px] text-amber-700 font-sans font-semibold">
                                  (Adjusted by Admin)
                                </span>
                              )}
                            </span>
                          </div>
                          {activeOrder.shipping_override_reason && (
                            <div className="flex justify-between items-center text-amber-700 text-[11px]">
                              <span>Shipping Adjustment Note:</span>
                              <span className="font-sans italic">{activeOrder.shipping_override_reason}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-sm font-bold text-gray-900">
                            <span>Final Order Amount</span>
                            <span className="font-mono text-brand-green text-base">₹{activeOrder.total}</span>
                          </div>
                        </div>

                        {/* Payment Received vs Due Summary (Section 7 Live Sync) */}
                        {(() => {
                          const pb = calculateOrderPaymentBreakdown(activeOrder);
                          return (
                            <div className="mt-3 pt-3 border-t border-dashed border-gray-300 space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-gray-700">Adjusted Order Total:</span>
                                <span className="font-mono font-bold text-gray-900">
                                  ₹{pb.adjustedOrderTotal.toLocaleString('en-IN')}
                                </span>
                              </div>
                              {pb.cancelledItemsTotal > 0 && (
                                <div className="flex justify-between items-center text-[11px] text-red-600">
                                  <span>Cancelled Items Excluded:</span>
                                  <span className="font-mono font-semibold">
                                    -₹{pb.cancelledItemsTotal.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-emerald-800">Amount Paid:</span>
                                <span className="font-mono font-bold text-emerald-700">
                                  ₹{pb.totalAmountReceived.toLocaleString('en-IN')}
                                </span>
                              </div>
                              {pb.balanceAmount > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-amber-800">Balance Amount:</span>
                                  <span className="font-mono font-bold text-amber-700">
                                    ₹{pb.balanceAmount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}
                              {pb.excessAmount > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-purple-800">Excess Amount:</span>
                                  <span className="font-mono font-bold text-purple-700">
                                    ₹{pb.excessAmount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200">
                                <span className="font-bold text-gray-800">Payment Status:</span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    pb.paymentStatus === 'FULLY PAID'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : pb.paymentStatus === 'PARTIALLY PAID'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : pb.paymentStatus === 'EXCESS AMOUNT'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {pb.paymentStatus}
                                </span>
                              </div>
                              {pb.excessAmount > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-gray-800">Refund Status:</span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      pb.refundStatus === 'REFUNDED'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                                    }`}
                                  >
                                    {pb.refundStatus}{' '}
                                    {pb.totalRefundedAmount > 0
                                      ? `(₹${pb.totalRefundedAmount})`
                                      : `(₹${pb.excessAmount})`}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* ─── 2. Dedicated Authoritative Refund Summary (Issues #1, #4) ─── */}
                      {(totalRefunded > 0 || refunds.length > 0 || activeOrder.payment_status === 'partially_refunded' || activeOrder.payment_status === 'refunded') && (
                        <div className="bg-amber-50/70 p-4 rounded-2xl border-2 border-amber-200 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                            <div className="flex items-center gap-1.5">
                              <RotateCcw className="w-4 h-4 text-amber-700" />
                              <h4 className="font-extrabold text-amber-950 text-sm uppercase tracking-wider">
                                Refund Summary
                              </h4>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                latestRefund?.status === 'success' || totalRefunded >= activeOrder.total
                                  ? 'bg-emerald-600 text-white'
                                  : latestRefund?.status === 'processing'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-amber-500 text-black font-bold'
                              }`}
                            >
                              Status: {latestRefund?.status ? latestRefund.status.toUpperCase() : totalRefunded > 0 ? 'REFUNDED' : 'PROCESSING'}
                            </span>
                          </div>

                          <div className="space-y-1.5 font-mono text-xs text-amber-950">
                            <div className="flex justify-between">
                              <span className="font-sans">Original Order Amount:</span>
                              <span className="font-bold">₹{activeOrder.total}</span>
                            </div>
                            <div className="flex justify-between text-emerald-800">
                              <span className="font-sans">Amount Paid:</span>
                              <span className="font-bold">₹{amountPaid}</span>
                            </div>
                            {previousRefunds > 0 && (
                              <div className="flex justify-between text-amber-800">
                                <span className="font-sans">Previously Refunded:</span>
                                <span>₹{previousRefunds}</span>
                              </div>
                            )}
                            {latestRefund && (
                              <div className="flex justify-between text-amber-900 font-bold">
                                <span className="font-sans">Current Refund:</span>
                                <span>₹{latestRefund.amount}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-brand-green font-bold text-sm pt-1 border-t border-amber-200">
                              <span className="font-sans">Total Refunded:</span>
                              <span>₹{totalRefunded}</span>
                            </div>
                            <div className="flex justify-between text-gray-700">
                              <span className="font-sans">Remaining Refundable:</span>
                              <span>₹{remainingRefundable}</span>
                            </div>
                          </div>

                          {/* Refund Metadata & Item Details */}
                          {latestRefund && (
                            <div className="mt-2 pt-2 border-t border-amber-200/80 text-[11px] space-y-1 text-amber-900">
                              <p>
                                <strong>Refund ID:</strong> <span className="font-mono">{latestRefund.provider_refund_id || latestRefund.id}</span>
                              </p>
                              <p>
                                <strong>Refund Date:</strong> {new Date(latestRefund.requested_at).toLocaleString()}
                              </p>
                              <p>
                                <strong>Refund Reason:</strong> {latestRefund.reason}
                              </p>
                            </div>
                          )}

                          {/* Cancelled Items Breakdown if any */}
                          {activeOrder.items.some(it => it.status === 'removed' || it.status === 'cancelled') && (
                            <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-amber-200 text-[11px]">
                              <p className="font-bold text-red-700 mb-1">Cancelled Item(s) in this Refund:</p>
                              <div className="space-y-1">
                                {activeOrder.items
                                  .filter(it => it.status === 'removed' || it.status === 'cancelled')
                                  .map((it, idx) => (
                                    <div key={idx} className="flex justify-between text-gray-700">
                                      <span>• {it.product_name_en} ({it.weight}) × {it.cancelled_quantity || it.quantity}</span>
                                      <span className="font-mono font-bold text-red-600">₹{it.refund_amount || it.total_price}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─── 3. Expandable Detailed Refund Calculation Breakdown Accordion (Requirement 4) ─── */}
                      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => setShowRefundCalculation(!showRefundCalculation)}
                          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-brand-green" />
                            <span>Detailed Financial & Refund Traceability Ledger</span>
                          </span>
                          <ChevronUp
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              showRefundCalculation ? '' : 'rotate-180'
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {showRefundCalculation && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50 space-y-1.5 text-xs font-mono text-gray-700"
                            >
                              <div className="flex justify-between">
                                <span>Original Product Amount</span>
                                <span>₹{subtotal}</span>
                              </div>
                              {itemDiscount > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>- Product Discount</span>
                                  <span>-₹{itemDiscount}</span>
                                </div>
                              )}
                              {couponDiscount > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>- Coupon Discount</span>
                                  <span>-₹{couponDiscount}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-gray-600">
                                <span>+ GST ({gstRate}%)</span>
                                <span>+₹{gstAmount}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span>+ Shipping Charges</span>
                                <span>{shippingAmount === 0 ? '₹0' : `+₹${shippingAmount}`}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-gray-300 font-bold text-gray-900">
                                <span>= Total Amount Paid</span>
                                <span>₹{amountPaid}</span>
                              </div>
                              {previousRefunds > 0 && (
                                <div className="flex justify-between text-amber-700 pt-1">
                                  <span>- Previous Refund</span>
                                  <span>-₹{previousRefunds}</span>
                                </div>
                              )}
                              {latestRefund && (
                                <div className="flex justify-between text-amber-800 font-bold">
                                  <span>- Current Refund</span>
                                  <span>-₹{latestRefund.amount}</span>
                                </div>
                              )}
                              <div className="flex justify-between pt-1 border-t border-gray-300 font-bold text-brand-green text-sm">
                                <span>= Total Refunded</span>
                                <span>₹{totalRefunded}</span>
                              </div>
                              <div className="flex justify-between pt-1 text-gray-800 font-bold">
                                <span>= Remaining Refundable</span>
                                <span>₹{remainingRefundable}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-sans pt-2 leading-relaxed">
                                Traceable authoritative calculation derived from server-side order snapshot and banking reconciliation.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })()}
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

      {/* ─── MODAL: CUSTOMER CANCELLATION REQUEST DIALOG (Requirements 3, 4) ─── */}
      <AnimatePresence>
        {showCancelModal && activeOrder && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 text-gray-900 shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      Cancel Order #{activeOrder.order_number}
                    </h3>
                    <p className="text-xs text-gray-500">Submit Cancellation Request</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitCancellationRequest} className="space-y-4">
                <p className="text-xs text-gray-600">
                  Are you sure you want to request cancellation of this order?
                </p>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Cancellation Reason *
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs focus:outline-none focus:border-brand-green cursor-pointer"
                  >
                    <option value="Changed my mind">Changed my mind</option>
                    <option value="Ordered by mistake">Ordered by mistake</option>
                    <option value="Delivery taking too long">Delivery taking too long</option>
                    <option value="Product no longer required">Product no longer required</option>
                    <option value="Found a better price">Found a better price</option>
                    <option value="Payment issue">Payment issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {cancelReason === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Specify Reason *
                    </label>
                    <input
                      type="text"
                      required
                      value={cancelCustomReason}
                      onChange={(e) => setCancelCustomReason(e.target.value)}
                      placeholder="Please specify why you are cancelling..."
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs focus:outline-none focus:border-brand-green"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerComment}
                    onChange={(e) => setCustomerComment(e.target.value)}
                    placeholder="Optional note for our order management team..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs focus:outline-none focus:border-brand-green resize-none"
                  />
                </div>

                {(() => {
                  const metrics = calculateOrderRefundableMetrics(activeOrder);
                  return (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                      <div className="flex justify-between items-center text-emerald-900">
                        <span className="font-semibold">Estimated Refund:</span>
                        <span className="font-mono font-bold text-sm text-brand-green">
                          ₹{metrics.paidAmount > 0 ? metrics.remainingRefundableAmount : 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        {metrics.paidAmount > 0
                          ? 'Refund will be credited back to your original payment method upon approval.'
                          : 'Order was unpaid / COD, no refund charge will occur.'}
                      </p>
                    </div>
                  );
                })()}

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                  <strong>Note:</strong> Your cancellation request will be reviewed by our order management team. The order will not be cancelled until the request is approved.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCancellation}
                    className="flex-1 py-3 bg-brand-red hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isSubmittingCancellation ? 'Submitting...' : 'Submit Cancellation Request'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ─── SECTION 9: CUSTOMER PRINTABLE ORDER INVOICE MODAL ─────── */}
        {showPrintModal && activeOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
            >
              {/* Header Action Bar (Hidden in Print) */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 print:hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-emerald-700" />
                  <span>Order Invoice & Receipt</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Header */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-emerald-900 flex items-center gap-2">
                      <span>🌿</span>
                      <span>{settings.businessName || 'Sudha Swagruha Foods'}</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                      {settings.businessAddress || 'Governorpet, Vijayawada, Andhra Pradesh - 520002'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Contact: +91 {settings.businessPhone || '9876543210'} • Email: info@sudhaswagruhafoods.com
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase">
                      Invoice
                    </span>
                    <p className="text-lg font-black font-mono text-gray-900 mt-2">
                      #{activeOrder.order_number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activeOrder.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order & Customer Information */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-500 mb-1 text-[11px]">
                    Customer Details
                  </h4>
                  <p className="font-bold text-gray-900">{activeOrder.customer_name}</p>
                  <p className="text-gray-600">Mobile: +91 {activeOrder.customer_mobile || activeOrder.customer_phone || '—'}</p>
                  {activeOrder.customer_email && (
                    <p className="text-gray-600">Email: {activeOrder.customer_email}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-500 mb-1 text-[11px]">
                    Delivery Address
                  </h4>
                  <p className="text-gray-800 leading-relaxed">
                    {activeOrder.delivery_address?.house_no && `${activeOrder.delivery_address.house_no}, `}
                    {activeOrder.delivery_address?.street && `${activeOrder.delivery_address.street}, `}
                    {activeOrder.delivery_address?.area && `${activeOrder.delivery_address.area}, `}
                    {activeOrder.delivery_address?.city || 'Vijayawada'},{' '}
                    {activeOrder.delivery_address?.state || 'Andhra Pradesh'} -{' '}
                    {activeOrder.delivery_address?.pincode || '520002'}
                  </p>
                  <p className="text-gray-600 mt-1 font-semibold">
                    Status: <span className="uppercase text-emerald-700">{activeOrder.order_status}</span>
                  </p>
                </div>
              </div>

              {/* Item Details Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Item Details
                </h4>
                <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Weight</th>
                      <th className="p-2.5 text-center">Quantity</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(activeOrder.items || []).map((it, idx) => {
                      const isCancelled = it.status === 'cancelled' || it.status === 'removed';
                      return (
                        <tr key={idx} className={isCancelled ? 'bg-red-50/60 line-through text-gray-400' : ''}>
                          <td className="p-2.5 font-medium text-gray-900">
                            {it.product_name_en} {isCancelled && '(Cancelled)'}
                          </td>
                          <td className="p-2.5 text-gray-600">{it.weight}</td>
                          <td className="p-2.5 text-center font-bold text-gray-800">{it.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-gray-600">
                            ₹{Number(it.unit_price).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                            ₹{(Number(it.unit_price) * Number(it.quantity)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Section 9 Payment Summary */}
              {(() => {
                const b = calculateOrderPaymentBreakdown(activeOrder);
                return (
                  <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] pb-1 border-b border-emerald-200">
                      Payment Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-gray-700">
                      <div className="flex justify-between">
                        <span>Original Order Total:</span>
                        <span className="font-mono font-bold text-gray-900">
                          ₹{b.originalOrderTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          ₹{b.totalAmountReceived.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cancelled Items:</span>
                        <span className="font-mono font-bold text-red-600">
                          -₹{b.cancelledItemsTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance Amount:</span>
                        <span className="font-mono font-bold text-amber-700">
                          ₹{b.balanceAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-emerald-200 pt-1 text-gray-900">
                        <span>Adjusted Order Total:</span>
                        <span className="font-mono text-emerald-900">
                          ₹{b.adjustedOrderTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-200 pt-1">
                        <span>Excess Amount:</span>
                        <span className="font-mono font-bold text-purple-700">
                          ₹{b.excessAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Payment Status:</span>
                        <span className="uppercase text-emerald-800">{b.paymentStatus}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Refund Status:</span>
                        <span className="uppercase text-cyan-800">{b.refundStatus}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Document Footer */}
              <div className="text-center pt-3 border-t border-gray-200 text-xs text-gray-500">
                <p className="font-semibold text-gray-700">Sudha Swagruha Foods • Authentic Home Delicacies</p>
                <p className="text-[11px] mt-0.5">Thank you for ordering with us!</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
