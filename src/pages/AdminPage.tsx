// ============================================================
// Admin Panel
// ============================================================
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Percent,
  LogOut, TrendingUp, Users, AlertCircle, Eye, Edit, Trash2
} from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/hooks/useStore';
import { sampleProducts } from '@/data/products';
import toast from 'react-hot-toast';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'categories' | 'offers';

const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-cyan-100 text-cyan-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  packed: 'bg-orange-100 text-orange-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// ─── Login Screen ─────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAdmin } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAdmin(true, data.user?.email);
      toast.success('Welcome back, Admin!');
      onLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      // Demo mode login
      if (email === 'admin@sudhaswagruha.com' && password === 'admin123') {
        setAdmin(true, email);
        toast.success('Welcome back, Admin! (Demo Mode)');
        onLogin();
      } else {
        toast.error(msg || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-green flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sudha Swagruha Foods</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green"
              placeholder="admin@sudhaswagruha.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            💡 Demo: admin@sudhaswagruha.com / admin123
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-white py-3.5 rounded-xl font-bold hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────
export default function AdminPage() {
  const { isAdmin, logout } = useAuthStore();
  const [loggedIn, setLoggedIn] = useState(isAdmin);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  const stats = [
    { icon: ShoppingBag, label: 'Total Orders', value: '24', change: '+12%', color: 'bg-blue-100 text-blue-600' },
    { icon: TrendingUp, label: 'Total Revenue', value: '₹12,480', change: '+8%', color: 'bg-green-100 text-green-600' },
    { icon: AlertCircle, label: 'Pending Orders', value: '6', change: '2 urgent', color: 'bg-yellow-100 text-yellow-600' },
    { icon: Package, label: 'Total Products', value: String(sampleProducts.length), change: '2 out of stock', color: 'bg-purple-100 text-purple-600' },
  ];

  const navItems: { tab: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { tab: 'products', label: 'Products', icon: Package },
    { tab: 'orders', label: 'Orders', icon: ShoppingBag },
    { tab: 'categories', label: 'Categories', icon: Tag },
    { tab: 'offers', label: 'Offers', icon: Percent },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-gray-900 text-white min-h-screen">
        <div className="p-5 border-b border-gray-800">
          <p className="font-bold text-lg">Sudha Admin</p>
          <p className="text-xs text-gray-400">Swagruha Foods</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.tab
                  ? 'bg-brand-green text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold text-xl text-gray-900 capitalize">{activeTab}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Admin</span>
            <button onClick={handleLogout} className="lg:hidden text-gray-500 hover:text-brand-red">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Nav */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                activeTab === item.tab
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-6">
          {/* ── Dashboard ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl p-5 shadow-card"
                  >
                    <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                    <p className="text-xs text-green-600 mt-1">{s.change}</p>
                  </motion.div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="font-bold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {[
                    { msg: 'New order SSF-20260926-00001 received', time: '2 min ago', type: 'order' },
                    { msg: 'Payment verified for SSF-20260925-99998', time: '1 hr ago', type: 'payment' },
                    { msg: 'Kandi Karam 500g stock running low (5 left)', time: '3 hr ago', type: 'stock' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        item.type === 'order' ? 'bg-blue-500' : item.type === 'payment' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm text-gray-700">{item.msg}</p>
                        <p className="text-xs text-gray-400">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Products ── */}
          {activeTab === 'products' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <p className="text-gray-500 text-sm">{sampleProducts.length} products</p>
                <button className="bg-brand-green text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-colors">
                  + Add Product
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Product</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Price</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleProducts.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={p.images[0]} alt={p.name_en} className="w-10 h-10 rounded-lg object-cover" />
                              <div>
                                <p className="font-medium text-gray-800">{p.name_en}</p>
                                <p className="text-xs text-gray-400">{p.variants[0].sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 capitalize text-gray-600">{p.category}</td>
                          <td className="px-4 py-3 font-semibold text-brand-green">₹{p.variants[0].price}+</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-gray-400 hover:text-brand-green hover:bg-green-50 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Orders ── */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-card p-6 text-center py-16">
              <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Orders will appear here once connected to Supabase</p>
              <p className="text-sm text-gray-400 mt-1">Configure your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</p>
            </div>
          )}

          {/* ── Categories ── */}
          {activeTab === 'categories' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { emoji: '🫙', name: 'Pickles', nameTe: 'ఊరగాయలు', count: 4 },
                { emoji: '🌶️', name: 'Karam Powders', nameTe: 'కారం పొడులు', count: 2 },
                { emoji: '🌿', name: 'Masala Powders', nameTe: 'మసాలా పొడులు', count: 2 },
                { emoji: '🍚', name: 'Podis', nameTe: 'పొడులు', count: 2 },
              ].map((cat, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-card p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{cat.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'Noto Sans Telugu' }}>{cat.nameTe}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cat.count} products</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-brand-green rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button className="bg-brand-light-green border-2 border-dashed border-brand-green text-brand-green rounded-2xl p-5 font-semibold hover:bg-brand-green hover:text-white transition-colors">
                + Add Category
              </button>
            </div>
          )}

          {/* ── Offers ── */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm">Active coupons</p>
                <button className="bg-brand-green text-white px-4 py-2 rounded-xl text-sm font-semibold">
                  + Add Coupon
                </button>
              </div>
              {[
                { code: 'AMMA10', discount: '10%', uses: 24 },
                { code: 'SWAGRUHA15', discount: '15%', uses: 12 },
                { code: 'WELCOME20', discount: '20%', uses: 5 },
                { code: 'TELUGU5', discount: '5%', uses: 67 },
              ].map((coupon, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-card p-5 flex items-center justify-between">
                  <div>
                    <code className="font-mono font-bold text-brand-green text-lg">{coupon.code}</code>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {coupon.discount} off • {coupon.uses} uses
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-brand-green rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-brand-red rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
