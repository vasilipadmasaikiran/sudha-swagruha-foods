// ============================================================
// Enterprise Category Store & Lifecycle Management
// Dynamic Category CRUD, Persistence, Slug Safety, RBAC & Customer Sync
// Implements Requirements 4.1 - 4.5
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useProductStore } from '@/hooks/useProductStore';
import { logAdminAction } from '@/services/auditLogger';

export interface ManagedCategory {
  id: string;
  name: string;
  name_en: string;
  name_te?: string;
  slug: string;
  description: string;
  description_en?: string;
  description_te?: string;
  icon?: string;
  image?: string;
  color?: string;
  display_order: number;
  displayOrder: number;
  is_active: boolean;
  isActive: boolean;
  visible_on_site: boolean;
  showOnCustomerSite: boolean;
  parent_id?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

export type CategoryItem = ManagedCategory;

const BASE_PATH = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

const defaultCategories: ManagedCategory[] = [
  {
    id: 'cat-1',
    slug: 'pickles',
    name: 'Pickles',
    name_en: 'Pickles',
    name_te: 'ఊరగాయలు',
    description: 'Traditional Andhra-style pickles with bold flavors',
    description_en: 'Traditional Andhra-style pickles with bold flavors',
    description_te: 'సంప్రదాయ ఆంధ్ర స్టైల్ ఊరగాయలు',
    icon: '🫙',
    image: `${BASE_PATH}images/pickle.jpg`,
    color: '#C62828',
    display_order: 1,
    displayOrder: 1,
    is_active: true,
    isActive: true,
    visible_on_site: true,
    showOnCustomerSite: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-2',
    slug: 'karam',
    name: 'Karam Powders',
    name_en: 'Karam Powders',
    name_te: 'కారం పొడులు',
    description: 'Spicy chilli-based powders for everyday meals',
    description_en: 'Spicy chilli-based powders for everyday meals',
    description_te: 'రోజువారీ వంటకు కారమైన పొడులు',
    icon: '🌶️',
    image: `${BASE_PATH}images/karam.jpg`,
    color: '#C62828',
    display_order: 2,
    displayOrder: 2,
    is_active: true,
    isActive: true,
    visible_on_site: true,
    showOnCustomerSite: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-3',
    slug: 'masala',
    name: 'Masala Powders',
    name_en: 'Masala Powders',
    name_te: 'మసాలా పొడులు',
    description: 'Aromatic spice blends for authentic Telugu cooking',
    description_en: 'Aromatic spice blends for authentic Telugu cooking',
    description_te: 'అసలైన తెలుగు వంటకు సుగంధ మసాలాలు',
    icon: '🌿',
    image: `${BASE_PATH}images/masala.jpg`,
    color: '#2F6B3B',
    display_order: 3,
    displayOrder: 3,
    is_active: true,
    isActive: true,
    visible_on_site: true,
    showOnCustomerSite: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-4',
    slug: 'podi',
    name: 'Podis',
    name_en: 'Podis',
    name_te: 'పొడులు',
    description: 'Dry chutneys and rice powders for daily use',
    description_en: 'Dry chutneys and rice powders for daily use',
    description_te: 'నిత్య వాడకానికి పొడి చట్నీలు & అన్నం పొడులు',
    icon: '🍚',
    image: `${BASE_PATH}images/karam.jpg`,
    color: '#795548',
    display_order: 4,
    displayOrder: 4,
    is_active: true,
    isActive: true,
    visible_on_site: true,
    showOnCustomerSite: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CategoryStore {
  categories: ManagedCategory[];
  isLoading: boolean;
  error: string | null;

  // Cloud Sync
  fetchCategories: () => Promise<void>;

  // CRUD Operations
  generateCategorySlug: (name: string) => string;

  addCategory: (
    input: Partial<ManagedCategory> & { name?: string; name_en?: string; slug?: string }
  ) => Promise<{ success: boolean; category?: ManagedCategory; error?: string }>;

  updateCategory: (
    id: string,
    updates: Partial<ManagedCategory>
  ) => Promise<{ success: boolean; error?: string }>;

  deleteCategory: (
    id: string,
    reassignToSlug?: string
  ) => Promise<{ success: boolean; error?: string }>;

  toggleCategoryActive: (id: string) => Promise<void>;
  toggleCategoryVisibility: (id: string) => Promise<void>;

  // Queries
  getCategoryBySlug: (slug: string) => ManagedCategory | undefined;
  getCategoryById: (id: string) => ManagedCategory | undefined;
  getActiveCategories: () => ManagedCategory[];
  getVisibleCustomerCategories: () => ManagedCategory[];
  checkCategoryInUse: (slugOrId: string) => { inUse: boolean; productCount: number };
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,
      isLoading: false,
      error: null,

      generateCategorySlug: (name: string) => generateCategorySlug(name),

      fetchCategories: async () => {
        if (!isSupabaseConfigured()) return;
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('display_order', { ascending: true });

          if (error) {
            console.warn('Categories cloud fetch skipped (table may not exist yet):', error.message);
          } else if (data && data.length > 0) {
            const mapped: ManagedCategory[] = data.map((d: any) => {
              const nameStr = d.name_en || d.name || '';
              const descStr = d.description_en || d.description || '';
              const orderNum = Number(d.display_order ?? d.displayOrder ?? 0);
              const activeBool = d.is_active !== undefined ? Boolean(d.is_active) : (d.isActive !== undefined ? Boolean(d.isActive) : true);
              const visBool = d.visible_on_site !== undefined ? Boolean(d.visible_on_site) : (d.showOnCustomerSite !== undefined ? Boolean(d.showOnCustomerSite) : true);
              const createdStr = d.created_at || d.createdAt || new Date().toISOString();
              const updatedStr = d.updated_at || d.updatedAt || new Date().toISOString();

              return {
                id: String(d.id),
                name: nameStr,
                name_en: nameStr,
                name_te: d.name_te || '',
                slug: d.slug || generateCategorySlug(nameStr),
                description: descStr,
                description_en: descStr,
                description_te: d.description_te || '',
                icon: d.icon || '📦',
                image: d.image || `${BASE_PATH}images/pickle.jpg`,
                color: d.color || '#C62828',
                display_order: orderNum,
                displayOrder: orderNum,
                is_active: activeBool,
                isActive: activeBool,
                visible_on_site: visBool,
                showOnCustomerSite: visBool,
                parent_id: d.parent_id || null,
                created_at: createdStr,
                createdAt: createdStr,
                updated_at: updatedStr,
                updatedAt: updatedStr,
              };
            });
            set({ categories: mapped });
          }
        } catch (err: any) {
          console.warn('Categories fetch exception:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      addCategory: async (input) => {
        const cleanName = input.name_en?.trim() || (input as any).name?.trim() || '';
        if (!cleanName) {
          return { success: false, error: 'Category Name is mandatory.' };
        }

        let slug = input.slug ? generateCategorySlug(input.slug) : generateCategorySlug(cleanName);
        if (!slug) {
          slug = `cat-${Date.now().toString(36)}`;
        }

        // Validate uniqueness of slug
        const existing = get().categories.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
        if (existing) {
          return {
            success: false,
            error: `Category slug "${slug}" already exists (Category: ${existing.name_en}). Please choose a unique name or slug.`,
          };
        }

        const now = new Date().toISOString();
        const dispOrder = Number(input.display_order ?? (input as any).displayOrder ?? get().categories.length + 1);
        const activeFlag = input.is_active !== undefined ? input.is_active : ((input as any).isActive !== undefined ? (input as any).isActive : true);
        const visFlag = input.visible_on_site !== undefined ? input.visible_on_site : ((input as any).showOnCustomerSite !== undefined ? (input as any).showOnCustomerSite : true);

        const newCat: ManagedCategory = {
          ...input,
          id: `cat-${Date.now()}`,
          name: cleanName,
          name_en: cleanName,
          name_te: input.name_te?.trim() || cleanName,
          slug,
          description: input.description_en?.trim() || (input as any).description?.trim() || '',
          description_en: input.description_en?.trim() || (input as any).description?.trim() || '',
          description_te: input.description_te?.trim() || '',
          icon: input.icon?.trim() || '📦',
          image: input.image?.trim() || `${BASE_PATH}images/pickle.jpg`,
          color: input.color?.trim() || '#C62828',
          display_order: dispOrder,
          displayOrder: dispOrder,
          is_active: activeFlag,
          isActive: activeFlag,
          visible_on_site: visFlag,
          showOnCustomerSite: visFlag,
          created_at: now,
          createdAt: now,
          updated_at: now,
          updatedAt: now,
        };

        set((state) => ({
          categories: [...state.categories, newCat].sort((a, b) => a.display_order - b.display_order),
        }));

        logAdminAction(
          'admin@sudhaswagruha.com',
          'ROOT_ADMIN',
          'CREATE_CATEGORY',
          'products',
          newCat.id,
          { slug: newCat.slug, display_order: newCat.display_order }
        );

        // Sync to Supabase if available
        if (isSupabaseConfigured()) {
          try {
            await supabase.from('categories').insert({
              id: newCat.id,
              name_en: newCat.name_en,
              name_te: newCat.name_te,
              slug: newCat.slug,
              description_en: newCat.description_en,
              description_te: newCat.description_te,
              icon: newCat.icon,
              image: newCat.image,
              color: newCat.color,
              display_order: newCat.display_order,
              is_active: newCat.is_active,
              visible_on_site: newCat.visible_on_site,
              created_at: newCat.created_at,
              updated_at: newCat.updated_at,
            });
          } catch (dbErr) {
            console.warn('Category cloud persist note:', dbErr);
          }
        }

        return { success: true, category: newCat };
      },

      updateCategory: async (id, updates) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) {
          return { success: false, error: 'Category not found.' };
        }

        if (updates.slug && updates.slug !== cat.slug) {
          const newSlug = generateCategorySlug(updates.slug);
          const duplicate = get().categories.find((c) => c.id !== id && c.slug.toLowerCase() === newSlug.toLowerCase());
          if (duplicate) {
            return { success: false, error: `Category slug "${newSlug}" is already in use by "${duplicate.name_en}".` };
          }
          updates.slug = newSlug;
        }

        const now = new Date().toISOString();
        const updatedCat: ManagedCategory = {
          ...cat,
          ...updates,
          name: updates.name || updates.name_en || cat.name || cat.name_en || '',
          name_en: updates.name_en || updates.name || cat.name_en || cat.name || '',
          description: updates.description || updates.description_en || cat.description || cat.description_en || '',
          description_en: updates.description_en || updates.description || cat.description_en || cat.description || '',
          is_active: updates.is_active !== undefined ? updates.is_active : (updates.isActive !== undefined ? updates.isActive : cat.is_active),
          isActive: updates.is_active !== undefined ? updates.is_active : (updates.isActive !== undefined ? updates.isActive : cat.is_active),
          visible_on_site: updates.visible_on_site !== undefined ? updates.visible_on_site : (updates.showOnCustomerSite !== undefined ? updates.showOnCustomerSite : cat.visible_on_site),
          showOnCustomerSite: updates.visible_on_site !== undefined ? updates.visible_on_site : (updates.showOnCustomerSite !== undefined ? updates.showOnCustomerSite : cat.visible_on_site),
          display_order: updates.display_order !== undefined ? updates.display_order : (updates.displayOrder !== undefined ? updates.displayOrder : cat.display_order),
          displayOrder: updates.display_order !== undefined ? updates.display_order : (updates.displayOrder !== undefined ? updates.displayOrder : cat.display_order),
          updated_at: now,
          updatedAt: now,
        };

        set((state) => ({
          categories: state.categories
            .map((c) => (c.id === id ? updatedCat : c))
            .sort((a, b) => a.display_order - b.display_order),
        }));

        logAdminAction(
          'admin@sudhaswagruha.com',
          'ROOT_ADMIN',
          'UPDATE_CATEGORY',
          'products',
          id,
          updates as Record<string, unknown>
        );

        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('categories')
              .update({
                name_en: updatedCat.name_en,
                name_te: updatedCat.name_te,
                slug: updatedCat.slug,
                description_en: updatedCat.description_en,
                description_te: updatedCat.description_te,
                icon: updatedCat.icon,
                image: updatedCat.image,
                color: updatedCat.color,
                display_order: updatedCat.display_order,
                is_active: updatedCat.is_active,
                visible_on_site: updatedCat.visible_on_site,
                updated_at: updatedCat.updated_at,
              })
              .eq('id', id);
          } catch (dbErr) {
            console.warn('Category cloud update note:', dbErr);
          }
        }

        return { success: true };
      },

      deleteCategory: async (id, reassignToSlug) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) {
          return { success: false, error: 'Category not found.' };
        }

        const { inUse, productCount } = get().checkCategoryInUse(cat.slug);

        // Section 4.5 Category integrity: Prevent orphaning of products
        if (inUse && !reassignToSlug) {
          return {
            success: false,
            error: `Cannot delete "${cat.name_en}" because ${productCount} active products are currently assigned to it. Please reassign the products to another category first, or deactivate this category instead.`,
          };
        }

        // If reassignment is specified, reassign products
        if (inUse && reassignToSlug) {
          const productStore = useProductStore.getState();
          const targetCat = get().categories.find((c) => c.slug === reassignToSlug);
          if (!targetCat) {
            return { success: false, error: `Target category "${reassignToSlug}" for reassignment does not exist.` };
          }

          for (const prod of productStore.products) {
            if (prod.category === cat.slug) {
              productStore.updateProduct(prod.id, { category: targetCat.slug as any });
            }
          }
        }

        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));

        logAdminAction(
          'admin@sudhaswagruha.com',
          'ROOT_ADMIN',
          'DELETE_CATEGORY',
          'products',
          id,
          { reassignedTo: reassignToSlug || null }
        );

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('categories').delete().eq('id', id);
          } catch (dbErr) {
            console.warn('Category cloud delete note:', dbErr);
          }
        }

        return { success: true };
      },

      toggleCategoryActive: async (id) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return;
        await get().updateCategory(id, { is_active: !cat.is_active });
      },

      toggleCategoryVisibility: async (id) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return;
        await get().updateCategory(id, { visible_on_site: !cat.visible_on_site });
      },

      getCategoryBySlug: (slug) => {
        if (!slug) return undefined;
        const clean = slug.toLowerCase().trim();
        return get().categories.find((c) => c.slug.toLowerCase() === clean);
      },

      getCategoryById: (id) => {
        return get().categories.find((c) => c.id === id);
      },

      getActiveCategories: () => {
        return get()
          .categories.filter((c) => c.is_active)
          .sort((a, b) => a.display_order - b.display_order);
      },

      getVisibleCustomerCategories: () => {
        return get()
          .categories.filter((c) => c.is_active && c.visible_on_site)
          .sort((a, b) => a.display_order - b.display_order);
      },

      checkCategoryInUse: (slugOrId: string) => {
        if (!slugOrId) return { inUse: false, productCount: 0 };
        const clean = slugOrId.toLowerCase().trim();
        const products = useProductStore.getState().products;
        const matching = products.filter(
          (p) =>
            (p.category?.toLowerCase() === clean || p.category === slugOrId) &&
            !p.is_archived
        );
        return {
          inUse: matching.length > 0,
          productCount: matching.length,
        };
      },
    }),
    {
      name: 'ssf-categories',
      partialize: (state) => ({
        categories: state.categories,
      }),
    }
  )
);
