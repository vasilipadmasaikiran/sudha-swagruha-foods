// ============================================================
// Admin Console - Financial Data Reconciliation & Audit Tab
// Requirement: 20.16, 20.17
// Identifies orders where Stored Total != Calculated Total without
// silently mutating historical records. Provides complete mathematical
// breakdown and Excel-compatible reconciliation export.
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ArrowRight,
  TrendingUp,
  Receipt,
  Scale,
  X,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import {
  diagnoseOrderFinancials,
  calculateOrderFinancials,
  type OrderReconciliationItem,
} from '@/services/orderCalculationService';
import { exportOrdersToCsv } from '@/services/csvExportService';
import { OrderCalculationInspector } from './OrderCalculationInspector';
import toast from 'react-hot-toast';

export const AdminReconciliationTab: React.FC = () => {
  const orders = useOrderStore((state) => state.orders);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'discrepancies_only' | 'matched_only'>('all');
  const [inspectedOrder, setInspectedOrder] = useState<any | null>(null);

  // Run authoritative diagnostic audit
  const auditReport = useMemo(() => {
    return diagnoseOrderFinancials(orders);
  }, [orders]);

  // Filtered list for display
  const displayedOrders = useMemo(() => {
    return orders.filter((o) => {
      const fin = calculateOrderFinancials(o);
      const hasDiff = fin.hasDiscrepancy;

      if (filterMode === 'discrepancies_only' && !hasDiff) return false;
      if (filterMode === 'matched_only' && hasDiff) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = (o.order_number || '').toLowerCase().includes(q);
        const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer_mobile || '').includes(q);
        return numMatch || nameMatch || phoneMatch;
      }

      return true;
    });
  }, [orders, filterMode, searchQuery]);

  // Export reconciliation report to CSV
  const handleExportReconciliationCsv = () => {
    if (orders.length === 0) {
      toast.error('No orders available to audit');
      return;
    }
    exportOrdersToCsv(orders, 'SSF_Financial_Reconciliation_Audit');
    toast.success('Reconciliation audit exported as CSV!');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Financial Audit & Reconciliation Report
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative verification of Stored DB Totals vs Calculated Engine values (Section 20.16)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportReconciliationCsv}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Export Reconciliation CSV</span>
          </button>
        </div>
      </div>

      {/* Audit KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Audited */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Audited Orders</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{auditReport.totalAudited}</span>
            <span className="text-[11px] text-slate-500 font-sans">orders in DB</span>
          </div>
        </div>

        {/* 100% Matched */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider">Perfect Agreement</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{auditReport.matchingCount}</span>
            <span className="text-[11px] text-emerald-300/80 font-sans">
              ({auditReport.totalAudited > 0 ? Math.round((auditReport.matchingCount / auditReport.totalAudited) * 100) : 100}%)
            </span>
          </div>
        </div>

        {/* Discrepancies */}
        <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-amber-300">
            <span className="text-xs font-bold uppercase tracking-wider">Discrepancies Flagged</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{auditReport.discrepancyCount}</span>
            <span className="text-[11px] text-amber-300/80 font-sans">require review</span>
          </div>
        </div>

        {/* Policy Notice */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Historical Guard</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Historical records are never silently mutated. All adjustments are logged and auditable.
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('discrepancies_only')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              filterMode === 'discrepancies_only'
                ? 'bg-amber-600 text-white font-bold shadow'
                : 'bg-slate-950 text-amber-400/80 hover:text-amber-300 border border-slate-800'
            }`}
          >
            Discrepancies Only ({auditReport.discrepancyCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('matched_only')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              filterMode === 'matched_only'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Matched Only ({auditReport.matchingCount})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, customer, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Orders Audit Table */}
      <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Order</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Stored DB Total</th>
                <th className="px-4 py-3.5">Authoritative Total</th>
                <th className="px-4 py-3.5">Variance</th>
                <th className="px-4 py-3.5">Audit Reason / Status</th>
                <th className="px-4 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-sans">
                    No orders match the selected audit filter.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o) => {
                  const fin = calculateOrderFinancials(o);
                  const stored = o.total !== undefined ? o.total : fin.finalOrderTotal;
                  const diff = Math.round((fin.finalOrderTotal - stored) * 100) / 100;
                  const isMatch = Math.abs(diff) <= 0.05;

                  return (
                    <tr key={o.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-xs">{o.order_number}</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {new Date(o.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-300">
                        <div className="font-medium text-white">{o.customer_name || 'Customer'}</div>
                        <div className="text-[11px] text-slate-400">{o.customer_mobile}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-bold">₹{stored}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">₹{fin.finalOrderTotal}</td>
                      <td className="px-4 py-3">
                        {isMatch ? (
                          <span className="text-emerald-400 font-bold">₹0.00</span>
                        ) : (
                          <span className="text-amber-400 font-bold">
                            {diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-sans text-[11px]">
                        {isMatch ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>100% Reconciled</span>
                          </span>
                        ) : (
                          <span className="text-amber-300">
                            {fin.discrepancyReason || `Difference of ₹${diff}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectedOrder(o)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold font-sans transition cursor-pointer"
                        >
                          Inspect Math
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Math Modal */}
      {inspectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Calculation Audit: Order #{inspectedOrder.order_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <OrderCalculationInspector order={inspectedOrder} defaultExpanded={true} />

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Audit Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
