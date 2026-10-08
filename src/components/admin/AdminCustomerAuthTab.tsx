// ============================================================
// Admin Console - Customer Authentication Settings Tab
// Requirements: 4.1, 4.3, 5.1, 5.2
// Admin controls for Customer Login, Mobile OTP, Google OAuth,
// Guest Checkout, OTP Expiration, Cooldowns, and Brute-force protection.
// ============================================================
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Smartphone,
  ShieldAlert,
  Clock,
  KeyRound,
  CheckCircle2,
  Save,
  RotateCcw,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import type { CustomerAuthSettings } from '@/services/websiteSettingsTypes';
import toast from 'react-hot-toast';

export default function AdminCustomerAuthTab() {
  const { settings, updateCustomerAuthSettings } = useSettingsStore();
  const currentAuth = settings.customerAuth;

  const [authConfig, setAuthConfig] = useState<CustomerAuthSettings>({
    ...currentAuth,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateCustomerAuthSettings(authConfig);
      setSaveSuccess(true);
      toast.success('Customer authentication settings saved and synchronized!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Unable to save authentication settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defaults: CustomerAuthSettings = {
      customerLoginEnabled: true,
      mobileOtpEnabled: true,
      googleLoginEnabled: true,
      allowGuestCheckout: true,
      otpExpirationMinutes: 5,
      otpResendCooldownSeconds: 30,
      maxOtpRetries: 3,
      rateLimitMaxRequestsPer15Min: 5,
      forceLoginToBrowse: false,
    };
    setAuthConfig(defaults);
    updateCustomerAuthSettings(defaults);
    toast.success('Reset customer authentication controls to standard defaults');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Lock className="w-6 h-6 text-sky-400" />
            <span>Customer Authentication & Login Controls</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Toggle customer login, Mobile OTP, Google sign-in, guest checkout rules, and brute-force protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : isSaving
                ? 'bg-sky-600/70 text-sky-100 cursor-not-allowed'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 active:scale-95'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Saved successfully</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Master Toggles */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
            <Users className="w-4 h-4 text-sky-400" />
            <span>Authentication Methods & Guest Rules</span>
          </h3>

          <div className="space-y-4">
            {/* Master Customer Login Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="text-sm font-bold text-white">Enable Customer Login</span>
                <p className="text-[11px] text-slate-400">
                  Allow customers to sign into accounts, save addresses, view past orders.
                </p>
              </div>
              <input
                type="checkbox"
                checked={authConfig.customerLoginEnabled}
                onChange={(e) => setAuthConfig({ ...authConfig, customerLoginEnabled: e.target.checked })}
                className="w-5 h-5 text-sky-500 rounded border-slate-700 bg-slate-800 focus:ring-sky-400"
              />
            </div>

            {/* Mobile OTP Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="text-sm font-bold text-white">Mobile OTP Login</span>
                <p className="text-[11px] text-slate-400">
                  Passwordless phone number verification via instant SMS OTP.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!authConfig.customerLoginEnabled}
                checked={authConfig.mobileOtpEnabled}
                onChange={(e) => setAuthConfig({ ...authConfig, mobileOtpEnabled: e.target.checked })}
                className="w-5 h-5 text-sky-500 rounded border-slate-700 bg-slate-800 focus:ring-sky-400 disabled:opacity-50"
              />
            </div>

            {/* Google OAuth Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="text-sm font-bold text-white">Google One-Tap / OAuth Sign-in</span>
                <p className="text-[11px] text-slate-400">
                  Allow one-click sign-in using verified Google accounts.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!authConfig.customerLoginEnabled}
                checked={authConfig.googleLoginEnabled}
                onChange={(e) => setAuthConfig({ ...authConfig, googleLoginEnabled: e.target.checked })}
                className="w-5 h-5 text-sky-500 rounded border-slate-700 bg-slate-800 focus:ring-sky-400 disabled:opacity-50"
              />
            </div>

            {/* Guest Checkout Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="text-sm font-bold text-white">Allow Guest Checkout</span>
                <p className="text-[11px] text-slate-400">
                  Customers can complete checkout without creating or signing into an account.
                </p>
              </div>
              <input
                type="checkbox"
                checked={authConfig.allowGuestCheckout}
                onChange={(e) => setAuthConfig({ ...authConfig, allowGuestCheckout: e.target.checked })}
                className="w-5 h-5 text-emerald-500 rounded border-slate-700 bg-slate-800 focus:ring-emerald-400"
              />
            </div>

            {/* Force Login to Browse Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="text-sm font-bold text-amber-300">Force Login to Browse</span>
                <p className="text-[11px] text-slate-400">
                  (Wholesale / Member Only mode) Requires login before seeing catalog prices.
                </p>
              </div>
              <input
                type="checkbox"
                checked={authConfig.forceLoginToBrowse}
                onChange={(e) => setAuthConfig({ ...authConfig, forceLoginToBrowse: e.target.checked })}
                className="w-5 h-5 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Right Col: Security, Rate Limits & Expiration */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Security & Rate Limiting Thresholds</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                OTP Expiration Window (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={authConfig.otpExpirationMinutes}
                onChange={(e) =>
                  setAuthConfig({
                    ...authConfig,
                    otpExpirationMinutes: Math.max(1, Number(e.target.value) || 5),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">Generated OTP codes automatically expire after this period.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                OTP Resend Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={authConfig.otpResendCooldownSeconds}
                onChange={(e) =>
                  setAuthConfig({
                    ...authConfig,
                    otpResendCooldownSeconds: Math.max(10, Number(e.target.value) || 30),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Minimum countdown seconds before customer can click &quot;Resend OTP&quot;.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Maximum Failed Attempts (Brute-force Shield)
              </label>
              <input
                type="number"
                min="2"
                max="6"
                value={authConfig.maxOtpRetries}
                onChange={(e) =>
                  setAuthConfig({
                    ...authConfig,
                    maxOtpRetries: Math.max(2, Number(e.target.value) || 3),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Invalidates the code if incorrect OTP is entered consecutively this many times.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                IP Rate Limit (Max Requests per 15 min)
              </label>
              <input
                type="number"
                min="3"
                max="20"
                value={authConfig.rateLimitMaxRequestsPer15Min}
                onChange={(e) =>
                  setAuthConfig({
                    ...authConfig,
                    rateLimitMaxRequestsPer15Min: Math.max(3, Number(e.target.value) || 5),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Protects against SMS flood attacks and unauthorized spamming.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
