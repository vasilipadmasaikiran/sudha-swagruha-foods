// ============================================================
// Discount & Promotion Announcement Bar
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, ArrowRight, X, Percent } from 'lucide-react';
import { useProductStore } from '@/hooks/useProductStore';
import { useLanguageStore } from '@/hooks/useStore';
import toast from 'react-hot-toast';

const THEME_STYLES: Record<string, { bg: string; badge: string; text: string; button: string }> = {
  crimson: {
    bg: 'bg-gradient-to-r from-red-800 via-brand-red to-orange-700 text-white',
    badge: 'bg-amber-400 text-amber-950 font-bold',
    text: 'text-amber-100',
    button: 'bg-white text-brand-red hover:bg-amber-50',
  },
  emerald: {
    bg: 'bg-gradient-to-r from-emerald-900 via-brand-green to-teal-900 text-white',
    badge: 'bg-green-300 text-green-950 font-bold',
    text: 'text-green-100',
    button: 'bg-white text-brand-green hover:bg-emerald-50',
  },
  amber: {
    bg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 text-white',
    badge: 'bg-white text-orange-900 font-bold',
    text: 'text-yellow-100',
    button: 'bg-gray-900 text-white hover:bg-black',
  },
  charcoal: {
    bg: 'bg-gradient-to-r from-zinc-950 via-gray-900 to-black text-white',
    badge: 'bg-amber-500 text-gray-950 font-bold',
    text: 'text-gray-300',
    button: 'bg-white text-gray-900 hover:bg-gray-100',
  },
  purple: {
    bg: 'bg-gradient-to-r from-purple-950 via-indigo-900 to-pink-900 text-white',
    badge: 'bg-pink-400 text-purple-950 font-bold',
    text: 'text-purple-200',
    button: 'bg-white text-purple-900 hover:bg-pink-50',
  },
};

export default function AnnouncementBar() {
  const { announcement } = useProductStore();
  const { language } = useLanguageStore();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || !announcement.enabled || dismissed) {
    return null;
  }

  const theme = THEME_STYLES[announcement.theme] || THEME_STYLES.crimson;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!announcement.couponCode) return;
    navigator.clipboard.writeText(announcement.couponCode);
    setCopied(true);
    toast.success(`Coupon code ${announcement.couponCode} copied! Apply at checkout.`);
    setTimeout(() => setCopied(false), 2500);
  };

  const displayText =
    language === 'te' && announcement.headline_te
      ? announcement.headline_te
      : announcement.headline;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`relative z-50 shadow-md ${theme.bg} transition-colors duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          {/* Left badge & headline */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider shadow-sm flex-shrink-0 ${theme.badge}`}
            >
              <Sparkles className="w-3 h-3 animate-pulse" />
              {announcement.tag || 'Special Offer'}
            </span>
            <p className="font-medium truncate text-white">
              {displayText}
              {announcement.minOrderValue > 0 && (
                <span className={`hidden md:inline ml-2 text-xs opacity-90 ${theme.text}`}>
                  (Orders above ₹{announcement.minOrderValue})
                </span>
              )}
            </p>
          </div>

          {/* Right actions: Coupon code copy, Shop link, and Dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {announcement.couponCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/25 hover:bg-black/40 border border-white/20 transition-all font-mono font-bold text-xs"
                title="Click to copy coupon code"
              >
                <Percent className="w-3 h-3 text-amber-300" />
                <span>{announcement.couponCode}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-300" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                )}
                {copied && (
                  <span className="hidden sm:inline text-[10px] text-green-300 font-sans font-normal">
                    Copied!
                  </span>
                )}
              </button>
            )}

            {announcement.linkUrl && (
              <Link
                to={announcement.linkUrl}
                className={`hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm transition-all ${theme.button}`}
              >
                <span>{announcement.linkText || 'Shop Now'}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-full text-white/80 hover:text-white hover:bg-black/20 transition-colors ml-1"
              aria-label="Dismiss banner"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
