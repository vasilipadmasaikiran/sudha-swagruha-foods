// ============================================================
// Order Success Page with Dual WhatsApp Actions & Order Tracking
// ============================================================
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Package,
  MapPin,
  MessageCircle,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { translations } from '@/i18n/translations';

interface OrderItemSummary {
  name: string;
  name_te?: string;
  weight: string;
  quantity: number;
  price: number;
}

interface OrderSuccessState {
  orderNumber: string;
  customerName: string;
  customerMobile?: string;
  customerWhatsapp?: string;
  total: number;
  paymentStatus: 'paid' | 'demo' | 'pending';
  address: string;
  items?: OrderItemSummary[];
  ownerWhatsappUrl?: string;
  customerWhatsappUrl?: string;
}

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { settings } = useSettingsStore();
  const t = translations[language];

  const state = location.state as OrderSuccessState | null;

  if (!state) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-card">
          <p className="text-gray-500 mb-4 font-medium">No order information found.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-brand-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors cursor-pointer"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const ownerNumber = settings.businessWhatsApp;
  const customerNumber = state.customerWhatsapp || state.customerMobile;

  // Construct URLs if not already in state
  const ownerUrl =
    state.ownerWhatsappUrl ||
    `https://wa.me/91${ownerNumber}?text=${encodeURIComponent(
      `నమస్కారం! 🙏 ఆర్డర్ నంబర్: *${state.orderNumber}* వివరాలు అందినవి. దయచేసి ధృవీకరించండి.`
    )}`;

  const customerUrl =
    state.customerWhatsappUrl ||
    `https://wa.me/91${customerNumber}?text=${encodeURIComponent(
      `నమస్కారం ${state.customerName}! 🙏 మీ ఆర్డర్ నంబర్: *${state.orderNumber}* విజయవంతంగా నమోదు చేయబడింది. మొత్తం: ₹${state.total}. Sudha Swagruha Foods.`
    )}`;

  return (
    <div className="page-enter min-h-screen bg-brand-cream flex items-center justify-center py-12 px-4">
      <div className="max-w-xl w-full">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-14 h-14 text-brand-green" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-brand-green/20 border-t-brand-green"
            />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-3xl font-bold text-gray-900 mb-2"
          >
            {t.orderSuccess.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600"
            style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
          >
            {t.orderSuccess.subtitle}
          </motion.p>
        </motion.div>

        {/* Order Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-card p-6 mb-6 border border-gray-100"
        >
          {/* Order Number Banner */}
          <div className="text-center bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 mb-5">
            <p className="text-xs uppercase tracking-wider text-emerald-800 font-semibold mb-1">
              {t.orderSuccess.orderNumber}
            </p>
            <p className="text-2xl font-bold text-brand-green tracking-wider font-mono select-all">
              {state.orderNumber}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Save this Order ID to track your delivery status anytime
            </p>
          </div>

          <div className="space-y-4">
            {/* Customer */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-light-green rounded-lg flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-semibold text-gray-800">
                  {state.customerName}{' '}
                  {customerNumber && (
                    <span className="text-xs text-gray-500 font-normal">({customerNumber})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Payment Status */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t.orderSuccess.paymentStatus}</p>
                <p className="font-semibold text-green-700">
                  {state.paymentStatus === 'paid'
                    ? '✅ Online Payment Paid'
                    : '⏳ Direct WhatsApp Order (Cash on Delivery / UPI)'}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-light-green rounded-lg flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-bold text-brand-green text-xl">₹{state.total}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Delivery Address</p>
                <p className="font-medium text-gray-800 text-sm leading-relaxed">{state.address}</p>
              </div>
            </div>

            {/* Items List (if available) */}
            {state.items && state.items.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Items Ordered ({state.items.length})
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {state.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50">
                      <span className="text-gray-700 font-medium">
                        {it.name} ({it.weight}) × {it.quantity}
                      </span>
                      <span className="font-semibold text-gray-900">₹{it.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* WhatsApp Notification Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 mb-6 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <div>
              <p className="font-bold text-emerald-950 text-sm">WhatsApp Notifications</p>
              <p className="text-xs text-emerald-800">
                Send details to WhatsApp for fast confirmation & tracking updates
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {/* 1. Send / Open Business Owner WhatsApp */}
            <a
              href={ownerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-xl font-bold text-xs hover:bg-[#20ba59] transition-colors shadow-sm text-center"
            >
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              <span>Owner WhatsApp ({ownerNumber})</span>
            </a>

            {/* 2. Send Details to Customer WhatsApp */}
            {customerNumber ? (
              <a
                href={customerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm text-center"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span>Customer WhatsApp ({customerNumber})</span>
              </a>
            ) : null}
          </div>
        </motion.div>

        {/* Navigation Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Link
            to={`/track-order?order=${encodeURIComponent(state.orderNumber)}`}
            className="flex items-center justify-center gap-2 w-full bg-brand-green text-white py-3.5 rounded-xl font-bold hover:bg-brand-green-dark transition-colors shadow-green-glow"
          >
            <Package className="w-5 h-5" />
            <span>Track This Order Live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/products"
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-brand-green text-brand-green py-3.5 rounded-xl font-bold hover:bg-brand-light-green transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>{t.orderSuccess.continueShopping}</span>
          </Link>
        </motion.div>

        {/* Brand Tag */}
        <p
          className="text-center text-gray-400 text-sm mt-6 font-telugu"
          style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
        >
          అమ్మ చేతి రుచులు… మీ ఇంటికి! ❤️
        </p>
      </div>
    </div>
  );
}
