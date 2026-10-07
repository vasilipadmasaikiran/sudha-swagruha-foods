// ============================================================
// Enterprise Admin Inventory & Stock Management Tab
// Requirements 6, 8, 16, 18, 27
// Subtabs: Stock Overview, Low Stock, Out of Stock, Adjustments, Stock History
// Accessible by: ROOT_ADMIN, STORE_KEEPER
// ============================================================
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  History,
  TrendingDown,
  Layers,
  ArrowUpDown,
  Filter,
  Download,
  ShieldCheck,
  RefreshCw,
  X,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useProductStore } from '@/hooks/useProductStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { logAdminAction } from '@/services/auditLogger';
import AppImage from '@/components/common/AppImage';
import toast from 'react-hot-toast';

export interface StockAdjustmentRecord {
  id: string;
  productId: string;
  productName: string;
  variantIndex: number;
  weight: string;
  previousStock: number;
  newStock: number;
  changeQty: number; // +5 or -3
  reason: string;
  adjustedBy: string;
  timestamp: string;
}

const STOCK_HISTORY_STORAGE_KEY = 'ssf_inventory_history';

function loadStoredHistory(): StockAdjustmentRecord[] {
  try {
    const raw = localStorage.getItem(STOCK_HISTORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load inventory history from storage:', err);
  }
  return [
    {
      id: 'adj-01',
      productId: 'p-1',
      productName: 'Avakaya Mango Pickle',
      variantIndex: 0,
      weight: '250g',
      previousStock: 40,
      newStock: 50,
      changeQty: +10,
      reason: 'Fresh production batch received from kitchen',
      adjustedBy: 'Venkata Raman (Store Keeper)',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'adj-02',
      productId: 'p-2',
      productName: 'Gongura Pickle',
      variantIndex: 1,
      weight: '500g',
      previousStock: 25,
      newStock: 22,
      changeQty: -3,
      reason: 'Damaged glass jars during shelf placement',
      adjustedBy: 'Venkata Raman (Store Keeper)',
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ];
}

function saveStoredHistory(history: StockAdjustmentRecord[]) {
  try {
    localStorage.setItem(STOCK_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (err) {
    console.warn('Failed to persist inventory history:', err);
  }
}

type InventorySubTab = 'overview' | 'low_stock' | 'out_of_stock' | 'adjust' | 'history';

export default function AdminInventoryTab() {
  const { products, updateVariantPrice } = useProductStore();
  const { currentUser, hasPermission } = useAdminAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<InventorySubTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockHistory, setStockHistory] = useState<StockAdjustmentRecord[]>(loadStoredHistory);

  // Adjustment Modal State
  const [adjustModalProduct, setAdjustModalProduct] = useState<{
    productId: string;
    productName: string;
    variantIndex: number;
    weight: string;
    currentStock: number;
    price: number;
  } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState('Fresh Kitchen Batch');

  // Flattened inventory item representation
  const allInventoryItems = useMemo(() => {
    const list: Array<{
      productId: string;
      productName: string;
      productNameTe?: string;
      category: string;
      image: string;
      variantIndex: number;
      weight: string;
      price: number;
      stock: number;
      isActive: boolean;
    }> = [];

    products.forEach((p) => {
      p.variants.forEach((v, vIdx) => {
        list.push({
          productId: p.id,
          productName: p.name_en,
          productNameTe: p.name_te,
          category: p.category,
          image: p.images?.[0] || '',
          variantIndex: vIdx,
          weight: v.weight,
          price: v.price,
          stock: v.stock !== undefined ? v.stock : 25,
          isActive: p.is_active,
        });
      });
    });

    return list;
  }, [products]);

  // Metrics
  const metrics = useMemo(() => {
    const totalVariants = allInventoryItems.length;
    const totalStockQty = allInventoryItems.reduce((acc, it) => acc + (it.stock || 0), 0);
    const lowStockItems = allInventoryItems.filter((it) => it.stock > 0 && it.stock <= 10);
    const outOfStockItems = allInventoryItems.filter((it) => it.stock === 0);
    const healthyItems = allInventoryItems.filter((it) => it.stock > 10);

    return {
      totalVariants,
      totalStockQty,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      healthyCount: healthyItems.length,
    };
  }, [allInventoryItems]);

  // Filtered Items
  const displayedItems = useMemo(() => {
    return allInventoryItems.filter((item) => {
      // Subtab filter
      if (activeSubTab === 'low_stock' && !(item.stock > 0 && item.stock <= 10)) return false;
      if (activeSubTab === 'out_of_stock' && item.stock !== 0) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.productName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.weight.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allInventoryItems, activeSubTab, selectedCategory, searchQuery]);

  // Categories list
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(allInventoryItems.map((i) => i.category)));
  }, [allInventoryItems]);

  // Open Adjust Modal
  const openAdjustModal = (item: (typeof allInventoryItems)[0]) => {
    setAdjustModalProduct({
      productId: item.productId,
      productName: item.productName,
      variantIndex: item.variantIndex,
      weight: item.weight,
      currentStock: item.stock,
      price: item.price,
    });
    setAdjustAmount(10);
    setAdjustType('add');
    setAdjustReason('Fresh Kitchen Batch');
  };

  // Submit Stock Adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    let newStock = adjustModalProduct.currentStock;
    let changeQty = 0;

    if (adjustType === 'add') {
      changeQty = Math.max(1, Number(adjustAmount));
      newStock = adjustModalProduct.currentStock + changeQty;
    } else if (adjustType === 'remove') {
      changeQty = -Math.max(1, Number(adjustAmount));
      newStock = Math.max(0, adjustModalProduct.currentStock + changeQty);
    } else {
      // Set absolute
      newStock = Math.max(0, Number(adjustAmount));
      changeQty = newStock - adjustModalProduct.currentStock;
    }

    // Update in store
    updateVariantPrice(
      adjustModalProduct.productId,
      adjustModalProduct.variantIndex,
      adjustModalProduct.price,
      undefined,
      newStock
    );

    // Record adjustment entry
    const record: StockAdjustmentRecord = {
      id: `adj-${Date.now()}`,
      productId: adjustModalProduct.productId,
      productName: adjustModalProduct.productName,
      variantIndex: adjustModalProduct.variantIndex,
      weight: adjustModalProduct.weight,
      previousStock: adjustModalProduct.currentStock,
      newStock,
      changeQty,
      reason: adjustReason.trim() || 'Inventory reconciliation',
      adjustedBy: currentUser ? `${currentUser.full_name} (${currentUser.role})` : 'Store Keeper',
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [record, ...stockHistory];
    setStockHistory(updatedHistory);
    saveStoredHistory(updatedHistory);

    // Audit Logging
    logAdminAction(
      currentUser?.email || 'admin@sudhaswagruha.com',
      currentUser?.role || 'STORE_KEEPER',
      'STOCK_ADJUSTMENT',
      'INVENTORY',
      `${adjustModalProduct.productId}-${adjustModalProduct.weight}`,
      {
        previousStock: adjustModalProduct.currentStock,
        newStock,
        changeQty,
        reason: record.reason,
      }
    );

    toast.success(
      `Stock updated for ${adjustModalProduct.productName} (${adjustModalProduct.weight}) to ${newStock} units.`
    );
    setAdjustModalProduct(null);
  };

  // Export Inventory CSV
  const handleExportCSV = () => {
    const headers = ['Product Name', 'Category', 'Pack Size', 'Price (INR)', 'Stock Qty', 'Stock Status'];
    const rows = allInventoryItems.map((i) => [
      `"${i.productName.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      `"${i.weight}"`,
      i.price,
      i.stock,
      i.stock === 0 ? 'Out of Stock' : i.stock <= 10 ? 'Low Stock' : 'In Stock',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Inventory report exported as CSV!');
  };

  return (
    <div className="space-y-6">
      {/* ─── Inventory Header & Role Security Notice ─────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              <span>Inventory & Stock Control</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live Warehouse Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track real-time stock levels, record batch receipts, and manage shelf availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveSubTab('overview')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Stock Quantity</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics.totalStockQty}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{metrics.totalVariants} product variants listed</p>
        </div>

        <div
          onClick={() => setActiveSubTab('low_stock')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSubTab === 'low_stock'
              ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{metrics.lowStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Under 10 units threshold</p>
        </div>

        <div
          onClick={() => setActiveSubTab('out_of_stock')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSubTab === 'out_of_stock'
              ? 'bg-red-950/30 border-red-500/60 shadow-lg shadow-red-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Out of Stock</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-400">{metrics.outOfStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Immediate kitchen replenishment needed</p>
        </div>

        <div
          onClick={() => setActiveSubTab('history')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-slate-800/90 border-blue-500/60 shadow-lg shadow-blue-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Stock Adjustments</span>
            <History className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{stockHistory.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Audit log records recorded</p>
        </div>
      </div>

      {/* ─── Subtabs Navigation Bar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Stock Items ({allInventoryItems.length})
          </button>

          <button
            onClick={() => setActiveSubTab('low_stock')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'low_stock'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span>Low Stock ({metrics.lowStockCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('out_of_stock')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'out_of_stock'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-red-300" />
            <span>Out of Stock ({metrics.outOfStockCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock History & Adjustments</span>
          </button>
        </div>

        {/* Search & Filters (Shown on inventory item lists) */}
        {activeSubTab !== 'history' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product / pack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── Subtab Content: Inventory Items Table ───────────────────── */}
      {activeSubTab !== 'history' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pack Size</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No inventory items matching this filter</p>
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, idx) => {
                    const isOut = item.stock === 0;
                    const isLow = item.stock > 0 && item.stock <= 10;
                    return (
                      <tr
                        key={`${item.productId}-${item.variantIndex}-${idx}`}
                        className="hover:bg-slate-850/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                              <AppImage
                                src={item.image}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-white line-clamp-1">{item.productName}</p>
                              {item.productNameTe && (
                                <p className="text-[11px] text-amber-400/80 font-telugu line-clamp-1">
                                  {item.productNameTe}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px]">
                            {item.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                          {item.weight}
                        </td>

                        <td className="py-3 px-4 font-bold text-white">
                          ₹{item.price}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black font-mono ${
                                isOut
                                  ? 'text-red-400'
                                  : isLow
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {item.stock}
                            </span>
                            <span className="text-[11px] text-slate-500">units</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              <TrendingDown className="w-3 h-3" />
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Adequate
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition-colors cursor-pointer"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                            <span>Adjust Stock</span>
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
      ) : (
        /* ─── Subtab Content: Stock History Audit Trail ─────────────── */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>Stock Adjustments & Warehouse Ledger</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable audit trail of inventory incoming batches, damages, and manual reconciliations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product & Pack</th>
                  <th className="py-3 px-4">Adjustment</th>
                  <th className="py-3 px-4">Stock Before → After</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Adjusted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stockHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No stock adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  stockHistory.map((rec) => {
                    const isPositive = rec.changeQty >= 0;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                          {new Date(rec.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-bold text-white">{rec.productName}</p>
                          <span className="text-[11px] text-slate-400 font-mono">Pack: {rec.weight}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                              isPositive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {isPositive ? `+${rec.changeQty}` : rec.changeQty} units
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">
                          {rec.previousStock} → <span className="font-bold text-white">{rec.newStock}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-300 max-w-xs">{rec.reason}</td>

                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{rec.adjustedBy}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Stock Adjustment Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {adjustModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Adjust Stock Level</h3>
                  <p className="text-xs text-slate-400">
                    {adjustModalProduct.productName} ({adjustModalProduct.weight})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveAdjustment} className="space-y-4">
                {/* Current Stock Banner */}
                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current In-Stock Quantity:</span>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {adjustModalProduct.currentStock} units
                  </span>
                </div>

                {/* Adjustment Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Adjustment Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        adjustType === 'add'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Stock</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjustType('remove')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        adjustType === 'remove'
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Deduct</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjustType('set')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        adjustType === 'set'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Set Total</span>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    {adjustType === 'set' ? 'New Total Quantity' : 'Quantity to Add / Deduct'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    New resulting stock will be:{' '}
                    <strong className="text-white font-mono">
                      {adjustType === 'add'
                        ? adjustModalProduct.currentStock + Number(adjustAmount)
                        : adjustType === 'remove'
                        ? Math.max(0, adjustModalProduct.currentStock - Number(adjustAmount))
                        : Number(adjustAmount)}{' '}
                      units
                    </strong>
                  </p>
                </div>

                {/* Adjustment Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                    Reason for Adjustment
                  </label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 mb-2"
                  >
                    <option value="Fresh Kitchen Batch Received">Fresh Kitchen Batch Received</option>
                    <option value="Damaged Jars in Warehouse">Damaged Jars in Warehouse</option>
                    <option value="Periodic Inventory Reconciliation">Periodic Inventory Reconciliation</option>
                    <option value="Customer Return Restock">Customer Return Restock</option>
                    <option value="Sample / Tasting Consumption">Sample / Tasting Consumption</option>
                    <option value="Supplier Replacement">Supplier Replacement</option>
                    <option value="Other / Manual Correction">Other / Manual Correction</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustModalProduct(null)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Apply Adjustment</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
