// ============================================================
// Product Detail Page
// ============================================================
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Zap, Star, ChevronLeft, Share2, Shield,
  Truck, RotateCcw, Info, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useCartStore, useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';
import { getProductBySlug, sampleProducts } from '@/data/products';
import ProductCard from '@/components/ProductCard';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const t = translations[language];
  const { addItem } = useCartStore();

  const product = getProductBySlug(slug ?? '');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'ingredients' | 'reviews'>('description');

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <div className="text-center">
          <p className="text-6xl mb-4">🫙</p>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Product not found</h2>
          <Link to="/products" className="text-brand-green font-semibold hover:underline">
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const variant = product.variants[selectedVariantIdx];
  const isOutOfStock = variant.stock === 0;
  const discount = variant.comparePrice
    ? Math.round(((variant.comparePrice - variant.price) / variant.comparePrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) {
      addItem(product, variant);
    }
    toast.success(`${quantity}× ${product.name_en} added to cart!`, { icon: '🛒' });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const related = sampleProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-brand-green transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/products" className="hover:text-brand-green transition-colors">Products</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate max-w-40">{product.name_en}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-brand-green transition-colors mb-6 text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-10 mb-16">
          {/* ─── Images ─── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="rounded-2xl overflow-hidden bg-white shadow-card mb-3 aspect-square">
              <img
                src={product.images[selectedImage]}
                alt={product.name_en}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === i ? 'border-brand-green' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ─── Details ─── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Demo Badge */}
            {product.is_demo && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-3 py-2 text-sm">
                <Info className="w-4 h-4 flex-shrink-0" />
                {t.products.demoNotice}
              </div>
            )}

            {/* Name */}
            <div>
              <h1 className="font-display text-3xl font-bold text-gray-900">
                {language === 'te' ? product.name_te : product.name_en}
              </h1>
              {language === 'en' && (
                <p
                  className="text-lg text-gray-500 mt-1"
                  style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
                >
                  {product.name_te}
                </p>
              )}
            </div>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating!)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-200 fill-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600 text-sm font-medium">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-brand-green">₹{variant.price}</span>
              {variant.comparePrice && (
                <span className="text-2xl text-gray-400 line-through">₹{variant.comparePrice}</span>
              )}
              {discount > 0 && (
                <span className="bg-green-100 text-green-700 font-bold text-sm px-3 py-1 rounded-full">
                  {discount}% OFF
                </span>
              )}
            </div>

            {/* Weight Selector */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t.products.selectWeight}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v, i) => (
                  <button
                    key={v.weight}
                    onClick={() => setSelectedVariantIdx(i)}
                    className={`px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                      selectedVariantIdx === i
                        ? 'bg-brand-green text-white border-brand-green shadow-green-glow'
                        : 'border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'
                    }`}
                  >
                    {v.weight}
                    <span className="ml-2 text-xs opacity-75">₹{v.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t.products.quantity}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors font-bold text-lg text-gray-600"
                  >
                    −
                  </button>
                  <span className="px-5 font-bold text-lg text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(variant.stock, quantity + 1))}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors font-bold text-lg text-gray-600"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {variant.stock > 0
                    ? `${variant.stock} available`
                    : t.products.outOfStock}
                </span>
              </div>
            </div>

            {/* Subtotal */}
            <div className="bg-brand-light-green rounded-xl p-3 flex justify-between items-center">
              <span className="text-gray-700 font-medium">Subtotal ({quantity} items)</span>
              <span className="font-bold text-brand-green text-lg">₹{variant.price * quantity}</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all ${
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-light-green text-brand-green border-2 border-brand-green hover:bg-brand-green hover:text-white'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {t.products.addToCart}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all shadow-red-glow ${
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-red hover:bg-brand-red-dark text-white'
                }`}
              >
                <Zap className="w-5 h-5" />
                {t.products.buyNow}
              </button>
            </div>

            {/* Share */}
            <button
              onClick={() => {
                navigator.share?.({
                  title: product.name_en,
                  url: window.location.href,
                }).catch(() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied!');
                });
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-brand-green transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" /> {t.products.share}
            </button>

            {/* Trust Icons */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
              {[
                { icon: Shield, text: 'Secure Payment', sub: 'Razorpay' },
                { icon: Truck, text: 'Fast Delivery', sub: '3-5 days' },
                { icon: RotateCcw, text: 'Easy Returns', sub: '7 days' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center mb-1">
                    <item.icon className="w-5 h-5 text-brand-green" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">{item.text}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="bg-white rounded-2xl shadow-card mb-12">
          <div className="flex border-b border-gray-100">
            {(['description', 'ingredients', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-semibold capitalize transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-brand-green text-brand-green'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.products[tab as 'description' | 'ingredients' | 'reviews']}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'description' && (
              <p className="text-gray-600 leading-relaxed">
                {language === 'te' ? product.description_te : product.description_en}
              </p>
            )}
            {activeTab === 'ingredients' && (
              <div>
                <p className="font-semibold text-gray-800 mb-3">{t.products.ingredients}:</p>
                <p className="text-gray-600">
                  {language === 'te' ? product.ingredients_te : product.ingredients_en}
                </p>
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="text-center py-8 text-gray-400">
                <Star className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>{t.products.noReviews}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Related Products ─── */}
        {related.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
              You might also like
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
