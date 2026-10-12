// ============================================================
// Admin Console - Payment Management & Financial UX
// Comprehensive Payment Dashboard, Transactions Table,
// Payment Details View, Status Management, and Financial Audit
// ============================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee,
  Search,
  Filter,
  PlusCircle,
  History,
  RotateCcw,
  Printer,
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  X,
  CreditCard,
  User,
  Phone,
  MapPin,
  Building2,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Check,
  ArrowUpRight,
  FileSpreadsheet,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import type { DbOrder, OrderPaymentRecord, OrderRefundRecord } from '@/services/supabase';
import {
  calculateOrderFinancials,
  roundToTwo,
  type OrderFinancialSummary,
} from '@/services/orderCalculationService';
import {
  calculateOrderPaymentBreakdown,
  validateNewPaymentEntry,
  validateRefundAmount,
  type OrderPaymentBreakdown,
} from '@/services/paymentCalculationService';
import toast from 'react-hot-toast';

export interface PaymentTransactionItem {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  customerAddress: string;
  orderAmount: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  gstRate: number;
  shippingAmount: number;
  otherCharges: number;
  finalPayable: number;
  amountPaid: number;
  balanceAmount: number;
  excessAmount: number;
  paymentMethod: string;
  provider: string;
  transactionId: string;
  paymentStatus:
    | 'Successful'
    | 'Pending'
    | 'Failed'
    | 'Partially Paid'
    | 'Refund Pending'
    | 'Partially Refunded'
    | 'Refunded'
    | 'Cancelled';
  paymentDate: string;
  notes?: string;
  recordedBy?: string;
  order: DbOrder;
  rawPayment?: OrderPaymentRecord;
  financialSummary: OrderFinancialSummary;
  paymentBreakdown: OrderPaymentBreakdown;
}

export default function AdminPaymentInfoSubTab({
  onSelectOrder,
}: {
  onSelectOrder?: (order: DbOrder) => void;
}) {
  const { orders, recordOrderPayment, processExcessRefund, fetchOrdersFromSupabase } = useOrderStore();
  const { settings } = useSettingsStore();
  const { currentUser, hasPermission } = useAdminAuthStore();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Copied state for feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Detail Modal / Drawer State (Requirement 2.C)
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransactionItem | null>(null);

  // Record Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState<DbOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [paymentTxnId, setPaymentTxnId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Refund Confirmation Modal State (Requirement 2.D)
  const [refundModalTransaction, setRefundModalTransaction] = useState<PaymentTransactionItem | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<string>('upi');
  const [refundTxnId, setRefundTxnId] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('Excess payment refund');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Printable Document Modal State
  const [printModalOrder, setPrintModalOrder] = useState<DbOrder | null>(null);

  // Build authoritative transactions ledger from orders
  const allTransactions: PaymentTransactionItem[] = useMemo(() => {
    const list: PaymentTransactionItem[] = [];

    for (const order of orders) {
      const fin = calculateOrderFinancials(order);
      const pb = calculateOrderPaymentBreakdown(order);

      const customerAddress = order.delivery_address
        ? typeof order.delivery_address === 'string'
          ? order.delivery_address
          : `${order.delivery_address.house_no || ''}, ${order.delivery_address.street || ''}, ${
              order.delivery_address.city || ''
            }, ${order.delivery_address.state || ''} - ${order.delivery_address.pincode || ''}`
        : '';

      const isOrderCancelled = order.order_status === 'cancelled';

      // 1. If explicit payments exist, add each payment entry
      if (Array.isArray(order.payments) && order.payments.length > 0) {
        for (const p of order.payments) {
          const pAmount = roundToTwo(Number(p.amount || 0));
          let txStatus: PaymentTransactionItem['paymentStatus'] = 'Successful';

          if (isOrderCancelled) {
            txStatus = pb.totalRefundedAmount >= pb.totalAmountReceived && pb.totalAmountReceived > 0 ? 'Refunded' : 'Cancelled';
          } else if (p.status === 'failed') {
            txStatus = 'Failed';
          } else if (p.status === 'pending') {
            txStatus = 'Pending';
          } else if (pAmount > 0 || p.status === 'success') {
            // Amount was paid
            if (pb.balanceAmount > 0.05 && pb.totalAmountReceived < fin.finalOrderTotal) {
              txStatus = 'Partially Paid';
            } else {
              txStatus = 'Successful';
            }
          } else if (pb.paymentStatus === 'PARTIALLY PAID') {
            txStatus = 'Partially Paid';
          } else {
            txStatus = 'Pending';
          }

          list.push({
            paymentId: p.id || p.payment_id || `PAY-${order.order_number}-${list.length + 1}`,
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name || 'Customer',
            customerMobile: order.customer_mobile || order.customer_phone || '',
            customerEmail: order.customer_email || '',
            customerAddress,
            orderAmount: fin.originalSubtotal,
            discountAmount: fin.totalDiscount || Number(order.discount || 0),
            couponCode: order.coupon_code || undefined,
            taxAmount: fin.gstAmount,
            gstRate: fin.gstRate,
            shippingAmount: fin.shippingAmount,
            otherCharges: fin.otherCharges,
            finalPayable: fin.finalOrderTotal,
            amountPaid: pAmount,
            balanceAmount: pb.balanceAmount,
            excessAmount: pb.excessAmount,
            paymentMethod: p.payment_method || p.provider || 'online',
            provider: p.provider || (p.id?.startsWith('pay_') ? 'Razorpay' : 'Manual'),
            transactionId: p.transaction_id || p.reference || order.payment_id || '—',
            paymentStatus: txStatus,
            paymentDate: p.paid_at || p.payment_date || p.created_at || order.created_at,
            notes: p.notes || undefined,
            recordedBy: p.recorded_by || 'System',
            order,
            rawPayment: p,
            financialSummary: fin,
            paymentBreakdown: pb,
          });
        }
      } else {
        // 2. Synthesize row for orders without explicit sub-payments
        const hasPaymentIndicator = order.payment_status === 'paid' ||
                                    (order.amount_paid !== undefined && Number(order.amount_paid) > 0) ||
                                    Boolean(order.payment_id && !order.payment_id.startsWith('cod_') && order.payment_id !== 'Pending Settlement');

        const paidVal = (order.amount_paid !== undefined && Number(order.amount_paid) > 0)
          ? roundToTwo(Number(order.amount_paid))
          : hasPaymentIndicator
          ? roundToTwo(fin.totalAmountReceived > 0 ? fin.totalAmountReceived : fin.finalOrderTotal)
          : 0;

        let txStatus: PaymentTransactionItem['paymentStatus'] = 'Pending';

        if (isOrderCancelled) {
          txStatus = pb.totalRefundedAmount >= (paidVal > 0 ? paidVal : fin.originalOrderTotal) && pb.totalRefundedAmount > 0
            ? 'Refunded'
            : 'Cancelled';
        } else if (order.payment_status === 'failed') {
          txStatus = 'Failed';
        } else if (paidVal > 0 || order.payment_status === 'paid' || fin.paymentStatus === 'paid' || pb.paymentStatus === 'FULLY PAID' || pb.paymentStatus === 'EXCESS AMOUNT') {
          // Amount was paid
          if (pb.balanceAmount > 0.05 && paidVal < fin.finalOrderTotal) {
            txStatus = 'Partially Paid';
          } else {
            txStatus = 'Successful';
          }
        } else if (order.payment_status === 'partially_paid' || pb.paymentStatus === 'PARTIALLY PAID' || (paidVal > 0 && pb.balanceAmount > 0.05)) {
          txStatus = 'Partially Paid';
        } else {
          txStatus = 'Pending';
        }

        list.push({
          paymentId: order.payment_id || `PAY-${order.order_number}`,
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name || 'Customer',
          customerMobile: order.customer_mobile || order.customer_phone || '',
          customerEmail: order.customer_email || '',
          customerAddress,
          orderAmount: fin.originalSubtotal,
          discountAmount: fin.totalDiscount || Number(order.discount || 0),
          couponCode: order.coupon_code || undefined,
          taxAmount: fin.gstAmount,
          gstRate: fin.gstRate,
          shippingAmount: fin.shippingAmount,
          otherCharges: fin.otherCharges,
          finalPayable: fin.finalOrderTotal,
          amountPaid: roundToTwo(paidVal),
          balanceAmount: pb.balanceAmount,
          excessAmount: pb.excessAmount,
          paymentMethod: order.payment_id ? 'online' : 'cod',
          provider: order.payment_id?.startsWith('pay_') ? 'Razorpay' : 'Direct Order',
          transactionId: order.payment_id || order.razorpay_order_id || 'Pending Settlement',
          paymentStatus: txStatus,
          paymentDate: order.created_at,
          notes: order.notes || undefined,
          recordedBy: 'Storefront',
          order,
          financialSummary: fin,
          paymentBreakdown: pb,
        });
      }
    }

    return list;
  }, [orders]);

  // Section 2.A: Payment Dashboard KPI Calculations
  const dashboardMetrics = useMemo(() => {
    let totalPaymentsReceived = 0;
    let successfulCount = 0;
    let successfulAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let failedCount = 0;
    let failedAmount = 0;
    let refundedAmount = 0;
    let refundsCount = 0;
    let totalOutstandingAmount = 0;

    // Use order-level calculations to avoid double-counting multi-payment retries
    for (const order of orders) {
      const fin = calculateOrderFinancials(order);
      const pb = calculateOrderPaymentBreakdown(order);

      totalPaymentsReceived += pb.totalAmountReceived;
      refundedAmount += pb.totalRefundedAmount;
      refundsCount += Array.isArray(order.refunds) ? order.refunds.length : 0;

      if (order.order_status !== 'cancelled') {
        totalOutstandingAmount += pb.balanceAmount;
      }

      if (pb.paymentStatus === 'FULLY PAID' || pb.paymentStatus === 'EXCESS AMOUNT') {
        successfulCount++;
        successfulAmount += pb.totalAmountReceived;
      } else if (pb.paymentStatus === 'PARTIALLY PAID') {
        successfulCount++;
        successfulAmount += pb.totalAmountReceived;
        pendingCount++;
        pendingAmount += pb.balanceAmount;
      } else if (order.payment_status === 'failed') {
        failedCount++;
        failedAmount += fin.finalOrderTotal;
      } else {
        pendingCount++;
        pendingAmount += fin.finalOrderTotal;
      }
    }

    return {
      totalPaymentsReceived: roundToTwo(totalPaymentsReceived),
      successfulCount,
      successfulAmount: roundToTwo(successfulAmount),
      pendingCount,
      pendingAmount: roundToTwo(pendingAmount),
      failedCount,
      failedAmount: roundToTwo(failedAmount),
      refundedAmount: roundToTwo(refundedAmount),
      refundsCount,
      totalOutstandingAmount: roundToTwo(totalOutstandingAmount),
    };
  }, [orders]);

  // Section 2.E: Filter and search transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      // 1. Text Search (Payment ID, Order ID, Customer, Phone, Transaction ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPaymentId = tx.paymentId.toLowerCase().includes(q);
        const matchesOrder = tx.orderNumber.toLowerCase().includes(q);
        const matchesName = tx.customerName.toLowerCase().includes(q);
        const matchesPhone = tx.customerMobile.includes(q);
        const matchesTxnId = tx.transactionId.toLowerCase().includes(q);

        if (!matchesPaymentId && !matchesOrder && !matchesName && !matchesPhone && !matchesTxnId) {
          return false;
        }
      }

      // 2. Status Filter
      if (paymentStatusFilter !== 'all') {
        if (paymentStatusFilter === 'successful' && tx.paymentStatus !== 'Successful') return false;
        if (paymentStatusFilter === 'pending' && tx.paymentStatus !== 'Pending') return false;
        if (paymentStatusFilter === 'failed' && tx.paymentStatus !== 'Failed') return false;
        if (paymentStatusFilter === 'partially_paid' && tx.paymentStatus !== 'Partially Paid') return false;
        if (paymentStatusFilter === 'refund_pending' && tx.paymentStatus !== 'Refund Pending') return false;
        if (paymentStatusFilter === 'partially_refunded' && tx.paymentStatus !== 'Partially Refunded') return false;
        if (paymentStatusFilter === 'refunded' && tx.paymentStatus !== 'Refunded') return false;
        if (paymentStatusFilter === 'cancelled' && tx.paymentStatus !== 'Cancelled') return false;
      }

      // 3. Payment Method Filter
      if (paymentMethodFilter !== 'all') {
        const method = tx.paymentMethod.toLowerCase();
        if (paymentMethodFilter === 'upi' && !method.includes('upi')) return false;
        if (paymentMethodFilter === 'card' && !method.includes('card')) return false;
        if (paymentMethodFilter === 'cod' && !method.includes('cod') && !method.includes('cash')) return false;
        if (paymentMethodFilter === 'online' && !method.includes('online') && !method.includes('razorpay')) return false;
        if (paymentMethodFilter === 'bank_transfer' && !method.includes('bank') && !method.includes('neft') && !method.includes('imps')) return false;
      }

      // 4. Date Range Filter
      if (dateRangeFilter !== 'all') {
        const txDate = new Date(tx.paymentDate);
        const now = new Date();

        if (dateRangeFilter === 'today') {
          if (txDate.toDateString() !== now.toDateString()) return false;
        } else if (dateRangeFilter === 'yesterday') {
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          if (txDate.toDateString() !== yest.toDateString()) return false;
        } else if (dateRangeFilter === 'last_7_days') {
          const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateRangeFilter === 'this_month') {
          if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateRangeFilter === 'custom') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (txDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (txDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [allTransactions, searchQuery, paymentStatusFilter, paymentMethodFilter, dateRangeFilter, customStartDate, customEndDate]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
      }
      if (sortBy === 'amount_desc') {
        return b.finalPayable - a.finalPayable;
      }
      if (sortBy === 'amount_asc') {
        return a.finalPayable - b.finalPayable;
      }
      return 0;
    });
  }, [filteredTransactions, sortBy]);

  // Paginated transactions
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIdx, startIdx + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // CSV Export (Requirement 2.E)
  const handleExportCsv = () => {
    if (sortedTransactions.length === 0) {
      toast.error('No payment transactions match the active filter.');
      return;
    }

    const headers = [
      'Payment ID',
      'Order ID',
      'Customer Name',
      'Customer Mobile',
      'Customer Email',
      'Order Amount (Original Subtotal)',
      'Discount Applied',
      'Tax (GST Amount)',
      'Shipping Charge',
      'Final Payable Amount',
      'Amount Paid',
      'Outstanding Balance',
      'Payment Method',
      'Transaction ID / Gateway Ref',
      'Payment Status',
      'Payment Date',
      'Recorded By',
    ];

    const rows = sortedTransactions.map((tx) => [
      `"${tx.paymentId}"`,
      `"${tx.orderNumber}"`,
      `"${(tx.customerName || '').replace(/"/g, '""')}"`,
      `"${tx.customerMobile || ''}"`,
      `"${tx.customerEmail || ''}"`,
      tx.orderAmount,
      tx.discountAmount,
      tx.taxAmount,
      tx.shippingAmount,
      tx.finalPayable,
      tx.amountPaid,
      tx.balanceAmount,
      `"${tx.paymentMethod}"`,
      `"${(tx.transactionId || '').replace(/"/g, '""')}"`,
      `"${tx.paymentStatus}"`,
      `"${new Date(tx.paymentDate).toISOString()}"`,
      `"${tx.recordedBy || 'Admin'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SudhaSwagruha_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${sortedTransactions.length} payment records!`);
  };

  // Record Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payment amount greater than ₹0');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await recordOrderPayment(paymentModalOrder.id, {
        amount: amt,
        paymentMethod,
        transactionId: paymentTxnId.trim() || undefined,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        notes: paymentNotes.trim() || undefined,
        recordedBy: currentUser?.full_name || 'Admin',
        recordedByRole: currentUser?.role || 'ROOT_ADMIN',
      });

      if (res.success && res.order) {
        toast.success(`Payment of ₹${amt.toLocaleString('en-IN')} recorded successfully!`);
        setPaymentModalOrder(null);
        // If modal was open, refresh selected transaction
        if (selectedTransaction && selectedTransaction.orderId === paymentModalOrder.id) {
          const updatedTx = allTransactions.find((t) => t.orderId === paymentModalOrder.id);
          if (updatedTx) setSelectedTransaction(updatedTx);
        }
      } else {
        toast.error(res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error recording payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Process Refund Submit (Requirement 2.D)
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalTransaction) return;

    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid refund amount greater than ₹0');
      return;
    }

    if (!refundReason.trim()) {
      toast.error('A refund reason is required for audit compliance.');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const res = await processExcessRefund(refundModalTransaction.orderId, {
        amount: amt,
        refundMethod,
        transactionId: refundTxnId.trim() || undefined,
        refundDate: new Date().toISOString(),
        notes: refundReason.trim(),
        processedBy: currentUser?.full_name || 'Admin',
        processedByRole: currentUser?.role || 'ROOT_ADMIN',
      });

      if (res.success && res.order) {
        toast.success(`Refund of ₹${amt.toLocaleString('en-IN')} processed successfully!`);
        setRefundModalTransaction(null);
      } else {
        toast.error(res.error || 'Failed to process refund');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process refund');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const canRefund =
    currentUser?.role === 'ROOT_ADMIN' ||
    !currentUser ||
    currentUser?.role !== 'ORDER_PROCESSOR';

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Payment Management & Financial Overview</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit customer payments, verify order-level financial breakdowns, track outstanding balances & issue refunds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchOrdersFromSupabase}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh payments from cloud database"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync Live</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            title="Export filtered transactions to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {filteredTransactions.length}
            </span>
          </button>
        </div>
      </div>

      {/* ─── REQUIREMENT 2.A: PAYMENT DASHBOARD KPI CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Payments Received */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-md hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Received
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-emerald-400 mt-2">
            ₹{dashboardMetrics.totalPaymentsReceived.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Total successfully collected funds
          </p>
        </div>

        {/* Card 2: Successful Payments */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-md hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Successful
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
              {dashboardMetrics.successfulCount}
            </div>
          </div>
          <p className="text-xl font-black font-mono text-white mt-2">
            ₹{dashboardMetrics.successfulAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Fully collected & verified payments
          </p>
        </div>

        {/* Card 3: Pending Payments */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-md hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Pending
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
              {dashboardMetrics.pendingCount}
            </div>
          </div>
          <p className="text-xl font-black font-mono text-amber-400 mt-2">
            ₹{dashboardMetrics.pendingAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Awaiting COD or gateway settlement
          </p>
        </div>

        {/* Card 4: Failed Payments */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-md hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Failed
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs">
              {dashboardMetrics.failedCount}
            </div>
          </div>
          <p className="text-xl font-black font-mono text-rose-400 mt-2">
            ₹{dashboardMetrics.failedAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Declined transactions & dropoffs
          </p>
        </div>

        {/* Card 5: Refunded Amount */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-md hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Refunded
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
              {dashboardMetrics.refundsCount}
            </div>
          </div>
          <p className="text-xl font-black font-mono text-cyan-400 mt-2">
            ₹{dashboardMetrics.refundedAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Total funds returned to customers
          </p>
        </div>

        {/* Card 6: Total Outstanding Amount */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-md hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
              Outstanding
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-purple-300 mt-2">
            ₹{dashboardMetrics.totalOutstandingAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Remaining balance on active orders
          </p>
        </div>
      </div>

      {/* ─── REQUIREMENT 2.E: SEARCH, FILTERS & CONTROLS ─── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* 1. Search Query */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Payment ID, Order ID, Customer, Phone, Txn Ref..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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

          {/* 2. Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="refund_pending">Refund Pending</option>
              <option value="partially_refunded">Partially Refunded</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* 3. Payment Method Filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="card">Cards (Credit / Debit)</option>
              <option value="online">Online (Razorpay)</option>
              <option value="cod">Cash on Delivery / Cash</option>
              <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
            </select>
          </div>

          {/* 4. Date Range Filter */}
          <div>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row (Conditional) */}
        {dateRangeFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-slate-400 hover:text-white underline ml-2"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── REQUIREMENT 2.B: PAYMENT TRANSACTIONS TABLE ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Payment ID</th>
                <th className="py-3 px-3.5">Order ID</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5 text-right">Order Amount</th>
                <th className="py-3 px-3.5 text-right">Discount</th>
                <th className="py-3 px-3.5 text-right">Final Payable</th>
                <th className="py-3 px-3.5 text-right">Amount Paid</th>
                <th className="py-3 px-3.5 text-center">Payment Method</th>
                <th className="py-3 px-3.5">Transaction ID</th>
                <th className="py-3 px-3.5 text-center">Payment Status</th>
                <th className="py-3 px-3.5">Payment Date</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    No payment transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  // Badge styling based on status
                  const statusStyles: Record<string, string> = {
                    Successful: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                    Pending: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                    Failed: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
                    'Partially Paid': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
                    'Refund Pending': 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse',
                    'Partially Refunded': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
                    Refunded: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
                    Cancelled: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
                  };
                  const badgeClass = statusStyles[tx.paymentStatus] || 'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <tr
                      key={`${tx.paymentId}-${tx.orderId}`}
                      className="hover:bg-slate-800/40 transition-colors group text-slate-300"
                    >
                      {/* 1. Payment ID */}
                      <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-200">{tx.paymentId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.paymentId, tx.paymentId)}
                            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                            title="Copy Payment ID"
                          >
                            {copiedId === tx.paymentId ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase">{tx.provider}</span>
                      </td>

                      {/* 2. Order ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-white whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectOrder) onSelectOrder(tx.order);
                            else setSelectedTransaction(tx);
                          }}
                          className="hover:text-emerald-400 transition-colors text-left flex items-center gap-1"
                          title="View Order Details"
                        >
                          <span>{tx.orderNumber}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-60" />
                        </button>
                      </td>

                      {/* 3. Customer */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <p className="font-semibold text-white truncate max-w-[130px]">
                          {tx.customerName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {tx.customerMobile || '—'}
                        </p>
                      </td>

                      {/* 4. Order Amount (Original before discounts) */}
                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-300 whitespace-nowrap">
                        ₹{tx.orderAmount.toLocaleString('en-IN')}
                      </td>

                      {/* 5. Discount */}
                      <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                        {tx.discountAmount > 0 ? (
                          <div>
                            <span className="text-emerald-400 font-semibold">
                              -₹{tx.discountAmount.toLocaleString('en-IN')}
                            </span>
                            {tx.couponCode && (
                              <span className="block text-[9px] text-emerald-500 uppercase font-sans">
                                {tx.couponCode}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">₹0</span>
                        )}
                      </td>

                      {/* 6. Final Payable (Adjusted customer must pay) */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-white bg-slate-950/30 whitespace-nowrap">
                        ₹{tx.finalPayable.toLocaleString('en-IN')}
                      </td>

                      {/* 7. Amount Paid */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {tx.amountPaid > 0 ? (
                          <span className="text-emerald-400">
                            ₹{tx.amountPaid.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-600">₹0</span>
                        )}
                      </td>

                      {/* 8. Payment Method */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {tx.paymentMethod}
                        </span>
                      </td>

                      {/* 9. Transaction ID / Gateway Ref */}
                      <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-300 truncate max-w-[120px]" title={tx.transactionId}>
                            {tx.transactionId}
                          </span>
                          {tx.transactionId !== '—' && tx.transactionId !== 'Pending Settlement' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.transactionId, `${tx.paymentId}-txn`)}
                              className="p-1 text-slate-500 hover:text-slate-300"
                              title="Copy Transaction Ref"
                            >
                              {copiedId === `${tx.paymentId}-txn` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 10. Payment Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}
                        >
                          {tx.paymentStatus}
                        </span>
                      </td>

                      {/* 11. Payment Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-slate-400">
                        {new Date(tx.paymentDate).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* 12. Actions */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Details Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="View Payment Breakdown & Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                          </button>

                          {/* Record Payment (if balance due) */}
                          {tx.balanceAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentModalOrder(tx.order);
                                setPaymentAmount(String(tx.balanceAmount));
                                setPaymentMethod('upi');
                                setPaymentTxnId(`TXN-${Date.now().toString().slice(-6)}`);
                                setPaymentDate(new Date().toISOString().slice(0, 16));
                                setPaymentNotes('');
                              }}
                              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
                              title="Record Offline / Additional Payment"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Refund Button (if eligible and authorized) */}
                          {tx.amountPaid > 0 && canRefund && (
                            <button
                              type="button"
                              onClick={() => {
                                const maxRefund = Math.max(0, tx.excessAmount - tx.paymentBreakdown.totalRefundedAmount);
                                setRefundModalTransaction(tx);
                                setRefundAmount(maxRefund > 0 ? String(maxRefund) : String(tx.amountPaid));
                                setRefundMethod('upi');
                                setRefundTxnId(`REF-${Date.now().toString().slice(-6)}`);
                                setRefundReason('Customer cancellation / financial adjustment');
                              }}
                              className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition-colors"
                              title="Initiate Verified Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Invoice / Voucher */}
                          <button
                            type="button"
                            onClick={() => setPrintModalOrder(tx.order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Print Payment Voucher"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-white">
              {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>
            <span>to</span>
            <span className="font-bold text-white">
              {Math.min(currentPage * pageSize, filteredTransactions.length)}
            </span>
            <span>of</span>
            <span className="font-bold text-white">{filteredTransactions.length}</span>
            <span>transactions</span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-3 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1.5 font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── REQUIREMENT 2.C: PAYMENT DETAILS VIEW (DRAWER / MODAL) ─── */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Payment Details
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Tx: {selectedTransaction.paymentId}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg mt-1 flex items-center gap-2">
                    <span>Order #{selectedTransaction.orderNumber}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Recorded on {new Date(selectedTransaction.paymentDate).toLocaleString('en-IN')} • Customer: {selectedTransaction.customerName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectOrder) onSelectOrder(selectedTransaction.order);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <span>View Order</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid: Order Price Breakdown & Payment Information */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* 1. Order Price Breakdown Card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Order Price Breakdown</span>
                  </h4>

                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Original Product Amount:</span>
                      <span className="font-mono font-bold text-white">
                        ₹{selectedTransaction.orderAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {selectedTransaction.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>
                          Discount Applied {selectedTransaction.couponCode ? `(${selectedTransaction.couponCode})` : ''}:
                        </span>
                        <span className="font-mono">
                          -₹{selectedTransaction.discountAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Taxable Amount:</span>
                      <span className="font-mono">
                        ₹{(selectedTransaction.financialSummary.taxableAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {selectedTransaction.taxAmount > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>GST Tax ({selectedTransaction.gstRate}%):</span>
                        <span className="font-mono">
                          +₹{selectedTransaction.taxAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-300">
                      <span>Shipping / Delivery:</span>
                      <span className="font-mono">
                        {selectedTransaction.shippingAmount === 0 ? 'FREE' : `₹${selectedTransaction.shippingAmount.toLocaleString('en-IN')}`}
                      </span>
                    </div>

                    {selectedTransaction.otherCharges > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Other Adjustments (COD):</span>
                        <span className="font-mono">
                          +₹{selectedTransaction.otherCharges.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                      <span className="font-bold text-white text-sm">Final Amount Payable:</span>
                      <span className="font-mono font-black text-emerald-400 text-lg">
                        ₹{selectedTransaction.finalPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Payment Information Card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Payment Information</span>
                  </h4>

                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment ID:</span>
                      <span className="font-mono font-bold text-slate-200">{selectedTransaction.paymentId}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment Method:</span>
                      <span className="font-bold uppercase text-white">{selectedTransaction.paymentMethod}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Gateway Reference:</span>
                      <span className="font-mono text-slate-300 truncate max-w-[150px]">
                        {selectedTransaction.transactionId}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount Paid:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{selectedTransaction.paymentBreakdown.totalAmountReceived.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span className="font-bold text-amber-400">Outstanding Balance:</span>
                      <span className="font-mono font-black text-amber-400 text-base">
                        ₹{selectedTransaction.balanceAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {selectedTransaction.excessAmount > 0 && (
                      <div className="flex justify-between text-purple-300 font-bold">
                        <span>Excess Amount (Refund Due):</span>
                        <span className="font-mono">
                          ₹{selectedTransaction.excessAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Payment Status:</span>
                      <span className="font-bold uppercase text-emerald-400">
                        {selectedTransaction.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information Bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs grid sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer Name</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">{selectedTransaction.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Contact Details</span>
                  <span className="font-mono text-slate-300 block">{selectedTransaction.customerMobile || '—'}</span>
                  {selectedTransaction.customerEmail && (
                    <span className="text-slate-400 text-[11px] block">{selectedTransaction.customerEmail}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Delivery Destination</span>
                  <span className="text-slate-300 text-[11px] block leading-tight">{selectedTransaction.customerAddress || 'Direct Store Pickup'}</span>
                </div>
              </div>

              {/* Payment Attempt & Transaction History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payment Attempt & Settlement History</span>
                </h4>

                {(!selectedTransaction.order.payments || selectedTransaction.order.payments.length === 0) ? (
                  <div className="p-3 bg-slate-950 rounded-xl text-center text-xs text-slate-500">
                    No individual multi-payment logs recorded. Order was processed via storefront checkout (₹
                    {selectedTransaction.amountPaid.toLocaleString('en-IN')}).
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5">Method</th>
                          <th className="p-2.5">Reference ID</th>
                          <th className="p-2.5">Recorded By</th>
                          <th className="p-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {selectedTransaction.order.payments.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td className="p-2.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                              {new Date(p.paid_at || p.payment_date || p.created_at || Date.now()).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              ₹{Number(p.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 uppercase font-semibold text-slate-300">
                              {p.payment_method || p.provider || 'manual'}
                            </td>
                            <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                              {p.transaction_id || p.reference || '—'}
                            </td>
                            <td className="p-2.5 text-slate-300">{p.recorded_by || 'Admin'}</td>
                            <td className="p-2.5 text-slate-400 text-[11px]">{p.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Refund Information History */}
              {Array.isArray(selectedTransaction.order.refunds) && selectedTransaction.order.refunds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Refund History & Reversals</span>
                  </h4>
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Refund Amount</th>
                          <th className="p-2.5">Method</th>
                          <th className="p-2.5">Reference ID</th>
                          <th className="p-2.5">Processed By</th>
                          <th className="p-2.5">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {selectedTransaction.order.refunds.map((r, idx) => (
                          <tr key={r.id || idx}>
                            <td className="p-2.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                              {new Date(r.completed_at || r.requested_at).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-cyan-400 whitespace-nowrap">
                              -₹{Number(r.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 uppercase font-semibold text-slate-300">{r.provider}</td>
                            <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                              {r.provider_refund_id || r.id}
                            </td>
                            <td className="p-2.5 text-slate-300">{r.requested_by}</td>
                            <td className="p-2.5 text-slate-400 text-[11px]">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPrintModalOrder(selectedTransaction.order)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Payment Voucher</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedTransaction.balanceAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentModalOrder(selectedTransaction.order);
                        setPaymentAmount(String(selectedTransaction.balanceAmount));
                        setPaymentMethod('upi');
                        setPaymentTxnId(`TXN-${Date.now().toString().slice(-6)}`);
                        setPaymentDate(new Date().toISOString().slice(0, 16));
                        setPaymentNotes('');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  {selectedTransaction.amountPaid > 0 && canRefund && (
                    <button
                      type="button"
                      onClick={() => {
                        const maxRefund = Math.max(0, selectedTransaction.excessAmount - selectedTransaction.paymentBreakdown.totalRefundedAmount);
                        setRefundModalTransaction(selectedTransaction);
                        setRefundAmount(maxRefund > 0 ? String(maxRefund) : String(selectedTransaction.amountPaid));
                        setRefundMethod('upi');
                        setRefundTxnId(`REF-${Date.now().toString().slice(-6)}`);
                        setRefundReason('Customer cancellation / financial adjustment');
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Initiate Refund</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 1: ADD PAYMENT ENTRY ─────────────────────────────────── */}
      <AnimatePresence>
        {paymentModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-emerald-400" />
                    <span>Record Verified Payment</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{paymentModalOrder.order_number} • Customer: {paymentModalOrder.customer_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalOrder(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Financial Snapshot Before Entry */}
              {(() => {
                const b = calculateOrderPaymentBreakdown(paymentModalOrder);
                return (
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Adjusted Total</span>
                      <span className="font-bold font-mono text-white">
                        ₹{b.adjustedOrderTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Already Paid</span>
                      <span className="font-bold font-mono text-emerald-400">
                        ₹{b.totalAmountReceived.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Current Balance</span>
                      <span className="font-bold font-mono text-amber-400">
                        ₹{b.balanceAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="cash">Cash on Delivery / Direct Cash</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="card">Debit / Credit Card</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other Manual Settlement</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Transaction / UTR Reference
                    </label>
                    <input
                      type="text"
                      value={paymentTxnId}
                      onChange={(e) => setPaymentTxnId(e.target.value)}
                      placeholder="e.g. UPI-923841 or Receipt #"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Internal Notes / Audit Reason
                  </label>
                  <textarea
                    rows={2}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Collected via cash on delivery upon courier handover..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOrder(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {isSubmittingPayment ? 'Saving...' : 'Confirm & Record Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: CONFIRM REFUND MODAL (REQUIREMENT 2.D) ─── */}
      <AnimatePresence>
        {refundModalTransaction && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-purple-400" />
                    <span>Confirm & Authorize Customer Refund</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{refundModalTransaction.orderNumber} • Customer: {refundModalTransaction.customerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundModalTransaction(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Confirmation Notice */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Sensitive Financial Operation Confirmation</span>
                </p>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  You are authorizing a financial refund. The action, timestamp, administrator ID (
                  <strong>{currentUser?.full_name || 'Admin'}</strong>), and compliance reason will be recorded to the
                  audit ledger.
                </p>
              </div>

              {/* Financial Snapshot */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Successfully Collected:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    ₹{refundModalTransaction.paymentBreakdown.totalAmountReceived.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Adjusted Order Total:</span>
                  <span className="font-mono text-white font-bold">
                    ₹{refundModalTransaction.paymentBreakdown.adjustedOrderTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-purple-300 font-bold">Calculated Excess / Max Refundable:</span>
                  <span className="font-mono text-purple-400 font-bold">
                    ₹{Math.max(
                      0,
                      roundToTwo(
                        refundModalTransaction.paymentBreakdown.totalAmountReceived -
                          refundModalTransaction.paymentBreakdown.totalRefundedAmount
                      )
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRefundSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Refund Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Cannot exceed remaining collected funds on this order.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Refund Method *
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="upi">UPI Return (GPay/PhonePe)</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="razorpay">Razorpay Gateway Reversal</option>
                      <option value="cash">Cash Returned to Customer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Refund Reference / UTR
                    </label>
                    <input
                      type="text"
                      value={refundTxnId}
                      onChange={(e) => setRefundTxnId(e.target.value)}
                      placeholder="e.g. UTR-30491823"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Refund Reason & Audit Compliance Note *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Excess balance refunded to customer's UPI ID upon cancellation of item..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRefundModalTransaction(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRefund}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-600/30 disabled:opacity-50"
                  >
                    {isSubmittingRefund ? 'Processing...' : 'Confirm & Authorize Refund'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: PRINT PAYMENT SUMMARY DOCUMENT ─── */}
      <AnimatePresence>
        {printModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
              id="admin-printable-order"
            >
              {/* Header Action Bar (Hidden in Print) */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 print:hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Official Order & Payment Voucher Document</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintModalOrder(null)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Header */}
              <div className="border-b border-gray-200 pb-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-emerald-900 tracking-tight flex items-center gap-2">
                      <span>🌿</span>
                      <span>{settings.businessName || 'Sudha Swagruha Foods'}</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                      {settings.businessAddress || 'Governorpet, Vijayawada, Andhra Pradesh - 520002'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Phone: +91 {settings.businessPhone || '9876543210'} • Email: info@sudhaswagruhafoods.com
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase">
                      Payment Voucher
                    </span>
                    <p className="text-lg font-black font-mono text-gray-900 mt-2">
                      #{printModalOrder.order_number}
                    </p>
                    <p className="text-xs text-gray-500">
                      Date: {new Date(printModalOrder.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer & Delivery Information */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-500 mb-1 text-[11px]">
                    Customer Details
                  </h4>
                  <p className="font-bold text-gray-900">{printModalOrder.customer_name}</p>
                  <p className="text-gray-600">Mobile: +91 {printModalOrder.customer_mobile || '—'}</p>
                  {printModalOrder.customer_email && (
                    <p className="text-gray-600">Email: {printModalOrder.customer_email}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-500 mb-1 text-[11px]">
                    Delivery Address
                  </h4>
                  <p className="text-gray-800 leading-relaxed">
                    {printModalOrder.delivery_address?.house_no && `${printModalOrder.delivery_address.house_no}, `}
                    {printModalOrder.delivery_address?.street && `${printModalOrder.delivery_address.street}, `}
                    {printModalOrder.delivery_address?.city || 'Vijayawada'},{' '}
                    {printModalOrder.delivery_address?.state || 'Andhra Pradesh'} -{' '}
                    {printModalOrder.delivery_address?.pincode || '520002'}
                  </p>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              {(() => {
                const fin = calculateOrderFinancials(printModalOrder);
                const b = calculateOrderPaymentBreakdown(printModalOrder);
                return (
                  <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] pb-1 border-b border-emerald-200">
                      Verified Financial Breakdown
                    </h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-gray-700">
                      <div className="flex justify-between">
                        <span>Original Product Subtotal:</span>
                        <span className="font-mono font-bold text-gray-900">
                          ₹{fin.originalSubtotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Successfully Paid:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          ₹{b.totalAmountReceived.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Discounts Applied:</span>
                        <span className="font-mono font-bold">
                          -₹{fin.totalDiscount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance Amount Due:</span>
                        <span className="font-mono font-bold text-amber-700">
                          ₹{b.balanceAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery / Shipping:</span>
                        <span className="font-mono">
                          {fin.shippingAmount === 0 ? 'FREE' : `₹${fin.shippingAmount.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Excess Amount:</span>
                        <span className="font-mono font-bold text-purple-700">
                          ₹{b.excessAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-emerald-200 pt-1 text-gray-900">
                        <span>Final Amount Payable:</span>
                        <span className="font-mono text-emerald-900 text-sm">
                          ₹{fin.finalOrderTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-emerald-200 pt-1">
                        <span>Payment Status:</span>
                        <span className="uppercase text-emerald-800">{b.paymentStatus}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Transactions List */}
              {Array.isArray(printModalOrder.payments) && printModalOrder.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Payment Transaction Records
                  </h4>
                  <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden font-mono text-[11px]">
                    <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200 font-sans">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Reference ID</th>
                        <th className="p-2">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {printModalOrder.payments.map((p, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-gray-600">
                            {new Date(p.paid_at || p.payment_date || p.created_at || Date.now()).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-700">
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 uppercase text-gray-800">{p.payment_method || 'manual'}</td>
                          <td className="p-2 text-gray-600">{p.transaction_id || p.reference || '—'}</td>
                          <td className="p-2 text-gray-600 font-sans">{p.recorded_by || 'Admin'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-4 border-t border-gray-200 text-xs text-gray-500">
                <p className="font-semibold text-gray-700">Thank you for ordering with Sudha Swagruha Foods!</p>
                <p className="text-[11px] mt-0.5">
                  Handcrafted with pure ghee, authentic spices, and hygienic traditional recipes.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
