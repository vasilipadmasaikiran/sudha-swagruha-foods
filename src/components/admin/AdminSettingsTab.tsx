// ============================================================
// Admin Console - Store & Contact Settings Tab
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import toast from 'react-hot-toast';

export default function AdminSettingsTab() {
  const { settings, updateSettings, updateTaxSettings, resetSettings } = useSettingsStore();

  const [phone, setPhone] = useState(settings.businessPhone);
  const [whatsapp, setWhatsapp] = useState(settings.businessWhatsApp);
  const [email, setEmail] = useState(settings.businessEmail);
  const [address, setAddress] = useState(settings.businessAddress);
  const [hours, setHours] = useState(settings.businessHours);

  // GST & Tax Configuration state
  const [gstEnabled, setGstEnabled] = useState(settings.tax?.gstEnabled ?? true);
  const [gstRate, setGstRate] = useState<number>(settings.tax?.gstRate ?? 18);
  const [gstNumber, setGstNumber] = useState(settings.tax?.gstNumber ?? '37AAAAA0000A1Z5');
  const [hsnCode, setHsnCode] = useState(settings.tax?.hsnCode ?? '21069099');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      businessPhone: phone.trim(),
      businessWhatsApp: whatsapp.trim(),
      businessEmail: email.trim(),
      businessAddress: address.trim(),
      businessHours: hours.trim(),
    });
    toast.success('Contact info updated across entire site!');
  };

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    updateTaxSettings({
      gstEnabled,
      gstRate: Number(gstRate) || 0,
      gstNumber: gstNumber.trim(),
      hsnCode: hsnCode.trim(),
    });
    toast.success(`Tax settings updated! GST set to ${gstEnabled ? `${gstRate}%` : 'Disabled (0%)'}. Synchronized live.`);
  };

  const handleReset = () => {
    resetSettings();
    setPhone('8374634989');
    setWhatsapp('8374634989');
    setEmail('info@sudhaswagruhafoods.com');
    setAddress('Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010');
    setHours('9:00 AM - 9:00 PM (All Days)');
    setGstEnabled(true);
    setGstRate(18);
    setGstNumber('37AAAAA0000A1Z5');
    setHsnCode('21069099');
    toast.success('Reset contact & tax settings to default.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-400" />
            <span>Store Contact & Business Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Changes saved here immediately update the website Footer, Contact Us page, WhatsApp buttons, and Order notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-7 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Phone & WhatsApp */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Calling Phone Number *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="8374634989"
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Displayed in Footer & Contact Us page</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">📱</span>
                  <span>WhatsApp Business Number *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="8374634989"
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Receives incoming customer orders directly
                </p>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span>Store Email Address *</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@sudhaswagruhafoods.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Physical Location Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>Business Physical Address *</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="e.g. Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                required
              />
            </div>

            {/* Business Hours */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Business Operating Hours</span>
              </label>
              <input
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="9:00 AM - 9:00 PM (All Days)"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Contact Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Live Storefront Preview</span>
            </h3>
            <p className="text-xs text-slate-400">
              Here is how customers will see your contact details across the website:
            </p>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm">
                  📱
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">WhatsApp Support</p>
                  <p className="font-mono font-bold text-emerald-400">+91 {whatsapp}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Calling Line</p>
                  <p className="font-mono font-bold text-white">+91 {phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Email Contact</p>
                  <p className="font-medium text-white break-all">{email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Location</p>
                  <p className="text-slate-300 leading-tight">{address}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Hours</p>
                  <p className="text-slate-300 font-medium">{hours}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
              ✅ Contact details sync dynamically across the whole application instantly.
            </div>
          </div>
        </div>
      </div>

      {/* ─── Business & GST / Tax Configuration Section (Issues #2, #5, #8) ─── */}
      <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-bold">🏛️</span>
              <span>Business & GST / Tax Configuration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative tax settings for the single order calculation engine. Centralized and synchronized in real-time.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
            gstEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            GST STATUS: {gstEnabled ? `ACTIVE (${gstRate}%)` : 'DISABLED (0%)'}
          </span>
        </div>

        <form onSubmit={handleSaveTax} className="space-y-5">
          {/* GST Enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div>
              <p className="text-sm font-bold text-white">GST Calculation Enabled</p>
              <p className="text-xs text-slate-400 mt-0.5">
                When enabled, GST is dynamically applied to new cart & checkout calculations.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* GST Percentage Input & Presets */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                GST Percentage Rate (%) *
              </label>
              <span className="text-[11px] text-slate-500">Supports custom decimal rates</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 items-center">
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={!gstEnabled}
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                  placeholder="18.00"
                  className="w-full pl-4 pr-12 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base text-white font-mono font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                  %
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    disabled={!gstEnabled}
                    onClick={() => setGstRate(rate)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      gstRate === rate
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 disabled:opacity-40'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GSTIN & HSN Code Fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                GSTIN / Tax Identification Number
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="e.g. 37AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Printed on order tax invoices & receipts</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                HSN / SAC Food Products Code
              </label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 21069099"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Classification for traditional food preparations</p>
            </div>
          </div>

          {/* Historical Snapshot Protection Guarantee Callout */}
          <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl text-xs text-blue-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-blue-300">
              <span>🛡️ Historical Order Financial Snapshot Protection</span>
            </p>
            <p className="text-[11px] leading-relaxed text-blue-200/90">
              When GST percentage is modified (e.g. from 18% to 12%), only new carts, checkout transactions, and newly created orders will use {gstRate}%. Historical completed and delivered orders permanently preserve their original GST rate, GST amount, and taxable snapshot recorded at the time of purchase.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Tax & GST Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
