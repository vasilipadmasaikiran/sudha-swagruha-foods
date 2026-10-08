// ============================================================
// Cart Drawer Component
// ============================================================
import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore, useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';
import AppImage from '@/components/common/AppImage';

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    getSubtotal,
    getDeliveryCharge,
    getTotal,
    discount,
    couponCode,
    getFinancialSummary,
    validateCartStock,
  } = useCartStore();
  const { language } = useLanguageStore();
  const t = translations[language];

  const financialSummary = getFinancialSummary();
  const stockValidation = validateCartStock();
  const subtotal = financialSummary.originalSubtotal;
  const delivery = financialSummary.shippingAmount;
  const total = financialSummary.grandTotal;
  const discountAmount = financialSummary.couponDiscount;
  const gstAmount = financialSummary.gstAmount;
  const gstRate = financialSummary.gstRate;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-brand-cream z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-brand-green text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6" />
                <div>
                  <h2 className="font-bold text-lg">{t.cart.title}</h2>
                  <p className="text-green-200 text-xs">
                    {t.cart.itemsCount.replace('{{count}}', String(items.reduce((s, i) => s + i.quantity, 0)))}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">{t.cart.empty}</p>
                  <p className="text-gray-400 text-sm mt-1">{t.cart.emptyDesc}</p>
                  <button
                    onClick={closeCart}
                    className="mt-6 px-6 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
                  >
                    {t.cart.continueShopping}
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={`${item.product.id}-${item.variant.weight}`}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 80 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl p-4 shadow-card"
                    >
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <AppImage
                          src={item.product.images[0]}
                          alt={item.product.name_en}
                          className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                          containerClassName="w-20 h-20 rounded-xl flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 leading-tight">
                            {language === 'te' ? item.product.name_te : item.product.name_en}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">{item.variant.weight}</p>
                          <p className="text-brand-green font-bold text-base mt-1">
                            ₹{item.variant.price}
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.variant.weight,
                                    item.quantity - 1
                                  )
                                }
                                className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center hover:bg-brand-light-green transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-semibold w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.variant.weight,
                                    item.quantity + 1
                                  )
                                }
                                className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center hover:bg-brand-light-green transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() =>
                                removeItem(item.product.id, item.variant.weight)
                              }
                              className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer with totals */}
            {items.length > 0 && (
              <div className="flex-shrink-0 border-t border-gray-200 bg-white px-5 py-5">
                {/* Dynamic Free delivery progress & note */}
                {delivery === 0 ? (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 rounded-lg">
                    <span className="text-green-600 text-sm">🎉</span>
                    <p className="text-green-700 text-xs font-medium">
                      {t.cart.freeDelivery} Applied! (Order qualifies for Free Shipping)
                    </p>
                  </div>
                ) : (
                  <div className="mb-3 px-3 py-2 bg-amber-50/70 border border-amber-200/60 rounded-xl text-center space-y-1">
                    <p className="text-xs text-amber-800 font-medium">
                      Add <strong className="text-brand-green">₹{(financialSummary.shippingResult?.amountNeededForFreeShipping ?? (1000 - subtotal))}</strong> more for <strong className="text-brand-green">FREE Delivery</strong>!
                    </p>
                    <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-green h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((subtotal / (financialSummary.shippingResult?.freeShippingThreshold || 1000)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.cart.subtotal}</span>
                    <span>₹{subtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t.cart.discount} ({discount}%)</span>
                      <span>−₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.cart.deliveryCharge}</span>
                    <span className={delivery === 0 ? 'text-green-600 font-medium' : ''}>
                      {delivery === 0 ? t.cart.freeDelivery : `₹${delivery}`}
                    </span>
                  </div>
                  {gstAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>GST ({gstRate}%)</span>
                      <span>+₹{gstAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2 mt-2">
                    <span>{t.cart.total}</span>
                    <span className="text-brand-green">₹{total}</span>
                  </div>
                </div>

                {!stockValidation.isValid && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    <p className="font-bold mb-1">⚠️ Stock limit exceeded:</p>
                    {stockValidation.issues.map((iss, i) => (
                      <p key={i}>
                        • {iss.name} ({iss.weight}): only {iss.available} available (in cart: {iss.requested})
                      </p>
                    ))}
                    <p className="mt-1 text-[11px] text-red-600 font-medium">Please reduce quantity to proceed.</p>
                  </div>
                )}

                {stockValidation.isValid ? (
                  <Link
                    to="/checkout"
                    onClick={closeCart}
                    className="block w-full mt-4 bg-brand-green text-white text-center py-3.5 rounded-xl font-bold hover:bg-brand-green-dark transition-colors shadow-green-glow"
                  >
                    {t.cart.proceedToCheckout} →
                  </Link>
                ) : (
                  <button
                    disabled
                    className="block w-full mt-4 bg-gray-200 text-gray-500 text-center py-3.5 rounded-xl font-bold cursor-not-allowed"
                  >
                    Adjust Cart to Proceed
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
