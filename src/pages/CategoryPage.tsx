// ============================================================
// Category Page
// ============================================================
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useLanguageStore } from '@/hooks/useStore';
import { useProductStore } from '@/hooks/useProductStore';
import { translations } from '@/i18n/translations';
import { getCategoryBySlug } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import AppImage from '@/components/common/AppImage';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguageStore();
  const { products: allProducts } = useProductStore();
  const t = translations[language];

  const category = getCategoryBySlug(slug ?? '');
  const products = allProducts.filter((p) => p.category === slug && p.is_active);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Category not found</p>
          <Link to="/products" className="text-brand-green font-semibold hover:underline">
            ← All Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      {/* Hero */}
      <div className="relative h-48 overflow-hidden">
        <AppImage
          src={category.image}
          alt={category.name_en}
          className="w-full h-full object-cover"
          containerClassName="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/products" className="hover:text-white">Products</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{category.name_en}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{category.icon}</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">
                {language === 'te' ? category.name_te : category.name_en}
              </h1>
              <p className="text-white/80 text-sm">{category.description_en}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{products.length} products found</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{category.icon}</p>
            <p className="text-gray-500">No products in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
