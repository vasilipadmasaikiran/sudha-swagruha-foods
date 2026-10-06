// ============================================================
// Product & Admin Store with Zustand + LocalStorage Persistence
// + Supabase two-way sync (products, coupons, announcement banner)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sampleProducts, type Product, type ProductVariant } from '@/data/products';
import { productService, supabase, isSupabaseConfigured } from '@/services/supabase';

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

  // Cloud Sync Actions
  fetchProducts: () => Promise<void>;
  fetchCatalogAndSettings: () => Promise<void>;
  subscribeToCatalogAndSettings: () => () => void;

  // Product Actions
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
  addCoupon: (coupon: Omit<CouponItem, 'id' | 'usageCount'>) => Promise<{ success: boolean; error?: string }>;
  updateCoupon: (id: string, updates: Partial<CouponItem>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  toggleCoupon: (id: string) => Promise<void>;
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
    usageCount: 64,
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

      // ─── Fetch Products from Supabase DB ─────────────────────────
      fetchProducts: async () => {
        if (!isSupabaseConfigured()) return;
        set({ isLoading: true, error: null });
        try {
          const dbProducts = await productService.getAll();
          if (dbProducts && dbProducts.length > 0) {
            const mappedProducts: Product[] = dbProducts.map((dbP) => ({
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
              variants: [
                {
                  weight: dbP.weight,
                  price: dbP.price,
                  comparePrice: dbP.compare_price || undefined,
                  stock: dbP.stock,
                  sku: dbP.sku,
                },
              ],
            }));
            set({ products: mappedProducts, isLoading: false });
          }
        } catch (err: any) {
          console.warn('Products fetch notice:', err.message);
          set({ isLoading: false });
        }
      },

      // ─── Fetch Coupons & Announcement from Supabase ───────────────
      fetchCatalogAndSettings: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          // 1. Fetch Coupons
          const { data: dbCoupons, error: cErr } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

          if (!cErr && dbCoupons && dbCoupons.length > 0) {
            const mappedCoupons: CouponItem[] = dbCoupons.map((c: any) => ({
              id: c.id,
              code: c.code,
              discountPercent: Number(c.discount_percent),
              description: c.description,
              minOrder: Number(c.min_order || 0),
              isActive: Boolean(c.is_active),
              expiresAt: c.expires_at || undefined,
              usageCount: Number(c.usage_count || 0),
            }));
            set({ coupons: mappedCoupons });
          }

          // 2. Fetch Announcement Banner
          const { data: annData, error: aErr } = await supabase
            .from('store_settings')
            .select('value')
            .eq('key', 'announcement')
            .maybeSingle();

          if (!aErr && annData?.value) {
            set({ announcement: annData.value as DiscountAnnouncement });
          }
        } catch (err) {
          console.warn('Catalog and announcement sync notice:', err);
        }
      },

      // ─── Real-time Listener for Coupons & Announcements ──────────
      subscribeToCatalogAndSettings: () => {
        if (!isSupabaseConfigured()) return () => {};

        try {
          // Channel for real-time coupons and settings updates
          const channel = supabase
            .channel('catalog_and_settings_realtime')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'coupons' },
              (payload) => {
                if (payload.eventType === 'INSERT') {
                  const c = payload.new as any;
                  const newC: CouponItem = {
                    id: c.id,
                    code: c.code,
                    discountPercent: Number(c.discount_percent),
                    description: c.description,
                    minOrder: Number(c.min_order || 0),
                    isActive: Boolean(c.is_active),
                    expiresAt: c.expires_at || undefined,
                    usageCount: Number(c.usage_count || 0),
                  };
                  set((state) => ({
                    coupons: [newC, ...state.coupons.filter((it) => it.code !== newC.code)],
                  }));
                } else if (payload.eventType === 'UPDATE') {
                  const c = payload.new as any;
                  set((state) => ({
                    coupons: state.coupons.map((it) =>
                      it.code === c.code || it.id === c.id
                        ? {
                            ...it,
                            discountPercent: Number(c.discount_percent),
                            description: c.description,
                            minOrder: Number(c.min_order || 0),
                            isActive: Boolean(c.is_active),
                            expiresAt: c.expires_at || undefined,
                            usageCount: Number(c.usage_count || 0),
                          }
                        : it
                    ),
                  }));
                } else if (payload.eventType === 'DELETE') {
                  const oldRow = payload.old as any;
                  set((state) => ({
                    coupons: state.coupons.filter(
                      (it) => it.id !== oldRow.id && it.code !== oldRow.code
                    ),
                  }));
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'store_settings' },
              (payload) => {
                const newRow = payload.new as any;
                if (newRow?.key === 'announcement' && newRow.value) {
                  set({ announcement: newRow.value as DiscountAnnouncement });
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (e) {
          console.warn('Realtime catalog subscription notice:', e);
          return () => {};
        }
      },

      // ─── Product Local & DB Actions ──────────────────────────────
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

      // ─── Announcement Actions (Local + Supabase Cloud Sync) ──────
      updateAnnouncement: (updates) => {
        const updated = { ...get().announcement, ...updates };
        set({ announcement: updated });

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'announcement',
              value: updated,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase announcement sync notice:', error.message);
              else console.log('Synced announcement to Supabase cloud DB');
            });
        }
      },

      toggleAnnouncement: (enabled) => {
        const nextEnabled = enabled !== undefined ? enabled : !get().announcement.enabled;
        const updated = { ...get().announcement, enabled: nextEnabled };
        set({ announcement: updated });

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'announcement',
              value: updated,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase announcement toggle notice:', error.message);
            });
        }
      },

      // ─── Coupon Actions (Local + Supabase Cloud Sync) ────────────
      addCoupon: async (couponData) => {
        const cleanCode = couponData.code.trim().toUpperCase().replace(/\s+/g, '');
        const tempId = `coup-${Date.now()}`;
        const newCoupon: CouponItem = {
          ...couponData,
          code: cleanCode,
          id: tempId,
          usageCount: 0,
        };

        // Immediately update local UI state
        set((state) => ({
          coupons: [newCoupon, ...state.coupons.filter((c) => c.code !== cleanCode)],
        }));

        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('coupons')
              .upsert(
                {
                  code: cleanCode,
                  discount_percent: couponData.discountPercent,
                  description: couponData.description,
                  min_order: couponData.minOrder || 0,
                  is_active: couponData.isActive !== false,
                  expires_at: couponData.expiresAt || null,
                  usage_count: 0,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'code' }
              )
              .select();

            if (error) {
              console.warn('Supabase coupon upsert warning:', error.message);
              return { success: false, error: error.message };
            }

            if (data && data[0]) {
              const savedRow = data[0];
              // Update ID with the DB generated UUID
              set((state) => ({
                coupons: state.coupons.map((c) =>
                  c.code === cleanCode ? { ...c, id: savedRow.id } : c
                ),
              }));
              console.log('✅ Successfully saved and synced coupon to Cloud DB:', cleanCode);
            }
            return { success: true };
          } catch (err: any) {
            console.error('Coupon DB sync exception:', err);
            return { success: false, error: err.message || 'Network error syncing coupon' };
          }
        }
        return { success: true };
      },

      updateCoupon: async (id, updates) => {
        const existing = get().coupons.find((c) => c.id === id);
        set((state) => ({
          coupons: state.coupons.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));

        if (isSupabaseConfigured() && existing) {
          const payload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          if (updates.discountPercent !== undefined) payload.discount_percent = updates.discountPercent;
          if (updates.description !== undefined) payload.description = updates.description;
          if (updates.minOrder !== undefined) payload.min_order = updates.minOrder;
          if (updates.isActive !== undefined) payload.is_active = updates.isActive;
          if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt || null;

          try {
            const { error } = await supabase
              .from('coupons')
              .update(payload)
              .eq('code', existing.code);
            if (error) console.warn('Supabase coupon update notice:', error.message);
            else console.log('✅ Updated coupon in Cloud DB:', existing.code);
          } catch (err) {
            console.warn('Coupon update exception:', err);
          }
        }
      },

      deleteCoupon: async (id) => {
        const existing = get().coupons.find((c) => c.id === id);
        set((state) => ({
          coupons: state.coupons.filter((c) => c.id !== id),
        }));

        if (isSupabaseConfigured() && existing) {
          try {
            const { error } = await supabase
              .from('coupons')
              .delete()
              .eq('code', existing.code);
            if (error) console.warn('Supabase coupon delete notice:', error.message);
            else console.log('✅ Deleted coupon from Cloud DB:', existing.code);
          } catch (err) {
            console.warn('Coupon delete exception:', err);
          }
        }
      },

      toggleCoupon: async (id) => {
        const existing = get().coupons.find((c) => c.id === id);
        if (!existing) return;
        const newActive = !existing.isActive;

        set((state) => ({
          coupons: state.coupons.map((c) =>
            c.id === id ? { ...c, isActive: newActive } : c
          ),
        }));

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase
              .from('coupons')
              .update({ is_active: newActive, updated_at: new Date().toISOString() })
              .eq('code', existing.code);
            if (error) console.warn('Supabase coupon toggle notice:', error.message);
            else console.log(`✅ Toggled coupon ${existing.code} to ${newActive ? 'Active' : 'Disabled'} in Cloud DB`);
          } catch (err) {
            console.warn('Coupon toggle exception:', err);
          }
        }
      },

      getValidCoupon: (code) => {
        const clean = code.trim().toUpperCase().replace(/\s+/g, '');
        const now = new Date();
        return get().coupons.find((c) => {
          if (c.code.trim().toUpperCase().replace(/\s+/g, '') !== clean) return false;
          if (!c.isActive) return false;
          if (c.expiresAt && !isNaN(new Date(c.expiresAt).getTime()) && new Date(c.expiresAt) < now) {
            return false;
          }
          return true;
        });
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
