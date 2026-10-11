// ============================================================
// Footer Component - Dynamic Contact Info
// ============================================================
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Heart } from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { translations } from '@/i18n/translations';

import AppImage from '@/components/common/AppImage';

const defaultLogo = (import.meta.env.BASE_URL || '/') + 'logo/logo.jpg';

import { useCategoryStore } from '@/hooks/useCategoryStore';
import { ShieldCheck, Award } from 'lucide-react';

export default function Footer() {
  const { language } = useLanguageStore();
  const { settings } = useSettingsStore();
  const { getVisibleCustomerCategories } = useCategoryStore();
  const t = translations[language];

  const visibleCategories = getVisibleCustomerCategories();
  const categories = visibleCategories.length > 0
    ? visibleCategories.map((c) => ({
        slug: c.slug,
        label: language === 'te' ? (c.name_te || c.name_en) : c.name_en,
      }))
    : [
        { slug: 'pickles', label: t.categories.pickles },
        { slug: 'karam', label: t.categories.karam },
        { slug: 'masala', label: t.categories.masala },
        { slug: 'podi', label: t.categories.podi },
      ];

  const showFoodLicense =
    Boolean(settings.foodLicense?.showOnCustomerSite) &&
    Boolean(settings.foodLicense?.foodLicenseNumber?.trim());

  const showGst =
    Boolean(settings.gst?.showOnCustomerSite) &&
    Boolean(settings.gst?.gstin?.trim());

  const quickLinks = [
    { href: '/', label: t.nav.home },
    { href: '/products', label: t.nav.products },
    { href: '/about-us', label: t.nav.about },
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
            <AppImage
              src={settings.logoUrl || defaultLogo}
              alt={settings.businessName}
              className="w-12 h-12 object-contain bg-white rounded-xl p-1"
              containerClassName="w-12 h-12 rounded-xl bg-white flex-shrink-0"
            />
            <div>
              <p className="font-bold text-white text-base">{settings.businessName}</p>
              <p
                className="text-xs text-gray-400"
                style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
              >
                అమ్మ చేతి రుచులు
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            {settings.footerText || 'Authentic homemade Telugu pickles, masalas & traditional foods. Made with love, the way Amma makes it.'}
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
          </ul>
        </div>

        {/* Dynamic Contact Information */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            {t.nav.contact}
          </h3>
          <ul className="space-y-4">
            <li>
              <a
                href={`https://wa.me/91${settings.businessWhatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm text-gray-400 hover:text-green-400 transition-colors"
              >
                <span className="text-xl mt-0.5">📱</span>
                <div>
                  <p className="font-medium text-gray-300">WhatsApp</p>
                  <p className="font-mono text-emerald-400">+91 {settings.businessWhatsApp}</p>
                </div>
              </a>
            </li>
            <li>
              <a
                href={`tel:+91${settings.businessPhone}`}
                className="flex items-start gap-3 text-sm text-gray-400 hover:text-brand-green transition-colors"
              >
                <Phone className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-300">Call Us</p>
                  <p className="font-mono">+91 {settings.businessPhone}</p>
                </div>
              </a>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-400">
              <Mail className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-300">Email</p>
                <a
                  href={`mailto:${settings.businessEmail}`}
                  className="hover:text-brand-green transition-colors break-all"
                >
                  {settings.businessEmail}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-300">Location</p>
                <p className="text-xs leading-relaxed">{settings.businessAddress}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Regulatory & Business Information (Section 4 & 5) */}
      {(showFoodLicense || showGst) && (
        <div className="border-t border-gray-800/80 bg-gray-950/60 py-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
                Business Regulatory Information
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-gray-300">
              {showFoodLicense && (
                <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
                  <Award className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-gray-400">
                    {settings.foodLicense?.licenseType || 'Food License'}:
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {settings.foodLicense?.foodLicenseNumber}
                  </span>
                  {settings.foodLicense?.licenseValidity && (
                    <span className="text-[10px] text-gray-500 font-sans">
                      (Valid: {settings.foodLicense.licenseValidity})
                    </span>
                  )}
                </div>
              )}

              {showGst && (
                <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
                  <span className="text-gray-400">GSTIN:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {settings.gst?.gstin}
                  </span>
                  {settings.gst?.gstRegisteredBusinessName && (
                    <span className="text-[10px] text-gray-400 font-sans">
                      ({settings.gst.gstRegisteredBusinessName})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500 text-center">
            © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>100% Traditional Telugu Recipes</span>
            <span>•</span>
            <span>Fast WhatsApp Dispatch</span>
            <span>•</span>
            <span>Handmade with Love</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
