// ============================================================
// Admin Console - Orders Management Tab
// Enterprise Order Fulfillment, Cancellation, Item-Level Customisation Cancellation,
// and Financial Refunds Tracking & Ledger
// ============================================================
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  CheckCircle,
  Truck,
  Package,
  Home,
  ChefHat,
  X,
  MessageCircle,
  Clock,
  Eye,
  Trash2,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Send,
  Ban,
  RotateCcw,
  DollarSign,
  MinusCircle,
  AlertTriangle,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { EmailService } from '@/services/emailService';
import { logAdminAction } from '@/services/auditLogger';
import { calculateOrderRefundableMetrics, roundToTwoDecimals } from '@/services/refundService';
import type { DbOrder, OrderItem, OrderRefundRecord } from '@/services/supabase';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<
  DbOrder['order_status'],
  { label: string; bg: string; text: string; icon: any }
> = {
  placed: { label: 'Placed', bg: 'bg-blue-500/20', text: 'text-blue-400', icon: ShoppingBag },
  confirmed: { label: 'Confirmed', bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: CheckCircle },
  preparing: { label: 'Preparing', bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: ChefHat },
  packed: { label: 'Packed', bg: 'bg-orange-500/20', text: 'text-orange-400', icon: Package },
  shipped: { label: 'Dispatched', bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Truck },
  delivered: { label: 'Delivered', bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Home },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle },
};

const ALL_STATUSES: DbOrder['order_status'][] = [
  'placed',
  'confirmed',
  'preparing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
];

const COURIER_OPTIONS = [
  'Delhivery',
  'DTDC Express',
  'Blue Dart',
  'India Post (Speed Post)',
  'Professional Couriers',
  'Shadowfax',
  'Ekart Logistics',
  'Other Courier',
];

export default function AdminOrdersTab() {
  const {
    orders,
    updateOrderDetails,
    deleteOrder,
    cancelOrder,
    removeOrderItem,
    initiateOrderRefund,
    fetchOrdersFromSupabase,
    subscribeToOrders,
    isSyncing,
  } = useOrderStore();

  const { currentUser, hasPermission } = useAdminAuthStore();
  const { settings } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dispatch / Tracking Modal State (Requirement 11)
  const [dispatchModalOrder, setDispatchModalOrder] = useState<DbOrder | null>(null);
  const [dispatchTrackingId, setDispatchTrackingId] = useState('');
  const [dispatchCourier, setDispatchCourier] = useState('Delhivery');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isSavingDispatch, setIsSavingDispatch] = useState(false);

  // Order Cancellation Modal State (Requirements 1, 2, 7)
  const [cancelModalOrder, setCancelModalOrder] = useState<DbOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelCustomRefundAmount, setCancelCustomRefundAmount] = useState<string>('');
  const [cancelInitiateRefund, setCancelInitiateRefund] = useState(true);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  // Product & Customisation Cancellation Modal State
  const [itemCancelOrder, setItemCancelOrder] = useState<DbOrder | null>(null);
  const [itemCancelTarget, setItemCancelTarget] = useState<OrderItem | null>(null);
  const [itemCancelQty, setItemCancelQty] = useState<number>(1);
  const [itemCancelReason, setItemCancelReason] = useState('Product customisation / spice level cannot be prepared');
  const [itemCancelCustomReason, setItemCancelCustomReason] = useState('');
  const [itemCancelCustomNotes, setItemCancelCustomNotes] = useState('');
  const [itemCancelRefundAmount, setItemCancelRefundAmount] = useState<string>('');
  const [itemCancelInitiateRefund, setItemCancelInitiateRefund] = useState(true);
  const [isCancellingItem, setIsCancellingItem] = useState(false);

  // Custom Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<DbOrder | null>(null);
  const [refundCustomAmount, setRefundCustomAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState('Administrative compensation / partial refund');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Auto-fetch from Supabase on mount and listen to realtime updates
  const handleRefresh = useCallback(async () => {
    const res = await fetchOrdersFromSupabase();
    if (res.success) {
      toast.success(
        res.count > 0
          ? `Synced ${res.count} order${res.count === 1 ? '' : 's'} from cloud database!`
          : 'Database connected: 0 orders found'
      );
    } else {
      toast.error(res.error || 'Failed to sync from database');
    }
  }, [fetchOrdersFromSupabase]);

  useEffect(() => {
    fetchOrdersFromSupabase();
    const unsubscribe = subscribeToOrders();
    return () => {
      unsubscribe();
    };
  }, [fetchOrdersFromSupabase, subscribeToOrders]);

  // Executive KPI summary calculations
  const orderStats = useMemo(() => {
    const totalOrders = orders.length;
    const cancelledCount = orders.filter((o) => o.order_status === 'cancelled').length;
    const dispatchedCount = orders.filter((o) => o.order_status === 'shipped').length;
    const deliveredCount = orders.filter((o) => o.order_status === 'delivered').length;
    const activeProcessingCount = orders.filter((o) =>
      ['placed', 'confirmed', 'preparing', 'packed'].includes(o.order_status)
    ).length;

    const totalGmv = orders
      .filter((o) => o.order_status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const cancelledValue = orders
      .filter((o) => o.order_status === 'cancelled')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const totalRefundedSum = orders.reduce((sum, o) => sum + Number(o.refunded_amount || 0), 0);
    const totalRefundsCount = orders.reduce((sum, o) => sum + (o.refunds?.length || 0), 0);

    const refundedOrdersCount = orders.filter(
      (o) =>
        o.payment_status === 'refunded' ||
        o.payment_status === 'partially_refunded' ||
        (o.refunds && o.refunds.length > 0)
    ).length;

    return {
      totalOrders,
      totalGmv,
      activeProcessingCount,
      dispatchedCount,
      deliveredCount,
      cancelledCount,
      cancelledValue,
      totalRefundedSum,
      totalRefundsCount,
      refundedOrdersCount,
    };
  }, [orders]);

  // Unified Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_mobile.includes(q) ||
        (o.tracking_id && o.tracking_id.toLowerCase().includes(q)) ||
        o.delivery_address.city.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'active_processing') {
        return ['placed', 'confirmed', 'preparing', 'packed'].includes(o.order_status);
      }
      if (statusFilter === 'refunded_orders') {
        return (
          o.payment_status === 'refunded' ||
          o.payment_status === 'partially_refunded' ||
          (o.refunds && o.refunds.length > 0)
        );
      }
      return o.order_status === statusFilter;
    });
  }, [orders, searchQuery, statusFilter]);

  // Aggregate all refunds for dedicated Refund Ledger
  const allRefundsLedger = useMemo(() => {
    const list: Array<{
      orderId: string;
      orderNumber: string;
      customerName: string;
      customerMobile: string;
      refund: OrderRefundRecord;
      orderStatus: string;
    }> = [];

    orders.forEach((o) => {
      if (o.refunds && o.refunds.length > 0) {
        o.refunds.forEach((r) => {
          list.push({
            orderId: o.id,
            orderNumber: o.order_number,
            customerName: o.customer_name,
            customerMobile: o.customer_mobile,
            refund: r,
            orderStatus: o.order_status,
          });
        });
      }
    });

    return list.sort(
      (a, b) => new Date(b.refund.requested_at).getTime() - new Date(a.refund.requested_at).getTime()
    );
  }, [orders]);

  // Handle direct status change with Interceptions for Dispatch & Cancellation
  const handleStatusChange = async (order: DbOrder, newStatus: DbOrder['order_status']) => {
    if (newStatus === 'shipped') {
      setDispatchModalOrder(order);
      setDispatchTrackingId(order.tracking_id || '');
      setDispatchCourier(order.courier_name || 'Delhivery');
      setDispatchNotes(order.notes || '');
      return;
    }

    if (newStatus === 'cancelled') {
      const metrics = calculateOrderRefundableMetrics(order);
      setCancelModalOrder(order);
      setCancelReason('Customer requested cancellation');
      setCancelCustomReason('');
      setCancelCustomRefundAmount(String(metrics.refundableAmount));
      setCancelInitiateRefund(metrics.refundableAmount > 0);
      return;
    }

    try {
      const updated = await updateOrderDetails(order.id, {
        order_status: newStatus,
        updated_by: currentUser?.full_name || 'Order Processor',
      });

      if (currentUser) {
        logAdminAction(
          currentUser.email,
          currentUser.role,
          'UPDATE_ORDER_STATUS',
          'ORDER',
          order.order_number,
          { from: order.order_status, to: newStatus }
        );
      }

      if (order.customer_email) {
        EmailService.sendOrderStatusUpdate(updated, settings);
      }

      toast.success(`Order ${order.order_number} marked as ${STATUS_CONFIG[newStatus].label}!`);
      if (selectedOrder && selectedOrder.order_number === order.order_number) {
        setSelectedOrder(updated);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Submit Dispatch with Tracking ID
  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalOrder) return;

    if (!dispatchTrackingId.trim()) {
      toast.error('Please enter a valid Tracking ID');
      return;
    }

    setIsSavingDispatch(true);
    try {
      const updated = await updateOrderDetails(dispatchModalOrder.id, {
        order_status: 'shipped',
        tracking_id: dispatchTrackingId.trim().toUpperCase(),
        courier_name: dispatchCourier,
        notes: dispatchNotes.trim(),
        updated_by: currentUser?.full_name || 'Order Processor',
      });

      if (currentUser) {
        logAdminAction(
          currentUser.email,
          currentUser.role,
          'DISPATCH_ORDER',
          'ORDER',
          dispatchModalOrder.order_number,
          { tracking_id: dispatchTrackingId.trim().toUpperCase(), courier: dispatchCourier }
        );
      }

      if (updated.customer_email) {
        EmailService.sendOrderStatusUpdate(updated, settings);
      }

      toast.success(
        `Order ${dispatchModalOrder.order_number} Dispatched! Tracking ID: ${dispatchTrackingId.toUpperCase()}`
      );

      if (selectedOrder && selectedOrder.order_number === dispatchModalOrder.order_number) {
        setSelectedOrder(updated);
      }
      setDispatchModalOrder(null);
    } catch {
      toast.error('Failed to save dispatch details');
    } finally {
      setIsSavingDispatch(false);
    }
  };

  // Handle Order Cancellation Submit with Reason & Optional Custom Refund
  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;

    const finalReason =
      cancelReason === 'Other' ? cancelCustomReason.trim() : cancelReason.trim();

    if (!finalReason) {
      toast.error('Please enter a cancellation reason');
      return;
    }

    setIsCancellingOrder(true);
    try {
      const customAmt = cancelCustomRefundAmount ? parseFloat(cancelCustomRefundAmount) : undefined;
      const res = await cancelOrder(
        cancelModalOrder.id,
        finalReason,
        currentUser?.full_name || 'Order Processor',
        cancelInitiateRefund,
        customAmt
      );

      if (res.success && res.order) {
        toast.success(`Order ${cancelModalOrder.order_number} cancelled successfully.`);
        if (res.refund) {
          toast.success(
            `Refund of ₹${res.refund.amount} initiated (${res.refund.status.toUpperCase()})`
          );
        }
        if (selectedOrder && selectedOrder.order_number === cancelModalOrder.order_number) {
          setSelectedOrder(res.order);
        }
        setCancelModalOrder(null);
        setCancelReason('Customer requested cancellation');
        setCancelCustomReason('');
        setCancelCustomRefundAmount('');
      } else {
        toast.error(res.error || 'Failed to cancel order');
      }
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Open Product & Customisation Cancellation Modal
  const openItemCancellationModal = (order: DbOrder, item: OrderItem) => {
    setItemCancelOrder(order);
    setItemCancelTarget(item);
    setItemCancelQty(item.quantity);
    setItemCancelReason('Product customisation / spice level cannot be prepared');
    setItemCancelCustomReason('');
    setItemCancelCustomNotes('');
    setItemCancelRefundAmount(String(item.total_price));
    setItemCancelInitiateRefund(true);
  };

  // Handle Product & Customisation Cancellation Submit
  const handleItemCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCancelOrder || !itemCancelTarget) return;

    const finalReason =
      itemCancelReason === 'Other' ? itemCancelCustomReason.trim() : itemCancelReason.trim();

    if (!finalReason) {
      toast.error('Please specify the cancellation reason');
      return;
    }

    setIsCancellingItem(true);
    try {
      const customRefundNum = itemCancelRefundAmount ? parseFloat(itemCancelRefundAmount) : undefined;
      const res = await removeOrderItem(
        itemCancelOrder.id,
        itemCancelTarget.product_id,
        finalReason,
        currentUser?.full_name || 'Order Processor',
        itemCancelInitiateRefund,
        {
          cancelledQuantity: itemCancelQty,
          customRefundAmount: customRefundNum,
          customizationNotes: itemCancelCustomNotes.trim() || undefined,
        }
      );

      if (res.success && res.order) {
        toast.success(
          `Cancelled ${itemCancelQty}x ${itemCancelTarget.product_name_en} from order #${itemCancelOrder.order_number}.`
        );
        if (res.refund) {
          toast.success(
            `Refund of ₹${res.refund.amount} initiated (${res.refund.status.toUpperCase()})`
          );
        }
        if (selectedOrder && selectedOrder.order_number === itemCancelOrder.order_number) {
          setSelectedOrder(res.order);
        }
        setItemCancelOrder(null);
        setItemCancelTarget(null);
      } else {
        toast.error(res.error || 'Failed to cancel product item');
      }
    } catch {
      toast.error('Failed to cancel product item');
    } finally {
      setIsCancellingItem(false);
    }
  };

  // Handle Custom Refund Submit
  const handleCustomRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOrder) return;

    const amt = parseFloat(refundCustomAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    if (!refundReason.trim()) {
      toast.error('Please enter a refund reason');
      return;
    }

    setIsProcessingRefund(true);
    try {
      const res = await initiateOrderRefund(
        refundModalOrder.id,
        amt,
        refundReason.trim(),
        'partial',
        null,
        currentUser?.full_name || 'Order Processor'
      );

      if (res.success && res.order) {
        toast.success(`Refund of ₹${amt} initiated successfully!`);
        if (selectedOrder && selectedOrder.order_number === refundModalOrder.order_number) {
          setSelectedOrder(res.order);
        }
        setRefundModalOrder(null);
        setRefundCustomAmount('');
        setRefundReason('Administrative compensation / partial refund');
      } else {
        toast.error(res.error || 'Failed to initiate refund');
      }
    } catch {
      toast.error('Failed to initiate refund');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header & Search Controls ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>Orders, Cancellations & Refunds Console</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time fulfillment, item-level customisation cancellation, courier dispatch & payment refunds.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Name, Phone, Tracking..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh orders from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ─── Executive KPI Stats Bar (Requirements 1, 8, 9, 10, 18) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">{orderStats.totalOrders}</span>
            <span className="text-[11px] text-emerald-400 font-mono">₹{orderStats.totalGmv.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In Kitchen / Pack</span>
            <ChefHat className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-amber-400">{orderStats.activeProcessingCount}</span>
            <span className="text-[10px] text-slate-500">active</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Dispatched</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-purple-400">{orderStats.dispatchedCount}</span>
            <span className="text-[10px] text-slate-500">in transit</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Delivered</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-emerald-400">{orderStats.deliveredCount}</span>
            <span className="text-[10px] text-slate-500">completed</span>
          </div>
        </div>

        {/* Cancelled Orders Card */}
        <div className="bg-red-950/20 border border-red-500/30 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-red-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cancelled</span>
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-red-400">{orderStats.cancelledCount}</span>
            <span className="text-[11px] text-red-300 font-mono">₹{orderStats.cancelledValue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Refunds Issued Card */}
        <div className="bg-cyan-950/20 border border-cyan-500/30 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-cyan-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Refunds Processed</span>
            <RotateCcw className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-cyan-400">₹{orderStats.totalRefundedSum.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400 font-mono">({orderStats.totalRefundsCount} refunds)</span>
          </div>
        </div>
      </div>

      {/* ─── Filter Tabs & Dedicated Refund Ledger View Selector ─── */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-sm font-semibold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>All Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('active_processing')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
            statusFilter === 'active_processing'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 font-semibold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>Active Prep & Pack</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
            {orderStats.activeProcessingCount}
          </span>
        </button>

        {ALL_STATUSES.map((st) => {
          const cfg = STATUS_CONFIG[st];
          const count = orders.filter((o) => o.order_status === st).length;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                statusFilter === st
                  ? `${cfg.bg} ${cfg.text} border border-current shadow-sm font-semibold`
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{cfg.label}</span>
              {count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Filter: Refunded Orders */}
        <button
          onClick={() => setStatusFilter('refunded_orders')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
            statusFilter === 'refunded_orders'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500 font-semibold shadow-sm'
              : 'bg-slate-900 text-cyan-400/80 hover:text-cyan-300 border border-slate-800'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refunded Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
            {orderStats.refundedOrdersCount}
          </span>
        </button>

        {/* Dedicated Ledger: Refund Transactions */}
        <button
          onClick={() => setStatusFilter('refund_ledger')}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ml-auto ${
            statusFilter === 'refund_ledger'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-700'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refunds Ledger</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 font-mono">
            {allRefundsLedger.length}
          </span>
        </button>
      </div>

      {/* ─── CONDITIONAL VIEW: REFUND LEDGER OR ORDERS TABLE ─── */}
      {statusFilter === 'refund_ledger' ? (
        /* Dedicated Refund Ledger Table */
        <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span>Financial Refund Transactions & Audit Ledger</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete reconciliation of all full and partial refunds initiated through Razorpay & Gateway pipelines.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Refunded: </span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                ₹{orderStats.totalRefundedSum.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {allRefundsLedger.length === 0 ? (
            <div className="text-center py-16 px-4">
              <RotateCcw className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-sm">No Refund Transactions Recorded</p>
              <p className="text-xs text-slate-500 mt-1">
                When cancellations or item removals are refunded, they will automatically appear in this ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Order Number</th>
                    <th className="px-4 py-3.5">Customer & Phone</th>
                    <th className="px-4 py-3.5">Refund Amount</th>
                    <th className="px-4 py-3.5">Type & Reason</th>
                    <th className="px-4 py-3.5">Gateway Reference</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Requested At</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allRefundsLedger.map((row, idx) => {
                    const rf = row.refund;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3.5 align-middle">
                          <span className="font-mono font-bold text-emerald-400">
                            {row.orderNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <p className="font-semibold text-white">{row.customerName}</p>
                          <p className="text-slate-400 text-[11px] font-mono">{row.customerMobile}</p>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span className="font-mono font-bold text-cyan-400 text-sm">
                            ₹{rf.amount}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle max-w-xs">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 mr-1.5">
                            {rf.type}
                          </span>
                          <span className="text-slate-300">{rf.reason}</span>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span className="font-mono text-slate-400 text-[11px]">
                            {rf.provider_refund_id || 'sim_rfnd_' + rf.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rf.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : rf.status === 'processing'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {rf.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-slate-400 text-[11px]">
                          {new Date(rf.requested_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right">
                          <button
                            onClick={() => {
                              const found = orders.find((o) => o.id === row.orderId);
                              if (found) setSelectedOrder(found);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="View Full Order"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Orders List Table */
        <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 px-4">
              <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-sm">No orders matching criteria</p>
              <p className="text-xs text-slate-500 mt-1">
                Customer orders placed on the storefront will immediately appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Order ID & Date</th>
                    <th className="px-4 py-3.5">Customer & Contact</th>
                    <th className="px-4 py-3.5">Items & Customisation</th>
                    <th className="px-4 py-3.5">Total & Payment</th>
                    <th className="px-4 py-3.5">Status & Tracking</th>
                    <th className="px-4 py-3.5 text-right">Fulfillment Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((o) => {
                    const cfg = STATUS_CONFIG[o.order_status] || STATUS_CONFIG.placed;
                    const metrics = calculateOrderRefundableMetrics(o);
                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-900/50 transition-colors group"
                      >
                        {/* Order Number & Date */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-mono font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                            <span>{o.order_number}</span>
                            {o.order_status === 'cancelled' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                CANCELLED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(o.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            📍 {o.delivery_address.city}, {o.delivery_address.state}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold text-white text-sm">
                            {o.customer_name}
                          </div>
                          <div className="text-slate-400 text-xs mt-0.5">
                            📞 {o.customer_mobile}
                          </div>
                          <a
                            href={`https://wa.me/91${o.customer_whatsapp || o.customer_mobile}?text=${encodeURIComponent(
                              `నమస్కారం ${o.customer_name}! 🙏 ${settings.businessName} నుండి మీ ఆర్డర్ *${o.order_number}* గురించి మాట్లాడుతున్నాము.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 mt-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp Chat</span>
                          </a>
                        </td>

                        {/* Items Column with Item Cancellation Actions */}
                        <td className="px-4 py-3.5 align-top max-w-xs">
                          <div className="space-y-1.5">
                            {o.items.map((it, idx) => {
                              const isRemoved = it.status === 'removed' || it.status === 'cancelled';
                              return (
                                <div key={idx} className="text-slate-300 leading-tight group/item flex items-center justify-between gap-1.5">
                                  <div className="truncate">
                                    <span className={`font-medium ${isRemoved ? 'line-through text-slate-500' : 'text-white'}`}>
                                      {it.product_name_en}
                                    </span>{' '}
                                    <span className="text-slate-400">({it.weight})</span>{' '}
                                    <span className={isRemoved ? 'line-through text-slate-500' : 'text-emerald-400 font-semibold'}>
                                      ×{it.quantity}
                                    </span>
                                    {isRemoved && (
                                      <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                        CANCELLED
                                      </span>
                                    )}
                                  </div>

                                  {/* Quick Cancel Product Button for this specific item */}
                                  {!isRemoved && o.order_status !== 'cancelled' && (hasPermission('canRemoveOrderItems') || currentUser?.role === 'ROOT_ADMIN') && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openItemCancellationModal(o, it);
                                      }}
                                      className="opacity-0 group-hover/item:opacity-100 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition-opacity cursor-pointer flex-shrink-0"
                                      title="Cancel this specific product/customisation"
                                    >
                                      Cancel Item
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Total & Payment */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-bold text-white text-sm">₹{o.total}</div>
                          <div className="mt-1 space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                o.payment_status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : o.payment_status === 'partially_refunded'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : o.payment_status === 'refunded'
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                              }`}
                            >
                              {o.payment_status === 'partially_refunded'
                                ? `Refunded ₹${o.refunded_amount || 0}`
                                : o.payment_status === 'refunded'
                                ? 'Fully Refunded'
                                : o.payment_status === 'paid'
                                ? 'Paid Online'
                                : 'Pending / COD'}
                            </span>
                          </div>
                        </td>

                        {/* Status Dropdown & Tracking ID Badge */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="relative inline-block w-36 mb-1.5">
                            <select
                              value={o.order_status}
                              onChange={(e) =>
                                handleStatusChange(o, e.target.value as DbOrder['order_status'])
                              }
                              className={`w-full appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus:outline-none ${cfg.bg} ${cfg.text} border-current`}
                            >
                              {ALL_STATUSES.map((st) => (
                                <option key={st} value={st} className="bg-slate-900 text-white">
                                  {STATUS_CONFIG[st].label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                          </div>

                          {/* Tracking ID Badge */}
                          {o.tracking_id ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-lg font-mono">
                              <Truck className="w-3 h-3 text-purple-400" />
                              <span>{o.tracking_id}</span>
                            </div>
                          ) : o.order_status === 'shipped' ? (
                            <button
                              onClick={() => {
                                setDispatchModalOrder(o);
                                setDispatchTrackingId('');
                                setDispatchCourier('Delhivery');
                              }}
                              className="text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold cursor-pointer block"
                            >
                              + Add Tracking ID
                            </button>
                          ) : null}
                        </td>

                        {/* Fulfillment Actions (Cancel, Refund, View, Delete) */}
                        <td className="px-4 py-3.5 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Cancel Order Action Button */}
                            {o.order_status !== 'cancelled' && (hasPermission('canCancelOrders') || currentUser?.role === 'ROOT_ADMIN') && (
                              <button
                                onClick={() => {
                                  setCancelModalOrder(o);
                                  setCancelReason('Customer requested cancellation');
                                  setCancelCustomReason('');
                                  setCancelCustomRefundAmount(String(metrics.refundableAmount));
                                  setCancelInitiateRefund(metrics.refundableAmount > 0);
                                }}
                                className="p-1.5 bg-red-950/60 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg border border-red-500/30 transition-colors cursor-pointer"
                                title="Cancel Entire Order"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Issue Refund Action Button */}
                            {metrics.refundableAmount > 0 && (hasPermission('canInitiateRefunds') || currentUser?.role === 'ROOT_ADMIN') && (
                              <button
                                onClick={() => {
                                  setRefundModalOrder(o);
                                  setRefundCustomAmount(String(metrics.refundableAmount));
                                  setRefundReason('Administrative compensation / partial refund');
                                }}
                                className="p-1.5 bg-cyan-950/60 hover:bg-cyan-600/30 text-cyan-400 hover:text-cyan-300 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
                                title={`Issue Refund (₹${metrics.refundableAmount} refundable)`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* View Full Order Details */}
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="View Full Order Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Order Record */}
                            <button
                              onClick={() => setDeleteConfirmId(o.id)}
                              className="p-1.5 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Delete Order Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: DISPATCH & TRACKING ID DIALOG (Requirement 11) ─── */}
      <AnimatePresence>
        {dispatchModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Dispatch Order</h3>
                    <p className="text-xs text-purple-300 font-mono">
                      {dispatchModalOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDispatchModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveDispatch} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Courier Logistics Partner *
                  </label>
                  <select
                    value={dispatchCourier}
                    onChange={(e) => setDispatchCourier(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Courier AWB / Tracking ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchTrackingId}
                    onChange={(e) => setDispatchTrackingId(e.target.value)}
                    placeholder="e.g. DELH98726351 or DTDC123456"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono uppercase tracking-wider text-sm focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This ID will immediately reflect on the customer&apos;s Order Tracking page.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Optional Dispatch Note
                  </label>
                  <input
                    type="text"
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="e.g. Handed over to courier hub"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDispatchModalOrder(null)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDispatch}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSavingDispatch ? 'Dispatching...' : 'Save & Dispatch'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: FULL ORDER DETAILS, ACTIONS & TIMELINE DRAWER ─── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">Order Details & History</p>
                  <p className="text-xl font-mono font-bold text-emerald-400">
                    {selectedOrder.order_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Updater */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Current Status</p>
                  <p className="text-base font-bold text-white capitalize">
                    {STATUS_CONFIG[selectedOrder.order_status]?.label}
                  </p>
                </div>
                <select
                  value={selectedOrder.order_status}
                  onChange={(e) =>
                    handleStatusChange(
                      selectedOrder,
                      e.target.value as DbOrder['order_status']
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs border-0 cursor-pointer shadow-md"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      Mark as {STATUS_CONFIG[st].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cancellation Notice Banner */}
              {selectedOrder.order_status === 'cancelled' && (
                <div className="p-4 bg-red-950/40 rounded-2xl border border-red-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Order Cancelled</span>
                    </p>
                    {selectedOrder.refunded_amount && selectedOrder.refunded_amount > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                        Refunded: ₹{selectedOrder.refunded_amount}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-red-200">
                    Reason: <span className="font-semibold text-white">{selectedOrder.cancellation_reason || 'Administrative cancellation'}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Cancelled by: {selectedOrder.cancelled_by || 'Admin'} •{' '}
                    {selectedOrder.cancelled_at ? new Date(selectedOrder.cancelled_at).toLocaleString() : ''}
                  </p>
                </div>
              )}

              {/* Tracking Information Box */}
              {selectedOrder.tracking_id && (
                <div className="p-4 bg-purple-950/40 rounded-2xl border border-purple-500/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-300 font-bold uppercase">Courier Tracking</p>
                    <p className="text-sm font-mono font-bold text-purple-100 mt-0.5">
                      {selectedOrder.tracking_id} ({selectedOrder.courier_name || 'Courier'})
                    </p>
                  </div>
                  {selectedOrder.tracking_url && (
                    <a
                      href={selectedOrder.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Track</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400">Customer Name:</span>
                  <p className="font-semibold text-white text-sm">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Mobile Number:</span>
                  <p className="font-semibold text-white text-sm">{selectedOrder.customer_mobile}</p>
                </div>
                <div>
                  <span className="text-slate-400">WhatsApp:</span>
                  <p className="font-semibold text-emerald-400">
                    {selectedOrder.customer_whatsapp || selectedOrder.customer_mobile}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <p className="text-white">{selectedOrder.customer_email || 'Not provided'}</p>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Delivery Address:</span>
                <p className="text-slate-200 leading-relaxed">
                  {selectedOrder.delivery_address.house_no},{' '}
                  {selectedOrder.delivery_address.street},{' '}
                  {selectedOrder.delivery_address.area},{' '}
                  {selectedOrder.delivery_address.city},{' '}
                  {selectedOrder.delivery_address.district},{' '}
                  {selectedOrder.delivery_address.state} –{' '}
                  <span className="font-bold text-white font-mono">
                    {selectedOrder.delivery_address.pincode}
                  </span>
                </p>
              </div>

              {/* Ordered Items with Item-Level Cancellation Action */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ordered Items ({selectedOrder.items.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Supports individual item & customisation cancellation
                  </span>
                </div>
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 divide-y divide-slate-800 text-xs">
                  {selectedOrder.items.map((it, idx) => {
                    const isRemoved = it.status === 'removed' || it.status === 'cancelled';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 flex justify-between items-center ${
                          isRemoved ? 'bg-red-950/20' : ''
                        }`}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-semibold ${
                                isRemoved ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {it.product_name_en}
                            </p>
                            {isRemoved && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                CANCELLED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Weight: {it.weight} • Qty: {it.quantity} @ ₹{it.unit_price} each
                          </p>
                          {it.customization && (
                            <p className="text-[11px] text-amber-300 mt-0.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Customisation: {it.customization}</span>
                            </p>
                          )}
                          {isRemoved && (
                            <p className="text-[11px] text-red-300 mt-0.5">
                              Reason: {it.removal_reason || 'Product unavailable'}{' '}
                              {it.refund_amount ? `• Refund: ₹${it.refund_amount}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p
                            className={`font-bold text-sm ${
                              isRemoved ? 'line-through text-slate-500' : 'text-emerald-400 font-mono'
                            }`}
                          >
                            ₹{it.total_price}
                          </p>

                          {!isRemoved && selectedOrder.order_status !== 'cancelled' && (hasPermission('canRemoveOrderItems') || currentUser?.role === 'ROOT_ADMIN') && (
                            <button
                              onClick={() => openItemCancellationModal(selectedOrder, it)}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 hover:text-white rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Cancel / customise this item"
                            >
                              <MinusCircle className="w-3 h-3" />
                              <span>Cancel Item</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Reconciliation & Refund Management Card */}
              {(() => {
                const metrics = calculateOrderRefundableMetrics(selectedOrder);
                return (
                  <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>Financial Reconciliation & Payment Refunds</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedOrder.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : selectedOrder.payment_status === 'partially_refunded'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : selectedOrder.payment_status === 'refunded'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {selectedOrder.payment_status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-400">Total Paid</p>
                        <p className="text-sm font-bold font-mono text-emerald-400">₹{metrics.paidAmount}</p>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-400">Already Refunded</p>
                        <p className="text-sm font-bold font-mono text-amber-400">₹{metrics.alreadyRefunded}</p>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-400">Max Refundable</p>
                        <p className="text-sm font-bold font-mono text-cyan-400">₹{metrics.refundableAmount}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedOrder.order_status !== 'cancelled' && (hasPermission('canCancelOrders') || currentUser?.role === 'ROOT_ADMIN') && (
                        <button
                          onClick={() => {
                            setCancelModalOrder(selectedOrder);
                            setCancelReason('Customer requested cancellation');
                            setCancelCustomReason('');
                            setCancelCustomRefundAmount(String(metrics.refundableAmount));
                            setCancelInitiateRefund(metrics.refundableAmount > 0);
                          }}
                          className="flex-1 py-2 px-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel Entire Order</span>
                        </button>
                      )}

                      {metrics.refundableAmount > 0 && (hasPermission('canInitiateRefunds') || currentUser?.role === 'ROOT_ADMIN') && (
                        <button
                          onClick={() => {
                            setRefundModalOrder(selectedOrder);
                            setRefundCustomAmount(String(metrics.refundableAmount));
                            setRefundReason('Administrative compensation / partial refund');
                          }}
                          className="flex-1 py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Issue Refund (₹{metrics.refundableAmount})</span>
                        </button>
                      )}
                    </div>

                    {/* Refund History log */}
                    {selectedOrder.refunds && selectedOrder.refunds.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Refund Audit Trail ({selectedOrder.refunds.length})
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {selectedOrder.refunds.map((rf, rIdx) => (
                            <div key={rIdx} className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] flex justify-between items-center">
                              <div>
                                <span className="font-mono font-bold text-white">₹{rf.amount}</span>
                                <span className="text-slate-400 ml-2">({rf.type})</span>
                                <p className="text-[10px] text-slate-400">{rf.reason}</p>
                                {rf.provider_refund_id && (
                                  <p className="text-[9px] font-mono text-cyan-400">Ref: {rf.provider_refund_id}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  rf.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                  rf.status === 'processing' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {rf.status}
                                </span>
                                <p className="text-[9px] text-slate-500 mt-0.5">
                                  {new Date(rf.requested_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Status Milestone History */}
              {selectedOrder.order_status_history && selectedOrder.order_status_history.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Milestone Status History
                  </span>
                  <div className="space-y-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                    {selectedOrder.order_status_history.map((h, i) => (
                      <div key={i} className="text-xs flex items-start gap-2 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-white capitalize">
                            {h.status} {h.tracking_id ? `(AWB: ${h.tracking_id})` : ''}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(h.timestamp).toLocaleString()} {h.updated_by ? `• By ${h.updated_by}` : ''}
                          </p>
                          {h.notes && <p className="text-[11px] text-slate-300 italic mt-0.5">Note: {h.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: ORDER CANCELLATION DIALOG (Requirements 1, 2, 7) ─── */}
      <AnimatePresence>
        {cancelModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 border border-red-500/40 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Cancel Entire Order</h3>
                    <p className="text-xs text-red-300 font-mono">
                      {cancelModalOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCancelModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const metrics = calculateOrderRefundableMetrics(cancelModalOrder);
                return (
                  <form onSubmit={handleCancelOrderSubmit} className="space-y-4">
                    <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs space-y-1">
                      <p className="text-red-300 font-semibold">
                        This action will mark Order #{cancelModalOrder.order_number} as CANCELLED.
                      </p>
                      <p className="text-slate-400">
                        Customer: <span className="text-white">{cancelModalOrder.customer_name}</span> • Total Paid: <span className="text-emerald-400 font-mono font-bold">₹{metrics.paidAmount}</span>
                      </p>
                      {metrics.refundableAmount > 0 && (
                        <p className="text-cyan-300">
                          Refundable Balance: <span className="font-mono font-bold">₹{metrics.refundableAmount}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Cancellation Reason *
                      </label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                      >
                        <option value="Customer requested cancellation">Customer requested cancellation</option>
                        <option value="Product customisation / preparation unavailable">Product customisation / preparation unavailable</option>
                        <option value="Kitchen stock out / unavailable">Kitchen stock out / unavailable</option>
                        <option value="Delivery address unserviceable">Delivery address unserviceable</option>
                        <option value="Payment / transaction issue">Payment / transaction issue</option>
                        <option value="Duplicate order placed">Duplicate order placed</option>
                        <option value="Other">Other (specify below)</option>
                      </select>
                    </div>

                    {cancelReason === 'Other' && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Enter Specific Cancellation Reason *
                        </label>
                        <input
                          type="text"
                          required
                          value={cancelCustomReason}
                          onChange={(e) => setCancelCustomReason(e.target.value)}
                          placeholder="State exact cancellation reason..."
                          className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                        />
                      </div>
                    )}

                    {metrics.refundableAmount > 0 && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cancelInitiateRefund}
                              onChange={(e) => setCancelInitiateRefund(e.target.checked)}
                              className="rounded border-slate-700 bg-slate-800 text-red-500 focus:ring-0"
                            />
                            <span>Initiate payment refund</span>
                          </label>
                          <span className="text-[10px] text-cyan-400 font-mono">Gateway API</span>
                        </div>

                        {cancelInitiateRefund && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Refund Amount (₹) [Max ₹{metrics.refundableAmount}]
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              max={metrics.refundableAmount}
                              value={cancelCustomRefundAmount}
                              onChange={(e) => setCancelCustomRefundAmount(e.target.value)}
                              placeholder={`₹${metrics.refundableAmount}`}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCancelModalOrder(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Abort
                      </button>
                      <button
                        type="submit"
                        disabled={isCancellingOrder}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{isCancellingOrder ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                      </button>
                    </div>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 4: CANCEL PRODUCT & CUSTOMISATION (ITEM-LEVEL) ─── */}
      <AnimatePresence>
        {itemCancelOrder && itemCancelTarget && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600/30 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                    <MinusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Cancel Product / Customisation</h3>
                    <p className="text-xs text-amber-300 font-mono">
                      {itemCancelOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setItemCancelOrder(null);
                    setItemCancelTarget(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleItemCancelSubmit} className="space-y-4">
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs space-y-1">
                  <p className="text-amber-300 font-semibold text-sm">
                    {itemCancelTarget.product_name_en} {itemCancelTarget.product_name_te ? `(${itemCancelTarget.product_name_te})` : ''}
                  </p>
                  <p className="text-slate-400">
                    Weight Variant: <span className="text-white font-bold">{itemCancelTarget.weight}</span> • Line Price: <span className="text-emerald-400 font-mono font-bold">₹{itemCancelTarget.total_price}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Unit Price: ₹{itemCancelTarget.unit_price} • Original Qty: {itemCancelTarget.quantity}
                  </p>
                </div>

                {/* Quantity selector if quantity > 1 */}
                {itemCancelTarget.quantity > 1 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Quantity to Cancel (of {itemCancelTarget.quantity}) *
                    </label>
                    <select
                      value={itemCancelQty}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        setItemCancelQty(q);
                        const unitPrice = itemCancelTarget.unit_price || (itemCancelTarget.total_price / itemCancelTarget.quantity);
                        setItemCancelRefundAmount(String(roundToTwoDecimals(unitPrice * q)));
                      }}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    >
                      {Array.from({ length: itemCancelTarget.quantity }, (_, i) => i + 1).map((qty) => (
                        <option key={qty} value={qty}>
                          {qty} {qty === itemCancelTarget.quantity ? '(Cancel entire line)' : `unit${qty > 1 ? 's' : ''} only`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Cancellation / Customisation Reason *
                  </label>
                  <select
                    value={itemCancelReason}
                    onChange={(e) => setItemCancelReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="Product customisation / spice level cannot be prepared">Product customisation / spice level cannot be prepared</option>
                    <option value="Product out of stock / kitchen unavailable">Product out of stock / kitchen unavailable</option>
                    <option value="Customer requested item cancellation">Customer requested item cancellation</option>
                    <option value="Quality check rejected before dispatch">Quality check rejected before dispatch</option>
                    <option value="Packaging or weight variant unavailable">Packaging or weight variant unavailable</option>
                    <option value="Other">Other (specify below)</option>
                  </select>
                </div>

                {itemCancelReason === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Enter Reason Details *
                    </label>
                    <input
                      type="text"
                      required
                      value={itemCancelCustomReason}
                      onChange={(e) => setItemCancelCustomReason(e.target.value)}
                      placeholder="State exact cancellation reason..."
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Customisation Notes (Requirement: Customisation Cancellation) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Customisation / Preparation Audit Note
                  </label>
                  <input
                    type="text"
                    value={itemCancelCustomNotes}
                    onChange={(e) => setItemCancelCustomNotes(e.target.value)}
                    placeholder="e.g. Less spice not possible; cancelled with customer consent"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Partial Refund Section for this item */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemCancelInitiateRefund}
                        onChange={(e) => setItemCancelInitiateRefund(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
                      />
                      <span>Initiate payment refund for this product</span>
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">Partial Refund</span>
                  </div>

                  {itemCancelInitiateRefund && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Refund Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={itemCancelRefundAmount}
                        onChange={(e) => setItemCancelRefundAmount(e.target.value)}
                        placeholder="Refund amount"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setItemCancelOrder(null);
                      setItemCancelTarget(null);
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    disabled={isCancellingItem}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    <span>{isCancellingItem ? 'Cancelling...' : 'Confirm Cancellation & Refund'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 5: CUSTOM REFUND DIALOG (Requirements 8, 9, 10) ─── */}
      <AnimatePresence>
        {refundModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Initiate Payment Refund</h3>
                    <p className="text-xs text-cyan-300 font-mono">
                      {refundModalOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRefundModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const metrics = calculateOrderRefundableMetrics(refundModalOrder);
                return (
                  <form onSubmit={handleCustomRefundSubmit} className="space-y-4">
                    <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Paid Amount:</span>
                        <span className="font-mono font-bold text-emerald-400">₹{metrics.paidAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Already Refunded:</span>
                        <span className="font-mono font-bold text-amber-400">₹{metrics.alreadyRefunded}</span>
                      </div>
                      <div className="flex justify-between border-t border-cyan-500/20 pt-1">
                        <span className="text-white font-bold">Max Refundable Balance:</span>
                        <span className="font-mono font-bold text-cyan-400">₹{metrics.refundableAmount}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Refund Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max={metrics.refundableAmount}
                        required
                        value={refundCustomAmount}
                        onChange={(e) => setRefundCustomAmount(e.target.value)}
                        placeholder={`Max ₹${metrics.refundableAmount}`}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Refund Reason / Audit Note *
                      </label>
                      <input
                        type="text"
                        required
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="State reason for customer and accounting records..."
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <p className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Security Confirmation</span>
                      </p>
                      <p>
                        This will issue a refund through the active payment gateway directly to the customer&apos;s source account and dispatch an email/SMS notification.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRefundModalOrder(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessingRefund}
                        className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isProcessingRefund ? 'Processing...' : 'Confirm Refund'}</span>
                      </button>
                    </div>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Order Record?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to remove this order from history?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteOrder(deleteConfirmId);
                    toast.success('Order deleted.');
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
