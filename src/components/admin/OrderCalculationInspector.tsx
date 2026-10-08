// ============================================================
// Admin Console - Order Calculation Inspector & Audit Breakdown
// Requirements: 20.7, 20.8, 20.17
// Step-by-step arithmetic trace: Input Values -> Calculation Steps -> Final Values
// Displays discrepancy alerts if stored DB total deviates from calculated total
// ============================================================

import React, { useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { calculateOrderFinancials, type OrderFinancialSummary } from '@/services/orderCalculationService';

interface OrderCalculationInspectorProps {
  order: any;
  defaultExpanded?: boolean;
}

export const OrderCalculationInspector: React.FC<OrderCalculationInspectorProps> = ({
  order,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!order) return null;

  const fin: OrderFinancialSummary = calculateOrderFinancials(order);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-lg transition">
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Financial Calculation Details & Audit
              </span>
              {fin.hasDiscrepancy ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Discrepancy Detected</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>100% Reconciled</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authoritative mathematical trace for Order #{order.order_number || order.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Calculated Total</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">₹{fin.finalOrderTotal}</span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expandable Breakdown Body */}
      {isExpanded && (
        <div className="p-4 pt-2 border-t border-slate-800/80 space-y-4">
          {/* Discrepancy Notice if any */}
          {fin.hasDiscrepancy && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Historical Discrepancy Identified</p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">{fin.discrepancyReason}</p>
                <p className="text-[10px] text-amber-400/80">
                  Note: The database value remains preserved for historical integrity, but calculations display the corrected authoritative amount.
                </p>
              </div>
            </div>
          )}

          {/* 3-Stage Inspector Grid: 1. Input Values -> 2. Calculation Steps -> 3. Final Reconciled Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Column 1: Input Values */}
            <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>1. Raw Order Inputs</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Total Items:</span>
                  <span className="text-white font-bold">{order.items?.length || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Stored Subtotal:</span>
                  <span className="text-slate-300">₹{order.subtotal || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Stored Delivery Fee:</span>
                  <span className="text-slate-300">₹{order.delivery_charge || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Stored Discount:</span>
                  <span className="text-slate-300">₹{order.discount || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Stored Recorded Total:</span>
                  <span className="text-white font-bold">₹{order.total || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Payment Mode:</span>
                  <span className="text-slate-300 uppercase">{order.payment_id ? 'Online' : 'Standard'}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Authoritative Steps */}
            <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Calculation Steps</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                {fin.breakdown.slice(0, 7).map((step, sIdx) => {
                  let opClass = 'text-slate-300';
                  let prefix = '';
                  if (step.operation === 'add') {
                    opClass = 'text-slate-300';
                    prefix = '+';
                  } else if (step.operation === 'subtract') {
                    opClass = 'text-emerald-400';
                    prefix = '-';
                  } else if (step.operation === 'result') {
                    opClass = 'text-amber-300 font-bold';
                    prefix = '=';
                  }
                  return (
                    <div key={sIdx} className="flex justify-between items-baseline py-0.5">
                      <span className="font-sans text-slate-400 text-[10px] truncate max-w-[140px]" title={step.label}>
                        {step.label}
                      </span>
                      <span className={opClass}>
                        {prefix}₹{step.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Reconciled Financial Output */}
            <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Financial Reconciliation</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-300 font-bold border-b border-slate-800 pb-1">
                  <span className="font-sans">Final Order Total:</span>
                  <span className="text-emerald-400 text-xs">₹{fin.finalOrderTotal}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Amount Received:</span>
                  <span className="text-slate-200">₹{fin.totalAmountReceived}</span>
                </div>
                {fin.balanceAmount > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span className="font-sans">Balance Amount Due:</span>
                    <span>₹{fin.balanceAmount}</span>
                  </div>
                )}
                {fin.excessAmount > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span className="font-sans">Excess Amount (Refund Due):</span>
                    <span>₹{fin.excessAmount}</span>
                  </div>
                )}
                {fin.refundedAmount > 0 && (
                  <div className="flex justify-between text-purple-300">
                    <span className="font-sans">Refund Completed:</span>
                    <span>₹{fin.refundedAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span className="font-sans">Payment Status:</span>
                  <span className="font-sans uppercase text-[10px] font-bold text-white">
                    {fin.paymentStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Step-by-Step Ledger Table */}
          <div className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Complete Arithmetic Execution Ledger:
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-1 px-2 font-medium">Step</th>
                    <th className="py-1 px-2 font-medium">Component</th>
                    <th className="py-1 px-2 font-medium">Operation</th>
                    <th className="py-1 px-2 font-medium text-right">Amount</th>
                    <th className="py-1 px-2 font-medium hidden sm:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {fin.breakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-1.5 px-2 text-slate-500 font-sans">{item.step}</td>
                      <td className="py-1.5 px-2 font-sans font-medium text-slate-300">{item.label}</td>
                      <td className="py-1.5 px-2 text-slate-400 uppercase text-[10px] font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.operation === 'add'
                              ? 'bg-blue-500/20 text-blue-300'
                              : item.operation === 'subtract'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.operation === 'result'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.operation}
                        </span>
                      </td>
                      <td
                        className={`py-1.5 px-2 text-right font-bold ${
                          item.operation === 'result' ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        ₹{item.amount}
                      </td>
                      <td className="py-1.5 px-2 text-slate-500 text-[10px] font-sans hidden sm:table-cell">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
