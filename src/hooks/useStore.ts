// ============================================================
// Global State Management with Zustand
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/i18n/translations';
import type { Product, ProductVariant } from '@/data/products';
import { useProductStore } from './useProductStore';

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
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, weight: string) => void;
  updateQuantity: (productId: string, weight: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (code: string) => boolean;
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
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.variant.weight === variant.weight
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id && i.variant.weight === variant.weight
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, variant, quantity }] };
        });
      },

      removeItem: (productId, weight) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product.id === productId && i.variant.weight === weight)
          ),
        }));
      },

      updateQuantity: (productId, weight, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, weight);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId && i.variant.weight === weight
              ? { ...i, quantity }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [], couponCode: '', discount: 0 }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      applyCoupon: (code) => {
        const cleanCode = code.trim().toUpperCase();
        // Check dynamic coupons from admin catalog store first
        const dynamicCoupon = useProductStore.getState().getValidCoupon(cleanCode);
        if (dynamicCoupon) {
          set({ couponCode: dynamicCoupon.code, discount: dynamicCoupon.discountPercent });
          return true;
        }

        const validCoupons: Record<string, number> = {
          'AMMA10': 10,
          'SWAGRUHA15': 15,
          'WELCOME20': 20,
          'TELUGU5': 5,
        };
        const discount = validCoupons[cleanCode];
        if (discount) {
          set({ couponCode: cleanCode, discount });
          return true;
        }
        return false;
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.variant.price * item.quantity,
          0
        );
      },

      getDeliveryCharge: () => {
        const subtotal = get().getSubtotal();
        return subtotal >= 499 ? 0 : 60;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const delivery = get().getDeliveryCharge();
        const discount = get().discount;
        const discountAmount = Math.floor((subtotal * discount) / 100);
        return subtotal + delivery - discountAmount;
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
