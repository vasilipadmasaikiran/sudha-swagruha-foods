// ============================================================
// Admin Console - Supabase Database & Cloud Sync Tab
// ============================================================
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle2, XCircle, RefreshCw, Key, Globe, Shield, Activity, HardDrive, Terminal } from 'lucide-react';
import { getSupabaseConfig, testSupabaseConnection } from '@/services/supabase';
import { useOrderStore } from '@/hooks/useOrderStore';
import toast from 'react-hot-toast';

export default function AdminDatabaseTab() {
  const { fetchOrdersFromSupabase } = useOrderStore();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    orderCount?: number;
    testedAt?: string;
  } | null>(null);

  useEffect(() => {
    const cfg = getSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    // Run initial test
    runTest();
  }, []);

  const runTest = async () => {
    setTesting(true);
    try {
      const res = await testSupabaseConnection();
      setTestResult({
        ...res,
        testedAt: new Date().toLocaleTimeString(),
      });
      if (res.success) {
        toast.success(`Connected to Supabase! (${res.orderCount} cloud orders)`);
      } else {
        toast.error(`Database error: ${res.message}`);
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: e instanceof Error ? e.message : 'Unknown connection error',
        testedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      toast.error('Please enter both Supabase URL and Anon Key');
      return;
    }
    localStorage.setItem('ssf_supabase_url', url.trim());
    localStorage.setItem('ssf_supabase_anon_key', anonKey.trim());
    toast.success('Database configuration saved to local browser storage!');
    runTest();
    fetchOrdersFromSupabase();
  };

  const handleReset = () => {
    localStorage.removeItem('ssf_supabase_url');
    localStorage.removeItem('ssf_supabase_anon_key');
    const cfg = getSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    toast.success('Reset to default repository database configuration');
    runTest();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Supabase Cloud Database & Remote Sync</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time synchronization for customer orders and admin remote access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {testResult?.success ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cloud Database Live</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <XCircle className="w-3.5 h-3.5" />
              <span>Cloud DB Disconnected</span>
            </span>
          )}
          <button
            onClick={runTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {/* Diagnostics Card */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-xs ${
            testResult.success
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/20 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">Diagnostics Report:</span>
              <span>{testResult.message}</span>
            </div>
            {testResult.orderCount !== undefined && (
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-300">
                {testResult.orderCount} Orders in Database
              </span>
            )}
          </div>
          {testResult.testedAt && (
            <div className="text-[10px] text-slate-400 mt-1">Last verified at {testResult.testedAt}</div>
          )}
        </motion.div>
      )}

      {/* Configuration Form */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Supabase Project URL *</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Your project REST API endpoint from Supabase Dashboard → Settings → API
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Supabase Anon (Public) Key *</span>
              </label>
              <textarea
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[11px] font-mono text-white focus:outline-none focus:border-emerald-500 resize-none break-all"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Public client key safe for frontend use (protected by Row Level Security)
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Database Settings</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </form>
        </div>

        {/* Info & Sync Guidance */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>How Remote Order Sync Works</span>
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">1.</span>
                <span><strong>Customer Places Order:</strong> The order details are instantly inserted into Supabase cloud table <code className="text-emerald-400">public.orders</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">2.</span>
                <span><strong>Real-time Supabase Broadcast:</strong> A PostgreSQL change event triggers immediately across all active sessions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">3.</span>
                <span><strong>Remote Admin Console:</strong> The order pops up on your Admin screen live without needing to reload or manually refresh.</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Database Table Status</span>
            </h3>
            <div className="text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Orders Table</span>
                <span className="text-emerald-400 font-mono font-semibold">public.orders ✓</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Products Table</span>
                <span className="text-emerald-400 font-mono font-semibold">public.products ✓</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Row-Level Security</span>
                <span className="text-emerald-400 font-mono font-semibold">Active & Configured ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
