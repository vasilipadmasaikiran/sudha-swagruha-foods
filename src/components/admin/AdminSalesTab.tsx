import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  XCircle,
  Calendar,
  IndianRupee,
  Receipt,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieChartIcon,
  Layers,
  Percent,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import { calculateOrderFinancials, roundToTwo } from '@/services/orderCalculationService';
import { exportOrdersToCsv } from '@/services/csvExportService';
import type { DbOrder } from '@/services/supabase';

type DateFilterRange =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'all'
  | 'custom';

export const AdminSalesTab: React.FC = () => {
  const orders = useOrderStore((state) => state.orders);
  const [dateFilter, setDateFilter] = useState<DateFilterRange>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter orders according to date and status rules
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at || Date.now());

      let inDateRange = true;
      if (dateFilter === 'today') {
        inDateRange = orderDate >= todayStart && orderDate <= todayEnd;
      } else if (dateFilter === 'yesterday') {
        inDateRange = orderDate >= yesterdayStart && orderDate <= yesterdayEnd;
      } else if (dateFilter === 'last_7_days') {
        inDateRange = orderDate >= sevenDaysAgo;
      } else if (dateFilter === 'last_30_days') {
        inDateRange = orderDate >= thirtyDaysAgo;
      } else if (dateFilter === 'this_month') {
        inDateRange = orderDate >= thisMonthStart;
      } else if (dateFilter === 'last_month') {
        inDateRange = orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
      } else if (dateFilter === 'custom') {
        if (customStart) {
          const cStart = new Date(customStart + 'T00:00:00');
          inDateRange = inDateRange && orderDate >= cStart;
        }
        if (customEnd) {
          const cEnd = new Date(customEnd + 'T23:59:59');
          inDateRange = inDateRange && orderDate <= cEnd;
        }
      }

      if (!inDateRange) return false;

      if (statusFilter !== 'all') {
        if (statusFilter === 'cancelled') {
          return order.order_status === 'cancelled';
        } else if (statusFilter === 'active') {
          return order.order_status !== 'cancelled';
        } else if (statusFilter === 'delivered') {
          return order.order_status === 'delivered';
        } else if (statusFilter === 'refunded') {
          return (order.refunded_amount || 0) > 0 || order.payment_status === 'refunded';
        }
      }

      return true;
    });
  }, [orders, dateFilter, customStart, customEnd, statusFilter]);

  // Authoritative financial aggregations
  const analytics = useMemo(() => {
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalTaxable = 0;
    let totalGST = 0;
    let totalShipping = 0;
    let totalRefunds = 0;
    let totalAmountPaid = 0;
    let totalAmountDue = 0;
    let totalOrders = 0;
    let cancelledOrders = 0;
    let deliveredOrders = 0;
    let activeOrders = 0;

    filteredOrders.forEach((o) => {
      totalOrders += 1;
      const isCancelled = o.order_status === 'cancelled';
      if (isCancelled) {
        cancelledOrders += 1;
      } else {
        activeOrders += 1;
      }

      if (o.order_status === 'delivered') {
        deliveredOrders += 1;
      }

      const fin = calculateOrderFinancials(o);

      // Aggregate non-cancelled orders towards gross/net sales
      if (!isCancelled) {
        grossSales += fin.originalSubtotal;
        totalDiscounts += fin.totalDiscount;
        totalTaxable += fin.taxableAmount;
        totalGST += fin.gstAmount;
        totalShipping += fin.finalShipping;
        totalAmountDue += fin.balanceAmount;
      }

      totalRefunds += fin.refundedAmount;
      totalAmountPaid += fin.totalAmountReceived;
    });

    grossSales = roundToTwo(grossSales);
    totalDiscounts = roundToTwo(totalDiscounts);
    totalTaxable = roundToTwo(totalTaxable);
    totalGST = roundToTwo(totalGST);
    totalShipping = roundToTwo(totalShipping);
    totalRefunds = roundToTwo(totalRefunds);
    totalAmountPaid = roundToTwo(totalAmountPaid);
    totalAmountDue = roundToTwo(totalAmountDue);

    // Canonical Net Sales = Gross Sales - Total Discounts - Total Refunds + GST + Shipping
    const netSales = roundToTwo(Math.max(0, grossSales - totalDiscounts - totalRefunds + totalGST + totalShipping));

    return {
      totalOrders,
      cancelledOrders,
      deliveredOrders,
      activeOrders,
      grossSales,
      totalDiscounts,
      totalTaxable,
      totalGST,
      totalShipping,
      totalRefunds,
      netSales,
      totalAmountPaid,
      totalAmountDue,
    };
  }, [filteredOrders]);

  // Export financial summary to authoritative Excel-compatible CSV (Requirements 20.9, 20.10, 20.11)
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      return;
    }
    exportOrdersToCsv(filteredOrders, `SudhaSwagruha_Sales_Report_${dateFilter}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Sales & Financial Overview</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Authoritative Ledger
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time synchronized order financials, revenue, tax (GST), discounts & refund auditing.
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'today' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'yesterday' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('last_7_days')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'last_7_days' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateFilter('last_30_days')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'last_30_days' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateFilter('this_month')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'this_month' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'custom' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {dateFilter === 'custom' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          {(customStart || customEnd) && (
            <button
              onClick={() => {
                setCustomStart('');
                setCustomEnd('');
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              Clear Custom Range
            </button>
          )}
        </div>
      )}

      {/* Primary KPI Cards (Requirement 21 & 22) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales (Net Revenue) */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Sales</span>
            <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-white mt-3 tracking-tight font-mono">
            ₹{analytics.netSales.toLocaleString('en-IN')}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Gross: ₹{analytics.grossSales.toLocaleString('en-IN')}</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Collected
            </span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950/30 border border-blue-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <span className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <ShoppingBag className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-white mt-3 tracking-tight font-mono">
            {analytics.totalOrders.toLocaleString('en-IN')}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Active: {analytics.activeOrders}</span>
            <span className="text-emerald-400 font-semibold">{analytics.deliveredOrders} Delivered</span>
          </div>
        </div>

        {/* Refund Amount */}
        <div className="bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refund Amount</span>
            <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-amber-400 mt-3 tracking-tight font-mono">
            ₹{analytics.totalRefunds.toLocaleString('en-IN')}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Reversed to customers</span>
            <span className="text-amber-400 font-semibold flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" /> Settled
            </span>
          </div>
        </div>

        {/* Cancelled Orders */}
        <div className="bg-gradient-to-br from-slate-900 to-red-950/30 border border-red-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled Orders</span>
            <span className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <XCircle className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-red-400 mt-3 tracking-tight font-mono">
            {analytics.cancelledOrders.toLocaleString('en-IN')}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Rate: {analytics.totalOrders > 0 ? ((analytics.cancelledOrders / analytics.totalOrders) * 100).toFixed(1) : 0}%</span>
            <span className="text-red-400 font-semibold">Authoritative</span>
          </div>
        </div>
      </div>

      {/* Detailed Financial Calculation Formula Breakdown (Requirement 22) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Financial Formula & Accounting Breakdown
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {dateFilter.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Gross Product Sales</span>
            <span className="text-base font-bold text-white font-mono block mt-1">
              ₹{analytics.grossSales.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Catalog Subtotal</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-amber-400 text-[11px] block">Discounts & Coupons</span>
            <span className="text-base font-bold text-amber-300 font-mono block mt-1">
              -₹{analytics.totalDiscounts.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Item & Code Offers</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-purple-400 text-[11px] block">Taxable Base Amount</span>
            <span className="text-base font-bold text-purple-300 font-mono block mt-1">
              ₹{analytics.totalTaxable.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Post-Discount Base</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-blue-400 text-[11px] block">Collected GST / Tax</span>
            <span className="text-base font-bold text-blue-300 font-mono block mt-1">
              +₹{analytics.totalGST.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Order GST Snapshots</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-cyan-400 text-[11px] block">Shipping Charges</span>
            <span className="text-base font-bold text-cyan-300 font-mono block mt-1">
              +₹{analytics.totalShipping.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Logistics Delivery</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-red-400 text-[11px] block">Processed Refunds</span>
            <span className="text-base font-bold text-red-300 font-mono block mt-1">
              -₹{analytics.totalRefunds.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Reversed Settlements</span>
          </div>
        </div>

        {/* Calculation equation banner */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-bold">Gross (₹{analytics.grossSales})</span>
            <span className="text-slate-500">-</span>
            <span className="text-amber-400">Discount (₹{analytics.totalDiscounts})</span>
            <span className="text-slate-500">-</span>
            <span className="text-red-400">Refunds (₹{analytics.totalRefunds})</span>
            <span className="text-slate-500">+</span>
            <span className="text-blue-400">GST (₹{analytics.totalGST})</span>
            <span className="text-slate-500">+</span>
            <span className="text-cyan-400">Shipping (₹{analytics.totalShipping})</span>
            <span className="text-slate-500">=</span>
            <span className="text-emerald-400 font-bold text-sm">Net Sales ₹{analytics.netSales}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Paid: <strong className="text-emerald-400">₹{analytics.totalAmountPaid}</strong></span>
            <span>Outstanding Due: <strong className="text-amber-400">₹{analytics.totalAmountDue}</strong></span>
          </div>
        </div>
      </div>

      {/* Orders Financial Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Financial Audit Ledger ({filteredOrders.length} Orders)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete transaction snapshot per order including GST rate, discounts, payment and refund trace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Orders</option>
              <option value="active">Active Only</option>
              <option value="delivered">Delivered Only</option>
              <option value="refunded">Refunded / Partially Refunded</option>
              <option value="cancelled">Cancelled Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4 text-right">Shipping</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Due</th>
                <th className="py-3 px-4 text-right">Refunded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500 font-sans">
                    No orders found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(0, 50).map((o) => {
                  const subtotal = roundToTwo(o.subtotal || o.total);
                  const discount = roundToTwo((o.discount || 0) + (o.coupon_discount || 0));
                  const gst = roundToTwo(o.gst_amount || 0);
                  const shipping = roundToTwo(o.delivery_charge || 0);
                  const total = roundToTwo(o.total);
                  const paid = roundToTwo(o.amount_paid !== undefined ? o.amount_paid : (o.payment_status === 'paid' ? total : 0));
                  const due = roundToTwo(o.amount_due !== undefined ? o.amount_due : Math.max(0, total - paid));
                  const refunded = roundToTwo(o.refunded_amount || 0);

                  return (
                    <tr key={o.id || o.order_number} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        <div>{o.order_number}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          {new Date(o.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        <div className="font-medium text-slate-200">{o.customer_name || 'Customer'}</div>
                        <div className="text-[10px] text-slate-500">{o.customer_mobile || o.customer_phone || ''}</div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            o.order_status === 'delivered'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : o.order_status === 'cancelled'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : o.order_status === 'shipped'
                              ? 'bg-purple-950 text-purple-400 border border-purple-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {o.order_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            o.payment_status === 'paid'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : o.payment_status === 'refunded'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : o.payment_status === 'partially_refunded'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : o.payment_status === 'partially_paid'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">₹{subtotal.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-amber-400">
                        {discount > 0 ? `-₹${discount.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-400">
                        {gst > 0 ? `+₹${gst.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {shipping > 0 ? `+₹${shipping.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-bold">₹{total.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">₹{paid.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-amber-400">
                        {due > 0 ? `₹${due.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right text-red-400">
                        {refunded > 0 ? `₹${refunded.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
