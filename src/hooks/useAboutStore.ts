// ============================================================
// About Us CMS Store - Dynamic Content, Team Profiles & Cloud Sync
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { logAuditEvent } from '@/services/auditLogger';

export interface AboutPerson {
  id: string;
  name: string;
  designation: string;
  profileImage: string;
  shortBio: string;
  detailedBio?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AboutValue {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface AboutUsContent {
  isPublished: boolean;
  pageTitle: string;
  pageSubtitle: string;
  heroImage: string;
  introduction: string;
  ourStory: string;
  storyImage: string;
  mission: string;
  vision: string;
  values: AboutValue[];
  people: AboutPerson[];
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: string;
  updatedBy?: string;
}

export const defaultAboutContent: AboutUsContent = {
  isPublished: true,
  pageTitle: 'From Amma’s Kitchen to Your Home',
  pageSubtitle: '30+ Years of Authentic Telugu Heritage & Love',
  heroImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1600&auto=format&fit=crop&q=80',
  introduction:
    'For over three decades, Sudha Swagruha Foods has been dedicated to preserving the golden flavors of authentic Andhra and Telangana kitchens. Every pickle, podi, and sweet is prepared by hand using age-old ancestral recipes, sun-dried chillies, and cold-pressed oils.',
  ourStory: `Our journey began in 1994 in a small traditional kitchen in Benz Circle, Vijayawada. Smt. Sudha Rani began making traditional Avakaya pickles and Kandi Podi for neighbours and relatives who longed for the authentic taste of their grandmother's cooking.

Word of mouth quickly turned a modest kitchen into a beloved regional brand. What set us apart was an uncompromising rule that continues today: never use commercial preservatives, artificial vinegar, or artificial food colors.

Today, while we deliver to homes across India and across the globe, our preparation remains strictly small-batch. Our spices are stone-pounded, our mangoes are hand-selected from Rajahmundry orchards, and our sweets are made fresh daily in pure organic ghee.`,
  storyImage: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=1000&auto=format&fit=crop&q=80',
  mission:
    'To bring genuine homemade warmth, uncompromising nutrition, and nostalgic ancestral Telugu recipes to food lovers worldwide without modern shortcuts or artificial chemicals.',
  vision:
    'To become the world’s most trusted ambassador of South Indian heritage delicacies, celebrating the selfless love of home cooks and empowering traditional artisans.',
  values: [
    {
      id: 'val-1',
      title: '100% Homemade (అమ్మ చేతి ప్రేమ)',
      description: 'Cooked in micro-batches with patience and ancestral wisdom, exactly like home.',
      iconName: 'Heart',
    },
    {
      id: 'val-2',
      title: 'Wood-Pressed Oils & Pure Spices',
      description: 'We use genuine cold-pressed groundnut and sesame oils with zero blends.',
      iconName: 'Leaf',
    },
    {
      id: 'val-3',
      title: 'Zero Chemical Preservatives',
      description: 'Preserved naturally using sea salt, roasted mustard, turmeric, and pure oils.',
      iconName: 'ShieldCheck',
    },
    {
      id: 'val-4',
      title: 'Unbroken Heritage Recipes',
      description: 'Recipes handed down over three generations with exact traditional proportions.',
      iconName: 'Award',
    },
  ],
  people: [
    {
      id: 'person-1',
      name: 'Smt. Sudha Rani V.',
      designation: 'Founder & Master Recipe Curator',
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
      shortBio: 'Began crafting authentic Andhra pickles in 1994, safeguarding 40+ heirloom family recipes.',
      detailedBio:
        'Smt. Sudha Rani pioneered the concept of pure traditional homemade foods in Vijayawada. Her deep understanding of spice balances, seasonal pickling cycles, and fermentation techniques remains the gold standard of every product that leaves our facility.',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'person-2',
      name: 'Sri Padmasaikiran V.',
      designation: 'Managing Director & Operations Head',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      shortBio: 'Spearheading hygienic packaging, international logistics, and direct farm sourcing.',
      detailedBio:
        'With a passion for authentic culinary heritage and supply-chain precision, Sri Padmasaikiran ensures our farm-fresh Guntur chillies, Guntur garlic, and organic spices reach kitchen tables fresh, securely packaged, and on schedule.',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'person-3',
      name: 'Chef Lakshmi Prasanna',
      designation: 'Head of Quality & Traditional Sweets',
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
      shortBio: 'Oversees artisanal sweet-making: Bellam Pootharekulu, Sunnundalu, and Kakinada Khaja.',
      detailedBio:
        'Specializing in organic jaggery-based Telugu delicacies, Lakshmi guarantees that each piece of sweet has the delicate balance of roasted urad dal, fragrant cardamom, and pure country cow ghee.',
      displayOrder: 3,
      isActive: true,
    },
  ],
  seoTitle: 'About Us | Sudha Swagruha Foods - Traditional Telugu Delicacies',
  seoDescription:
    'Learn about our 30-year journey of handcrafting authentic Telugu pickles, podis, and sweets with zero preservatives.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

interface AboutStore {
  content: AboutUsContent;
  isLoading: boolean;
  lastFetchedAt: string | null;

  // Actions
  fetchAboutContent: () => Promise<void>;
  subscribeToAboutRealtime: () => () => void;
  saveAboutContent: (updated: Partial<AboutUsContent>, editorEmail?: string) => Promise<{ success: boolean; error?: string }>;
  addPerson: (person: Omit<AboutPerson, 'id'>, editorEmail?: string) => Promise<void>;
  updatePerson: (id: string, patch: Partial<AboutPerson>, editorEmail?: string) => Promise<void>;
  deletePerson: (id: string, editorEmail?: string) => Promise<void>;
  togglePersonStatus: (id: string, editorEmail?: string) => Promise<void>;
  reorderPeople: (orderedIds: string[], editorEmail?: string) => Promise<void>;
  resetToDefaults: (editorEmail?: string) => Promise<void>;
}

export const useAboutStore = create<AboutStore>()(
  persist(
    (set, get) => ({
      content: defaultAboutContent,
      isLoading: false,
      lastFetchedAt: null,

      // ─── Fetch from Supabase Cloud Database ─────────────────────────────
      fetchAboutContent: async () => {
        if (!isSupabaseConfigured()) return;
        set({ isLoading: true });

        try {
          const { data, error } = await supabase
            .from('store_settings')
            .select('value, updated_at')
            .eq('key', 'about_us_content')
            .maybeSingle();

          if (!error && data?.value) {
            const cloudVal = data.value as Partial<AboutUsContent>;
            set((state) => ({
              content: {
                ...state.content,
                ...cloudVal,
                people: (cloudVal.people || state.content.people).sort((a, b) => a.displayOrder - b.displayOrder),
                values: cloudVal.values || state.content.values,
                updatedAt: data.updated_at || state.content.updatedAt,
              },
              lastFetchedAt: new Date().toISOString(),
            }));
          }
        } catch (err) {
          console.warn('About Us content cloud fetch notice:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      // ─── Realtime Listener ──────────────────────────────────────────────
      subscribeToAboutRealtime: () => {
        if (!isSupabaseConfigured()) return () => {};

        try {
          const channel = supabase
            .channel('about-us-live-sync')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'store_settings',
                filter: 'key=eq.about_us_content',
              },
              (payload) => {
                if (payload.new && (payload.new as any).value) {
                  const cloudVal = (payload.new as any).value as Partial<AboutUsContent>;
                  set((state) => ({
                    content: {
                      ...state.content,
                      ...cloudVal,
                      people: (cloudVal.people || state.content.people).sort((a, b) => a.displayOrder - b.displayOrder),
                      values: cloudVal.values || state.content.values,
                    },
                    lastFetchedAt: new Date().toISOString(),
                  }));
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (e) {
          console.warn('About Us realtime subscription notice:', e);
          return () => {};
        }
      },

      // ─── Save / Publish to Cloud Database ───────────────────────────────
      saveAboutContent: async (updated, editorEmail = 'admin@sudhaswagruhafoods.com') => {
        const current = get().content;
        const nextContent: AboutUsContent = {
          ...current,
          ...updated,
          updatedAt: new Date().toISOString(),
          updatedBy: editorEmail,
        };

        set({ content: nextContent });

        // Record Audit Event
        logAuditEvent({
          user_email: editorEmail,
          action: 'ABOUT_US_CONTENT_UPDATED',
          entity: 'AboutUs',
          entity_id: 'about_us_content',
          metadata: {
            pageTitle: nextContent.pageTitle,
            isPublished: nextContent.isPublished,
            peopleCount: nextContent.people.length,
          },
        });

        // Push to Supabase Cloud
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('store_settings').upsert({
              key: 'about_us_content',
              value: nextContent,
              updated_at: new Date().toISOString(),
            });

            if (error) {
              console.error('Supabase about_us_content update error:', error);
              return { success: false, error: error.message };
            }
          } catch (err: any) {
            console.error('Error saving about_us_content:', err);
            return { success: false, error: err.message || 'Network error' };
          }
        }

        return { success: true };
      },

      // ─── Person Management ──────────────────────────────────────────────
      addPerson: async (newPersonData, editorEmail) => {
        const current = get().content;
        const newPerson: AboutPerson = {
          ...newPersonData,
          id: `person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          displayOrder: newPersonData.displayOrder || current.people.length + 1,
        };

        const updatedPeople = [...current.people, newPerson].sort((a, b) => a.displayOrder - b.displayOrder);
        await get().saveAboutContent({ people: updatedPeople }, editorEmail);

        logAuditEvent({
          user_email: editorEmail || 'admin@sudhaswagruhafoods.com',
          action: 'ABOUT_PERSON_CREATED',
          entity: 'AboutPerson',
          entity_id: newPerson.id,
          metadata: { name: newPerson.name, designation: newPerson.designation },
        });
      },

      updatePerson: async (id, patch, editorEmail) => {
        const current = get().content;
        const updatedPeople = current.people.map((p) => (p.id === id ? { ...p, ...patch } : p));
        await get().saveAboutContent({ people: updatedPeople }, editorEmail);

        logAuditEvent({
          user_email: editorEmail || 'admin@sudhaswagruhafoods.com',
          action: 'ABOUT_PERSON_UPDATED',
          entity: 'AboutPerson',
          entity_id: id,
          metadata: { patch },
        });
      },

      deletePerson: async (id, editorEmail) => {
        const current = get().content;
        const target = current.people.find((p) => p.id === id);
        const updatedPeople = current.people.filter((p) => p.id !== id);
        await get().saveAboutContent({ people: updatedPeople }, editorEmail);

        logAuditEvent({
          user_email: editorEmail || 'admin@sudhaswagruhafoods.com',
          action: 'ABOUT_PERSON_DELETED',
          entity: 'AboutPerson',
          entity_id: id,
          metadata: { name: target?.name },
        });
      },

      togglePersonStatus: async (id, editorEmail) => {
        const current = get().content;
        const updatedPeople = current.people.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
        await get().saveAboutContent({ people: updatedPeople }, editorEmail);
      },

      reorderPeople: async (orderedIds, editorEmail) => {
        const current = get().content;
        const map = new Map(current.people.map((p) => [p.id, p]));
        const reordered: AboutPerson[] = [];

        orderedIds.forEach((id, index) => {
          const item = map.get(id);
          if (item) {
            reordered.push({ ...item, displayOrder: index + 1 });
            map.delete(id);
          }
        });

        // Add any remaining
        map.forEach((item) => reordered.push(item));

        await get().saveAboutContent({ people: reordered }, editorEmail);
      },

      resetToDefaults: async (editorEmail) => {
        await get().saveAboutContent(defaultAboutContent, editorEmail);
      },
    }),
    {
      name: 'ssf-about-us-storage',
    }
  )
);
