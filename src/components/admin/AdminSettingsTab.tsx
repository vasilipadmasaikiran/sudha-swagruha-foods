// ============================================================
// Admin Console - Store & Contact Settings Tab
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import toast from 'react-hot-toast';

export default function AdminSettingsTab() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  const [phone, setPhone] = useState(settings.businessPhone);
  const [whatsapp, setWhatsapp] = useState(settings.businessWhatsApp);
  const [email, setEmail] = useState(settings.businessEmail);
  const [address, setAddress] = useState(settings.businessAddress);
  const [hours, setHours] = useState(settings.businessHours);

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

  const handleReset = () => {
    resetSettings();
    setPhone('8374634989');
    setWhatsapp('8374634989');
    setEmail('info@sudhaswagruha.com');
    setAddress('Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010');
    setHours('9:00 AM - 9:00 PM (All Days)');
    toast.success('Reset contact settings to default.');
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
                placeholder="info@sudhaswagruha.com"
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
    </div>
  );
}
