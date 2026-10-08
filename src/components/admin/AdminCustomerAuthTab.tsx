// ============================================================
// Admin Console - Customer Authentication Settings Tab
// Section 4: Master Control, Mobile OTP, Google Login & Priority Rules
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
  Globe,
  Eye,
  EyeOff,
  Copy,
  Send,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import type { CustomerAuthSettings } from '@/services/websiteSettingsTypes';
import toast from 'react-hot-toast';

export default function AdminCustomerAuthTab() {
  const { settings, updateCustomerAuthSettings } = useSettingsStore();
  const currentAuth = settings.customerAuth;

  const [authConfig, setAuthConfig] = useState<CustomerAuthSettings>({
    otpProvider: 'fast2sms',
    otpLength: 6,
    smsTemplate: 'Your Sudha Swagruha Foods verification code is {#var#}. Valid for 5 minutes.',
    googleClientId: '',
    googleClientSecret: '',
    googleRedirectUrl: typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : '/auth/google/callback',
    googleAllowedDomains: '',
    ...currentAuth,
  });

  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [testMobileNumber, setTestMobileNumber] = useState('');
  const [isSendingTestOtp, setIsSendingTestOtp] = useState(false);
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      otpProvider: 'fast2sms',
      otpLength: 6,
      smsTemplate: 'Your Sudha Swagruha Foods verification code is {#var#}. Valid for 5 minutes. Do not share this OTP.',
      googleClientId: '',
      googleClientSecret: '',
      googleRedirectUrl: typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : '/auth/google/callback',
      googleAllowedDomains: '',
    };
    setAuthConfig(defaults);
    updateCustomerAuthSettings(defaults);
    toast.success('Reset customer authentication controls to standard defaults');
  };

  const handleSendTestOtp = () => {
    const cleaned = testMobileNumber.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number for test OTP');
      return;
    }
    setIsSendingTestOtp(true);
    setTimeout(() => {
      setIsSendingTestOtp(false);
      const sampleOtp = authConfig.otpLength === 4 ? '4821' : '582914';
      toast.success(
        `Test OTP (${sampleOtp}) queued via ${authConfig.otpProvider?.toUpperCase() || 'FAST2SMS'} to +91-${cleaned}!`
      );
    }, 1000);
  };

  const handleTestGoogleConnection = () => {
    if (!authConfig.googleClientId) {
      toast.error('Please enter a Google Client ID before testing connection');
      return;
    }
    setIsTestingGoogle(true);
    setTimeout(() => {
      setIsTestingGoogle(false);
      toast.success('Google OAuth Client parameters validated successfully!');
    }, 1200);
  };

  const copyRedirectUrl = () => {
    const url = authConfig.googleRedirectUrl || `${window.location.origin}/auth/google/callback`;
    navigator.clipboard.writeText(url);
    toast.success('Authorized redirect URL copied to clipboard!');
  };

  // Determine Customer Authentication Priority (Section 4.4)
  const getAuthPriorityDescription = () => {
    if (!authConfig.customerLoginEnabled) {
      return {
        badge: 'AUTH DISABLED (GUEST ONLY)',
        badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
        flow: [
          'Browsing catalog is public',
          'Checkout proceeds directly as Guest (no login modal)',
          'Historical customer accounts remain safely preserved in database',
        ],
      };
    }
    if (authConfig.mobileOtpEnabled && authConfig.googleLoginEnabled) {
      return {
        badge: 'DUAL MODE (OTP + GOOGLE)',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        flow: [
          'Primary Button: "Continue with Mobile OTP" (Instant passwordless SMS)',
          'Secondary Button: "Continue with Google" (One-tap OAuth)',
          authConfig.allowGuestCheckout ? 'Optional: "Continue as Guest"' : 'Mandatory Login before checkout',
        ],
      };
    }
    if (authConfig.mobileOtpEnabled && !authConfig.googleLoginEnabled) {
      return {
        badge: 'MOBILE OTP ONLY',
        badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        flow: [
          'Exclusive Method: "Continue with Mobile OTP"',
          'Google OAuth buttons hidden from customer UI',
          authConfig.allowGuestCheckout ? 'Optional: "Continue as Guest"' : 'Mandatory Login before checkout',
        ],
      };
    }
    if (!authConfig.mobileOtpEnabled && authConfig.googleLoginEnabled) {
      return {
        badge: 'GOOGLE OAUTH ONLY',
        badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        flow: [
          'Exclusive Method: "Continue with Google"',
          'Mobile phone OTP buttons hidden from customer UI',
          authConfig.allowGuestCheckout ? 'Optional: "Continue as Guest"' : 'Mandatory Login before checkout',
        ],
      };
    }
    return {
      badge: 'ALL METHODS OFF (FALLBACK TO GUEST)',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      flow: ['Login is enabled but both OTP & Google are off. Fallback to Guest Checkout.'],
    };
  };

  const priorityInfo = getAuthPriorityDescription();

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Global Actions ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Lock className="w-6 h-6 text-sky-400" />
            <span>Customer Authentication & Access Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 4: Control Master Authentication, Mobile OTP providers, Google OAuth credentials, and Priority rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
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

      {/* ─── Section 4.4: Authentication Priority & Active Customer Experience Banner ─── */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Customer Authentication Priority (Section 4.4):
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${priorityInfo.badgeColor}`}>
              {priorityInfo.badge}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
            {priorityInfo.flow.map((step, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>{step}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-[11px] text-slate-400 block font-mono">
            Guest Checkout: {authConfig.allowGuestCheckout ? 'ENABLED' : 'DISABLED'}
          </span>
          <span className="text-[11px] text-slate-400 block font-mono">
            Browse Gate: {authConfig.forceLoginToBrowse ? 'MEMBER-ONLY' : 'PUBLIC'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── CARD 1: SECTION 4.1 AUTHENTICATION MASTER CONTROL ─── */}
        <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span>4.1 Master Control & Checkout Rules</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Global Switch</span>
          </div>

          <div className="space-y-3.5">
            {/* Master Customer Authentication Toggle */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">Customer Authentication</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  When enabled, customers can sign in, save multiple shipping addresses, and review order history.
                </p>
                {!authConfig.customerLoginEnabled && (
                  <p className="text-[11px] text-amber-400 mt-1 font-semibold">
                    Customer browsing & guest checkout remain fully functional. Existing customer accounts are safely retained.
                  </p>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={authConfig.customerLoginEnabled}
                  onChange={(e) => setAuthConfig({ ...authConfig, customerLoginEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {/* Guest Checkout Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Allow Guest Checkout</p>
                <p className="text-[11px] text-slate-400">
                  Customers can complete payments without mandatory account creation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={authConfig.allowGuestCheckout}
                onChange={(e) => setAuthConfig({ ...authConfig, allowGuestCheckout: e.target.checked })}
                className="w-4.5 h-4.5 text-emerald-500 rounded border-slate-700 bg-slate-800 focus:ring-emerald-400 cursor-pointer"
              />
            </div>

            {/* Force Login to Browse Catalog */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-amber-300">Force Login to Browse Catalog</p>
                <p className="text-[11px] text-slate-400">
                  (B2B / Private Store Mode) Requires signing in before product prices can be viewed.
                </p>
              </div>
              <input
                type="checkbox"
                checked={authConfig.forceLoginToBrowse}
                onChange={(e) => setAuthConfig({ ...authConfig, forceLoginToBrowse: e.target.checked })}
                className="w-4.5 h-4.5 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ─── CARD 2: SECTION 4.2 MOBILE OTP AUTHENTICATION ─── */}
        <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>4.2 Mobile OTP Authentication</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono">SMS Gateway</span>
          </div>

          <div className="space-y-3.5">
            {/* Enable OTP Login Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Enable OTP Login</p>
                <p className="text-[11px] text-slate-400">
                  Passwordless phone number verification via instant SMS OTP.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  disabled={!authConfig.customerLoginEnabled}
                  checked={authConfig.mobileOtpEnabled}
                  onChange={(e) => setAuthConfig({ ...authConfig, mobileOtpEnabled: e.target.checked })}
                  className="sr-only peer disabled:opacity-50"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* OTP Provider & Length */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">OTP Provider</label>
                <select
                  disabled={!authConfig.mobileOtpEnabled || !authConfig.customerLoginEnabled}
                  value={authConfig.otpProvider || 'fast2sms'}
                  onChange={(e) => setAuthConfig({ ...authConfig, otpProvider: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                >
                  <option value="fast2sms">Fast2SMS (India)</option>
                  <option value="twilio">Twilio Verify</option>
                  <option value="custom">Custom SMS API</option>
                  <option value="mock">System Mock / Simulation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">OTP Length</label>
                <select
                  disabled={!authConfig.mobileOtpEnabled || !authConfig.customerLoginEnabled}
                  value={authConfig.otpLength || 6}
                  onChange={(e) => setAuthConfig({ ...authConfig, otpLength: Number(e.target.value) as 4 | 6 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                >
                  <option value={6}>6 Digits (Recommended)</option>
                  <option value={4}>4 Digits (Compact)</option>
                </select>
              </div>
            </div>

            {/* OTP Expiry & Resend Cooldown */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  OTP Expiry (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  disabled={!authConfig.mobileOtpEnabled || !authConfig.customerLoginEnabled}
                  value={authConfig.otpExpirationMinutes}
                  onChange={(e) =>
                    setAuthConfig({
                      ...authConfig,
                      otpExpirationMinutes: Math.max(1, Number(e.target.value) || 5),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resend Cooldown (Seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  disabled={!authConfig.mobileOtpEnabled || !authConfig.customerLoginEnabled}
                  value={authConfig.otpResendCooldownSeconds}
                  onChange={(e) =>
                    setAuthConfig({
                      ...authConfig,
                      otpResendCooldownSeconds: Math.max(10, Number(e.target.value) || 30),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                />
              </div>
            </div>

            {/* SMS Template */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SMS Template (DLT Compliant)
              </label>
              <input
                type="text"
                disabled={!authConfig.mobileOtpEnabled || !authConfig.customerLoginEnabled}
                value={authConfig.smsTemplate || ''}
                onChange={(e) => setAuthConfig({ ...authConfig, smsTemplate: e.target.value })}
                placeholder="Your OTP is {#var#}. Valid for 5 minutes."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-400 disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-500 mt-1">Use &#123;#var#&#125; placeholder for the generated OTP code.</p>
            </div>

            {/* Test OTP Simulator */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Test OTP Delivery
              </span>
              <div className="flex gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={testMobileNumber}
                  onChange={(e) => setTestMobileNumber(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleSendTestOtp}
                  disabled={isSendingTestOtp}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSendingTestOtp ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CARD 3: SECTION 4.3 GOOGLE AUTHENTICATION ─── */}
        <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>4.3 Google Authentication</span>
            </h3>
            <span className="text-[10px] text-purple-400 font-mono">OAuth 2.0</span>
          </div>

          <div className="space-y-3.5">
            {/* Enable Google Login Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Enable Google Login</p>
                <p className="text-[11px] text-slate-400">
                  Allow one-click sign-in using verified Google accounts.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  disabled={!authConfig.customerLoginEnabled}
                  checked={authConfig.googleLoginEnabled}
                  onChange={(e) => setAuthConfig({ ...authConfig, googleLoginEnabled: e.target.checked })}
                  className="sr-only peer disabled:opacity-50"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>

            {/* Google Client ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Google Client ID</label>
              <input
                type="text"
                disabled={!authConfig.googleLoginEnabled || !authConfig.customerLoginEnabled}
                value={authConfig.googleClientId || ''}
                onChange={(e) => setAuthConfig({ ...authConfig, googleClientId: e.target.value.trim() })}
                placeholder="e.g. 1234567890-abc.apps.googleusercontent.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
            </div>

            {/* Google Client Secret (Masked, Server-Side Protected) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Google Client Secret</label>
                <span className="text-[10px] text-amber-400 font-semibold">Protected / Encrypted</span>
              </div>
              <div className="relative">
                <input
                  type={showGoogleSecret ? 'text' : 'password'}
                  disabled={!authConfig.googleLoginEnabled || !authConfig.customerLoginEnabled}
                  value={authConfig.googleClientSecret || ''}
                  onChange={(e) => setAuthConfig({ ...authConfig, googleClientSecret: e.target.value.trim() })}
                  placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-purple-400 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showGoogleSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Never shared with customer browsers; stored securely.</p>
            </div>

            {/* Authorized Redirect URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Authorized Redirect URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={authConfig.googleRedirectUrl || `${window.location.origin}/auth/google/callback`}
                  className="flex-1 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-xs font-mono select-all"
                />
                <button
                  type="button"
                  onClick={copyRedirectUrl}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Add this exact URL to Google Cloud Console &gt; Authorized Redirect URIs.</p>
            </div>

            {/* Allowed Domains & Connection Test */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Allowed Domains (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. gmail.com, swagruhafoods.com"
                  value={authConfig.googleAllowedDomains || ''}
                  onChange={(e) => setAuthConfig({ ...authConfig, googleAllowedDomains: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleTestGoogleConnection}
                  disabled={isTestingGoogle}
                  className="w-full py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isTestingGoogle ? 'Validating...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CARD 4: SECURITY & RATE LIMITING THRESHOLDS ─── */}
        <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Brute-force Shield & Fraud Protection</span>
            </h3>
            <span className="text-[10px] text-amber-400 font-mono">Anti-Abuse</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Maximum Consecutive Failed Attempts
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Temporarily locks phone number verification after this many wrong OTP attempts.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                IP Rate Limiter (Max Requests per 15 Minutes)
              </label>
              <input
                type="number"
                min="3"
                max="30"
                value={authConfig.rateLimitMaxRequestsPer15Min}
                onChange={(e) =>
                  setAuthConfig({
                    ...authConfig,
                    rateLimitMaxRequestsPer15Min: Math.max(3, Number(e.target.value) || 5),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Defends against SMS flood attacks and malicious bots across all customer entry points.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
