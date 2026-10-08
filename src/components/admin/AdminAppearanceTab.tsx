// ============================================================
// Admin Console - Website Appearance Manager Tab
// Requirements: 3.1, 3.3, 3.4, 5.1, 5.2
// Controls Brand Colors, Typography, Layout, Live Drafts,
// Real-time Preview, and Version Rollback
// ============================================================
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Type,
  Layout,
  Save,
  Upload,
  History,
  RotateCcw,
  Eye,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Monitor,
} from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import type {
  WebsiteAppearanceSettings,
  ThemeColors,
  ThemeTypography,
  ThemeLayout,
  ThemeVersionRecord,
} from '@/services/websiteSettingsTypes';
import toast from 'react-hot-toast';

export default function AdminAppearanceTab() {
  const { settings, updateAppearanceSettings } = useSettingsStore();
  const appearance = settings.appearance;

  // Local state for active editing
  const [colors, setColors] = useState<ThemeColors>({ ...appearance.colors });
  const [typography, setTypography] = useState<ThemeTypography>({ ...appearance.typography });
  const [layout, setLayout] = useState<ThemeLayout>({ ...appearance.layout });

  const [activeSubTab, setActiveSubTab] = useState<'colors' | 'typography' | 'layout' | 'versions'>('colors');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Brand Info (tied to store settings)
  const { updateSettings } = useSettingsStore();
  const [storeName, setStoreName] = useState(settings.businessName || 'Sudha Swagruha Foods');
  const [tagline, setTagline] = useState(settings.tagline || 'Authentic Andhra Traditional Foods');

  // Handle Save as Draft
  const handleSaveDraft = async () => {
    if (isSaving || isPublishing) return;
    setIsSaving(true);
    try {
      await updateAppearanceSettings({
        isDraft: true,
        draftColors: colors,
        draftTypography: typography,
        draftLayout: layout,
      });
      setSaveSuccess(true);
      toast.success('Appearance draft saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Unable to save draft changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Publish Live
  const handlePublish = async () => {
    if (isSaving || isPublishing) return;
    setIsPublishing(true);
    try {
      const newVersionNum = `v${Date.now().toString().slice(-4)}`;
      const newVersionRecord: ThemeVersionRecord = {
        versionId: `ver-${Date.now()}`,
        versionName: `Release ${newVersionNum}`,
        savedAt: new Date().toISOString(),
        savedBy: 'Admin',
        colors,
        typography,
        layout,
      };

      const updatedHistory = [newVersionRecord, ...(appearance.versionHistory || [])].slice(0, 10);

      await updateAppearanceSettings({
        publishedVersion: newVersionNum,
        isDraft: false,
        colors,
        typography,
        layout,
        draftColors: undefined,
        draftTypography: undefined,
        draftLayout: undefined,
        versionHistory: updatedHistory,
      });

      // Also persist store name & tagline
      updateSettings({
        businessName: storeName.trim(),
        tagline: tagline.trim(),
      });

      // Apply dynamic CSS variables directly to document root for instant live updates
      document.documentElement.style.setProperty('--color-primary', colors.primary);
      document.documentElement.style.setProperty('--color-accent', colors.accent);

      toast.success(`Theme published live! (Version ${newVersionNum})`);
    } catch (err: any) {
      toast.error('Unable to publish changes to live site');
    } finally {
      setIsPublishing(false);
    }
  };

  // Rollback to previous version
  const handleRollback = (ver: ThemeVersionRecord) => {
    if (window.confirm(`Restore and activate theme from ${new Date(ver.savedAt).toLocaleString()}?`)) {
      setColors({ ...ver.colors });
      setTypography({ ...ver.typography });
      setLayout({ ...ver.layout });
      toast.success(`Loaded ${ver.versionName}. Click "Publish Live" to commit.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Palette className="w-6 h-6 text-emerald-400" />
              <span>Website Appearance Manager</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Active: {appearance.publishedVersion}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customize branding, color palette, fonts, and component styling without code changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold hover:bg-slate-700 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition active:scale-95 disabled:opacity-50"
          >
            {isPublishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Publish Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('colors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'colors'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Colors & Brand</span>
        </button>

        <button
          onClick={() => setActiveSubTab('typography')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'typography'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Typography</span>
        </button>

        <button
          onClick={() => setActiveSubTab('layout')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'layout'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Layout & Shapes</span>
        </button>

        <button
          onClick={() => setActiveSubTab('versions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'versions'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Version History ({appearance.versionHistory?.length || 0})</span>
        </button>
      </div>

      {/* Tab 1: Colors & Brand */}
      {activeSubTab === 'colors' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Brand Identity */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Brand Identity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline / Motto</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Color Palette Grid */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Theme Color Palette</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Primary Brand Color', key: 'primary', desc: 'Main brand headers, main buttons' },
                  { label: 'Primary Hover', key: 'primaryHover', desc: 'Button & link interactive hover' },
                  { label: 'Secondary / Warm Accent', key: 'secondary', desc: 'Subheadings, badges' },
                  { label: 'Gold / Accent Highlight', key: 'accent', desc: 'Offers, stars, highlights' },
                  { label: 'Background Color', key: 'background', desc: 'Page background tone' },
                  { label: 'Header Background', key: 'headerBg', desc: 'Top navigation bar background' },
                  { label: 'Footer Background', key: 'footerBg', desc: 'Bottom footer block' },
                  { label: 'Card Surface', key: 'cardBg', desc: 'Product & review card background' },
                  { label: 'Border Tone', key: 'borderColor', desc: 'Dividers & container borders' },
                ].map(({ label, key, desc }) => (
                  <div key={key} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{label}</span>
                      <input
                        type="color"
                        value={(colors as any)[key]}
                        onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                    </div>
                    <input
                      type="text"
                      value={(colors as any)[key]}
                      onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Monitor className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Preview Card</h3>
              </div>

              {/* Mock Product Card rendered with chosen colors */}
              <div
                style={{
                  backgroundColor: colors.cardBg,
                  borderColor: colors.borderColor,
                  borderWidth: 1,
                  borderRadius: layout.buttonShape === 'rounded-full' ? '1.5rem' : '1rem',
                }}
                className="p-4 shadow-lg space-y-3"
              >
                <div className="h-32 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <span style={{ color: colors.secondary }} className="font-bold text-sm">
                    Traditional Delicacy Image
                  </span>
                </div>
                <div>
                  <span
                    style={{ backgroundColor: colors.accent, color: '#000' }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1"
                  >
                    BESTSELLER
                  </span>
                  <h4 style={{ color: colors.textPrimary }} className="font-bold text-base">
                    Andhra Bellam Sunnundalu
                  </h4>
                  <p style={{ color: colors.textSecondary }} className="text-xs">
                    Pure Ghee, Urad Dal, Jaggery
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span style={{ color: colors.primary }} className="font-extrabold text-lg">
                    ₹380
                  </span>
                  <button
                    style={{
                      backgroundColor: colors.primary,
                      color: '#ffffff',
                      borderRadius: layout.buttonShape === 'rounded-full' ? '9999px' : '0.75rem',
                    }}
                    className="px-4 py-1.5 text-xs font-bold shadow-md hover:opacity-90 transition"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Typography */}
      {activeSubTab === 'typography' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Type className="w-4 h-4 text-sky-400" />
            <span>Font Families & Text Scaling</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Heading Font Family</label>
              <select
                value={typography.headingFont}
                onChange={(e) => setTypography({ ...typography, headingFont: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="Playfair Display">Playfair Display (Traditional & Elegant Serif)</option>
                <option value="Cinzel">Cinzel (Heritage & Royal Serif)</option>
                <option value="Outfit">Outfit (Modern Clean Sans)</option>
                <option value="Inter">Inter (Ultra-Legible Sans)</option>
                <option value="Poppins">Poppins (Friendly Rounded Sans)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Body Text Font Family</label>
              <select
                value={typography.bodyFont}
                onChange={(e) => setTypography({ ...typography, bodyFont: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="Inter">Inter (Clean Neutral Sans)</option>
                <option value="Poppins">Poppins (Modern Geometric)</option>
                <option value="Roboto">Roboto (Classic Sans)</option>
                <option value="system-ui">System Default</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Base Font Size (px)</label>
              <input
                type="number"
                min="14"
                max="20"
                value={typography.baseFontSize}
                onChange={(e) => setTypography({ ...typography, baseFontSize: Number(e.target.value) || 16 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Heading Weight</label>
              <select
                value={typography.headingWeight}
                onChange={(e) => setTypography({ ...typography, headingWeight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="600">Semi-Bold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra Bold (800)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Layout */}
      {activeSubTab === 'layout' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layout className="w-4 h-4 text-purple-400" />
            <span>Layout & Component Geometry</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Button Corner Radius</label>
              <select
                value={layout.buttonShape}
                onChange={(e) => setLayout({ ...layout, buttonShape: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="rounded-xl">Curved Rounded (rounded-xl - Standard)</option>
                <option value="rounded-full">Pill / Stadium (rounded-full)</option>
                <option value="rounded-md">Subtle Rounded (rounded-md)</option>
                <option value="square">Sharp Square (square)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Container Maximum Width</label>
              <select
                value={layout.containerWidth}
                onChange={(e) => setLayout({ ...layout, containerWidth: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="max-w-7xl">Standard Modern (1280px / 7xl)</option>
                <option value="max-w-6xl">Compact Focused (1152px / 6xl)</option>
                <option value="max-w-screen-2xl">Ultra Wide (1536px / 2xl)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Version History */}
      {activeSubTab === 'versions' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span>Saved Themes & Rollback Engine</span>
          </h3>

          {(!appearance.versionHistory || appearance.versionHistory.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No previous theme snapshots found. Snapshots are created whenever you click &quot;Publish Live&quot;.
            </div>
          ) : (
            <div className="space-y-3">
              {appearance.versionHistory.map((ver) => (
                <div
                  key={ver.versionId}
                  className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-xs font-bold text-white">{ver.versionName}</span>
                    <p className="text-[11px] text-slate-400">
                      Saved on {new Date(ver.savedAt).toLocaleString()} by {ver.savedBy}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-700"
                        style={{ backgroundColor: ver.colors.primary }}
                        title="Primary"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-700"
                        style={{ backgroundColor: ver.colors.secondary }}
                        title="Secondary"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-700"
                        style={{ backgroundColor: ver.colors.accent }}
                        title="Accent"
                      />
                      <span className="text-[10px] text-slate-500">
                        Font: {ver.typography.headingFont} / {ver.typography.bodyFont}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRollback(ver)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Version</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
