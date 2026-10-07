// ============================================================
// HomePage
// ============================================================
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Leaf, Award, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/hooks/useStore';
import { useProductStore } from '@/hooks/useProductStore';
import { translations } from '@/i18n/translations';
import { categories } from '@/data/products';
import ProductCard from '@/components/ProductCard';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function HomePage() {
  const { language } = useLanguageStore();
  const { products } = useProductStore();
  const t = translations[language];
  const activeProducts = products.filter((p) => p.is_active);
  const featuredProducts = activeProducts.filter((p) => p.badge).length > 0
    ? activeProducts.filter((p) => p.badge).slice(0, 4)
    : activeProducts.slice(0, 4);

  const trustBadges = [
    { icon: Leaf, label: '100% Natural', subLabel: 'No preservatives', color: 'text-green-600' },
    { icon: ShieldCheck, label: 'Secure Payments', subLabel: 'Razorpay secured', color: 'text-blue-600' },
    { icon: Award, label: 'Traditional Recipes', subLabel: 'Generations old', color: 'text-amber-600' },
    { icon: Truck, label: 'Pan India Delivery', subLabel: '3–5 working days', color: 'text-purple-600' },
  ];

  return (
    <div className="page-enter">
      {/* ── Hero Section ── */}
      <section className="hero-gradient relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-red/10 rounded-full blur-3xl" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
            style={{
              background:
                'radial-gradient(circle, #FFF8E7 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Floating spice icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['🌶️', '🫙', '🌿', '🧄', '🥥', '🌾'].map((emoji, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -15, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.4,
              }}
              className="absolute text-3xl md:text-4xl opacity-20 select-none"
              style={{
                left: `${10 + i * 15}%`,
                top: `${15 + (i % 3) * 25}%`,
              }}
            >
              {emoji}
            </motion.div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
              >
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {t.hero.badge}
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="hero-heading font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4"
              >
                {language === 'en' ? (
                  <>
                    The Taste of{' '}
                    <span className="text-yellow-300">Amma's</span> Kitchen
                  </>
                ) : (
                  <span
                    className="font-telugu"
                    style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                  >
                    {t.hero.heading}
                  </span>
                )}
              </motion.h1>

              {/* Subheading */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className={`text-green-100 text-lg md:text-xl leading-relaxed mb-8 max-w-lg ${
                  language === 'te' ? 'font-telugu' : ''
                }`}
                style={
                  language === 'te'
                    ? { fontFamily: 'Noto Sans Telugu, sans-serif' }
                    : {}
                }
              >
                {t.hero.subheading}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/products"
                  className="group inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red-dark text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-red-glow hover:shadow-lg hover:scale-105"
                >
                  {t.hero.shopNow}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg backdrop-blur-sm transition-all"
                >
                  {t.hero.learnMore}
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-10 grid grid-cols-3 gap-6"
              >
                {[
                  { num: '10+', label: 'Products' },
                  { num: '500+', label: 'Happy Customers' },
                  { num: '100%', label: 'Natural' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-3xl font-bold text-yellow-300">{stat.num}</p>
                    <p className="text-green-200 text-sm mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Hero Image Grid */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:grid grid-cols-2 gap-3.5"
            >
              {[
                {
                  title: 'Andhra Pickles',
                  subtitle: 'Avakaya, Gongura & Lemon',
                  telugu: 'ఊరగాయలు',
                  slug: '/category/pickles',
                  badge: '🫙 Authentic Pickles',
                  src: `${import.meta.env.BASE_URL}images/pickle.jpg`,
                  fallbackSrc: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80',
                  alt: 'Traditional Andhra Pickles (ఊరగాయలు)',
                  span: 'row-span-2 min-h-[340px]',
                },
                {
                  title: 'Aromatic Masalas',
                  subtitle: 'Freshly roasted spices',
                  telugu: 'మసాలా పొడులు',
                  slug: '/category/masala',
                  badge: '🌿 Pure Masalas',
                  src: `${import.meta.env.BASE_URL}images/masala.jpg`,
                  fallbackSrc: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80',
                  alt: 'Traditional Masala Powders (మసాలా పొడులు)',
                  span: 'min-h-[160px]',
                },
                {
                  title: 'Karam & Podis',
                  subtitle: 'Stone-ground spicy chillies',
                  telugu: 'కారాలు & పొడులు',
                  slug: '/category/karam',
                  badge: '🌶️ Spicy Karam',
                  src: `${import.meta.env.BASE_URL}images/karam.jpg`,
                  fallbackSrc: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80',
                  alt: 'Guntur Karam Powders (కారం పొడులు)',
                  span: 'min-h-[160px]',
                },
              ].map((item, i) => (
                <Link
                  key={i}
                  to={item.slug}
                  className={`group relative ${item.span} rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-emerald-950/40 block`}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== item.fallbackSrc) {
                        target.src = item.fallbackSrc;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10 group-hover:from-black/90 transition-colors pointer-events-none" />
                  
                  {/* Badge Label */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md text-amber-300 text-xs font-bold rounded-full border border-amber-400/40 shadow-lg">
                      {item.badge}
                    </span>
                  </div>

                  {/* Caption & Info */}
                  <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                    <div className="flex items-baseline gap-1.5">
                      <p className="font-bold text-sm tracking-wide group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-white/70" style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}>
                        ({item.telugu})
                      </span>
                    </div>
                    <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </Link>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full fill-brand-cream">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* ── Trust Badges ── */}
      <section className="py-8 bg-brand-cream border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {trustBadges.map((badge, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-card"
              >
                <div className={`p-2 bg-gray-50 rounded-xl ${badge.color}`}>
                  <badge.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{badge.label}</p>
                  <p className="text-xs text-gray-500">{badge.subLabel}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-16 bg-brand-cream spice-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {t.categories.title}
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">{t.categories.subtitle}</p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <Link
                  to={`/category/${cat.slug}`}
                  className="group block rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.name_en}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <p className="text-white font-bold text-sm">{cat.name_en}</p>
                          <p
                            className="text-white/70 text-xs"
                            style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                          >
                            {cat.name_te}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-3">
                    <p className="text-xs text-gray-500 line-clamp-2">{cat.description_en}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-10">
            <motion.div
              variants={fadeUp}
              custom={0}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900">
                {t.products.title}
              </h2>
              <p className="text-gray-500 mt-1">{t.products.subtitle}</p>
            </motion.div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-2 text-brand-green font-semibold hover:gap-3 transition-all"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-brand-green text-white px-8 py-3.5 rounded-xl font-bold hover:bg-brand-green-dark transition-colors shadow-green-glow"
            >
              View All Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Story Section ── */}
      <section className="py-16 bg-brand-light-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              variants={fadeUp}
              custom={0}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <span className="text-brand-green font-semibold text-sm uppercase tracking-wider">
                {t.about.subtitle}
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                {t.about.title}
              </h2>
              <p className="text-gray-600 leading-relaxed text-lg mb-6">{t.about.story}</p>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(t.about.values).map(([key, val], i) => {
                  if (typeof val !== 'string' || key.endsWith('Desc')) return null;
                  const desc = t.about.values[`${key}Desc` as keyof typeof t.about.values];
                  return (
                    <div key={key} className="bg-white p-4 rounded-xl shadow-card">
                      <p className="font-bold text-gray-900 text-sm">{val}</p>
                      <p className="text-xs text-gray-500 mt-1">{desc}</p>
                    </div>
                  );
                })}
              </div>

              <Link
                to="/about"
                className="inline-flex items-center gap-2 mt-8 bg-brand-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors"
              >
                Our Story <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={1}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="relative rounded-2xl h-48 overflow-hidden shadow-card group">
                  <img
                    src={`${import.meta.env.BASE_URL}images/pickle.jpg`}
                    alt="Homemade Andhra Pickle"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80';
                      if (target.src !== fallback) target.src = fallback;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-2.5 text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                    🫙 Andhra Pickles
                  </span>
                </div>

                <div className="relative rounded-2xl h-48 overflow-hidden shadow-card mt-6 group">
                  <img
                    src={`${import.meta.env.BASE_URL}images/karam.jpg`}
                    alt="Spicy Guntur Karam"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80';
                      if (target.src !== fallback) target.src = fallback;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-2.5 text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                    🌶️ Karam & Podis
                  </span>
                </div>

                <div className="relative rounded-2xl h-48 overflow-hidden shadow-card col-span-2 group">
                  <img
                    src={`${import.meta.env.BASE_URL}images/masala.jpg`}
                    alt="Authentic Telugu Masala Blends"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80';
                      if (target.src !== fallback) target.src = fallback;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-2.5 text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                    🌿 Aromatic Masala Powders
                  </span>
                </div>
              </div>
              {/* Decorative badge */}
              <div className="absolute -bottom-4 -right-4 bg-brand-red text-white p-4 rounded-2xl shadow-red-glow text-center">
                <p className="text-3xl font-bold">❤️</p>
                <p className="text-xs font-medium mt-1">Made with Love</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WhatsApp Order Banner ── */}
      <section className="py-12 bg-[#075E54]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <p className="text-4xl mb-4">📱</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Order via WhatsApp
            </h2>
            <p className="text-green-200 mb-6">
              Message us directly on WhatsApp and we'll help you place your order!
            </p>
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || '918374634989'}?text=${encodeURIComponent('నమస్కారం! నేను ఆర్డర్ చేయాలనుకుంటున్నాను.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 shadow-lg"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Order on WhatsApp
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
