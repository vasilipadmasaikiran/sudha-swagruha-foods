// ============================================================
// Order Success Page
// ============================================================
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, MapPin, MessageCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || '918374634989';

interface OrderSuccessState {
  orderNumber: string;
  customerName: string;
  total: number;
  paymentStatus: 'paid' | 'demo' | 'pending';
  address: string;
}

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const t = translations[language];

  const state = location.state as OrderSuccessState | null;

  if (!state) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No order information found.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-brand-green text-white px-6 py-3 rounded-xl font-semibold"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const whatsappMsg = encodeURIComponent(
    `నమస్కారం! 🙏\n\nనా ఆర్డర్ నంబర్: *${state.orderNumber}*\n\nచెల్లింపు పూర్తయింది. డెలివరీ వివరాల గురించి తెలుసుకోవాలి.`
  );

  return (
    <div className="page-enter min-h-screen bg-brand-cream flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
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
            transition={{ delay: 0.3 }}
            className="font-display text-3xl font-bold text-gray-900 mb-2"
          >
            {t.orderSuccess.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
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
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-card p-6 mb-6"
        >
          {/* Order Number */}
          <div className="text-center bg-brand-light-green rounded-xl p-4 mb-5">
            <p className="text-sm text-gray-500 mb-1">{t.orderSuccess.orderNumber}</p>
            <p className="text-2xl font-bold text-brand-green tracking-wider font-mono">
              {state.orderNumber}
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
                <p className="font-semibold text-gray-800">{state.customerName}</p>
              </div>
            </div>

            {/* Payment Status */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t.orderSuccess.paymentStatus}</p>
                <p className="font-semibold text-green-600">
                  {state.paymentStatus === 'demo' ? '✅ Demo (Simulated)' : t.orderSuccess.paid}
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
                <p className="font-medium text-gray-800">{state.address}</p>
              </div>
            </div>

            {/* Estimated Delivery */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimated Delivery</p>
                <p className="font-semibold text-gray-800">{t.orderSuccess.estimatedDelivery}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <Link
            to="/track-order"
            className="flex items-center justify-center gap-2 w-full bg-brand-green text-white py-4 rounded-xl font-bold hover:bg-brand-green-dark transition-colors"
          >
            <Package className="w-5 h-5" />
            {t.orderSuccess.trackOrder}
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-green-500 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {t.orderSuccess.contactWhatsApp}
          </a>

          <Link
            to="/products"
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-brand-green text-brand-green py-4 rounded-xl font-bold hover:bg-brand-light-green transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            {t.orderSuccess.continueShopping}
          </Link>
        </motion.div>

        {/* Brand Tag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-gray-400 text-sm mt-6"
          style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
        >
          అమ్మ చేతి రుచులు… మీ ఇంటికి! ❤️
        </motion.p>
      </div>
    </div>
  );
}
