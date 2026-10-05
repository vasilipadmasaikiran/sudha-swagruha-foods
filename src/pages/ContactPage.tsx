// ============================================================
// Contact Page - Dynamic Contact Info from Admin Console
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguageStore } from '@/hooks/useStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { translations } from '@/i18n/translations';

export default function ContactPage() {
  const { language } = useLanguageStore();
  const { settings } = useSettingsStore();
  const t = translations[language];
  const [form, setForm] = useState({ name: '', mobile: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error('Please fill in your name and message');
      return;
    }
    const msg = encodeURIComponent(
      `నమస్కారం! 🙏\n\nపేరు: *${form.name}*\nమొబైల్: ${form.mobile}\n\nసందేశం:\n${form.message}`
    );
    window.open(`https://wa.me/91${settings.businessWhatsApp}?text=${msg}`, '_blank');
    setSent(true);
    toast.success(t.contact.messageSent);
  };

  const contacts = [
    {
      icon: '📱',
      title: t.contact.whatsapp,
      value: `+91 ${settings.businessWhatsApp}`,
      href: `https://wa.me/91${settings.businessWhatsApp}`,
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: '📞',
      title: t.contact.phone,
      value: `+91 ${settings.businessPhone}`,
      href: `tel:+91${settings.businessPhone}`,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: '✉️',
      title: t.contact.email,
      value: settings.businessEmail,
      href: `mailto:${settings.businessEmail}`,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: '📍',
      title: t.contact.address,
      value: settings.businessAddress,
      href: '#',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      icon: '⏰',
      title: 'Business Hours',
      value: settings.businessHours,
      href: '#',
      color: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      <div className="bg-brand-green py-12 px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl md:text-4xl font-bold text-white mb-2"
        >
          {t.contact.title}
        </motion.h1>
        <p className="text-green-200">{t.contact.subtitle}</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div>
            <h2 className="font-bold text-xl text-gray-900 mb-6">Reach Us Directly</h2>
            <div className="space-y-4 mb-8">
              {contacts.map((c, i) => (
                <motion.a
                  key={i}
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow group border border-gray-100"
                >
                  <div
                    className={`w-12 h-12 ${c.color} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform flex-shrink-0`}
                  >
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-medium">{c.title}</p>
                    <p className="font-semibold text-gray-800 text-sm truncate">{c.value}</p>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* WhatsApp Order Button */}
            <a
              href={`https://wa.me/91${settings.businessWhatsApp}?text=${encodeURIComponent(
                'నమస్కారం! నేను ఆర్డర్ చేయాలనుకుంటున్నాను.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-4 rounded-xl font-bold text-base hover:bg-green-500 transition-colors shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              {t.contact.orderWhatsApp}
            </a>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-bold text-xl text-gray-900 mb-6">Send a Message</h2>
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-semibold text-green-700">{t.contact.messageSent}</p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-4 text-green-600 text-sm hover:underline font-semibold cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleWhatsApp} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t.contact.name} *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green transition-all"
                    placeholder="e.g. Ramesh Reddy"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green transition-all"
                    placeholder="8374634989"
                    type="tel"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t.contact.message} *
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green transition-all resize-none"
                    rows={5}
                    placeholder="Tell us what you'd like to order or ask..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3.5 rounded-xl font-bold hover:bg-green-500 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {t.contact.send} via WhatsApp
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
