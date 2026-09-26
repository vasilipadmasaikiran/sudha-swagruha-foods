// ============================================================
// About Page
// ============================================================
import { motion } from 'framer-motion';
import { Leaf, Award, Heart, ShieldCheck } from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function AboutPage() {
  const { language } = useLanguageStore();
  const t = translations[language];

  const values = [
    {
      icon: Leaf,
      title: t.about.values.natural,
      desc: t.about.values.naturalDesc,
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Award,
      title: t.about.values.traditional,
      desc: t.about.values.traditionalDesc,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      icon: Heart,
      title: t.about.values.homemade,
      desc: t.about.values.homemadeDesc,
      color: 'bg-red-100 text-red-600',
    },
    {
      icon: ShieldCheck,
      title: t.about.values.quality,
      desc: t.about.values.qualityDesc,
      color: 'bg-blue-100 text-blue-600',
    },
  ];

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      {/* Hero */}
      <div className="hero-gradient py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-10">
          {['🌶️', '🫙', '🌿', '🧄'].map((e, i) => (
            <span
              key={i}
              className="absolute text-6xl"
              style={{ left: `${i * 25}%`, top: '20%' }}
            >
              {e}
            </span>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <span className="text-green-200 text-sm font-semibold uppercase tracking-wider">
            {t.about.subtitle}
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {language === 'te'
              ? t.about.title
              : 'From Our Home to Your Home'}
          </h1>
          {language === 'en' && (
            <p
              className="text-green-200 text-lg"
              style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
            >
              {t.about.title}
            </p>
          )}
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Story */}
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="bg-white rounded-2xl shadow-card p-8 mb-12 text-center"
        >
          <p className="text-6xl mb-6">🏡</p>
          <p className="text-gray-700 text-lg leading-relaxed max-w-2xl mx-auto">
            {t.about.story}
          </p>
          <p
            className="text-brand-green font-semibold text-xl mt-6"
            style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
          >
            అమ్మ చేతి రుచులు… మీ ఇంటికి! ❤️
          </p>
        </motion.div>

        {/* Values Grid */}
        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {values.map((val, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-card p-6 flex gap-4"
            >
              <div className={`${val.color} p-3 rounded-xl h-fit`}>
                <val.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{val.title}</h3>
                <p className="text-gray-600 text-sm">{val.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Image Gallery */}
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-3 mb-12"
        >
          {[
            'https://images.unsplash.com/photo-1589135233689-a74ce2e0ffae?w=400&q=80',
            'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80',
            'https://images.unsplash.com/photo-1612966809150-a0b4b3f3a2bd?w=400&q=80',
          ].map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`About ${i}`}
              className="rounded-2xl h-40 w-full object-cover shadow-card"
              loading="lazy"
            />
          ))}
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          variants={fadeUp}
          custom={1}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="bg-brand-green rounded-2xl p-8 text-center text-white"
        >
          <h2 className="font-display text-2xl font-bold mb-4">Our Promise to You</h2>
          <p className="text-green-100 leading-relaxed">
            Every product from Sudha Swagruha Foods is made with the finest natural ingredients,
            zero artificial preservatives, and the kind of love that only goes into homemade food.
            We treat every order as if we're cooking for our own family.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
