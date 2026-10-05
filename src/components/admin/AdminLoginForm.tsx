// ============================================================
// Admin Login Form Component
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sliders, Lock, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/hooks/useStore';
import toast from 'react-hot-toast';

export default function AdminLoginForm({ onLogin }: { onLogin?: () => void }) {
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
      setAdmin(true, data.user?.email || email);
      toast.success('Welcome back, Admin!');
      if (onLogin) onLogin();
    } catch {
      // Demo credentials check
      if (
        (email.trim().toLowerCase() === 'admin@sudhaswagruha.com' && password === 'admin123') ||
        (email.trim().toLowerCase() === 'admin@sudhafoods.com' && password === 'admin123')
      ) {
        setAdmin(true, email);
        toast.success('Welcome back, Admin! (Demo Mode)');
        if (onLogin) onLogin();
      } else {
        toast.error('Invalid credentials. Check email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@sudhaswagruha.com');
    setPassword('admin123');
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Console</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sudha Swagruha Foods • Order Processing & Store Management
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Admin Email
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

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">Demo Login:</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
            >
              Fill Demo Credentials
            </button>
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
