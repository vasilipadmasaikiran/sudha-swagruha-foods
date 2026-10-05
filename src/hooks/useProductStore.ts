// ============================================================
// Product & Admin Store with Zustand + LocalStorage Persistence
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sampleProducts, type Product, type ProductVariant } from '@/data/products';
import { productService } from '@/services/supabase';

export interface DiscountAnnouncement {
  id: string;
  enabled: boolean;
  tag: string;
  headline: string;
  headline_te?: string;
  couponCode: string;
  discountPercent: number;
  minOrderValue: number;
  linkUrl: string;
  linkText: string;
  theme: 'crimson' | 'emerald' | 'amber' | 'charcoal' | 'purple';
  showCountdown?: boolean;
}

export interface CouponItem {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  minOrder: number;
  isActive: boolean;
  expiresAt?: string;
  usageCount: number;
}

interface ProductStore {
  products: Product[];
  announcement: DiscountAnnouncement;
  coupons: CouponItem[];
  isLoading: boolean;
  error: string | null;

  // Product Actions
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductActive: (id: string) => void;
  updateVariantPrice: (
    productId: string,
    variantIndex: number,
    price: number,
    comparePrice?: number,
    stock?: number
  ) => void;
  resetToDefaults: () => void;

  // Announcement Actions
  updateAnnouncement: (updates: Partial<DiscountAnnouncement>) => void;
  toggleAnnouncement: (enabled?: boolean) => void;

  // Coupon Actions
  addCoupon: (coupon: Omit<CouponItem, 'id' | 'usageCount'>) => void;
  updateCoupon: (id: string, updates: Partial<CouponItem>) => void;
  deleteCoupon: (id: string) => void;
  toggleCoupon: (id: string) => void;
  getValidCoupon: (code: string) => CouponItem | undefined;
}

const defaultAnnouncement: DiscountAnnouncement = {
  id: 'ann-1',
  enabled: true,
  tag: 'FESTIVE SPECIAL',
  headline: 'Flat 15% OFF on Authentic Andhra Pickles & Podis! Free delivery above ₹499',
  headline_te: 'అన్ని ఆంధ్ర ఊరగాయలు & పొడులపై 15% ప్రత్యేక తగ్గింపు!',
  couponCode: 'SWAGRUHA15',
  discountPercent: 15,
  minOrderValue: 499,
  linkUrl: '/products',
  linkText: 'Order Now',
  theme: 'crimson',
  showCountdown: false,
};

const defaultCoupons: CouponItem[] = [
  {
    id: 'c-1',
    code: 'AMMA10',
    discountPercent: 10,
    description: '10% OFF on all homemade delicacies',
    minOrder: 0,
    isActive: true,
    usageCount: 28,
  },
  {
    id: 'c-2',
    code: 'SWAGRUHA15',
    discountPercent: 15,
    description: 'Special 15% OFF festive announcement offer',
    minOrder: 499,
    isActive: true,
    usageCount: 42,
  },
  {
    id: 'c-3',
    code: 'WELCOME20',
    discountPercent: 20,
    description: '20% OFF for first-time orders',
    minOrder: 799,
    isActive: true,
    usageCount: 15,
  },
  {
    id: 'c-4',
    code: 'TELUGU5',
    discountPercent: 5,
    description: 'Flat 5% OFF on instant cart checkout',
    minOrder: 0,
    isActive: true,
    usageCount: 67,
  },
];

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: sampleProducts,
      announcement: defaultAnnouncement,
      coupons: defaultCoupons,
      isLoading: false,
      error: null,

      fetchProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          const dbProducts = await productService.getAll();
          const mappedProducts: Product[] = dbProducts.map(dbP => ({
            id: dbP.id,
            slug: dbP.slug,
            name_en: dbP.name_en,
            name_te: dbP.name_te,
            description_en: dbP.description_en,
            description_te: dbP.description_te,
            category: dbP.category as any,
            images: dbP.images,
            ingredients_en: dbP.ingredients_en,
            ingredients_te: dbP.ingredients_te,
            is_active: dbP.is_active,
            is_demo: false,
            created_at: dbP.created_at,
            variants: [{
              weight: dbP.weight,
              price: dbP.price,
              comparePrice: dbP.compare_price || undefined,
              stock: dbP.stock,
              sku: dbP.sku
            }]
          }));
          set({ products: mappedProducts, isLoading: false });
        } catch (err: any) {
          console.error('Failed to fetch products:', err);
          set({ error: err.message, isLoading: false });
        }
      },

      addProduct: (newProductData) => {
        const id = `prod-${Date.now()}`;
        const newProduct: Product = {
          ...newProductData,
          id,
          created_at: new Date().toISOString().split('T')[0],
        };

        set((state) => ({
          products: [newProduct, ...state.products],
        }));

        return newProduct;
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      toggleProductActive: (id) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, is_active: !p.is_active } : p
          ),
        }));
      },

      updateVariantPrice: (productId, variantIndex, price, comparePrice, stock) => {
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id !== productId) return p;
            const updatedVariants = [...p.variants];
            if (updatedVariants[variantIndex]) {
              updatedVariants[variantIndex] = {
                ...updatedVariants[variantIndex],
                price,
                ...(comparePrice !== undefined ? { comparePrice } : {}),
                ...(stock !== undefined ? { stock } : {}),
              };
            }
            return { ...p, variants: updatedVariants };
          }),
        }));
      },

      resetToDefaults: () => {
        set({
          products: sampleProducts,
          announcement: defaultAnnouncement,
          coupons: defaultCoupons,
        });
      },

      updateAnnouncement: (updates) => {
        set((state) => ({
          announcement: { ...state.announcement, ...updates },
        }));
      },

      toggleAnnouncement: (enabled) => {
        set((state) => ({
          announcement: {
            ...state.announcement,
            enabled: enabled !== undefined ? enabled : !state.announcement.enabled,
          },
        }));
      },

      addCoupon: (couponData) => {
        const newCoupon: CouponItem = {
          ...couponData,
          id: `coup-${Date.now()}`,
          usageCount: 0,
        };
        set((state) => ({
          coupons: [newCoupon, ...state.coupons],
        }));
      },

      updateCoupon: (id, updates) => {
        set((state) => ({
          coupons: state.coupons.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCoupon: (id) => {
        set((state) => ({
          coupons: state.coupons.filter((c) => c.id !== id),
        }));
      },

      toggleCoupon: (id) => {
        set((state) => ({
          coupons: state.coupons.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          ),
        }));
      },

      getValidCoupon: (code) => {
        const clean = code.trim().toUpperCase();
        return get().coupons.find(
          (c) => c.code.toUpperCase() === clean && c.isActive
        );
      },
    }),
    {
      name: 'ssf-catalog-store',
      partialize: (state) => ({
        products: state.products,
        announcement: state.announcement,
        coupons: state.coupons,
      }),
    }
  )
);
