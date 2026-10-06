// ============================================================
// Admin Console - Email & SMTP Configuration Tab
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Key,
  Server,
  Globe,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  ExternalLink,
  FileText,
  X,
} from 'lucide-react';
import { useSettingsStore, defaultSmtpSettings, type SmtpSettings } from '@/hooks/useSettingsStore';
import { sendTestEmail, generateOrderConfirmationHtml } from '@/services/emailService';
import type { DbOrder } from '@/services/supabase';
import toast from 'react-hot-toast';

export default function AdminEmailTab() {
  const { settings, updateSmtpSettings } = useSettingsStore();
  const smtp = settings.smtp || defaultSmtpSettings;

  const [form, setForm] = useState<SmtpSettings>({ ...smtp });
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState(settings.businessEmail || 'vasilisaikiran@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSmtpSettings(form);
    toast.success('SMTP & Email configuration saved and synced to cloud!');
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await sendTestEmail(testEmail.trim(), form);
      if (res.success) {
        toast.success(`Test email dispatched to ${testEmail}!`);
      } else {
        toast.error(`Email notice: ${res.message}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleQuickPreset = (preset: 'resend' | 'gmail' | 'sendgrid') => {
    if (preset === 'resend') {
      setForm((prev) => ({
        ...prev,
        provider: 'resend',
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        username: 'resend',
        senderEmail: prev.senderEmail || 'orders@sudhaswagruha.com',
      }));
      toast.success('Applied Resend API preset');
    } else if (preset === 'gmail') {
      setForm((prev) => ({
        ...prev,
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        senderEmail: prev.username || prev.senderEmail || 'info@sudhaswagruha.com',
      }));
      toast.success('Applied Gmail SMTP preset (Use Google App Password)');
    } else if (preset === 'sendgrid') {
      setForm((prev) => ({
        ...prev,
        provider: 'smtp',
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        username: 'apikey',
        senderEmail: prev.senderEmail || 'orders@sudhaswagruha.com',
      }));
      toast.success('Applied SendGrid SMTP preset');
    }
  };

  // Mock order for HTML preview
  const mockOrder: DbOrder = {
    id: 'preview-1',
    order_number: 'SSF-20261006-8492',
    customer_id: null,
    customer_name: 'Suresh Varma',
    customer_mobile: '9876543210',
    customer_whatsapp: '9876543210',
    customer_email: 'suresh@example.com',
    items: [
      {
        product_id: '1',
        product_name_en: 'Andhra Avakaya Pickle',
        product_name_te: 'ఆంధ్ర అవకాయ',
        weight: '500g',
        quantity: 2,
        unit_price: 320,
        total_price: 640,
        sku: 'SSF-AVK-500',
      },
      {
        product_id: '5',
        product_name_en: 'Kandi Karam Podi',
        product_name_te: 'కంది కారం పొడి',
        weight: '250g',
        quantity: 1,
        unit_price: 180,
        total_price: 180,
        sku: 'SSF-KKP-250',
      },
    ],
    subtotal: 820,
    delivery_charge: 0,
    discount: 100,
    total: 720,
    payment_status: 'paid',
    payment_id: 'pay_test_999',
    razorpay_order_id: null,
    order_status: 'preparing',
    delivery_address: {
      house_no: 'Plot 42, Green Meadows',
      street: 'Madhapur Main Road',
      area: 'Hitech City',
      city: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
    },
    notes: 'Please pack securely',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            <span>Customer Order Email & SMTP Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatically sends branded order confirmation emails & invoices to customers when they place an order.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              form.enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {form.enabled ? 'Email Notifications Active' : 'Emails Disabled'}
          </span>
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Preview Email Template</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-8 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Master Toggle */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Enable Customer Email Intimation</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sends an automated order confirmation with itemized receipt to the customer&apos;s email address.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Quick Provider Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Quick Setup Presets:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('resend')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/50 text-xs font-medium transition-colors"
                >
                  ⚡ Resend API (Recommended for GitHub Pages)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('gmail')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  📧 Gmail SMTP / App Password
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('sendgrid')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  📬 SendGrid SMTP
                </button>
              </div>
            </div>

            {/* Sender Identity Section */}
            <div className="pt-2 border-t border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                1. Sender Identity (From Name & Email)
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Store / Sender Display Name *
                  </label>
                  <input
                    type="text"
                    value={form.senderName}
                    onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                    placeholder="Sudha Swagruha Foods"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Appears in customer inbox</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sender From Email Address *
                  </label>
                  <input
                    type="email"
                    value={form.senderEmail}
                    onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
                    placeholder="orders@sudhaswagruha.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Email address used to send confirmations</p>
                </div>
              </div>
            </div>

            {/* SMTP Server Details */}
            <div className="pt-2 border-t border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>2. SMTP Server & Credentials</span>
                <span className="text-[11px] text-indigo-400 font-normal">Standard RFC SMTP / API</span>
              </h3>

              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-400" />
                    <span>SMTP Host / Server *</span>
                  </label>
                  <input
                    type="text"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Port (587 TLS / 465 SSL)
                  </label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                    placeholder="587"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    SMTP Username / Login Email
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="info@sudhaswagruha.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>SMTP Password / App Password / Resend Key</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="re_xxxxxx or Google 16-char App Password"
                      className="w-full pl-3.5 pr-9 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    For Gmail, use a 16-character App Password (not your personal Gmail password)
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Notification Copy */}
            <div className="pt-2 border-t border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                3. Store Owner Order Alert (BCC)
              </h3>
              <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 mb-3">
                <input
                  type="checkbox"
                  id="notifyAdmin"
                  checked={form.notifyAdminOnNewOrder}
                  onChange={(e) => setForm({ ...form, notifyAdminOnNewOrder: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="notifyAdmin" className="text-xs text-slate-300 cursor-pointer">
                  <strong>Send BCC copy of customer orders to Store Owner</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Receive an immediate email copy whenever a customer successfully checks out.
                  </p>
                </label>
              </div>

              {form.notifyAdminOnNewOrder && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Admin Notification Email Address
                  </label>
                  <input
                    type="email"
                    value={form.adminNotificationEmail}
                    onChange={(e) => setForm({ ...form, adminNotificationEmail: e.target.value })}
                    placeholder="vasilisaikiran@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Changes saved here sync directly to your Supabase cloud configuration.
              </p>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save SMTP Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Test & Instructions */}
        <div className="lg:col-span-4 space-y-4">
          {/* Send Test Email Card */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Test Email Delivery</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify your SMTP connection by sending a sample order confirmation receipt:
            </p>

            <div className="space-y-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Test Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Order Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Setup Guide Info */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Recommended Email Providers</span>
            </h3>
            <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-indigo-300 block mb-1">Resend (Free 3,000 emails/mo)</strong>
                <p className="text-[11px] text-slate-400">
                  Best for GitHub Pages static hosting. Create a free API key at{' '}
                  <a
                    href="https://resend.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 underline inline-flex items-center gap-0.5"
                  >
                    resend.com <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  and paste the key starting with <code className="text-indigo-300">re_</code> into the password field.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-emerald-300 block mb-1">Gmail SMTP</strong>
                <p className="text-[11px] text-slate-400">
                  Set Host to <code className="text-emerald-300">smtp.gmail.com</code>, Port to <code className="text-emerald-300">587</code>, and use your 16-letter Google <em>App Password</em> from your Google Account Security settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      <AnimatePresence>
        {previewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm">Customer Order Email Receipt Preview</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateOrderConfirmationHtml(mockOrder, form),
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
