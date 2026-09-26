// ============================================================
// Navbar Component
// ============================================================
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore, useLanguageStore, useUIStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';

const logoPath = import.meta.env.BASE_URL + 'logo/logo.png';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { items, openCart, getItemCount } = useCartStore();
  const { language, toggle } = useLanguageStore();
  const { mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();
  const location = useLocation();
  const t = translations[language];
  const itemCount = getItemCount();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  const categories = [
    { slug: 'pickles', label: t.categories.pickles, icon: '🫙' },
    { slug: 'karam', label: t.categories.karam, icon: '🌶️' },
    { slug: 'masala', label: t.categories.masala, icon: '🌿' },
    { slug: 'podi', label: t.categories.podi, icon: '🍚' },
  ];

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/products', label: t.nav.products },
    { href: '/about', label: t.nav.about },
    { href: '/contact', label: t.nav.contact },
    { href: '/track-order', label: t.nav.trackOrder },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-white/90 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <img
                src={logoPath}
                alt="Sudha Swagruha Foods"
                className="h-10 w-10 md:h-12 md:w-12 object-contain group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="hidden sm:block">
                <p className="font-bold text-brand-green text-base leading-tight font-display">
                  Sudha Swagruha Foods
                </p>
                <p
                  className="text-xs text-brand-brown font-telugu"
                  style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                >
                  అమ్మ చేతి రుచులు
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium transition-colors hover:text-brand-green ${
                    location.pathname === link.href
                      ? 'text-brand-green font-semibold'
                      : 'text-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Categories Dropdown */}
              <div className="relative">
                <button
                  onMouseEnter={() => setCategoryOpen(true)}
                  onMouseLeave={() => setCategoryOpen(false)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-brand-green transition-colors"
                >
                  {t.nav.categories}
                  <ChevronDown className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {categoryOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      onMouseEnter={() => setCategoryOpen(true)}
                      onMouseLeave={() => setCategoryOpen(false)}
                      className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                      {categories.map((cat) => (
                        <Link
                          key={cat.slug}
                          to={`/category/${cat.slug}`}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-light-green hover:text-brand-green transition-colors"
                          onClick={() => setCategoryOpen(false)}
                        >
                          <span className="text-lg">{cat.icon}</span>
                          {cat.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Language Toggle */}
              <button
                onClick={toggle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-brand-green hover:bg-brand-light-green transition-colors text-sm font-medium"
                title="Switch Language"
              >
                <Globe className="w-4 h-4 text-brand-green" />
                <span className="text-gray-700">
                  {language === 'en' ? 'తె' : 'EN'}
                </span>
              </button>

              {/* Cart Button */}
              <button
                onClick={openCart}
                className="relative p-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors shadow-sm"
                aria-label={t.nav.cart}
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold cart-badge"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-xl border border-gray-200 hover:bg-brand-light-green transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-700" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      location.pathname === link.href
                        ? 'bg-brand-light-green text-brand-green font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="pt-2 border-t border-gray-100">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t.nav.categories}
                  </p>
                  {categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/category/${cat.slug}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-brand-light-green hover:text-brand-green transition-colors"
                    >
                      <span className="text-lg">{cat.icon}</span>
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer */}
      <div className="h-16 md:h-18" />
    </>
  );
}
