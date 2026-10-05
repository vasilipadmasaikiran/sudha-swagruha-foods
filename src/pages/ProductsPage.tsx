// ============================================================
// Products Page
// ============================================================
import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/hooks/useStore';
import { useProductStore } from '@/hooks/useProductStore';
import { translations } from '@/i18n/translations';
import { categories } from '@/data/products';
import ProductCard from '@/components/ProductCard';

export default function ProductsPage() {
  const { language } = useLanguageStore();
  const { products } = useProductStore();
  const t = translations[language];
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  const filtered = useMemo(() => {
    let result = products.filter((p) => p.is_active);

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name_en.toLowerCase().includes(q) ||
          p.name_te.includes(search) ||
          p.description_en.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'price-low':
        return [...result].sort((a, b) => a.variants[0].price - b.variants[0].price);
      case 'price-high':
        return [...result].sort((a, b) => b.variants[0].price - a.variants[0].price);
      case 'newest':
        return [...result].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'rating':
        return [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default:
        return result;
    }
  }, [search, selectedCategory, sortBy]);

  return (
    <div className="page-enter min-h-screen bg-brand-cream">
      {/* Page Header */}
      <div className="bg-brand-green py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-4xl font-bold text-white mb-2"
          >
            {t.products.title}
          </motion.h1>
          <p className="text-green-200">{t.products.subtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t.nav.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-3 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-green text-sm"
            >
              <option value="default">{t.products.sortBy}</option>
              <option value="price-low">{t.products.sortPriceLow}</option>
              <option value="price-high">{t.products.sortPriceHigh}</option>
              <option value="newest">{t.products.sortNewest}</option>
              <option value="rating">{t.products.sortPopular}</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand-green text-white shadow-green-glow'
                : 'bg-white text-gray-600 hover:bg-brand-light-green hover:text-brand-green border border-gray-200'
            }`}
          >
            {t.common.all} ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedCategory === cat.slug
                  ? 'bg-brand-green text-white shadow-green-glow'
                  : 'bg-white text-gray-600 hover:bg-brand-light-green hover:text-brand-green border border-gray-200'
              }`}
            >
              {cat.icon}
              {language === 'te' ? cat.name_te : cat.name_en}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            {filtered.length} products found
            {selectedCategory !== 'all' && ` in "${selectedCategory}"`}
            {search && ` for "${search}"`}
          </p>
        </div>

        {/* Products Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-500 font-medium">{t.products.noProducts}</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="mt-4 text-brand-green font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
