// ============================================================
// Global State Management with Zustand
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/i18n/translations';
import type { Product, ProductVariant } from '@/data/products';
import { useProductStore, type CouponItem } from './useProductStore';
import { useSettingsStore } from './useSettingsStore';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { calculateOrderFinancials, type OrderFinancialSummary } from '@/services/orderCalculationService';
import { calculateLinePrice } from '@/services/productPricingService';

// ─── Cart Types ───────────────────────────────────────────────
export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

// ─── Cart Store ───────────────────────────────────────────────
interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  discount: number;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => { success: boolean; addedQty: number; message?: string };
  removeItem: (productId: string, weight: string) => void;
  updateQuantity: (productId: string, weight: string, quantity: number) => { success: boolean; newQty: number; message?: string };
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  validateCartStock: () => {
    isValid: boolean;
    issues: Array<{ name: string; weight: string; requested: number; available: number }>;
  };
  getFinancialSummary: () => OrderFinancialSummary;
  getSubtotal: () => number;
  getDeliveryCharge: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      discount: 0,

      addItem: (product, variant, quantity = 1) => {
        const liveProducts = useProductStore.getState().products;
        const liveProduct = liveProducts.find((p) => p.id === product.id || p.slug === product.slug);
        const liveVariant = liveProduct?.variants.find((v) => v.weight === variant.weight) || variant;
        const availableStock = liveVariant.stock ?? 0;

        if (availableStock <= 0) {
          return {
            success: false,
            addedQty: 0,
            message: `${product.name_en} (${variant.weight}) is out of stock.`,
          };
        }

        let addedQty = 0;
        let success = true;
        let message = '';

        set((state) => {
          const existing = state.items.find(
            (i) => (i.product.id === product.id || i.product.slug === product.slug) && i.variant.weight === variant.weight
          );

          if (existing) {
            const desiredQty = existing.quantity + quantity;
            const cappedQty = Math.min(desiredQty, availableStock);
            addedQty = cappedQty - existing.quantity;

            if (desiredQty > availableStock) {
              message = `Only ${availableStock} available in stock. Cart updated to maximum available.`;
            }

            return {
              items: state.items.map((i) =>
                (i.product.id === product.id || i.product.slug === product.slug) && i.variant.weight === variant.weight
                  ? { ...i, variant: liveVariant, quantity: cappedQty }
                  : i
              ),
            };
          }

          const cappedQty = Math.min(quantity, availableStock);
          addedQty = cappedQty;
          if (quantity > availableStock) {
            message = `Only ${availableStock} available in stock. Added maximum available.`;
          }
          return { items: [...state.items, { product: liveProduct || product, variant: liveVariant, quantity: cappedQty }] };
        });

        return { success, addedQty, message };
      },

      removeItem: (productId, weight) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !((i.product.id === productId || i.product.slug === productId) && i.variant.weight === weight)
          ),
        }));
      },

      updateQuantity: (productId, weight, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, weight);
          return { success: true, newQty: 0 };
        }

        const liveProducts = useProductStore.getState().products;
        const liveProduct = liveProducts.find((p) => p.id === productId || p.slug === productId);
        const liveVariant = liveProduct?.variants.find((v) => v.weight === weight);
        const availableStock = liveVariant?.stock ?? 999;

        const cappedQty = Math.min(quantity, availableStock);
        let message = '';
        if (quantity > availableStock) {
          message = `Only ${availableStock} packs available in stock.`;
        }

        set((state) => ({
          items: state.items.map((i) =>
            (i.product.id === productId || i.product.slug === productId) && i.variant.weight === weight
              ? { ...i, quantity: cappedQty }
              : i
          ),
        }));

        return { success: true, newQty: cappedQty, message };
      },

      validateCartStock: () => {
        const liveProducts = useProductStore.getState().products;
        const issues: Array<{ name: string; weight: string; requested: number; available: number }> = [];

        for (const item of get().items) {
          const liveProduct = liveProducts.find(
            (p) => p.id === item.product.id || p.slug === item.product.slug
          );
          const liveVariant =
            liveProduct?.variants.find((v) => v.weight === item.variant.weight) || item.variant;
          const availableStock = Math.max(0, liveVariant?.stock ?? 0);

          if (item.quantity > availableStock) {
            issues.push({
              name: item.product.name_en,
              weight: item.variant.weight,
              requested: item.quantity,
              available: availableStock,
            });
          }
        }

        return {
          isValid: issues.length === 0,
          issues,
        };
      },

      clearCart: () => set({ items: [], couponCode: '', discount: 0 }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      applyCoupon: async (code) => {
        const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
        (get() as any)._lastCouponError = '';

        // Handle explicit clear
        if (!cleanCode || cleanCode === '__CLEAR__') {
          set({ couponCode: '', discount: 0 });
          return true;
        }

        const currentSubtotal = get().getSubtotal();

        // 1. Check Announcement Banner Coupon
        const ann = useProductStore.getState().announcement;
        if (
          ann &&
          ann.enabled &&
          ann.couponCode &&
          ann.couponCode.trim().toUpperCase().replace(/\s+/g, '') === cleanCode
        ) {
          if (ann.minOrderValue > 0 && currentSubtotal < ann.minOrderValue) {
            (get() as any)._lastCouponError = `Minimum order of ₹${ann.minOrderValue} required for ${cleanCode}. (Cart: ₹${currentSubtotal})`;
            return false;
          }
          set({
            couponCode: ann.couponCode.toUpperCase(),
            discount: ann.discountPercent,
          });
          return true;
        }

        // 2. Check dynamic coupons from store (synced from Supabase / cached)
        const dynamicCoupon = useProductStore.getState().getValidCoupon(cleanCode);
        if (dynamicCoupon) {
          if (dynamicCoupon.minOrder > 0 && currentSubtotal < dynamicCoupon.minOrder) {
            (get() as any)._lastCouponError = `Minimum order of ₹${dynamicCoupon.minOrder} required for ${dynamicCoupon.code}. (Cart: ₹${currentSubtotal})`;
            return false;
          }
          set({
            couponCode: dynamicCoupon.code,
            discount: dynamicCoupon.discountPercent,
          });
          return true;
        }

        // 3. Fallback built-in coupons
        const builtInCoupons: Record<string, { discount: number; minOrder: number }> = {
          'AMMA10': { discount: 10, minOrder: 0 },
          'SWAGRUHA15': { discount: 15, minOrder: 499 },
          'WELCOME20': { discount: 20, minOrder: 799 },
          'TELUGU5': { discount: 5, minOrder: 0 },
          'FESTIVE15': { discount: 15, minOrder: 0 },
          'SPECIAL10': { discount: 10, minOrder: 0 },
          'SWAGRUHA': { discount: 10, minOrder: 0 },
          'SAVE10': { discount: 10, minOrder: 0 },
          'SAVE15': { discount: 15, minOrder: 0 },
          'SAVE20': { discount: 20, minOrder: 0 },
          'UGADI20': { discount: 20, minOrder: 999 },
        };

        const found = builtInCoupons[cleanCode];
        if (found) {
          if (found.minOrder > 0 && currentSubtotal < found.minOrder) {
            (get() as any)._lastCouponError = `Minimum order of ₹${found.minOrder} required for ${cleanCode}. (Cart: ₹${currentSubtotal})`;
            return false;
          }
          set({ couponCode: cleanCode, discount: found.discount });
          return true;
        }

        // 4. Live Supabase Cloud DB Query (fetches newly created admin coupons immediately)
        if (isSupabaseConfigured()) {
          try {
            const { data: cloudCoupon, error } = await supabase
              .from('coupons')
              .select('*')
              .ilike('code', cleanCode)
              .maybeSingle();

            if (!error && cloudCoupon) {
              const newC: CouponItem = {
                id: cloudCoupon.id,
                code: cloudCoupon.code,
                discountPercent: Number(cloudCoupon.discount_percent),
                description: cloudCoupon.description,
                minOrder: Number(cloudCoupon.min_order || 0),
                isActive: Boolean(cloudCoupon.is_active),
                expiresAt: cloudCoupon.expires_at || undefined,
                usageCount: Number(cloudCoupon.usage_count || 0),
              };

              // Cache in local store
              useProductStore.setState((s) => ({
                coupons: [newC, ...s.coupons.filter((c) => c.code !== newC.code)],
              }));

              if (!newC.isActive) {
                (get() as any)._lastCouponError = `Coupon code "${cleanCode}" is disabled or inactive.`;
                return false;
              }

              if (newC.expiresAt && !isNaN(new Date(newC.expiresAt).getTime()) && new Date(newC.expiresAt) < new Date()) {
                (get() as any)._lastCouponError = `Coupon code "${cleanCode}" has expired.`;
                return false;
              }

              if (newC.minOrder > 0 && currentSubtotal < newC.minOrder) {
                (get() as any)._lastCouponError = `Minimum order of ₹${newC.minOrder} required for ${newC.code}. (Cart: ₹${currentSubtotal})`;
                return false;
              }

              set({
                couponCode: newC.code,
                discount: newC.discountPercent,
              });
              return true;
            }
          } catch (dbErr) {
            console.warn('Direct coupon cloud lookup exception:', dbErr);
          }
        }

        (get() as any)._lastCouponError = `Invalid or expired coupon code "${cleanCode}".`;
        return false;
      },

      getFinancialSummary: () => {
        const rawItems = get().items.map((it) => {
          const calc = calculateLinePrice(it.product, it.variant, it.quantity);
          return {
            product_id: it.product.id,
            unit_price: calc.unitPrice,
            quantity: it.quantity,
            total_price: calc.totalPrice,
          };
        });
        const rawSubtotal = rawItems.reduce((s, it) => s + it.total_price, 0);
        const shippingCharge = rawSubtotal >= 499 || rawSubtotal === 0 ? 0 : 60;
        const taxConfig = useSettingsStore.getState().settings.tax;

        return calculateOrderFinancials({
          items: rawItems,
          couponDiscountPercent: get().discount,
          shippingCharge,
          taxConfig,
        });
      },

      getSubtotal: () => {
        return get().getFinancialSummary().originalSubtotal;
      },

      getDeliveryCharge: () => {
        return get().getFinancialSummary().shippingAmount;
      },

      getTotal: () => {
        return get().getFinancialSummary().grandTotal;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'ssf-cart',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        discount: state.discount,
      }),
    }
  )
);

// ─── Language Store ───────────────────────────────────────────
interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggle: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      toggle: () => set({ language: get().language === 'en' ? 'te' : 'en' }),
    }),
    { name: 'ssf-language' }
  )
);

// ─── Auth Store ───────────────────────────────────────────────
interface AuthStore {
  isAdmin: boolean;
  userEmail: string | null;
  setAdmin: (isAdmin: boolean, email?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAdmin: false,
      userEmail: null,
      setAdmin: (isAdmin, email) => set({ isAdmin, userEmail: email ?? null }),
      logout: () => set({ isAdmin: false, userEmail: null }),
    }),
    { name: 'ssf-auth' }
  )
);

// ─── UI Store ─────────────────────────────────────────────────
interface UIStore {
  searchQuery: string;
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  setSearchQuery: (q: string) => void;
  toggleSearch: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  searchQuery: '',
  searchOpen: false,
  mobileMenuOpen: false,
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}));
