// ============================================================
// Printable Delivery Slip / Package Label (Prompt Section 6)
// Designed for logistics & delivery partner identification.
// STRICTLY EXCLUDES all prices, discounts, coupons, taxes & payment info.
// ============================================================
import React from 'react';
import { motion } from 'framer-motion';
import { Printer, X, Truck, Package, Phone, MapPin, Building2, ShieldCheck } from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import type { DbOrder } from '@/services/supabase';

interface AdminDeliverySlipModalProps {
  order: DbOrder | null;
  onClose: () => void;
}

export default function AdminDeliverySlipModal({ order, onClose }: AdminDeliverySlipModalProps) {
  const { settings } = useSettingsStore();

  if (!order) return null;

  // Normalize customer delivery address
  const deliveryAddress = order.delivery_address;
  let formattedAddress = '';
  let cityName = '';
  let stateName = '';
  let pincode = '';

  if (typeof deliveryAddress === 'string') {
    formattedAddress = deliveryAddress;
  } else if (deliveryAddress && typeof deliveryAddress === 'object') {
    const addr = deliveryAddress as Record<string, any>;
    formattedAddress = [
      addr.house_no,
      addr.street,
      addr.landmark ? `Near ${addr.landmark}` : null,
      addr.city,
      addr.state,
      addr.pincode,
    ]
      .filter(Boolean)
      .join(', ');
    cityName = addr.city || '';
    stateName = addr.state || '';
    pincode = addr.pincode || '';
  }

  // Active items (excluding cancelled items)
  const activeItems = Array.isArray(order.items)
    ? order.items.filter((it) => it.status !== 'cancelled' && it.status !== 'removed')
    : [];

  const totalPackageUnits = activeItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
      {/* Print Specific CSS to isolate the slip during printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-delivery-slip, #printable-delivery-slip * {
            visibility: visible !important;
          }
          #printable-delivery-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto"
      >
        {/* Top Control Bar (Screen only) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Order Delivery Slip / Package Label</h3>
              <p className="text-xs text-slate-400">
                Logistics identification sheet for courier partner & package dispatch.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE SLIP CONTAINER (Section 6.1 & 6.2 - Pure logistics, ZERO pricing info) */}
        <div
          id="printable-delivery-slip"
          className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-slate-300 font-sans shadow-md space-y-5"
        >
          {/* Header: Brand & Label Title */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                {settings.businessName || 'Sudha Swagruha Foods'}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {settings.businessAddress || 'Plot 18, Benz Circle, Vijayawada, Andhra Pradesh'}
              </p>
              <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-700" />
                <span>Support Contact: +91 {settings.businessPhone || '8374634989'}</span>
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded">
                DELIVERY SLIP
              </span>
              <p className="text-xs text-slate-500 mt-1 font-mono">PACKAGE LABEL</p>
            </div>
          </div>

          {/* Logistics Summary Grid */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Order Number</span>
              <span className="text-base font-black font-mono text-slate-900">
                {order.order_number}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Order Date</span>
              <span className="font-semibold text-slate-800">
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Fulfillment Status</span>
              <span className="font-bold uppercase text-slate-900">
                {order.order_status}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Courier / Tracking AWB</span>
              <span className="font-mono font-bold text-slate-900">
                {(order as any).courier_partner ? `${(order as any).courier_partner}: ` : ''}
                {order.tracking_id || 'Ready for Dispatch'}
              </span>
            </div>
          </div>

          {/* Delivery Coordinates (Recipient Info) */}
          <div className="border-2 border-slate-900 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              DELIVER TO (RECIPIENT):
            </span>
            <p className="text-base font-black text-slate-900 uppercase">
              {order.customer_name}
            </p>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              {formattedAddress}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-900 border-t border-slate-200 mt-2">
              <span>Contact: +91 {order.customer_mobile || order.customer_phone}</span>
              {cityName && <span>City: {cityName}</span>}
              {stateName && <span>State: {stateName}</span>}
              {pincode && <span className="font-mono font-black text-sm">PIN: {pincode}</span>}
            </div>
          </div>

          {/* Package Contents Table (STRICTLY NO PRICES/AMOUNTS) */}
          <div>
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-300">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-slate-700" />
                <span>Package Items ({activeItems.length} Products • {totalPackageUnits} Units)</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Package Count: 1 of 1
              </span>
            </div>

            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-12 text-center">#</th>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3">Variant / Weight</th>
                  <th className="py-2 px-3 text-center w-20">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeItems.map((item, idx) => (
                  <tr key={(item as any).id || (item as any).product_id || idx}>
                    <td className="py-2 px-3 font-mono text-center text-slate-500 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {item.product_name_en || (item as any).product_name || 'Product'}
                      {item.product_name_te && (
                        <span className="text-slate-500 font-normal ml-1">
                          ({item.product_name_te})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-medium font-mono">
                      {item.weight || (item as any).variant || 'Standard'}
                    </td>
                    <td className="py-2 px-3 text-center font-black font-mono text-slate-900">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Logistics Handling Notes */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div className="space-y-0.5">
              <p className="font-bold">HANDLING INSTRUCTIONS FOR DELIVERY PARTNER:</p>
              <p className="text-amber-800">
                Authentic Homemade Foods package. Keep upright, store in a cool dry place, and handle with care. Do not crush or puncture package.
              </p>
            </div>
          </div>

          {/* Footer Dispatch Stamp Line */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Printed from Swagruha Foods Logistics System</span>
            <span>Authorized Dispatch Verification</span>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen only) */}
        <div className="flex items-center justify-end gap-3 pt-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Delivery Slip</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
