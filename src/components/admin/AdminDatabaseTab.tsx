// ============================================================
// Admin Console - Supabase Database & Cloud Sync Tab
// ============================================================
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Key,
  Globe,
  Shield,
  Activity,
  HardDrive,
  Copy,
  ExternalLink,
  Code,
  Tag,
  Megaphone,
} from 'lucide-react';
import { getSupabaseConfig, testSupabaseConnection } from '@/services/supabase';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useProductStore } from '@/hooks/useProductStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import toast from 'react-hot-toast';

const SQL_SCHEMA = `-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yhakphwljyjpfnsmkjnz/sql

-- 1. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent NUMERIC NOT NULL,
    description TEXT NOT NULL,
    min_order NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Store Settings & Announcement Table (Key-Value JSONB)
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policies for public.coupons
DROP POLICY IF EXISTS "Anyone can select coupons" ON public.coupons;
CREATE POLICY "Anyone can select coupons" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert coupons" ON public.coupons;
CREATE POLICY "Anyone can insert coupons" ON public.coupons FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update coupons" ON public.coupons;
CREATE POLICY "Anyone can update coupons" ON public.coupons FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete coupons" ON public.coupons;
CREATE POLICY "Anyone can delete coupons" ON public.coupons FOR DELETE USING (true);

-- Policies for public.store_settings
DROP POLICY IF EXISTS "Anyone can select store_settings" ON public.store_settings;
CREATE POLICY "Anyone can select store_settings" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert store_settings" ON public.store_settings;
CREATE POLICY "Anyone can insert store_settings" ON public.store_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update store_settings" ON public.store_settings;
CREATE POLICY "Anyone can update store_settings" ON public.store_settings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete store_settings" ON public.store_settings;
CREATE POLICY "Anyone can delete store_settings" ON public.store_settings FOR DELETE USING (true);

-- Enable Supabase Realtime for instant live updates across all customer devices
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Seed Default Announcement
INSERT INTO public.store_settings (key, value)
VALUES (
    'announcement',
    '{
        "id": "ann-1",
        "enabled": true,
        "tag": "FESTIVE SPECIAL",
        "headline": "Flat 15% OFF on Authentic Andhra Pickles & Podis! Free delivery above ₹499",
        "headline_te": "అన్ని ఆంధ్ర ఊరగాయలు & పొడులపై 15% ప్రత్యేక తగ్గింపు!",
        "couponCode": "SWAGRUHA15",
        "discountPercent": 15,
        "minOrderValue": 499,
        "linkUrl": "/products",
        "linkText": "Order Now",
        "theme": "crimson",
        "showCountdown": false
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Seed Default Contact Settings
INSERT INTO public.store_settings (key, value)
VALUES (
    'store_contact',
    '{
        "businessPhone": "8374634989",
        "businessWhatsApp": "8374634989",
        "businessEmail": "info@sudhaswagruha.com",
        "businessAddress": "Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010",
        "businessHours": "9:00 AM - 9:00 PM (All Days)",
        "paymentGatewayEnabled": false,
        "razorpayKeyId": "",
        "razorpayKeySecret": "",
        "isTestMode": true
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Seed Default Coupons
INSERT INTO public.coupons (code, discount_percent, description, min_order, is_active, usage_count)
VALUES
    ('AMMA10', 10, '10% OFF on all homemade delicacies', 0, true, 28),
    ('SWAGRUHA15', 15, 'Special 15% OFF festive announcement offer', 499, true, 64),
    ('UGADI20', 20, 'Grand festive discount for orders above ₹999', 999, true, 19)
ON CONFLICT (code) DO NOTHING;`;

export default function AdminDatabaseTab() {
  const { fetchOrdersFromSupabase } = useOrderStore();
  const { fetchCatalogAndSettings } = useProductStore();
  const { fetchSettings } = useSettingsStore();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    orderCount?: number;
    testedAt?: string;
    tables?: {
      orders: boolean;
      products: boolean;
      coupons: boolean;
      store_settings: boolean;
    };
  } | null>(null);

  useEffect(() => {
    const cfg = getSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
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
        toast.error(`Database notice: ${res.message}`);
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
    fetchCatalogAndSettings();
    fetchSettings();
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

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    toast.success('SQL Schema copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
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
            Real-time cloud database synchronization for customer orders, coupons, announcements, and contact info.
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {/* SQL Setup Banner (if coupons or store_settings not yet in DB) */}
      {(!testResult?.tables?.coupons || !testResult?.tables?.store_settings) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-amber-500/40 bg-amber-950/20 text-slate-200 space-y-3"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Code className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Enable Live Cloud Sync for Coupons & Announcement Banner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Run the SQL script once in your Supabase SQL Editor to enable real-time coupon creation, announcement bar updates, and contact info sync across all customer devices.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopySql}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer flex-1 sm:flex-initial"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy SQL Script'}</span>
              </button>
              <a
                href="https://supabase.com/dashboard/project/yhakphwljyjpfnsmkjnz/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors flex-1 sm:flex-initial"
              >
                <span>Open SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </motion.div>
      )}

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
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset to Default
              </button>
            </div>
          </form>
        </div>

        {/* Info & Sync Guidance */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Real-time Table Status</span>
            </h3>
            <div className="text-xs space-y-2 text-slate-300">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Orders Table</span>
                </span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {testResult?.tables?.orders ? 'public.orders ✓' : 'Connecting...'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  <span>Products Catalog</span>
                </span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {testResult?.tables?.products ? 'public.products ✓' : 'Connecting...'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Coupons Table</span>
                </span>
                <span className={testResult?.tables?.coupons ? 'text-emerald-400 font-mono font-semibold' : 'text-amber-400 font-mono text-[11px]'}>
                  {testResult?.tables?.coupons ? 'public.coupons ✓' : 'Run SQL to enable'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-purple-400" />
                  <span>Announcement & Settings</span>
                </span>
                <span className={testResult?.tables?.store_settings ? 'text-emerald-400 font-mono font-semibold' : 'text-amber-400 font-mono text-[11px]'}>
                  {testResult?.tables?.store_settings ? 'public.store_settings ✓' : 'Run SQL to enable'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Full Live Sync Pipeline</span>
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">1.</span>
                <span><strong>Admin Updates Announcement or Coupons:</strong> Data immediately saves to Supabase cloud.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">2.</span>
                <span><strong>PostgreSQL Realtime Broadcast:</strong> Supabase pushes change events over WebSockets to all connected visitors.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">3.</span>
                <span><strong>Live Customer Storefront:</strong> The customer&apos;s banner and valid coupon codes update live without reloading.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
