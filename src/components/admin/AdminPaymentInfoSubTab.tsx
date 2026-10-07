// ============================================================
// Admin Console - Payment Info Tab & Comprehensive Ledger
// Sections 1, 2, 3, 4, 5, 6, 12, 13, 14, 15, 16, 17
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
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import type { DbOrder, OrderPaymentRecord, OrderRefundRecord } from '@/services/supabase';
import {
  calculateOrderPaymentBreakdown,
  type OrderPaymentBreakdown,
} from '@/services/paymentCalculationService';
import toast from 'react-hot-toast';

export default function AdminPaymentInfoSubTab({
  onSelectOrder,
}: {
  onSelectOrder?: (order: DbOrder) => void;
}) {
  const { orders, recordOrderPayment, processExcessRefund } = useOrderStore();
  const { settings } = useSettingsStore();
  const { currentUser, hasPermission } = useAdminAuthStore();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Modal States
  const [paymentModalOrder, setPaymentModalOrder] = useState<DbOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [paymentTxnId, setPaymentTxnId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [historyModalOrder, setHistoryModalOrder] = useState<DbOrder | null>(null);

  const [refundModalOrder, setRefundModalOrder] = useState<DbOrder | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<string>('upi');
  const [refundTxnId, setRefundTxnId] = useState<string>('');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const [printModalOrder, setPrintModalOrder] = useState<DbOrder | null>(null);

  // Compute breakdown for all orders
  const ordersWithBreakdown = useMemo(() => {
    return orders.map((order) => {
      const breakdown = calculateOrderPaymentBreakdown(order);
      return {
        order,
        breakdown,
      };
    });
  }, [orders]);

  // Section 12: Orders Dashboard KPI Summary Cards
  const kpiStats = useMemo(() => {
    let totalOrders = orders.length;
    let pendingOrders = 0;
    let processingOrders = 0;
    let shippedOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;

    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let excessCount = 0;
    let refundPendingCount = 0;
    let refundPendingAmount = 0;

    for (const { order, breakdown } of ordersWithBreakdown) {
      if (order.order_status === 'placed') pendingOrders++;
      else if (order.order_status === 'confirmed' || order.order_status === 'preparing' || order.order_status === 'packed')
        processingOrders++;
      else if (order.order_status === 'shipped') shippedOrders++;
      else if (order.order_status === 'delivered') deliveredOrders++;
      else if (order.order_status === 'cancelled') cancelledOrders++;

      if (breakdown.paymentStatus === 'FULLY PAID') fullyPaidCount++;
      else if (breakdown.paymentStatus === 'PARTIALLY PAID') partiallyPaidCount++;
      else if (breakdown.paymentStatus === 'EXCESS AMOUNT') excessCount++;

      if (breakdown.refundStatus === 'REFUND PENDING') {
        refundPendingCount++;
        refundPendingAmount += breakdown.excessAmount - breakdown.totalRefundedAmount;
      }
    }

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      fullyPaidCount,
      partiallyPaidCount,
      excessCount,
      refundPendingCount,
      refundPendingAmount,
    };
  }, [ordersWithBreakdown]);

  // Filtered List
  const filteredOrders = useMemo(() => {
    return ordersWithBreakdown.filter(({ order, breakdown }) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = order.order_number.toLowerCase().includes(q);
        const matchesName = (order.customer_name || '').toLowerCase().includes(q);
        const matchesPhone = (order.customer_mobile || order.customer_phone || '').includes(q);
        const matchesTxn = (order.payments || []).some((p) =>
          (p.transaction_id || p.reference || '').toLowerCase().includes(q)
        );
        if (!matchesNumber && !matchesName && !matchesPhone && !matchesTxn) return false;
      }

      // 2. Payment Status Filter
      if (paymentStatusFilter !== 'all' && breakdown.paymentStatus !== paymentStatusFilter) {
        return false;
      }

      // 3. Refund Status Filter
      if (refundStatusFilter !== 'all' && breakdown.refundStatus !== refundStatusFilter) {
        return false;
      }

      // 4. Payment Method Filter
      if (methodFilter !== 'all') {
        const hasMethod = (order.payments || []).some(
          (p) => (p.payment_method || '').toLowerCase() === methodFilter.toLowerCase()
        );
        if (!hasMethod) return false;
      }

      // 5. Date Filter
      if (dateFilter !== 'all') {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        if (dateFilter === 'today') {
          if (orderDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'yesterday') {
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          if (orderDate.toDateString() !== yest.toDateString()) return false;
        } else if (dateFilter === 'last_7_days') {
          const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateFilter === 'this_month') {
          if (
            orderDate.getMonth() !== now.getMonth() ||
            orderDate.getFullYear() !== now.getFullYear()
          )
            return false;
        }
      }

      return true;
    });
  }, [ordersWithBreakdown, searchQuery, paymentStatusFilter, refundStatusFilter, methodFilter, dateFilter]);

  // Handlers for Modals
  const openAddPaymentModal = (order: DbOrder) => {
    const breakdown = calculateOrderPaymentBreakdown(order);
    setPaymentModalOrder(order);
    setPaymentAmount(breakdown.balanceAmount > 0 ? String(breakdown.balanceAmount) : '');
    setPaymentMethod('upi');
    setPaymentTxnId(`TXN-${Date.now().toString().slice(-6)}`);
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setPaymentNotes('');
  };

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
      } else {
        toast.error(res.error || 'Failed to record payment');
      }
    } catch {
      toast.error('An unexpected error occurred while saving payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openRefundModal = (order: DbOrder) => {
    const breakdown = calculateOrderPaymentBreakdown(order);
    const maxRefund = Math.max(0, breakdown.excessAmount - breakdown.totalRefundedAmount);

    setRefundModalOrder(order);
    setRefundAmount(maxRefund > 0 ? String(maxRefund) : '');
    setRefundMethod('upi');
    setRefundTxnId(`REF-${Date.now().toString().slice(-6)}`);
    setRefundNotes('Excess payment refund');
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOrder) return;

    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const res = await processExcessRefund(refundModalOrder.id, {
        amount: amt,
        refundMethod,
        transactionId: refundTxnId.trim() || undefined,
        refundDate: new Date().toISOString(),
        notes: refundNotes.trim() || undefined,
        processedBy: currentUser?.full_name || 'Admin',
        processedByRole: currentUser?.role || 'ROOT_ADMIN',
      });

      if (res.success && res.order) {
        toast.success(`Refund of ₹${amt.toLocaleString('en-IN')} processed successfully!`);
        setRefundModalOrder(null);
      } else {
        toast.error(res.error || 'Failed to process refund');
      }
    } catch {
      toast.error('Failed to process refund');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-400" />
            <span>Orders Payment Management & Financial Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage multi-entry payments, cancellation-adjusted totals, excess refunds & live customer sync.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-300 font-mono">
            {filteredOrders.length} Orders Listed
          </span>
        </div>
      </div>

      {/* ─── Section 12: Orders Dashboard Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block text-[11px] font-semibold uppercase">Total</span>
          <span className="text-xl font-bold font-mono text-white mt-1 block">
            {kpiStats.totalOrders}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-blue-400 block text-[11px] font-semibold uppercase">Pending</span>
          <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
            {kpiStats.pendingOrders}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-amber-400 block text-[11px] font-semibold uppercase">Processing</span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
            {kpiStats.processingOrders}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-purple-400 block text-[11px] font-semibold uppercase">Shipped</span>
          <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
            {kpiStats.shippedOrders}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-emerald-400 block text-[11px] font-semibold uppercase">Delivered</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
            {kpiStats.deliveredOrders}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-red-400 block text-[11px] font-semibold uppercase">Cancelled</span>
          <span className="text-xl font-bold font-mono text-red-400 mt-1 block">
            {kpiStats.cancelledOrders}
          </span>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3">
          <span className="text-emerald-300 block text-[11px] font-semibold uppercase">Fully Paid</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
            {kpiStats.fullyPaidCount}
          </span>
        </div>

        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3">
          <span className="text-amber-300 block text-[11px] font-semibold uppercase">Partially Paid</span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
            {kpiStats.partiallyPaidCount}
          </span>
        </div>

        <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-3">
          <span className="text-red-300 block text-[11px] font-semibold uppercase">Refund Pending</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-red-400 block">
              {kpiStats.refundPendingCount}
            </span>
            {kpiStats.refundPendingAmount > 0 && (
              <span className="text-[10px] text-red-300 font-mono">
                ₹{kpiStats.refundPendingAmount.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order #, Customer, Phone, Txn ID..."
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

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Payment Status: All</option>
              <option value="FULLY PAID">Fully Paid</option>
              <option value="PARTIALLY PAID">Partially Paid</option>
              <option value="EXCESS AMOUNT">Excess Amount</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>

          {/* Refund Status Filter */}
          <div>
            <select
              value={refundStatusFilter}
              onChange={(e) => setRefundStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Refund Status: All</option>
              <option value="REFUND PENDING">Refund Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="NO REFUND">No Refund Needed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Section 13: Searchable and Filterable Payment Info Table ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Order #</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5 text-right">Original Total</th>
                <th className="py-3 px-3.5 text-right">Cancelled</th>
                <th className="py-3 px-3.5 text-right">Adjusted Total</th>
                <th className="py-3 px-3.5 text-right">Paid</th>
                <th className="py-3 px-3.5 text-right">Balance</th>
                <th className="py-3 px-3.5 text-right">Excess</th>
                <th className="py-3 px-3.5 text-right">Refund</th>
                <th className="py-3 px-3.5 text-center">Payment Status</th>
                <th className="py-3 px-3.5 text-center">Refund Status</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(({ order, breakdown }) => {
                  const statusBg =
                    breakdown.paymentStatus === 'FULLY PAID'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : breakdown.paymentStatus === 'PARTIALLY PAID'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : breakdown.paymentStatus === 'EXCESS AMOUNT'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600/30';

                  const refundBg =
                    breakdown.refundStatus === 'REFUND PENDING'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                      : breakdown.refundStatus === 'REFUNDED'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800/40 text-slate-500 border-slate-700/30';

                  const canRefund =
                    currentUser?.role === 'ROOT_ADMIN' ||
                    !currentUser ||
                    currentUser?.role !== 'ORDER_PROCESSOR';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors group text-slate-300"
                    >
                      {/* Order Number */}
                      <td className="py-3 px-3.5 font-mono font-bold text-white whitespace-nowrap">
                        <button
                          onClick={() => onSelectOrder?.(order)}
                          className="hover:text-emerald-400 transition-colors text-left"
                          title="Click to view full order"
                        >
                          {order.order_number}
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <p className="font-semibold text-white truncate max-w-[140px]">
                          {order.customer_name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {order.customer_mobile || order.customer_phone || '—'}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>

                      {/* Original Total */}
                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-300">
                        ₹{breakdown.originalOrderTotal.toLocaleString('en-IN')}
                      </td>

                      {/* Cancelled Amount */}
                      <td className="py-3 px-3.5 text-right font-mono">
                        {breakdown.cancelledItemsTotal > 0 ? (
                          <span className="text-red-400 font-semibold">
                            -₹{breakdown.cancelledItemsTotal.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-600">₹0</span>
                        )}
                      </td>

                      {/* Adjusted Total */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-white bg-slate-950/30">
                        ₹{breakdown.adjustedOrderTotal.toLocaleString('en-IN')}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-3.5 text-right font-mono font-semibold text-emerald-400">
                        ₹{breakdown.totalAmountReceived.toLocaleString('en-IN')}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-3.5 text-right font-mono font-semibold">
                        {breakdown.balanceAmount > 0 ? (
                          <span className="text-amber-400">
                            ₹{breakdown.balanceAmount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-600">₹0</span>
                        )}
                      </td>

                      {/* Excess */}
                      <td className="py-3 px-3.5 text-right font-mono font-semibold">
                        {breakdown.excessAmount > 0 ? (
                          <span className="text-purple-400">
                            ₹{breakdown.excessAmount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-600">₹0</span>
                        )}
                      </td>

                      {/* Refund */}
                      <td className="py-3 px-3.5 text-right font-mono font-semibold">
                        {breakdown.totalRefundedAmount > 0 ? (
                          <span className="text-cyan-400">
                            ₹{breakdown.totalRefundedAmount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-600">₹0</span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBg}`}
                        >
                          {breakdown.paymentStatus}
                        </span>
                      </td>

                      {/* Refund Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${refundBg}`}
                        >
                          {breakdown.refundStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Add Payment */}
                          <button
                            onClick={() => openAddPaymentModal(order)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
                            title="Add Payment Transaction"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Payment History */}
                          <button
                            onClick={() => setHistoryModalOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="View Payment History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Process Refund (if excess exists) */}
                          {breakdown.excessAmount > breakdown.totalRefundedAmount && (
                            <button
                              onClick={() => {
                                if (!canRefund) {
                                  toast.error(
                                    'Order Processors are not authorized to process refunds. Administrator approval required.'
                                  );
                                  return;
                                }
                                openRefundModal(order);
                              }}
                              className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition-colors"
                              title="Process Excess Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print / Download PDF */}
                          <button
                            onClick={() => setPrintModalOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Print / Download Order Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
      </div>

      {/* ─── MODAL 1: ADD PAYMENT ENTRY ─────────────────────────────────── */}
      <AnimatePresence>
        {paymentModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-emerald-400" />
                    Record New Payment Transaction
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{paymentModalOrder.order_number} • {paymentModalOrder.customer_name}
                  </p>
                </div>
                <button
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
                      <option value="other">Other Manual Method</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Transaction / Reference ID
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
                    Internal Notes / Comments
                  </label>
                  <textarea
                    rows={2}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Partial advance collected at shop counter..."
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

      {/* ─── MODAL 2: PAYMENT HISTORY ───────────────────────────────────── */}
      <AnimatePresence>
        {historyModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-400" />
                    Payment & Refund Audit History
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{historyModalOrder.order_number} • Customer: {historyModalOrder.customer_name}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryModalOrder(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Transactions Table */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recorded Payment Entries (
                  {Array.isArray(historyModalOrder.payments) ? historyModalOrder.payments.length : 0})
                </h4>

                {(!historyModalOrder.payments || historyModalOrder.payments.length === 0) ? (
                  <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-500">
                    No individual payment entries recorded yet.
                    {historyModalOrder.payment_status === 'paid' && (
                      <p className="text-emerald-400 mt-1">
                        (Marked paid during checkout: ₹{historyModalOrder.total.toLocaleString('en-IN')})
                      </p>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs bg-slate-950 rounded-xl overflow-hidden">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Reference ID</th>
                        <th className="p-2.5">Added By</th>
                        <th className="p-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {historyModalOrder.payments.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-900/50">
                          <td className="p-2.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                            {new Date(p.paid_at || p.payment_date || p.created_at || Date.now()).toLocaleString(
                              'en-IN',
                              { dateStyle: 'short', timeStyle: 'short' }
                            )}
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
                          <td className="p-2.5 text-slate-300 truncate max-w-[100px]">
                            {p.recorded_by || 'Admin'}
                          </td>
                          <td className="p-2.5 text-slate-400 text-[11px] truncate max-w-[120px]">
                            {p.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Refund Entries if any */}
                {Array.isArray(historyModalOrder.refunds) && historyModalOrder.refunds.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                      Processed Refunds ({historyModalOrder.refunds.length})
                    </h4>
                    <table className="w-full text-left text-xs bg-slate-950 rounded-xl overflow-hidden">
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
                        {historyModalOrder.refunds.map((r, idx) => (
                          <tr key={r.id || idx} className="hover:bg-slate-900/50">
                            <td className="p-2.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                              {new Date(r.completed_at || r.requested_at).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-cyan-400 whitespace-nowrap">
                              -₹{Number(r.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 uppercase font-semibold text-slate-300">
                              {r.provider}
                            </td>
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
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  onClick={() => setHistoryModalOrder(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: PROCESS REFUND ────────────────────────────────────── */}
      <AnimatePresence>
        {refundModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-cyan-400" />
                    Mark Excess Refund Processed
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{refundModalOrder.order_number} • {refundModalOrder.customer_name}
                  </p>
                </div>
                <button
                  onClick={() => setRefundModalOrder(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Excess Breakdown */}
              {(() => {
                const b = calculateOrderPaymentBreakdown(refundModalOrder);
                const maxAllowed = Math.max(0, b.excessAmount - b.totalRefundedAmount);
                return (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Received:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        ₹{b.totalAmountReceived.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Adjusted Order Total:</span>
                      <span className="font-mono text-white font-bold">
                        ₹{b.adjustedOrderTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-purple-300 font-bold">Excess / Refund Required:</span>
                      <span className="font-mono text-purple-400 font-bold">
                        ₹{maxAllowed.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })()}

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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Cannot exceed remaining calculated excess amount.
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
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="upi">UPI Return</option>
                      <option value="bank_transfer">Bank Transfer (IMPS/NEFT)</option>
                      <option value="cash">Cash Given Back</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Refund Ref / UTR
                    </label>
                    <input
                      type="text"
                      value={refundTxnId}
                      onChange={(e) => setRefundTxnId(e.target.value)}
                      placeholder="e.g. UTR-30491823"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Refund Notes
                  </label>
                  <textarea
                    rows={2}
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    placeholder="e.g. Refunded via GPay to customer's mobile number..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRefundModalOrder(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRefund}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 disabled:opacity-50"
                  >
                    {isSubmittingRefund ? 'Processing...' : 'Mark Refund Processed'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 4: SECTION 10 ADMIN PRINT / DOWNLOAD ORDER ────────── */}
      <AnimatePresence>
        {printModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
              id="admin-printable-order"
            >
              {/* Header Action Bar (Hidden in Print) */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 print:hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Admin Order & Financial Summary Document</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button
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
                      Official Order Summary
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
                    {printModalOrder.delivery_address?.area && `${printModalOrder.delivery_address.area}, `}
                    {printModalOrder.delivery_address?.city || 'Vijayawada'},{' '}
                    {printModalOrder.delivery_address?.state || 'Andhra Pradesh'} -{' '}
                    {printModalOrder.delivery_address?.pincode || '520002'}
                  </p>
                  <p className="text-gray-600 mt-1 font-semibold">
                    Status: <span className="uppercase text-emerald-700">{printModalOrder.order_status}</span>
                  </p>
                </div>
              </div>

              {/* Order Items Details Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Order Items
                </h4>
                <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Weight / Pack</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(printModalOrder.items || []).map((it, idx) => {
                      const isCancelled = it.status === 'cancelled' || it.status === 'removed';
                      return (
                        <tr key={idx} className={isCancelled ? 'bg-red-50/60 opacity-80' : ''}>
                          <td className="p-2.5 font-medium text-gray-900">
                            {it.product_name_en}
                            {isCancelled && (
                              <span className="ml-2 text-[10px] text-red-600 font-bold uppercase">
                                [Cancelled]
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-gray-600">{it.weight}</td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isCancelled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {it.status || 'active'}
                            </span>
                          </td>
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

              {/* Payment Summary Box (Section 10) */}
              {(() => {
                const b = calculateOrderPaymentBreakdown(printModalOrder);
                return (
                  <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] pb-1 border-b border-emerald-200">
                      Financial Breakdown & Reconciliation
                    </h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-gray-700">
                      <div className="flex justify-between">
                        <span>Original Order Total:</span>
                        <span className="font-mono font-bold text-gray-900">
                          ₹{b.originalOrderTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Already Paid:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          ₹{b.totalAmountReceived.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cancelled Items Total:</span>
                        <span className="font-mono font-bold text-red-600">
                          -₹{b.cancelledItemsTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance Amount Due:</span>
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
                        <span className="uppercase text-cyan-800">
                          {b.refundStatus} {b.totalRefundedAmount > 0 && `(₹${b.totalRefundedAmount})`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Payment History Table in Document */}
              {Array.isArray(printModalOrder.payments) && printModalOrder.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Payment Transaction History
                  </h4>
                  <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                    <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Reference ID</th>
                        <th className="p-2">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
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
