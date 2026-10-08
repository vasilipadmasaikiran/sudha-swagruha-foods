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
  IndianRupee,
  MinusCircle,
  AlertTriangle,
  Receipt,
  Sparkles,
  Check,
  CreditCard,
  CheckCircle2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { EmailService } from '@/services/emailService';
import AdminPaymentInfoSubTab from './AdminPaymentInfoSubTab';
import { logAdminAction } from '@/services/auditLogger';
import { calculateOrderRefundableMetrics, roundToTwoDecimals } from '@/services/refundService';
import { calculateOrderFinancials, type OrderFinancialSummary } from '@/services/orderCalculationService';
import { exportOrdersToCsv } from '@/services/csvExportService';
import { OrderCalculationInspector } from './OrderCalculationInspector';
import type { DbOrder, OrderItem, OrderRefundRecord, OrderPaymentRecord } from '@/services/supabase';
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

export default function AdminOrdersTab({ initialSubFilter }: { initialSubFilter?: string } = {}) {
  const {
    orders,
    updateOrderDetails,
    updateOrderShipping,
    deleteOrder,
    cancelOrder,
    approveCancellationRequest,
    rejectCancellationRequest,
    removeOrderItem,
    initiateOrderRefund,
    recordOrderPayment,
    fetchOrdersFromSupabase,
    subscribeToOrders,
    isSyncing,
  } = useOrderStore();

  const { currentUser, hasPermission } = useAdminAuthStore();
  const { settings } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialSubFilter || 'all');
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubFilter) {
      setStatusFilter(initialSubFilter);
    }
  }, [initialSubFilter]);

  // Shipping Override Modal State (Requirements 1.4, 1.5, 1.7)
  const [shippingOverrideModalOrder, setShippingOverrideModalOrder] = useState<DbOrder | null>(null);
  const [shippingOverrideAmount, setShippingOverrideAmount] = useState<string>('0');
  const [shippingOverrideReason, setShippingOverrideReason] = useState<string>('');
  const [isUpdatingShipping, setIsUpdatingShipping] = useState<boolean>(false);

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

  // Customer Cancellation Request Approval Modal State (Requirements 3, 6, 7)
  const [approvalModalOrder, setApprovalModalOrder] = useState<DbOrder | null>(null);
  const [approvalRefundAmount, setApprovalRefundAmount] = useState<string>('');
  const [approvalInitiateRefund, setApprovalInitiateRefund] = useState(true);
  const [isApprovingRequest, setIsApprovingRequest] = useState(false);

  // Customer Cancellation Request Rejection Modal State (Requirements 3, 6, 8)
  const [rejectionModalOrder, setRejectionModalOrder] = useState<DbOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Order has already entered dispatch processing');
  const [rejectionComment, setRejectionComment] = useState('');
  const [isRejectingRequest, setIsRejectingRequest] = useState(false);

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

  // Manual / Offline Payment Recording State (Requirements 1-9)
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentInputAmount, setPaymentInputAmount] = useState<string>('');
  const [paymentInputMethod, setPaymentInputMethod] = useState<string>('cash');
  const [paymentInputRef, setPaymentInputRef] = useState<string>('');
  const [paymentInputDate, setPaymentInputDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentInputNotes, setPaymentInputNotes] = useState<string>('');
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

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

    const cancellationRequestsCount = orders.filter(
      (o) => o.cancellation_request?.status === 'requested'
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
      cancellationRequestsCount,
    };
  }, [orders]);

  // Unified Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (o.order_number && o.order_number.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.customer_mobile && o.customer_mobile.includes(q)) ||
        (o.tracking_id && o.tracking_id.toLowerCase().includes(q)) ||
        Boolean(o.delivery_address?.city && o.delivery_address.city.toLowerCase().includes(q)) ||
        Boolean(o.city && o.city.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'cancellation_requests') {
        return o.cancellation_request?.status === 'requested';
      }
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

  // Open Shipping Override Modal (Requirements 1.4, 1.5, 1.7)
  const handleOpenShippingOverride = (order: DbOrder) => {
    setShippingOverrideModalOrder(order);
    const currentCharge = order.admin_shipping_override !== undefined
      ? order.admin_shipping_override
      : (order.delivery_charge || 0);
    setShippingOverrideAmount(String(currentCharge));
    setShippingOverrideReason(order.shipping_override_reason || '');
  };

  // Submit Shipping Override (Requirements 1.4, 1.5, 1.7)
  const handleSaveShippingOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingOverrideModalOrder || isUpdatingShipping) return;

    const chargeNum = Number(shippingOverrideAmount);
    if (isNaN(chargeNum) || chargeNum < 0) {
      toast.error('Shipping charge must be 0 or a positive number');
      return;
    }

    if (!shippingOverrideReason.trim()) {
      toast.error('A reason for modifying the shipping charge is mandatory for audit records');
      return;
    }

    setIsUpdatingShipping(true);
    try {
      const res = await updateOrderShipping(
        shippingOverrideModalOrder.id,
        chargeNum,
        shippingOverrideReason.trim(),
        currentUser?.full_name || 'Admin',
        currentUser?.role || 'Store Owner'
      );

      if (res.success && res.order) {
        toast.success(`Shipping updated to ₹${chargeNum}! Grand Total recalculated to ₹${res.order.total}.`);
        if (selectedOrder && selectedOrder.id === res.order.id) {
          setSelectedOrder(res.order);
        }
        setShippingOverrideModalOrder(null);
      } else {
        toast.error(res.error || 'Failed to update shipping charge');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating shipping charge');
    } finally {
      setIsUpdatingShipping(false);
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

  // Open Approval Modal for Customer Cancellation Request (Requirements 6, 7)
  const openApproveModal = (order: DbOrder) => {
    setApprovalModalOrder(order);
    const metrics = calculateOrderRefundableMetrics(order);
    const estRefund = order.cancellation_request?.estimated_refund_amount ?? metrics.refundableAmount;
    setApprovalRefundAmount(String(estRefund));
    setApprovalInitiateRefund(estRefund > 0);
  };

  // Submit Approval for Customer Cancellation Request
  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalOrder) return;

    setIsApprovingRequest(true);
    try {
      const customAmt = approvalRefundAmount ? parseFloat(approvalRefundAmount) : undefined;
      const res = await approveCancellationRequest(
        approvalModalOrder.id,
        currentUser?.full_name || 'Store Owner',
        currentUser?.role || 'STORE_OWNER',
        approvalInitiateRefund,
        customAmt
      );

      if (res.success && res.order) {
        toast.success(`Cancellation request for Order #${approvalModalOrder.order_number} APPROVED.`);
        if (res.refund) {
          toast.success(
            `Refund of ₹${res.refund.amount} initiated (${res.refund.status.toUpperCase()})`
          );
        }
        if (
          selectedOrder &&
          (selectedOrder.id === approvalModalOrder.id ||
            selectedOrder.order_number === approvalModalOrder.order_number)
        ) {
          setSelectedOrder(res.order);
        }
        setApprovalModalOrder(null);
      } else {
        toast.error(res.error || 'Failed to approve cancellation request');
      }
    } catch {
      toast.error('Failed to approve cancellation request');
    } finally {
      setIsApprovingRequest(false);
    }
  };

  // Open Rejection Modal for Customer Cancellation Request (Requirements 6, 8)
  const openRejectModal = (order: DbOrder) => {
    setRejectionModalOrder(order);
    setRejectionReason('Order has already entered dispatch processing');
    setRejectionComment('');
  };

  // Submit Rejection for Customer Cancellation Request
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalOrder) return;

    if (!rejectionReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }

    setIsRejectingRequest(true);
    try {
      const res = await rejectCancellationRequest(
        rejectionModalOrder.id,
        rejectionReason.trim(),
        rejectionComment.trim(),
        currentUser?.full_name || 'Store Owner',
        currentUser?.role || 'STORE_OWNER'
      );

      if (res.success && res.order) {
        toast.success(
          `Cancellation request for Order #${rejectionModalOrder.order_number} rejected. Order remains active.`
        );
        if (
          selectedOrder &&
          (selectedOrder.id === rejectionModalOrder.id ||
            selectedOrder.order_number === rejectionModalOrder.order_number)
        ) {
          setSelectedOrder(res.order);
        }
        setRejectionModalOrder(null);
      } else {
        toast.error(res.error || 'Failed to reject cancellation request');
      }
    } catch {
      toast.error('Failed to reject cancellation request');
    } finally {
      setIsRejectingRequest(false);
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

        {/* Filter: Customer Cancellation Requests */}
        <button
          onClick={() => setStatusFilter('cancellation_requests')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
            statusFilter === 'cancellation_requests'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500 font-semibold shadow-sm'
              : 'bg-slate-900 text-amber-400/80 hover:text-amber-300 border border-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Cancellation Requests</span>
          {orderStats.cancellationRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-bold font-mono animate-pulse">
              {orderStats.cancellationRequestsCount}
            </span>
          )}
        </button>

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

        {/* Dedicated Sub-tab: Payment Info (Section 1) */}
        <button
          onClick={() => setStatusFilter('payment_info')}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
            statusFilter === 'payment_info'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md'
              : 'bg-slate-900 text-emerald-400 hover:text-white border border-emerald-500/30'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>Payment Info</span>
        </button>

        {/* Dedicated Ledger: Refund Transactions */}
        <button
          onClick={() => setStatusFilter('refund_ledger')}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
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

        {/* Authoritative Excel-Compatible CSV Export Button (Requirements 20.9, 20.10, 20.11) */}
        <button
          type="button"
          onClick={() => {
            if (filteredOrders.length === 0) {
              toast.error('No orders available to export in the current filter');
              return;
            }
            exportOrdersToCsv(filteredOrders, `SudhaSwagruha_Orders_${statusFilter}`);
            toast.success(`Exported ${filteredOrders.length} orders with 100% authoritative financial calculations!`);
          }}
          className="px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ml-auto bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 shadow-sm"
          title="Export orders to Excel-compatible CSV with full financial breakdown matching Admin Console"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
          <span>Export CSV</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 font-mono text-white">
            {filteredOrders.length}
          </span>
        </button>
      </div>

      {/* ─── CONDITIONAL VIEW: PAYMENT INFO, REFUND LEDGER OR ORDERS TABLE ─── */}
      {statusFilter === 'payment_info' ? (
        <AdminPaymentInfoSubTab onSelectOrder={(o) => setSelectedOrder(o)} />
      ) : statusFilter === 'refund_ledger' ? (
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
                          <div className="font-mono font-bold text-emerald-400 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{o.order_number}</span>
                            {o.order_status === 'cancelled' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                CANCELLED
                              </span>
                            )}
                          </div>
                          {o.cancellation_request?.status === 'requested' && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Cancellation Requested</span>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(o.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            📍 {o.delivery_address?.city || o.city || 'N/A'}, {o.delivery_address?.state || o.state || ''}
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

                        {/* Total & Payment (Requirements 15, 16, 32) */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-bold text-white text-sm font-mono">₹{o.total}</div>
                          <div className="text-[10px] text-slate-400 space-y-0.5 mt-0.5 font-mono">
                            <div>Subtotal: ₹{o.subtotal || o.total}</div>
                            {o.discount > 0 && (
                              <div className="text-emerald-400 font-semibold">Discount: -₹{o.discount}</div>
                            )}
                            {o.gst_amount !== undefined && o.gst_amount > 0 && (
                              <div className="text-slate-400">GST ({o.gst_rate}%): +₹{o.gst_amount}</div>
                            )}
                          </div>
                          <div className="mt-1.5 space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                o.payment_status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : o.payment_status === 'partially_refunded'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : o.payment_status === 'refunded'
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : o.payment_status === 'partially_paid'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : o.payment_status === 'failed'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                              }`}
                            >
                              {o.payment_status === 'partially_refunded'
                                ? `Refunded ₹${o.refunded_amount || 0}`
                                : o.payment_status === 'refunded'
                                ? 'Fully Refunded'
                                : o.payment_status === 'paid'
                                ? 'PAID'
                                : o.payment_status === 'partially_paid'
                                ? `Partially Paid (₹${o.amount_paid || 0})`
                                : o.payment_status === 'unpaid'
                                ? 'UNPAID'
                                : 'Pending / COD'}
                            </span>
                            {o.amount_due !== undefined && o.amount_due > 0 && o.payment_status !== 'paid' && (
                              <div className="text-[10px] text-amber-400/90 font-mono">
                                Due: ₹{o.amount_due}
                              </div>
                            )}
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
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Customer Cancellation Request Review Buttons */}
                            {o.cancellation_request?.status === 'requested' && (hasPermission('canApproveCancellationRequests') || currentUser?.role === 'ROOT_ADMIN') && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openApproveModal(o)}
                                  className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/40 text-[10px] font-bold transition cursor-pointer"
                                  title="Approve Customer Cancellation"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => openRejectModal(o)}
                                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/40 text-[10px] font-bold transition cursor-pointer"
                                  title="Reject Customer Cancellation"
                                >
                                  Reject
                                </button>
                              </div>
                            )}

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

              {/* Customer Cancellation Request Card (Requirements 3, 5, 6, 7, 8) */}
              {selectedOrder.cancellation_request && selectedOrder.cancellation_request.status !== 'none' && (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    selectedOrder.cancellation_request.status === 'requested'
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : selectedOrder.cancellation_request.status === 'approved'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          selectedOrder.cancellation_request.status === 'requested'
                            ? 'text-amber-400'
                            : selectedOrder.cancellation_request.status === 'approved'
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Customer Cancellation Request
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedOrder.cancellation_request.status === 'requested'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : selectedOrder.cancellation_request.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {selectedOrder.cancellation_request.status === 'requested'
                        ? 'Pending Approval'
                        : selectedOrder.cancellation_request.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Reason:</span>
                      <span className="font-semibold text-white">
                        {selectedOrder.cancellation_request.reason}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Requested On:</span>
                      <span>
                        {selectedOrder.cancellation_request.requested_at
                          ? new Date(selectedOrder.cancellation_request.requested_at).toLocaleString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {selectedOrder.cancellation_request.estimated_refund_amount !== undefined && (
                    <div className="text-xs flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Estimated Refund Amount:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{selectedOrder.cancellation_request.estimated_refund_amount}
                      </span>
                    </div>
                  )}

                  {selectedOrder.cancellation_request.customer_comment && (
                    <div className="text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Customer Comments:
                      </span>
                      &quot;{selectedOrder.cancellation_request.customer_comment}&quot;
                    </div>
                  )}

                  {selectedOrder.cancellation_request.status === 'rejected' && (
                    <div className="text-xs bg-red-950/30 p-2.5 rounded-xl border border-red-500/30 text-red-300 space-y-1">
                      <span className="font-bold block text-[10px] uppercase text-red-400">
                        Rejection Details:
                      </span>
                      <p>
                        <strong>Reason:</strong>{' '}
                        {selectedOrder.cancellation_request.rejection_reason || 'N/A'}
                      </p>
                      {selectedOrder.cancellation_request.admin_comment && (
                        <p>
                          <strong>Admin Note:</strong>{' '}
                          {selectedOrder.cancellation_request.admin_comment}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Reviewed by: {selectedOrder.cancellation_request.reviewed_by} (
                        {selectedOrder.cancellation_request.reviewer_role}) on{' '}
                        {new Date(selectedOrder.cancellation_request.reviewed_at || '').toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedOrder.cancellation_request.status === 'approved' && (
                    <div className="text-xs bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-300">
                      <span className="font-bold block text-[10px] uppercase text-emerald-400">
                        Approval Details:
                      </span>
                      <p>
                        Approved by {selectedOrder.cancellation_request.reviewed_by} (
                        {selectedOrder.cancellation_request.reviewer_role})
                        {selectedOrder.cancellation_request.approved_refund_amount !== undefined && (
                          <span>
                            {' '}
                            • Approved Refund: ₹
                            {selectedOrder.cancellation_request.approved_refund_amount}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Quick Action buttons for pending request */}
                  {selectedOrder.cancellation_request.status === 'requested' &&
                    (hasPermission('canApproveCancellationRequests') ||
                      currentUser?.role === 'ROOT_ADMIN') && (
                      <div className="flex gap-2 pt-2 border-t border-amber-500/20">
                        <button
                          onClick={() => openApproveModal(selectedOrder)}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve Cancellation</span>
                        </button>
                        <button
                          onClick={() => openRejectModal(selectedOrder)}
                          className="flex-1 py-2 px-3 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject Request</span>
                        </button>
                      </div>
                    )}
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

              {/* Delivery Address (Null-Safe Protection against Delivered Blank Screen Crash) */}
              <div className="text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Delivery Address:</span>
                <p className="text-slate-200 leading-relaxed">
                  {selectedOrder.delivery_address?.house_no ? `${selectedOrder.delivery_address.house_no}, ` : ''}
                  {selectedOrder.delivery_address?.street ? `${selectedOrder.delivery_address.street}, ` : ''}
                  {selectedOrder.delivery_address?.area ? `${selectedOrder.delivery_address.area}, ` : ''}
                  {selectedOrder.delivery_address?.city || selectedOrder.city || 'N/A'},{' '}
                  {selectedOrder.delivery_address?.district ? `${selectedOrder.delivery_address.district}, ` : ''}
                  {selectedOrder.delivery_address?.state || selectedOrder.state || ''} –{' '}
                  <span className="font-bold text-white font-mono">
                    {selectedOrder.delivery_address?.pincode || selectedOrder.pincode || ''}
                  </span>
                </p>
              </div>

              {/* Delivery & Shipping Charge Management (Requirements 1.4, 1.5, 1.7) */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Delivery / Shipping Charges
                    </span>
                  </div>
                  {selectedOrder.order_status !== 'shipped' &&
                    selectedOrder.order_status !== 'delivered' &&
                    selectedOrder.order_status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleOpenShippingOverride(selectedOrder)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Override Delivery Charge</span>
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block uppercase font-medium">Calculated Shipping</span>
                    <span className="font-bold font-mono text-white text-sm">
                      {selectedOrder.calculated_delivery_charge !== undefined
                        ? `₹${selectedOrder.calculated_delivery_charge}`
                        : selectedOrder.shipping_snapshot?.originalCalculatedCharge !== undefined
                        ? `₹${selectedOrder.shipping_snapshot.originalCalculatedCharge}`
                        : selectedOrder.shipping_snapshot?.shippingCharge !== undefined
                        ? `₹${selectedOrder.shipping_snapshot.shippingCharge}`
                        : `₹${selectedOrder.delivery_charge || 0}`}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block uppercase font-medium">Admin Override</span>
                    <span className="font-bold font-mono text-amber-300 text-sm">
                      {selectedOrder.admin_shipping_override !== undefined
                        ? `₹${selectedOrder.admin_shipping_override}`
                        : 'None'}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block uppercase font-medium">Final Shipping</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      {Number(selectedOrder.delivery_charge || 0) === 0 ? 'FREE (₹0)' : `₹${selectedOrder.delivery_charge}`}
                    </span>
                  </div>
                </div>

                {selectedOrder.shipping_override_reason && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      <strong>Override Reason:</strong> {selectedOrder.shipping_override_reason}
                    </span>
                  </div>
                )}

                {/* Shipping Audit Trail (Requirement 1.7) */}
                {Array.isArray(selectedOrder.shipping_audit_trail) && selectedOrder.shipping_audit_trail.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Shipping Audit Trail:
                    </span>
                    {selectedOrder.shipping_audit_trail.map((audit, aIdx) => (
                      <div
                        key={aIdx}
                        className="text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-slate-300 flex flex-col sm:flex-row justify-between gap-1"
                      >
                        <div>
                          <span className="text-slate-400">Previous: ₹{audit.previousShipping}</span>
                          <span className="mx-1 text-slate-500">→</span>
                          <span className="font-bold text-emerald-400">New: ₹{audit.newShipping}</span>
                          <span className="text-slate-400 ml-2">({audit.reason})</span>
                        </div>
                        <span className="text-slate-500 text-[10px]">
                          By {audit.changedBy} on {new Date(audit.changedAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ordered Items with Item-Level Cancellation Action */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ordered Items ({selectedOrder.items?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Supports individual item & customisation cancellation
                  </span>
                </div>
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 divide-y divide-slate-800 text-xs">
                  {(selectedOrder.items || []).map((it, idx) => {
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

              {/* Authoritative Financial Breakdown & Payment Reconciliation Card (Requirements 20.2, 20.7, 20.8) */}
              {(() => {
                const fin = calculateOrderFinancials(selectedOrder);
                const amountDue = fin.balanceAmount;
                const amountPaid = fin.totalAmountReceived;
                const totalRefunded = fin.refundedAmount;
                const remainingRefundable = fin.excessAmount > 0
                  ? fin.excessAmount
                  : Math.max(0, fin.totalAmountReceived - fin.refundedAmount);
                const paymentRecords: OrderPaymentRecord[] = Array.isArray(selectedOrder.payments) && selectedOrder.payments.length > 0
                  ? selectedOrder.payments
                  : selectedOrder.payment_id
                  ? [
                      {
                        id: selectedOrder.payment_id,
                        order_id: selectedOrder.id,
                        order_number: selectedOrder.order_number,
                        transaction_id: selectedOrder.payment_id,
                        amount: fin.totalAmountReceived,
                        status: selectedOrder.payment_status === 'paid' ? 'success' : 'pending',
                        provider: selectedOrder.payment_id.startsWith('pay_') ? 'razorpay' : 'manual',
                        payment_method: 'online',
                        paid_at: selectedOrder.created_at,
                        notes: 'Checkout gateway transaction',
                      },
                    ]
                  : [];

                return (
                  <div className="space-y-4">
                    {/* Financial Summary Card */}
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <IndianRupee className="w-4 h-4 text-emerald-400" />
                          <span>Authoritative Financial Summary</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            fin.paymentStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : fin.paymentStatus === 'excess_payment'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse'
                              : fin.paymentStatus === 'partially_refunded'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : fin.paymentStatus === 'refunded'
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : fin.paymentStatus === 'partially_paid'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          Payment: {fin.paymentStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between text-slate-300">
                          <span className="font-sans">Product Subtotal</span>
                          <span>₹{fin.originalSubtotal}</span>
                        </div>
                        {fin.productDiscount > 0 && (
                          <div className="flex justify-between text-emerald-400">
                            <span className="font-sans">Product Discount</span>
                            <span>-₹{fin.productDiscount}</span>
                          </div>
                        )}
                        {fin.orderDiscount > 0 && (
                          <div className="flex justify-between text-emerald-400">
                            <span className="font-sans">Coupon Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ''}</span>
                            <span>-₹{fin.orderDiscount}</span>
                          </div>
                        )}
                        {fin.cancelledAmount > 0 && (
                          <div className="flex justify-between text-rose-400 font-semibold">
                            <span className="font-sans">Cancelled Items</span>
                            <span>-₹{fin.cancelledAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                          <span className="font-sans">Adjusted Subtotal</span>
                          <span>₹{fin.adjustedSubtotal}</span>
                        </div>
                        {fin.gstAmount > 0 && (
                          <div className="flex justify-between text-slate-300">
                            <span className="font-sans">GST ({fin.gstRate}%)</span>
                            <span>+₹{fin.gstAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-300">
                          <span className="font-sans">
                            Final Shipping Charge
                            {fin.shippingOverride !== undefined ? ' (Admin Override)' : ''}
                          </span>
                          <span>{fin.finalShipping === 0 ? 'FREE' : `+₹${fin.finalShipping}`}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-700 text-sm font-bold text-white">
                          <span className="font-sans">Final Order Total</span>
                          <span className="text-emerald-400">₹{fin.finalOrderTotal}</span>
                        </div>
                      </div>

                      {/* Payment Status Metric Cards (Requirement 20.7) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-400 uppercase">Final Order Total</p>
                          <p className="text-sm font-bold font-mono text-white mt-0.5">₹{fin.finalOrderTotal}</p>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-emerald-400 uppercase font-semibold">Total Received</p>
                          <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">₹{fin.totalAmountReceived}</p>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-amber-400 uppercase font-semibold">Balance Due</p>
                          <p className="text-sm font-bold font-mono text-amber-400 mt-0.5">₹{fin.balanceAmount}</p>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-purple-400 uppercase font-semibold">
                            {fin.excessAmount > 0 ? 'Excess (Refund Due)' : 'Refund Processed'}
                          </p>
                          <p className="text-sm font-bold font-mono text-purple-400 mt-0.5">
                            {fin.excessAmount > 0 ? `₹${fin.excessAmount}` : `₹${fin.refundedAmount}`}
                          </p>
                        </div>
                      </div>

                      {/* Expandable Step-by-Step Calculation Details (Requirements 20.8, 20.17) */}
                      <div className="pt-2 border-t border-slate-800/80">
                        <OrderCalculationInspector order={selectedOrder} defaultExpanded={false} />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                        {amountDue > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = await updateOrderDetails(selectedOrder.id, {
                                payment_status: 'paid',
                                updated_by: currentUser?.full_name || 'Admin',
                              });
                              setSelectedOrder({ ...updated, amount_paid: selectedOrder.total, amount_due: 0, payment_status: 'paid' });
                              toast.success(`Order #${selectedOrder.order_number} marked as PAID!`);
                            }}
                            className="flex-1 py-2 px-3 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as Fully Paid (Clear ₹{amountDue} Due)</span>
                          </button>
                        )}

                        {selectedOrder.order_status !== 'cancelled' && (hasPermission('canCancelOrders') || currentUser?.role === 'ROOT_ADMIN') && (
                          <button
                            onClick={() => {
                              setCancelModalOrder(selectedOrder);
                              setCancelReason('Customer requested cancellation');
                              setCancelCustomReason('');
                              setCancelCustomRefundAmount(String(remainingRefundable));
                              setCancelInitiateRefund(remainingRefundable > 0);
                            }}
                            className="flex-1 py-2 px-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel Entire Order</span>
                          </button>
                        )}

                        {remainingRefundable > 0 && (hasPermission('canInitiateRefunds') || currentUser?.role === 'ROOT_ADMIN') && (
                          <button
                            onClick={() => {
                              setRefundModalOrder(selectedOrder);
                              setRefundCustomAmount(String(remainingRefundable));
                              setRefundReason('Administrative compensation / partial refund');
                            }}
                            className="flex-1 py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Issue Refund (₹{remainingRefundable} max)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ─── MANUAL PAYMENT SECTION (Requirements 1-9) ─── */}
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-emerald-400" />
                            <span>Manual Payment Received</span>
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Record full or partial offline payments. Updates database, orders, and dashboard in realtime.
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            selectedOrder.payment_status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : selectedOrder.payment_status === 'partially_paid'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          Status: {selectedOrder.payment_status.toUpperCase()}
                        </span>
                      </div>

                      {/* Financial Status Quick Glance */}
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-[10px] font-sans text-slate-400 block">Order Total:</span>
                          <span className="font-bold text-white text-sm">₹{selectedOrder.total}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-sans text-emerald-400 block">Amount Received:</span>
                          <span className="font-bold text-emerald-400 text-sm">₹{amountPaid}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-sans text-amber-400 block">Amount Due:</span>
                          <span className="font-bold text-amber-400 text-sm">₹{amountDue}</span>
                        </div>
                      </div>

                      {/* Validation Error Alert Banner */}
                      {paymentValidationError && (
                        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-red-300">Payment Validation Error</span>
                            <span>{paymentValidationError}</span>
                          </div>
                        </div>
                      )}

                      {/* Manual Payment Input Form */}
                      {amountDue > 0 ? (
                        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-emerald-500/30 space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span>Enter Payment Details</span>
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentInputAmount(amountDue.toString());
                                  setPaymentValidationError(null);
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold cursor-pointer"
                              >
                                Pay Full Due (₹{amountDue})
                              </button>
                              {amountDue > 100 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentInputAmount((Math.round(amountDue / 2)).toString());
                                    setPaymentValidationError(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                                >
                                  Half (₹{Math.round(amountDue / 2)})
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                Amount Received (₹) *
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="1"
                                  max={amountDue}
                                  value={paymentInputAmount}
                                  onChange={(e) => {
                                    setPaymentInputAmount(e.target.value);
                                    setPaymentValidationError(null);
                                  }}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                                  placeholder={`Max ₹${amountDue}`}
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                Payment Method *
                              </label>
                              <select
                                value={paymentInputMethod}
                                onChange={(e) => setPaymentInputMethod(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none capitalize"
                              >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                                <option value="bank_transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                                <option value="cheque">Cheque</option>
                                <option value="card">Card (Debit / Credit)</option>
                                <option value="other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                Payment Reference / Transaction ID
                              </label>
                              <input
                                type="text"
                                value={paymentInputRef}
                                onChange={(e) => setPaymentInputRef(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                                placeholder="e.g. CASH-1002 or UPI-987213"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                Payment Date
                              </label>
                              <input
                                type="date"
                                value={paymentInputDate}
                                onChange={(e) => setPaymentInputDate(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                Notes (Optional)
                              </label>
                              <input
                                type="text"
                                value={paymentInputNotes}
                                onChange={(e) => setPaymentInputNotes(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                                placeholder="e.g. Received partial advance cash from customer"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              disabled={isSubmittingPayment}
                              onClick={async () => {
                                const amt = parseFloat(paymentInputAmount);
                                if (isNaN(amt) || amt <= 0) {
                                  setPaymentValidationError('Payment amount must be greater than ₹0.00');
                                  return;
                                }
                                if (amt > amountDue) {
                                  setPaymentValidationError(
                                    `Payment rejected: ₹${amt} exceeds outstanding due ₹${amountDue}. Total paid cannot exceed order total.`
                                  );
                                  return;
                                }

                                setIsSubmittingPayment(true);
                                setPaymentValidationError(null);
                                try {
                                  const res = await recordOrderPayment(selectedOrder.id, {
                                    amount: amt,
                                    paymentMethod: paymentInputMethod,
                                    transactionId: paymentInputRef || undefined,
                                    paymentDate: paymentInputDate ? new Date(paymentInputDate).toISOString() : new Date().toISOString(),
                                    notes: paymentInputNotes || undefined,
                                    recordedBy: currentUser?.full_name || 'Admin',
                                    recordedByRole: currentUser?.role || 'Store Owner',
                                  });

                                  if (res.success && res.order) {
                                    toast.success(`Payment of ₹${amt.toLocaleString('en-IN')} recorded successfully!`);
                                    setSelectedOrder(res.order);
                                    setPaymentInputAmount('');
                                    setPaymentInputRef('');
                                    setPaymentInputNotes('');
                                    setPaymentValidationError(null);

                                    // Auto-send payment confirmation email if customer has email address
                                    if (res.order.customer_email) {
                                      EmailService.sendPaymentConfirmation(
                                        res.order,
                                        {
                                          amount: amt,
                                          payment_method: paymentInputMethod,
                                          reference: paymentInputRef || undefined,
                                          payment_date: paymentInputDate,
                                          notes: paymentInputNotes || undefined,
                                          total_paid: res.order.amount_paid,
                                          amount_due: res.order.amount_due,
                                          payment_status: res.order.payment_status,
                                        },
                                        useSettingsStore.getState().settings
                                      ).catch((err) => console.warn('Payment receipt email send failed:', err));
                                    }
                                  } else {
                                    setPaymentValidationError(res.error || 'Failed to record payment');
                                    toast.error(res.error || 'Failed to record payment');
                                  }
                                } finally {
                                  setIsSubmittingPayment(false);
                                }
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{isSubmittingPayment ? 'Recording...' : 'Record Payment'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>This order is fully paid. No outstanding balance due.</span>
                          </span>
                          <span className="font-mono font-bold text-white">Paid: ₹{amountPaid} / ₹{selectedOrder.total}</span>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Payment History Section (Requirement 6) */}
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-blue-400" />
                          <span>Payment History</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {paymentRecords.length} record{paymentRecords.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      {paymentRecords.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No payment transactions recorded yet (Order is {selectedOrder.payment_status.toUpperCase()}).
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-800 font-sans">
                              <tr>
                                <th className="py-2 pr-3">Date</th>
                                <th className="py-2 pr-3">Method</th>
                                <th className="py-2 pr-3">Reference / Txn ID</th>
                                <th className="py-2 pr-3">Amount</th>
                                <th className="py-2 pr-3">Recorded By</th>
                                <th className="py-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {paymentRecords.map((pay, pIdx) => (
                                <tr key={pIdx}>
                                  <td className="py-2 pr-3 text-slate-400">
                                    {new Date(pay.paid_at || pay.created_at || Date.now()).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </td>
                                  <td className="py-2 pr-3 text-white uppercase font-bold">
                                    {pay.payment_method || pay.provider || 'Cash'}
                                  </td>
                                  <td className="py-2 pr-3 text-slate-300 font-mono">
                                    {pay.transaction_id || pay.reference || '—'}
                                  </td>
                                  <td className="py-2 pr-3 text-emerald-400 font-bold font-mono">
                                    ₹{pay.amount.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2 pr-3 text-slate-400 font-sans text-[11px]">
                                    {pay.recorded_by || 'Admin'}
                                  </td>
                                  <td className="py-2 text-right">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        pay.status === 'success'
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      }`}
                                    >
                                      {pay.status.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Refund History Section (Requirement 18) */}
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <RotateCcw className="w-4 h-4 text-cyan-400" />
                          <span>Refund History</span>
                        </span>
                        <span className="text-[11px] text-cyan-400 font-mono font-bold">
                          Total Refunded: ₹{totalRefunded}
                        </span>
                      </div>

                      {(!selectedOrder.refunds || selectedOrder.refunds.length === 0) ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No refund has been processed for this order.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedOrder.refunds.map((rf, rIdx) => (
                            <div
                              key={rIdx}
                              className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs flex justify-between items-center"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-white">₹{rf.amount}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300">
                                    {rf.type}
                                  </span>
                                  <span className="text-slate-400 text-[11px]">{rf.reason}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                  Ref: {rf.provider_refund_id || rf.id} • Req by: {rf.requested_by}
                                </div>
                              </div>
                              <div className="text-right">
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
                                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                  {new Date(rf.requested_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

      {/* ─── MODAL: APPROVE CUSTOMER CANCELLATION REQUEST (Requirements 3, 6, 7) ─── */}
      <AnimatePresence>
        {approvalModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Approve Cancellation Request</h3>
                    <p className="text-xs text-emerald-300 font-mono">
                      {approvalModalOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setApprovalModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const metrics = calculateOrderRefundableMetrics(approvalModalOrder);
                return (
                  <form onSubmit={handleApproveSubmit} className="space-y-4">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Customer:</span>
                        <span className="font-bold text-white">{approvalModalOrder.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Customer Reason:</span>
                        <span className="font-semibold text-amber-300">
                          {approvalModalOrder.cancellation_request?.reason || 'Customer requested cancellation'}
                        </span>
                      </div>
                      {approvalModalOrder.cancellation_request?.customer_comment && (
                        <div className="text-slate-400 italic bg-slate-900 p-2 rounded-lg border border-slate-800">
                          &quot;{approvalModalOrder.cancellation_request.customer_comment}&quot;
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-400">Total Paid Amount:</span>
                        <span className="font-mono font-bold text-emerald-400">₹{metrics.paidAmount}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Remaining Refundable:</span>
                        <span className="font-mono font-bold text-cyan-400">₹{metrics.remainingRefundableAmount}</span>
                      </div>
                    </div>

                    {metrics.remainingRefundableAmount > 0 && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={approvalInitiateRefund}
                              onChange={(e) => setApprovalInitiateRefund(e.target.checked)}
                              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                            />
                            <span>Execute Gateway Refund</span>
                          </label>
                          <span className="text-[10px] text-cyan-400 font-mono">Automatic API</span>
                        </div>

                        {approvalInitiateRefund && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Refund Amount (₹) [Max ₹{metrics.remainingRefundableAmount}]
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={metrics.remainingRefundableAmount}
                              value={approvalRefundAmount}
                              onChange={(e) => setApprovalRefundAmount(e.target.value)}
                              placeholder={`₹${metrics.remainingRefundableAmount}`}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300">
                      Approving will mark the order as <strong>CANCELLED</strong> and synchronize with the customer&apos;s Track Order page in real time.
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setApprovalModalOrder(null)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isApprovingRequest}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isApprovingRequest ? 'Approving...' : 'Confirm Approval'}</span>
                      </button>
                    </div>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: REJECT CUSTOMER CANCELLATION REQUEST (Requirements 3, 6, 8) ─── */}
      <AnimatePresence>
        {rejectionModalOrder && (
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
                    <X className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Reject Cancellation Request</h3>
                    <p className="text-xs text-red-300 font-mono">
                      {rejectionModalOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectionModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <p className="text-slate-400">
                    Customer: <span className="text-white font-semibold">{rejectionModalOrder.customer_name}</span>
                  </p>
                  <p className="text-slate-400">
                    Customer Reason: <span className="text-amber-300">{rejectionModalOrder.cancellation_request?.reason}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Rejection Reason *
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="Order has already entered dispatch processing">Order has already entered dispatch processing</option>
                    <option value="Fresh food items have already been prepared and packed">Fresh food items have already been prepared and packed</option>
                    <option value="Courier partner has already accepted pickup">Courier partner has already accepted pickup</option>
                    <option value="Perishable goods cannot be cancelled after cooking">Perishable goods cannot be cancelled after cooking</option>
                    <option value="Customer requested to continue fulfillment">Customer requested to continue fulfillment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Additional Admin Note (Visible to Customer)
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                    placeholder="e.g. Your package is packed with courier AWB and is on the way."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
                  Rejecting will <strong>keep the order active</strong> in kitchen/delivery fulfillment and notify the customer of the decision.
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRejectionModalOrder(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRejectingRequest}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isRejectingRequest ? 'Rejecting...' : 'Confirm Rejection'}</span>
                  </button>
                </div>
              </form>
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

      {/* ─── MODAL: SHIPPING CHARGE OVERRIDE (Requirements 1.4, 1.5, 1.7) ─── */}
      <AnimatePresence>
        {shippingOverrideModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Override Delivery Charge</h3>
                    <p className="text-xs text-amber-400 font-mono">
                      {shippingOverrideModalOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShippingOverrideModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const curSubtotal = Number(shippingOverrideModalOrder.subtotal || 0);
                const curDiscount = Number(shippingOverrideModalOrder.discount || 0);
                const parsedNewShipping = Math.max(0, Number(shippingOverrideAmount) || 0);
                const projectedGrandTotal = Math.max(0, curSubtotal + parsedNewShipping - curDiscount);
                const amountPaid = Number(shippingOverrideModalOrder.amount_paid || (shippingOverrideModalOrder.payment_status === 'paid' ? shippingOverrideModalOrder.total : 0));
                const excess = Math.max(0, amountPaid - projectedGrandTotal);

                return (
                  <form onSubmit={handleSaveShippingOverride} className="space-y-4">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Shipping:</span>
                        <span className="text-white font-mono font-bold">
                          ₹{shippingOverrideModalOrder.delivery_charge || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Calculated Base:</span>
                        <span className="text-slate-300 font-mono">
                          ₹{shippingOverrideModalOrder.calculated_delivery_charge !== undefined
                            ? shippingOverrideModalOrder.calculated_delivery_charge
                            : (shippingOverrideModalOrder.shipping_snapshot?.originalCalculatedCharge !== undefined
                              ? shippingOverrideModalOrder.shipping_snapshot.originalCalculatedCharge
                              : shippingOverrideModalOrder.shipping_snapshot?.shippingCharge !== undefined
                              ? shippingOverrideModalOrder.shipping_snapshot.shippingCharge
                              : shippingOverrideModalOrder.delivery_charge || 0)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        New Delivery Charge (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={shippingOverrideAmount}
                        onChange={(e) => setShippingOverrideAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-amber-400"
                      />
                      {/* Quick Chips */}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setShippingOverrideAmount('0')}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded-lg transition"
                        >
                          ₹0 (FREE Delivery)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShippingOverrideAmount('40')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition"
                        >
                          ₹40
                        </button>
                        <button
                          type="button"
                          onClick={() => setShippingOverrideAmount('60')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition"
                        >
                          ₹60 (Standard)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Reason for Modification (Mandatory for Audit Trail) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Promotional free delivery / Customer courtesy / Local zone discount"
                        value={shippingOverrideReason}
                        onChange={(e) => setShippingOverrideReason(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Live Recalculation Impact Box */}
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between text-slate-400 font-sans text-[11px] font-bold uppercase">
                        <span>Recalculation Summary</span>
                        <span>Preview</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="font-sans">Subtotal</span>
                        <span>₹{curSubtotal}</span>
                      </div>
                      <div className="flex justify-between text-amber-300">
                        <span className="font-sans">New Shipping</span>
                        <span>{parsedNewShipping === 0 ? 'FREE' : `+₹${parsedNewShipping}`}</span>
                      </div>
                      {curDiscount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span className="font-sans">Discounts</span>
                          <span>-₹{curDiscount}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 border-t border-slate-800 font-bold text-white text-sm">
                        <span className="font-sans">Adjusted Grand Total</span>
                        <span className="text-emerald-400">₹{projectedGrandTotal}</span>
                      </div>

                      {excess > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-300 flex items-center justify-between text-xs">
                          <span className="font-sans font-semibold">Excess Paid (Refund Required):</span>
                          <span className="font-bold font-mono">₹{excess}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShippingOverrideModalOrder(null)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingShipping}
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingShipping ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save & Recalculate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
