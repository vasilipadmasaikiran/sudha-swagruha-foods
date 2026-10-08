// ============================================================
// Admin Console - Customer Website Content Management Tab
// Requirements: 3.2, 5.1, 5.2
// Manage Homepage Hero, Announcements, About snippet, and Policy pages
// ============================================================
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Megaphone,
  Image,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import type { WebsiteContentSettings } from '@/services/websiteSettingsTypes';
import toast from 'react-hot-toast';

export default function AdminContentTab() {
  const { settings, updateContentSettings } = useSettingsStore();
  const currentContent = settings.content;

  const [contentConfig, setContentConfig] = useState<WebsiteContentSettings>({
    ...currentContent,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'hero' | 'announcement' | 'policies'>('hero');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateContentSettings(contentConfig);
      setSaveSuccess(true);
      toast.success('Website content updated and published live!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Unable to save content changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-400" />
            <span>Website Content & Policy Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Update homepage hero banners, announcement bar, and mandatory legal policies directly.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
            saveSuccess
              ? 'bg-emerald-600 text-white'
              : isSaving
              ? 'bg-amber-600/70 text-amber-100 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Saved successfully</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Content</span>
            </>
          )}
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('hero')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'hero'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>Homepage Hero Banner</span>
        </button>

        <button
          onClick={() => setActiveSubTab('announcement')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'announcement'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcement Bar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('policies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'policies'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Policies & Legal</span>
        </button>
      </div>

      {/* Sub Tab: Hero */}
      {activeSubTab === 'hero' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-sm font-bold text-white">Hero Section Configuration</span>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={contentConfig.hero.enabled}
                onChange={(e) =>
                  setContentConfig({
                    ...contentConfig,
                    hero: { ...contentConfig.hero, enabled: e.target.checked },
                  })
                }
                className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400"
              />
              <span>Display Hero Banner on Homepage</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Main Heading (English)</label>
              <input
                type="text"
                value={contentConfig.hero.heading}
                onChange={(e) =>
                  setContentConfig({
                    ...contentConfig,
                    hero: { ...contentConfig.hero, heading: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Main Heading (Telugu)</label>
              <input
                type="text"
                value={contentConfig.hero.headingTe || ''}
                onChange={(e) =>
                  setContentConfig({
                    ...contentConfig,
                    hero: { ...contentConfig.hero, headingTe: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subheading Description</label>
              <textarea
                rows={2}
                value={contentConfig.hero.subheading}
                onChange={(e) =>
                  setContentConfig({
                    ...contentConfig,
                    hero: { ...contentConfig.hero, subheading: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Call-to-Action Button Label</label>
              <input
                type="text"
                value={contentConfig.hero.buttonText}
                onChange={(e) =>
                  setContentConfig({
                    ...contentConfig,
                    hero: { ...contentConfig.hero, buttonText: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Button Link Target</label>
              <input
                type="text"
                value={contentConfig.hero.buttonLink}
                onChange={(e) =>
                  setContentConfig({
                    ...contentConfig,
                    hero: { ...contentConfig.hero, buttonLink: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hero Background Image URL</label>
              <input
                type="text"
                value={contentConfig.hero.imageUrl}
                onChange={(e) =>
                  setContentConfig({
                    ...contentConfig,
                    hero: { ...contentConfig.hero, imageUrl: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Announcement */}
      {activeSubTab === 'announcement' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Bar Promotional Banner</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Announcement Text</label>
            <input
              type="text"
              value={contentConfig.announcementText}
              onChange={(e) => setContentConfig({ ...contentConfig, announcementText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Displays across the header on all customer pages to promote shipping offers and seasonal campaigns.
            </p>
          </div>
        </div>
      )}

      {/* Sub Tab: Policies */}
      {activeSubTab === 'policies' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Shipping & Delivery Policy</h3>
            <textarea
              rows={3}
              value={contentConfig.policies.shippingPolicy}
              onChange={(e) =>
                setContentConfig({
                  ...contentConfig,
                  policies: { ...contentConfig.policies, shippingPolicy: e.target.value },
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs leading-relaxed"
            />
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Return & Refund Policy</h3>
            <textarea
              rows={3}
              value={contentConfig.policies.returnRefundPolicy}
              onChange={(e) =>
                setContentConfig({
                  ...contentConfig,
                  policies: { ...contentConfig.policies, returnRefundPolicy: e.target.value },
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs leading-relaxed"
            />
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Privacy Policy</h3>
            <textarea
              rows={3}
              value={contentConfig.policies.privacyPolicy}
              onChange={(e) =>
                setContentConfig({
                  ...contentConfig,
                  policies: { ...contentConfig.policies, privacyPolicy: e.target.value },
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs leading-relaxed"
            />
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Terms & Conditions</h3>
            <textarea
              rows={3}
              value={contentConfig.policies.termsConditions}
              onChange={(e) =>
                setContentConfig({
                  ...contentConfig,
                  policies: { ...contentConfig.policies, termsConditions: e.target.value },
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
