// ============================================================
// Checkout Page with Razorpay Integration
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore, useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';

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
  const { items, getSubtotal, getDeliveryCharge, getTotal, clearCart, discount } = useCartStore();
  const [processing, setProcessing] = useState(false);
  const [sameAsPhone, setSameAsPhone] = useState(true);

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

  const onSubmit = async (data: CheckoutForm) => {
    setProcessing(true);
    toast.loading(t.payment.processing);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKeyId || razorpayKeyId === 'rzp_test_xxxxxxxxxx') {
        // Demo mode - skip actual payment
        toast.dismiss();
        toast.success('Demo mode: Payment simulated!');
        clearCart();
        navigate('/order-success', {
          state: {
            orderNumber: `SSF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DEMO`,
            customerName: data.name,
            total,
            paymentStatus: 'demo',
            address: `${data.city}, ${data.state} – ${data.pincode}`,
          },
        });
        return;
      }

      // In production: call Supabase Edge Function to create Razorpay order
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const createOrderResponse = await fetch(`${supabaseUrl}/functions/v1/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          amount: total,
          currency: 'INR',
          customer: {
            name: data.name,
            mobile: data.mobile,
            whatsapp: sameAsPhone ? data.mobile : data.whatsapp,
            email: data.email,
          },
          items: items.map((item) => ({
            product_id: item.product.id,
            product_name_en: item.product.name_en,
            product_name_te: item.product.name_te,
            weight: item.variant.weight,
            quantity: item.quantity,
            unit_price: item.variant.price,
            total_price: item.variant.price * item.quantity,
            sku: item.variant.sku,
          })),
          address: {
            house_no: data.house_no,
            street: data.street,
            area: data.area,
            city: data.city,
            district: data.district,
            state: data.state,
            pincode: data.pincode,
          },
        }),
      });

      const { razorpay_order_id, amount: orderAmount } = await createOrderResponse.json();

      toast.dismiss();

      const options = {
        key: razorpayKeyId,
        amount: orderAmount,
        currency: 'INR',
        name: 'Sudha Swagruha Foods',
        description: 'Authentic Telugu Food Products',
        order_id: razorpay_order_id,
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
          toast.loading(t.payment.verifying);
          try {
            // Verify payment server-side
            const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const { success, order_number } = await verifyResponse.json();
            toast.dismiss();

            if (success) {
              clearCart();
              navigate('/order-success', {
                state: {
                  orderNumber: order_number,
                  customerName: data.name,
                  total,
                  paymentStatus: 'paid',
                  address: `${data.city}, ${data.state} – ${data.pincode}`,
                },
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch {
            toast.dismiss();
            toast.error(t.payment.failed);
            setProcessing(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.dismiss();
      toast.error(t.payment.failed);
      console.error(err);
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
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-white">{t.checkout.title}</h1>
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
                  <span className="w-7 h-7 bg-brand-green text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  {t.checkout.personalInfo}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.checkout.name} *</label>
                    <input {...register('name')} className={inputClass} placeholder="Ravi Kumar" />
                    {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.mobile} *</label>
                    <input {...register('mobile')} className={inputClass} placeholder="9876543210" type="tel" maxLength={10} />
                    {errors.mobile && <p className={errorClass}>{errors.mobile.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.whatsapp}</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={sameAsPhone}
                          onChange={(e) => setSameAsPhone(e.target.checked)}
                          className="rounded"
                        />
                        {t.checkout.whatsappSame}
                      </label>
                      {!sameAsPhone && (
                        <input
                          {...register('whatsapp')}
                          className={inputClass}
                          placeholder="9876543210"
                          type="tel"
                          maxLength={10}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.email}</label>
                    <input {...register('email')} className={inputClass} placeholder="ravi@example.com" type="email" />
                    {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="font-bold text-lg text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 bg-brand-green text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  {t.checkout.deliveryAddress}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.checkout.houseNo} *</label>
                    <input {...register('house_no')} className={inputClass} placeholder="Flat 3B, Sai Towers" />
                    {errors.house_no && <p className={errorClass}>{errors.house_no.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.street} *</label>
                    <input {...register('street')} className={inputClass} placeholder="MG Road" />
                    {errors.street && <p className={errorClass}>{errors.street.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.area} *</label>
                    <input {...register('area')} className={inputClass} placeholder="Banjara Hills" />
                    {errors.area && <p className={errorClass}>{errors.area.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.city} *</label>
                    <input {...register('city')} className={inputClass} placeholder="Hyderabad" />
                    {errors.city && <p className={errorClass}>{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.district} *</label>
                    <input {...register('district')} className={inputClass} placeholder="Hyderabad" />
                    {errors.district && <p className={errorClass}>{errors.district.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.state} *</label>
                    <input {...register('state')} className={inputClass} placeholder="Andhra Pradesh" />
                    {errors.state && <p className={errorClass}>{errors.state.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t.checkout.pincode} *</label>
                    <input {...register('pincode')} className={inputClass} placeholder="500001" maxLength={6} />
                    {errors.pincode && <p className={errorClass}>{errors.pincode.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Right: Order Summary ─── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-card p-6 sticky top-20">
                <h2 className="font-bold text-lg text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 bg-brand-green text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  {t.checkout.orderSummary}
                </h2>

                <div className="space-y-3 mb-5">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${item.variant.weight}`} className="flex gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name_en}
                        className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 leading-tight">
                          {item.product.name_en}
                        </p>
                        <p className="text-xs text-gray-500">{item.variant.weight} × {item.quantity}</p>
                        <p className="text-sm font-bold text-brand-green">
                          ₹{item.variant.price * item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.cart.subtotal}</span>
                    <span>₹{subtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t.cart.discount}</span>
                      <span>−₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.cart.deliveryCharge}</span>
                    <span className={delivery === 0 ? 'text-green-600 font-medium' : ''}>
                      {delivery === 0 ? t.cart.freeDelivery : `₹${delivery}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-3 mt-2">
                    <span>{t.cart.total}</span>
                    <span className="text-brand-green">₹{total}</span>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center gap-2 mt-4 mb-5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <ShieldCheck className="w-4 h-4 text-brand-green flex-shrink-0" />
                  Payments secured by Razorpay
                </div>

                <motion.button
                  type="submit"
                  disabled={processing}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-brand-green text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors shadow-green-glow disabled:opacity-60"
                >
                  {processing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <>{t.checkout.payWithRazorpay} <ChevronRight className="w-5 h-5" /></>
                  )}
                </motion.button>

                <p className="text-xs text-gray-400 text-center mt-3">
                  By placing this order, you agree to our terms and conditions.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
