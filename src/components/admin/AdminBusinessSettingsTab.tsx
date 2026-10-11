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
import {
  useSettingsStore,
  defaultTaxSettings,
  defaultFoodLicenseSettings,
  defaultGstSettings,
  isValidGstin,
  isValidFssai,
  type StoreSettings,
} from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { logAdminAction } from '@/services/auditLogger';
import AppImage from '@/components/common/AppImage';
import toast from 'react-hot-toast';

export default function AdminBusinessSettingsTab() {
  const {
    settings,
    updateSettings,
    updateTaxSettings,
    updateFoodLicenseSettings,
    updateGstSettings,
    resetSettings,
  } = useSettingsStore();
  const { currentUser } = useAdminAuthStore();

  const [form, setForm] = useState<StoreSettings>({
    ...settings,
    tax: settings.tax || defaultTaxSettings,
    foodLicense: settings.foodLicense || defaultFoodLicenseSettings,
    gst: settings.gst || defaultGstSettings,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      toast.error('Business Name cannot be empty');
      return;
    }

    if (form.gst?.gstin && !isValidGstin(form.gst.gstin)) {
      toast.error('Invalid GSTIN format. Expected: 2 digits, 5 letters, 4 digits, 1 letter, 1 alphanumeric, "Z", 1 alphanumeric (e.g. 37AAAAA0000A1Z5)');
      return;
    }

    if (form.foodLicense?.foodLicenseNumber && !isValidFssai(form.foodLicense.foodLicenseNumber)) {
      toast.error('Invalid FSSAI License Number format. Expected 14 digits.');
      return;
    }

    setIsSaving(true);
    try {
      updateSettings(form);
      if (form.tax) {
        updateTaxSettings(form.tax);
      }
      if (form.foodLicense) {
        updateFoodLicenseSettings(form.foodLicense);
      }
      if (form.gst) {
        updateGstSettings(form.gst);
      }

      if (currentUser) {
        logAdminAction(
          currentUser.email,
          currentUser.role,
          'UPDATE_BUSINESS_INFO',
          'SETTINGS',
          'store_contact',
          {
            businessName: form.businessName,
            gstRate: form.tax?.gstRate,
            foodLicense: form.foodLicense?.foodLicenseNumber,
            gstin: form.gst?.gstin,
          }
        );
      }

      toast.success(
        `Business branding, Food License & GST settings saved! Storefront updated to "${form.businessName}"`,
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

            {/* Detailed Physical Address Breakdown (Issue #4 & Requirement 22) */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                Address Line 1 (Street / Landmark)
              </label>
              <input
                type="text"
                value={form.addressLine1 || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    addressLine1: val,
                    businessAddress: `${val}, ${prev.addressLine2 ? prev.addressLine2 + ', ' : ''}${prev.city || ''}, ${prev.state || ''} - ${prev.postalCode || ''}, ${prev.country || 'India'}`.trim(),
                  }));
                }}
                placeholder="Plot 18, Traditional Foods Lane"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                Address Line 2 (Area / Locality)
              </label>
              <input
                type="text"
                value={form.addressLine2 || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    addressLine2: val,
                    businessAddress: `${prev.addressLine1 || ''}, ${val ? val + ', ' : ''}${prev.city || ''}, ${prev.state || ''} - ${prev.postalCode || ''}, ${prev.country || 'India'}`.trim(),
                  }));
                }}
                placeholder="Benz Circle"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                  City
                </label>
                <input
                  type="text"
                  value={form.city || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      city: val,
                      businessAddress: `${prev.addressLine1 || ''}, ${prev.addressLine2 ? prev.addressLine2 + ', ' : ''}${val}, ${prev.state || ''} - ${prev.postalCode || ''}, ${prev.country || 'India'}`.trim(),
                    }));
                  }}
                  placeholder="Vijayawada"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                  State
                </label>
                <input
                  type="text"
                  value={form.state || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      state: val,
                      businessAddress: `${prev.addressLine1 || ''}, ${prev.addressLine2 ? prev.addressLine2 + ', ' : ''}${prev.city || ''}, ${val} - ${prev.postalCode || ''}, ${prev.country || 'India'}`.trim(),
                    }));
                  }}
                  placeholder="Andhra Pradesh"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                  Postal / PIN Code
                </label>
                <input
                  type="text"
                  value={form.postalCode || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      postalCode: val,
                      businessAddress: `${prev.addressLine1 || ''}, ${prev.addressLine2 ? prev.addressLine2 + ', ' : ''}${prev.city || ''}, ${prev.state || ''} - ${val}, ${prev.country || 'India'}`.trim(),
                    }));
                  }}
                  placeholder="520010"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                  Country
                </label>
                <input
                  type="text"
                  value={form.country || 'India'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      country: val,
                      businessAddress: `${prev.addressLine1 || ''}, ${prev.addressLine2 ? prev.addressLine2 + ', ' : ''}${prev.city || ''}, ${prev.state || ''} - ${prev.postalCode || ''}, ${val}`.trim(),
                    }));
                  }}
                  placeholder="India"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs flex items-center justify-between">
                <span>Complete Physical Address (Single string fallback) *</span>
                <span className="text-[11px] text-emerald-400 font-normal">Used across emails, invoices & footer</span>
              </label>
              <input
                type="text"
                value={form.businessAddress}
                onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                placeholder="Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                required
              />
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: TAX & GST CONFIGURATION (Requirements 17-20) ─── */}
        <div className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">🏛️</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                3. Business Tax & GST Configuration
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Centralized Engine
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Central single source of truth for GST. Automatically feeds the central calculation engine, cart, checkout, invoices, and sales reports. Historical orders preserve their snapshot rate and are never mutated.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 pt-2">
            {/* GST Enabled Toggle */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">GST Calculation Status</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {form.tax?.gstEnabled ? 'GST applied on customer checkout' : 'GST currently disabled (0% tax)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    tax: { ...(prev.tax || defaultTaxSettings), gstEnabled: !prev.tax?.gstEnabled },
                  }))
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  form.tax?.gstEnabled
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span>{form.tax?.gstEnabled ? 'GST: ON' : 'GST: OFF'}</span>
              </button>
            </div>

            {/* GST Rate Percentage */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-white">
                GST Rate Percentage (%) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.tax?.gstRate ?? 18}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tax: {
                        ...(prev.tax || defaultTaxSettings),
                        gstRate: Math.max(0, parseFloat(e.target.value) || 0),
                      },
                    }))
                  }
                  className="w-28 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-slate-400 font-bold text-sm">%</span>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1">
                  {[0, 5, 12, 18].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          tax: { ...(prev.tax || defaultTaxSettings), gstRate: rate },
                        }))
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                        form.tax?.gstRate === rate
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* GSTIN Identification */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                GSTIN / Tax Identification Number
              </label>
              <input
                type="text"
                value={form.tax?.gstNumber || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tax: { ...(prev.tax || defaultTaxSettings), gstNumber: e.target.value.trim() },
                  }))
                }
                placeholder="37AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* HSN / SAC Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                HSN / SAC Code (Food & Confectionery)
              </label>
              <input
                type="text"
                value={form.tax?.hsnCode || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tax: { ...(prev.tax || defaultTaxSettings), hsnCode: e.target.value.trim() },
                  }))
                }
                placeholder="21069099"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Live Calculation Example Preview */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs font-mono flex items-center justify-between text-slate-300">
            <span>
              Preview Calculation on ₹1,000 Order:{' '}
              {form.tax?.gstEnabled ? (
                <strong className="text-emerald-400">
                  Taxable ₹1,000 + GST ({form.tax?.gstRate}%) ₹
                  {((1000 * (form.tax?.gstRate || 0)) / 100).toFixed(2)} = ₹
                  {(1000 + (1000 * (form.tax?.gstRate || 0)) / 100).toFixed(2)}
                </strong>
              ) : (
                <strong className="text-amber-400">GST Disabled • Total ₹1,000.00</strong>
              )}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">Live Synchronized</span>
          </div>
        </div>

        {/* ─── SECTION 4: FOOD LICENSE & FSSAI COMPLIANCE (Prompt Section 5.1 & 5.3) ─── */}
        <div className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                4. Food License Information (FSSAI)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Show on Customer Site Footer:</span>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    foodLicense: {
                      ...(prev.foodLicense || defaultFoodLicenseSettings),
                      showOnCustomerSite: !prev.foodLicense?.showOnCustomerSite,
                    },
                  }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  form.foodLicense?.showOnCustomerSite
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span>{form.foodLicense?.showOnCustomerSite ? 'Footer: ON' : 'Footer: OFF'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Configure official Food Safety and Standards Authority of India (FSSAI) credentials. When enabled, details are displayed in the Customer Site footer.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                Food Business Name (As per License)
              </label>
              <input
                type="text"
                value={form.foodLicense?.foodBusinessName || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    foodLicense: {
                      ...(prev.foodLicense || defaultFoodLicenseSettings),
                      foodBusinessName: e.target.value,
                    },
                  }))
                }
                placeholder="Sudha Swagruha Foods"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs flex items-center justify-between">
                <span>Food License / Registration Number (FSSAI)</span>
                {form.foodLicense?.foodLicenseNumber && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isValidFssai(form.foodLicense.foodLicenseNumber)
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {isValidFssai(form.foodLicense.foodLicenseNumber) ? '✓ 14-digit Valid' : '14 digits required'}
                  </span>
                )}
              </label>
              <input
                type="text"
                maxLength={14}
                value={form.foodLicense?.foodLicenseNumber || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    foodLicense: {
                      ...(prev.foodLicense || defaultFoodLicenseSettings),
                      foodLicenseNumber: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. 10123999000123"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                License / Registration Type
              </label>
              <input
                type="text"
                value={form.foodLicense?.licenseType || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    foodLicense: {
                      ...(prev.foodLicense || defaultFoodLicenseSettings),
                      licenseType: e.target.value,
                    },
                  }))
                }
                placeholder="FSSAI Registration / State License"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                License Validity / Expiry Date (Optional)
              </label>
              <input
                type="text"
                value={form.foodLicense?.licenseValidity || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    foodLicense: {
                      ...(prev.foodLicense || defaultFoodLicenseSettings),
                      licenseValidity: e.target.value,
                    },
                  }))
                }
                placeholder="e.g. 31/12/2028 or Valid"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ─── SECTION 5: GST INFORMATION (Prompt Section 5.2 & 5.3) ─── */}
        <div className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">💼</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                5. GST Business Information
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Show on Customer Site Footer:</span>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    gst: {
                      ...(prev.gst || defaultGstSettings),
                      showOnCustomerSite: !prev.gst?.showOnCustomerSite,
                    },
                  }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  form.gst?.showOnCustomerSite
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span>{form.gst?.showOnCustomerSite ? 'Footer: ON' : 'Footer: OFF'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Configure official GST Registration information. Server-side format validation verifies the standard 15-character GSTIN structure. Independent toggle controls public display in the footer.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs">
                GST Registered Business Legal Name
              </label>
              <input
                type="text"
                value={form.gst?.gstRegisteredBusinessName || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gst: {
                      ...(prev.gst || defaultGstSettings),
                      gstRegisteredBusinessName: e.target.value,
                    },
                  }))
                }
                placeholder="Sudha Swagruha Foods"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-xs flex items-center justify-between">
                <span>GSTIN (Goods and Services Tax Identification Number)</span>
                {form.gst?.gstin && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isValidGstin(form.gst.gstin)
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {isValidGstin(form.gst.gstin) ? '✓ Valid Format' : 'Invalid Format (15 chars)'}
                  </span>
                )}
              </label>
              <input
                type="text"
                maxLength={15}
                value={form.gst?.gstin || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().trim();
                  setForm((prev) => ({
                    ...prev,
                    gst: {
                      ...(prev.gst || defaultGstSettings),
                      gstin: val,
                    },
                    tax: {
                      ...(prev.tax || defaultTaxSettings),
                      gstNumber: val,
                    },
                  }));
                }}
                placeholder="37AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs uppercase focus:outline-none focus:border-emerald-500"
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
