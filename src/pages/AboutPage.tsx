// ============================================================
// Customer-Facing About Us Page (Dynamic CMS Driven)
// Connected directly to useAboutStore with live Supabase Realtime synchronization
// ============================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Leaf,
  ShieldCheck,
  Award,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  MessageCircle,
  X,
  User,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAboutStore, type AboutPerson } from '@/hooks/useAboutStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import AppImage from '@/components/common/AppImage';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function AboutPage() {
  const { content, fetchAboutContent, subscribeToAboutRealtime, isLoading } = useAboutStore();
  const { settings } = useSettingsStore();
  const [selectedPerson, setSelectedPerson] = useState<AboutPerson | null>(null);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchAboutContent();
    const unsubscribe = subscribeToAboutRealtime();
    return () => {
      unsubscribe();
    };
  }, [fetchAboutContent, subscribeToAboutRealtime]);

  // Dynamic SEO Title & Meta update
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const pageTitle = content.seoTitle || `${content.pageTitle} | ${settings.businessName}`;
      document.title = pageTitle;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', content.seoDescription || content.introduction);
    }
  }, [content, settings.businessName]);

  // Draft Mode Screen if unpublished
  if (!content.isPublished) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-brand-cream px-4 py-16">
        <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-sm border border-amber-200">
          <span className="text-5xl mb-3 block">🌿</span>
          <h1 className="text-2xl font-bold text-gray-900 font-display">About Us Coming Soon</h1>
          <p className="text-sm text-gray-600 mt-2">
            We are polishing our heritage story and culinary details. Check back shortly!
          </p>
          <div className="mt-6">
            <Link
              to="/products"
              className="px-5 py-2.5 bg-brand-red text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-md hover:bg-brand-red/90 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Our Pickles & Sweets</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activePeople = (content.people || [])
    .filter((p) => p.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      {/* ============================================================ */}
      {/* SECTION 1: HERO & INTRODUCTION                               */}
      {/* ============================================================ */}
      <section className="relative pt-16 pb-24 text-center text-white overflow-hidden bg-gradient-to-br from-brand-red via-brand-terracotta to-brand-amber">
        {/* Background decorative Telugu motifs */}
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none select-none">
          {['🌶️', '🫙', '🌿', '🧄', '🍋'].map((icon, i) => (
            <span
              key={i}
              className="absolute text-7xl"
              style={{ left: `${i * 20 + 5}%`, top: `${(i % 3) * 30 + 10}%` }}
            >
              {icon}
            </span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 space-y-4"
        >
          {content.pageSubtitle && (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md inline-block shadow-sm">
              {content.pageSubtitle}
            </span>
          )}

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-sm leading-tight">
            {content.pageTitle}
          </h1>

          <p className="text-base sm:text-lg text-amber-50 font-sans leading-relaxed max-w-2xl mx-auto opacity-95">
            {content.introduction}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products"
              className="px-6 py-3 bg-white text-brand-red font-bold rounded-2xl text-xs sm:text-sm shadow-xl hover:bg-amber-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Traditional Delicacies</span>
            </Link>

            <a
              href={`https://wa.me/91${settings.businessWhatsApp}?text=${encodeURIComponent(
                `Hello ${settings.businessName}, I would like to know more about your traditional sweets & pickles!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat with Us</span>
            </a>
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: HERO BANNER SHOWCASE IMAGE                         */}
      {/* ============================================================ */}
      {content.heroImage && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-3xl overflow-hidden shadow-2xl border-4 sm:border-8 border-white bg-slate-900"
          >
            <AppImage
              src={content.heroImage}
              alt={content.pageTitle}
              aspectRatio="video"
              className="w-full object-cover max-h-[460px]"
            />
          </motion.div>
        </div>
      )}

      {/* Key Metric Badges */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-amber/30 text-center">
            <span className="text-2xl font-black text-brand-red font-display block">1994</span>
            <span className="text-xs text-gray-600 font-medium mt-0.5 block">Year Established</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-green/30 text-center">
            <span className="text-2xl font-black text-brand-green font-display block">40+</span>
            <span className="text-xs text-gray-600 font-medium mt-0.5 block">Heirloom Telugu Recipes</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-terracotta/30 text-center">
            <span className="text-2xl font-black text-brand-terracotta font-display block">100%</span>
            <span className="text-xs text-gray-600 font-medium mt-0.5 block">Cold-Pressed Wood Oils</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-300 text-center">
            <span className="text-2xl font-black text-emerald-600 font-display block">0%</span>
            <span className="text-xs text-gray-600 font-medium mt-0.5 block">Artificial Preservatives</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3: OUR STORY & JOURNEY                                */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          {/* Story Narrative */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="md:col-span-7 space-y-4"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 bg-brand-red rounded-full" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-red font-mono">
                Authentic Roots & Heritage
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 font-display tracking-tight">
              Our Journey with <span className="text-brand-red">{settings.businessName}</span>
            </h2>

            <div className="text-gray-700 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line font-sans">
              {content.ourStory}
            </div>

            <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-red" />
                <span>Benz Circle, Vijayawada</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-green" />
                <span>30+ Years of Tradition</span>
              </span>
            </div>
          </motion.div>

          {/* Story Showcase Image */}
          <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="md:col-span-5"
          >
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-brand-amber to-brand-red rounded-3xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500" />
              <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-900">
                <AppImage
                  src={content.storyImage}
                  alt={`${settings.businessName} Culinary Journey`}
                  aspectRatio="square"
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4: MISSION & VISION CARDS                            */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-b from-transparent via-amber-50/60 to-transparent py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Mission */}
            <motion.div
              variants={fadeUp}
              custom={0}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-brand-amber/30 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -right-6 -bottom-6 text-7xl opacity-5 select-none pointer-events-none">
                🎯
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
                  🎯
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Our Mission</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{content.mission}</p>
              </div>
            </motion.div>

            {/* Vision */}
            <motion.div
              variants={fadeUp}
              custom={1}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-brand-green/30 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -right-6 -bottom-6 text-7xl opacity-5 select-none pointer-events-none">
                🌱
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
                  🌱
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Our Vision</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{content.vision}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 5: UNCOMPROMISING CORE VALUES                         */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-red font-mono">
            Pillars of Taste
          </span>
          <h2 className="text-3xl font-black text-gray-900 font-display">
            Our Uncompromising Principles
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            How we prepare each batch without artificial chemicals, mass shortcuts, or blended oils.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {(content.values || []).map((val, idx) => {
            const getIcon = () => {
              if (val.iconName === 'Heart') return <Heart className="w-6 h-6 text-brand-red" />;
              if (val.iconName === 'Leaf') return <Leaf className="w-6 h-6 text-brand-green" />;
              if (val.iconName === 'ShieldCheck') return <ShieldCheck className="w-6 h-6 text-blue-500" />;
              return <Award className="w-6 h-6 text-amber-500" />;
            };

            return (
              <motion.div
                key={val.id}
                variants={fadeUp}
                custom={idx}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center">
                  {getIcon()}
                </div>
                <h4 className="font-bold text-gray-900 text-sm leading-snug">{val.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{val.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 6: MEET OUR TEAM / LEADERSHIP PROFILES                */}
      {/* ============================================================ */}
      {activePeople.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-amber-200/60">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-red font-mono">
              The Custodians of Heritage
            </span>
            <h2 className="text-3xl font-black text-gray-900 font-display">
              Meet Our Culinary Team
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              The passionate family members and artisans behind our recipes and authentic quality.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {activePeople.map((person, idx) => (
              <motion.div
                key={person.id}
                variants={fadeUp}
                custom={idx}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between text-center hover:shadow-xl transition-all group"
              >
                <div>
                  {/* Photo */}
                  <div className="w-28 h-28 mx-auto rounded-full overflow-hidden shadow-lg border-4 border-amber-100 group-hover:border-brand-amber transition-colors mb-4 bg-slate-900">
                    <AppImage
                      src={person.profileImage}
                      alt={person.name}
                      aspectRatio="square"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Name & Title */}
                  <h3 className="font-bold text-gray-900 text-lg">{person.name}</h3>
                  <p className="text-xs font-semibold text-brand-red mb-3 font-mono">
                    {person.designation}
                  </p>

                  {/* Short Bio */}
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                    {person.shortBio}
                  </p>
                </div>

                {/* Detailed Bio Link */}
                {person.detailedBio && (
                  <button
                    type="button"
                    onClick={() => setSelectedPerson(person)}
                    className="text-xs font-bold text-brand-green hover:text-brand-green/80 flex items-center justify-center gap-1 transition-colors cursor-pointer pt-3 border-t border-gray-100"
                  >
                    <span>Read Full Story</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* SECTION 7: STORE PROMISE & CTA BANNER                         */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl p-8 sm:p-12 text-center text-white bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="text-3xl block">🍯</span>
            <h2 className="text-2xl sm:text-4xl font-black font-display tracking-tight">
              Taste the Authentic Tradition Today
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Order fresh jars of Avakaya, Gongura, Bellam Pootharekulu, and stone-ground podis delivered straight to your doorstep across India.
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/products"
                className="px-6 py-3 bg-white text-emerald-900 font-bold rounded-2xl text-xs sm:text-sm shadow-xl hover:bg-emerald-50 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-800" />
                <span>Shop Traditional Catalog</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MODAL: DETAILED PERSON BIOGRAPHY                             */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedPerson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 p-1.5 rounded-full bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-3 mb-6">
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-md border-2 border-brand-amber bg-slate-900">
                  <AppImage
                    src={selectedPerson.profileImage}
                    alt={selectedPerson.name}
                    aspectRatio="square"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xl font-display">{selectedPerson.name}</h3>
                  <p className="text-xs font-semibold text-brand-red">{selectedPerson.designation}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line border-t border-gray-100 pt-4">
                {selectedPerson.detailedBio || selectedPerson.shortBio}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPerson(null)}
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
