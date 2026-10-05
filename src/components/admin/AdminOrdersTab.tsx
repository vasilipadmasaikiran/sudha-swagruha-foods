// ============================================================
// Admin Console - Orders Management Tab
// ============================================================
import { useState, useMemo } from 'react';
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
  Phone,
  MessageCircle,
  Clock,
  Eye,
  Trash2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { useOrderStore } from '@/hooks/useOrderStore';
import type { DbOrder } from '@/services/supabase';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<
  DbOrder['order_status'],
  { label: string; bg: string; text: string; icon: any }
> = {
  placed: { label: 'Placed', bg: 'bg-blue-500/20', text: 'text-blue-400', icon: ShoppingBag },
  confirmed: { label: 'Confirmed', bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: CheckCircle },
  preparing: { label: 'Preparing', bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: ChefHat },
  packed: { label: 'Packed', bg: 'bg-orange-500/20', text: 'text-orange-400', icon: Package },
  shipped: { label: 'Shipped', bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Truck },
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

export default function AdminOrdersTab() {
  const { orders, updateOrderStatus, deleteOrder, resetOrders } = useOrderStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_mobile.includes(q) ||
        o.delivery_address.city.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || o.order_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleStatusChange = async (order: DbOrder, newStatus: DbOrder['order_status']) => {
    try {
      await updateOrderStatus(order.id, newStatus);
      toast.success(
        `Order ${order.order_number} status updated to ${STATUS_CONFIG[newStatus].label}!`
      );
      if (selectedOrder && (selectedOrder.id === order.id || selectedOrder.order_number === order.order_number)) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>Customer Orders Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time incoming orders, status updates, and customer delivery processing.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Name, Phone..."
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
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
            statusFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>All Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
            {orders.length}
          </span>
        </button>

        {ALL_STATUSES.map((st) => {
          const cfg = STATUS_CONFIG[st];
          const count = orders.filter((o) => o.order_status === st).length;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
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
      </div>

      {/* Orders List Table */}
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
                  <th className="px-4 py-3.5">Customer & Phone</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5">Total & Payment</th>
                  <th className="px-4 py-3.5">Update Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((o) => {
                  const cfg = STATUS_CONFIG[o.order_status] || STATUS_CONFIG.placed;
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-900/50 transition-colors group"
                    >
                      {/* Order Number & Date */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono font-bold text-emerald-400 text-sm">
                          {o.order_number}
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
                            `నమస్కారం ${o.customer_name}! 🙏 Sudha Swagruha Foods నుండి మీ ఆర్డర్ *${o.order_number}* గురించి మాట్లాడుతున్నాము.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 mt-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp Chat</span>
                        </a>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5 align-top max-w-xs">
                        <div className="space-y-1">
                          {o.items.map((it, idx) => (
                            <div key={idx} className="text-slate-300 leading-tight">
                              <span className="font-medium text-white">{it.product_name_en}</span>{' '}
                              <span className="text-slate-400">({it.weight})</span>{' '}
                              <span className="text-emerald-400 font-semibold">×{it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total & Payment */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-white text-sm">₹{o.total}</div>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              o.payment_status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {o.payment_status === 'paid' ? 'Paid Online' : 'Pending / COD'}
                          </span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="relative inline-block w-36">
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
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="View Full Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal: Full Order Details */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">Order Details</p>
                  <p className="text-lg font-mono font-bold text-emerald-400">
                    {selectedOrder.order_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Updater */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Current Order Status</p>
                  <p className="text-sm font-bold text-white capitalize">
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
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs border-0 cursor-pointer"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      Mark as {STATUS_CONFIG[st].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400">Customer Name:</span>
                  <p className="font-semibold text-white">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Mobile Number:</span>
                  <p className="font-semibold text-white">{selectedOrder.customer_mobile}</p>
                </div>
                <div>
                  <span className="text-slate-400">WhatsApp Number:</span>
                  <p className="font-semibold text-emerald-400">
                    {selectedOrder.customer_whatsapp || selectedOrder.customer_mobile}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <p className="text-white">{selectedOrder.customer_email || 'None'}</p>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
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

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ordered Items ({selectedOrder.items.length})
                </span>
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 divide-y divide-slate-800 text-xs">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white">{it.product_name_en}</p>
                        <p className="text-[11px] text-slate-400">
                          Weight: {it.weight} • Qty: {it.quantity} @ ₹{it.unit_price} each
                        </p>
                      </div>
                      <p className="font-bold text-emerald-400 text-sm">₹{it.total_price}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.subtotal}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>−₹{selectedOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Delivery Charge</span>
                  <span>{selectedOrder.delivery_charge === 0 ? 'FREE' : `₹${selectedOrder.delivery_charge}`}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-sm pt-1.5 border-t border-slate-800">
                  <span>Total Amount</span>
                  <span className="text-emerald-400">₹{selectedOrder.total}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <a
                  href={`https://wa.me/91${
                    selectedOrder.customer_whatsapp || selectedOrder.customer_mobile
                  }?text=${encodeURIComponent(
                    `నమస్కారం ${selectedOrder.customer_name}! 🙏 మీ ఆర్డర్ నంబర్: *${selectedOrder.order_number}* ప్రస్తుత స్టేటస్: *${STATUS_CONFIG[selectedOrder.order_status]?.label}*. ధన్యవాదాలు!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Status on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
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
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteOrder(deleteConfirmId);
                    toast.success('Order deleted.');
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30"
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
