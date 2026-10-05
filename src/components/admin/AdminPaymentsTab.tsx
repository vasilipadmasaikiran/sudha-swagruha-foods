// ============================================================
// Admin Console - Payment Gateway Configuration Tab
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, Key, Lock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import toast from 'react-hot-toast';

export default function AdminPaymentsTab() {
  const { settings, updateSettings } = useSettingsStore();

  const [enabled, setEnabled] = useState(settings.paymentGatewayEnabled);
  const [keyId, setKeyId] = useState(settings.razorpayKeyId);
  const [keySecret, setKeySecret] = useState(settings.razorpayKeySecret);
  const [testMode, setTestMode] = useState(settings.isTestMode);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      paymentGatewayEnabled: enabled,
      razorpayKeyId: keyId.trim(),
      razorpayKeySecret: keySecret.trim(),
      isTestMode: testMode,
    });
    toast.success('Payment gateway configuration saved!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Payment Gateway & Checkout Methods</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure online payment gateway (Razorpay) or disable payment methods for direct WhatsApp ordering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {enabled ? 'Online Payments Active' : 'Payments Disabled (WhatsApp Order)'}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-8 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Master Toggle */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Enable Online Payment Gateway (Razorpay)</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  When disabled, the payment step is removed and customer orders are dispatched directly via WhatsApp.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                <div
                  onClick={() => setEnabled(!enabled)}
                  className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    enabled ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                      enabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Status Notice */}
            {!enabled ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Payment Gateway Currently Disabled</span>
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Customers can place orders without making online payment. Upon clicking &quot;Place Order&quot;,
                  the Order ID and itemized list are sent automatically to Business WhatsApp (
                  <strong>+91 {settings.businessWhatsApp}</strong>) and Customer WhatsApp.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Razorpay Payment Gateway Enabled</span>
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Customers will be prompted to pay via Razorpay (UPI, Google Pay, PhonePe, Cards, Net Banking) before order confirmation.
                </p>
              </div>
            )}

            {/* Gateway Credentials */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Razorpay API Credentials
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>Razorpay Key ID</span>
                </label>
                <input
                  type="text"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  placeholder="e.g. rzp_live_xxxxxxxxxxxx or rzp_test_xxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Obtained from your Razorpay Dashboard &gt; Settings &gt; API Keys
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Razorpay Key Secret</span>
                </label>
                <input
                  type="password"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Stored securely for server-side verification
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-300">Environment Mode</p>
                  <p className="text-[11px] text-slate-500">
                    {testMode ? 'Test Mode (Sandbox / Simulation)' : 'Production (Live Payments)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestMode(!testMode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    testMode
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {testMode ? 'Sandbox Test Mode' : 'Live Production'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Payment Configuration</span>
            </button>
          </form>
        </div>

        {/* Helpful Guide Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Checkout Flow Guide</span>
            </h3>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="font-semibold text-emerald-400 mb-1">1. Direct WhatsApp Mode (Default)</p>
                <p className="text-slate-400">
                  Best for traditional homemade food businesses! When online payment is disabled, customers fill their address and click &quot;Place Order via WhatsApp&quot;.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="font-semibold text-blue-400 mb-1">2. Online Gateway Mode</p>
                <p className="text-slate-400">
                  When you want instant prepaid transactions, enable the switch and provide your Razorpay API key.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="font-semibold text-purple-400 mb-1">3. Status Notifications</p>
                <p className="text-slate-400">
                  In both modes, the order is recorded in the Admin Orders tab, and WhatsApp notifications are triggered for both business owner and customer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
