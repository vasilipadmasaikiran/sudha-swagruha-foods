// ============================================================
// Product Card Component
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useCartStore, useLanguageStore } from '@/hooks/useStore';
import { translations } from '@/i18n/translations';
import type { Product } from '@/data/products';
import AppImage from '@/components/common/AppImage';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const { addItem } = useCartStore();
  const { language } = useLanguageStore();
  const t = translations[language];

  const selectedVariant = product.variants[selectedVariantIdx];
  const isOutOfStock = selectedVariant.stock === 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    addItem(product, selectedVariant);
    toast.success(
      `${language === 'te' ? product.name_te : product.name_en} కార్ట్‌లోకి చేర్చబడింది!`,
      {
        icon: '🛒',
        style: {
          borderLeft: '4px solid #2F6B3B',
        },
      }
    );
  };

  const badgeConfig = {
    new: { label: t.common.new, class: 'bg-blue-500' },
    hot: { label: t.common.hot, class: 'badge-hot' },
    bestseller: { label: t.common.bestSeller, class: 'badge-new' },
  };

  const badge = product.badge ? badgeConfig[product.badge] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="product-card bg-white rounded-2xl overflow-hidden shadow-card"
    >
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative overflow-hidden bg-brand-light-green h-52">
          <AppImage
            src={product.images?.[0]}
            alt={product.name_en}
            className="w-full h-52 object-cover transition-transform duration-500 hover:scale-105"
            containerClassName="w-full h-52"
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {badge && (
              <span
                className={`${badge.class} text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide`}
              >
                {badge.label}
              </span>
            )}
            {product.is_demo && (
              <span className="bg-yellow-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                Demo
              </span>
            )}
          </div>

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-full">
                {t.products.outOfStock}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-base leading-tight mb-0.5">
            {language === 'te' ? product.name_te : product.name_en}
          </h3>
          {language === 'en' && product.name_te && (
            <p
              className="text-xs text-gray-500 mb-2"
              style={{ fontFamily: 'Noto Sans Telugu, sans-serif' }}
            >
              {product.name_te}
            </p>
          )}

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.rating!)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {product.rating} ({product.reviewCount})
              </span>
            </div>
          )}

          {/* Weight Variants */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {product.variants.map((variant, idx) => (
              <button
                key={variant.weight}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedVariantIdx(idx);
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  selectedVariantIdx === idx
                    ? 'bg-brand-green text-white border-brand-green'
                    : 'border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'
                }`}
              >
                {variant.weight}
              </button>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-bold text-brand-green">
              ₹{selectedVariant.price}
            </span>
            {selectedVariant.comparePrice && (
              <span className="text-sm text-gray-400 line-through">
                ₹{selectedVariant.comparePrice}
              </span>
            )}
            {selectedVariant.comparePrice && (
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">
                {Math.round(
                  ((selectedVariant.comparePrice - selectedVariant.price) /
                    selectedVariant.comparePrice) *
                    100
                )}% off
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-brand-light-green text-brand-green hover:bg-brand-green hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          {t.products.addToCart}
        </button>
        <Link
          to={`/products/${product.slug}`}
          className="flex items-center justify-center gap-1 px-3 py-2.5 bg-brand-red text-white rounded-xl text-sm font-semibold hover:bg-brand-red-dark transition-colors"
        >
          <Zap className="w-4 h-4" />
          {t.products.buyNow}
        </Link>
      </div>
    </motion.div>
  );
}
