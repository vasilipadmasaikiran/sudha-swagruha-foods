// ============================================================
// Admin Console Page - Products, Pricing & Announcement Management
// ============================================================
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  Tag,
  Percent,
  CheckCircle2,
  Eye,
  Store,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  Copy,
  ExternalLink,
  X,
  Save,
  ShoppingBag,
  LogOut,
  Phone,
  CreditCard,
  Database,
  Mail,
} from 'lucide-react';
import { useProductStore, type DiscountAnnouncement, type CouponItem } from '@/hooks/useProductStore';
import { useAuthStore } from '@/hooks/useStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { supabase } from '@/services/supabase';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import AdminOrdersTab from '@/components/admin/AdminOrdersTab';
import AdminSettingsTab from '@/components/admin/AdminSettingsTab';
import AdminPaymentsTab from '@/components/admin/AdminPaymentsTab';
import AdminDatabaseTab from '@/components/admin/AdminDatabaseTab';
import AdminEmailTab from '@/components/admin/AdminEmailTab';
import { categories, type Product, type ProductVariant } from '@/data/products';
import toast from 'react-hot-toast';

type ActiveTab = 'orders' | 'products' | 'settings' | 'payments' | 'database' | 'email' | 'announcement' | 'coupons' | 'insights';

// Image preset options for quick selection
const IMAGE_PRESETS = [
  { name: 'Pickle Jar', url: import.meta.env.BASE_URL + 'images/pickle.jpg' },
  { name: 'Karam Powder', url: import.meta.env.BASE_URL + 'images/karam.jpg' },
  { name: 'Masala Spices', url: import.meta.env.BASE_URL + 'images/masala.jpg' },
  {
    name: 'Gongura Pickle',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mango Avakaya',
    url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Chilli Powder',
    url: 'https://images.unsplash.com/photo-1627843563095-f6e94676cfe0?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Traditional Spices',
    url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
  },
];

export default function AdminConsolePage() {
  const { isAdmin, userEmail, logout } = useAuthStore();
  const { orders } = useOrderStore();
  const { settings } = useSettingsStore();

  const {
    products,
    announcement,
    coupons,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    updateVariantPrice,
    updateAnnouncement,
    toggleAnnouncement,
    addCoupon,
    deleteCoupon,
    toggleCoupon,
    resetToDefaults,
  } = useProductStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Form State for Announcement
  const [annForm, setAnnForm] = useState<DiscountAnnouncement>({ ...announcement });

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name_te.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active).length;
    const outOfStock = products.filter((p) => p.variants.some((v) => v.stock === 0)).length;
    const discounted = products.filter((p) =>
      p.variants.some((v) => v.comparePrice && v.comparePrice > v.price)
    ).length;
    return { total, active, outOfStock, discounted };
  }, [products]);

  // Handle Save Announcement
  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    updateAnnouncement(annForm);
    toast.success('Discount Announcement banner updated & published!');
  };

  if (!isAdmin) {
    return <AdminLoginForm />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* ─── Top Admin Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">Admin Console</h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sudha Swagruha Foods • Order Processing, Products & Store Settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{userEmail || 'admin@sudhaswagruha.com'}</span>
            </div>

            <Link
              to="/"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">View Store</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>

            <button
              onClick={() => setResetConfirmOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-xs font-medium border border-slate-800 hover:border-red-500/30 transition-colors cursor-pointer"
              title="Reset catalog back to sample dataset"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Catalog</span>
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                logout();
                toast.success('Logged out from Admin Console');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Metric Badges ────────────────────────────────────────── */}
      <section className="bg-slate-950/40 border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div
            onClick={() => setActiveTab('orders')}
            className="bg-slate-850/60 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div>
              <p className="text-slate-400">Customer Orders</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{orders.length} Orders</p>
            </div>
            <ShoppingBag className="w-5 h-5 text-emerald-400/80" />
          </div>

          <div
            onClick={() => setActiveTab('products')}
            className="bg-slate-850/60 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div>
              <p className="text-slate-400">Total Catalog</p>
              <p className="text-lg font-bold text-white mt-0.5">{stats.total} items</p>
            </div>
            <Package className="w-5 h-5 text-blue-400/80" />
          </div>

          <div
            onClick={() => setActiveTab('settings')}
            className="bg-slate-850/60 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div>
              <p className="text-slate-400">Business WhatsApp</p>
              <p className="text-sm font-bold text-white font-mono mt-0.5">
                +91 {settings.businessWhatsApp}
              </p>
            </div>
            <Phone className="w-5 h-5 text-green-400/80" />
          </div>

          <div
            onClick={() => setActiveTab('payments')}
            className="bg-slate-850/60 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div>
              <p className="text-slate-400">Payment Gateway</p>
              <p className="text-sm font-bold mt-0.5">
                {settings.paymentGatewayEnabled ? (
                  <span className="text-emerald-400">Active (Razorpay)</span>
                ) : (
                  <span className="text-amber-400">Direct WhatsApp</span>
                )}
              </p>
            </div>
            <CreditCard className="w-5 h-5 text-purple-400/80" />
          </div>
        </div>
      </section>

      {/* ─── Navigation Tabs ──────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto py-2">
          {/* Orders Tab */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Customer Orders</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-900/60 text-slate-300 font-mono">
              {orders.length}
            </span>
          </button>

          {/* Products Tab */}
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products & Prices</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-900/60 text-slate-300">
              {products.length}
            </span>
          </button>

          {/* Contact & Store Settings Tab */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Contact & Store Info</span>
          </button>

          {/* Payment Gateway Configuration Tab */}
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Gateway</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                settings.paymentGatewayEnabled
                  ? 'bg-emerald-400 text-emerald-950'
                  : 'bg-amber-400 text-amber-950'
              }`}
            >
              {settings.paymentGatewayEnabled ? 'Online' : 'Disabled'}
            </span>
          </button>

          {/* Cloud Database & Sync Tab */}
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Cloud Database</span>
            <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Email & SMTP Tab */}
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email & SMTP</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                settings.smtp?.enabled
                  ? 'bg-emerald-400 text-emerald-950'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {settings.smtp?.enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Announcement Tab */}
          <button
            onClick={() => setActiveTab('announcement')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'announcement'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Announcement Bar</span>
            {announcement.enabled && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          {/* Coupons Tab */}
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Promo Coupons</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-900/60 text-slate-300">
              {coupons.length}
            </span>
          </button>

          {/* Insights Tab */}
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'insights'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Insights</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Body ────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8">
        {/* ============================================================ */}
        {/* TAB 0: ORDERS MANAGEMENT                                     */}
        {/* ============================================================ */}
        {activeTab === 'orders' && <AdminOrdersTab />}

        {/* ============================================================ */}
        {/* TAB 1: STORE & CONTACT SETTINGS                              */}
        {/* ============================================================ */}
        {activeTab === 'settings' && <AdminSettingsTab />}

        {/* ============================================================ */}
        {/* TAB 2: PAYMENT GATEWAY CONFIGURATION                         */}
        {/* ============================================================ */}
        {activeTab === 'payments' && <AdminPaymentsTab />}

        {/* ============================================================ */}
        {/* TAB: SUPABASE CLOUD DATABASE CONFIGURATION                   */}
        {/* ============================================================ */}
        {activeTab === 'database' && <AdminDatabaseTab />}

        {/* ============================================================ */}
        {/* TAB: CUSTOMER EMAIL & SMTP CONFIGURATION                     */}
        {/* ============================================================ */}
        {activeTab === 'email' && <AdminEmailTab />}

        {/* ============================================================ */}
        {/* TAB 3: PRODUCTS & PRICING                                    */}
        {/* ============================================================ */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by product name or ingredients..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Categories</option>
                  <option value="pickles">🫙 Pickles (ఊరగాయలు)</option>
                  <option value="karam">🌶️ Karam Powders (కారాలు)</option>
                  <option value="masala">🌿 Masala Powders (మసాలాలు)</option>
                  <option value="podi">🍚 Podis (పొడులు)</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive / Draft</option>
                </select>
              </div>

              {/* Add Product Button */}
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-600/30 transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Pricing & Variants</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <Package className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                          <p className="font-semibold text-slate-300">No products found</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Try adjusting your search or filters, or add a new product above.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const baseVariant = product.variants[0];
                        const hasDiscount =
                          baseVariant?.comparePrice && baseVariant.comparePrice > baseVariant.price;
                        const discountPct = hasDiscount
                          ? Math.round(
                              ((baseVariant.comparePrice! - baseVariant.price) /
                                baseVariant.comparePrice!) *
                                100
                            )
                          : 0;

                        return (
                          <tr
                            key={product.id}
                            className="hover:bg-slate-900/40 transition-colors group"
                          >
                            {/* Product Info */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                                  <img
                                    src={product.images[0]}
                                    alt={product.name_en}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        import.meta.env.BASE_URL + 'images/pickle.jpg';
                                    }}
                                  />
                                  {product.badge && (
                                    <span className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950 uppercase">
                                      {product.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                                    {product.name_en}
                                  </p>
                                  <p
                                    className="text-xs text-slate-400 truncate"
                                    style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                                  >
                                    {product.name_te}
                                  </p>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    {product.slug}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 capitalize border border-slate-700/60">
                                {product.category}
                              </span>
                            </td>

                            {/* Pricing & Variants */}
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-400 text-base">
                                    ₹{baseVariant.price}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-xs text-slate-500 line-through">
                                      ₹{baseVariant.comparePrice}
                                    </span>
                                  )}
                                  {discountPct > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                      {discountPct}% OFF
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400">({baseVariant.weight})</span>
                                </div>
                                <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
                                  {product.variants.map((v, i) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800"
                                    >
                                      {v.weight}: ₹{v.price}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-4">
                              <button
                                onClick={() => {
                                  toggleProductActive(product.id);
                                  toast.success(
                                    `Product marked as ${
                                      !product.is_active ? 'Active' : 'Inactive'
                                    }`
                                  );
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                  product.is_active
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    product.is_active ? 'bg-emerald-400' : 'bg-slate-500'
                                  }`}
                                />
                                {product.is_active ? 'Active' : 'Draft'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Quick Price Edit */}
                                <button
                                  onClick={() => setQuickPriceProduct(product)}
                                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition-colors"
                                  title="Quick update price & discounts"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>

                                {/* Full Edit */}
                                <button
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setProductModalOpen(true);
                                  }}
                                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition-colors"
                                  title="Edit full product details"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => setDeleteConfirmId(product.id)}
                                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors"
                                  title="Delete product"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: DISCOUNT ANNOUNCEMENT BAR                             */}
        {/* ============================================================ */}
        {activeTab === 'announcement' && (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Form Settings */}
            <div className="lg:col-span-7 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Storefront Announcement Banner
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    This bar appears right at the top of your store across all pages.
                  </p>
                </div>

                {/* Master Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-300">
                    {annForm.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <div
                    onClick={() => setAnnForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      annForm.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        annForm.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                {/* Tag Badge & Discount % */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Badge / Tag Label
                    </label>
                    <input
                      type="text"
                      value={annForm.tag}
                      onChange={(e) => setAnnForm({ ...annForm, tag: e.target.value })}
                      placeholder="e.g. FESTIVE SPECIAL, FLASH SALE"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Discount Percentage (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={annForm.discountPercent}
                        onChange={(e) =>
                          setAnnForm({ ...annForm, discountPercent: Number(e.target.value) })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                      <Percent className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Main Headline (English) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Headline Announcement (English)
                  </label>
                  <input
                    type="text"
                    value={annForm.headline}
                    onChange={(e) => setAnnForm({ ...annForm, headline: e.target.value })}
                    placeholder="e.g. Flat 15% OFF on Authentic Andhra Pickles & Podis!"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Telugu Translation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Headline (Telugu - Optional)
                  </label>
                  <input
                    type="text"
                    value={annForm.headline_te || ''}
                    onChange={(e) => setAnnForm({ ...annForm, headline_te: e.target.value })}
                    placeholder="e.g. అన్ని ఆంధ్ర ఊరగాయలు & పొడులపై 15% ప్రత్యేక తగ్గింపు!"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                  />
                </div>

                {/* Coupon Code & Min Order */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Coupon Code (Auto-Copied on Click)
                    </label>
                    <input
                      type="text"
                      value={annForm.couponCode}
                      onChange={(e) =>
                        setAnnForm({ ...annForm, couponCode: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. SWAGRUHA15"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500 uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Minimum Order Value (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={annForm.minOrderValue}
                      onChange={(e) =>
                        setAnnForm({ ...annForm, minOrderValue: Number(e.target.value) })
                      }
                      placeholder="0 for no minimum"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Link URL & CTA Text */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={annForm.linkText}
                      onChange={(e) => setAnnForm({ ...annForm, linkText: e.target.value })}
                      placeholder="e.g. Order Now, Shop Pickles"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Target Link
                    </label>
                    <input
                      type="text"
                      value={annForm.linkUrl}
                      onChange={(e) => setAnnForm({ ...annForm, linkUrl: e.target.value })}
                      placeholder="e.g. /products or /category/pickles"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Color Theme Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Banner Color Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { key: 'crimson', name: 'Crimson Red', color: 'bg-red-700' },
                      { key: 'emerald', name: 'Emerald Green', color: 'bg-emerald-700' },
                      { key: 'amber', name: 'Spice Amber', color: 'bg-amber-600' },
                      { key: 'charcoal', name: 'Midnight Dark', color: 'bg-slate-900' },
                      { key: 'purple', name: 'Royal Purple', color: 'bg-purple-800' },
                    ].map((theme) => (
                      <button
                        key={theme.key}
                        type="button"
                        onClick={() =>
                          setAnnForm({ ...annForm, theme: theme.key as DiscountAnnouncement['theme'] })
                        }
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all ${
                          annForm.theme === theme.key
                            ? 'border-amber-400 bg-slate-800 text-white shadow-md'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${theme.color} flex-shrink-0`} />
                        <span className="truncate">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save & Publish Announcement</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Real-Time Preview */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    Live Banner Preview
                  </h3>
                  <span className="text-[11px] text-slate-400">Desktop & Mobile simulated</span>
                </div>

                {/* Simulated Web View Box */}
                <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900 shadow-inner">
                  {/* Fake browser bar */}
                  <div className="bg-slate-800/80 px-3 py-2 border-b border-slate-700 flex items-center gap-2 text-[11px] text-slate-400">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <span className="font-mono text-xs text-slate-300 ml-2">
                      sudhaswagruha.com
                    </span>
                  </div>

                  {/* Render simulated announcement bar */}
                  {annForm.enabled ? (
                    <div
                      className={`p-3 text-xs text-white transition-all ${
                        annForm.theme === 'crimson'
                          ? 'bg-gradient-to-r from-red-800 via-red-600 to-orange-700'
                          : annForm.theme === 'emerald'
                          ? 'bg-gradient-to-r from-emerald-900 via-green-700 to-teal-800'
                          : annForm.theme === 'amber'
                          ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600'
                          : annForm.theme === 'charcoal'
                          ? 'bg-gradient-to-r from-zinc-950 via-gray-900 to-black'
                          : 'bg-gradient-to-r from-purple-950 via-indigo-900 to-pink-900'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-center sm:text-left">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
                            {annForm.tag || 'Offer'}
                          </span>
                          <span className="font-medium text-xs truncate">
                            {annForm.headline || 'Announcement Headline'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-black/30 font-mono font-bold text-[11px]">
                            {annForm.couponCode}
                          </span>
                          <span className="px-2.5 py-0.5 rounded bg-white text-slate-900 font-bold text-[11px]">
                            {annForm.linkText || 'Shop'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-900">
                      Announcement Banner is currently disabled. Toggle switch to enable.
                    </div>
                  )}

                  {/* Dummy Store Header below */}
                  <div className="bg-white p-4 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌿</span>
                      <span className="font-bold text-sm text-green-900">Sudha Swagruha Foods</span>
                    </div>
                    <div className="text-xs text-gray-500">Pickles • Podis • Masalas</div>
                  </div>
                  <div className="bg-amber-50/50 p-6 text-center text-xs text-gray-400">
                    Storefront Content Preview Area
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">💡 Customer Experience Tip:</p>
                  <p>
                    When visitors click the coupon code in the announcement bar, it automatically
                    copies to their clipboard and they can paste it directly in the cart drawer to
                    instantly get <strong>{annForm.discountPercent}% OFF</strong>!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: PROMO COUPONS                                         */}
        {/* ============================================================ */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Active Discount Coupons</h2>
                <p className="text-xs text-slate-400">
                  Manage promo codes that customers can apply at cart checkout.
                </p>
              </div>
              <button
                onClick={() => setCouponModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Coupon</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    coupon.isActive
                      ? 'bg-slate-950/70 border-slate-800 shadow-xl'
                      : 'bg-slate-950/30 border-slate-850 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xl font-black text-purple-400 tracking-wider">
                        {coupon.code}
                      </span>
                      <p className="text-2xl font-bold text-white mt-1">
                        {coupon.discountPercent}% OFF
                      </p>
                    </div>
                    <button
                      onClick={() => toggleCoupon(coupon.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                        coupon.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mt-3">{coupon.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>Min order: ₹{coupon.minOrder || 0}</span>
                    <button
                      onClick={() => deleteCoupon(coupon.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      title="Delete coupon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: INSIGHTS & OVERVIEW                                   */}
        {/* ============================================================ */}
        {activeTab === 'insights' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white mb-4">Category Distribution</h3>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const count = products.filter((p) => p.category === cat.slug).length;
                  const pct = Math.round((count / (products.length || 1)) * 100);
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>
                          {cat.icon} {cat.name_en}
                        </span>
                        <span className="font-mono">{count} items ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white mb-4">Discount & Pricing Status</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                  <span>Products with Compare Price (Strike-through)</span>
                  <span className="font-bold text-emerald-400">{stats.discounted}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                  <span>Active Announcement Bar</span>
                  <span className="font-bold text-amber-400">
                    {announcement.enabled ? `${announcement.discountPercent}% OFF` : 'Off'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                  <span>Active Promo Coupons</span>
                  <span className="font-bold text-purple-400">
                    {coupons.filter((c) => c.isActive).length}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-slate-300">
                  <span>Free Shipping Threshold</span>
                  <span className="font-bold text-white">Orders above ₹499</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white mb-2">Database & Storage Status</h3>
              <p className="text-xs text-slate-400 mb-4">
                Your products and discounts are stored reactively and synced to local storage.
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <p>
                  ✅ <strong>Instant Storefront Reflection:</strong> Price changes and new products
                  are live immediately on the customer pages.
                </p>
                <p>
                  ✅ <strong>Safe Reset:</strong> You can reset back to the 10 original Telugu
                  Swagruha Foods recipes at any time.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT FULL PRODUCT                               */}
      {/* ============================================================ */}
      <AnimatePresence>
        {productModalOpen && (
          <ProductEditorModal
            product={editingProduct}
            onClose={() => {
              setProductModalOpen(false);
              setEditingProduct(null);
            }}
            onSave={(productData) => {
              if (editingProduct) {
                updateProduct(editingProduct.id, productData);
                toast.success(`Updated ${productData.name_en}!`);
              } else {
                addProduct(productData as Omit<Product, 'id' | 'created_at'>);
                toast.success(`Added new product ${productData.name_en}!`);
              }
              setProductModalOpen(false);
              setEditingProduct(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: QUICK UPDATE PRICE & DISCOUNT                         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {quickPriceProduct && (
          <QuickPriceModal
            product={quickPriceProduct}
            onClose={() => setQuickPriceProduct(null)}
            onSave={(variantIndex, price, comparePrice, stock) => {
              updateVariantPrice(quickPriceProduct.id, variantIndex, price, comparePrice, stock);
              toast.success(`Prices updated for ${quickPriceProduct.name_en}!`);
              setQuickPriceProduct(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: CREATE NEW COUPON                                     */}
      {/* ============================================================ */}
      <AnimatePresence>
        {couponModalOpen && (
          <CouponEditorModal
            onClose={() => setCouponModalOpen(false)}
            onSave={(couponData) => {
              addCoupon(couponData);
              toast.success(`Created coupon ${couponData.code}!`);
              setCouponModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: DELETE CONFIRMATION                                   */}
      {/* ============================================================ */}
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
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Product?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to remove this product from the storefront?
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
                    deleteProduct(deleteConfirmId);
                    toast.success('Product deleted.');
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

      {/* ============================================================ */}
      {/* MODAL: RESET DEFAULTS CONFIRMATION                           */}
      {/* ============================================================ */}
      <AnimatePresence>
        {resetConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Reset to Original Defaults?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This will reload the initial authentic Andhra Swagruha recipes, original prices,
                  and announcement settings.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setResetConfirmOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resetToDefaults();
                    toast.success('Catalog reset to default sample recipes.');
                    setResetConfirmOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/30"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// SUBCOMPONENT: Full Product Editor Modal (Add & Edit)
// ============================================================
function ProductEditorModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
}) {
  const isEdit = !!product;

  const [nameEn, setNameEn] = useState(product?.name_en || '');
  const [nameTe, setNameTe] = useState(product?.name_te || '');
  const [category, setCategory] = useState<Product['category']>(product?.category || 'pickles');
  const [slug, setSlug] = useState(product?.slug || '');
  const [badge, setBadge] = useState<Product['badge']>(product?.badge || undefined);
  const [descriptionEn, setDescriptionEn] = useState(product?.description_en || '');
  const [descriptionTe, setDescriptionTe] = useState(product?.description_te || '');
  const [ingredientsEn, setIngredientsEn] = useState(product?.ingredients_en || '');
  const [ingredientsTe, setIngredientsTe] = useState(product?.ingredients_te || '');
  const [imageUrl, setImageUrl] = useState(
    product?.images[0] || import.meta.env.BASE_URL + 'images/pickle.jpg'
  );
  const [isActive, setIsActive] = useState(product ? product.is_active : true);

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>(
    product?.variants || [
      { weight: '250g', price: 150, comparePrice: 180, stock: 50, sku: 'SSF-NEW-250G' },
      { weight: '500g', price: 280, comparePrice: 340, stock: 35, sku: 'SSF-NEW-500G' },
      { weight: '1kg', price: 540, comparePrice: 650, stock: 20, sku: 'SSF-NEW-1KG' },
    ]
  );

  // Auto slug generation on name change
  const handleNameChange = (val: string) => {
    setNameEn(val);
    if (!isEdit) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleVariantChange = (
    index: number,
    field: keyof ProductVariant,
    value: string | number
  ) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      [field]:
        field === 'price' || field === 'comparePrice' || field === 'stock'
          ? Number(value)
          : value,
    };
    setVariants(updated);
  };

  const addVariantRow = () => {
    setVariants([
      ...variants,
      {
        weight: '250g',
        price: 150,
        comparePrice: 190,
        stock: 25,
        sku: `SSF-${Date.now().toString().slice(-4)}`,
      },
    ]);
  };

  const removeVariantRow = (index: number) => {
    if (variants.length <= 1) {
      toast.error('A product must have at least one weight variant');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      toast.error('Please enter product name in English');
      return;
    }
    if (!slug.trim()) {
      toast.error('Please provide a slug');
      return;
    }
    if (variants.length === 0 || variants.some((v) => v.price <= 0)) {
      toast.error('Please enter valid variant prices');
      return;
    }

    onSave({
      name_en: nameEn.trim(),
      name_te: nameTe.trim() || nameEn.trim(),
      slug: slug.trim(),
      category,
      badge: badge || undefined,
      description_en: descriptionEn.trim(),
      description_te: descriptionTe.trim(),
      ingredients_en: ingredientsEn.trim(),
      ingredients_te: ingredientsTe.trim(),
      images: [imageUrl.trim()],
      variants,
      is_active: isActive,
      is_demo: false,
      rating: product?.rating || 4.8,
      reviewCount: product?.reviewCount || 1,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <h2 className="font-bold text-white text-lg">
              {isEdit ? `Edit Product: ${product.name_en}` : 'Add New Handcrafted Product'}
            </h2>
            <p className="text-xs text-slate-400">
              Configure name, prices, discount compare values, weight variants & photos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-1">
              1. Basic Information
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Gongura Mutton Pickle or Andhra Avakaya"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Name (Telugu)
                </label>
                <input
                  type="text"
                  value={nameTe}
                  onChange={(e) => setNameTe(e.target.value)}
                  placeholder="e.g. గోంగూర పచ్చడి"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Product['category'])}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="pickles">🫙 Pickles (ఊరగాయలు)</option>
                  <option value="karam">🌶️ Karam Powders (కారాలు)</option>
                  <option value="masala">🌿 Masala Powders (మసాలాలు)</option>
                  <option value="podi">🍚 Podis (పొడులు)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL Slug (Unique) *
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. andhra-avakaya"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Badge Tag (Optional)
                </label>
                <select
                  value={badge || ''}
                  onChange={(e) =>
                    setBadge((e.target.value as Product['badge']) || undefined)
                  }
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">None</option>
                  <option value="new">🌟 New Arrival</option>
                  <option value="hot">🔥 Hot Item</option>
                  <option value="bestseller">👑 Bestseller</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Photo / Image */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-1">
              2. Product Image
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Image URL or Presets
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... or /images/..."
                  className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        import.meta.env.BASE_URL + 'images/pickle.jpg';
                    }}
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400">Click presets:</span>
                {IMAGE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Pricing & Variants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                3. Weights, Pricing & Discount Compare Values
              </h3>
              <button
                type="button"
                onClick={addVariantRow}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, i) => {
                const discount =
                  v.comparePrice && v.comparePrice > v.price
                    ? Math.round(((v.comparePrice - v.price) / v.comparePrice) * 100)
                    : 0;

                return (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-800/60 p-3 rounded-xl border border-slate-750"
                  >
                    <div className="col-span-3 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Weight</label>
                      <input
                        type="text"
                        value={v.weight}
                        onChange={(e) => handleVariantChange(i, 'weight', e.target.value)}
                        placeholder="250g"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        required
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Selling (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={v.price}
                        onChange={(e) => handleVariantChange(i, 'price', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-emerald-400"
                        required
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Compare/MRP (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={v.comparePrice || ''}
                        onChange={(e) => handleVariantChange(i, 'comparePrice', e.target.value)}
                        placeholder="Original"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-400"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Discount</label>
                      <div className="py-1.5 text-xs font-bold">
                        {discount > 0 ? (
                          <span className="text-red-400">{discount}% OFF</span>
                        ) : (
                          <span className="text-slate-500 font-normal">No discount</span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Stock Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => handleVariantChange(i, 'stock', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-2 flex items-center justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => removeVariantRow(i)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Descriptions & Ingredients */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-1">
              4. Descriptions & Ingredients
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description (English)
                </label>
                <textarea
                  rows={2}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder="Authentic Andhra homemade recipe crafted with sun-dried spices..."
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description (Telugu)
                </label>
                <textarea
                  rows={2}
                  value={descriptionTe}
                  onChange={(e) => setDescriptionTe(e.target.value)}
                  placeholder="అచ్చమైన సంప్రదాయ రుచితో తయారైన పచ్చడి..."
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ingredients (English)
                </label>
                <input
                  type="text"
                  value={ingredientsEn}
                  onChange={(e) => setIngredientsEn(e.target.value)}
                  placeholder="e.g. Raw Mango, Mustard Powder, Red Chilli, Sesame Oil"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ingredients (Telugu)
                </label>
                <input
                  type="text"
                  value={ingredientsTe}
                  onChange={(e) => setIngredientsTe(e.target.value)}
                  placeholder="e.g. మామిడి ముక్కలు, ఆవపిండి, కారం, నువ్వుల నూనె"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="pt-2 flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white">Publish Status</p>
                <p className="text-[11px] text-slate-400">
                  {isActive ? 'Product will be visible to all customers' : 'Saved as draft'}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-200">
                  {isActive ? 'Published & Active' : 'Draft Only'}
                </span>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isEdit ? 'Save Changes' : 'Publish Product'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================
// SUBCOMPONENT: Quick Price & Discount Modal
// ============================================================
function QuickPriceModal({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: (
    variantIndex: number,
    price: number,
    comparePrice?: number,
    stock?: number
  ) => void;
}) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const currentVariant = product.variants[selectedVariantIndex];

  const [price, setPrice] = useState(currentVariant.price);
  const [comparePrice, setComparePrice] = useState<number | undefined>(
    currentVariant.comparePrice
  );
  const [stock, setStock] = useState(currentVariant.stock);

  // Sync when variant selection changes
  const handleSelectVariant = (index: number) => {
    setSelectedVariantIndex(index);
    const v = product.variants[index];
    setPrice(v.price);
    setComparePrice(v.comparePrice);
    setStock(v.stock);
  };

  const discountPercent =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : 0;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedVariantIndex, price, comparePrice, stock);
  };

  return (
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
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Quick Price & Discount Update
            </h3>
            <p className="text-xs text-slate-400 truncate">{product.name_en}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Variant Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Select Weight Variant:
          </label>
          <div className="flex gap-2">
            {product.variants.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectVariant(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedVariantIndex === i
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {v.weight}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Compare / MRP (₹)
              </label>
              <input
                type="number"
                min="0"
                value={comparePrice || ''}
                onChange={(e) =>
                  setComparePrice(e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="Strike-through price"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Discount Pill Calculation */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Discount Offered:</span>
            {discountPercent > 0 ? (
              <span className="px-2 py-0.5 rounded-md font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                {discountPercent}% OFF (Save ₹{(comparePrice ?? 0) - price})
              </span>
            ) : (
              <span className="text-slate-500">Regular price (no discount badge)</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Stock In Hand (Units)
            </label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30"
            >
              Update Price
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================
// SUBCOMPONENT: Create Coupon Modal
// ============================================================
function CouponEditorModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (coupon: Omit<CouponItem, 'id' | 'usageCount'>) => void;
}) {
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(15);
  const [description, setDescription] = useState('');
  const [minOrder, setMinOrder] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter coupon code');
      return;
    }
    onSave({
      code: code.trim().toUpperCase(),
      discountPercent,
      description: description.trim() || `${discountPercent}% off storewide`,
      minOrder,
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Create Promo Coupon
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Coupon Code *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FESTIVE25"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono font-bold text-purple-400 focus:outline-none focus:border-purple-500 uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Discount Percentage (%) *
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Minimum Order Value (₹)
            </label>
            <input
              type="number"
              min="0"
              value={minOrder}
              onChange={(e) => setMinOrder(Number(e.target.value))}
              placeholder="0 for no minimum"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Note
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 15% OFF for Andhra festival orders"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30"
            >
              Create Coupon
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
