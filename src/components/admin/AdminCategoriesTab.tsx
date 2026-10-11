// ============================================================
// Admin Categories Management Tab (Prompt Section 4)
// Full CRUD, customer site visibility, display ordering,
// slug generation, product count tracking, and deletion safety
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Download,
  AlertTriangle,
  FolderTree,
  ArrowUpDown,
  Image as ImageIcon,
  Package,
} from 'lucide-react';
import { useCategoryStore, type CategoryItem } from '@/hooks/useCategoryStore';
import { useProductStore } from '@/hooks/useProductStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { logAdminAction } from '@/services/auditLogger';
import AppImage from '@/components/common/AppImage';
import toast from 'react-hot-toast';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
  showOnCustomerSite: boolean;
}

const initialForm: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  image: '',
  displayOrder: 1,
  isActive: true,
  showOnCustomerSite: true,
};

export default function AdminCategoriesTab() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    toggleCategoryVisibility,
    checkCategoryInUse,
    generateCategorySlug,
  } = useCategoryStore();

  const { products } = useProductStore();
  const { currentUser, canAccess } = useAdminAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [form, setForm] = useState<CategoryFormData>(initialForm);

  // Delete & Reassign State
  const [deleteModalCategory, setDeleteModalCategory] = useState<CategoryItem | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');

  // Map products count per category (by slug or id)
  const productCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = products.filter(
        (p) => p.category === cat.slug || p.category === cat.id || p.category.toLowerCase() === cat.name.toLowerCase()
      ).length;
    }
    return counts;
  }, [categories, products]);

  // Filtered & sorted categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const matchesSearch =
          cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && cat.isActive) ||
          (statusFilter === 'inactive' && !cat.isActive);
        const matchesVisibility =
          visibilityFilter === 'all' ||
          (visibilityFilter === 'visible' && cat.showOnCustomerSite) ||
          (visibilityFilter === 'hidden' && !cat.showOnCustomerSite);
        return matchesSearch && matchesStatus && matchesVisibility;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [categories, searchQuery, statusFilter, visibilityFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setForm({
      ...initialForm,
      displayOrder: categories.length + 1,
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (category: CategoryItem) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image || '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      showOnCustomerSite: category.showOnCustomerSite,
    });
    setModalOpen(true);
  };

  // Form Name Change: auto-generate slug if not manually editing existing slug
  const handleNameChange = (name: string) => {
    if (!editingCategory) {
      setForm((prev) => ({
        ...prev,
        name,
        slug: generateCategorySlug(name),
      }));
    } else {
      setForm((prev) => ({ ...prev, name }));
    }
  };

  // Submit Category
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Category Name is required');
      return;
    }
    if (!form.slug.trim()) {
      toast.error('Category Slug is required');
      return;
    }

    try {
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          image: form.image.trim() || undefined,
          displayOrder: Number(form.displayOrder) || 1,
          isActive: form.isActive,
          showOnCustomerSite: form.showOnCustomerSite,
        });

        if (!res.success) {
          toast.error(res.error || 'Failed to update category');
          return;
        }

        if (currentUser) {
          logAdminAction(
            currentUser.email,
            currentUser.role,
            'UPDATE_CATEGORY',
            'CATALOG',
            editingCategory.id,
            { name: form.name, slug: form.slug }
          );
        }

        toast.success(`Category "${form.name}" updated successfully!`);
      } else {
        const res = await addCategory({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          image: form.image.trim() || undefined,
          displayOrder: Number(form.displayOrder) || categories.length + 1,
          isActive: form.isActive,
          showOnCustomerSite: form.showOnCustomerSite,
        });

        if (!res.success || !res.category) {
          toast.error(res.error || 'Failed to create category');
          return;
        }

        if (currentUser) {
          logAdminAction(
            currentUser.email,
            currentUser.role,
            'CREATE_CATEGORY',
            'CATALOG',
            res.category.id,
            { name: form.name, slug: form.slug }
          );
        }

        toast.success(`Category "${form.name}" created and published!`);
      }

      setModalOpen(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save category');
    }
  };

  // Confirm delete or initiate reassignment
  const initiateDelete = (cat: CategoryItem) => {
    const inUse = checkCategoryInUse(cat.slug);
    if (inUse.inUse) {
      setDeleteModalCategory(cat);
      // Pick first alternative category for reassignment
      const alternative = categories.find((c) => c.id !== cat.id);
      setReassignTargetId(alternative?.slug || alternative?.id || '');
    } else {
      if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
        try {
          deleteCategory(cat.id);
          toast.success(`Category "${cat.name}" removed.`);
          if (currentUser) {
            logAdminAction(
              currentUser.email,
              currentUser.role,
              'DELETE_CATEGORY',
              'CATALOG',
              cat.id,
              { name: cat.name }
            );
          }
        } catch (err: unknown) {
          toast.error((err as Error).message);
        }
      }
    }
  };

  // Confirm deletion with reassignment
  const handleConfirmReassignDelete = () => {
    if (!deleteModalCategory) return;
    try {
      deleteCategory(deleteModalCategory.id, reassignTargetId || undefined);
      toast.success(
        `Category "${deleteModalCategory.name}" removed and products safely reassigned!`
      );
      if (currentUser) {
        logAdminAction(
          currentUser.email,
          currentUser.role,
          'REASSIGN_DELETE_CATEGORY',
          'CATALOG',
          deleteModalCategory.id,
          { name: deleteModalCategory.name, reassignedTo: reassignTargetId }
        );
      }
      setDeleteModalCategory(null);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  // Export categories to CSV (Prompt Section 15)
  const handleExportCSV = () => {
    const headers = [
      'Category ID',
      'Category Name',
      'Slug',
      'Active Status',
      'Customer Visibility',
      'Product Count',
      'Created Date',
      'Updated Date',
    ];

    const rows = filteredCategories.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.slug,
      c.isActive ? 'Active' : 'Inactive',
      c.showOnCustomerSite ? 'Visible' : 'Hidden',
      productCountMap[c.id] || 0,
      c.createdAt || '',
      c.updatedAt || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `categories_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Categories exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-400" />
            <span>Product Category Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, edit, organize display hierarchy, and control storefront visibility across customer navigation and catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, slug or description..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                visibilityFilter === 'all' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Visibility
            </button>
            <button
              onClick={() => setVisibilityFilter('visible')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                visibilityFilter === 'visible' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Visible
            </button>
            <button
              onClick={() => setVisibilityFilter('hidden')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                visibilityFilter === 'hidden' ? 'bg-slate-700 text-slate-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hidden
            </button>
          </div>
        </div>
      </div>

      {/* Category Table */}
      <div className="bg-slate-950/70 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 uppercase font-bold border-b border-slate-800 text-[11px]">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Products</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Storefront</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <FolderTree className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-medium text-slate-400">No categories found matching filters.</p>
                    <button
                      onClick={handleOpenCreate}
                      className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Category</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const pCount = productCountMap[cat.id] || 0;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        #{cat.displayOrder}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {cat.image ? (
                              <AppImage
                                src={cat.image}
                                alt={cat.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Layers className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{cat.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {cat.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {cat.slug}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs text-slate-300 truncate">
                        {cat.description || <span className="text-slate-600 italic">No description</span>}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                            pCount > 0
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}
                        >
                          <Package className="w-3 h-3 text-slate-400" />
                          <span>{pCount}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleCategoryActive(cat.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                            cat.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {cat.isActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleCategoryVisibility(cat.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                            cat.showOnCustomerSite
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {cat.showOnCustomerSite ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => initiateDelete(cat)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-emerald-400" />
                  <span>{editingCategory ? 'Edit Category' : 'Add New Category'}</span>
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Traditional Sweets"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>URL Slug (Unique Identifier) *</span>
                    <span className="text-[10px] text-slate-500 font-normal">e.g. sweets, snacks</span>
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      }))
                    }
                    placeholder="traditional-sweets"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description for customer catalog..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Display Order (Sort)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.displayOrder}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 1 }))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Image URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.image}
                      onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                      placeholder="/images/pickle.jpg"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">Active Status</p>
                      <p className="text-[10px] text-slate-400">Available in store</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">Storefront Visibility</p>
                      <p className="text-[10px] text-slate-400">Show in Navbar/Footer</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.showOnCustomerSite}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, showOnCustomerSite: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    {editingCategory ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete / Reassign Safeguard Modal */}
      <AnimatePresence>
        {deleteModalCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-400 pb-2 border-b border-slate-800">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-base font-bold text-white">Category Currently In Use</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                The category <strong className="text-white">"{deleteModalCategory.name}"</strong> is currently assigned to{' '}
                <strong className="text-amber-400">{productCountMap[deleteModalCategory.id] || 0} product(s)</strong>.
                To prevent accidental orphaning of products, please select a replacement category to reassign them before deletion.
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Reassign Products To:
                </label>
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {categories
                    .filter((c) => c.id !== deleteModalCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteModalCategory(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReassignDelete}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Reassign & Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
