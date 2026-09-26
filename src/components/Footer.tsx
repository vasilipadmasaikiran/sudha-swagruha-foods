// ============================================================
// Footer Component
// ============================================================
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Heart } from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';

const logoPath = import.meta.env.BASE_URL + 'logo/logo.png';
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || '919876543210';

export default function Footer() {
  const { language } = useLanguageStore();
  const t = translations[language];

  const categories = [
    { slug: 'pickles', label: t.categories.pickles },
    { slug: 'karam', label: t.categories.karam },
    { slug: 'masala', label: t.categories.masala },
    { slug: 'podi', label: t.categories.podi },
  ];

  const quickLinks = [
    { href: '/', label: t.nav.home },
    { href: '/products', label: t.nav.products },
    { href: '/about', label: t.nav.about },
    { href: '/contact', label: t.nav.contact },
    { href: '/track-order', label: t.nav.trackOrder },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={logoPath}
              alt="Sudha Swagruha Foods"
              className="w-12 h-12 object-contain bg-white rounded-xl p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <p className="font-bold text-white text-base">Sudha Swagruha Foods</p>
              <p
                className="text-xs text-gray-400"
                style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
              >
                అమ్మ చేతి రుచులు
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Authentic homemade Telugu pickles, masalas & traditional foods. Made with love,
            the way Amma makes it.
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm text-gray-400">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-brand-red fill-brand-red mx-0.5" />
            <span>in Andhra Pradesh</span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            {t.nav.categories}
          </h3>
          <ul className="space-y-3">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link
                  to={`/category/${cat.slug}`}
                  className="text-gray-400 hover:text-brand-green transition-colors text-sm flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            Quick Links
          </h3>
          <ul className="space-y-3">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="text-gray-400 hover:text-brand-green transition-colors text-sm flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 bg-brand-red rounded-full" />
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/admin"
                className="text-gray-500 hover:text-gray-300 transition-colors text-xs"
              >
                Admin Login
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            {t.nav.contact}
          </h3>
          <ul className="space-y-4">
            <li>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm text-gray-400 hover:text-green-400 transition-colors"
              >
                <span className="text-xl mt-0.5">📱</span>
                <div>
                  <p className="font-medium text-gray-300">WhatsApp</p>
                  <p>+91 98765 43210</p>
                </div>
              </a>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-400">
              <Mail className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-300">Email</p>
                <a href="mailto:info@sudhaswagruha.com" className="hover:text-brand-green transition-colors">
                  info@sudhaswagruha.com
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-300">Location</p>
                <p>Andhra Pradesh, India</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500 text-center">
            © {new Date().getFullYear()} Sudha Swagruha Foods. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>100% Natural</span>
            <span>•</span>
            <span>Secure Payments</span>
            <span>•</span>
            <span>Razorpay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
