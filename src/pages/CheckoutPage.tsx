// ============================================================
// Checkout Page - Dynamic Payment Gateway & WhatsApp Ordering
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Loader2,
  ShieldCheck,
  ChevronRight,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore, useLanguageStore } from '@/hooks/useStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { translations } from '@/i18n/translations';
import type { DbOrder } from '@/services/supabase';

// Razorpay type declaration
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

const checkoutSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  whatsapp: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit WhatsApp number').optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  house_no: z.string().min(1, 'House/Flat number is required'),
  street: z.string().min(3, 'Street is required'),
  area: z.string().min(2, 'Area is required'),
  city: z.string().min(2, 'City/Village is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const t = translations[language];
  const { items, getSubtotal, getDeliveryCharge, getTotal, clearCart, discount, couponCode, applyCoupon } = useCartStore();
  const { settings } = useSettingsStore();
  const { addOrder } = useOrderStore();

  const [processing, setProcessing] = useState(false);
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { state: 'Andhra Pradesh' },
  });

  const mobileValue = watch('mobile');
  const subtotal = getSubtotal();
  const delivery = getDeliveryCharge();
  const total = getTotal();
  const discountAmount = Math.floor((subtotal * discount) / 100);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-5xl mb-4">🛒</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t.cart.empty}</h2>
          <button
            onClick={() => navigate('/products')}
            className="mt-4 bg-brand-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors"
          >
            {t.cart.continueShopping}
          </button>
        </div>
      </div>
    );
  }

  // Generate unique order number
  const generateOrderNumber = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `SSF-${today}-${rand}`;
  };

  // Helper to build WhatsApp Messages
  const buildWhatsAppMessages = (
    orderNumber: string,
    data: CheckoutForm,
    customerWhatsApp: string,
    paymentStatusText: string
  ) => {
    const itemsFormatted = items
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.product.name_en}* (${it.variant.weight}) x ${it.quantity} = ₹${
            it.variant.price * it.quantity
          }`
      )
      .join('\n');

    // Message for Business Owner (8374634989)
    const ownerMsg =
      `🌿 *NEW ORDER RECEIVED - SUDHA SWAGRUHA FOODS* 🌿\n\n` +
      `📋 *Order ID:* ${orderNumber}\n` +
      `👤 *Customer:* ${data.name}\n` +
      `📱 *Mobile:* ${data.mobile}\n` +
      `💬 *WhatsApp:* ${customerWhatsApp}\n` +
      (data.email ? `✉️ *Email:* ${data.email}\n` : '') +
      `📍 *Delivery Address:*\n${data.house_no}, ${data.street}, ${data.area}, ${data.city}, ${data.district}, ${data.state} - ${data.pincode}\n\n` +
      `📦 *Items Placed:*\n${itemsFormatted}\n\n` +
      `💵 *Order Breakdown:*\n` +
      `• Subtotal: ₹${subtotal}\n` +
      (discountAmount > 0 ? `• Discount: -₹${discountAmount}\n` : '') +
      `• Delivery Charge: ${delivery === 0 ? 'FREE' : `₹${delivery}`}\n` +
      `• *Total Payable:* ₹${total}\n` +
      `💳 *Payment Method:* ${paymentStatusText}\n\n` +
      `Please process and confirm this order. 🙏`;

    // Message for Customer
    const customerMsg =
      `🌿 *SUDHA SWAGRUHA FOODS - ORDER CONFIRMATION* 🌿\n\n` +
      `నమస్కారం ${data.name}! 🙏 Thank you for your order with Sudha Swagruha Foods.\n\n` +
      `📋 *Order ID:* *${orderNumber}*\n\n` +
      `📦 *Items in your order:*\n${itemsFormatted}\n\n` +
      `💰 *Total Amount:* ₹${total}\n` +
      `🚚 *Delivery Address:* ${data.house_no}, ${data.street}, ${data.city}, ${data.state} - ${data.pincode}\n` +
      `⏳ *Status:* Placed & Preparing with Amma Chethi Prema! ❤️\n\n` +
      `🔍 You can track your order status anytime here:\n` +
      `${window.location.origin}/track-order?order=${orderNumber}\n\n` +
      `For any questions or changes, contact us directly at +91 ${settings.businessWhatsApp}.`;

    return { ownerMsg, customerMsg };
  };

  const handleCompleteOrder = async (
    data: CheckoutForm,
    orderNumber: string,
    paymentStatus: 'pending' | 'paid',
    paymentId: string | null = null,
    razorpayOrderId: string | null = null
  ) => {
    const customerWhatsApp = sameAsPhone ? data.mobile : data.whatsapp || data.mobile;
    const paymentStatusText =
      paymentStatus === 'paid' ? 'Paid Online via Razorpay' : 'Direct Order / Cash on Delivery';

    const { ownerMsg, customerMsg } = buildWhatsAppMessages(
      orderNumber,
      data,
      customerWhatsApp,
      paymentStatusText
    );

    // Create DB Order record
    const newOrder: DbOrder = {
      id: `order-${Date.now()}`,
      order_number: orderNumber,
      customer_id: null,
      items: items.map((it) => ({
        product_id: it.product.id,
        product_name_en: it.product.name_en,
        product_name_te: it.product.name_te,
        weight: it.variant.weight,
        quantity: it.quantity,
        unit_price: it.variant.price,
        total_price: it.variant.price * it.quantity,
        sku: it.variant.sku,
      })),
      subtotal,
      delivery_charge: delivery,
      discount: discountAmount,
      total,
      payment_status: paymentStatus,
      payment_id: paymentId,
      razorpay_order_id: razorpayOrderId,
      order_status: 'placed',
      delivery_address: {
        house_no: data.house_no,
        street: data.street,
        area: data.area,
        city: data.city,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
      },
      customer_name: data.name,
      customer_mobile: data.mobile,
      customer_whatsapp: customerWhatsApp,
      customer_email: data.email || null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save order in store (persisted in localStorage + Supabase sync)
    await addOrder(newOrder);

    // Clear cart
    clearCart();

    // Generate WhatsApp URLs
    const ownerUrl = `https://wa.me/91${settings.businessWhatsApp}?text=${encodeURIComponent(
      ownerMsg
    )}`;
    const customerUrl = `https://wa.me/91${customerWhatsApp}?text=${encodeURIComponent(
      customerMsg
    )}`;

    // Automatically trigger Business Owner WhatsApp
    try {
      window.open(ownerUrl, '_blank');
    } catch (e) {
      console.warn('Popup blocked for owner WhatsApp:', e);
    }

    toast.dismiss();
    toast.success('Order placed successfully!');

    // Navigate to Order Success page
    navigate('/order-success', {
      state: {
        orderNumber,
        customerName: data.name,
        customerMobile: data.mobile,
        customerWhatsapp: customerWhatsApp,
        total,
        paymentStatus,
        address: `${data.house_no}, ${data.street}, ${data.city}, ${data.state} – ${data.pincode}`,
        items: items.map((it) => ({
          name: it.product.name_en,
          name_te: it.product.name_te,
          weight: it.variant.weight,
          quantity: it.quantity,
          price: it.variant.price * it.quantity,
        })),
        ownerWhatsappUrl: ownerUrl,
        customerWhatsappUrl: customerUrl,
      },
    });
  };

  const onSubmit = async (data: CheckoutForm) => {
    setProcessing(true);

    const orderNumber = generateOrderNumber();

    // ─── Scenario A: Payment Method Disabled in Admin Console ─────────
    if (!settings.paymentGatewayEnabled) {
      toast.loading('Placing order and notifying WhatsApp...');
      await handleCompleteOrder(data, orderNumber, 'pending');
      setProcessing(false);
      return;
    }

    // ─── Scenario B: Payment Gateway Enabled in Admin Console ─────────
    toast.loading(t.payment.processing);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      const razorpayKeyId =
        settings.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

      if (
        settings.isTestMode ||
        !razorpayKeyId ||
        razorpayKeyId.includes('placeholder') ||
        razorpayKeyId === 'rzp_test_xxxxxxxxxx'
      ) {
        // Simulated / Demo Payment
        toast.dismiss();
        toast.success('Test Mode: Payment simulated successfully!');
        await handleCompleteOrder(
          data,
          orderNumber,
          'paid',
          `pay_test_${Date.now()}`,
          `order_test_${Date.now()}`
        );
        setProcessing(false);
        return;
      }

      // Live Razorpay options
      const options = {
        key: razorpayKeyId,
        amount: total * 100, // paise
        currency: 'INR',
        name: 'Sudha Swagruha Foods',
        description: 'Authentic Telugu Food Products',
        prefill: {
          name: data.name,
          contact: data.mobile,
          email: data.email || '',
        },
        theme: { color: '#2F6B3B' },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast.error(t.payment.cancelled);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          toast.dismiss();
          toast.success(t.payment.success);
          await handleCompleteOrder(
            data,
            orderNumber,
            'paid',
            response.razorpay_payment_id,
            response.razorpay_order_id
          );
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.dismiss();
      toast.error('Payment initialization error. Placing order via WhatsApp fallback.');
      await handleCompleteOrder(data, orderNumber, 'pending');
      setProcessing(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all text-sm';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';
  const errorClass = 'text-xs text-red-500 mt-1';

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      <div className="bg-brand-green py-8 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">{t.checkout.title}</h1>
            <p className="text-green-200 text-sm mt-1">
              Freshly prepared homemade authentic delicacies
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-medium">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Fast Delivery across India</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* ─── Left: Form ─── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Info */}
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="font-bold text-lg text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 bg-brand-green text-white rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  {t.checkout.personalInfo}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.checkout.name} *</label>
                    <input
                      {...register('name')}
                      className={inputClass}
                      placeholder="e.g. Ramesh Reddy"
                    />
                    {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.mobile} *</label>
                    <input
                      {...register('mobile')}
                      className={inputClass}
                      placeholder="8374634989"
                      type="tel"
                      maxLength={10}
                    />
                    {errors.mobile && <p className={errorClass}>{errors.mobile.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.whatsapp}</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sameAsPhone}
                          onChange={(e) => setSameAsPhone(e.target.checked)}
                          className="rounded text-brand-green focus:ring-brand-green"
                        />
                        {t.checkout.whatsappSame}
                      </label>
                      {!sameAsPhone && (
                        <input
                          {...register('whatsapp')}
                          className={inputClass}
                          placeholder="WhatsApp number"
                          type="tel"
                          maxLength={10}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.email}</label>
                    <input
                      {...register('email')}
                      className={inputClass}
                      placeholder="ramesh@example.com"
                      type="email"
                    />
                    {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="font-bold text-lg text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 bg-brand-green text-white rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  {t.checkout.deliveryAddress}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.checkout.houseNo} *</label>
                    <input
                      {...register('house_no')}
                      className={inputClass}
                      placeholder="Flat 3B, Sai Towers"
                    />
                    {errors.house_no && <p className={errorClass}>{errors.house_no.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.street} *</label>
                    <input
                      {...register('street')}
                      className={inputClass}
                      placeholder="MG Road / Main Bazaar"
                    />
                    {errors.street && <p className={errorClass}>{errors.street.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.area} *</label>
                    <input
                      {...register('area')}
                      className={inputClass}
                      placeholder="Benz Circle / Brodipet"
                    />
                    {errors.area && <p className={errorClass}>{errors.area.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.city} *</label>
                    <input
                      {...register('city')}
                      className={inputClass}
                      placeholder="Vijayawada / Hyderabad"
                    />
                    {errors.city && <p className={errorClass}>{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.district} *</label>
                    <input
                      {...register('district')}
                      className={inputClass}
                      placeholder="Krishna / Guntur"
                    />
                    {errors.district && <p className={errorClass}>{errors.district.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.state} *</label>
                    <input
                      {...register('state')}
                      className={inputClass}
                      placeholder="Andhra Pradesh"
                    />
                    {errors.state && <p className={errorClass}>{errors.state.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.pincode} *</label>
                    <input
                      {...register('pincode')}
                      className={inputClass}
                      placeholder="520010"
                      maxLength={6}
                    />
                    {errors.pincode && <p className={errorClass}>{errors.pincode.message}</p>}
                  </div>
                </div>
              </div>

              {/* Mode Information Card */}
              <div
                className={`p-5 rounded-2xl border ${
                  settings.paymentGatewayEnabled
                    ? 'bg-blue-50/70 border-blue-200'
                    : 'bg-emerald-50/80 border-emerald-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {settings.paymentGatewayEnabled ? (
                    <CreditCard className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm text-gray-900">
                      {settings.paymentGatewayEnabled
                        ? 'Online Payment Gateway Active'
                        : 'Direct WhatsApp Order Placement'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {settings.paymentGatewayEnabled
                        ? 'Pay securely with Razorpay (UPI, Google Pay, PhonePe, Cards, NetBanking).'
                        : `No advance payment required. When you place the order, your Order ID and items list will be automatically dispatched to Business WhatsApp (${settings.businessWhatsApp}) and your WhatsApp for instant confirmation.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Right: Order Summary ─── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-card p-6 sticky top-24 border border-gray-100">
                <h2 className="font-bold text-lg text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 bg-brand-green text-white rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  {t.checkout.orderSummary}
                </h2>

                <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={`${item.product.id}-${item.variant.weight}`}
                      className="flex gap-3 items-center py-2 border-b border-gray-50 last:border-0"
                    >
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name_en}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {item.product.name_en}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.variant.weight} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-brand-green">
                        ₹{item.variant.price * item.quantity}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── Coupon Code Section ── */}
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-brand-green" />
                    Have a coupon code?
                  </p>

                  {couponCode ? (
                    // Applied coupon badge
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700 tracking-wide">{couponCode}</span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{discount}% OFF</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          applyCoupon('__CLEAR__');
                          useCartStore.setState({ couponCode: '', discount: 0 });
                          setCouponInput('');
                          setCouponError('');
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
                        title="Remove coupon"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    // Coupon input row
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 text-sm uppercase tracking-wide"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const ok = applyCoupon(couponInput);
                            if (!ok) setCouponError('Invalid or expired coupon code.');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!couponInput.trim()) {
                            setCouponError('Please enter a coupon code.');
                            return;
                          }
                          const ok = applyCoupon(couponInput);
                          if (ok) {
                            setCouponError('');
                            const appliedDiscount = useCartStore.getState().discount;
                            toast.success(`Coupon "${couponInput}" applied! ${appliedDiscount}% off 🎉`);
                          } else {
                            setCouponError('Invalid or expired coupon code.');
                          }
                        }}
                        className="px-4 py-2 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-colors whitespace-nowrap"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {couponError}
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.cart.subtotal}</span>
                    <span>₹{subtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t.cart.discount} ({couponCode})</span>
                      <span>−₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.cart.deliveryCharge}</span>
                    <span className={delivery === 0 ? 'text-green-600 font-medium' : ''}>
                      {delivery === 0 ? t.cart.freeDelivery : `₹${delivery}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-3 mt-2">
                    <span>{t.cart.total}</span>
                    <span className="text-brand-green text-xl">₹{total}</span>
                  </div>
                </div>

                {/* WhatsApp Notification Indicator */}
                <div className="mt-4 mb-5 text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Instant WhatsApp Updates</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Order ID & details sent to Owner (+91 {settings.businessWhatsApp}) & Customer WhatsApp.
                  </p>
                </div>

                <motion.button
                  type="submit"
                  disabled={processing}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60 cursor-pointer ${
                    settings.paymentGatewayEnabled
                      ? 'bg-brand-green hover:bg-brand-green-dark text-white shadow-green-glow'
                      : 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-500/20'
                  }`}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Order...</span>
                    </>
                  ) : settings.paymentGatewayEnabled ? (
                    <>
                      <span>Pay ₹{total} via Razorpay</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      <span>Place Order via WhatsApp</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                <p className="text-[11px] text-gray-400 text-center mt-3">
                  By clicking Place Order, your order details will be securely recorded.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
