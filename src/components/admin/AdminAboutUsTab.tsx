// ============================================================
// Admin About Us Management Tab (Dynamic CMS for About Us Page)
// Supports Hero, Story, Mission/Vision, Values, Team Profiles & Live Preview
// ============================================================
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Save,
  Eye,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Globe,
  Users,
  BookOpen,
  Target,
  Heart,
  Leaf,
  ShieldCheck,
  Award,
  AlertCircle,
  ExternalLink,
  Laptop,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAboutStore, type AboutUsContent, type AboutPerson, type AboutValue } from '@/hooks/useAboutStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import AppImage from '@/components/common/AppImage';

// Curated image presets for easy 1-click selection
const HERO_PRESETS = [
  { name: 'Heritage Kitchen (Traditional)', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Andhra Red Spices & Jars', url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Clay Pots & Turmeric', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Traditional Indian Feast', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=1600&auto=format&fit=crop&q=80' },
];

const STORY_PRESETS = [
  { name: 'Cooking in Brass Handi', url: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=1000&auto=format&fit=crop&q=80' },
  { name: 'Sun-Drying Pickles', url: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=1000&auto=format&fit=crop&q=80' },
  { name: 'Pure Spices Blend', url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1000&auto=format&fit=crop&q=80' },
];

const PROFILE_PRESETS = [
  { name: 'Elder Lady / Master Cook', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80' },
  { name: 'Managing Director / Leader', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80' },
  { name: 'Executive Chef / Artisan', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80' },
  { name: 'Culinary Specialist', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80' },
];

export default function AdminAboutUsTab() {
  const { content, saveAboutContent, addPerson, updatePerson, deletePerson, togglePersonStatus, reorderPeople, resetToDefaults } = useAboutStore();
  const { currentUser } = useAdminAuthStore();
  const { settings } = useSettingsStore();

  // Local working copy for smooth editing before commit
  const [form, setForm] = useState<AboutUsContent>({ ...content });
  const [activeSubSection, setActiveSubSection] = useState<'hero' | 'story' | 'values' | 'team' | 'seo'>('hero');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);

  // Person modal state
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<AboutPerson | null>(null);
  const [personForm, setPersonForm] = useState<Omit<AboutPerson, 'id'>>({
    name: '',
    designation: '',
    profileImage: PROFILE_PRESETS[0].url,
    shortBio: '',
    detailedBio: '',
    displayOrder: 1,
    isActive: true,
  });

  const heroFileRef = useRef<HTMLInputElement>(null);
  const storyFileRef = useRef<HTMLInputElement>(null);
  const personFileRef = useRef<HTMLInputElement>(null);

  // Handle Image File Upload (Base64 conversion with validation)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP)');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      toast.error('Image size must be less than 2.5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSuccess(reader.result);
        toast.success('Image uploaded successfully');
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Commit all changes to store & Supabase
  const handleSaveAll = async () => {
    setIsSaving(true);
    const res = await saveAboutContent(form, currentUser?.email || 'admin@sudhaswagruhafoods.com');
    setIsSaving(false);

    if (res.success) {
      toast.success('About Us content saved & synchronized with live storefront!');
    } else {
      toast.error(`Error saving content: ${res.error}`);
    }
  };

  // Reset to initial brand story
  const handleReset = async () => {
    if (window.confirm('Reset all About Us content back to default authentic Andhra Swagruha Foods history?')) {
      await resetToDefaults(currentUser?.email);
      setForm({ ...useAboutStore.getState().content });
      toast.success('Reset About Us content to defaults');
    }
  };

  // Person Modal Actions
  const handleOpenAddPerson = () => {
    setEditingPerson(null);
    setPersonForm({
      name: '',
      designation: '',
      profileImage: PROFILE_PRESETS[0].url,
      shortBio: '',
      detailedBio: '',
      displayOrder: form.people.length + 1,
      isActive: true,
    });
    setPersonModalOpen(true);
  };

  const handleOpenEditPerson = (p: AboutPerson) => {
    setEditingPerson(p);
    setPersonForm({
      name: p.name,
      designation: p.designation,
      profileImage: p.profileImage,
      shortBio: p.shortBio,
      detailedBio: p.detailedBio || '',
      displayOrder: p.displayOrder,
      isActive: p.isActive,
    });
    setPersonModalOpen(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForm.name.trim() || !personForm.designation.trim()) {
      toast.error('Name and designation are required');
      return;
    }

    if (editingPerson) {
      await updatePerson(editingPerson.id, personForm, currentUser?.email);
      toast.success(`Updated ${personForm.name}'s profile`);
    } else {
      await addPerson(personForm, currentUser?.email);
      toast.success(`Added ${personForm.name} to team`);
    }

    // Refresh local form state
    setForm({ ...useAboutStore.getState().content });
    setPersonModalOpen(false);
  };

  const handleDeletePerson = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from the About Us page?`)) {
      await deletePerson(id, currentUser?.email);
      setForm({ ...useAboutStore.getState().content });
      toast.success(`Removed ${name}`);
    }
  };

  const handleTogglePerson = async (id: string) => {
    await togglePersonStatus(id, currentUser?.email);
    setForm({ ...useAboutStore.getState().content });
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const list = [...form.people];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const orderedIds = list.map((p) => p.id);
    await reorderPeople(orderedIds, currentUser?.email);
    setForm({ ...useAboutStore.getState().content });
    toast.success('Updated team display order');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>About Us Page CMS</span>
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                form.isPublished
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {form.isPublished ? '● Published Live' : '○ Draft Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage the customer-facing About Us page, brand history, mission, and leadership profiles for{' '}
            <strong className="text-emerald-400">{settings.businessName}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Live Storefront Toggle */}
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-750 transition-colors">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400 bg-slate-900 border-slate-700"
            />
            <span className="text-xs font-semibold text-slate-200">Live on Storefront</span>
          </label>

          {/* Preview Button */}
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Page</span>
          </button>

          {/* Reset Defaults */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Save All Button */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* Section Subtabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'hero', label: '1. Hero & Introduction', icon: Sparkles },
          { id: 'story', label: '2. Our Story & Journey', icon: BookOpen },
          { id: 'values', label: '3. Mission, Vision & Values', icon: Target },
          { id: 'team', label: `4. Leadership & Team (${form.people.length})`, icon: Users },
          { id: 'seo', label: '5. SEO & Metadata', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubSection(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: HERO & INTRODUCTION                               */}
      {/* ============================================================ */}
      {activeSubSection === 'hero' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Hero Header Banner & Introduction</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              This is the opening impression displayed at the very top of your About Us page.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Main Page Headline *
                </label>
                <input
                  type="text"
                  value={form.pageTitle}
                  onChange={(e) => setForm({ ...form, pageTitle: e.target.value })}
                  placeholder="e.g. From Amma’s Kitchen to Your Home"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subtitle / Heritage Tagline
                </label>
                <input
                  type="text"
                  value={form.pageSubtitle}
                  onChange={(e) => setForm({ ...form, pageSubtitle: e.target.value })}
                  placeholder="e.g. 30+ Years of Authentic Telugu Heritage & Love"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Opening Introduction Statement *
                </label>
                <textarea
                  rows={4}
                  value={form.introduction}
                  onChange={(e) => setForm({ ...form, introduction: e.target.value })}
                  placeholder="A concise, warm welcome explaining what your brand represents..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Hero Banner Image */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Hero Banner Image (16:9 or Wide)
              </label>

              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
                <AppImage
                  src={form.heroImage}
                  alt="Hero Preview"
                  aspectRatio="video"
                  className="w-full rounded-xl object-cover"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.heroImage}
                  onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
                  placeholder="Paste image URL..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="file"
                  ref={heroFileRef}
                  onChange={(e) => handleFileUpload(e, (url) => setForm({ ...form, heroImage: url }))}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => heroFileRef.current?.click()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload File</span>
                </button>
              </div>

              {/* Presets */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Or choose a traditional preset:</p>
                <div className="grid grid-cols-2 gap-2">
                  {HERO_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setForm({ ...form, heroImage: preset.url })}
                      className="text-left p-2 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-amber-500/60 hover:bg-slate-800 transition-all text-[11px] text-slate-300 truncate"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 2: OUR STORY & JOURNEY                                */}
      {/* ============================================================ */}
      {activeSubSection === 'story' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Our Story, Heritage & Culinary Journey</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Explain how your business started, the legacy recipes, craftsmanship, and dedication to pure ingredients.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-7 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Detailed Story & Journey (Markdown / Paragraphs supported)
                  </label>
                  <span className="text-[11px] text-slate-500">Separate paragraphs with double Enter</span>
                </div>
                <textarea
                  rows={12}
                  value={form.ourStory}
                  onChange={(e) => setForm({ ...form, ourStory: e.target.value })}
                  placeholder="Share your business origins, founding family history, and recipe authenticity..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white leading-relaxed font-sans focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Story Showcase Image */}
            <div className="md:col-span-5 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Story Accent Image
              </label>

              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
                <AppImage
                  src={form.storyImage}
                  alt="Story Preview"
                  aspectRatio="square"
                  className="w-full rounded-xl object-cover"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.storyImage}
                  onChange={(e) => setForm({ ...form, storyImage: e.target.value })}
                  placeholder="Paste image URL..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="file"
                  ref={storyFileRef}
                  onChange={(e) => handleFileUpload(e, (url) => setForm({ ...form, storyImage: url }))}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => storyFileRef.current?.click()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload</span>
                </button>
              </div>

              {/* Story Presets */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400">Presets:</p>
                {STORY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setForm({ ...form, storyImage: preset.url })}
                    className="w-full text-left p-2 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/60 hover:bg-slate-800 transition-all text-[11px] text-slate-300 truncate"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 3: MISSION, VISION & CORE VALUES                      */}
      {/* ============================================================ */}
      {activeSubSection === 'values' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span>Mission, Vision & Core Values</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define the principles that guide your recipes, customer care, and business ethics.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Our Mission Statement *
              </label>
              <textarea
                rows={3}
                value={form.mission}
                onChange={(e) => setForm({ ...form, mission: e.target.value })}
                placeholder="What your brand strives to accomplish every day..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Our Vision Statement *
              </label>
              <textarea
                rows={3}
                value={form.vision}
                onChange={(e) => setForm({ ...form, vision: e.target.value })}
                placeholder="Where you see your brand and cultural heritage in the future..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Core Values List Editor */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Core Brand Values (4 Key Pillars)
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              {form.values.map((val, idx) => (
                <div key={val.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-400">Pillar #{idx + 1}</span>
                    <select
                      value={val.iconName}
                      onChange={(e) => {
                        const updated = form.values.map((v) => (v.id === val.id ? { ...v, iconName: e.target.value } : v));
                        setForm({ ...form, values: updated });
                      }}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 focus:outline-none"
                    >
                      <option value="Heart">❤️ Heart (Homemade)</option>
                      <option value="Leaf">🌿 Leaf (Natural Oils)</option>
                      <option value="ShieldCheck">🛡️ Shield (Zero Chemical)</option>
                      <option value="Award">🏆 Award (Heritage)</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={val.title}
                    onChange={(e) => {
                      const updated = form.values.map((v) => (v.id === val.id ? { ...v, title: e.target.value } : v));
                      setForm({ ...form, values: updated });
                    }}
                    placeholder="Pillar Title..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  />

                  <textarea
                    rows={2}
                    value={val.description}
                    onChange={(e) => {
                      const updated = form.values.map((v) => (v.id === val.id ? { ...v, description: e.target.value } : v));
                      setForm({ ...form, values: updated });
                    }}
                    placeholder="Description of this value..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 4: LEADERSHIP & TEAM PROFILES                         */}
      {/* ============================================================ */}
      {activeSubSection === 'team' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Founders, Leaders & Artisanal Team ({form.people.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage the team members displayed in the Meet Our Team section. Reorder display sequence with arrows.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddPerson}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </div>

          {/* People Directory Table / Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {form.people.length === 0 ? (
              <div className="col-span-3 text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No team members added yet</p>
                <p className="text-xs text-slate-500 mt-1">Click "Add Team Member" above to create your first profile.</p>
              </div>
            ) : (
              form.people.map((person, index) => (
                <div
                  key={person.id}
                  className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                    person.isActive ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
                  }`}
                >
                  <div>
                    {/* Header: Photo & Controls */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex-shrink-0">
                        <AppImage
                          src={person.profileImage}
                          alt={person.name}
                          aspectRatio="square"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, 'down')}
                          disabled={index === form.people.length - 1}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 ml-1">
                          #{person.displayOrder}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <h4 className="font-bold text-white text-sm">{person.name}</h4>
                    <p className="text-xs text-amber-400 font-medium mb-2">{person.designation}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed mb-3">
                      {person.shortBio}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTogglePerson(person.id)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer ${
                        person.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {person.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPerson(person)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePerson(person.id, person.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 5: SEO & METADATA                                     */}
      {/* ============================================================ */}
      {activeSubSection === 'seo' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 max-w-2xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Search Engine Optimization (SEO)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize how the About Us page appears on Google search results and shared social cards.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Browser Title Tag (&lt;title&gt;)
              </label>
              <input
                type="text"
                value={form.seoTitle || ''}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                placeholder="About Us | Sudha Swagruha Foods"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Meta Description Tag
              </label>
              <textarea
                rows={3}
                value={form.seoDescription || ''}
                onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                placeholder="Discover our 30-year heritage of authentic Andhra handmade pickles and pure sweets..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Google Search Preview Card */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search Snippet Preview:</p>
              <p className="text-blue-400 text-sm font-semibold truncate hover:underline cursor-pointer">
                {form.seoTitle || `${form.pageTitle} - ${settings.businessName}`}
              </p>
              <p className="text-emerald-500 text-[11px] font-mono">
                https://sudhaswagruhafoods.com/about-us
              </p>
              <p className="text-slate-400 text-xs line-clamp-2">
                {form.seoDescription || form.introduction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT PERSON PROFILE                             */}
      {/* ============================================================ */}
      <AnimatePresence>
        {personModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setPersonModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingPerson ? 'Edit Team Member Profile' : 'Add New Team Member'}</span>
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Configure profile image, title, and bio for the Meet Our Team section.
              </p>

              <form onSubmit={handleSavePerson} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={personForm.name}
                      onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                      placeholder="e.g. Smt. Sudha Rani"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Designation / Role *
                    </label>
                    <input
                      type="text"
                      value={personForm.designation}
                      onChange={(e) => setPersonForm({ ...personForm, designation: e.target.value })}
                      placeholder="e.g. Founder & Recipe Curator"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Profile Photo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex-shrink-0">
                      <AppImage
                        src={personForm.profileImage}
                        alt="Profile Preview"
                        aspectRatio="square"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={personForm.profileImage}
                        onChange={(e) => setPersonForm({ ...personForm, profileImage: e.target.value })}
                        placeholder="Image URL..."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-[11px] font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="file"
                        ref={personFileRef}
                        onChange={(e) => handleFileUpload(e, (url) => setPersonForm({ ...personForm, profileImage: url }))}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => personFileRef.current?.click()}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-blue-400" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </div>

                  {/* Profile Presets */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PROFILE_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setPersonForm({ ...personForm, profileImage: p.url })}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bios */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Short Bio (Displayed on Team Card) *
                  </label>
                  <textarea
                    rows={2}
                    value={personForm.shortBio}
                    onChange={(e) => setPersonForm({ ...personForm, shortBio: e.target.value })}
                    placeholder="1-2 sentences summarizing their passion or role in the kitchen..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Detailed Biography (Optional Expanded)
                  </label>
                  <textarea
                    rows={3}
                    value={personForm.detailedBio || ''}
                    onChange={(e) => setPersonForm({ ...personForm, detailedBio: e.target.value })}
                    placeholder="Extended biographical information, accomplishments, or traditional philosophy..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Display Priority Sequence
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={personForm.displayOrder}
                      onChange={(e) => setPersonForm({ ...personForm, displayOrder: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={personForm.isActive}
                        onChange={(e) => setPersonForm({ ...personForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-emerald-500 rounded bg-slate-950 border-slate-700"
                      />
                      <span className="text-xs font-semibold text-slate-200">Active Profile</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPersonModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30"
                  >
                    {editingPerson ? 'Update Profile' : 'Save Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: LIVE PREVIEW OF CUSTOMER ABOUT US PAGE                 */}
      {/* ============================================================ */}
      <AnimatePresence>
        {previewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-brand-cream border border-slate-700 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative"
            >
              {/* Preview Bar */}
              <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Customer Viewport Preview</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    /about-us • {settings.businessName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Viewport switch */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        previewDevice === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Desktop view"
                    >
                      <Laptop className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        previewDevice === 'mobile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mobile view"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewport Container */}
              <div className="flex-1 overflow-y-auto bg-brand-cream flex justify-center">
                <div
                  className={`w-full transition-all duration-300 ${
                    previewDevice === 'mobile' ? 'max-w-sm border-x border-slate-300 shadow-2xl bg-brand-cream' : 'max-w-5xl'
                  }`}
                >
                  {/* Hero */}
                  <div className="relative py-16 px-6 text-center text-white overflow-hidden bg-gradient-to-br from-brand-red via-brand-terracotta to-brand-amber">
                    <div className="relative z-10 max-w-2xl mx-auto space-y-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm inline-block">
                        {form.pageSubtitle}
                      </span>
                      <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white">
                        {form.pageTitle}
                      </h1>
                      <p className="text-sm md:text-base text-amber-50 leading-relaxed font-sans max-w-xl mx-auto opacity-95">
                        {form.introduction}
                      </p>
                    </div>
                  </div>

                  {/* Banner Image Container */}
                  <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20">
                    <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                      <AppImage
                        src={form.heroImage}
                        alt="Hero Banner"
                        aspectRatio="video"
                        className="w-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Our Story */}
                  <div className="max-w-4xl mx-auto px-6 py-16">
                    <div className="grid md:grid-cols-12 gap-8 items-center">
                      <div className="md:col-span-7 space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-red font-mono">
                          Authentic Roots & Legacy
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 font-display">
                          Our Heritage Story
                        </h2>
                        <div className="text-sm text-gray-700 space-y-3 leading-relaxed whitespace-pre-line">
                          {form.ourStory}
                        </div>
                      </div>

                      <div className="md:col-span-5">
                        <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white rotate-1 hover:rotate-0 transition-transform">
                          <AppImage
                            src={form.storyImage}
                            alt="Story Showcase"
                            aspectRatio="square"
                            className="w-full object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mission & Vision */}
                    <div className="grid md:grid-cols-2 gap-6 mt-16">
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-amber/30 space-y-2">
                        <span className="text-2xl">🎯</span>
                        <h3 className="text-lg font-bold text-gray-900 font-display">Our Mission</h3>
                        <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{form.mission}</p>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-green/30 space-y-2">
                        <span className="text-2xl">🌱</span>
                        <h3 className="text-lg font-bold text-gray-900 font-display">Our Vision</h3>
                        <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{form.vision}</p>
                      </div>
                    </div>

                    {/* Core Values */}
                    <div className="mt-16 text-center space-y-8">
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 font-display">
                          Our Uncompromising Principles
                        </h2>
                        <p className="text-xs text-gray-600 mt-1">What goes into every single jar of our homemade foods.</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {form.values.map((v) => (
                          <div key={v.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center space-y-2">
                            <span className="text-2xl block">
                              {v.iconName === 'Heart' && '❤️'}
                              {v.iconName === 'Leaf' && '🌿'}
                              {v.iconName === 'ShieldCheck' && '🛡️'}
                              {v.iconName === 'Award' && '🏆'}
                            </span>
                            <h4 className="font-bold text-gray-900 text-xs">{v.title}</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed">{v.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Meet Our Team */}
                    <div className="mt-20 space-y-8">
                      <div className="text-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-red font-mono">
                          The Custodians of Taste
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 font-display mt-1">
                          Meet Our Culinary Team
                        </h2>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-6">
                        {form.people
                          .filter((p) => p.isActive)
                          .map((person) => (
                            <div key={person.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center space-y-3">
                              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-md border-2 border-brand-amber">
                                <AppImage
                                  src={person.profileImage}
                                  alt={person.name}
                                  aspectRatio="square"
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{person.name}</h4>
                                <p className="text-xs font-semibold text-brand-red">{person.designation}</p>
                              </div>

                              <p className="text-xs text-gray-600 leading-relaxed">{person.shortBio}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
