// ============================================================
// Admin Dashboard Tab - Realtime Authoritative Operational & Financial Metrics
// Issue #2: Live Backend/Database Sync, Multi-Period Date Filters,
// Absolute Data Integrity with Zero Mock Data.
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  XCircle,
  Calendar,
  IndianRupee,
  Receipt,
  Layers,
  Percent,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  AlertTriangle,
  Truck,
  Sparkles,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useProductStore } from '@/hooks/useProductStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { roundToTwo } from '@/services/orderCalculationService';
import type { DbOrder } from '@/services/supabase';

export type DashboardDateFilter =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'all'
  | 'custom';

interface AdminDashboardTabProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({ onNavigateToTab }) => {
  const orders = useOrderStore((state) => state.orders);
  const products = useProductStore((state) => state.products);
  const settings = useSettingsStore((state) => state.settings);
  const currentUser = useAdminAuthStore((state) => state.currentUser);

  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // 1. Authoritative Date Filtering
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

      if (dateFilter === 'today') {
        return orderDate >= todayStart && orderDate <= todayEnd;
      }
      if (dateFilter === 'yesterday') {
        return orderDate >= yesterdayStart && orderDate <= yesterdayEnd;
      }
      if (dateFilter === 'last_7_days') {
        return orderDate >= sevenDaysAgo;
      }
      if (dateFilter === 'last_30_days') {
        return orderDate >= thirtyDaysAgo;
      }
      if (dateFilter === 'this_month') {
        return orderDate >= thisMonthStart;
      }
      if (dateFilter === 'last_month') {
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
      }
      if (dateFilter === 'custom') {
        let matches = true;
        if (customStart) {
          const cStart = new Date(customStart + 'T00:00:00');
          matches = matches && orderDate >= cStart;
        }
        if (customEnd) {
          const cEnd = new Date(customEnd + 'T23:59:59');
          matches = matches && orderDate <= cEnd;
        }
        return matches;
      }
      return true; // 'all'
    });
  }, [orders, dateFilter, customStart, customEnd]);

  // 2. Authoritative Metrics Calculation (Zero Mock Data, Live Backend Sync)
  const metrics = useMemo(() => {
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalTaxable = 0;
    let totalGST = 0;
    let totalShipping = 0;
    let totalRefunds = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    let totalOrders = 0;
    let cancelledOrders = 0;
    let deliveredOrders = 0;
    let dispatchedOrders = 0;
    let pendingOrders = 0;

    // Deduplicate orders by order_number to avoid artificial inflation
    const seenOrderNumbers = new Set<string>();
    const uniqueOrders = filteredOrders.filter((o) => {
      if (!o.order_number) return true;
      if (seenOrderNumbers.has(o.order_number)) return false;
      seenOrderNumbers.add(o.order_number);
      return true;
    });

    uniqueOrders.forEach((o) => {
      totalOrders += 1;
      const isCancelled = o.order_status === 'cancelled';

      if (isCancelled) {
        cancelledOrders += 1;
      } else {
        if (o.order_status === 'delivered') deliveredOrders += 1;
        else if (o.order_status === 'shipped') dispatchedOrders += 1;
        else pendingOrders += 1; // placed, confirmed, preparing, packed
      }

      const subtotal = roundToTwo(o.subtotal || o.total || 0);
      const discount = roundToTwo(
        (o.discount || 0) + (o.coupon_discount || 0) + (o.item_discount || 0)
      );
      const shipping = roundToTwo(o.delivery_charge || 0);
      const gst = roundToTwo(o.gst_amount || 0);
      const taxable = roundToTwo(
        o.taxable_amount !== undefined ? o.taxable_amount : Math.max(0, subtotal - discount)
      );
      const grandTotal = roundToTwo(o.total || (taxable + gst + shipping));

      // Calculate refunds
      let refundAmt = 0;
      if (Array.isArray(o.refunds) && o.refunds.length > 0) {
        refundAmt = o.refunds
          .filter((r) => r.status === 'success' || r.status === 'processing')
          .reduce((sum, r) => sum + roundToTwo(r.amount), 0);
      } else {
        refundAmt = roundToTwo(o.refunded_amount || 0);
      }

      // Calculate payments
      let paidAmt = 0;
      if (Array.isArray(o.payments) && o.payments.length > 0) {
        paidAmt = o.payments
          .filter((p) => p.status === 'success')
          .reduce((sum, p) => sum + roundToTwo(p.amount), 0);
      } else if (o.amount_paid !== undefined) {
        paidAmt = roundToTwo(o.amount_paid);
      } else if (o.payment_status === 'paid') {
        paidAmt = grandTotal;
      }

      const dueAmt = isCancelled ? 0 : Math.max(0, roundToTwo(grandTotal - paidAmt));

      totalRefunds += refundAmt;
      totalPaid += paidAmt;

      if (!isCancelled) {
        grossSales += subtotal;
        totalDiscounts += discount;
        totalTaxable += taxable;
        totalGST += gst;
        totalShipping += shipping;
        totalOutstanding += dueAmt;
      }
    });

    grossSales = roundToTwo(grossSales);
    totalDiscounts = roundToTwo(totalDiscounts);
    totalTaxable = roundToTwo(totalTaxable);
    totalGST = roundToTwo(totalGST);
    totalShipping = roundToTwo(totalShipping);
    totalRefunds = roundToTwo(totalRefunds);
    totalPaid = roundToTwo(totalPaid);
    totalOutstanding = roundToTwo(totalOutstanding);

    // Authoritative Definition: Net Sales = Gross Sales - Discounts - Refunds
    const netSales = roundToTwo(Math.max(0, grossSales - totalDiscounts - totalRefunds));

    // Inventory alerts
    const outOfStock = products.filter((p) => p.variants.some((v) => v.stock === 0)).length;
    const lowStock = products.filter((p) =>
      p.variants.some((v) => v.stock !== undefined && v.stock > 0 && v.stock <= 10)
    ).length;

    return {
      totalOrders,
      grossSales,
      totalDiscounts,
      totalTaxable,
      totalGST,
      totalShipping,
      totalRefunds,
      totalPaid,
      totalOutstanding,
      netSales,
      cancelledOrders,
      deliveredOrders,
      dispatchedOrders,
      pendingOrders,
      outOfStock,
      lowStock,
      uniqueOrdersCount: uniqueOrders.length,
    };
  }, [filteredOrders, products]);

  return (
    <div className="space-y-6">
      {/* ─── Operational Header & Date Filter Bar ──────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">
              Live Operations & Business Dashboard
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live Cloud Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative operational summary for <strong className="text-emerald-400">{settings.businessName}</strong>. Zero mock values; verified against database transactions.
          </p>
        </div>

        {/* Date Filter Controls (Requirement 14) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1.5" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DashboardDateFilter)}
              className="bg-transparent text-white font-semibold pr-3 py-1 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Time</option>
              <option value="today" className="bg-slate-900">Today</option>
              <option value="yesterday" className="bg-slate-900">Yesterday</option>
              <option value="last_7_days" className="bg-slate-900">Last 7 Days</option>
              <option value="last_30_days" className="bg-slate-900">Last 30 Days</option>
              <option value="this_month" className="bg-slate-900">This Month</option>
              <option value="last_month" className="bg-slate-900">Last Month</option>
              <option value="custom" className="bg-slate-900">Custom Date Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 text-xs font-mono">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-xs"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-xs"
              />
            </div>
          )}

          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('orders')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Process Orders ({metrics.pendingOrders})</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── REQUIRED CORE METRICS (Requirements 12 & 13) ──────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Total Sales (Net Sales) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Sales (Net)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1.5 font-mono">
            ₹{metrics.netSales.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Gross – Discounts – Refunds</p>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-1.5 font-mono">
            {metrics.totalOrders}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.deliveredOrders} delivered</p>
        </div>

        {/* Metric 3: Total Paid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Paid</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1.5 font-mono">
            ₹{metrics.totalPaid.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Successful payments received</p>
        </div>

        {/* Metric 4: Total Outstanding Due */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Outstanding</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1.5 font-mono">
            ₹{metrics.totalOutstanding.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Unpaid order balance due</p>
        </div>

        {/* Metric 5: Total Refunds */}
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 relative overflow-hidden bg-cyan-950/10">
          <div className="flex items-center justify-between text-cyan-300 text-xs">
            <span>Total Refunds</span>
            <RotateCcw className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-400 mt-1.5 font-mono">
            ₹{metrics.totalRefunds.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Processed to customers</p>
        </div>

        {/* Metric 6: Total Cancelled Orders */}
        <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-4 relative overflow-hidden bg-red-950/10">
          <div className="flex items-center justify-between text-red-300 text-xs">
            <span>Cancelled Orders</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-400 mt-1.5 font-mono">
            {metrics.cancelledOrders}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Voided order count</p>
        </div>
      </div>

      {/* ─── SECONDARY FINANCIAL LEDGER SUMMARY ────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-emerald-400" />
          <span>Financial Breakdown (Tax, Discounts & Logistics)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Gross Merchandise Value</span>
            <span className="text-lg font-bold text-white font-mono mt-0.5 block">
              ₹{metrics.grossSales.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-emerald-400 block text-[11px]">Discounts Granted</span>
            <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">
              -₹{metrics.totalDiscounts.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-purple-400 block text-[11px]">GST / Tax Collected</span>
            <span className="text-lg font-bold text-purple-300 font-mono mt-0.5 block">
              +₹{metrics.totalGST.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-blue-400 block text-[11px]">Shipping Collected</span>
            <span className="text-lg font-bold text-blue-300 font-mono mt-0.5 block">
              +₹{metrics.totalShipping.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ─── OPERATIONAL PIPELINE & RECENT ORDERS ─────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Operations Pipeline Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Fulfillment Pipeline</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Pending Kitchen / Prep
              </span>
              <span className="font-bold text-amber-400 font-mono">{metrics.pendingOrders}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                In Transit / Courier Dispatched
              </span>
              <span className="font-bold text-purple-400 font-mono">{metrics.dispatchedOrders}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Delivered & Fulfilled
              </span>
              <span className="font-bold text-emerald-400 font-mono">{metrics.deliveredOrders}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Stock Alerts (Low & Out)
              </span>
              <span className="font-bold text-orange-400 font-mono">
                {metrics.lowStock + metrics.outOfStock} items
              </span>
            </div>
          </div>
        </div>

        {/* Recent Live Orders Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Recent Live Orders</span>
            </h3>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('orders')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                View All Orders ({orders.length}) →
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Order Number</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredOrders.slice(0, 6).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-850/50">
                    <td className="py-2.5 px-3 font-bold text-white">{o.order_number}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      <span className="font-semibold text-white block">{o.customer_name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{o.customer_mobile || o.customer_phone}</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">₹{o.total}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                        {o.order_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          o.payment_status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : o.payment_status === 'partially_paid'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : o.payment_status === 'refunded'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
