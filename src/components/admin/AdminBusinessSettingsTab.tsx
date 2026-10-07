// ============================================================
// Admin Business Information & Site Settings Tab (Requirement 14 & 15)
// Centralized configuration source for Store Name, Branding, Contact & SEO
// Changes immediately synchronize across Header, Footer, Checkout, Emails & Tracking
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Save,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { useSettingsStore, type StoreSettings } from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { logAdminAction } from '@/services/auditLogger';
import AppImage from '@/components/common/AppImage';
import toast from 'react-hot-toast';

export default function AdminBusinessSettingsTab() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { currentUser } = useAdminAuthStore();

  const [form, setForm] = useState<StoreSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      toast.error('Business Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      updateSettings(form);

      if (currentUser) {
        logAdminAction(
          currentUser.email,
          currentUser.role,
          'UPDATE_BUSINESS_INFO',
          'SETTINGS',
          'store_contact',
          { businessName: form.businessName }
        );
      }

      toast.success(
        `Business branding saved! Storefront updated to "${form.businessName}"`,
        { icon: '🌿', duration: 5000 }
      );
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset business information to default Sudha Swagruha Foods values?')) {
      resetSettings();
      setForm({ ...useSettingsStore.getState().settings });
      toast.success('Reset to defaults');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span>Business Information & Centralized Storefront Branding</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure the official business name, logo, contact coordinates, and customer footer info.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Live Synchronized
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── SECTION 1: CORE BRANDING & NAME (Requirement 14) ─── */}
        <div className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Store Identity & Brand Name
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Business Name (Requirement 14 highlight) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5 flex items-center justify-between">
                <span>Official Business / Store Name *</span>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  (Reflects live across Header, Title, Checkout, Tracking & Emails)
                </span>
              </label>
              <input
                type="text"
                required
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="e.g. Sudha Swagruha Foods OR ABC Fashion Store"
                className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl text-white font-bold text-base focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Browser Window / Website Title
              </label>
              <input
                type="text"
                value={form.websiteTitle}
                onChange={(e) => setForm({ ...form, websiteTitle: e.target.value })}
                placeholder="e.g. Sudha Swagruha Foods • Authentic Andhra Delicacies"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Brand Tagline / Slogan
              </label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="e.g. Authentic Andhra Homemade Pickles, Podis & Traditional Sweets"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Logo URL or Path
              </label>
              <input
                type="text"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="/logo/logo.jpg"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Logo Preview
              </label>
              <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <AppImage
                  src={form.logoUrl}
                  alt={form.businessName}
                  className="w-10 h-10 object-contain rounded-lg bg-white p-1"
                  containerClassName="w-10 h-10 rounded-lg bg-white"
                />
                <div>
                  <p className="text-xs font-bold text-white">{form.businessName}</p>
                  <p className="text-[10px] text-slate-400">{form.tagline}</p>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Footer Description & About Snippet
              </label>
              <textarea
                rows={2}
                value={form.footerText}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                placeholder="Authentic homemade Telugu pickles, masalas & traditional foods. Made with love, the way Amma makes it."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: CONTACT & OPERATIONAL DETAILS ─── */}
        <div className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Phone className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              2. Contact Coordinates & WhatsApp Integration
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Business Phone Number *
              </label>
              <input
                type="tel"
                value={form.businessPhone}
                onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                placeholder="8374634989"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Business WhatsApp Number *
              </label>
              <input
                type="tel"
                value={form.businessWhatsApp}
                onChange={(e) => setForm({ ...form, businessWhatsApp: e.target.value })}
                placeholder="8374634989"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Official Support Email Address *
              </label>
              <input
                type="email"
                value={form.businessEmail}
                onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                placeholder="info@sudhaswagruhafoods.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Business Working Hours
              </label>
              <input
                type="text"
                value={form.businessHours}
                onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
                placeholder="9:00 AM - 9:00 PM (All Days)"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Physical Store / Commercial Kitchen Address *
              </label>
              <input
                type="text"
                value={form.businessAddress}
                onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                placeholder="Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/30 cursor-pointer transition-all disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Synchronizing Across Cloud...' : 'Save & Publish Business Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
