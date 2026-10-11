// ============================================================
// Dedicated Top-Level Payments Module (Prompt Sections 7, 8, 9, 10, 11)
// Centralized financial management across orders:
// 1. Payment Overview (KPI summary cards & collection metrics)
// 2. All Transactions (Searchable payments & refunds table)
// 3. Refund Management (Consolidated refunds & manual settlements)
// 4. Payment Ledger (Chronological auditable debit/credit double-entry history)
// 5. Reconciliation (DB Stored vs Recalculated discrepancies)
// ============================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  IndianRupee,
  RotateCcw,
  BookOpen,
  Scale,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  FileSpreadsheet,
  Check,
  X,
  PlusCircle,
  TrendingUp,
  Receipt,
  User,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import {
  calculateOrderFinancials,
  roundToTwo,
  type OrderFinancialSummary,
} from '@/services/orderCalculationService';
import {
  calculateOrderPaymentBreakdown,
  type OrderPaymentBreakdown,
} from '@/services/paymentCalculationService';
import { AdminReconciliationTab } from './AdminReconciliationTab';
import type { DbOrder, OrderPaymentRecord, OrderRefundRecord } from '@/services/supabase';
import { logAdminAction } from '@/services/auditLogger';
import toast from 'react-hot-toast';

export type PaymentsSubTab = 'overview' | 'transactions' | 'refunds' | 'ledger' | 'reconciliation';

interface LedgerRow {
  entryId: string;
  date: string;
  timestamp: number;
  orderNumber: string;
  orderId: string;
  customerName: string;
  transactionType: 'PAYMENT_RECEIVED' | 'REFUND_COMPLETED' | 'PAYMENT_PENDING' | 'PAYMENT_FAILED' | 'REFUND_PENDING';
  paymentMethod: string;
  referenceId: string;
  description: string;
  debit: number; // decreases collections (refund)
  credit: number; // increases collections (payment)
  runningBalance: number;
  status: string;
  createdBy: string;
}

interface ConsolidatedRefundItem {
  refundId: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  cancelledItem: string;
  grossItemValue: number;
  allocatedDiscount: number;
  refundableAmount: number;
  refundAmount: number;
  refundMethod: string;
  refundReference: string;
  refundStatus: 'REFUND PENDING' | 'REFUND PROCESSING' | 'REFUNDED' | 'REFUND FAILED';
  refundReason: string;
  requestedDate: string;
  processedDate?: string;
  processedBy?: string;
  order: DbOrder;
}

export default function AdminPaymentsModule({
  onSelectOrder,
}: {
  onSelectOrder?: (order: DbOrder) => void;
}) {
  const { orders, processExcessRefund, recordOrderPayment } = useOrderStore();
  const { settings } = useSettingsStore();
  const { currentUser, hasPermission } = useAdminAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<PaymentsSubTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Detail Modal State
  const [selectedTxnOrder, setSelectedTxnOrder] = useState<DbOrder | null>(null);

  // Manual Refund Processing Modal
  const [processRefundTarget, setProcessRefundTarget] = useState<ConsolidatedRefundItem | null>(null);
  const [refundFormAmount, setRefundFormAmount] = useState<string>('');
  const [refundFormMethod, setRefundFormMethod] = useState<string>('upi');
  const [refundFormRefId, setRefundFormRefId] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // ─── 1. Build Chronological Auditable Ledger ──────────────────────
  const ledgerEntries: LedgerRow[] = useMemo(() => {
    const rawRows: Omit<LedgerRow, 'runningBalance'>[] = [];

    for (const order of orders) {
      const customer = order.customer_name || 'Customer';
      const orderDate = new Date(order.created_at).toISOString();
      const orderTimestamp = new Date(order.created_at).getTime();

      // Process Payments
      if (Array.isArray(order.payments) && order.payments.length > 0) {
        for (const p of order.payments) {
          const amt = roundToTwo(Number(p.amount || 0));
          const pDate = p.paid_at || p.created_at || orderDate;
          const pTs = new Date(pDate).getTime() || orderTimestamp;
          const isSuccess = p.status === 'success' || !p.status;

          rawRows.push({
            entryId: `LEDG-PAY-${p.id || p.payment_id || Math.random().toString(36).slice(2, 7)}`,
            date: pDate,
            timestamp: pTs,
            orderNumber: order.order_number,
            orderId: order.id,
            customerName: customer,
            transactionType: isSuccess
              ? 'PAYMENT_RECEIVED'
              : p.status === 'pending'
              ? 'PAYMENT_PENDING'
              : 'PAYMENT_FAILED',
            paymentMethod: (p.payment_method || p.provider || 'UPI').toUpperCase(),
            referenceId: p.transaction_id || p.reference || order.payment_id || '—',
            description: `Customer payment received for Order #${order.order_number}`,
            debit: 0,
            credit: isSuccess ? amt : 0,
            status: (p.status || 'success').toUpperCase(),
            createdBy: p.recorded_by || 'Payment Gateway',
          });
        }
      } else if (order.payment_status === 'paid' || order.amount_paid) {
        // Fallback for legacy single-payment orders
        const amt = roundToTwo(Number(order.amount_paid || order.total || 0));
        rawRows.push({
          entryId: `LEDG-LEG-${order.id}`,
          date: orderDate,
          timestamp: orderTimestamp,
          orderNumber: order.order_number,
          orderId: order.id,
          customerName: customer,
          transactionType: 'PAYMENT_RECEIVED',
          paymentMethod: ((order as any).payment_method || 'UPI').toUpperCase(),
          referenceId: order.payment_id || (order as any).razorpay_payment_id || '—',
          description: `Full payment captured for Order #${order.order_number}`,
          debit: 0,
          credit: amt,
          status: 'SUCCESS',
          createdBy: 'Order Checkout',
        });
      }

      // Process Refunds
      if (Array.isArray(order.refunds) && order.refunds.length > 0) {
        for (const r of order.refunds) {
          const rAmt = roundToTwo(Number(r.amount || 0));
          const rDate = r.completed_at || r.requested_at || orderDate;
          const rTs = new Date(rDate).getTime() || orderTimestamp;
          const isSettled = r.status === 'success';

          rawRows.push({
            entryId: `LEDG-REF-${r.id || Math.random().toString(36).slice(2, 7)}`,
            date: rDate,
            timestamp: rTs,
            orderNumber: order.order_number,
            orderId: order.id,
            customerName: customer,
            transactionType: isSettled ? 'REFUND_COMPLETED' : 'REFUND_PENDING',
            paymentMethod: ((r as any).method || r.provider || 'UPI').toUpperCase(),
            referenceId: r.provider_refund_id || (r as any).reference || '—',
            description: `Refund for Order #${order.order_number}: ${r.reason || 'Excess/Cancellation'}`,
            debit: isSettled ? rAmt : 0,
            credit: 0,
            status: r.status.toUpperCase(),
            createdBy: (r as any).processed_by || r.requested_by || 'Admin',
          });
        }
      }
    }

    // Sort ascending by time to calculate chronological running balance
    rawRows.sort((a, b) => a.timestamp - b.timestamp);

    let currentBalance = 0;
    const finalLedger: LedgerRow[] = [];
    for (const r of rawRows) {
      currentBalance = roundToTwo(currentBalance + r.credit - r.debit);
      finalLedger.push({
        ...r,
        runningBalance: currentBalance,
      });
    }

    // Return in reverse chronological order for UI display
    return finalLedger.reverse();
  }, [orders]);

  // ─── 2. Build Consolidated Refunds List (Prompt Section 10) ──────
  const consolidatedRefunds: ConsolidatedRefundItem[] = useMemo(() => {
    const list: ConsolidatedRefundItem[] = [];

    for (const order of orders) {
      const fin = calculateOrderFinancials(order);
      const pb = calculateOrderPaymentBreakdown(order);

      // Check existing refund records
      if (Array.isArray(order.refunds) && order.refunds.length > 0) {
        for (const r of order.refunds) {
          list.push({
            refundId: r.id || `REF-${order.order_number}`,
            orderNumber: order.order_number,
            orderId: order.id,
            customerName: order.customer_name || 'Customer',
            customerPhone: order.customer_mobile || order.customer_phone || '',
            cancelledItem: (r as any).items_cancelled ? (r as any).items_cancelled.join(', ') : 'Cancelled Item(s)',
            grossItemValue: fin.cancelledAmount,
            allocatedDiscount: fin.cancelledAllocatedDiscount || 0,
            refundableAmount: fin.refundableCancelledAmount || r.amount,
            refundAmount: r.amount,
            refundMethod: ((r as any).method || r.provider || 'UPI').toUpperCase(),
            refundReference: r.provider_refund_id || (r as any).reference || '—',
            refundStatus:
              r.status === 'success'
                ? 'REFUNDED'
                : r.status === 'processing'
                ? 'REFUND PROCESSING'
                : r.status === 'failed'
                ? 'REFUND FAILED'
                : 'REFUND PENDING',
            refundReason: r.reason || 'Item Cancellation',
            requestedDate: r.requested_at,
            processedDate: r.completed_at || r.processed_at || undefined,
            processedBy: (r as any).processed_by || r.requested_by,
            order,
          });
        }
      }

      // Check pending refund due from financial engine (e.g. excess amount not yet refunded)
      if (fin.pendingRefundAmount > 0) {
        // Only add if not already covered in refunds array
        const hasMatchingRecord =
          Array.isArray(order.refunds) &&
          order.refunds.some((r) => r.status === 'pending' || r.status === 'processing');
        if (!hasMatchingRecord) {
          list.push({
            refundId: `PEND-REF-${order.id.slice(0, 6)}`,
            orderNumber: order.order_number,
            orderId: order.id,
            customerName: order.customer_name || 'Customer',
            customerPhone: order.customer_mobile || order.customer_phone || '',
            cancelledItem: 'Order Modification / Cancellation',
            grossItemValue: fin.cancelledAmount,
            allocatedDiscount: fin.cancelledAllocatedDiscount || 0,
            refundableAmount: fin.pendingRefundAmount,
            refundAmount: fin.pendingRefundAmount,
            refundMethod: 'PENDING SETTLEMENT',
            refundReference: 'NEEDS_PROCESSING',
            refundStatus: 'REFUND PENDING',
            refundReason: 'Excess payment due to item cancellation',
            requestedDate: order.created_at,
            order,
          });
        }
      }
    }

    return list.sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
  }, [orders]);

  // ─── 3. Overview Dashboard KPI Calculations (Prompt Section 8) ───
  const kpis = useMemo(() => {
    let totalSuccessfulCollections = 0;
    let todayCollections = 0;
    let paymentsPending = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;
    let excessPaymentAmount = 0;
    let refundsPendingCount = 0;
    let refundsPendingAmount = 0;
    let refundsCompletedAmount = 0;
    let failedTransactionsCount = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const order of orders) {
      const fin = calculateOrderFinancials(order);
      const pb = calculateOrderPaymentBreakdown(order);

      // Successful Collections
      totalSuccessfulCollections += fin.totalAmountReceived;

      // Today's Collections
      if (new Date(order.created_at) >= startOfToday) {
        todayCollections += fin.totalAmountReceived;
      }

      // Payment Status
      if (pb.paymentStatus === 'FULLY PAID') {
        fullyPaidCount++;
      } else if (pb.paymentStatus === 'PARTIALLY PAID') {
        partiallyPaidCount++;
        paymentsPending += pb.balanceAmount;
      } else if (pb.paymentStatus === 'EXCESS AMOUNT') {
        excessPaymentAmount += pb.excessAmount;
      } else if (pb.paymentStatus === 'UNPAID') {
        paymentsPending += pb.adjustedOrderTotal;
      }

      // Refunds
      if (fin.pendingRefundAmount > 0) {
        refundsPendingCount++;
        refundsPendingAmount += fin.pendingRefundAmount;
      }
      refundsCompletedAmount += fin.refundedAmount;

      // Failed checks in payments
      if (Array.isArray(order.payments)) {
        for (const p of order.payments) {
          if (p.status === 'failed') failedTransactionsCount++;
        }
      }
    }

    const netCollections = roundToTwo(totalSuccessfulCollections - refundsCompletedAmount);

    return {
      totalSuccessfulCollections: roundToTwo(totalSuccessfulCollections),
      todayCollections: roundToTwo(todayCollections),
      netCollections,
      paymentsPending: roundToTwo(paymentsPending),
      partiallyPaidCount,
      fullyPaidCount,
      excessPaymentAmount: roundToTwo(excessPaymentAmount),
      refundsPendingCount,
      refundsPendingAmount: roundToTwo(refundsPendingAmount),
      refundsCompletedAmount: roundToTwo(refundsCompletedAmount),
      failedTransactionsCount,
    };
  }, [orders]);

  // ─── Filtered Ledger / Transactions ──────────────────────────────
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((row) => {
      const matchesSearch =
        row.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.entryId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        paymentStatusFilter === 'all' ||
        (paymentStatusFilter === 'success' && (row.transactionType === 'PAYMENT_RECEIVED' || row.transactionType === 'REFUND_COMPLETED')) ||
        (paymentStatusFilter === 'pending' && (row.transactionType === 'PAYMENT_PENDING' || row.transactionType === 'REFUND_PENDING')) ||
        (paymentStatusFilter === 'failed' && row.transactionType === 'PAYMENT_FAILED');

      const matchesMethod =
        paymentMethodFilter === 'all' || row.paymentMethod === paymentMethodFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [ledgerEntries, searchQuery, paymentStatusFilter, paymentMethodFilter]);

  // ─── CSV Export of Payment Ledger (Prompt Section 11.3 & 15) ─────
  const handleExportLedgerCsv = () => {
    const headers = [
      'Ledger Entry ID',
      'Date',
      'Order Number',
      'Customer',
      'Transaction Type',
      'Payment Method',
      'Reference ID',
      'Credit (Collections)',
      'Debit (Refunds)',
      'Running Total',
      'Status',
      'Description',
      'Created By',
    ];

    const rows = filteredLedger.map((r) => [
      r.entryId,
      r.date,
      r.orderNumber,
      `"${r.customerName.replace(/"/g, '""')}"`,
      r.transactionType,
      r.paymentMethod,
      r.referenceId,
      r.credit.toFixed(2),
      r.debit.toFixed(2),
      r.runningBalance.toFixed(2),
      r.status,
      `"${r.description.replace(/"/g, '""')}"`,
      r.createdBy,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `swagruha_payment_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Payment Ledger exported to CSV');
  };

  // ─── Process Manual Refund Settlement (Prompt Section 10.3) ──────
  const handleExecuteManualRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processRefundTarget) return;

    const amt = parseFloat(refundFormAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    if (amt > processRefundTarget.refundableAmount) {
      toast.error(`Refund amount cannot exceed eligible balance of ₹${processRefundTarget.refundableAmount}`);
      return;
    }
    if (!refundFormRefId.trim()) {
      toast.error('Bank Reference / UTR Number is required for manual settlement');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      await processExcessRefund(processRefundTarget.orderId, {
        amount: amt,
        transactionId: refundFormRefId.trim(),
        refundMethod: refundFormMethod,
        processedBy: currentUser?.full_name || 'Finance Admin',
      });

      if (currentUser) {
        logAdminAction(
          currentUser.email,
          currentUser.role,
          'PROCESS_REFUND',
          'FINANCE',
          processRefundTarget.orderId,
          {
            amount: amt,
            orderNumber: processRefundTarget.orderNumber,
            method: refundFormMethod,
            reference: refundFormRefId.trim(),
          }
        );
      }

      toast.success(
        `Refund of ₹${amt} successfully recorded and settled for Order #${processRefundTarget.orderNumber}!`
      );
      setProcessRefundTarget(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to process refund');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Centralized Payments & Financial Administration</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Authoritative
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Central single source of truth for payment collections, refund settlements, auditable ledger, and reconciliation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLedgerCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Ledger CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Payment Overview', icon: TrendingUp },
          { id: 'transactions', label: 'All Transactions', icon: CreditCard },
          {
            id: 'refunds',
            label: 'Refund Management',
            icon: RotateCcw,
            badge: kpis.refundsPendingCount > 0 ? kpis.refundsPendingCount : undefined,
          },
          { id: 'ledger', label: 'Payment Ledger', icon: BookOpen },
          { id: 'reconciliation', label: 'Financial Audit & Reconciliation', icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as PaymentsSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: PAYMENT OVERVIEW DASHBOARD (Prompt Section 8)         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Successful Collections */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Collections Received
              </span>
              <p className="text-2xl font-black font-mono text-emerald-400">
                ₹{kpis.totalSuccessfulCollections.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500">Gross successful payments</p>
            </div>

            {/* Net Collections */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                Net Collections (After Refunds)
              </span>
              <p className="text-2xl font-black font-mono text-white">
                ₹{kpis.netCollections.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500">Collections minus completed refunds</p>
            </div>

            {/* Today's Collections */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                Today's Collections
              </span>
              <p className="text-2xl font-black font-mono text-cyan-300">
                ₹{kpis.todayCollections.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500">Collected since 00:00 AM</p>
            </div>

            {/* Payments Pending */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                Outstanding Balance Due
              </span>
              <p className="text-2xl font-black font-mono text-amber-300">
                ₹{kpis.paymentsPending.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500">Unpaid & partially paid balances</p>
            </div>

            {/* Fully Paid Orders */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Fully Paid Orders
              </span>
              <p className="text-2xl font-black font-mono text-white">
                {kpis.fullyPaidCount}
              </p>
              <p className="text-[10px] text-slate-500">100% settled orders</p>
            </div>

            {/* Partially Paid Orders */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Partially Paid Orders
              </span>
              <p className="text-2xl font-black font-mono text-blue-400">
                {kpis.partiallyPaidCount}
              </p>
              <p className="text-[10px] text-slate-500">Partial customer deposits</p>
            </div>

            {/* Refunds Pending */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 block">
                Pending Refunds ({kpis.refundsPendingCount})
              </span>
              <p className="text-2xl font-black font-mono text-red-400">
                ₹{kpis.refundsPendingAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500">Awaiting payout settlement</p>
            </div>

            {/* Refunds Completed */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block">
                Total Refunds Settled
              </span>
              <p className="text-2xl font-black font-mono text-purple-300">
                ₹{kpis.refundsCompletedAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500">Processed through bank/gateway</p>
            </div>
          </div>

          {/* Recent Collections Table */}
          <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Recent Financial Activity</span>
              </h3>
              <button
                onClick={() => setActiveSubTab('transactions')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Transactions</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-800 pb-2">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Order Number</th>
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {ledgerEntries.slice(0, 8).map((row) => (
                    <tr key={row.entryId} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                        {new Date(row.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white font-mono">
                        {row.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">
                        {row.customerName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${
                            row.credit > 0
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {row.credit > 0 ? 'PAYMENT' : 'REFUND'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 uppercase">
                        {row.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black">
                        {row.credit > 0 ? (
                          <span className="text-emerald-400">+₹{row.credit.toFixed(2)}</span>
                        ) : (
                          <span className="text-red-400">-₹{row.debit.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-slate-300 border border-slate-700">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: ALL TRANSACTIONS (Prompt Section 9)                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order number, customer name, transaction ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="success">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="all">All Methods</option>
                <option value="upi">UPI</option>
                <option value="razorpay">Razorpay</option>
                <option value="card">Card</option>
                <option value="netbanking">Net Banking</option>
                <option value="cash">Cash / Offline</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-slate-950/70 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 uppercase font-bold border-b border-slate-800 text-[10px]">
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Reference ID</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                        No transactions found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((row) => (
                      <tr key={row.entryId} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-bold font-mono text-[11px]">
                          {row.entryId.slice(0, 16)}
                        </td>
                        <td className="py-3 px-4 text-white font-bold">
                          {row.orderNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans">
                          {row.customerName}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                          {new Date(row.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.credit > 0
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {row.credit > 0 ? 'PAYMENT' : 'REFUND'}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase text-slate-300">
                          {row.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-right font-black">
                          {row.credit > 0 ? (
                            <span className="text-emerald-400">+₹{row.credit.toFixed(2)}</span>
                          ) : (
                            <span className="text-red-400">-₹{row.debit.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-slate-300 border border-slate-700">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs font-mono">
                          {row.referenceId}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <button
                            onClick={() => {
                              const ord = orders.find((o) => o.id === row.orderId);
                              if (ord) setSelectedTxnOrder(ord);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                            title="View Transaction Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 3: REFUND MANAGEMENT (Prompt Section 10)                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'refunds' && (
        <div className="space-y-4">
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Consolidated Refund Management</h3>
              <p className="text-xs text-slate-400">
                Track pending customer refunds, record executed bank payout UTRs, and prevent duplicate settlements.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Total Recorded: {consolidatedRefunds.length}
            </span>
          </div>

          <div className="bg-slate-950/70 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 uppercase font-bold border-b border-slate-800 text-[10px]">
                    <th className="py-3 px-4">Refund ID</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Reason / Item</th>
                    <th className="py-3 px-4 text-right">Gross Value</th>
                    <th className="py-3 px-4 text-right">Allocated Disc.</th>
                    <th className="py-3 px-4 text-right">Refund Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Reference / UTR</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {consolidatedRefunds.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                        No refund requests or processed settlements recorded.
                      </td>
                    </tr>
                  ) : (
                    consolidatedRefunds.map((ref) => (
                      <tr key={ref.refundId} className="hover:bg-slate-900/50">
                        <td className="py-3 px-4 font-mono text-slate-400 font-bold">
                          {ref.refundId.slice(0, 14)}
                        </td>
                        <td className="py-3 px-4 text-white font-bold">
                          {ref.orderNumber}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          {ref.customerName}
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {ref.customerPhone}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate">
                          {ref.refundReason}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          ₹{ref.grossItemValue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-400">
                          {ref.allocatedDiscount > 0 ? `-₹${ref.allocatedDiscount.toFixed(2)}` : '₹0.00'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-red-400 text-sm">
                          ₹{ref.refundAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ref.refundStatus === 'REFUNDED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : ref.refundStatus === 'REFUND PROCESSING'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : ref.refundStatus === 'REFUND FAILED'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {ref.refundStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] font-mono truncate max-w-xs">
                          {ref.refundReference}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          {ref.refundStatus === 'REFUND PENDING' ? (
                            <button
                              onClick={() => {
                                setProcessRefundTarget(ref);
                                setRefundFormAmount(String(ref.refundableAmount));
                                setRefundFormRefId('');
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Settle Refund
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 4: PAYMENT LEDGER (Prompt Section 11)                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Auditable Chronological Double-Entry Ledger</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Append-only financial transaction register with running balance tracking and full audit trails.
              </p>
            </div>
            <button
              onClick={handleExportLedgerCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-slate-950/70 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 uppercase font-bold border-b border-slate-800 text-[10px] font-sans">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Entry ID</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Debit (Refund)</th>
                    <th className="py-3 px-4 text-right">Credit (Receipt)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                    <th className="py-3 px-4 text-right">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLedger.map((row) => (
                    <tr key={row.entryId} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                        {new Date(row.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {row.entryId.slice(0, 16)}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {row.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {row.customerName}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate">
                        {row.description}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-400">
                        {row.debit > 0 ? `₹${row.debit.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {row.credit > 0 ? `₹${row.credit.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-white text-sm">
                        ₹{row.runningBalance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-sans text-slate-400 text-[11px]">
                        {row.createdBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 5: RECONCILIATION & AUDIT (Prompt Section 3.4 & 12)       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'reconciliation' && (
        <AdminReconciliationTab />
      )}

      {/* ─── MODAL: SETTLE MANUAL REFUND (Prompt Section 10.3) ──────── */}
      <AnimatePresence>
        {processRefundTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-emerald-400" />
                  <span>Settle Customer Refund</span>
                </h3>
                <button
                  onClick={() => setProcessRefundTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExecuteManualRefund} className="space-y-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-slate-400 font-sans">
                    Order Number: <strong className="text-white font-mono">{processRefundTarget.orderNumber}</strong>
                  </p>
                  <p className="text-slate-400 font-sans">
                    Customer: <strong className="text-white">{processRefundTarget.customerName}</strong>
                  </p>
                  <p className="text-slate-400 font-sans">
                    Eligible Refundable Balance:{' '}
                    <strong className="text-emerald-400 font-mono font-bold">
                      ₹{processRefundTarget.refundableAmount}
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Refund Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={processRefundTarget.refundableAmount}
                    value={refundFormAmount}
                    onChange={(e) => setRefundFormAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Refund Settlement Method *
                  </label>
                  <select
                    value={refundFormMethod}
                    onChange={(e) => setRefundFormMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="upi">UPI Transfer</option>
                    <option value="bank_neft">Bank NEFT / IMPS</option>
                    <option value="razorpay">Razorpay Gateway Refund</option>
                    <option value="cash">Cash / Offline Refund</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Bank Payout Reference / UTR Number *</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Audit Reference</span>
                  </label>
                  <input
                    type="text"
                    value={refundFormRefId}
                    onChange={(e) => setRefundFormRefId(e.target.value)}
                    placeholder="e.g. UTR329104829381 or RZP-REF-9812"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setProcessRefundTarget(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRefund}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingRefund ? 'Recording...' : 'Confirm & Settle Refund'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: TRANSACTION DETAILS DRAWER (Prompt Section 9) ─── */}
      <AnimatePresence>
        {selectedTxnOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">Transaction & Order Details</h3>
                <button
                  onClick={() => setSelectedTxnOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const fin = calculateOrderFinancials(selectedTxnOrder);
                const pb = calculateOrderPaymentBreakdown(selectedTxnOrder);
                return (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">Order Number</span>
                        <span className="font-bold text-white text-sm">{selectedTxnOrder.order_number}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">Customer</span>
                        <span className="font-bold text-white">{selectedTxnOrder.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">Original Subtotal</span>
                        <span className="font-bold text-white">₹{fin.originalSubtotal}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">Total Discount</span>
                        <span className="font-bold text-emerald-400">-₹{fin.totalDiscount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">Final Payable Total</span>
                        <span className="font-bold text-white text-base">₹{fin.finalOrderTotal}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">Amount Received</span>
                        <span className="font-bold text-emerald-400 text-base">₹{fin.totalAmountReceived}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-400">Payment Status</p>
                        <p className="font-bold text-white uppercase">{pb.paymentStatus}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Refund Status</p>
                        <p className="font-bold text-cyan-400 uppercase">{pb.refundStatus}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setSelectedTxnOrder(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
