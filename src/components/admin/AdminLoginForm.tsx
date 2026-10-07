// ============================================================
// Enterprise Admin Login Form with Multi-Role Authentication
// Requirements 7, 8, 9, 13
// Supports Root Admin, Store Keeper, Order Processor
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sliders, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Package, ShoppingBag } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/hooks/useStore';
import { useAdminAuthStore, type AdminRole } from '@/hooks/useAdminAuthStore';
import toast from 'react-hot-toast';

export default function AdminLoginForm({ onLogin }: { onLogin?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAdmin } = useAuthStore();
  const { login: rbacLogin } = useAdminAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Try RBAC authenticated login
      const rbacResult = await rbacLogin(email.trim(), password);
      if (rbacResult.success) {
        setAdmin(true, email.trim());
        toast.success(`Welcome to Admin Console! Authenticated via RBAC.`);
        if (onLogin) onLogin();
        return;
      }

      // 2. Fallback to Supabase Auth if credentials match Supabase user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!error && data.user) {
        setAdmin(true, data.user?.email || email.trim());
        toast.success('Welcome back, Admin!');
        if (onLogin) onLogin();
        return;
      }

      toast.error(rbacResult.error || 'Invalid email or password.');
    } catch (err: any) {
      toast.error(err.message || 'Authentication error. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillRole = (targetEmail: string, pass: string) => {
    setEmail(targetEmail);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Sliders className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Admin Console</h1>
          <p className="text-xs text-slate-400 mt-1">
            Role-Based Access Control • Order Processing & Inventory
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Account Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="admin@sudhaswagruha.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Quick RBAC Role Selectors */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-xs space-y-2">
            <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">
              Quick Role Switch (Demo Credentials):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleFillRole('admin@sudhaswagruha.com', 'admin123')}
                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Root Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillRole('store@sudhaswagruha.com', 'store123')}
                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Store Keeper</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillRole('orders@sudhaswagruha.com', 'orders123')}
                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Order Proc.</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Admin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              to="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-block"
            >
              ← Back to Customer Storefront
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
